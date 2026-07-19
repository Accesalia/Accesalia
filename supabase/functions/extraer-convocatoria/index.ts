// supabase/functions/extraer-convocatoria/index.ts
//
// EDGE — PROMPT 1: la convocatoria (PDF) -> requisitos a cumplir + documentacion
// necesaria. Fidelidad al texto legal. Corre UNA vez por convocatoria.
//
// ASINCRONA: la extraccion tarda ~2 min y no cabe en el request/response de una
// edge (tope ~150s). Se marca estado='procesando', se responde AL INSTANTE con
// el extraccion_id, y el trabajo real corre en segundo plano (EdgeRuntime.
// waitUntil). Al terminar pasa a 'borrador' (o 'error'). El front consulta el
// estado hasta que deja de ser 'procesando'.
//
// Body (JSON):
//   convocatoria_id        uuid   (obligatorio; la convocatoria ya existe)
//   pdf_base64 | pdf_storage_path  (el PDF, directo o en el bucket 'convocatorias')
//   convocatoria_ejemplo_id uuid  (opcional: convocatoria previa VALIDADA, few-shot)
//   num_ejemplos           int    (0/1/2; default 1)
//   actor_id               uuid   (opcional)
//   effort                 str    (low|medium|high|xhigh|max; default 'low' -> rapido y fiable para extraer)
//   max_tokens             int    (default 16000)
//   pensar                 bool   (thinking adaptativo; default false para extraer rapido)

import { encodeBase64 } from "jsr:@std/encoding/base64";
import { llamarIA } from "../_shared/ia.ts";
import { clienteServicio } from "../_shared/db.ts";
import { registrarEvento } from "../_shared/bitacora.ts";
import { json, manejarPreflight } from "../_shared/cors.ts";

// EdgeRuntime.waitUntil existe en el runtime de Supabase (local y desplegado).
// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

const ESQUEMA_SALIDA = {
  type: "object",
  additionalProperties: false,
  properties: {
    explicacion: { type: "string" },
    resumen_convocatoria: { type: "string" },
    identificacion: {
      type: "object",
      additionalProperties: false,
      properties: {
        entidad: { type: "string" },
        plan: { type: "string" },
        anio: { type: "integer" },
      },
      required: ["entidad", "plan", "anio"],
    },
    fechas: {
      type: "object",
      additionalProperties: false,
      properties: {
        fecha_apertura: { type: "string" },
        fecha_cierre: { type: "string" },
        texto_literal: { type: "string" },
      },
      required: ["fecha_apertura", "fecha_cierre", "texto_literal"],
    },
    requisitos_a_cumplir: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          identificador: { type: "string" },
          descripcion: { type: "string" },
          texto_literal: { type: "string" },
        },
        required: ["identificador", "descripcion", "texto_literal"],
      },
    },
    documentacion_necesaria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nombre: { type: "string" },
          estado_catalogo: { type: "string", enum: ["casado", "nuevo"] },
          nombre_catalogo: { type: "string" },
          fase: { type: "string", enum: ["solicitud", "justificacion", "ambas", "otra"] },
          obligatoriedad: { type: "string" },
          categoria: { type: "string", enum: ["generico", "especifico_convocatoria", "opcional"] },
          texto_literal: { type: "string" },
        },
        required: ["nombre", "estado_catalogo", "nombre_catalogo", "fase", "obligatoriedad", "categoria", "texto_literal"],
      },
    },
  },
  required: ["explicacion", "resumen_convocatoria", "identificacion", "fechas", "requisitos_a_cumplir", "documentacion_necesaria"],
};

const SYSTEM = `Eres un asistente experto en subvenciones de rehabilitacion de edificios en Espana, trabajando para Accesalia (estudio de arquitectura de Madrid: accesibilidad y eficiencia energetica).

Tu tarea: leer el PDF de una convocatoria de subvencion (BOE/boletin) y extraer, con MAXIMA FIDELIDAD al texto legal, dos cosas SEPARADAS:

A) requisitos_a_cumplir: CONDICIONES de elegibilidad que NO son documentos (tipo de edificio, antiguedad minima/maxima, % de ahorro energetico exigido, superficie afectada, plazos, zona, etc.). Para cada una: un identificador legible en snake_case, una descripcion clara, y el TEXTO LITERAL de la convocatoria de donde lo extrajiste.

B) documentacion_necesaria: la lista de DOCUMENTOS a aportar. Para cada uno:
   - nombre normalizado;
   - estado_catalogo ('casado' con el catalogo existente o 'nuevo');
   - fase: en que momento del procedimiento se pide -> 'solicitud' (al pedir la subvencion), 'justificacion' (al terminar la obra, para justificar), 'ambas' (se pide en las dos) u 'otra'. Muchas convocatorias separan estas dos fases; un mismo documento puede aparecer en las dos;
   - obligatoriedad: la CONDICION que determina a quien aplica, TAL CUAL la expresa la convocatoria (ej. "Todos", "Cuando haya representante", "Actuaciones sin iniciar", "Comunidades energeticas", "Si el pago se hizo por transferencia"). Si aplica siempre, pon "Todos";
   - categoria (generico | especifico_convocatoria | opcional);
   - el TEXTO LITERAL de donde lo extrajiste.

C) resumen_convocatoria: un texto DIVULGATIVO y breve (3-6 frases), en lenguaje llano para una persona NO experta (el usuario final de Accesalia, p.ej. un presidente de comunidad). Explica: QUE es esta ayuda, A QUIEN aplica (que tipo de edificios/comunidades), QUE cubre y CUANTO se puede recibir (importe o % y base de calculo si aparece), y las FECHAS/PLAZOS clave. NO es auditoria (eso es 'explicacion'): es el cartel de bienvenida que leera el usuario. Claro, cercano y fiel a la convocatoria; sin tecnicismos ni jerga legal.

D0) identificacion: identifica la convocatoria. entidad = organismo convocante (ej. "Ayuntamiento de Madrid", "Comunidad de Madrid"). plan = nombre del programa/plan de la convocatoria (ej. "Rehabilita Madrid", "Plan Renove"). anio = ano de la convocatoria (entero, ej. 2026). Extraelos del titulo/encabezado/texto del PDF. Si alguno no aparece con claridad, entidad/plan como "" y anio como 0; no inventes.

D) fechas: el PLAZO de presentacion de solicitudes. fecha_apertura y fecha_cierre en formato ISO YYYY-MM-DD. Si el texto da solo una (p.ej. "hasta el 30 de septiembre de 2026"), rellena la que sepas y deja la otra como "". Si el plazo NO aparece en este PDF (a veces se remite a una resolucion/extracto posterior), deja AMBAS como "". En texto_literal copia la frase exacta de donde salen (o "" si no hay). No inventes fechas.

REGLAS:
- No razones sobre estructura de casillas ni sobre vigencia/caducidad: eso es de otro paso. Aqui SOLO QUE se pide, fiel al texto.
- Distingue bien fase y obligatoriedad: son ejes distintos. Un documento condicional ("solo si...") sigue teniendo su fase; la condicion va en obligatoriedad.
- Fidelidad ante todo: no inventes requisitos que no esten en el texto; no omitas los que esten.
- SUELO GARANTIZADO (base fija): estos SIEMPRE aplican aunque la convocatoria no los mencione, e incluyelos SIEMPRE en documentacion_necesaria salvo que la convocatoria los excluya expresamente: CIF de la comunidad, nombre de la comunidad, DNI del presidente/administrador, acta de nombramiento del presidente/administrador, y el proyecto de la actuacion a subvencionar. Da por cierto que existe una actuacion (proyecto) que se subvenciona.
- CASADO CON CATALOGO: si un documento coincide (aunque el nombre varie) con uno del catalogo que te doy, pon estado_catalogo='casado' y en nombre_catalogo el nombre EXACTO del catalogo. Si no existe en el catalogo, estado_catalogo='nuevo' y en nombre_catalogo el nombre normalizado que propones.
- explicacion: escribe QUE has entendido de la convocatoria, QUE has extraido y COMO has decidido (para auditoria humana). Se concreto y honesto; si algo es dudoso, dilo.

Devuelve SOLO el JSON del esquema.`;

Deno.serve(async (req) => {
  const pre = manejarPreflight(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    const {
      convocatoria_id,
      pdf_base64,
      pdf_storage_path,
      convocatoria_ejemplo_id,
      num_ejemplos = 1,
      actor_id = null,
      effort = "low",
      max_tokens = 16000,
      pensar = false,
    } = body ?? {};

    if (!convocatoria_id) return json({ error: "falta convocatoria_id" }, 400);

    const supabase = clienteServicio();

    // 1. PDF: base64 directo o descarga de Storage.
    let base64: string | undefined = pdf_base64;
    if (!base64 && pdf_storage_path) {
      const { data, error } = await supabase.storage.from("convocatorias").download(pdf_storage_path);
      if (error || !data) return json({ error: `no se pudo descargar el PDF: ${error?.message ?? "?"}` }, 400);
      base64 = encodeBase64(new Uint8Array(await data.arrayBuffer()));
    }
    if (!base64) return json({ error: "falta pdf_base64 o pdf_storage_path" }, 400);

    // 2. Marcar procesando (upsert: una fila por convocatoria) y capturar el id.
    const { data: up, error: eUp } = await supabase
      .from("extracciones_convocatoria")
      .upsert({ convocatoria_id, estado: "procesando" }, { onConflict: "convocatoria_id" })
      .select("id")
      .single();
    if (eUp) return json({ error: `no se pudo iniciar la extraccion: ${eUp.message}` }, 500);
    const extraccion_id = up.id;

    // 3. Contexto rapido: catalogo (para casar) y few-shot (convocatoria previa validada).
    const { data: catalogo } = await supabase.from("tipos_documento").select("nombre");
    const nombresCatalogo = (catalogo ?? []).map((t: { nombre: string }) => t.nombre);

    let ejemploTexto = "";
    let usoEjemplo = false;
    if (convocatoria_ejemplo_id && num_ejemplos > 0) {
      const { data: ej } = await supabase
        .from("extracciones_convocatoria")
        .select("borrador_prompt1")
        .eq("convocatoria_id", convocatoria_ejemplo_id)
        .eq("estado", "validada")
        .maybeSingle();
      if (ej?.borrador_prompt1) {
        usoEjemplo = true;
        ejemploTexto = `\n\nEJEMPLO RESUELTO (misma linea/entidad, plantilla ya validada). Para aquella convocatoria, la respuesta correcta fue esta. Haz lo mismo con la nueva:\n${JSON.stringify(ej.borrador_prompt1)}`;
      }
    }

    const system = SYSTEM +
      `\n\nCATALOGO DE TIPOS DE DOCUMENTO EXISTENTES (para casar): ${nombresCatalogo.join(" | ") || "(vacio)"}` +
      ejemploTexto;

    // 4. Trabajo pesado en segundo plano.
    const trabajo = async () => {
      try {
        const r = await llamarIA({
          nivel: "alto",
          system,
          prompt: "Extrae los requisitos a cumplir y la documentacion necesaria de esta convocatoria, siguiendo tus reglas.",
          documentos: [{ base64: base64!, titulo: "convocatoria.pdf" }],
          esquemaJson: ESQUEMA_SALIDA,
          effort,
          maxTokens: max_tokens,
          pensar,
          origen: "extraer-convocatoria",
          actorId: actor_id,
        });
        // deno-lint-ignore no-explicit-any
        const salida = r.json as any;
        if (!salida) {
          await supabase.from("extracciones_convocatoria")
            .update({ estado: "error", notas: "la IA no devolvio JSON valido" })
            .eq("convocatoria_id", convocatoria_id);
          return;
        }
        await supabase.from("extracciones_convocatoria").update({
          borrador_prompt1: salida,
          explicacion_prompt1: salida.explicacion ?? null,
          modelo_ia: r.modelo,
          num_ejemplos_usados: usoEjemplo ? 1 : 0,
          convocatoria_ejemplo_id: usoEjemplo ? convocatoria_ejemplo_id : null,
          estado: "borrador",
          fecha_extraccion: new Date().toISOString(),
        }).eq("convocatoria_id", convocatoria_id);

        // Identificacion + fechas -> ficha de la convocatoria como DATOS LIMPIOS
        // (columnas estructuradas, filtrables por entidad/plan/anio). Solo se
        // escribe lo que la IA halle; lo demas conserva su valor previo.
        // deno-lint-ignore no-explicit-any
        const parche: Record<string, any> = {};
        const entidad = (salida.identificacion?.entidad ?? "").trim();
        const plan = (salida.identificacion?.plan ?? "").trim();
        const anio = Number(salida.identificacion?.anio ?? 0);
        if (entidad) parche.entidad = entidad;
        if (plan) parche.plan = plan;
        if (anio > 0) parche.anio = anio;
        const fa = (salida.fechas?.fecha_apertura ?? "").trim();
        const fc = (salida.fechas?.fecha_cierre ?? "").trim();
        if (fa) parche.fecha_apertura = fa;
        if (fc) parche.fecha_cierre = fc;
        if (Object.keys(parche).length) {
          await supabase.from("convocatorias").update(parche).eq("id", convocatoria_id);
        }

        await registrarEvento({
          operacion: `extraccion_convocatoria:${convocatoria_id}`,
          tipo: "extraccion_generada",
          actor_tipo: "ia",
          actor_id,
          target_tabla: "extracciones_convocatoria",
          target_id: extraccion_id,
          datos: {
            docs: salida.documentacion_necesaria?.length ?? 0,
            condiciones: salida.requisitos_a_cumplir?.length ?? 0,
            modelo: r.modelo,
          },
        });
      } catch (e) {
        await supabase.from("extracciones_convocatoria")
          .update({ estado: "error", notas: String(e) })
          .eq("convocatoria_id", convocatoria_id);
      }
    };

    // 5. Async si el runtime lo permite; si no (entorno raro), sincrono.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(trabajo());
      return json({ ok: true, extraccion_id, estado: "procesando" }, 202);
    }
    await trabajo();
    const { data: fin } = await supabase
      .from("extracciones_convocatoria")
      .select("estado, borrador_prompt1")
      .eq("convocatoria_id", convocatoria_id)
      .single();
    return json({ ok: true, extraccion_id, estado: fin?.estado, json: fin?.borrador_prompt1 });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
