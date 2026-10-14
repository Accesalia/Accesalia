// lib/gestionFunciones.ts
//
// ASIGNAR FUNCIONES A PERSONAS (Monica, 14-oct-2026), dentro de "Gestiones de la
// app": una lista de personas, una de funciones, y a cada funcion una o mas
// personas, "para que esto sea facil". Lo toca la funcion de DIRECCION.
//
// Quitar una funcion NO borra: se cierra con fecha (equipo_funciones.hasta), para
// que quede quien la tuvo y hasta cuando.

import "server-only";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);

/** Quien asigna funciones: la funcion de direccion. */
export function puedeAsignarFunciones(yo: Yo): boolean {
  return yo.funciones.some((f) => f.clave === "direccion");
}

export type PersonaEquipo = { id: string; nombre: string; email: string | null };
export type FuncionConPersonas = {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string | null;
  /** Quien la tiene HOY, con desde cuando. */
  personas: { asignacionId: string; equipoId: string; nombre: string; desde: string | null }[];
};

/** Las dos listas: las personas del equipo en activo y las funciones, cada una
 *  con quien la tiene hoy. */
export async function funcionesYPersonas(): Promise<{ personas: PersonaEquipo[]; funciones: FuncionConPersonas[] }> {
  const d = hoy();
  const [personas, funciones] = await Promise.all([
    pedir<{ id: string; nombre: string; apellidos: string | null; email: string | null }[]>(
      `equipo?select=id,nombre,apellidos,email&activo=is.true&or=(fecha_baja.is.null,fecha_baja.gte.${d})&order=nombre.asc`,
    ),
    pedir<{ id: string; clave: string; nombre: string; descripcion: string | null;
            asig: { id: string; desde: string | null; hasta: string | null; equipo: { id: string; nombre: string; apellidos: string | null; activo: boolean } | null }[] }[]>(
      `funciones?select=id,clave,nombre,descripcion,asig:equipo_funciones(id,desde,hasta,equipo:equipo_id(id,nombre,apellidos,activo))&activa=is.true&order=orden.asc.nullslast`,
    ),
  ]);
  const nombre = (p: { nombre: string; apellidos: string | null }) => [p.nombre, p.apellidos].filter(Boolean).join(" ");
  return {
    personas: personas.map((p) => ({ id: p.id, nombre: nombre(p), email: p.email })),
    funciones: funciones.map((f) => ({
      id: f.id,
      clave: f.clave,
      nombre: f.nombre,
      descripcion: f.descripcion,
      personas: f.asig
        .filter((a) => a.equipo?.activo && (!a.desde || a.desde <= d) && (!a.hasta || a.hasta >= d))
        .map((a) => ({ asignacionId: a.id, equipoId: a.equipo!.id, nombre: nombre(a.equipo!), desde: a.desde }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    })),
  };
}

/** Da una funcion a una persona, desde hoy. Si ya la tiene, no hace nada. */
export async function asignarFuncion(funcionId: string, equipoId: string, yo: Yo): Promise<void> {
  if (!puedeAsignarFunciones(yo)) throw new Error("Solo dirección asigna funciones.");
  if (!uuid(funcionId) || !uuid(equipoId)) throw new Error("Datos no válidos.");
  const d = hoy();
  const ya = await pedir<{ id: string; desde: string | null; hasta: string | null }[]>(
    `equipo_funciones?select=id,desde,hasta&funcion_id=eq.${funcionId}&equipo_id=eq.${equipoId}`,
  );
  if (ya.some((a) => (!a.desde || a.desde <= d) && (!a.hasta || a.hasta >= d))) return;
  await pedir("equipo_funciones", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ funcion_id: funcionId, equipo_id: equipoId, desde: d, notas: `Asignada por ${yo.nombre} desde Gestiones de la app` }),
  });
}

/** Quita una funcion: se CIERRA con fecha de hoy, no se borra. */
export async function quitarFuncion(asignacionId: string, yo: Yo): Promise<void> {
  if (!puedeAsignarFunciones(yo)) throw new Error("Solo dirección asigna funciones.");
  if (!uuid(asignacionId)) throw new Error("Datos no válidos.");
  const [a] = await pedir<{ desde: string | null; funcion: { clave: string } | null; equipo_id: string }[]>(
    `equipo_funciones?select=desde,equipo_id,funcion:funcion_id(clave)&id=eq.${asignacionId}`,
  );
  if (!a) throw new Error("No existe esa asignación.");
  // Nadie se quita a si mismo la direccion por error: se quedaria sin poder volver.
  if (a.funcion?.clave === "direccion" && a.equipo_id === yo.id) throw new Error("No puedes quitarte a ti misma la función de dirección.");
  // Se cierra AYER: desde hoy ya no la tiene. Si se dio hoy mismo (un error al
  // asignar), no hay nada que guardar: se borra.
  const d = hoy();
  if (a.desde && a.desde >= d) {
    await pedir(`equipo_funciones?id=eq.${asignacionId}`, { method: "DELETE" });
    return;
  }
  const ayer = new Date(Date.parse(`${d}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
  await pedir(`equipo_funciones?id=eq.${asignacionId}`, {
    method: "PATCH",
    body: JSON.stringify({ hasta: ayer, actualizado_en: new Date().toISOString() }),
  });
}
