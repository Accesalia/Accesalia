// lib/gmailBuzon.ts
//
// EL BUZON DEL POLYCAM POR LA API DE GMAIL (Monica, 28-oct-2026).
//
// Por IMAP, Gmail entrega los adjuntos grandes a cuentagotas: los .glb de Oscar
// del 26-oct (10-30 MB) no bajaban en el minuto que se les da y se quedaron dos
// dias atascados. La API los da de golpe, por HTTPS. Y con el mismo permiso se
// bajan los enlaces de Drive en que Gmail convierte todo adjunto de mas de 25 MB,
// que por IMAP no eran nada y hacian que se le contestara «falta el escaneo».
//
// EL PERMISO lo da el buzon una vez, desde la app (solo direccion): Google
// devuelve una llave que no caduca (refresh token) y va cifrada al Vault
// (migracion 20261028120000). Mientras no haya llave, el buzon sigue por IMAP.
//
// La llave de la app ante Google (ID y secreto de cliente) esta en Vercel:
// GMAIL_BUZON_CLIENT_ID y GMAIL_BUZON_CLIENT_SECRET. Es un proyecto de Google
// Cloud propio del buzon («Buzon Polycam»), creado con su cuenta.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

/** Leer y marcar sus correos (quitar «sin leer», poner etiquetas, sacar de Spam)
 *  y bajar los ficheros de Drive que le comparten. Nada de enviar ni borrar. */
const PERMISOS = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

export const VUELTA = "https://accesalia-crm.vercel.app/api/buzon/google/vuelta";

export function cliente() {
  const id = process.env.GMAIL_BUZON_CLIENT_ID;
  const secreto = process.env.GMAIL_BUZON_CLIENT_SECRET;
  if (!id || !secreto) throw new Error("Faltan GMAIL_BUZON_CLIENT_ID / GMAIL_BUZON_CLIENT_SECRET en Vercel.");
  return { id, secreto };
}

/** La pantalla de Google donde el buzon da permiso. `prompt=consent` para que
 *  Google devuelva SIEMPRE la llave que no caduca, tambien si se reconecta. */
export function urlPermiso(estado: string): string {
  const q = new URLSearchParams({
    client_id: cliente().id,
    redirect_uri: VUELTA,
    response_type: "code",
    scope: PERMISOS,
    access_type: "offline",
    prompt: "consent",
    login_hint: process.env.BUZON_POLYCAM_USUARIO ?? "",
    state: estado,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Vuelta de Google: cambia el codigo por la llave, comprueba que el permiso lo
 *  ha dado EL BUZON (y no la cuenta personal de quien pulso) y la guarda. */
export async function guardarPermiso(codigo: string): Promise<string> {
  const { id, secreto } = cliente();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: codigo, client_id: id, client_secret: secreto, redirect_uri: VUELTA, grant_type: "authorization_code" }),
  });
  const t = (await r.json()) as { access_token?: string; refresh_token?: string; error_description?: string; error?: string };
  if (!r.ok || !t.access_token) throw new Error(`Google no dio el permiso: ${t.error_description ?? t.error ?? r.status}`);
  if (!t.refresh_token) throw new Error("Google no devolvió la llave permanente. Vuelve a conectar.");

  const p = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { Authorization: `Bearer ${t.access_token}` } });
  const { emailAddress } = (await p.json()) as { emailAddress?: string };
  const buzon = (process.env.BUZON_POLYCAM_USUARIO ?? "").trim().toLowerCase();
  if (!emailAddress || (buzon && emailAddress.toLowerCase() !== buzon)) {
    throw new Error(`Has entrado con ${emailAddress ?? "otra cuenta"}: hay que entrar con ${buzon}.`);
  }

  const g = await fetch(`${URL_BASE}/rest/v1/rpc/buzon_google_guardar`, {
    method: "POST",
    headers: cab,
    body: JSON.stringify({ p_llave: t.refresh_token }),
  });
  if (!g.ok) throw new Error(`No se pudo guardar el permiso: ${await g.text()}`);
  acceso = null;
  return emailAddress;
}

/** La llave permanente, o null si el buzon aun no ha dado permiso. */
async function llave(): Promise<string | null> {
  if (!URL_BASE || !SECRETO) return null;
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/buzon_google_llave`, { method: "POST", headers: cab, body: "{}", cache: "no-store" });
  if (!r.ok) return null; // sin la migracion todavia: se sigue por IMAP
  const v = (await r.json()) as string | null;
  return v || null;
}

/** Si el buzon ya ha dado permiso, para la pantalla. */
export async function hayPermiso(): Promise<boolean> {
  try {
    return !!(await llave());
  } catch {
    return false;
  }
}

let acceso: { valor: string; hasta: number } | null = null;

/** El pase de una hora que sale de la llave permanente. null = no hay permiso. */
export async function pase(): Promise<string | null> {
  if (acceso && acceso.hasta > Date.now() + 60_000) return acceso.valor;
  const ref = await llave();
  if (!ref) return null;
  const { id, secreto } = cliente();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: ref, client_id: id, client_secret: secreto, grant_type: "refresh_token" }),
  });
  const t = (await r.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!r.ok || !t.access_token) {
    // invalid_grant = el permiso se retiro o caduco: hay que reconectar desde la app.
    throw new Error(`Google no renueva el permiso del buzón (${t.error ?? r.status}): reconéctalo desde «Buzón del Polycam».`);
  }
  acceso = { valor: t.access_token, hasta: Date.now() + (t.expires_in ?? 3600) * 1000 };
  return acceso.valor;
}

// ------------------------------------------------------------------ gmail

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

async function api<T>(token: string, ruta: string, init?: RequestInit & { segundos?: number }): Promise<T> {
  const r = await fetch(`${GMAIL}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout((init?.segundos ?? 60) * 1000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Gmail ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json() as Promise<T>;
}

/** Los ids de los correos que cumplen la busqueda (la misma sintaxis que el
 *  buscador de Gmail), del mas nuevo al mas viejo. */
export async function buscar(token: string, q: string): Promise<string[]> {
  const ids: string[] = [];
  let pagina: string | undefined;
  do {
    const p = new URLSearchParams({ q, maxResults: "100", includeSpamTrash: "true" });
    if (pagina) p.set("pageToken", pagina);
    const r = await api<{ messages?: { id: string }[]; nextPageToken?: string }>(token, `/messages?${p}`);
    ids.push(...(r.messages ?? []).map((m) => m.id));
    pagina = r.nextPageToken;
  } while (pagina && ids.length < 500);
  return ids;
}

export type Cabecera = { id: string; bytes: number; de: string | null; asunto: string | null; etiquetas: string[] };

/** Cuanto pesa, quien y que asunto, sin bajar el correo. */
export async function cabecera(token: string, id: string): Promise<Cabecera> {
  const m = await api<{ id: string; sizeEstimate?: number; labelIds?: string[]; payload?: { headers?: { name: string; value: string }[] } }>(
    token,
    `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
  );
  const h = (n: string) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? null;
  const de = h("from");
  return {
    id: m.id,
    bytes: m.sizeEstimate ?? 0,
    de: de ? (de.match(/<([^>]+)>/)?.[1] ?? de).trim().toLowerCase() : null,
    asunto: h("subject"),
    etiquetas: m.labelIds ?? [],
  };
}

/** El correo entero, tal cual llego (MIME), para leerlo con mailparser como antes. */
export async function crudo(token: string, id: string): Promise<Buffer> {
  const m = await api<{ raw: string }>(token, `/messages/${id}?format=raw`, { segundos: 120 });
  return Buffer.from(m.raw, "base64url");
}

/** El id de una etiqueta del buzon; la crea si no existe. */
const etiquetasVistas = new Map<string, string>();
export async function etiqueta(token: string, nombre: string): Promise<string> {
  const ya = etiquetasVistas.get(nombre);
  if (ya) return ya;
  const { labels } = await api<{ labels?: { id: string; name: string }[] }>(token, "/labels");
  let e = labels?.find((l) => l.name === nombre);
  if (!e) e = await api<{ id: string; name: string }>(token, "/labels", { method: "POST", body: JSON.stringify({ name: nombre }) });
  etiquetasVistas.set(nombre, e.id);
  return e.id;
}

export async function cambiarEtiquetas(token: string, id: string, poner: string[], quitar: string[]): Promise<void> {
  await api(token, `/messages/${id}/modify`, { method: "POST", body: JSON.stringify({ addLabelIds: poner, removeLabelIds: quitar }) });
}

// ------------------------------------------------------------------ drive

/** Los ficheros de Drive enlazados en el correo. Gmail convierte en enlace de
 *  Drive todo adjunto de mas de 25 MB, y lo comparte con el destinatario: el
 *  buzon lo puede bajar con su propio permiso. */
export function enlacesDrive(texto: string): string[] {
  const ids = new Set<string>();
  for (const m of texto.matchAll(/https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^"'\s<>]*&)?id=)([\w-]{20,})/gi)) ids.add(m[1]);
  return [...ids];
}

export type FicheroDrive = { id: string; nombre: string; tipo: string; bytes: number };

export async function fichaDrive(token: string, id: string): Promise<FicheroDrive> {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,size&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Drive ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const f = (await r.json()) as { id: string; name: string; mimeType: string; size?: string };
  return { id: f.id, nombre: f.name, tipo: f.mimeType, bytes: Number(f.size ?? 0) };
}

export async function bajarDrive(token: string, id: string): Promise<Buffer> {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(120_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Drive ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return Buffer.from(await r.arrayBuffer());
}
