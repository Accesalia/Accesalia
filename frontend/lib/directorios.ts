// lib/directorios.ts
//
// BUSCAR EN LOS DOS DIRECTORIOS A LA VEZ (Monica, 16-oct-2026: "poner en un
// sitio arriba 'solsona 20 Fuenlabrada' lo hace TODO EL MUNDO cada medio
// minuto"). Las personas y los sitios ya estan calculados en la base
// (directorio_personas y directorio_sitios, migraciones 20261016130000 y
// 20261016140000): aqui solo se les pregunta, en dos llamadas a la vez.
//
// Un SITIO es la DIR, la carpeta de Dropbox: el edificio con todos sus trabajos
// (las opps: Ascensor, SATE...). Se ensena con el portal que se ha escrito.

import "server-only";
import { FASES } from "./pasosEscalera";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rpc<T>(funcion: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/${funcion}`, {
    method: "POST",
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${funcion} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

const NOMBRE_FASE = new Map<string, string>(FASES.map((f) => [f.clave, f.nombre]));

export type TrabajoEncontrado = {
  id: string;
  nombre: string;
  /** "Ascensor", "SATE envolvente completa"... o null si no se apunto. */
  tipos: string | null;
  /** Donde esta: la fase si esta abierta; "pausada" o "cerrada" si no. */
  como: string;
  abierta: boolean;
};

export type SitioEncontrado = {
  grupo: string;
  /** El nombre del sitio: "Ferroviarios 9 y 11 + Palomares 75, 77 y 79, Madrid". */
  sitio: string;
  /** El portal que casa con lo escrito: "FERROVIARIOS 11 esc 5". */
  portal: string | null;
  dir: string | null;
  comunidad: string | null;
  comunidadId: string | null;
  admin: string | null;
  trabajos: TrabajoEncontrado[];
};

export type PersonaEncontrada = {
  /** "puesto:<id>" o "persona:<id>". */
  fila: string;
  personaId: string;
  nombre: string;
  pista: string;
  vigente: boolean;
};

type FilaSitio = {
  grupo: string;
  sitio: string;
  portal: string | null;
  dir_codigo: string | null;
  comunidad: string | null;
  comunidad_id: string | null;
  admin: string | null;
  opps: { id: string; nombre: string; estado: string; fase: string | null; tipos: string | null }[];
};

export async function buscarSitios(q: string, limite = 6): Promise<SitioEncontrado[]> {
  if (!q.trim()) return [];
  const filas = await rpc<FilaSitio[]>("buscar_sitios", { p_q: q, p_limite: limite });
  return filas.map((f) => ({
    grupo: f.grupo,
    sitio: f.sitio,
    portal: f.portal,
    dir: f.dir_codigo,
    comunidad: f.comunidad,
    comunidadId: f.comunidad_id,
    admin: f.admin,
    trabajos: (f.opps ?? []).map((o) => ({
      id: o.id,
      nombre: o.nombre,
      tipos: o.tipos,
      como: o.estado === "abierta" ? (o.fase ? (NOMBRE_FASE.get(o.fase) ?? o.fase) : "abierta") : o.estado,
      abierta: o.estado === "abierta",
    })),
  }));
}

export async function buscarPersonas(q: string, limite = 6): Promise<PersonaEncontrada[]> {
  if (!q.trim()) return [];
  const filas = await rpc<{ fila: string; persona_id: string; nombre: string; pista: string; vigente: boolean }[]>("buscar_personas", {
    p_q: q,
    p_limite: limite,
  });
  return filas.map((f) => ({ fila: f.fila, personaId: f.persona_id, nombre: f.nombre, pista: f.pista, vigente: f.vigente }));
}

/** Lo que pide el buscador de arriba: sitios y personas, a la vez. */
export async function buscarEnDirectorios(q: string): Promise<{ sitios: SitioEncontrado[]; personas: PersonaEncontrada[] }> {
  const [sitios, personas] = await Promise.all([buscarSitios(q).catch(() => []), buscarPersonas(q).catch(() => [])]);
  return { sitios, personas };
}
