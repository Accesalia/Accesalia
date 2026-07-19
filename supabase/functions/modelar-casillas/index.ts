// supabase/functions/modelar-casillas/index.ts
//
// EDGE — PROMPT 2: la documentacion extraida por el prompt 1 -> casillas con su
// ESTRUCTURA DE COMPLETITUD (simple / partes / multiple / alternativa). Corre
// UNA vez por convocatoria, sobre la salida del prompt 1 (no necesita el PDF).
//
// Body (JSON):
//   convocatoria_id  uuid  (obligatorio; su extraccion debe tener borrador_prompt1)
//   actor_id         uuid  (opcional)
//   persistir        bool  (default true: guarda en extracciones_convocatoria.borrador_prompt2)
//
// Hereda del catalogo (tipos_documento.tipo_completitud / completitud_detalle /
// conocimiento_experto) cuando el documento esta casado.

import { llamarIA } from "../_shared/ia.ts";
import { clienteServicio } from "../_shared/db.ts";
import { registrarEvento } from "../_shared/bitacora.ts";
import { json, manejarPreflight } from "../_shared/cors.ts";

const ESQUEMA_SALIDA = {
  type: "object",
  additionalProperties: false,
  properties: {
    explicacion: { type: "string" },
    casillas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          documento: { type: "string" },
          tipo_completitud: { type: "string", enum: ["simple", "partes", "multiple", "alternativa"] },
          partes: { type: "array", items: { type: "string" } },
          cardinalidad: { type: "integer" },
          alternativas: { type: "array", items: { type: "string" } },
          agrupado_con: { type: "string" },
          notas: { type: "string" },
        },
        required: ["documento", "tipo_completitud", "partes", "cardinalidad", "alternativas", "agrupado_con", "notas"],
      },
    },
  },
  required: ["explicacion", "casillas"],
};

const SYSTEM = `Eres un asistente que modela la INTERFAZ (casillas) de una subvencion a partir de la lista de documentos YA extraida (no ves el PDF, solo la lista).

Para cada documento decide COMO se considera completo (tipo_completitud):
- simple: un solo fichero basta (ej. CIF de la comunidad). partes=[], cardinalidad=1, alternativas=[].
- partes: un documento conceptual con partes nombradas obligatorias, heterogeneas y fijas. Ej. DNI = anverso + reverso. Declara partes=["anverso","reverso"], cardinalidad=1, alternativas=[].
- multiple: varios ficheros del MISMO tipo, contables. Ej. 3 presupuestos firmados. Declara cardinalidad=3 (la cantidad exigida), partes=[], alternativas=[].
- alternativa: se cumple con UNO de varios documentos excluyentes. Ej. certificado de inicio de obra O certificado de no inicio. Declara alternativas=["...","..."], cardinalidad=1, partes=[].

REGLAS:
- La convocatoria a menudo IMPLICA la estructura sin decirla ("los tres presupuestos" -> cardinalidad 3). Infierela del texto literal que acompana a cada documento.
- Si un documento depende de/se agrupa con otro (ej. "presupuesto aceptado firmado + acta de votacion del presupuesto"), indicalo en agrupado_con (nombre del otro documento). No fuerces si no esta claro; deja "" si no aplica.
- HERENCIA DEL CATALOGO: si te doy una estructura por defecto (pista_completitud) para un documento, usala salvo que su texto literal pida algo distinto.
- Rellena SIEMPRE todos los campos: si un tipo no usa partes/alternativas, ponlos como [] y cardinalidad=1.
- explicacion: QUE has entendido y COMO has modelado cada casilla (auditoria humana).

Devuelve SOLO el JSON del esquema.`;

Deno.serve(async (req) => {
  const pre = manejarPreflight(req);
  if (pre) return pre;

  try {
    const body = await req.json().catch(() => ({}));
    const { convocatoria_id, actor_id = null, persistir = true, effort = "low", pensar = false } = body ?? {};
    if (!convocatoria_id) return json({ error: "falta convocatoria_id" }, 400);

    const supabase = clienteServicio();

    // 1. Cargar el borrador del prompt 1.
    const { data: ext, error: eExt } = await supabase
      .from("extracciones_convocatoria")
      .select("id, borrador_prompt1")
      .eq("convocatoria_id", convocatoria_id)
      .maybeSingle();
    if (eExt) return json({ error: `error leyendo extraccion: ${eExt.message}` }, 500);
    if (!ext?.borrador_prompt1) {
      return json({ error: "esta convocatoria no tiene borrador_prompt1; ejecuta antes extraer-convocatoria" }, 409);
    }
    // deno-lint-ignore no-explicit-any
    const documentos = (ext.borrador_prompt1 as any).documentacion_necesaria ?? [];
    if (!documentos.length) return json({ error: "el borrador_prompt1 no tiene documentos" }, 422);

    // 2. Pistas del catalogo (estructura por defecto + conocimiento experto) para los casados.
    const nombresCasados = documentos
      .filter((d: { estado_catalogo: string }) => d.estado_catalogo === "casado")
      .map((d: { nombre_catalogo: string }) => d.nombre_catalogo)
      .filter(Boolean);
    let pistas: unknown[] = [];
    if (nombresCasados.length) {
      const { data: cat } = await supabase
        .from("tipos_documento")
        .select("nombre, tipo_completitud, completitud_detalle, conocimiento_experto")
        .in("nombre", nombresCasados);
      pistas = cat ?? [];
    }

    // 3. Entrada del prompt 2 (poco texto: la salida estructurada del 1 + pistas).
    const entrada = JSON.stringify({ documentos, pistas_catalogo: pistas });

    const r = await llamarIA({
      nivel: "alto",
      system: SYSTEM,
      prompt: `Modela las casillas de estos documentos. Entrada:\n${entrada}`,
      esquemaJson: ESQUEMA_SALIDA,
      effort,
      pensar,
      origen: "modelar-casillas",
      actorId: actor_id,
    });

    // deno-lint-ignore no-explicit-any
    const salida = r.json as any;
    if (!salida) return json({ error: "la IA no devolvio JSON valido", contenido: r.contenido }, 502);

    // 4. Persistir.
    if (persistir) {
      const { error } = await supabase
        .from("extracciones_convocatoria")
        .update({
          borrador_prompt2: salida,
          explicacion_prompt2: salida.explicacion ?? null,
        })
        .eq("convocatoria_id", convocatoria_id);
      if (error) return json({ error: `no se pudo guardar el borrador_prompt2: ${error.message}`, json: salida }, 500);

      await registrarEvento({
        operacion: `extraccion_convocatoria:${convocatoria_id}`,
        tipo: "casillas_modeladas",
        actor_tipo: "ia",
        actor_id,
        target_tabla: "extracciones_convocatoria",
        target_id: ext.id,
        datos: { casillas: salida.casillas?.length ?? 0, modelo: r.modelo },
      });
    }

    return json({ ok: true, json: salida, usage: r.usage, modelo: r.modelo, stop_reason: r.stopReason });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
