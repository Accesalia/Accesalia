// lib/documentosReferencia.ts
//
// Los documentos de "Documentacion de referencia" (tabla documentos_referencia,
// almacen PRIVADO `referencia`). Cada uno sale con dos enlaces firmados que
// caducan en una hora: uno para verlo y otro que lo descarga con su nombre.
//
// VER UN POWERPOINT: el navegador no sabe abrirlo (el problema del zip de la
// mesa de viabilidades, otra vez), asi que se abre con el visor de Office en
// internet, que lee el fichero desde el enlace firmado. Los PDF, tal cual.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "referencia";

export type DocumentoReferencia = {
  id: string;
  titulo: string;
  descripcion: string | null;
  nombreFichero: string;
  tipo: "pdf" | "powerpoint" | "otro";
  tamano: number | null;
  ver: string | null;
  descargar: string | null;
};

async function firmar(ruta: string): Promise<string | null> {
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...cab, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600 }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const { signedURL } = (await r.json()) as { signedURL?: string };
  return signedURL ? `${URL_BASE}/storage/v1${signedURL}` : null;
}

export async function documentosDe(seccion: string): Promise<DocumentoReferencia[]> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/documentos_referencia?select=id,titulo,descripcion,fichero,nombre_fichero,tipo_mime,tamano` +
      `&seccion=eq.${encodeURIComponent(seccion)}&activo=is.true&order=orden.asc.nullslast,titulo.asc`,
    { headers: cab, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
  type Fila = { id: string; titulo: string; descripcion: string | null; fichero: string; nombre_fichero: string; tipo_mime: string | null; tamano: number | null };
  return Promise.all(
    ((await r.json()) as Fila[]).map(async (f) => {
      const tipo = f.tipo_mime === "application/pdf" ? "pdf" : f.tipo_mime?.includes("presentation") ? "powerpoint" : "otro";
      const enlace = await firmar(f.fichero);
      return {
        id: f.id,
        titulo: f.titulo,
        descripcion: f.descripcion,
        nombreFichero: f.nombre_fichero,
        tipo,
        tamano: f.tamano,
        ver: !enlace
          ? null
          : tipo === "powerpoint"
            ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(enlace)}`
            : tipo === "pdf"
              ? enlace
              : null,
        descargar: enlace ? `${enlace}&download=${encodeURIComponent(f.nombre_fichero)}` : null,
      } satisfies DocumentoReferencia;
    }),
  );
}
