// lib/todasLasOpps.ts
//
// TODAS LAS OPPS, PARA DIRECCION (Monica, 20-oct-2026): "en Gestiones de la
// app, un listado de opps, todas: nombre, municipio, codigo, comercial, fecha
// de apertura y estado. Y que desde esa misma pantalla pueda cambiar el
// comercial asignado o el estado." Con filtros y un buscador.
//
// "Todas" son todas menos las anuladas: una anulada no es nada (ver la ficha).
// El municipio sale de sus accesos vivos, nunca del nombre: una opp puede tener
// portales en dos municipios, y entonces salen los dos.

import "server-only";
import { nombreDeOpp } from "./direccionOpp";
import { bonito } from "./direccionNombre";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

/** Todo, de mil en mil: la API no da mas de golpe. Sin guardar: lo que se
 *  acaba de cambiar tiene que verse al momento. */
async function todo<T>(path: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const lote = (await r.json()) as T[];
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  return filas;
}

export type FilaTodas = {
  id: string;
  nombre: string;
  municipio: string;
  codigo: string | null;
  comercialId: string | null;
  apertura: string | null;
  estado: "abierta" | "pausada" | "cerrada";
};

export type ComercialLista = { id: string; nombre: string; activo: boolean };

export async function todasLasOpps(): Promise<{ filas: FilaTodas[]; comerciales: ComercialLista[] }> {
  const [opps, rel, comerciales] = await Promise.all([
    todo<{ id: string; codigo: string | null; nombre: string | null; estado: FilaTodas["estado"]; fecha_apertura: string | null; comercial_id: string | null }>(
      "oportunidades?select=id,codigo,nombre,estado,fecha_apertura,comercial_id&estado=neq.anulada&order=fecha_apertura.desc.nullslast,id.asc",
    ),
    todo<{ opp_id: string; acceso: { municipio: string | null } | null }>(
      "relacion_oportunidad_accesos?select=opp_id,acceso:acceso_id(municipio)&hasta=is.null&order=opp_id,acceso_id",
    ),
    todo<ComercialLista>("comerciales?select=id,nombre,activo&order=nombre.asc"),
  ]);

  const municipios = new Map<string, Set<string>>();
  for (const r of rel) {
    const m = r.acceso?.municipio?.trim();
    if (!m) continue;
    if (!municipios.has(r.opp_id)) municipios.set(r.opp_id, new Set());
    municipios.get(r.opp_id)!.add(bonito(m));
  }

  return {
    filas: opps.map((o) => ({
      id: o.id,
      nombre: nombreDeOpp(o),
      municipio: [...(municipios.get(o.id) ?? [])].sort().join(", "),
      codigo: o.codigo,
      comercialId: o.comercial_id,
      apertura: o.fecha_apertura,
      estado: o.estado,
    })),
    comerciales,
  };
}
