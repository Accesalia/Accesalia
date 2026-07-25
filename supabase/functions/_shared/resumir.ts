// supabase/functions/_shared/resumir.ts
//
// "PROMPT ANEXO" de Sali: mantiene un RESUMEN IA vivo por AMBITO, evolucionando
// el resumen previo con las ultimas interacciones (no empieza de cero cada vez).
// Dos ambitos:
//   - administrador : la PERSONA a la que se visita (no la firma). "Como vas con
//     Gomez": estado de la relacion, comunidades en juego, pendientes, caracter.
//   - comunidad     : el expediente semilla (semilla de los resumenes por fase).
// Nivel 'base' (Mistral, UE): maneja datos personales (nombres, direcciones) y se
// regenera a menudo -> barato y RGPD-correcto. Motor de la tabla resumenes_ia.

import { llamarIA } from "./ia.ts";
import { clienteServicio, type SupabaseClient } from "./db.ts";

export type Ambito = "administrador" | "comunidad";

const SYS =
  `Eres Sali, la asistente comercial residente de Accesalia (arquitectura en Madrid: accesibilidad y ` +
  `eficiencia energetica). Mantienes al dia un RESUMEN vivo para que cualquiera se ponga al corriente ` +
  `de un vistazo y para tu propio contexto en la proxima nota. Escribe DENSO y util, ~60 palabras, sin ` +
  `saludos ni rodeos. Guarda lo que EVOLUCIONA (en que punto esta cada cosa, precios, pendientes, ` +
  `caracter/manias, comunidades en juego); no repitas datos estables obvios. Si apenas hay material, ` +
  `dilo en una linea. Devuelve SOLO el texto del resumen, sin comillas ni encabezados.`;

type Nota = { fecha_evento: string | null; creado_en: string; tipo_evento: string | null; transcripcion: string };

/** (Re)escribe el resumen IA de Sali para un ambito, evolucionando el previo. */
export async function resumirAmbito(opts: {
  ambito: Ambito;
  ambitoId: string;
  fase?: string;
  supabase?: SupabaseClient;
  actorId?: string | null;
}): Promise<{ ok: boolean; texto?: string; motivo?: string }> {
  const fase = opts.fase ?? "comercial";
  const supabase = opts.supabase ?? clienteServicio();
  const col = opts.ambito === "administrador" ? "administrador_id" : "comunidad_id";

  // Resumen previo (para evolucionarlo).
  const { data: prev } = await supabase
    .from("resumenes_ia").select("id, texto").eq(col, opts.ambitoId).eq("fase", fase).maybeSingle();

  // Cabecera + material segun ambito.
  let cabecera = "";
  let notas: Nota[] = [];

  if (opts.ambito === "administrador") {
    const { data: p } = await supabase
      .from("administradores").select("nombre, empresa").eq("id", opts.ambitoId).maybeSingle();
    cabecera = `Administrador (persona): ${p?.nombre ?? "?"}${p?.empresa ? ` — ${p.empresa}` : ""}.`;
    const { data } = await supabase
      .from("interacciones").select("fecha_evento, creado_en, tipo_evento, transcripcion")
      .eq("administrador_id", opts.ambitoId).order("creado_en", { ascending: false }).limit(30);
    notas = (data ?? []) as Nota[];
  } else {
    const { data: c } = await supabase
      .from("comunidades").select("nombre, direccion").eq("id", opts.ambitoId).maybeSingle();
    cabecera = `Comunidad: ${c?.nombre ?? "?"}${c?.direccion ? ` (${c.direccion})` : ""}.`;
    const { data: puente } = await supabase
      .from("interaccion_comunidad").select("interaccion_id").eq("comunidad_id", opts.ambitoId).limit(60);
    const ids = (puente ?? []).map((x: { interaccion_id: string }) => x.interaccion_id);
    if (ids.length) {
      const { data } = await supabase
        .from("interacciones").select("fecha_evento, creado_en, tipo_evento, transcripcion")
        .in("id", ids).order("creado_en", { ascending: false }).limit(30);
      notas = (data ?? []) as Nota[];
    }
  }

  if (!notas.length && !prev?.texto) return { ok: false, motivo: "sin material" };

  const historial = notas.map((n) => `- [${n.fecha_evento ?? n.creado_en.slice(0, 10)}] ${n.transcripcion}`).join("\n");
  const prompt = `${cabecera}
${prev?.texto ? `\nRESUMEN ACTUAL (evoluciónalo, no lo repitas literal):\n${prev.texto}\n` : ""}
NOTAS (de más reciente a más antigua):
${historial || "(sin notas)"}

Reescribe el resumen al día de hoy.`;

  const r = await llamarIA({
    nivel: "base", // Mistral UE: datos personales + se regenera a menudo
    system: SYS,
    prompt,
    maxTokens: 400,
    origen: "mantener-resumen",
    actorId: opts.actorId ?? null,
  });
  const texto = r.contenido.trim();
  if (!texto) return { ok: false, motivo: "IA vacia" };

  // Get-or-create manual (sin upsert: evita depender de un indice-arbitro parcial).
  if (prev?.id) {
    await supabase.from("resumenes_ia").update({ texto }).eq("id", prev.id);
  } else {
    await supabase.from("resumenes_ia").insert({
      ambito: opts.ambito, fase, texto, generado_por: "ia",
      ...(opts.ambito === "administrador" ? { administrador_id: opts.ambitoId } : { comunidad_id: opts.ambitoId }),
    });
  }
  return { ok: true, texto };
}
