import "server-only";
// lib/recibidos.ts
//
// LO QUE SUBE LA COMUNIDAD, POR REVISAR (Monica, 12-oct-2026). Nada se da por
// bueno solo: lo revisa el responsable de ese tipo de documento. Hoy solo hay
// uno: la HOJA DE ENCARGO firmada, que revisa EL COMERCIAL de la oportunidad
// (direccion y supervision comercial ven todas). Al aceptarla, la hoja queda
// firmada y nacen sus lineas de cobro. Si la sube el propio comercial, queda
// aceptada al momento: es quien la revisaria.

import { puedeEntrar, comercialDe, type Yo } from "./sesion";
import { apuntarFirmada } from "./hojaEncargo";
import { crearLineasDeHoja } from "./lineasDeHoja";
import { ALMACEN_PORTAL } from "./portal";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (r.status === 204 ? null : await r.json()) as T;
}

export type Recibido = {
  id: string;
  tipo: "hoja_firmada" | "otro";
  descripcion: string | null;
  nombre_fichero: string | null;
  subido_por_email: string;
  subido_por_nombre: string | null;
  creado_en: string;
  comunidad: { id: string; nombre: string } | null;
  hoja: { id: string; numero_hoja: string | null; opp: { id: string; codigo: string | null; comercial_id: string | null } | null } | null;
};

const SEL =
  "id,tipo,descripcion,nombre_fichero,subido_por_email,subido_por_nombre,creado_en,comunidad:comunidad_id(id,nombre)," +
  "hoja:hoja_encargo_id(id,numero_hoja,opp:oportunidad_id(id,codigo,comercial_id))";

const veTodos = (yo: Yo) => yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");

/** Lo que le toca revisar a esta persona. */
export async function porRevisar(yo: Yo): Promise<Recibido[]> {
  const todos = await pedir<Recibido[]>(`portal_recibidos?select=${SEL}&estado=eq.por_revisar&order=creado_en.asc`);
  if (veTodos(yo)) return todos;
  const mio = await comercialDe(yo.id);
  return mio ? todos.filter((r) => r.tipo === "hoja_firmada" && r.hoja?.opp?.comercial_id === mio.id) : [];
}

export async function cuantosPorRevisar(yo: Yo): Promise<number> {
  try {
    return (await porRevisar(yo)).length;
  } catch {
    return 0;
  }
}

async function uno(id: string): Promise<(Recibido & { ruta: string; estado: string }) | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [r] = await pedir<(Recibido & { ruta: string; estado: string })[]>(`portal_recibidos?select=${SEL},ruta,estado&id=eq.${id}`);
  return r ?? null;
}

/** ¿Puede esta persona revisar este documento? */
async function puedeRevisar(yo: Yo, r: Recibido): Promise<boolean> {
  if (veTodos(yo)) return true;
  const mio = await comercialDe(yo.id);
  return !!mio && r.tipo === "hoja_firmada" && r.hoja?.opp?.comercial_id === mio.id;
}

/** "Es la firmada": la hoja queda firmada y nacen sus lineas de cobro. */
export async function aceptar(id: string, yo: Yo): Promise<void> {
  const r = await uno(id);
  if (!r || r.estado !== "por_revisar") throw new Error("Ya no está por revisar.");
  if (!(await puedeRevisar(yo, r))) throw new Error("Esto lo revisa otra persona.");
  if (r.tipo === "hoja_firmada" && r.hoja) {
    await apuntarFirmada(r.hoja.id, r.ruta);
    await crearLineasDeHoja(r.hoja.id);
  }
  await pedir(`portal_recibidos?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "aceptado", revisado_por: yo.id, revisado_en: new Date().toISOString() }),
  });
}

export async function rechazar(id: string, motivo: string, yo: Yo): Promise<void> {
  const r = await uno(id);
  if (!r || r.estado !== "por_revisar") throw new Error("Ya no está por revisar.");
  if (!(await puedeRevisar(yo, r))) throw new Error("Esto lo revisa otra persona.");
  await pedir(`portal_recibidos?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ estado: "rechazado", revisado_por: yo.id, revisado_en: new Date().toISOString(), motivo_rechazo: motivo.trim() || null }),
  });
}

/** Para verlo: un enlace firmado que caduca en diez minutos. */
export async function enlaceRecibido(id: string, yo: Yo): Promise<string | null> {
  const r = await uno(id);
  if (!r || !(await puedeRevisar(yo, r))) return null;
  const f = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN_PORTAL}/${r.ruta}`, {
    method: "POST",
    headers: CAB,
    body: JSON.stringify({ expiresIn: 600 }),
    cache: "no-store",
  });
  if (!f.ok) return null;
  const { signedURL } = (await f.json()) as { signedURL: string };
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE}/storage/v1${signedURL}`;
}

/** Si quien sube es el comercial de esa hoja, queda aceptada al momento. */
export async function aceptarSiEsSuComercial(id: string, yo: Yo | null): Promise<boolean> {
  if (!yo) return false;
  const r = await uno(id);
  if (!r || r.tipo !== "hoja_firmada") return false;
  const mio = await comercialDe(yo.id);
  if (!mio || r.hoja?.opp?.comercial_id !== mio.id) return false;
  await aceptar(id, yo);
  return true;
}
