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

export const hayAccesoDropbox = () => !!(process.env.DROPBOX_APP_KEY && process.env.DROPBOX_APP_SECRET && process.env.DROPBOX_REFRESH_TOKEN);
export const SIN_ACCESO = "La app todavía no tiene acceso al Dropbox: falta poner su llave en Vercel (pendiente con Ana).";

let llave: { valor: string; caduca: number } | null = null;

async function llaveDeAcceso(): Promise<string> {
  if (!hayAccesoDropbox()) throw new Error(SIN_ACCESO);
  if (llave && llave.caduca > Date.now() + 60_000) return llave.valor;
  const r = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN!,
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
  const token = await llaveDeAcceso();
  const r = await fetch("https://content.dropboxapi.com/2/files/download", { method: "POST", headers: cabeceras(token, { path: ruta }), cache: "no-store" });
  if (r.status === 409) return null;
  if (!r.ok) throw new Error(`Dropbox no deja bajar ${ruta} (${r.status}): ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Sube un fichero (lo crea o lo sustituye). La carpeta se crea sola. */
export async function subirFichero(ruta: string, contenido: Uint8Array): Promise<void> {
  const token = await llaveDeAcceso();
  const r = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: { ...cabeceras(token, { path: ruta, mode: "overwrite", autorename: false, mute: true }), "Content-Type": "application/octet-stream" },
    body: contenido,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Dropbox no deja subir ${ruta} (${r.status}): ${await r.text()}`);
}
