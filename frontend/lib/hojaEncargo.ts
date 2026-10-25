// lib/hojaEncargo.ts
//
// LO ULTIMO DEL GENERADOR VIEJO (25-oct-2026). El generador de antes se jubilo: lo que sigue vivo esta en
// lib/hojaGenerador.ts (quien, cartera, datos de la opp, comision), lib/hojaCompromisos.ts (guardar) y lib/hojaEmitir.ts
// (generar y el ok de Daniel). Aqui solo queda lo de las firmadas VIEJAS: enlaceFirmada (abrir un PDF firmado de una
// version vieja: la ficha de comunidad, el portal, el documento de facturacion y Cosas a facturar) y apuntarFirmada (la que
// sube la comunidad por el portal contra una hoja vieja, que acepta el comercial en «lo recibido»). SE BORRA cuando esos
// sitios lean la firmada del archivo de la opp (he_versiones_hoja.firmada_documento_id): portal y comunidad en este
// mismo cambio; facturacion, con su rama.

import "server-only";
import { recalcularLuego } from "./estadoOportunidad";
import { numerarClaveDeOpp } from "./claves";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "documentos-comerciales";
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
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

/** La firmada de una hoja VIEJA que llega por el portal y acepta el comercial: va a su ultima version generada, la hoja
 *  queda firmada y la firma numera la clave DIR del sitio (13-oct-2026). */
export async function apuntarFirmada(hojaId: string, ruta: string) {
  const info = await fetch(`${URL_BASE}/storage/v1/object/info/${ALMACEN}/${ruta}`, { headers: CAB, cache: "no-store" });
  if (!info.ok) throw new Error("El fichero no ha llegado al almacén.");
  const [v] = await leer<{ id: string; pdfs_firmados: string[] | null }[]>(
    `versiones_hoja?select=id,pdfs_firmados&hoja_encargo_id=eq.${hojaId}&url_pdf_hoja=not.is.null&order=numero_version.desc&limit=1`,
  );
  if (!v) throw new Error("La hoja no tiene ninguna versión generada.");
  await pedir(`versiones_hoja?id=eq.${v.id}`, { method: "PATCH", body: JSON.stringify({ pdfs_firmados: [...(v.pdfs_firmados ?? []), `almacen:${ALMACEN}/${ruta}`] }) });
  await pedir(`hojas_encargo?id=eq.${hojaId}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "devuelta_firmada", fecha_firma: hoy(), version_firmada_id: v.id, fecha_estado: new Date().toISOString() }),
  });
  const [h] = await leer<{ oportunidad_id: string | null }[]>(`hojas_encargo?select=oportunidad_id&id=eq.${hojaId}`);
  if (h?.oportunidad_id) await numerarClaveDeOpp(h.oportunidad_id);
  recalcularLuego(h?.oportunidad_id);
}
