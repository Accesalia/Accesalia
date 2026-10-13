// lib/claves.ts
//
// LAS CLAVES DIR: el sitio, eje de todo (Monica, 13-oct-2026). Modelo en
// docs/clave-actuacion-areas.md (PROPUESTA EN PRUEBA); tabla en la migracion
// 20261013190000_claves_dir.sql; la carga inicial, scripts/poblar_claves.py.
//
//   CLAVE <── ACCESOS <── OPP   (la opp apunta a sus accesos; su clave sale de ellos)
//
// Dos momentos, y aqui estan los dos:
//   - al ENLAZAR LOS ACCESOS de una opp (alta, cambio de direccion): sus accesos
//     se enganchan a su clave. Si la direccion ya la tiene, a esa; si no, nace
//     una SIN NUMERO. Misma calle + numero + municipio = misma clave, y todos los
//     accesos de una opp en la misma.
//   - al FIRMAR una hoja: si la clave de la opp aun no tiene numero, recibe el
//     siguiente DIR (DIR + 5 cifras, sin año). El numero no cambia nunca.
//
// CONTROL que pide Monica: toda opp con accesos tiene clave. Si alguna no la
// tiene, algo falla.

import "server-only";

import { bonito } from "./direccionNombre";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function pedir(path: string, metodo: "POST" | "PATCH", cuerpo: unknown, devolver = false): Promise<unknown> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...CAB, "Content-Type": "application/json", Prefer: devolver ? "return=representation" : "return=minimal" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${metodo} ${path} ${r.status}: ${await r.text()}`);
  return devolver ? r.json() : null;
}

type Acceso = {
  id: string;
  municipio: string;
  tipo_via: string;
  nombre_via: string;
  numero: string;
  escalera: string;
  clave_id: string | null;
};
const CAMPOS = "id,municipio,tipo_via,nombre_via,numero,escalera,clave_id";

const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
const orden = (n: string) => [parseInt(n, 10) || 1e9, n] as const;

/** El nombre de una clave, desde TODOS sus accesos: "Ganapanes 31, 33 y 35, Madrid".
 *  Las escaleras no salen (la clave las tiene todas). */
export function nombreDeClave(accesos: Pick<Acceso, "municipio" | "nombre_via" | "numero">[]): string {
  if (!accesos.length) return "";
  const porVia = new Map<string, string[]>();
  const ordenados = [...accesos].sort(
    (a, b) => a.nombre_via.localeCompare(b.nombre_via, "es") || orden(a.numero)[0] - orden(b.numero)[0] || a.numero.localeCompare(b.numero),
  );
  for (const a of ordenados) {
    const ns = porVia.get(a.nombre_via) ?? [];
    const n = a.numero.replace(/\((\w+)\)/, " $1");
    if (!ns.includes(n)) ns.push(n);
    porVia.set(a.nombre_via, ns);
  }
  const trozos = Array.from(porVia, ([via, ns]) => `${bonito(via)} ${lista(ns)}`);
  return `${trozos.join(" + ")}, ${bonito(accesos[0].municipio)}`;
}

const enLista = (ids: string[]) => `(${ids.join(",")})`;

/** Engancha los accesos vivos de la opp a SU clave, y devuelve su id (o null si
 *  la opp aun no tiene accesos: la del movil, la provisional).
 *  - Las claves candidatas: las de sus accesos y las de los accesos con su misma
 *    calle + numero + municipio.
 *  - Ninguna: nace una clave nueva, sin numero.
 *  - Una: esa.
 *  - Varias: son el mismo sitio -> se FUSIONAN. Si solo una tiene numero, se
 *    queda esa (asi ningun numero pasa a alias sin necesidad); si no, la de MAS
 *    ACCESOS (regla de Monica). La absorbida conserva su codigo y apunta a la
 *    superviviente; sus accesos pasan a ella. */
export async function claveDesdeAccesos(oppId: string, quien: string | null = null): Promise<string | null> {
  const rels = await leer<{ acceso: Acceso | null }[]>(
    `relacion_oportunidad_accesos?select=acceso:acceso_id(${CAMPOS})&opp_id=eq.${oppId}&hasta=is.null`,
  );
  const suyos = rels.map((r) => r.acceso).filter((a): a is Acceso => !!a);
  if (!suyos.length) return null;

  // Los de su misma direccion (calle + numero + municipio), aunque no esten en la opp.
  const hermanos: Acceso[] = [];
  const vistas = new Set<string>();
  for (const a of suyos) {
    const k = `${a.municipio}|${a.tipo_via}|${a.nombre_via}|${a.numero}`;
    if (vistas.has(k)) continue;
    vistas.add(k);
    hermanos.push(
      ...(await leer<Acceso[]>(
        `accesos?select=${CAMPOS}&municipio=eq.${encodeURIComponent(a.municipio)}&tipo_via=eq.${encodeURIComponent(a.tipo_via)}` +
          `&nombre_via=eq.${encodeURIComponent(a.nombre_via)}&numero=eq.${encodeURIComponent(a.numero)}`,
      )),
    );
  }
  const todos = new Map<string, Acceso>([...hermanos, ...suyos].map((a) => [a.id, a]));
  const candidatas = [...new Set([...todos.values()].map((a) => a.clave_id).filter((x): x is string => !!x))];

  // Las absorbidas llevan a su superviviente.
  let claves = candidatas.length
    ? await leer<{ id: string; codigo: string | null; absorbida_por: string | null }[]>(
        `claves?select=id,codigo,absorbida_por&id=in.${enLista(candidatas)}`,
      )
    : [];
  const vivas = new Set(claves.map((c) => c.absorbida_por ?? c.id));
  claves = vivas.size
    ? await leer<{ id: string; codigo: string | null; absorbida_por: string | null }[]>(
        `claves?select=id,codigo,absorbida_por&id=in.${enLista([...vivas])}`,
      )
    : [];

  let claveId: string;
  if (!claves.length) {
    const [c] = (await pedir("claves", "POST", { nombre: nombreDeClave([...todos.values()]) }, true)) as { id: string }[];
    claveId = c.id;
  } else if (claves.length === 1) {
    claveId = claves[0].id;
  } else {
    // FUSION: varias claves resultan ser el mismo sitio.
    const cuenta = new Map<string, number>();
    for (const c of claves) {
      const n = await leer<{ id: string }[]>(`accesos?select=id&clave_id=eq.${c.id}`);
      cuenta.set(c.id, n.length);
    }
    const numeradas = claves.filter((c) => c.codigo);
    const superviviente =
      numeradas.length === 1 ? numeradas[0] : [...(numeradas.length ? numeradas : claves)].sort((a, b) => (cuenta.get(b.id) ?? 0) - (cuenta.get(a.id) ?? 0))[0];
    claveId = superviviente.id;
    const absorbidas = claves.filter((c) => c.id !== claveId).map((c) => c.id);
    await pedir(`accesos?clave_id=in.${enLista(absorbidas)}`, "PATCH", { clave_id: claveId });
    await pedir(`claves?id=in.${enLista(absorbidas)}`, "PATCH", {
      absorbida_por: claveId,
      absorbida_en: new Date().toISOString(),
      absorbida_quien: quien,
      notas: `Fusionada al enlazar los accesos de una oportunidad: el mismo sitio. Sobrevive ${superviviente.codigo ?? "la de mas accesos"}.`,
    });
    // Las que ya apuntaban a una absorbida, a la superviviente (sin cadenas).
    await pedir(`claves?absorbida_por=in.${enLista(absorbidas)}`, "PATCH", { absorbida_por: claveId });
  }

  // Sus accesos (y los de su misma direccion) a su clave, y el nombre al dia.
  const sinLaSuya = [...todos.values()].filter((a) => a.clave_id !== claveId).map((a) => a.id);
  if (sinLaSuya.length) await pedir(`accesos?id=in.${enLista(sinLaSuya)}`, "PATCH", { clave_id: claveId });
  const deLaClave = await leer<Acceso[]>(`accesos?select=${CAMPOS}&clave_id=eq.${claveId}`);
  await pedir(`claves?id=eq.${claveId}`, "PATCH", { nombre: nombreDeClave(deLaClave) });
  return claveId;
}

/** AL FIRMAR: la clave de la opp recibe su numero DIR si aun no lo tiene. Si la
 *  opp no tiene clave todavia (no tiene accesos), no hace nada: el control lo
 *  enseñara. Devuelve el codigo, o null. */
export async function numerarClaveDeOpp(oppId: string): Promise<string | null> {
  const claveId = await claveDesdeAccesos(oppId);
  if (!claveId) return null;
  const [c] = await leer<{ codigo: string | null }[]>(`claves?select=codigo&id=eq.${claveId}`);
  if (c?.codigo) return c.codigo;
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/siguiente_dir`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase siguiente_dir ${r.status}: ${await r.text()}`);
  const codigo = (await r.json()) as string;
  // Solo si sigue sin numero: dos firmas a la vez no dan dos DIR a la misma clave.
  await pedir(`claves?id=eq.${claveId}&codigo=is.null`, "PATCH", { codigo, numerada_en: new Date().toISOString() });
  const [d] = await leer<{ codigo: string | null }[]>(`claves?select=codigo&id=eq.${claveId}`);
  return d?.codigo ?? null;
}
