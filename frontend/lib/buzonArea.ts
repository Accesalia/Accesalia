// lib/buzonArea.ts
//
// LOS BUZONES DE AREA CONECTADOS A LA APP POR LA API DE GMAIL (Monica, 30-oct-
// 2026: «vamos a conectar practicamente todos los correos a la app»). El primero
// es tecnicos@, del que la app lee las respuestas a las preguntas del escaneo.
//
// Mismo proyecto de Google y misma vuelta que el buzon del Polycam y los correos
// de los comerciales: cada buzon da permiso una vez, SOLO LECTURA, desde
// Gestiones → Buzón del Polycam, y la llave va cifrada al Vault
// (migracion 20261030120000).

import "server-only";
import { cliente, VUELTA } from "./gmailBuzon";
import { direccionDe, type Area } from "./correo";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

/** Solo leer: ni marcar, ni mover, ni enviar, ni borrar. */
const PERMISO = "https://www.googleapis.com/auth/gmail.readonly";

/** Los buzones que se pueden conectar hoy. Se añaden aqui, uno a uno. */
export const AREAS_CONECTABLES: Area[] = ["tecnicos"];

async function rpc<T>(nombre: string, cuerpo: object): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/${nombre}`, { method: "POST", headers: cab, body: JSON.stringify(cuerpo), cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

export function urlPermisoArea(estado: string, area: Area): string {
  const q = new URLSearchParams({
    client_id: cliente().id,
    redirect_uri: VUELTA,
    response_type: "code",
    scope: PERMISO,
    access_type: "offline",
    prompt: "consent",
    login_hint: direccionDe(area),
    state: estado,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Que buzones de area han dado permiso. Sin la migracion todavia: ninguno. */
export async function areasConectadas(): Promise<string[]> {
  try {
    return await rpc<string[]>("buzon_area_conectados", {});
  } catch {
    return [];
  }
}

/** Vuelta de Google: comprueba que el permiso lo ha dado ESE BUZON (y no la
 *  cuenta personal de quien pulso) y guarda la llave. */
export async function guardarPermisoArea(codigo: string, area: Area): Promise<string> {
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
  const esperado = direccionDe(area).toLowerCase();
  if (!emailAddress || emailAddress.toLowerCase() !== esperado) {
    throw new Error(`Has entrado con ${emailAddress ?? "otra cuenta"}: hay que entrar con ${esperado}.`);
  }
  await rpc("buzon_area_guardar", { p_area: area, p_llave: t.refresh_token });
  delete accesos[area];
  return emailAddress;
}

const accesos: Partial<Record<string, { valor: string; hasta: number }>> = {};

/** El pase de una hora de ese buzon. null = aun no ha dado permiso. */
export async function paseArea(area: Area): Promise<string | null> {
  const ya = accesos[area];
  if (ya && ya.hasta > Date.now() + 60_000) return ya.valor;
  let ref: string | null = null;
  try {
    ref = await rpc<string | null>("buzon_area_llave", { p_area: area });
  } catch {
    return null; // sin la migracion todavia
  }
  if (!ref) return null;
  const { id, secreto } = cliente();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: ref, client_id: id, client_secret: secreto, grant_type: "refresh_token" }),
  });
  const t = (await r.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!r.ok || !t.access_token) throw new Error(`Google no renueva el permiso de ${direccionDe(area)} (${t.error ?? r.status}): reconéctalo.`);
  accesos[area] = { valor: t.access_token, hasta: Date.now() + (t.expires_in ?? 3600) * 1000 };
  return t.access_token;
}
