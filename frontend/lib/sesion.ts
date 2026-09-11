// lib/sesion.ts
//
// ¿Quien ha entrado y que puede ver? El login dice el CORREO; esto lo cruza con
// `equipo` y saca sus funciones VIGENTES hoy y las areas que abren.
//
// Las reglas son de Monica (11-sep-2026):
//   - el acceso va por FUNCION, nunca por persona;
//   - cada funcion asignada tiene desde y hasta, y solo cuentan las vigentes;
//   - la funcion de direccion lo ve todo, tambien las areas que se creen luego.

import "server-only";
import { clienteSesion, loginConfigurado } from "./auth/servidor";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

type Fila = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  equipo_funciones: {
    desde: string | null;
    hasta: string | null;
    funciones: {
      clave: string;
      nombre: string;
      ve_todo: boolean;
      funcion_areas: { nivel: "ver" | "trabajar"; areas: { clave: string; nombre: string } | null }[];
    } | null;
  }[];
};

export type Yo = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  funciones: { clave: string; nombre: string }[];
  veTodo: boolean;
  areas: Record<string, "ver" | "trabajar">;
};

/** La persona del equipo con ese correo, si esta activa. Si no, null: no entra. */
export async function personaPorCorreo(email: string): Promise<Yo | null> {
  const sel =
    "id,nombre,apellidos,email," +
    "equipo_funciones(desde,hasta,funciones(clave,nombre,ve_todo,funcion_areas(nivel,areas(clave,nombre))))";
  // En activo = activo y sin fecha de baja pasada (la baja puede ser futura).
  const hoyM = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const r = await fetch(
    `${URL_BASE}/rest/v1/equipo?select=${sel}&activo=is.true&or=(fecha_baja.is.null,fecha_baja.gte.${hoyM})` +
      `&email=ilike.${encodeURIComponent(email.trim())}`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  const [f] = (await r.json()) as Fila[];
  if (!f) return null;

  const hoy = new Date().toISOString().slice(0, 10);
  const vigentes = f.equipo_funciones
    .filter((ef) => (!ef.desde || ef.desde <= hoy) && (!ef.hasta || ef.hasta >= hoy))
    .map((ef) => ef.funciones)
    .filter((x): x is NonNullable<typeof x> => !!x);

  // Si dos funciones abren la misma area, gana el nivel mas alto.
  const areas: Record<string, "ver" | "trabajar"> = {};
  for (const fn of vigentes)
    for (const fa of fn.funcion_areas)
      if (fa.areas && areas[fa.areas.clave] !== "trabajar") areas[fa.areas.clave] = fa.nivel;

  return {
    id: f.id,
    nombre: f.nombre,
    apellidos: f.apellidos,
    email: f.email,
    funciones: vigentes.map((v) => ({ clave: v.clave, nombre: v.nombre })),
    veTodo: vigentes.some((v) => v.ve_todo),
    areas,
  };
}

/** Quien ha entrado, o null si nadie (o si su correo ya no tiene acceso). */
export async function quienSoy(): Promise<Yo | null> {
  if (!loginConfigurado()) return null;
  const supabase = await clienteSesion();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  return personaPorCorreo(data.user.email);
}

/** ¿Puede entrar en esta area? Direccion, siempre. */
export function puedeEntrar(yo: Yo, area: string, nivel: "ver" | "trabajar" = "ver"): boolean {
  if (yo.veTodo) return true;
  const tiene = yo.areas[area];
  return tiene === "trabajar" || (tiene === "ver" && nivel === "ver");
}
