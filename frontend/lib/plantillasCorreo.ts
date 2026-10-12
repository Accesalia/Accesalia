import "server-only";
// lib/plantillasCorreo.ts
//
// PLANTILLAS DE MAIL (Monica, 12-oct-2026): los textos con los que se escribe a
// las comunidades desde la app. Dos clases:
//   - GENERALES, para todos. Las crea y retoca direccion o supervision comercial.
//   - PERSONALES, de cada uno ("cada comercial puede querer tener alguna
//     especifica a su gusto", por ejemplo sus campañas). Solo las ve y toca su
//     dueño; direccion las ve todas.
// Una nueva pide solo nombre (para que es), asunto y texto.

import { puedeEntrar, type Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (r.status === 204 ? null : await r.json()) as T;
}

export type Plantilla = {
  id: string;
  nombre: string;
  asunto: string;
  texto: string;
  propietario_id: string | null;
  actualizado_en: string;
  propietario: { nombre: string; apellidos: string | null } | null;
  retoco: { nombre: string } | null;
};

const SEL = "id,nombre,asunto,texto,propietario_id,actualizado_en,propietario:propietario_id(nombre,apellidos),retoco:actualizado_por(nombre)";

/** Quien ve todas las personales y toca las generales. */
export const gobiernaPlantillas = (yo: Yo) => yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
export const puedeVerPlantillas = (yo: Yo) => yo.veTodo || puedeEntrar(yo, "comercial");
export const puedeTocar = (yo: Yo, p: Pick<Plantilla, "propietario_id">) =>
  p.propietario_id ? p.propietario_id === yo.id || yo.veTodo : gobiernaPlantillas(yo);

/** Las generales y las mias (direccion: tambien las de los demas). */
export async function plantillasPara(yo: Yo): Promise<Plantilla[]> {
  const filtro = gobiernaPlantillas(yo) ? "" : `&or=(propietario_id.is.null,propietario_id.eq.${yo.id})`;
  return pedir<Plantilla[]>(`plantillas_correo?select=${SEL}&activa=is.true${filtro}&order=nombre.asc`);
}

export async function plantilla(id: string, yo: Yo): Promise<Plantilla | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [p] = await pedir<Plantilla[]>(`plantillas_correo?select=${SEL}&id=eq.${id}&activa=is.true`);
  if (!p) return null;
  // La personal de otro no se ve, salvo direccion.
  if (p.propietario_id && p.propietario_id !== yo.id && !gobiernaPlantillas(yo)) return null;
  return p;
}

export type DatosPlantilla = { nombre: string; asunto: string; texto: string };

export async function crearPlantilla(yo: Yo, d: DatosPlantilla, general: boolean): Promise<string> {
  if (general && !gobiernaPlantillas(yo)) throw new Error("Las plantillas generales las crea dirección o supervisión comercial.");
  const [p] = await pedir<{ id: string }[]>("plantillas_correo", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...d, propietario_id: general ? null : yo.id, creado_por: yo.id, actualizado_por: yo.id }),
  });
  return p.id;
}

export async function guardarPlantilla(yo: Yo, id: string, d: DatosPlantilla): Promise<void> {
  const p = await plantilla(id, yo);
  if (!p || !puedeTocar(yo, p)) throw new Error("Esta plantilla no la puedes cambiar.");
  await pedir(`plantillas_correo?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...d, actualizado_por: yo.id }),
  });
}

/** Quitarla no la borra: se apaga, por si algun correo enviado la nombra. */
export async function quitarPlantilla(yo: Yo, id: string): Promise<void> {
  const p = await plantilla(id, yo);
  if (!p || !puedeTocar(yo, p)) throw new Error("Esta plantilla no la puedes quitar.");
  await pedir(`plantillas_correo?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ activa: false, actualizado_por: yo.id }),
  });
}
