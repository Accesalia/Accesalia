// lib/driveFacturas.ts
//
// LA APP COGE SOLA EL PDF DE LA FACTURA DE LA CARPETA DEL DRIVE (Monica,
// 19-oct-2026). Factusol no guarda en el almacen: Alexandra guarda, como
// siempre, en la carpeta compartida del Drive, y la app la mira con un usuario
// robot de solo lectura (lector-facturas@accesalia-drive.iam.gserviceaccount.com,
// proyecto accesalia-drive de gerencia.accesalia; su llave, en Vercel, en
// GOOGLE_DRIVE_LLAVE, el JSON en base64). Monica compartio con el la carpeta
// "FACTURAS ACC Y DAN" como Lector.
//
// Lo que hay en la carpeta (cada año, una carpeta nueva y listo):
//   ACCESALIA/<año>/<año> Facturas Accesalia/Factura 1-000305 <CLIENTE> <ref>.pdf
//                                           /Justificantes Cargos/fac 305-2026 <...>.pdf
//   DANIEL/<año>/<año> Facturas Daniel/...  (igual; "Justificantes cargos")
// Ecobalance NO: lo lleva Ana, en otro Drive; se hace despues.
//
// El PDF de la factura NO lleva impreso el numero de pedido (la proforma), asi
// que se casa por NIF del cliente + total, entre las facturas de la carpeta que
// la app todavia no tiene. Y SIEMPRE dentro de la carpeta del año: el numero solo
// no vale (la 305 de 2026 y la de 2025 estan las dos).

import "server-only";
import { createSign } from "node:crypto";

const RAIZ = "1hAUD2hYeZhMBC1C0tGKk23HKujlCgvW4"; // FACTURAS ACC Y DAN
const CARPETA: Record<string, string> = { accesalia: "ACCESALIA", daniel: "DANIEL" };
const API = "https://www.googleapis.com/drive/v3/files";

export type FicheroDrive = { id: string; nombre: string; modificado: string };

let token: { valor: string; hasta: number } | null = null;

/** El permiso del robot (una hora; se reutiliza mientras valga). */
async function permiso(): Promise<string> {
  if (token && token.hasta > Date.now() + 60_000) return token.valor;
  const crudo = process.env.GOOGLE_DRIVE_LLAVE;
  if (!crudo) throw new Error("Falta la llave del Drive (GOOGLE_DRIVE_LLAVE) en Vercel.");
  const k = JSON.parse(Buffer.from(crudo, "base64").toString("utf8")) as { client_email: string; private_key: string };
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const ahora = Math.floor(Date.now() / 1000);
  const base = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: k.client_email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600,
  })}`;
  const firma = createSign("RSA-SHA256").update(base).sign(k.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${base}.${firma}` }),
    cache: "no-store",
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!j.access_token) throw new Error(`El Drive no deja entrar al robot: ${j.error_description ?? r.status}.`);
  token = { valor: j.access_token, hasta: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return token.valor;
}

/** Lo que hay dentro de una carpeta (sin la papelera). */
async function hijos(carpeta: string): Promise<(FicheroDrive & { carpeta: boolean })[]> {
  const t = await permiso();
  const fuera: (FicheroDrive & { carpeta: boolean })[] = [];
  let pagina: string | undefined;
  do {
    const q = new URLSearchParams({ q: `'${carpeta}' in parents and trashed = false`, pageSize: "1000", fields: "nextPageToken,files(id,name,mimeType,modifiedTime)" });
    if (pagina) q.set("pageToken", pagina);
    const r = await fetch(`${API}?${q}`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`No se puede leer la carpeta del Drive: ${r.status}.`);
    const j = (await r.json()) as { nextPageToken?: string; files: { id: string; name: string; mimeType: string; modifiedTime: string }[] };
    fuera.push(...j.files.map((f) => ({ id: f.id, nombre: f.name, modificado: f.modifiedTime, carpeta: f.mimeType === "application/vnd.google-apps.folder" })));
    pagina = j.nextPageToken;
  } while (pagina);
  return fuera;
}

const sinTildes = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

async function subcarpeta(dentro: string, encaja: (nombre: string) => boolean): Promise<string | null> {
  return (await hijos(dentro)).find((f) => f.carpeta && encaja(sinTildes(f.nombre)))?.id ?? null;
}

/** La carpeta de facturas de una empresa y un año ("2026 Facturas Accesalia"). */
async function carpetaDelAnio(empresa: string, anio: number): Promise<string | null> {
  const nombre = CARPETA[empresa];
  if (!nombre) return null;
  const emp = await subcarpeta(RAIZ, (n) => n === nombre.toLowerCase());
  const a = emp && (await subcarpeta(emp, (n) => n === String(anio)));
  return a ? subcarpeta(a, (n) => n.startsWith(`${anio} facturas`)) : null;
}

/** Las facturas del año ("Factura 1-000305 ...pdf"), sin las ANULADAS, con su serie y numero. */
export async function facturasDelAnio(empresa: string, anio: number): Promise<(FicheroDrive & { serie: string; numero: number })[]> {
  const c = await carpetaDelAnio(empresa, anio);
  if (!c) return [];
  return (await hijos(c)).flatMap((f) => {
    const m = !f.carpeta && /\.pdf$/i.test(f.nombre) && !/anulad/i.test(f.nombre) ? f.nombre.match(/^Factura\s+(\d+)\s*-\s*0*(\d+)\b/i) : null;
    return m ? [{ ...f, serie: m[1], numero: Number(m[2]) }] : [];
  });
}

/** El justificante del cargo de una factura ("Justificantes Cargos/fac 305-2026 ...pdf"), si ya esta. */
export async function justificanteDe(empresa: string, anio: number, numero: number): Promise<FicheroDrive | null> {
  const c = await carpetaDelAnio(empresa, anio);
  const j = c && (await subcarpeta(c, (n) => n.startsWith("justificantes")));
  if (!j) return null;
  const re = new RegExp(`^fac\\s*0*${numero}\\s*-\\s*${anio}\\b`, "i");
  return (await hijos(j)).filter((f) => !f.carpeta && /\.pdf$/i.test(f.nombre) && re.test(f.nombre)).sort((a, b) => b.modificado.localeCompare(a.modificado))[0] ?? null;
}

/** Descarga un fichero del Drive. */
export async function descargar(id: string): Promise<Uint8Array> {
  if (!/^[\w-]{10,}$/.test(id)) throw new Error("Ese fichero del Drive no es válido.");
  const r = await fetch(`${API}/${id}?alt=media`, { headers: { Authorization: `Bearer ${await permiso()}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`No se puede descargar del Drive: ${r.status}.`);
  return new Uint8Array(await r.arrayBuffer());
}

/** El fichero, solo si esta dentro de la carpeta compartida de facturas (para no descargar cualquier id que llegue del navegador). */
export async function descargarDeFacturas(id: string): Promise<{ nombre: string; contenido: Uint8Array }> {
  const t = await permiso();
  let actual = id;
  let nombre = "";
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${API}/${actual}?fields=name,parents`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    if (!r.ok) break;
    const j = (await r.json()) as { name: string; parents?: string[] };
    if (i === 0) nombre = j.name;
    const padre = j.parents?.[0];
    if (!padre) break;
    if (padre === RAIZ) return { nombre, contenido: await descargar(id) };
    actual = padre;
  }
  throw new Error("Ese fichero no está en la carpeta de facturas del Drive.");
}
