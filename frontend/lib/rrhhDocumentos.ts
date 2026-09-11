// lib/rrhhDocumentos.ts
//
// Los ficheros de RRHH: almacen privado `rrhh` (Supabase Storage) + una fila
// en rrhh_documentos por fichero. Solo de servidor, con la clave secreta.
//
// QUIEN SUBE Y QUIEN VE (Monica, 11-sep-2026):
//   - cada empleado ve lo suyo y los documentos de toda la plantilla, y sube
//     lo suyo que solo el tiene (DNI, titulacion, IRPF, justificantes,
//     reconocimiento medico);
//   - RRHH y direccion ven y suben todo (tambien contratos y nominas);
//   - los de toda la plantilla (convenio, calendario, normativa) los sube RRHH.
// La pagina y las acciones preguntan aqui con puedeSubir / puedeVer.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const ALMACEN = "rrhh";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...cab, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

// ---------------------------------------------------------------------------
// Tipos de documento
// ---------------------------------------------------------------------------

export type TipoDoc =
  | "nomina" | "contrato" | "novacion" | "dni" | "titulacion" | "irpf" | "justificante" | "reconocimiento_medico"
  | "convenio" | "calendario" | "normativa" | "otro";

export const TIPO_DOC: Record<TipoDoc, string> = {
  nomina: "Nómina",
  contrato: "Contrato",
  novacion: "Cambio de contrato",
  dni: "DNI o NIE",
  titulacion: "Titulación",
  irpf: "IRPF (modelo 145)",
  justificante: "Justificante",
  reconocimiento_medico: "Reconocimiento médico",
  convenio: "Convenio colectivo",
  calendario: "Calendario laboral",
  normativa: "Normativa interna",
  otro: "Otro",
};

/** Los de cada persona, en el orden en que se enseñan. */
export const PERSONALES: TipoDoc[] = ["contrato", "novacion", "dni", "titulacion", "irpf", "justificante", "reconocimiento_medico", "nomina", "otro"];
/** Los de toda la plantilla. */
export const DE_EMPRESA: TipoDoc[] = ["convenio", "calendario", "normativa"];
/** Lo que cada empleado puede subir de lo suyo. */
const SUBE_EL_EMPLEADO: TipoDoc[] = ["dni", "titulacion", "irpf", "justificante", "reconocimiento_medico"];

export const esTipo = (t: string): t is TipoDoc => t in TIPO_DOC;

/** personaId null = documento de toda la plantilla. */
export function puedeSubir(yoId: string, gestor: boolean, personaId: string | null, tipo: TipoDoc): boolean {
  if (personaId === null) return gestor && DE_EMPRESA.includes(tipo);
  if (DE_EMPRESA.includes(tipo)) return false;
  if (gestor) return true;
  return personaId === yoId && SUBE_EL_EMPLEADO.includes(tipo);
}

export function puedeVer(yoId: string, gestor: boolean, doc: { personaId: string | null }): boolean {
  return doc.personaId === null || gestor || doc.personaId === yoId;
}

// ---------------------------------------------------------------------------
// Filas
// ---------------------------------------------------------------------------

export type DocRrhh = {
  id: string;
  personaId: string | null;
  tipo: TipoDoc;
  periodo: string | null;
  titulo: string | null;
  fichero: string;
  creadoEn: string;
};

type Fila = { id: string; persona_id: string | null; tipo: TipoDoc; periodo: string | null; titulo: string | null; fichero: string; creado_en: string };
const comoDoc = (f: Fila): DocRrhh => ({
  id: f.id,
  personaId: f.persona_id,
  tipo: f.tipo,
  periodo: f.periodo,
  titulo: f.titulo,
  fichero: f.fichero,
  creadoEn: f.creado_en,
});
const SEL = "id,persona_id,tipo,periodo,titulo,fichero,creado_en";

export async function documentosDe(personaId: string): Promise<DocRrhh[]> {
  const f = await rest<Fila[]>(`rrhh_documentos?select=${SEL}&persona_id=eq.${personaId}&order=periodo.desc.nullslast,creado_en.desc`);
  return f.map(comoDoc);
}

export async function documentosDeEmpresa(): Promise<DocRrhh[]> {
  const f = await rest<Fila[]>(`rrhh_documentos?select=${SEL}&persona_id=is.null&order=creado_en.desc`);
  return f.map(comoDoc);
}

export async function documento(id: string): Promise<DocRrhh | null> {
  const [f] = await rest<Fila[]>(`rrhh_documentos?select=${SEL}&id=eq.${id}&limit=1`);
  return f ? comoDoc(f) : null;
}

// ---------------------------------------------------------------------------
// El almacen
// ---------------------------------------------------------------------------

/** Nombre de fichero seguro para la ruta: sin tildes, espacios ni rarezas. */
function limpio(nombre: string): string {
  const base = nombre.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const s = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80);
  return s || "fichero";
}

export const prefijo = (personaId: string | null, tipo: TipoDoc) =>
  personaId ? `personas/${personaId}/${tipo}/` : `empresa/${tipo}/`;

/** Permiso de un solo uso para subir UN fichero a UNA ruta. Devuelve la ruta y la direccion de subida. */
export async function permisoDeSubida(personaId: string | null, tipo: TipoDoc, nombre: string): Promise<{ ruta: string; url: string }> {
  const ruta = `${prefijo(personaId, tipo)}${crypto.randomUUID().slice(0, 8)}-${limpio(nombre)}`;
  const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${ALMACEN}/${ruta}`, { method: "POST", headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
  const { url } = (await r.json()) as { url: string };
  // La direccion la usa el navegador: tiene que ser la publica de Supabase.
  const publica = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;
  return { ruta, url: `${publica}/storage/v1${url}` };
}

/** ¿Esta de verdad el fichero en el almacen? (antes de apuntarlo) */
export async function existe(ruta: string): Promise<boolean> {
  const r = await fetch(`${URL_BASE}/storage/v1/object/info/${ALMACEN}/${ruta}`, { headers: cab, cache: "no-store" });
  return r.ok;
}

/** Enlace para abrir un fichero, que caduca en un minuto. */
export async function enlaceDeDescarga(ruta: string, nombre: string | null): Promise<string> {
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...cab, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
  const { signedURL } = (await r.json()) as { signedURL: string };
  const publica = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;
  const descarga = nombre ? `&download=${encodeURIComponent(nombre)}` : "";
  return `${publica}/storage/v1${signedURL}${descarga}`;
}

async function borrarFichero(ruta: string) {
  await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, { method: "DELETE", headers: cab, cache: "no-store" });
}

// ---------------------------------------------------------------------------
// Apuntar y borrar
// ---------------------------------------------------------------------------

/**
 * Apunta un fichero ya subido. Una nomina por persona y mes: si ya habia una
 * de ese mes, la nueva la sustituye (y el fichero viejo se borra).
 */
export async function apuntar(d: {
  personaId: string | null;
  tipo: TipoDoc;
  periodo: string | null;
  titulo: string | null;
  ruta: string;
  subidoPor: string;
}): Promise<string> {
  if (d.tipo === "nomina" && d.personaId && d.periodo) {
    const [vieja] = await rest<Fila[]>(
      `rrhh_documentos?select=${SEL}&persona_id=eq.${d.personaId}&tipo=eq.nomina&periodo=eq.${d.periodo}&limit=1`,
    );
    if (vieja) {
      await rest(`rrhh_documentos?id=eq.${vieja.id}`, {
        method: "PATCH",
        body: JSON.stringify({ fichero: d.ruta, titulo: d.titulo, subido_por: d.subidoPor }),
        headers: { Prefer: "return=minimal" },
      });
      if (vieja.fichero !== d.ruta) await borrarFichero(vieja.fichero);
      return vieja.id;
    }
  }
  const [nuevo] = await rest<{ id: string }[]>("rrhh_documentos?select=id", {
    method: "POST",
    body: JSON.stringify({
      persona_id: d.personaId,
      tipo: d.tipo,
      periodo: d.periodo,
      titulo: d.titulo,
      fichero: d.ruta,
      subido_por: d.subidoPor,
    }),
    headers: { Prefer: "return=representation" },
  });
  return nuevo.id;
}

// ---------------------------------------------------------------------------
// Para el reparto de nominas: el PDF de la gestoria entra entero en lotes/ y
// sale troceado, una pagina en la carpeta de cada persona.
// ---------------------------------------------------------------------------

export const PREFIJO_LOTES = "lotes/";

export async function permisoDeSubidaLote(nombre: string): Promise<{ ruta: string; url: string }> {
  const ruta = `${PREFIJO_LOTES}${crypto.randomUUID().slice(0, 8)}-${limpio(nombre)}`;
  const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${ALMACEN}/${ruta}`, { method: "POST", headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
  const { url } = (await r.json()) as { url: string };
  const publica = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;
  return { ruta, url: `${publica}/storage/v1${url}` };
}

export async function bajarBytes(ruta: string): Promise<Uint8Array> {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
  return new Uint8Array(await r.arrayBuffer());
}

export async function subirBytes(ruta: string, bytes: Uint8Array, tipo = "application/pdf") {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...cab, "Content-Type": tipo, "x-upsert": "true" },
    body: Buffer.from(bytes),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
}

export { borrarFichero };

export async function borrar(doc: DocRrhh) {
  await rest(`rrhh_documentos?id=eq.${doc.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  await borrarFichero(doc.fichero);
}
