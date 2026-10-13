// lib/direccionOpp.ts
//
// LA DIRECCION DE UNA OPORTUNIDAD ES SU NOMBRE (Monica, 13-oct-2026): "son tres
// entidades y cada una debe tener su nombre": comunidad, acceso y opp. TODA la
// app lee la direccion como oportunidades.nombre: ni el "CP ..." de la
// comunidad, ni algo calculado al vuelo desde los accesos.
//
// El nombre nace en el alta de la opp: el que propone la app con los accesos
// marcados (lib/direccionNombre.ts, nombrePropuesto), o el que ponga el
// comercial. Despues no cambia solo.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

/** El nombre de la opp; sin el, su codigo, para que al menos se reconozca. */
export function nombreDeOpp(o: { nombre?: string | null; codigo?: string | null } | null | undefined): string {
  return o?.nombre?.trim() || o?.codigo || "Sin nombre";
}

/** El nombre de cada oportunidad (o su codigo, si no tiene). */
export async function nombresDeOpps(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((x): x is string => !!x && /^[0-9a-f-]{36}$/.test(x)))];
  const out = new Map<string, string>();
  for (let i = 0; i < unicos.length; i += 150) {
    const trozo = unicos.slice(i, i + 150);
    const r = await fetch(`${URL_BASE}/rest/v1/oportunidades?select=id,nombre,codigo&id=in.(${trozo.join(",")})`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase oportunidades ${r.status}: ${await r.text()}`);
    for (const o of (await r.json()) as { id: string; nombre: string | null; codigo: string | null }[]) out.set(o.id, nombreDeOpp(o));
  }
  return out;
}

/** Para dentro de una frase (el concepto de una proforma). */
export const enFrase = (direccion: string) => direccion.replace(/ · /g, ", ");
