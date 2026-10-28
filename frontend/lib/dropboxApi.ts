import "server-only";
// lib/dropboxApi.ts
//
// LA APP ENTRA AL DROPBOX POR SU CUENTA (Monica, 25-oct-2026: «es fundamental que lo tenga, para lo del Factusol pero
// tambien para otros archivos futuros»). Hasta hoy la app solo armaba enlaces que se abren con la sesion de quien
// pincha (lib/dropbox.ts); esto es el acceso propio: una «aplicacion» de Dropbox con su llave en Vercel.
//
// Variables de entorno (las pone quien administre la cuenta de Dropbox; pendiente el lunes 27-oct con Ana):
//   DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN  la llave permanente de la aplicacion
//   DROPBOX_RAIZ (opcional)                                       el espacio del equipo, si la cuenta es de equipo
// Sin ellas, todo dice claramente que falta el acceso: nada falla en silencio.

/** Si la app tiene acceso al Dropbox: la llave de Vercel o la del Vault (Gestiones → Dropbox). */
export const hayAccesoDropbox = () => hayLlaveDropbox();
export const SIN_ACCESO = "La app todavía no tiene acceso al Dropbox: conéctalo en Gestiones → Dropbox (con la cuenta de Daniel).";

let llave: { valor: string; caduca: number } | null = null;

// LA LLAVE PERMANENTE, DE VERCEL O DEL VAULT (28-oct-2026). Desde el boton
// «Conectar el Dropbox» de Gestiones va cifrada al Vault (migracion
// 20261028140000) y no hace falta copiarla a mano a Vercel. Desde el 28-oct por
// la tarde la app «Accesalia CRM» tiene tambien permiso de leer y subir ficheros
// (Factusol y proformas: Monica, «mañana facturacion empieza a trabajar solo con
// la app»), asi que todo usa esta llave. Lo de abajo es historia: `hayAccesoDropbox`
// sigue mirando solo Vercel a proposito: la app de hoy solo tiene permiso para
// enlaces, y Factusol y las proformas, que leen y suben ficheros, no deben
// creerse con acceso hasta que se les de el suyo.
const URL_SUPA = process.env.SUPABASE_URL ?? "";
const SECRETO_SUPA = process.env.SUPABASE_SECRET_KEY ?? "";
const cabSupa = { apikey: SECRETO_SUPA, Authorization: `Bearer ${SECRETO_SUPA}`, "Content-Type": "application/json" };

async function llavePermanente(): Promise<string | null> {
  if (process.env.DROPBOX_REFRESH_TOKEN) return process.env.DROPBOX_REFRESH_TOKEN;
  if (!URL_SUPA || !SECRETO_SUPA) return null;
  const r = await fetch(`${URL_SUPA}/rest/v1/rpc/dropbox_llave`, { method: "POST", headers: cabSupa, body: "{}", cache: "no-store" });
  if (!r.ok) return null;
  return ((await r.json()) as string | null) || null;
}

/** Si la app tiene llave (de Vercel o del Vault) para pedir enlaces. */
export async function hayLlaveDropbox(): Promise<boolean> {
  if (!process.env.DROPBOX_APP_KEY || !process.env.DROPBOX_APP_SECRET) return false;
  try {
    return !!(await llavePermanente());
  } catch {
    return false;
  }
}

export const VUELTA_DROPBOX = "https://accesalia-crm.vercel.app/api/dropbox/vuelta";

/** La pantalla de Dropbox donde Daniel da permiso. `offline` = llave que no caduca. */
export function urlPermisoDropbox(estado: string): string {
  if (!process.env.DROPBOX_APP_KEY) throw new Error("Falta DROPBOX_APP_KEY en Vercel.");
  const q = new URLSearchParams({
    client_id: process.env.DROPBOX_APP_KEY,
    response_type: "code",
    token_access_type: "offline",
    redirect_uri: VUELTA_DROPBOX,
    state: estado,
    force_reapprove: "true",
  });
  return `https://www.dropbox.com/oauth2/authorize?${q}`;
}

/** Vuelta de Dropbox: cambia el codigo por la llave, dice de que cuenta es y la guarda. */
export async function guardarPermisoDropbox(codigo: string): Promise<string> {
  const r = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      grant_type: "authorization_code",
      redirect_uri: VUELTA_DROPBOX,
      client_id: process.env.DROPBOX_APP_KEY ?? "",
      client_secret: process.env.DROPBOX_APP_SECRET ?? "",
    }),
    cache: "no-store",
  });
  const t = (await r.json()) as { access_token?: string; refresh_token?: string; error_description?: string; error?: string };
  if (!r.ok || !t.access_token) throw new Error(`Dropbox no dio el permiso: ${t.error_description ?? t.error ?? r.status}`);
  if (!t.refresh_token) throw new Error("Dropbox no devolvió la llave permanente. Vuelve a conectar.");
  const c = await fetch("https://api.dropboxapi.com/2/users/get_current_account", { method: "POST", headers: { Authorization: `Bearer ${t.access_token}` } });
  const cuenta = c.ok ? ((await c.json()) as { email?: string }).email ?? "?" : "?";
  const g = await fetch(`${URL_SUPA}/rest/v1/rpc/dropbox_guardar`, { method: "POST", headers: cabSupa, body: JSON.stringify({ p_llave: t.refresh_token }) });
  if (!g.ok) throw new Error(`No se pudo guardar el permiso: ${await g.text()}`);
  llave = null;
  return cuenta;
}

async function llaveDeAcceso(): Promise<string> {
  if (!process.env.DROPBOX_APP_KEY || !process.env.DROPBOX_APP_SECRET) throw new Error(SIN_ACCESO);
  if (llave && llave.caduca > Date.now() + 60_000) return llave.valor;
  const permanente = await llavePermanente();
  if (!permanente) throw new Error(SIN_ACCESO);
  const r = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: permanente,
      client_id: process.env.DROPBOX_APP_KEY!,
      client_secret: process.env.DROPBOX_APP_SECRET!,
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Dropbox no da acceso (${r.status}): ${await r.text()}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  llave = { valor: j.access_token, caduca: Date.now() + j.expires_in * 1000 };
  return llave.valor;
}

function cabeceras(token: string, arg?: object): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (process.env.DROPBOX_RAIZ) h["Dropbox-API-Path-Root"] = JSON.stringify({ ".tag": "root", root: process.env.DROPBOX_RAIZ });
  if (arg) h["Dropbox-API-Arg"] = JSON.stringify(arg).replace(/[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  return h;
}

/** Baja un fichero entero. ruta = desde la raiz del Dropbox: "/D SM/factusol/…". null si no existe. */
export async function bajarFichero(ruta: string): Promise<Buffer | null> {
  if (!(await hayAccesoDropbox())) throw new Error(SIN_ACCESO);
  const token = await llaveDeAcceso();
  const r = await fetch("https://content.dropboxapi.com/2/files/download", { method: "POST", headers: cabeceras(token, { path: ruta }), cache: "no-store" });
  if (r.status === 409) return null;
  if (!r.ok) throw new Error(`Dropbox no deja bajar ${ruta} (${r.status}): ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Sube un fichero (lo crea o lo sustituye). La carpeta se crea sola. */
export async function subirFichero(ruta: string, contenido: Uint8Array): Promise<void> {
  if (!(await hayAccesoDropbox())) throw new Error(SIN_ACCESO);
  const token = await llaveDeAcceso();
  const r = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: { ...cabeceras(token, { path: ruta, mode: "overwrite", autorename: false, mute: true }), "Content-Type": "application/octet-stream" },
    body: contenido,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Dropbox no deja subir ${ruta} (${r.status}): ${await r.text()}`);
}

// ------------------------------------------------------------ enlaces

const API = "https://api.dropboxapi.com/2";

async function llamar<T>(token: string, ruta: string, cuerpo: object): Promise<{ ok: true; d: T } | { ok: false; status: number; d: unknown }> {
  const r = await fetch(`${API}${ruta}`, {
    method: "POST",
    headers: { ...cabeceras(token), "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });
  const texto = await r.text();
  let d: unknown = texto;
  try {
    d = JSON.parse(texto);
  } catch {}
  return r.ok ? { ok: true, d: d as T } : { ok: false, status: r.status, d };
}

/** UN ENLACE SOLO PARA EL EQUIPO (28-oct-2026). El de una carpeta o fichero del
 *  Dropbox, que abre cualquier cuenta del equipo Accesalia tenga la carpeta donde
 *  la tenga. Si ya habia uno de esa carpeta, se reutiliza: no se crea uno por clic.
 *  null si la ruta no existe. ruta = desde la raiz del Dropbox ("/D SM/…"). */
export async function enlaceParaElEquipo(ruta: string): Promise<string | null> {
  const token = await llaveDeAcceso();
  const ya = await llamar<{ links: { url: string; link_permissions?: { resolved_visibility?: { ".tag": string } } }[] }>(token, "/sharing/list_shared_links", {
    path: ruta,
    direct_only: true,
  });
  if (!ya.ok) {
    if (ya.status === 409) return null; // no existe
    throw new Error(`Dropbox no deja ver los enlaces de ${ruta} (${ya.status}): ${JSON.stringify(ya.d).slice(0, 300)}`);
  }
  // Solo vale uno que se quede dentro del equipo. Uno publico, aunque exista, no
  // se reparte desde la app.
  const delEquipo = ya.d.links.find((l) => l.link_permissions?.resolved_visibility?.[".tag"] === "team_only");
  if (delEquipo) return delEquipo.url;

  const nuevo = await llamar<{ url: string }>(token, "/sharing/create_shared_link_with_settings", {
    path: ruta,
    settings: { audience: "team", access: "viewer" },
  });
  if (nuevo.ok) return nuevo.d.url;
  if (nuevo.status === 409 && JSON.stringify(nuevo.d).includes("not_found")) return null;
  throw new Error(`Dropbox no deja crear el enlace de ${ruta} (${nuevo.status}): ${JSON.stringify(nuevo.d).slice(0, 300)}`);
}
