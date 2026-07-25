// supabase/functions/extraer-comercial/index.ts
//
// EDGE — captura comercial (modelo ORDELIA). Un dictado/nota en crudo ->
// desglose estructurado + resumen para el comercial, DECIDIENDO CON CONTEXTO.
//
// Clave (por que NO es "extraer y crear a ciegas"): antes de interpretar, se
// CARGA CONTEXTO. Si la nota esta anclada a un administrador, se le dan a Claude
// las comunidades que gestiona ese admin + el RESUMEN IA de cada negociacion. Asi
// Claude mapea "Albufera 250" a la comunidad real (fuzzy EN CONTEXTO), desambigua,
// y sabe donde esta cada negociacion. NO crea maestros a ciegas: si una mencion
// encaja con una comunidad del contexto -> la ENLAZA; si no -> la deja PENDIENTE de
// que un humano confirme crearla (boton). Todo lo aplicado queda en bitacora_ia.
//
// Body (JSON): { interaccion_id: uuid, actor_id?: uuid }

import { llamarIA } from "../_shared/ia.ts";
import { clienteServicio } from "../_shared/db.ts";
import { registrarEvento } from "../_shared/bitacora.ts";
import { resumirAmbito } from "../_shared/resumir.ts";
import { json, manejarPreflight } from "../_shared/cors.ts";

const ESQUEMA_SALIDA = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumen_para_comercial: { type: "string" }, // 1a persona, calido, "esto entendi y esto he hecho por ti"
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          accion: {
            type: "string",
            enum: ["crear_oportunidad", "actualizacion", "nuevo_contacto", "lead_provisional", "deseo_tecnico", "tarea_seguimiento", "resultado_junta", "otro"],
          },
          // Si la mencion encaja con una comunidad del CONTEXTO, su id (entre corchetes). "" si es nueva o no hay contexto.
          comunidad_match_id: { type: "string" },
          confianza_match: { type: "string", enum: ["alta", "media", "baja", "na"] },
          sujeto_nombre: { type: "string" },
          direccion: { type: "string" },
          tipo_proyecto: { type: "string" },
          importe: { type: "string" },
          interes: { type: "string" },
          deseo_o_condicionante: { type: "string" },
          tarea: { type: "string" },
          condicion_cierre: { type: "string" },
          fecha_limite: { type: "string" },
          contacto: { type: "string" },
          notas: { type: "string" },
          confianza: { type: "string", enum: ["alta", "media", "baja"] },
        },
        required: ["accion", "comunidad_match_id", "confianza_match", "sujeto_nombre", "confianza"],
      },
    },
    // Resumen IA actualizado de cada comunidad del CONTEXTO que la nota haya tocado.
    resumenes_actualizados: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { comunidad_id: { type: "string" }, resumen: { type: "string" } },
        required: ["comunidad_id", "resumen"],
      },
    },
    // AVANCES DEL PIPELINE: hitos que la nota dice que se hicieron/avanzaron (Sali
    // mueve la barra sola; el comercial no rellena formularios).
    avances_pipeline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          comunidad_match_id: { type: "string" }, // id [entre corchetes] del contexto
          hito: {
            type: "string",
            enum: ["primer_contacto", "visita", "polycam", "viabilidad_arquitecto", "preparacion_documentos", "envio_documentos", "tresd", "junta", "firma", "cobro"],
          },
          estado: { type: "string", enum: ["pendiente", "en_curso", "hecho", "no_aplica"] },
          fecha: { type: "string" },          // ISO YYYY-MM-DD si se deduce ("la semana que viene", "el 5 sept")
          notas: { type: "string" },
        },
        required: ["comunidad_match_id", "hito", "estado"],
      },
    },
    requiere_humano: { type: "boolean" },
    motivo_humano: { type: "string" },
  },
  required: ["resumen_para_comercial", "items", "resumenes_actualizados", "avances_pipeline", "requiere_humano", "motivo_humano"],
};

const SYSTEM = `Eres el asistente comercial de Accesalia (arquitectura en Madrid: accesibilidad y eficiencia energetica). Un comercial acaba de DICTAR una nota tras una llamada, visita o cafe. Conviertela en datos limpios y explicale que has hecho.

Los comerciales visitan sobre todo ADMINISTRADORES de fincas, que gestionan varias comunidades. Una nota puede hablar de varias comunidades. Nadie retiene 20-40 comunidades de cabeza: si no se apunta, se pierde.

REGLA DE ORO — NO INVENTES NI CREES A CIEGAS:
- Si te doy CONTEXTO (las comunidades que gestiona el admin, con su id entre corchetes y el resumen de cada negociacion), MAPEA cada mencion a la comunidad real: pon su id en comunidad_match_id y evalua confianza_match. "Albufera 250" encaja con "AV DE LA ALBUFERA 250 MADRID" -> confianza alta. Si dudas entre dos, confianza baja y explica en motivo_humano.
- Si una mencion NO encaja con ninguna del contexto, deja comunidad_match_id="" (se propondra crearla; NO la des por creada).
- Si la nota CONTRADICE el resumen de una comunidad (el resumen dice SATE y la nota habla de ascensor), baja la confianza y avisa: puede ser un error de identificacion.

items: parte la nota, uno por cosa. accion:
- crear_oportunidad: interes real de una comunidad concreta.
- lead_provisional: interes de una comunidad sin identificar (comunidad_match_id="", confianza_match="na").
- actualizacion: novedad sobre algo existente (ej. "Arenal 12 cabreada por retrasos").
- nuevo_contacto: nos presentan a alguien (datos en 'contacto').
- deseo_tecnico: lo que la comunidad QUIERE / condicionantes de obra (ORO para el tecnico): mover contadores, no tocar buzones, suelo porcelanico verde, LED, humedades por condensacion, impermeabilizar cubierta, "ascensor pero 2 escalones que no quieren tocar y sin eso no hay subvencion". En deseo_o_condicionante.
- tarea_seguimiento: algo que hacer despues. Da SIEMPRE condicion_cierre COMPROBABLE (ej. "cuando haya 2 direcciones nuevas de este admin"). fecha_limite ISO si se deduce.
- resultado_junta / otro.
Rellena solo lo que haya; el resto "". tipo_proyecto del vocabulario: SATE, ASCENSOR, ACCESIBILIDAD, SATE CUBIERTA, BAJADA A COTA CERO, RAMPA, PLATAFORMA. importe LITERAL.

avances_pipeline: si la nota cuenta que el PROCESO comercial avanzo, refleja los hitos (para comunidades del CONTEXTO; usa su id en comunidad_match_id). Hitos: primer_contacto, visita (al inmueble), polycam (escaneo), viabilidad_arquitecto (revision del arquitecto del estudio), preparacion_documentos (informe+hoja de encargo+presupuesto), envio_documentos (enviados a la comunidad), tresd (3D para junta), junta (de votacion), firma, cobro. estado: hecho (ya ocurrio), en_curso (empezado / la pelota la tiene alguien, ej. el arquitecto aun no lo ha visto -> viabilidad_arquitecto en_curso), pendiente, no_aplica. fecha ISO si se deduce ("la semana que viene", "junta el 5 de septiembre" -> normaliza con la fecha de hoy). Ejemplos: "escanee con polycam" -> polycam hecho; "mando la viabilidad el martes" -> envio_documentos en_curso/pendiente con fecha; "junta convocada para el 5" -> junta en_curso con fecha; "van a querer 3D" -> tresd en_curso. NO inventes avances que la nota no diga.

resumenes_actualizados: por cada comunidad del CONTEXTO que la nota toque, reescribe su resumen comercial (max ~50 palabras, denso, PARA TI MISMO en la proxima iteracion y para que un humano se ponga al dia): en que punto esta la negociacion. Guarda lo que EVOLUCIONA (precio, tipo, estado); no repitas datos estables (direccion, admin).

resumen_para_comercial: 2-4 frases EN PRIMERA PERSONA, calido, contando QUE entendiste y QUE has hecho (que apuntaste, que enlazaste, que dejaste pendiente de confirmar, que recordatorios pusiste). Que vea el papeleo que le quitas.

requiere_humano=true (con motivo) si algo es ambiguo, contradictorio, o hay que confirmar crear una comunidad nueva. Devuelve SOLO el JSON del esquema.`;

Deno.serve(async (req) => {
  const pre = manejarPreflight(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    const { interaccion_id, actor_id = null } = body ?? {};
    if (!interaccion_id) return json({ error: "falta interaccion_id" }, 400);

    const supabase = clienteServicio();

    const { data: inter, error: eInt } = await supabase
      .from("interacciones")
      .select("id, transcripcion, fecha_evento, comercial_id, administrador_id")
      .eq("id", interaccion_id)
      .single();
    if (eInt || !inter) return json({ error: `interaccion no encontrada: ${eInt?.message ?? "?"}` }, 404);
    if (!inter.transcripcion?.trim()) return json({ error: "la interaccion no tiene texto que procesar" }, 400);

    // ---- CONTEXTO ORDELIA (fuzzy-ANTES): candidatos con su resumen -> al prompt ----
    // Se juntan dos fuentes de comunidades candidatas y se suben con su resumen para
    // que Sali DECIDA CON CONTEXTO (desambigue, enlace, detecte contradicciones):
    //   (a) las que gestiona el admin, si la nota va anclada a uno;
    //   (b) FUZZY del catalogo ENTERO contra el texto de la nota (modelo Ordelia:
    //       una query SQL, sin pre-pasada de IA) -> da ojos a la nota SUELTA.
    const idsCtx = new Set<string>();
    const candMap = new Map<string, { nombre: string; direccion?: string | null }>();
    let adminNombre = "";
    let adminFirmId: string | null = null; // firma del admin (para materializar contactos nuevos)

    if (inter.administrador_id) {
      const { data: persona } = await supabase
        .from("administradores").select("nombre, empresa, administracion_id").eq("id", inter.administrador_id).single();
      adminNombre = persona ? `${persona.nombre}${persona.empresa ? ` (${persona.empresa})` : ""}` : "";
      adminFirmId = persona?.administracion_id ?? null;
      if (persona?.administracion_id) {
        const { data: coms } = await supabase
          .from("comunidades").select("id, nombre, direccion").eq("administracion_id", persona.administracion_id).limit(150);
        for (const c of coms ?? []) candMap.set(c.id, { nombre: c.nombre, direccion: c.direccion });
      }
    }

    // (b) Fuzzy del catalogo entero contra el texto crudo.
    // deno-lint-ignore no-explicit-any
    let fuzzyList: any[] = [];
    {
      const { data: fz } = await supabase.rpc("candidatos_comunidad_para_nota", { nota: inter.transcripcion, tope: 8 });
      fuzzyList = (fz ?? []) as any[];
      for (const c of fuzzyList) if (!candMap.has(c.id)) candMap.set(c.id, { nombre: c.nombre, direccion: c.direccion });
    }

    const ids = [...candMap.keys()];
    ids.forEach((id) => idsCtx.add(id));
    let contexto = "";
    if (ids.length) {
      const { data: res } = await supabase
        .from("resumenes_ia").select("comunidad_id, texto").eq("fase", "comercial").in("comunidad_id", ids);
      const resMap = new Map((res ?? []).map((r: { comunidad_id: string; texto: string }) => [r.comunidad_id, r.texto]));
      contexto = ids.map((id) => {
        const c = candMap.get(id)!;
        return `- [${id}] ${c.nombre}${c.direccion ? `, ${c.direccion}` : ""}${resMap.get(id) ? ` — ${resMap.get(id)}` : ""}`;
      }).join("\n");
    }

    const bloqueContexto = contexto
      ? `\n\nCONTEXTO — posibles comunidades mencionadas${adminNombre ? ` (el comercial se reunio con el administrador ${adminNombre})` : ""}, sacadas del admin y/o por PARECIDO con la nota. Usa el id [entre corchetes] como comunidad_match_id si una mencion encaja de verdad; si dudas entre varias o el parecido es flojo, baja la confianza y explicalo. NO fuerces un match: si ninguna encaja, es comunidad nueva.\n${contexto}`
      : `\n\n(No hay candidatos: deja comunidad_match_id="" salvo que la propia nota identifique una comunidad sin lugar a dudas.)`;

    const r = await llamarIA({
      nivel: "alto",
      system: SYSTEM,
      prompt: `${inter.fecha_evento ? `Fecha: ${inter.fecha_evento}.` : ""}${bloqueContexto}\n\nNOTA DEL COMERCIAL (cruda):\n"""\n${inter.transcripcion}\n"""`,
      esquemaJson: ESQUEMA_SALIDA,
      effort: "low",
      pensar: false,
      maxTokens: 10000,
      origen: "extraer-comercial",
      actorId: actor_id,
    });

    // deno-lint-ignore no-explicit-any
    const salida = r.json as any;
    if (!salida) {
      await supabase.from("interacciones").update({ extraccion_estado: "sin_procesar" }).eq("id", interaccion_id);
      return json({ error: "la IA no devolvio JSON valido" }, 502);
    }

    // ---- APLICAR: enlazar/anotar lo seguro; dejar PENDIENTE lo que crea maestros ----
    const OP = `comercial:${interaccion_id}`;
    const esISO = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const creados = { oportunidades: 0, tareas: 0, anotados: 0, pendientes: 0 };

    // deno-lint-ignore no-explicit-any
    for (const it of (salida.items ?? []) as any[]) {
      try {
        // Resolver comunidad SOLO si Sali la caso con un candidato del contexto (que
        // YA incluye el fuzzy-antes) y con confianza alta. NO hay auto-enlace por
        // codigo: Sali ya vio los candidatos; segundo-adivinarla crearia falsos matches.
        const comId = idsCtx.has(it.comunidad_match_id) && it.confianza_match === "alta" ? it.comunidad_match_id : null;

        // Puente: si la nota toca una comunidad conocida, dejar el puntero (para su
        // expediente). El texto crudo NO se copia; vive solo en interacciones.
        if (comId) {
          await supabase.from("interaccion_comunidad").upsert(
            { interaccion_id, comunidad_id: comId, origen: "ia" },
            { onConflict: "interaccion_id,comunidad_id", ignoreDuplicates: true },
          );
        }

        if (it.accion === "tarea_seguimiento") {
          const { data: t } = await supabase.from("tareas_seguimiento").insert({
            comercial_id: inter.comercial_id ?? null, administrador_id: inter.administrador_id ?? null, interaccion_id,
            texto: it.tarea || it.notas || "(seguimiento)", condicion_cierre: it.condicion_cierre || null,
            fecha_limite: esISO(it.fecha_limite) ? it.fecha_limite : null,
          }).select("id").single();
          if (t) { creados.tareas++; await registrarEvento({ operacion: OP, tipo: "tarea_creada", target_tabla: "tareas_seguimiento", target_id: t.id, datos: it }); }
        } else if (it.accion === "crear_oportunidad" || it.accion === "lead_provisional") {
          if (comId) {
            // Comunidad conocida -> dedup: si ya hay oportunidad activa, anotar; si no, crear enlazada.
            const { data: ya } = await supabase.from("oportunidades").select("id").eq("comunidad_id", comId).eq("estado", "activa").limit(1);
            if (ya && ya.length) {
              await registrarEvento({ operacion: OP, tipo: "oportunidad_anotada", target_tabla: "oportunidades", target_id: ya[0].id, datos: it });
              creados.anotados++;
            } else {
              const { data: op } = await supabase.from("oportunidades").insert({
                comercial_id: inter.comercial_id ?? null, administrador_id: inter.administrador_id ?? null,
                comunidad_id: comId, tipo_origen: inter.administrador_id ? "administrador_conocido" : "otro", estado: "activa",
                origen_notas: [it.tipo_proyecto, it.importe, it.interes, it.notas].filter(Boolean).join(" · ") || null,
              }).select("id").single();
              if (op) { creados.oportunidades++; await registrarEvento({ operacion: OP, tipo: "oportunidad_creada", target_tabla: "oportunidades", target_id: op.id, datos: it }); }
            }
          } else {
            // Comunidad NUEVA o dudosa -> NO se crea: queda pendiente de confirmacion humana.
            // Los candidatos del fuzzy (nivel-nota) viajan al evento -> la revision los
            // ofrece como BOTONES ("¿se parece a alguna?") en vez de crear a ciegas.
            creados.pendientes++;
            await registrarEvento({ operacion: OP, tipo: "pendiente_crear_comunidad", target_tabla: "interacciones", target_id: interaccion_id, datos: { ...it, candidatos: fuzzyList.slice(0, 5) } });
          }
        } else if (it.accion === "deseo_tecnico" && comId) {
          // ORO para el tecnico -> brief de la comunidad (reutilizable). Solo si sabemos la comunidad.
          const texto = it.deseo_o_condicionante || it.notas || it.interes || "";
          if (texto.trim()) {
            const { data: cc } = await supabase.from("condicionantes_comunidad").insert({
              comunidad_id: comId, interaccion_id, texto, categoria: "deseo", origen: "ia",
            }).select("id").single();
            if (cc) { creados.anotados++; await registrarEvento({ operacion: OP, tipo: "item_deseo_tecnico", target_tabla: "condicionantes_comunidad", target_id: cc.id, datos: it }); }
          } else {
            await registrarEvento({ operacion: OP, tipo: "item_deseo_tecnico", target_tabla: "interacciones", target_id: interaccion_id, datos: it });
            creados.anotados++;
          }
        } else if (it.accion === "nuevo_contacto" && adminFirmId) {
          // "Nos presentan a alguien" -> contacto real de la firma (proposito comercial).
          const { data: co } = await supabase.from("contactos").insert({
            administracion_id: adminFirmId, proposito: "comercial",
            nombre: it.sujeto_nombre || it.contacto || null,
            notas: [it.contacto, it.notas].filter(Boolean).join(" · ") || null,
          }).select("id").single();
          if (co) { creados.anotados++; await registrarEvento({ operacion: OP, tipo: "item_nuevo_contacto", target_tabla: "contactos", target_id: co.id, datos: it }); }
          else { await registrarEvento({ operacion: OP, tipo: "item_nuevo_contacto", target_tabla: "interacciones", target_id: interaccion_id, datos: it }); creados.anotados++; }
        } else {
          // actualizacion / resultado_junta / otro (o deseo/contacto sin destino resoluble) -> anotado.
          await registrarEvento({ operacion: OP, tipo: `item_${it.accion}`, target_tabla: comId ? "comunidades" : "interacciones", target_id: comId ?? interaccion_id, datos: it });
          creados.anotados++;
        }
      } catch (e) {
        await registrarEvento({ operacion: OP, tipo: "item_error", target_tabla: "interacciones", target_id: interaccion_id, datos: { it, error: String(e) } });
      }
    }

    // ---- AVANCES DEL PIPELINE: Sali mueve los hitos (el comercial NO rellena) ----
    // deno-lint-ignore no-explicit-any
    for (const av of (salida.avances_pipeline ?? []) as any[]) {
      try {
        if (!idsCtx.has(av.comunidad_match_id)) continue; // solo comunidad conocida
        const { data: ops } = await supabase.from("oportunidades")
          .select("id").eq("comunidad_id", av.comunidad_match_id).eq("estado", "activa").limit(1);
        if (!ops?.length) continue; // sin oportunidad activa no hay pipeline que mover
        const { data: hrow } = await supabase.from("hitos_oportunidad")
          .select("id, estado").eq("oportunidad_id", ops[0].id).eq("hito", av.hito).limit(1);
        if (!hrow?.length) continue;
        const patch: Record<string, unknown> = { estado: av.estado, aplicable: av.estado !== "no_aplica" };
        if (esISO(av.fecha)) patch.fecha = av.fecha;
        if (av.notas) patch.notas = av.notas;
        await supabase.from("hitos_oportunidad").update(patch).eq("id", hrow[0].id);
        await registrarEvento({ operacion: OP, tipo: "avance_hito", target_tabla: "hitos_oportunidad", target_id: hrow[0].id, datos: { ...av, estado_anterior: hrow[0].estado } });
        creados.anotados++;
      } catch (e) {
        await registrarEvento({ operacion: OP, tipo: "item_error", target_tabla: "interacciones", target_id: interaccion_id, datos: { av, error: String(e) } });
      }
    }

    // ---- Refrescar el RESUMEN IA comercial de las comunidades tocadas ----
    // deno-lint-ignore no-explicit-any
    for (const ru of (salida.resumenes_actualizados ?? []) as any[]) {
      if (idsCtx.has(ru.comunidad_id) && ru.resumen?.trim()) {
        await supabase.from("resumenes_ia").upsert(
          { comunidad_id: ru.comunidad_id, fase: "comercial", texto: ru.resumen.trim(), generado_por: "ia" },
          { onConflict: "comunidad_id,fase" },
        );
      }
    }

    // "PROMPT ANEXO" de Sali: refrescar el resumen vivo del ADMINISTRADOR (persona)
    // tocado, en 2o plano (no retrasa la respuesta ni la pantalla de revision). El
    // resumen de las COMUNIDADES ya se refresco arriba con la pasada Opus (mas rica).
    if (inter.administrador_id) {
      const tarea = resumirAmbito({ ambito: "administrador", ambitoId: inter.administrador_id, supabase, actorId: actor_id })
        .catch((e) => console.warn(`resumen admin no refrescado: ${e}`));
      // deno-lint-ignore no-explicit-any
      const rt = (globalThis as any).EdgeRuntime;
      if (rt?.waitUntil) rt.waitUntil(tarea); else await tarea;
    }

    const estado = creados.pendientes > 0 || salida.requiere_humano ? "propuesta" : "aplicada";
    await supabase.from("interacciones").update({
      extraccion: salida, extraccion_estado: estado,
      requiere_humano: creados.pendientes > 0 || !!salida.requiere_humano,
      motivo_requiere_humano: salida.motivo_humano || (creados.pendientes > 0 ? "Hay comunidades nuevas por confirmar." : null),
    }).eq("id", interaccion_id);

    return json({ ok: true, interaccion_id, estado, creados, extraccion: salida, modelo: r.modelo });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
