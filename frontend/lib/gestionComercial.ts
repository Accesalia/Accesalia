// lib/gestionComercial.ts
//
// LA GESTION COMERCIAL (Monica, 7-oct-2026): el cuadro de mando de Alejandra,
// la secretaria comercial, que ven tambien Daniel y Monica. "Habra varios
// botones de este tipo: opps creadas, comerciales asignados..."
//
// Lo primero que vive aqui es ASIGNAR EL COMERCIAL de cada oportunidad. Estaba
// en la cabecera de la oportunidad y "ahi no pinta nada": un comercial no
// necesita ver constantemente "la llevo yo".

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

export type OppAsignable = {
  id: string;
  codigo: string | null;
  nombre: string | null;
  estado: string;
  apertura: string | null;
  comercialId: string | null;
};

/** Las oportunidades vivas (abiertas y pausadas), con su comercial. */
export async function oppsAsignables(): Promise<OppAsignable[]> {
  const filas: OppAsignable[] = [];
  // De mil en mil: la API no da mas de golpe.
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(
      `${URL_BASE}/rest/v1/oportunidades?select=id,codigo,nombre,estado,fecha_apertura,comercial_id` +
        `&estado=in.(abierta,pausada)&order=fecha_apertura.desc.nullslast,nombre.asc`,
      { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" },
    );
    if (!r.ok) throw new Error(`Supabase oportunidades ${r.status}: ${await r.text()}`);
    const lote = (await r.json()) as { id: string; codigo: string | null; nombre: string | null; estado: string; fecha_apertura: string | null; comercial_id: string | null }[];
    filas.push(...lote.map((o) => ({ id: o.id, codigo: o.codigo, nombre: o.nombre, estado: o.estado, apertura: o.fecha_apertura, comercialId: o.comercial_id })));
    if (lote.length < 1000) break;
  }
  return filas;
}
