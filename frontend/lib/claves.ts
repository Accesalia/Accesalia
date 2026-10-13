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

import { bonito, NOMBRE_TIPO } from "./direccionNombre";

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
export async function claveDesdeAccesos(oppId: string, quien: string | null = null, unirA: string | null = null): Promise<string | null> {
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
  // UNIR A ESA DIRECCION (Monica, 13-oct-2026): en el alta, el comercial eligio
  // la clave de la lista, o dijo "unir" porque comparte parcela con ella. Es una
  // candidata mas: si sus accesos ya estaban en otra, es una FUSION con la regla
  // de siempre, no un cambio de clave de los accesos.
  const candidatas = [
    ...new Set([...[...todos.values()].map((a) => a.clave_id), unirA].filter((x): x is string => !!x && /^[0-9a-f-]{36}$/.test(x))),
  ];

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

// ------------------------------------------------- el alta: la lista y Catastro
//
// "¿YA EXISTE ALGO AHI?" (Monica, 13-oct-2026). La lista del alta son las CLAVES
// (con DIR o sin el), no las comunidades. Elegir una NO se salta Catastro: abre
// su parcela con sus accesos marcados, y lo que se marque se suma a ella. Y si
// se busca una direccion cuya parcela comparte portales con otra clave (Norias
// 9 junto a la de 5 y 7), se pregunta UNA vez: ¿unir o direccion aparte?

export type ClaveBreve = { id: string; nombre: string; codigo: string | null };

/** Las claves vivas (no absorbidas), para la lista del alta. */
export async function listaDeClaves(): Promise<ClaveBreve[]> {
  // La base da como mucho 1.000 filas por consulta: por tandas.
  const filas: { id: string; nombre: string | null; codigo: string | null }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const tanda = await leer<typeof filas>(`claves?select=id,nombre,codigo&absorbida_por=is.null&order=nombre.asc,id.asc&limit=1000&offset=${desde}`);
    filas.push(...tanda);
    if (tanda.length < 1000) break;
  }
  // EL TIPO DE VIA, entre parentesis al final (Monica, 13-oct-2026): Avenida y
  // Travesia Dos de Mayo son sitios distintos, y al final no cambia el orden.
  const tipos = new Map<string, Set<string>>();
  for (let desde = 0; ; desde += 1000) {
    const tanda = await leer<{ clave_id: string; tipo_via: string }[]>(
      `accesos?select=clave_id,tipo_via&clave_id=not.is.null&order=id.asc&limit=1000&offset=${desde}`,
    );
    for (const a of tanda) if (a.tipo_via) tipos.set(a.clave_id, (tipos.get(a.clave_id) ?? new Set()).add(a.tipo_via));
    if (tanda.length < 1000) break;
  }
  const conVia = (c: { id: string; nombre: string }) => {
    const ts = [...(tipos.get(c.id) ?? [])].map((t) => NOMBRE_TIPO[t] ?? t);
    return ts.length ? `${c.nombre} (${ts.join(", ")})` : c.nombre;
  };
  return filas.filter((c) => c.nombre).map((c) => ({ id: c.id, nombre: conVia({ id: c.id, nombre: c.nombre! }), codigo: c.codigo }));
}

/** Lo que identifica un portal de Catastro en la ventana: parcela|numero|escalera. */
const clavePortal = (parcela: string, numero: string, escalera: string | null) => `${parcela}|${numero}|${escalera ?? ""}`;

/** Una clave elegida en la lista: sus parcelas y sus portales, para abrir Catastro
 *  con ellos ya marcados. Sin parcela (accesos antiguos sin referencia), null. */
export async function abrirClave(claveId: string): Promise<{
  clave: ClaveBreve;
  parcelas: string[];
  marcados: string[];
  via: { tipo: string; nombre: string; municipio: string };
  numero: string;
} | null> {
  if (!/^[0-9a-f-]{36}$/.test(claveId)) return null;
  const [c] = await leer<{ id: string; nombre: string | null; codigo: string | null; absorbida_por: string | null }[]>(
    `claves?select=id,nombre,codigo,absorbida_por&id=eq.${claveId}`,
  );
  if (!c) return null;
  if (c.absorbida_por) return abrirClave(c.absorbida_por);
  const accs = await leer<(Acceso & { ref_catastral: string | null })[]>(`accesos?select=${CAMPOS},ref_catastral&clave_id=eq.${claveId}`);
  const conParcela = accs.filter((a) => a.ref_catastral);
  if (!conParcela.length) return null;
  const a = conParcela[0];
  return {
    clave: { id: c.id, nombre: c.nombre ?? "", codigo: c.codigo },
    parcelas: [...new Set(conParcela.map((x) => x.ref_catastral!))],
    marcados: conParcela.map((x) => clavePortal(x.ref_catastral!, x.numero, x.escalera)),
    via: { tipo: a.tipo_via, nombre: a.nombre_via, municipio: a.municipio },
    numero: a.numero,
  };
}

/** De que clave es ya cada portal de estas parcelas (los que lo son). */
export async function clavesDePortales(parcelas: string[]): Promise<Record<string, ClaveBreve>> {
  const limpias = parcelas.filter((p) => /^[0-9A-Z]{14,20}$/.test(p));
  if (!limpias.length) return {};
  const accs = await leer<{ ref_catastral: string; numero: string; escalera: string | null; clave_id: string }[]>(
    `accesos?select=ref_catastral,numero,escalera,clave_id&ref_catastral=in.${enLista(limpias)}&clave_id=not.is.null`,
  );
  if (!accs.length) return {};
  const ids = [...new Set(accs.map((a) => a.clave_id))];
  const cs = await leer<{ id: string; nombre: string | null; codigo: string | null; absorbida_por: string | null }[]>(
    `claves?select=id,nombre,codigo,absorbida_por&id=in.${enLista(ids)}`,
  );
  // Una absorbida cuenta como su superviviente.
  const sup = [...new Set(cs.map((c) => c.absorbida_por).filter((x): x is string => !!x))];
  const supervivientes = sup.length
    ? await leer<{ id: string; nombre: string | null; codigo: string | null }[]>(`claves?select=id,nombre,codigo&id=in.${enLista(sup)}`)
    : [];
  const breve = new Map<string, ClaveBreve>();
  for (const c of [...cs, ...supervivientes]) breve.set(c.id, { id: c.id, nombre: c.nombre ?? "", codigo: c.codigo });
  const viva = (id: string) => {
    const c = cs.find((x) => x.id === id);
    return breve.get(c?.absorbida_por ?? id)!;
  };
  return Object.fromEntries(accs.map((a) => [clavePortal(a.ref_catastral, a.numero, a.escalera), viva(a.clave_id)]));
}
