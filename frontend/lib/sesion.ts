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
      funcion_areas: { nivel: Nivel; areas: { clave: string; nombre: string } | null }[];
    } | null;
  }[];
};

// Niveles en un area, de menos a mas: ver (solo mira), trabajar (trabaja en lo
// suyo), supervisar (ve todo lo del area, p. ej. todas las carteras comerciales).
export type Nivel = "ver" | "trabajar" | "supervisar";
const PESO: Record<Nivel, number> = { ver: 1, trabajar: 2, supervisar: 3 };

export type Yo = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string;
  funciones: { clave: string; nombre: string }[];
  veTodo: boolean;
  areas: Record<string, Nivel>;
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
  const areas: Record<string, Nivel> = {};
  for (const fn of vigentes)
    for (const fa of fn.funcion_areas) {
      if (!fa.areas) continue;
      const actual = areas[fa.areas.clave];
      if (!actual || PESO[fa.nivel] > PESO[actual]) areas[fa.areas.clave] = fa.nivel;
    }

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

/** El comercial que es esta persona (su cartera), si lo es. */
export async function comercialDe(personaId: string): Promise<{ id: string; nombre: string } | null> {
  const r = await fetch(`${URL_BASE}/rest/v1/comerciales?select=id,nombre&equipo_id=eq.${personaId}&activo=is.true&limit=1`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const [c] = (await r.json()) as { id: string; nombre: string }[];
  return c ?? null;
}

/** ¿Llega a este nivel en esta area? Direccion, siempre. */
export function puedeEntrar(yo: Yo, area: string, nivel: Nivel = "ver"): boolean {
  if (yo.veTodo) return true;
  const tiene = yo.areas[area];
  return !!tiene && PESO[tiene] >= PESO[nivel];
}
