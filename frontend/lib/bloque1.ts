import "server-only";

// lib/bloque1.ts
//
// EL BLOQUE 1 CON MENU · DATOS Y CONTACTOS (Monica, 29-oct-2026): lo que se apunto al dar de alta cada administracion y
// que no se veia en la ficha de la opp: lo que NO hay que ofrecerle jamas y sus condiciones. Vive en
// administracion_origen (la ficha de la administracion lo edita); aqui solo se lee.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export type ReservaAdmin = { reservado: string | null; condiciones: string | null };

/** «ascensor_y_sate» -> «Ascensor y SATE» (los valores de la ficha de la administracion). */
export const textoReservado = (v: string) =>
  v
    .split("_y_")
    .map((x) => (x === "sate" ? "SATE" : x.charAt(0).toUpperCase() + x.slice(1)))
    .join(" y ");

export async function reservasDeAdministraciones(empresaIds: string[]): Promise<Map<string, ReservaAdmin>> {
  const ids = [...new Set(empresaIds.filter(Boolean))];
  const out = new Map<string, ReservaAdmin>();
  if (!ids.length || !URL_BASE) return out;
  const r = await fetch(
    `${URL_BASE}/rest/v1/administracion_origen?select=empresa_id,servicio_reservado,condiciones_notas&empresa_id=in.(${ids.join(",")})&order=creado_en.asc`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) return out;
  for (const f of (await r.json()) as { empresa_id: string; servicio_reservado: string | null; condiciones_notas: string | null }[])
    if (!out.has(f.empresa_id)) out.set(f.empresa_id, { reservado: f.servicio_reservado, condiciones: f.condiciones_notas });
  return out;
}
