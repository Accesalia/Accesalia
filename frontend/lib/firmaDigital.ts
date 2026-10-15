// lib/firmaDigital.ts
//
// FIRMAS DIGITALES (Monica, 15-oct-2026). El almacen de los certificados de
// cada titular (Accesalia, Daniel, Ecobalance: los de empresas_emisoras) y la
// firma de PDF con ellos, para que "cada pantalla sepa con que firmar".
//
//   - CADA USO (una pantalla que firma) apunta a un titular en firmas_usos; se
//     firma con el certificado VIVO de ese titular. Renovar el certificado no
//     obliga a tocar los usos.
//   - El .p12 y su contraseña van cifrados en el Vault: se suben aqui y solo
//     salen por firma_material, para firmar. La pantalla nunca los ve.
//   - Lo gestiona la funcion de direccion y quien tenga la funcion
//     firmas_digitales: "solo direccion y quien yo autorice".
//   - Cada PDF firmado se guarda en el almacen y se apunta en firmas_aplicadas
//     con la huella del original: al abrir o enviar ese PDF, sale el firmado
//     (firmadoDe), nunca el sin firmar.
//
// El primer uso: el OK A LA OFERTA (lib/revisionOferta.ts).

import "server-only";
import { createHash } from "node:crypto";
import type { Yo } from "./sesion";
import { firmarPdf, leerCertificado } from "./pdf/firmarPdf";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const ALMACEN = "documentos-comerciales";
export const FUNCION_FIRMAS = "firmas_digitales";

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);
const huella = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

/** ¿Puede gestionar las firmas? Direccion, o quien tenga la funcion de firmas. */
export function puedeGestionarFirmas(yo: Yo): boolean {
  return yo.funciones.some((f) => f.clave === "direccion" || f.clave === FUNCION_FIRMAS);
}

// ------------------------------------------------------------ el almacen

export type Firma = {
  id: string;
  titular: string;
  nif: string | null;
  organizacion: string | null;
  emisor: string;
  validoDesde: string;
  validoHasta: string;
  subidaEn: string;
  subidaPor: string | null;
};
export type TitularFirma = { clave: string; nombre: string; nif: string | null; firma: Firma | null };
export type UsoFirma = { clave: string; nombre: string; descripcion: string | null; empresa: string | null };

type FilaFirma = {
  id: string; empresa: string; titular: string; nif: string | null; organizacion: string | null; emisor: string;
  valido_desde: string; valido_hasta: string; subida_en: string; por: { nombre: string; apellidos: string | null } | null;
};
const SEL_FIRMA = "id,empresa,titular,nif,organizacion,emisor,valido_desde,valido_hasta,subida_en,por:subida_por(nombre,apellidos)";
const aFirma = (f: FilaFirma): Firma => ({
  id: f.id,
  titular: f.titular,
  nif: f.nif,
  organizacion: f.organizacion,
  emisor: f.emisor,
  validoDesde: f.valido_desde,
  validoHasta: f.valido_hasta,
  subidaEn: f.subida_en,
  subidaPor: f.por ? [f.por.nombre, f.por.apellidos].filter(Boolean).join(" ") : null,
});

/** Los titulares, cada uno con su firma viva (si la tiene), y los usos. */
export async function almacenDeFirmas(): Promise<{ titulares: TitularFirma[]; usos: UsoFirma[] }> {
  const [empresas, firmas, usos] = await Promise.all([
    pedir<{ clave: string; nombre: string; nif: string | null }[]>("empresas_emisoras?select=clave,nombre,nif&order=nombre.asc"),
    pedir<FilaFirma[]>(`firmas_digitales?select=${SEL_FIRMA}&retirada_en=is.null`),
    pedir<{ clave: string; nombre: string; descripcion: string | null; empresa: string | null }[]>("firmas_usos?select=clave,nombre,descripcion,empresa&order=nombre.asc"),
  ]);
  return {
    titulares: empresas.map((e) => {
      const f = firmas.find((x) => x.empresa === e.clave);
      return { clave: e.clave, nombre: e.nombre, nif: e.nif, firma: f ? aFirma(f) : null };
    }),
    usos,
  };
}

/** Sube (o renueva) el certificado de un titular. Comprueba la contraseña y
 *  que no este caducado; el anterior queda retirado, con fecha. */
export async function subirFirma(empresa: string, p12: Uint8Array, clave: string, yo: Yo): Promise<Firma> {
  if (!puedeGestionarFirmas(yo)) throw new Error("No puedes gestionar las firmas digitales.");
  const [e] = await pedir<{ clave: string }[]>(`empresas_emisoras?select=clave&clave=eq.${encodeURIComponent(empresa)}`);
  if (!e) throw new Error("Ese titular no existe.");
  if (!p12.length) throw new Error("Falta el fichero del certificado.");
  if (p12.length > 200_000) throw new Error("Ese fichero es demasiado grande para ser un certificado.");
  const c = leerCertificado(p12, clave);
  if (c.validoHasta.getTime() < Date.now()) throw new Error(`Ese certificado caducó el ${c.validoHasta.toLocaleDateString("es-ES")}.`);
  const id = await pedir<string>("rpc/firma_guardar", {
    method: "POST",
    body: JSON.stringify({
      p_empresa: empresa,
      p_p12_base64: Buffer.from(p12).toString("base64"),
      p_clave: clave,
      p_titular: c.titular,
      p_nif: c.nif,
      p_organizacion: c.organizacion,
      p_emisor: c.emisor,
      p_valido_desde: c.validoDesde.toISOString(),
      p_valido_hasta: c.validoHasta.toISOString(),
      p_huella: c.huella,
      p_por: yo.id,
    }),
  });
  const [f] = await pedir<FilaFirma[]>(`firmas_digitales?select=${SEL_FIRMA}&id=eq.${id}`);
  return aFirma(f);
}

/** Retira la firma viva de un titular (no se borra: queda con fecha). Lo que
 *  la use deja de firmar hasta que se suba otra. */
export async function retirarFirma(firmaId: string, yo: Yo): Promise<void> {
  if (!puedeGestionarFirmas(yo)) throw new Error("No puedes gestionar las firmas digitales.");
  if (!uuid(firmaId)) throw new Error("Firma no válida.");
  await pedir(`firmas_digitales?id=eq.${firmaId}&retirada_en=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ retirada_en: new Date().toISOString(), retirada_por: yo.id }),
  });
}

/** Con que titular firma un uso. */
export async function elegirFirmaDeUso(uso: string, empresa: string | null, yo: Yo): Promise<void> {
  if (!puedeGestionarFirmas(yo)) throw new Error("No puedes gestionar las firmas digitales.");
  await pedir(`firmas_usos?clave=eq.${encodeURIComponent(uso)}`, {
    method: "PATCH",
    body: JSON.stringify({ empresa, actualizado_en: new Date().toISOString(), actualizado_por: yo.id }),
  });
}

// ------------------------------------------------------------ firmar

export type FirmaDeUso = { firmaId: string; firmante: string; nif: string | null; titular: string; validoHasta: string };

/** La firma con la que firma hoy un uso, o null si no hay (sin titular elegido,
 *  sin certificado subido o caducado). */
export async function firmaDeUso(uso: string): Promise<FirmaDeUso | null> {
  const [u] = await pedir<{ empresa: string | null; em: { nombre: string; nif: string | null } | null }[]>(
    `firmas_usos?select=empresa,em:empresa(nombre,nif)&clave=eq.${encodeURIComponent(uso)}`,
  );
  if (!u?.empresa) return null;
  const [f] = await pedir<{ id: string; titular: string; nif: string | null; valido_hasta: string }[]>(
    `firmas_digitales?select=id,titular,nif,valido_hasta&empresa=eq.${u.empresa}&retirada_en=is.null`,
  );
  if (!f || new Date(f.valido_hasta).getTime() < Date.now()) return null;
  return { firmaId: f.id, firmante: u.em?.nombre ?? f.titular, nif: u.em?.nif ?? f.nif, titular: f.titular, validoHasta: f.valido_hasta };
}

/** Firma un PDF para un uso y lo guarda. `documento` dice que es
 *  ("hoja:<version>", "presupuesto:<id>", "viabilidad:<id>"). Si ese PDF exacto
 *  ya estaba firmado para ese uso, no lo firma otra vez. */
export async function firmarParaUso(
  pdf: Uint8Array,
  o: { uso: string; documento: string; motivo: string; revisionId?: string | null },
  firma: FirmaDeUso,
  yo: Yo,
): Promise<{ id: string; nuevo: boolean }> {
  const original = huella(pdf);
  const [ya] = await pedir<{ id: string }[]>(
    `firmas_aplicadas?select=id&huella_original=eq.${original}&uso=eq.${encodeURIComponent(o.uso)}&firma_id=eq.${firma.firmaId}&limit=1`,
  );
  if (ya) return { id: ya.id, nuevo: false };

  const [m] = await pedir<{ p12_base64: string; clave: string }[]>("rpc/firma_material", { method: "POST", body: JSON.stringify({ p_firma: firma.firmaId }) });
  if (!m) throw new Error("No se puede leer el certificado de firma.");
  const firmado = await firmarPdf(pdf, new Uint8Array(Buffer.from(m.p12_base64, "base64")), m.clave, { firmante: firma.firmante, nif: firma.nif, motivo: o.motivo });

  const id = crypto.randomUUID();
  const ruta = `firmados/${o.uso}/${id}.pdf`;
  const sube = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/pdf" },
    body: firmado,
    cache: "no-store",
  });
  if (!sube.ok) throw new Error(`No se pudo guardar el firmado (${sube.status}): ${await sube.text()}`);
  await pedir("firmas_aplicadas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      id, firma_id: firma.firmaId, uso: o.uso, documento: o.documento, huella_original: original,
      ruta: `almacen:${ALMACEN}/${ruta}`, revision_id: o.revisionId ?? null, firmado_por: yo.id,
    }),
  });
  return { id, nuevo: true };
}

/** El firmado de ESE PDF exacto, si la app lo firmo (el mas reciente). Quien
 *  abre o envia un documento pasa por aqui: si hay firmado, sale el firmado. */
export async function firmadoDe(pdf: Uint8Array): Promise<Uint8Array | null> {
  const [f] = await pedir<{ ruta: string }[]>(`firmas_aplicadas?select=ruta&huella_original=eq.${huella(pdf)}&order=firmado_en.desc&limit=1`);
  if (!f?.ruta.startsWith("almacen:")) return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/${f.ruta.slice("almacen:".length)}`, { headers: CAB, cache: "no-store" });
  return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
}

/** Un PDF de prueba firmado con la firma de un titular, para abrirlo en Adobe
 *  y ver que la firma sale bien. No se guarda. */
export async function pdfDePrueba(empresa: string, yo: Yo): Promise<Uint8Array> {
  if (!puedeGestionarFirmas(yo)) throw new Error("No puedes gestionar las firmas digitales.");
  const [e] = await pedir<{ nombre: string; nif: string | null }[]>(`empresas_emisoras?select=nombre,nif&clave=eq.${encodeURIComponent(empresa)}`);
  const [f] = await pedir<{ id: string; nif: string | null }[]>(`firmas_digitales?select=id,nif&empresa=eq.${encodeURIComponent(empresa)}&retirada_en=is.null`);
  if (!e || !f) throw new Error("Ese titular no tiene firma subida.");
  const [m] = await pedir<{ p12_base64: string; clave: string }[]>("rpc/firma_material", { method: "POST", body: JSON.stringify({ p_firma: f.id }) });
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const letra = await doc.embedFont(StandardFonts.Helvetica);
  const p = doc.addPage([595, 842]);
  p.drawText("Documento de prueba de la firma digital", { x: 56, y: 760, size: 16, font: letra });
  p.drawText(`Titular: ${e.nombre}${e.nif ? ` (NIF ${e.nif})` : ""}`, { x: 56, y: 730, size: 11, font: letra });
  p.drawText("Ábrelo en Adobe: el panel de firmas debe mostrar la firma y quién la pone.", { x: 56, y: 710, size: 11, font: letra });
  return firmarPdf(await doc.save(), new Uint8Array(Buffer.from(m.p12_base64, "base64")), m.clave, { firmante: e.nombre, nif: e.nif ?? f.nif, motivo: "Prueba de la firma" });
}
