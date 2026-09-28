// lib/entradaDiario.ts
//
// GRABAR UNA ENTRADA DEL DIARIO (Monica, 28-sep-2026).
//
// El diario es el corazon del area comercial: de el salen las tareas de la
// agenda, y sin entrada no hay oportunidad que seguir. Hasta hoy se LEIA pero no
// se podia escribir: las nueve que hay en produccion las creo el alta de
// oportunidad, de rebote.
//
// Lo minimo imprescindible son dos cosas: QUE HA PASADO y DE QUIEN es la
// entrada. Todo lo demas -a que oportunidad se engancha, con quien fue- es
// opcional a proposito: una nota suelta que se apunta en el coche vale mas que
// una nota que no se apunta por no tener a mano el dato.
//
// El micro no se programa: el campo grande es un textarea normal y se dicta con
// el microfono del propio teclado, que ya lo tienen todos -movil y Windows-.
// Asi funciona sin permisos, sin depender del navegador y sin nada que mantener.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** COMO FUE. Son los cinco valores del CHECK de `interacciones.origen` y no
 *  caben mas: si algun dia hace falta otro, se cambia la restriccion.
 *  "nota de voz" no se ofrece aqui: ese es el carril de Sali, que transcribe. */
export const COMO_FUE = [
  { valor: "visita", texto: "Visita" },
  { valor: "llamada", texto: "Llamada" },
  { valor: "mail", texto: "Correo" },
  { valor: "manual", texto: "Escrito" },
] as const;

export type OpcionEntrada = { valor: string; texto: string; pista?: string };

export type DatosEntrada = {
  texto: string;
  comoFue: string;
  fecha: string | null;
  comercialId: string | null;
  oportunidadId: string | null;
  puestoId: string | null;
  /** Quien la escribe: sale de la sesion, no del formulario. */
  autorId: string | null;
};

/** Las oportunidades a las que se puede enganchar una entrada, y las personas
 *  con las que puede haber sido. Se cargan en el servidor y viajan ya hechas. */
export async function opcionesEntrada(comercialId: string | null): Promise<{
  oportunidades: OpcionEntrada[];
  personas: OpcionEntrada[];
}> {
  const filtro = comercialId ? `&comercial_id=eq.${comercialId}` : "";

  const [ops, puestos] = await Promise.all([
    leer<{ id: string; codigo: string | null; comunidad: { nombre: string } | null }[]>(
      `oportunidades?select=id,codigo,comunidad:comunidad_id(nombre)${filtro}&order=creado_en.desc&limit=300`,
    ),
    leer<{ id: string; cargo: string | null; persona: { nombre: string } | null; empresa: { nombre: string } | null }[]>(
      `puesto?select=id,cargo,persona:persona_id(nombre),empresa:empresa_id(nombre)&order=creado_en.desc&limit=600`,
    ),
  ]);

  return {
    oportunidades: ops.map((o) => ({
      valor: o.id,
      texto: o.comunidad?.nombre ?? o.codigo ?? "(sin dirección)",
      pista: o.codigo ?? undefined,
    })),
    // Una persona suelta puede ser una docena de Jose Luises: la pista dice de
    // donde es (Monica, 28-sep-2026).
    personas: puestos
      .filter((p) => p.persona?.nombre)
      .map((p) => ({
        valor: p.id,
        texto: p.persona!.nombre,
        pista: p.empresa?.nombre ?? p.cargo ?? undefined,
      })),
  };
}

/** Graba la entrada y devuelve su id. Lo unico obligatorio es el texto: sin el
 *  no hay nada que contar. */
export async function crearEntrada(d: DatosEntrada): Promise<string> {
  const texto = d.texto.trim();
  if (texto === "") throw new Error("Una entrada del diario sin texto no cuenta nada.");

  const comoFue = COMO_FUE.some((c) => c.valor === d.comoFue) ? d.comoFue : "manual";

  const fila: Record<string, unknown> = {
    transcripcion: texto,
    origen: comoFue,
    fecha_evento: d.fecha,
    comercial_id: d.comercialId,
    oportunidad_id: d.oportunidadId,
    puesto_id: d.puestoId,
    autor_id: d.autorId,
    // Escrita a mano por una persona: ni Sali la ha mirado ni hace falta que
    // nadie la revise. Y no queda pendiente de vincular porque quien la escribe
    // ya ha dicho a que se engancha (o que no se engancha a nada).
    extraccion_estado: "sin_procesar",
    requiere_humano: false,
    pendiente_vincular: false,
  };

  const r = await fetch(`${URL_BASE}/rest/v1/interacciones`, {
    method: "POST",
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(fila),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  const [creada] = (await r.json()) as { id: string }[];
  return creada.id;
}

export type EntradaFicha = {
  id: string;
  fecha: string;
  creadoEn: string;
  comoFue: string;
  texto: string;
  revisar: boolean;
  motivo: string | null;
  autor: string | null;
  comercial: string | null;
  con: string | null;
  conDonde: string | null;
  oportunidadId: string | null;
  oportunidad: string | null;
};

/** Una entrada, para su ficha. Null si no existe. */
export async function entradaPorId(id: string): Promise<EntradaFicha | null> {
  const [i] = await leer<
    {
      id: string;
      creado_en: string;
      fecha_evento: string | null;
      origen: string;
      transcripcion: string | null;
      requiere_humano: boolean;
      motivo_requiere_humano: string | null;
      oportunidad_id: string | null;
      autor: { nombre: string } | null;
      comercial: { nombre: string } | null;
      puesto: { cargo: string | null; persona: { nombre: string } | null; empresa: { nombre: string } | null } | null;
      oportunidad: { codigo: string | null; comunidad: { nombre: string } | null } | null;
    }[]
  >(
    `interacciones?select=id,creado_en,fecha_evento,origen,transcripcion,requiere_humano,motivo_requiere_humano,` +
      `oportunidad_id,autor:autor_id(nombre),comercial:comercial_id(nombre),` +
      `puesto:puesto_id(cargo,persona:persona_id(nombre),empresa:empresa_id(nombre)),` +
      `oportunidad:oportunidad_id(codigo,comunidad:comunidad_id(nombre))&id=eq.${id}&limit=1`,
  );
  if (!i) return null;

  return {
    id: i.id,
    fecha: i.fecha_evento ?? i.creado_en.slice(0, 10),
    creadoEn: i.creado_en,
    comoFue: COMO_FUE.find((c) => c.valor === i.origen)?.texto ?? (i.origen === "nota_voz" ? "Nota de voz" : i.origen),
    texto: i.transcripcion ?? "",
    revisar: i.requiere_humano,
    motivo: i.motivo_requiere_humano,
    autor: i.autor?.nombre ?? null,
    comercial: i.comercial?.nombre ?? null,
    con: i.puesto?.persona?.nombre ?? null,
    conDonde: i.puesto?.empresa?.nombre ?? i.puesto?.cargo ?? null,
    oportunidadId: i.oportunidad_id,
    oportunidad: i.oportunidad?.comunidad?.nombre ?? i.oportunidad?.codigo ?? null,
  };
}
