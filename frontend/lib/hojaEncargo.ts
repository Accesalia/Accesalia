// lib/hojaEncargo.ts
//
// LO ULTIMO DEL GENERADOR VIEJO (25-oct-2026). El generador de antes se jubilo: lo vivo esta en lib/hojaGenerador.ts,
// lib/hojaCompromisos.ts y lib/hojaEmitir.ts. Aqui solo queda enlaceFirmada (abrir un PDF firmado de una version VIEJA),
// que en esta rama aun usa app/facturacion/documento; la rama de facturacion ya lo quito, asi que AL JUNTAR LAS DOS
// RAMAS ESTE FICHERO SE BORRA.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const leer = async <T>(path: string): Promise<T> => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
};

/** Un enlace de Drive se enseña con su visor (/preview). */
const enlaceDoc = (u: string): string | null => (u.startsWith("almacen:") ? null : u.replace(/\/view(\?.*)?$/, "/preview"));

/** Enlace para ver una firmada del almacen. Caduca en diez minutos. */
export async function enlaceFirmada(hojaId: string, versionId: string, n: number): Promise<string | null> {
  const [v] = await leer<{ pdfs_firmados: string[] | null; hoja_encargo_id: string }[]>(
    `versiones_hoja?select=pdfs_firmados,hoja_encargo_id&id=eq.${versionId}`,
  );
  const f = v?.hoja_encargo_id === hojaId ? v.pdfs_firmados?.[n] : null;
  if (!f) return null;
  if (!f.startsWith("almacen:")) return enlaceDoc(f);
  const [, resto] = f.split("almacen:");
  const barra = resto.indexOf("/");
  const almacen = resto.slice(0, barra);
  const ruta = resto.slice(barra + 1);
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${almacen}/${ruta}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600 }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const { signedURL } = (await r.json()) as { signedURL: string };
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE}/storage/v1${signedURL}`;
}
