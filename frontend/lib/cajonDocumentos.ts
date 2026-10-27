import "server-only";
// lib/cajonDocumentos.ts
//
// EL CAJON DE DOCUMENTOS DE LA OPP (Monica, 25-oct-2026; maqueta validada docs/figma/recorrido-hoja-firmada.html).
// Cualquiera que entre en la opp suelta aqui lo que le llega; queda SIN ARCHIVAR (sin tipo) hasta que alguien dice que
// es: el propio comercial en el cajon, la secretaria comercial en su bandeja (en la hoja, o en «Documentos sueltos» si
// la opp no tiene hoja en la bandeja) y, mas adelante, facturacion. Todo en la tabla documentos, en el almacen de
// documentos comerciales, carpeta opp/<opp>/ (migracion 20261025180000).

import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
export const ALMACEN_CAJON = "documentos-comerciales";

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
const leer = async <T>(path: string): Promise<T> => (await pedir(path)).json() as Promise<T>;
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);

// ------------------------------------------------------------ los tipos a los que se archiva

/** Los de la maqueta: los de la opp y los de su comunidad. [nombre en el catalogo, como se lee]. */
const GRUPOS: { grupo: string; tipos: [string, string][] }[] = [
  {
    grupo: "De la opp",
    tipos: [
      // La hoja de encargo firmada por la comunidad: archivada asi, le sale al comercial para validarla (25-oct-2026).
      ["Hoja de encargo", "Hoja de encargo firmada"],
      ["Orden de compra de la contrata", "Orden de compra de la contrata"],
      ["Presupuesto de la contrata", "Presupuesto de la contrata"],
      ["Contrato", "Contrato"],
      ["Acta de votacion de la actuacion", "Acta de votación de la actuación"],
      ["Presupuesto comercial", "Presupuesto comercial"],
      ["Informe de viabilidad", "Informe de viabilidad"],
      ["Fotografía", "Fotografía"],
      ["Otro documento", "Otro documento"],
    ],
  },
  {
    grupo: "De la comunidad",
    tipos: [
      ["tarjeta_cif", "Tarjeta del CIF"],
      ["Acta de nombramiento del presidente", "Acta de nombramiento del presidente"],
      ["Certificado de titularidad de la cuenta", "Certificado de titularidad de la cuenta"],
      ["DNI", "DNI"],
    ],
  },
];
export type TipoCajon = { id: string; nombre: string; deComunidad: boolean };
export type GrupoTipos = { grupo: string; tipos: TipoCajon[] };

let cacheTipos: { id: string; nombre: string; pertenece_a: string }[] | null = null;
async function catalogo() {
  cacheTipos ??= await leer<{ id: string; nombre: string; pertenece_a: string }[]>("tipos_documento?select=id,nombre,pertenece_a");
  return cacheTipos;
}
export async function tiposCajon(): Promise<GrupoTipos[]> {
  const cat = await catalogo();
  return GRUPOS.map((g) => ({
    grupo: g.grupo,
    tipos: g.tipos.flatMap(([n, ver]) => {
      const t = cat.find((x) => x.nombre === n);
      return t ? [{ id: t.id, nombre: ver, deComunidad: t.pertenece_a === "comunidad" }] : [];
    }),
  }));
}
const comoSeLee = (nombre: string | undefined) => GRUPOS.flatMap((g) => g.tipos).find(([n]) => n === nombre)?.[1] ?? nombre ?? "";

// ------------------------------------------------------------ leer

export type DocCajon = { id: string; nombre: string; url: string | null; subidoPor: string | null; subido: string; tipo: string | null; archivadoPor: string | null; archivado: string | null };

async function firmar(rutas: string[]): Promise<Map<string, string>> {
  if (!rutas.length) return new Map();
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN_CAJON}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600, paths: rutas }),
    cache: "no-store",
  });
  if (!r.ok) return new Map();
  const filas = (await r.json()) as { path: string; signedURL: string | null }[];
  const publica = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;
  return new Map(filas.filter((f) => f.signedURL).map((f) => [f.path, `${publica}/storage/v1${f.signedURL}`]));
}

type Fila = { id: string; oportunidad_id: string; nombre: string | null; storage_ref: string | null; url_fichero: string | null; creado_en: string; archivado_en: string | null; subido_por: string | null; archivado_por: string | null; tipo: { nombre: string } | null };
const SEL = "id,oportunidad_id,nombre,storage_ref,url_fichero,creado_en,archivado_en,subido_por,archivado_por,tipo:tipos_documento(nombre)";

async function aDocs(filas: Fila[]): Promise<Map<string, DocCajon[]>> {
  const personas = [...new Set(filas.flatMap((f) => [f.subido_por, f.archivado_por]).filter((x): x is string => !!x))];
  const [urls, gente] = await Promise.all([
    firmar(filas.map((f) => f.storage_ref).filter((x): x is string => !!x)),
    personas.length ? leer<{ id: string; nombre: string }[]>(`equipo?select=id,nombre&id=in.(${personas.join(",")})`) : Promise.resolve([]),
  ]);
  const nombre = new Map(gente.map((p) => [p.id, p.nombre]));
  const out = new Map<string, DocCajon[]>();
  for (const f of filas) {
    const d: DocCajon = {
      id: f.id, nombre: f.nombre ?? f.storage_ref?.split("/").pop() ?? "documento", url: f.storage_ref ? (urls.get(f.storage_ref) ?? null) : f.url_fichero,
      subidoPor: f.subido_por ? (nombre.get(f.subido_por) ?? null) : null, subido: f.creado_en,
      tipo: f.tipo ? comoSeLee(f.tipo.nombre) : null, archivadoPor: f.archivado_por ? (nombre.get(f.archivado_por) ?? null) : null, archivado: f.archivado_en,
    };
    (out.get(f.oportunidad_id) ?? out.set(f.oportunidad_id, []).get(f.oportunidad_id)!).push(d);
  }
  return out;
}

/** El cajon de una opp: lo que se ha soltado en el (sin archivar y ya archivado). */
export async function cajonDeOpp(oppId: string): Promise<DocCajon[]> {
  if (!uuid(oppId)) return [];
  const filas = await leer<Fila[]>(`documentos?select=${SEL}&oportunidad_id=eq.${oppId}&nombre=not.is.null&vigente=is.true&order=creado_en`);
  return (await aDocs(filas)).get(oppId) ?? [];
}

/** Lo que esta sin archivar, por opp. Para la bandeja comercial. */
export async function sinArchivar(oppIds?: string[]): Promise<Map<string, DocCajon[]>> {
  const filtro = oppIds ? (oppIds.length ? `&oportunidad_id=in.(${oppIds.join(",")})` : null) : "";
  if (filtro === null) return new Map();
  const filas = await leer<Fila[]>(`documentos?select=${SEL}&tipo_documento_id=is.null&vigente=is.true${filtro}&order=creado_en`);
  return aDocs(filas);
}

// ------------------------------------------------------------ subir y archivar

const limpio = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._ -]/g, "").replace(/\s+/g, "_").slice(-90) || "documento";

/** Los permisos para subir directamente al almacen (como las fotos): una ruta firmada por fichero. */
export async function permisosCajon(oppId: string, nombres: string[]): Promise<{ ruta: string; url: string }[]> {
  if (!uuid(oppId)) throw new Error("Oportunidad no válida.");
  if (nombres.length < 1 || nombres.length > 20) throw new Error("Entre 1 y 20 documentos cada vez.");
  const publica = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;
  return Promise.all(
    nombres.map(async (n) => {
      const ruta = `opp/${oppId}/${crypto.randomUUID().slice(0, 8)}-${limpio(n)}`;
      const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${ALMACEN_CAJON}/${ruta}`, { method: "POST", headers: CAB, cache: "no-store" });
      if (!r.ok) throw new Error(`No se puede preparar la subida: ${r.status} ${await r.text()}`);
      const { url } = (await r.json()) as { url: string };
      return { ruta, url: `${publica}/storage/v1${url}` };
    }),
  );
}

/** Ya subidos: se apuntan en la opp, sin archivar. */
export async function apuntarEnCajon(yo: Yo, oppId: string, subidos: { ruta: string; nombre: string }[]): Promise<number> {
  if (!uuid(oppId)) throw new Error("Oportunidad no válida.");
  const buenos = subidos.filter((s) => s.ruta.startsWith(`opp/${oppId}/`));
  if (!buenos.length) return 0;
  await pedir("documentos", {
    method: "POST",
    body: JSON.stringify(
      buenos.map((s) => ({
        oportunidad_id: oppId, tipo_documento_id: null, backend: "supabase", storage_ref: s.ruta, naturaleza: "subido", nombre: s.nombre.slice(0, 200),
        subido_por: yo.id, grupo_id: crypto.randomUUID(), vigente: true,
      })),
    ),
  });
  return buenos.length;
}

/** QUITAR LO SUBIDO POR ERROR (Monica, 27-oct-2026: «no hay boton para eliminar si quiero arrepentirme»). Solo lo
 *  que esta SIN ARCHIVAR: lo archivado ya dice algo de la opp y no se borra. Se quita la fila y el fichero. */
export async function quitarDelCajon(docId: string, oppId: string): Promise<void> {
  if (!uuid(docId) || !uuid(oppId)) throw new Error("Documento no válido.");
  const [d] = await leer<{ storage_ref: string | null; oportunidad_id: string | null; tipo_documento_id: string | null }[]>(
    `documentos?select=storage_ref,oportunidad_id,tipo_documento_id&id=eq.${docId}`,
  );
  if (!d || d.oportunidad_id !== oppId) throw new Error("Ese documento no está en el cajón de esta opp.");
  if (d.tipo_documento_id) throw new Error("Ya está archivado: no se quita.");
  await pedir(`documentos?id=eq.${docId}&tipo_documento_id=is.null`, { method: "DELETE" });
  if (d.storage_ref?.startsWith(`opp/${oppId}/`))
    await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN_CAJON}/${d.storage_ref}`, { method: "DELETE", headers: CAB, cache: "no-store" });
}

/** Archivar: decir que es. Si es de la comunidad (la tarjeta del CIF, el DNI...), se cuelga tambien de su comunidad. */
export async function archivarDocumento(yo: Yo, docId: string, tipoId: string, soloDeOpp?: string): Promise<{ oppId: string }> {
  if (!uuid(docId) || !uuid(tipoId)) throw new Error("Documento o tipo no válido.");
  const [d] = await leer<{ id: string; oportunidad_id: string | null; tipo_documento_id: string | null }[]>(`documentos?select=id,oportunidad_id,tipo_documento_id&id=eq.${docId}`);
  if (!d?.oportunidad_id) throw new Error("Ese documento no está en el cajón de ninguna opp.");
  if (soloDeOpp && d.oportunidad_id !== soloDeOpp) throw new Error("Ese documento es de otra oportunidad.");
  if (d.tipo_documento_id) throw new Error("Ese documento ya está archivado.");
  const tipo = (await tiposCajon()).flatMap((g) => g.tipos).find((t) => t.id === tipoId);
  if (!tipo) throw new Error("Ese tipo no es de los del cajón.");
  const cambio: Record<string, unknown> = { tipo_documento_id: tipoId, archivado_en: new Date().toISOString(), archivado_por: yo.id };
  if (tipo.deComunidad) {
    const [o] = await leer<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${d.oportunidad_id}`);
    if (o?.comunidad_id) cambio.comunidad_id = o.comunidad_id;
  }
  await pedir(`documentos?id=eq.${docId}&tipo_documento_id=is.null`, { method: "PATCH", body: JSON.stringify(cambio) });
  return { oppId: d.oportunidad_id };
}
