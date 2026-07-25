// lib/comunidades.ts
//
// Acceso a datos de la COMUNIDAD (el eje del ERP: el "user_id" del que cuelga
// todo). Solo de servidor, mismo patron que lib/comercial.ts y lib/datos.ts:
// REST con la clave SECRETA (service role). La ficha de comunidad es la capa 1
// (datos estables); de ella se alimentan las demas areas (hojas de encargo,
// subvenciones, obra...).

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

/** Lee la cabecera Content-Range (count=exact) para un total sin traer filas. */
async function contar(path: string): Promise<number> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });
  const cr = r.headers.get("content-range"); // "0-0/1234" o "*/0"
  return cr ? Number(cr.split("/")[1]) || 0 : 0;
}

// ---- Tipos ----

export type Comunidad = {
  id: string;
  nombre: string;
  direccion: string | null;
  cp: string | null;
  municipio: string | null;
  provincia: string | null;
  cif_comunidad: string | null;
  referencia_catastral: string | null;
  anio_construccion: number | null;
  iban: string | null;
  num_viviendas: number | null;
  num_residentes_mayores_70: number | null;
  num_residentes_discapacidad: number | null;
  fecha_actualizacion_censo: string | null;
  administracion_id: string | null;
  activa: boolean;
};

export type RolPersona = "presidente" | "vicepresidente" | "secretario" | "vecino" | "otro";

export type PersonaComunidad = {
  id: string;
  nombre: string;
  rol: RolPersona;
  documento: string | null;
  telefono: string | null;
  email: string | null;
  es_contacto_principal: boolean;
  notas: string | null;
};

export type AdministracionMin = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
} | null;

export type FichaComunidad = {
  comunidad: Comunidad;
  administracion: AdministracionMin;
  personas: PersonaComunidad[];
  numHojas: number;
};

export const ROLES: Record<RolPersona, string> = {
  presidente: "Presidente",
  vicepresidente: "Vicepresidente",
  secretario: "Secretario",
  vecino: "Vecino",
  otro: "Otro",
};

const SEL_COMUNIDAD =
  "id,nombre,direccion,cp,municipio,provincia,cif_comunidad,referencia_catastral," +
  "anio_construccion,iban,num_viviendas,num_residentes_mayores_70," +
  "num_residentes_discapacidad,fecha_actualizacion_censo,administracion_id,activa";

// ---- Consultas ----

export type ComunidadFila = {
  id: string;
  nombre: string;
  municipio: string | null;
  cp: string | null;
  administracion_id: string | null;
};

/** Listado para el buscador de comunidades (ligero). */
export async function listarComunidades(q?: string): Promise<ComunidadFila[]> {
  let path = "comunidades?select=id,nombre,municipio,cp,administracion_id&order=nombre.asc&limit=100";
  if (q && q.trim()) {
    const t = encodeURIComponent(`%${q.trim()}%`);
    path += `&or=(nombre.ilike.${t},municipio.ilike.${t})`;
  }
  return rest<ComunidadFila[]>(path);
}

/** Total de comunidades (para la cabecera del listado). */
export function contarComunidades(): Promise<number> {
  return contar("comunidades?select=id");
}

/** Ficha 360 de UNA comunidad: datos + administracion + personas + nº de hojas. */
export async function comunidadPorId(id: string): Promise<FichaComunidad | null> {
  const comus = await rest<Comunidad[]>(`comunidades?select=${SEL_COMUNIDAD}&id=eq.${id}`);
  const comunidad = comus[0];
  if (!comunidad) return null;

  const [administracion, personas, numHojas] = await Promise.all([
    comunidad.administracion_id
      ? rest<NonNullable<AdministracionMin>[]>(
          `administraciones_fincas?select=id,nombre,telefono,email&id=eq.${comunidad.administracion_id}`,
        ).then((a) => a[0] ?? null)
      : Promise.resolve(null),
    rest<PersonaComunidad[]>(
      `personas_comunidad?select=id,nombre,rol,documento,telefono,email,es_contacto_principal,notas` +
        `&comunidad_id=eq.${id}&order=es_contacto_principal.desc,rol.asc`,
    ),
    contar(`hojas_encargo?select=id&comunidad_id=eq.${id}`),
  ]);

  return { comunidad, administracion, personas, numHojas };
}

/** Administraciones para el desplegable del alta/edicion de comunidad. */
export function administracionesParaSelector(): Promise<{ id: string; nombre: string }[]> {
  return rest<{ id: string; nombre: string }[]>(
    "administraciones_fincas?select=id,nombre&order=nombre.asc&limit=2000",
  );
}
