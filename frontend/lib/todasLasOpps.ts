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
//
// EL ADMINISTRADOR, el gestor que la lleva (Monica, 20-oct-2026), con filtro.
// Sale de la vista base administradores_de_oportunidad (opp -> accesos ->
// comunidad -> admin), nunca de un campo de la opp. Una opp con varias
// comunidades puede tener varios: salen todos.
//
// LA DIR de cada opp, para "Ver por DIR" (Monica, 20-oct-2026): la clave de sus
// accesos (accesos.clave_id). Si una clave fue absorbida, manda la que la
// absorbio.

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
  /** Sus administradores: el gestor (si se sabe) y su administracion. La clave
   *  es el puesto del gestor, o "e:<empresa>" si solo se sabe la empresa. */
  admins: { clave: string; gestor: string | null; empresa: string | null }[];
  /** Su DIR: el codigo solo lo tiene desde la primera firma. Sin accesos, null. */
  dir: { id: string; codigo: string | null; nombre: string } | null;
};

export type ComercialLista = { id: string; nombre: string; activo: boolean };

export async function todasLasOpps(): Promise<{ filas: FilaTodas[]; comerciales: ComercialLista[] }> {
  const [opps, rel, comerciales, adm, claves] = await Promise.all([
    todo<{ id: string; codigo: string | null; nombre: string | null; estado: FilaTodas["estado"]; fecha_apertura: string | null; comercial_id: string | null }>(
      "oportunidades?select=id,codigo,nombre,estado,fecha_apertura,comercial_id&estado=neq.anulada&order=fecha_apertura.desc.nullslast,id.asc",
    ),
    todo<{ opp_id: string; acceso: { municipio: string | null; clave_id: string | null } | null }>(
      "relacion_oportunidad_accesos?select=opp_id,acceso:acceso_id(municipio,clave_id)&hasta=is.null&order=opp_id,acceso_id",
    ),
    todo<ComercialLista>("comerciales?select=id,nombre,activo&order=nombre.asc"),
    todo<{ oportunidad_id: string; puesto_id: string | null; empresa_id: string | null; p: { persona: { nombre: string | null; apellidos: string | null } | null } | null; e: { nombre_accesalia: string | null } | null }>(
      "administradores_de_oportunidad?select=oportunidad_id,puesto_id,empresa_id,p:puesto_id(persona:persona_id(nombre,apellidos)),e:empresa_id(nombre_accesalia)" +
        "&or=(puesto_id.not.is.null,empresa_id.not.is.null)&order=oportunidad_id,comunidad_id",
    ),
    todo<{ id: string; codigo: string | null; nombre: string | null; absorbida_por: string | null }>("claves?select=id,codigo,nombre,absorbida_por&order=id"),
  ]);

  const porClave = new Map(claves.map((c) => [c.id, c]));
  const viva = (id: string) => {
    let c = porClave.get(id);
    for (let i = 0; c?.absorbida_por && i < 10; i++) c = porClave.get(c.absorbida_por) ?? c;
    return c;
  };
  const dirs = new Map<string, FilaTodas["dir"]>();
  for (const r of rel) {
    if (dirs.has(r.opp_id) || !r.acceso?.clave_id) continue;
    const c = viva(r.acceso.clave_id);
    if (c) dirs.set(r.opp_id, { id: c.id, codigo: c.codigo, nombre: c.nombre?.trim() || "Sin nombre" });
  }

  const admins = new Map<string, FilaTodas["admins"]>();
  for (const a of adm) {
    const clave = a.puesto_id ?? `e:${a.empresa_id}`;
    const gestor = [a.p?.persona?.nombre, a.p?.persona?.apellidos].map((x) => x?.trim()).filter(Boolean).join(" ") || null;
    const l = admins.get(a.oportunidad_id) ?? [];
    if (!l.some((x) => x.clave === clave)) l.push({ clave, gestor, empresa: a.e?.nombre_accesalia?.trim() || null });
    admins.set(a.oportunidad_id, l);
  }

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
      admins: admins.get(o.id) ?? [],
      dir: dirs.get(o.id) ?? null,
    })),
    comerciales,
  };
}
