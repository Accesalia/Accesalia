// app/comercial/viabilidad-sin-polycam/datos.ts
//
// Lo que necesita el formulario "Pedir viabilidad y costes al arquitecto" (sin
// Polycam), ya preparado para pasarselo a <PedirViabilidad {...datos} />: los
// accesos de la opp, lo que dicen que quieren y el catalogo de lo que vendemos en
// sus cuatro columnas.

import "server-only";
import { formularioSolicitud } from "../../../lib/solicitudViabilidad";
import { columnasDeInteres } from "../../../lib/columnasInteres";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export type DatosPedirViabilidad = {
  oppId: string;
  accesos: { id: string; texto: string }[];
  /** Lo que dicen que quieren: viene marcado y se puede cambiar (solo para esta solicitud). */
  inicial: string[];
  opciones: { valor: string; texto: string; pista?: string }[];
  grupos: { titulo: string; valores: string[] }[];
};

export async function datosPedirViabilidad(oppId: string): Promise<DatosPedirViabilidad | null> {
  const [f, tipos] = await Promise.all([
    formularioSolicitud(oppId),
    // El mismo catalogo que el alta de la opp: lo contratable, con cuanto se pide.
    fetch(
      `${URL_BASE}/rest/v1/tipos_proyecto?select=id,nombre,padre:parent_id(nombre),usos:oportunidad_tipos(count)` +
        "&activo=is.true&elegible=is.true&contratable=is.true&order=orden.asc",
      { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
    ).then((r) => r.json() as Promise<{ id: string; nombre: string; padre: { nombre: string } | null; usos: { count: number }[] }[]>),
  ]);
  if (!f) return null;
  const cat = tipos.map((t) => ({ id: t.id, nombre: t.nombre, pista: t.padre?.nombre ?? undefined, usos: t.usos?.[0]?.count ?? 0 }));
  return {
    oppId,
    accesos: f.accesos,
    inicial: f.tipos,
    opciones: cat.map((t) => ({ valor: t.id, texto: t.nombre, pista: t.pista })),
    grupos: columnasDeInteres(cat),
  };
}
