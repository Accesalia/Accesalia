// lib/equipo.ts
//
// Acceso a datos del EQUIPO (directorio general del personal de Accesalia).
// Solo de servidor, mismo patron que lib/comunidades.ts: REST con la clave
// SECRETA (service role). Dos niveles: la persona (`equipo`) y las funciones que
// cubre (catalogo editable `funciones` via puente `equipo_funciones`).
//
// "Quien hizo que parte de un proyecto" NO vive aqui: son asignaciones por rol y
// por proyecto (fase proyecto). Esto es el directorio.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

// ---- Tipos ----

export type Funcion = {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string | null;
  orden: number | null;
  activa: boolean;
};

export type MiembroEquipo = {
  id: string;
  nombre: string;
  es_arquitecto: boolean | null;
  titulacion: string | null;
  activo: boolean;
  notas: string | null;
  funciones: Funcion[];
};

// Forma que devuelve PostgREST con el embed del puente.
type FilaEquipo = {
  id: string;
  nombre: string;
  es_arquitecto: boolean | null;
  titulacion: string | null;
  activo: boolean;
  notas: string | null;
  equipo_funciones: { funciones: Funcion }[];
};

const SEL_EQUIPO =
  "id,nombre,es_arquitecto,titulacion,activo,notas," +
  "equipo_funciones(funciones(id,clave,nombre,descripcion,orden,activa))";

function ordenarFunciones(fs: Funcion[]): Funcion[] {
  return [...fs].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
}

// ---- Consultas ----

/** Directorio completo del equipo con sus funciones (arquitectos primero, luego por nombre). */
export async function listarEquipo(soloActivos = true): Promise<MiembroEquipo[]> {
  let path = `equipo?select=${SEL_EQUIPO}&order=nombre.asc`;
  if (soloActivos) path += "&activo=is.true";
  const filas = await rest<FilaEquipo[]>(path);
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    es_arquitecto: f.es_arquitecto,
    titulacion: f.titulacion,
    activo: f.activo,
    notas: f.notas,
    funciones: ordenarFunciones((f.equipo_funciones ?? []).map((ef) => ef.funciones).filter(Boolean)),
  }));
}

/** Catalogo de funciones (para asignar o filtrar). */
export function listarFunciones(soloActivas = true): Promise<Funcion[]> {
  let path = "funciones?select=id,clave,nombre,descripcion,orden,activa&order=orden.asc";
  if (soloActivas) path += "&activa=is.true";
  return rest<Funcion[]>(path);
}

/** Personas que cubren una funcion concreta (por clave). Para selectores de la fase proyecto. */
export async function equipoPorFuncion(clave: string): Promise<{ id: string; nombre: string }[]> {
  const path =
    `equipo?select=id,nombre,equipo_funciones!inner(funciones!inner(clave))` +
    `&equipo_funciones.funciones.clave=eq.${encodeURIComponent(clave)}` +
    `&activo=is.true&order=nombre.asc`;
  const filas = await rest<{ id: string; nombre: string }[]>(path);
  return filas.map((f) => ({ id: f.id, nombre: f.nombre }));
}
