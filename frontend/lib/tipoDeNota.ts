// lib/tipoDeNota.ts
//
// COMO SE RETRATA UNA NOTA EN EL DIARIO: la etiqueta pequeña de cada linea.
// Lo que la escribio una persona dice como nos enteramos (visita, llamada...);
// lo de Sali dice que es de Sali; lo migrado dice de donde vino.

const CANAL: Record<string, string> = {
  visita: "visita",
  llamada: "llamada",
  mail: "correo",
  escrito: "escrito",
  interno: "aviso interno",
};

const MIGRADA: Record<string, string> = {
  ficha_dropbox: "ficha de Dropbox",
  monday: "Monday",
  lectura_hoja: "hoja firmada",
  migracion: "migración",
};

/** Una nota del diario de la opp, con quien la escribio y con quien se hablo. */
export type NotaLeida = {
  id: string;
  fecha: string | null;
  creado_en: string;
  texto: string;
  autor: string | null;
  origen: string;
  canal: string | null;
  qp: { persona: { nombre: string } | null } | null;
  qs: { nombre: string } | null;
  qc: { nombre: string } | null;
};
export const SEL_NOTA =
  "id,fecha,creado_en,texto,autor,origen,canal," +
  "qp:quien_puesto_id(persona:persona_id(nombre)),qs:quien_persona_id(nombre),qc:quien_persona_comunidad_id(nombre)";

/** "Daniel · con Fermín Monge": quien la escribio y, si se dijo, con quien. */
export function quienDeNota(n: NotaLeida): string | null {
  const con = n.qp?.persona?.nombre ?? n.qs?.nombre ?? n.qc?.nombre ?? null;
  return [n.autor, con && "con " + con].filter(Boolean).join(" · ") || null;
}

export function tipoDeNota(origen: string, canal: string | null): string {
  if (origen === "sali") return "Sali";
  if (origen === "persona") return (canal && CANAL[canal]) || "escrito";
  return MIGRADA[origen] ?? origen;
}
