// lib/factusol/clientes.ts
//
// LOS CLIENTES DE FACTUSOL, LEIDOS DE SU FICHERO (Monica, 25-oct-2026). El nucleo, sin nada de Next: lo usan la app
// (el boton «Revisar ahora» y la pasada de cada noche, que bajan el fichero del Dropbox) y el script de la primera
// carga (que lo lee del Dropbox sincronizado de un PC). Asi hay UN solo programa que lee y guarda.
//
// Factusol guarda un fichero por EMPRESA y AÑO (002 = Accesalia, 001 = Daniel autonomo, 003 = Ecobalance) y cada uno
// lleva su tabla de clientes, F_CLI. Se lee solo, sobre una copia en memoria: nunca se escribe en Factusol.
// Factusol identifica al cliente por su CODIGO; el NIF sirve para casarlo con nuestras comunidades y contratas.

import MDBReader from "mdb-reader";

export type Empresa = "accesalia" | "daniel" | "ecobalance";
/** El prefijo del fichero de cada empresa en Factusol: 0022026.accdb = Accesalia, 2026. */
export const FICHERO_EMPRESA: Record<Empresa, string> = { accesalia: "002", daniel: "001", ecobalance: "003" };
/** La carpeta de los datos de Factusol dentro del Dropbox. */
export const CARPETA_FACTUSOL = "/D SM/factusol/FACTUSOL/Datos/FS";
export const rutaFichero = (e: Empresa, anio: number) => `${CARPETA_FACTUSOL}/${FICHERO_EMPRESA[e]}${anio}.accdb`;

export type ClienteFactusol = {
  codigo: number;
  nif: string | null;
  nombre_fiscal: string | null;
  nombre_comercial: string | null;
  domicilio: string | null;
  poblacion: string | null;
  cp: string | null;
  provincia: string | null;
  email: string | null;
  fecha_alta: string | null;
};

const txt = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  return s ? s : null;
};
/** El NIF como se compara: sin espacios, guiones ni puntos, en mayusculas. */
export const nifLimpio = (v: string | null | undefined) => (v ?? "").replace(/[\s.\-]/g, "").toUpperCase() || null;

/** Los clientes de un fichero de Factusol (el .accdb entero, en memoria). */
export function leerClientes(fichero: Buffer): ClienteFactusol[] {
  const filas = new MDBReader(fichero).getTable("F_CLI").getData({
    columns: ["CODCLI", "NIFCLI", "NOFCLI", "NOCCLI", "DOMCLI", "POBCLI", "CPOCLI", "PROCLI", "EMACLI", "FALCLI"],
  });
  return filas
    .filter((f) => typeof f.CODCLI === "number")
    .map((f) => ({
      codigo: f.CODCLI as number,
      nif: nifLimpio(txt(f.NIFCLI)),
      nombre_fiscal: txt(f.NOFCLI),
      nombre_comercial: txt(f.NOCCLI),
      domicilio: txt(f.DOMCLI),
      poblacion: txt(f.POBCLI),
      cp: txt(f.CPOCLI),
      provincia: txt(f.PROCLI),
      email: txt(f.EMACLI),
      // Factusol pone 1900 cuando no hay fecha.
      fecha_alta: f.FALCLI instanceof Date && f.FALCLI.getUTCFullYear() > 1900 ? f.FALCLI.toISOString().slice(0, 10) : null,
    }));
}

type Base = { url: string; llave: string };
async function pedir<T>(b: Base, ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${b.url}/rest/v1/${ruta}`, {
    ...init,
    headers: { apikey: b.llave, Authorization: `Bearer ${b.llave}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

export type Resumen = { empresa: Empresa; leidos: number; nuevos: number; quitados: number; conComunidad: number; conContrata: number };

/** Guarda lo leido de una empresa: pone al dia los que hay, añade los nuevos y quita los que ya no estan en Factusol
 *  (es una copia para consultar). Casa cada uno por NIF con su comunidad o su contrata. */
export async function guardarClientes(b: Base, empresa: Empresa, clientes: ClienteFactusol[]): Promise<Resumen> {
  const [comunidades, contratas, antes] = await Promise.all([
    pedir<{ id: string; cif_comunidad: string | null }[]>(b, "comunidades?select=id,cif_comunidad&cif_comunidad=not.is.null&limit=20000"),
    pedir<{ id: string; cif: string | null }[]>(b, "contratas?select=id,cif&cif=not.is.null&limit=5000"),
    pedir<{ id: string; codigo: number; persona_id: string | null }[]>(b, `factusol_clientes?select=id,codigo,persona_id&empresa=eq.${empresa}&limit=20000`),
  ]);
  const comunidadDe = new Map<string, string>();
  for (const c of comunidades) { const n = nifLimpio(c.cif_comunidad); if (n && !comunidadDe.has(n)) comunidadDe.set(n, c.id); }
  const contrataDe = new Map<string, string>();
  for (const c of contratas) { const n = nifLimpio(c.cif); if (n && !contrataDe.has(n)) contrataDe.set(n, c.id); }
  const ahora = new Date().toISOString();
  const yaEstaban = new Map(antes.map((a) => [a.codigo, a]));
  const filas = clientes.map((c) => ({
    empresa,
    ...c,
    comunidad_id: c.nif ? comunidadDe.get(c.nif) ?? null : null,
    contrata_id: c.nif ? contrataDe.get(c.nif) ?? null : null,
    // La persona se pone a mano (la agenda no guarda NIF): se conserva.
    persona_id: yaEstaban.get(c.codigo)?.persona_id ?? null,
    leido_en: ahora,
  }));
  for (let i = 0; i < filas.length; i += 500)
    await pedir(b, "factusol_clientes?on_conflict=empresa,codigo", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(filas.slice(i, i + 500)),
    });
  const siguen = new Set(clientes.map((c) => c.codigo));
  const quitar = antes.filter((a) => !siguen.has(a.codigo)).map((a) => a.id);
  for (let i = 0; i < quitar.length; i += 200)
    await pedir(b, `factusol_clientes?id=in.(${quitar.slice(i, i + 200).join(",")})`, { method: "DELETE" });
  return {
    empresa,
    leidos: clientes.length,
    nuevos: clientes.filter((c) => !yaEstaban.has(c.codigo)).length,
    quitados: quitar.length,
    conComunidad: filas.filter((f) => f.comunidad_id).length,
    conContrata: filas.filter((f) => f.contrata_id).length,
  };
}
