// lib/viabilidadesListas.ts
//
// VIABILIDAD LISTA (Monica, 28-oct-2026: «si Alex ha terminado una viabilidad y
// la ha enviado, deberia aparecer en los pendientes del comercial»). La tarjeta
// estaba puesta desde el principio, vacia. Son las que el arquitecto ya ha
// enviado al comercial y el comercial aun no ha rematado (sus precios, tasas e
// ICIO y el texto): `enviada_en` puesta y `rematada_en` no. De opps abiertas.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export type ViabilidadLista = { id: string; opp: string; oppId: string; enviada: string; quien: string | null; rematada: string | null };

/** Las del comercial (su cartera); con `todas`, las de todos (direccion).
 *  `rematadas`: en vez de las por rematar, las que ya remato el comercial en el
 *  ultimo mes (Monica, 28-oct-2026: «discriminar entre lista desde arquitecto y
 *  lista, comercial remata»). */
export async function viabilidadesListas(comercialId: string | null, todas: boolean, rematadas = false): Promise<ViabilidadLista[]> {
  if (!todas && !comercialId) return [];
  const r = await fetch(
    `${URL_BASE}/rest/v1/viabilidades?select=id,enviada_en,rematada_en,redacta:redacta_id(nombre),oportunidades!inner(id,nombre,codigo,comercial_id,estado)` +
      `&vigente=is.true&enviada_en=not.is.null&oportunidades.estado=eq.abierta` +
      // Las rematadas: las del ultimo mes (29-oct-2026: antes pedia las sin rematar y la fecha llegaba vacia).
      (rematadas ? `&rematada_en=gte.${new Date(Date.now() - 30 * 86_400_000).toISOString()}` : `&rematada_en=is.null`) +
      (todas ? "" : `&oportunidades.comercial_id=eq.${comercialId}`) +
      `&order=${rematadas ? "rematada_en" : "enviada_en"}.desc&limit=500`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`viabilidades ${r.status}: ${await r.text()}`);
  type F = { id: string; enviada_en: string; rematada_en: string | null; redacta: { nombre: string } | null; oportunidades: { id: string; nombre: string | null; codigo: string | null } };
  return ((await r.json()) as F[]).map((f) => ({
    id: f.id,
    opp: f.oportunidades.nombre ?? f.oportunidades.codigo ?? "(sin nombre)",
    oppId: f.oportunidades.id,
    enviada: f.enviada_en,
    quien: f.redacta?.nombre ?? null,
    rematada: f.rematada_en,
  }));
}
