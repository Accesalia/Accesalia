// lib/comercial.ts
//
// Acceso a datos del area COMERCIAL (CRM), solo de servidor. Mismo patron que
// lib/datos.ts: REST de Supabase con la clave SECRETA (service role), que nunca
// llega al navegador. Las tablas tienen RLS activo sin politicas.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
    },
    cache: "no-store",
  });
  if (!r.ok) {
    throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  }
  return r.json() as Promise<T>;
}

// ---- Tipos ----

export type Comercial = {
  id: string;
  nombre: string;
  apellidos: string | null;
};

// Empresa de administracion de fincas (el paraguas que agrupa administradores).
export type AdministracionFincas = {
  id: string;
  nombre: string;
  cif: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  municipio: string | null;
  notas: string | null;
  activo: boolean;
};

// Fila de administrador con sus relaciones "aplanadas" para pintar la cartera.
export type Administrador = {
  id: string;
  nombre: string;
  empresa: string | null;
  cargo: string | null;
  telefono: string | null;
  email: string | null;
  comision_por_defecto: number | null;
  fecha_ultimo_contacto: string | null;
  fecha_ultimo_encargo: string | null;
  fecha_alta_administrador: string | null;
  activo: boolean;
  administracion_id: string | null;
  comercial_id: string | null;
  comercial_captador_id: string | null;
  administracion: { nombre: string } | null;
  comercial: { nombre: string; apellidos: string | null } | null;
};

// Ficha completa: el administrador + su administracion de fincas + companeros de
// la misma + sus comunidades y oportunidades (pueden venir vacias).
export type AdministradorFicha = {
  admin: Administrador;
  administracion: AdministracionFincas | null;
  companeros: { id: string; nombre: string; cargo: string | null }[];
  comunidades: { id: string; nombre: string; municipio: string | null }[];
  oportunidades: { id: string; estado: string; comunidad_provisional: string | null }[];
};

// select comun con los dos FKs a comerciales desambiguados por columna.
const SELECT_ADMIN =
  "id,nombre,empresa,cargo,telefono,email,comision_por_defecto," +
  "fecha_ultimo_contacto,fecha_ultimo_encargo,fecha_alta_administrador,activo," +
  "administracion_id,comercial_id,comercial_captador_id," +
  "administracion:administraciones_fincas(nombre)," +
  "comercial:comerciales!comercial_id(nombre,apellidos)";

// ---- Consultas ----

/** Cartera: todos los administradores con su administracion y comercial dueno. */
export async function listarAdministradores(): Promise<Administrador[]> {
  return rest<Administrador[]>(
    `administradores?select=${SELECT_ADMIN}&order=nombre.asc`,
  );
}

/** Ficha de un administrador con todo lo que cuelga de el. */
export async function administradorPorId(id: string): Promise<AdministradorFicha | null> {
  const admins = await rest<Administrador[]>(
    `administradores?select=${SELECT_ADMIN}&id=eq.${id}&limit=1`,
  );
  const admin = admins[0];
  if (!admin) return null;

  const [administraciones, companeros, comunidades, oportunidades] = await Promise.all([
    admin.administracion_id
      ? rest<AdministracionFincas[]>(
          `administraciones_fincas?select=*&id=eq.${admin.administracion_id}&limit=1`,
        )
      : Promise.resolve([] as AdministracionFincas[]),
    admin.administracion_id
      ? rest<{ id: string; nombre: string; cargo: string | null }[]>(
          `administradores?select=id,nombre,cargo&administracion_id=eq.${admin.administracion_id}&id=neq.${id}&order=nombre.asc`,
        )
      : Promise.resolve([] as { id: string; nombre: string; cargo: string | null }[]),
    rest<{ id: string; nombre: string; municipio: string | null }[]>(
      `comunidades?select=id,nombre,municipio&administrador_id=eq.${id}&order=nombre.asc`,
    ),
    rest<{ id: string; estado: string; comunidad_provisional: string | null }[]>(
      `oportunidades?select=id,estado,comunidad_provisional&administrador_id=eq.${id}&order=creado_en.desc`,
    ),
  ]);

  return {
    admin,
    administracion: administraciones[0] ?? null,
    companeros,
    comunidades,
    oportunidades,
  };
}

/** Comerciales activos, para el selector de "comercial dueno de la cartera". */
export async function listarComerciales(): Promise<Comercial[]> {
  return rest<Comercial[]>(
    "comerciales?select=id,nombre,apellidos&activo=eq.true&order=nombre.asc",
  );
}

/** Administraciones de fincas activas, para el selector al dar de alta un admin. */
export async function listarAdministraciones(): Promise<AdministracionFincas[]> {
  return rest<AdministracionFincas[]>(
    "administraciones_fincas?select=*&activo=eq.true&order=nombre.asc",
  );
}

// ---- Helpers de presentacion ----

export function nombreComercial(c: { nombre: string; apellidos: string | null } | null): string {
  if (!c) return "Sin asignar";
  return [c.nombre, c.apellidos].filter(Boolean).join(" ");
}

/** Organizacion a mostrar: la administracion de fincas si la hay, si no la empresa. */
export function organizacionDe(a: Administrador): string | null {
  if (a.administracion?.nombre) return a.administracion.nombre;
  return a.empresa ?? null;
}
