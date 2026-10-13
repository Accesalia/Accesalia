// lib/direccionOpp.ts
//
// LA DIRECCION DE UNA OPORTUNIDAD (Monica, 13-oct-2026): "NO EXISTEN DIRECCIONES
// SIN MUNICIPIO. Bolsa 3 no es nada, Bolsa 3 MADRID si". Sale siempre de sus
// accesos vivos (oportunidades > relacion_oportunidad_accesos > accesos), nunca
// del nombre de la comunidad, y siempre con su municipio: "Cl Bolsa 3 · Madrid".

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

type Acceso = { tipo_via: string | null; nombre_via: string | null; numero: string | null; escalera: string | null; municipio: string | null };

const titulo = (t: string | null) => (t ?? "").toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

/** "Cl Bolsa 3 · Madrid"; varios portales de la misma calle, seguidos: "Av Independencia 43, esc. 1 + 43, esc. 2 · San Sebastian De Los Reyes". */
export function direccionDeAccesos(accesos: Acceso[]): string {
  if (!accesos.length) return "Sin dirección";
  const portal = (a: Acceso) => [a.numero, a.escalera ? `esc. ${a.escalera}` : ""].filter(Boolean).join(", ");
  const calles = new Map<string, string[]>();
  for (const a of accesos) {
    const calle = [titulo(a.tipo_via), titulo(a.nombre_via)].filter(Boolean).join(" ");
    calles.set(calle, [...(calles.get(calle) ?? []), portal(a)]);
  }
  const txt = [...calles].map(([c, ps]) => `${c} ${ps.join(" + ")}`).join(" · ");
  const munis = [...new Set(accesos.map((a) => titulo(a.municipio)).filter(Boolean))].join(", ");
  return munis ? `${txt} · ${munis}` : txt;
}

/** La direccion (con municipio) de cada oportunidad. Las que no tienen accesos, no salen. */
export async function direccionesDeOpps(ids: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((x): x is string => !!x && /^[0-9a-f-]{36}$/.test(x)))];
  const out = new Map<string, string>();
  for (let i = 0; i < unicos.length; i += 150) {
    const trozo = unicos.slice(i, i + 150);
    const r = await fetch(
      `${URL_BASE}/rest/v1/relacion_oportunidad_accesos?select=opp_id,acceso:acceso_id(tipo_via,nombre_via,numero,escalera,municipio)&hasta=is.null&opp_id=in.(${trozo.join(",")})`,
      { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
    );
    if (!r.ok) throw new Error(`Supabase relacion_oportunidad_accesos ${r.status}: ${await r.text()}`);
    const filas = (await r.json()) as { opp_id: string; acceso: Acceso | null }[];
    const porOpp = new Map<string, Acceso[]>();
    for (const f of filas) if (f.acceso) porOpp.set(f.opp_id, [...(porOpp.get(f.opp_id) ?? []), f.acceso]);
    for (const [opp, accs] of porOpp) out.set(opp, direccionDeAccesos(accs));
  }
  return out;
}

/** "Cl Bolsa 3, Madrid": para dentro de una frase (el concepto de una proforma). */
export const enFrase = (direccion: string) => direccion.replace(/ · /g, ", ");
