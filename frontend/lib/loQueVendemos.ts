// lib/loQueVendemos.ts
//
// TIPOS DE PROYECTO Y SERVICIOS (Monica, 19-oct-2026): "un comercial ahora mismo
// no sabe que tiene para vender". Es la MISMA lista que sale en el buscador de
// "lo que les interesa" al dar de alta una opp (lib/altaOportunidad.ts): de
// tipos_proyecto, lo activo, elegible y contratable. Se lee en vivo, asi que un
// tipo nuevo en el catalogo sale aqui solo.
//
// Dos listas por la naturaleza: "proyecto" a un lado; "servicio" y "documento
// tecnico" al otro. Los agrupadores (elegible=false: Accesibilidad, Eficiencia
// energetica...) no se venden, pero salen de titulo para que se entienda el arbol.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

type Fila = {
  id: string;
  nombre: string;
  naturaleza: string | null;
  parent_id: string | null;
  orden: number;
  elegible: boolean;
  contratable: boolean;
};

/** Una linea de la lista: o un titulo (agrupador) o algo que se vende. */
export type LineaVenta = { id: string; nombre: string; nivel: number; titulo: boolean };

export async function loQueVendemos(): Promise<{ proyectos: LineaVenta[]; servicios: LineaVenta[]; documentos: LineaVenta[] }> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/tipos_proyecto?select=id,nombre,naturaleza,parent_id,orden,elegible,contratable&activo=is.true&order=orden.asc`,
    { headers: cab, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const filas = (await r.json()) as Fila[];
  const porId = new Map(filas.map((f) => [f.id, f]));
  const seVende = (f: Fila) => f.elegible && f.contratable;
  const nivel = (f: Fila) => {
    let n = 0;
    for (let p = f.parent_id && porId.get(f.parent_id); p; p = p.parent_id ? porId.get(p.parent_id) : undefined) n++;
    return n;
  };

  // Un agrupador sale solo si debajo hay algo que se vende.
  const conHijosEnVenta = new Set<string>();
  for (const f of filas.filter(seVende))
    for (let p = f.parent_id; p; p = porId.get(p)?.parent_id ?? null) conHijosEnVenta.add(p);

  const lista = (cumple: (f: Fila) => boolean): LineaVenta[] =>
    filas
      .filter((f) => cumple(f) && (seVende(f) || conHijosEnVenta.has(f.id)))
      .map((f) => ({ id: f.id, nombre: f.nombre, nivel: nivel(f), titulo: !seVende(f) }));

  // "Otros" no tiene naturaleza, pero lo que cuelga de el es proyecto.
  const esProyecto = (f: Fila) => f.naturaleza === "proyecto" || (f.naturaleza === null && conHijosEnVenta.has(f.id));
  return {
    proyectos: lista(esProyecto),
    servicios: lista((f) => f.naturaleza === "servicio"),
    documentos: lista((f) => f.naturaleza === "documento_tecnico"),
  };
}
