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
  comunidad_autonoma: string | null;
  cif_comunidad: string | null;
  referencia_catastral: string | null;
  anio_construccion: number | null;
  iban: string | null;
  num_viviendas: number | null;
  num_residentes_mayores_70: number | null;
  num_residentes_discapacidad: number | null;
  fecha_actualizacion_censo: string | null;
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

// Quien administra la comunidad. Ya no es una columna: es una fila viva de
// comunidad_admin_responsable, con su fecha y su historia.
//
// Puede faltar la empresa y estar la persona ("Admin Tomas 645748010"): eso no
// es un error, es que aun no se sabe de que casa es, y se marca en rojo.
export type AdministracionActual = {
  vinculoId: string;          // la fila del vinculo, la que hay que cerrar al cambiar
  empresaId: string | null;
  empresa: string | null;     // vacio = falta saber la casa
  telefono: string | null;
  email: string | null;
  puestoId: string | null;
  persona: string | null;     // con quien se habla de verdad; el modelo viejo no lo tenia
  desde: string | null;
} | null;

// Las anteriores. Para eso guardamos el historico: para entender por que un
// documento de 2023 lleva una firma y el de 2025 otra.
export type AdministracionPasada = {
  vinculoId: string;
  empresa: string | null;
  persona: string | null;
  desde: string | null;
  hasta: string | null;
  notas: string | null;
};

/** Se mantiene el nombre viejo por comodidad de las pantallas que ya existen. */
export type AdministracionMin = AdministracionActual;

export type FichaComunidad = {
  comunidad: Comunidad;
  administracion: AdministracionActual;
  administracionesAnteriores: AdministracionPasada[];
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
  "id,nombre,direccion,cp,municipio,provincia,comunidad_autonoma,cif_comunidad," +
  "referencia_catastral,anio_construccion,iban,num_viviendas,num_residentes_mayores_70," +
  "num_residentes_discapacidad,fecha_actualizacion_censo,activa";

// El vinculo con quien la administra, con la persona y la casa colgando.
const SEL_VINCULO =
  "id,empresa_id,puesto_id,vigente,desde,hasta,notas," +
  "empresa:empresa_id(nombre_accesalia,telefono,correo(email,principal))," +
  "puesto:puesto_id(persona:persona_id(nombre),correo(email,principal))";

type CorreoFila = { email: string; principal: boolean };

function correoDe(cs: CorreoFila[] | null | undefined): string | null {
  if (!cs || !cs.length) return null;
  return (cs.find((c) => c.principal) ?? cs[0]).email;
}

type VinculoFila = {
  id: string;
  empresa_id: string | null;
  puesto_id: string | null;
  vigente: boolean;
  desde: string | null;
  hasta: string | null;
  notas: string | null;
  empresa: { nombre_accesalia: string; telefono: string | null; correo?: CorreoFila[] } | null;
  puesto: { persona: { nombre: string } | null; correo?: CorreoFila[] } | null;
};

// ---- Consultas ----

export type ComunidadFila = {
  id: string;
  nombre: string;
  municipio: string | null;
  cp: string | null;
};

/** Listado para el buscador de comunidades (ligero). */
export async function listarComunidades(q?: string): Promise<ComunidadFila[]> {
  let path = "comunidades?select=id,nombre,municipio,cp&order=nombre.asc&limit=100";
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

  const [vinculos, personas, numHojas] = await Promise.all([
    // la vigente y las anteriores en una sola consulta: son cuatro filas
    rest<VinculoFila[]>(
      `comunidad_admin_responsable?select=${SEL_VINCULO}&comunidad_id=eq.${id}` +
        "&order=vigente.desc,hasta.desc",
    ),
    rest<PersonaComunidad[]>(
      `personas_comunidad?select=id,nombre,rol,documento,telefono,email,es_contacto_principal,notas` +
        `&comunidad_id=eq.${id}&order=es_contacto_principal.desc,rol.asc`,
    ),
    contar(`hojas_encargo?select=id&comunidad_id=eq.${id}`),
  ]);

  const viva = vinculos.find((v) => v.vigente) ?? null;
  const administracion: AdministracionActual = viva
    ? {
        vinculoId: viva.id,
        empresaId: viva.empresa_id,
        empresa: viva.empresa?.nombre_accesalia ?? null,
        telefono: viva.empresa?.telefono ?? null,
        // el de la persona manda: es a quien escribes de verdad
        email: correoDe(viva.puesto?.correo) ?? correoDe(viva.empresa?.correo),
        puestoId: viva.puesto_id,
        persona: viva.puesto?.persona?.nombre ?? null,
        desde: viva.desde,
      }
    : null;

  const administracionesAnteriores: AdministracionPasada[] = vinculos
    .filter((v) => !v.vigente)
    .map((v) => ({
      vinculoId: v.id,
      empresa: v.empresa?.nombre_accesalia ?? null,
      persona: v.puesto?.persona?.nombre ?? null,
      desde: v.desde,
      hasta: v.hasta,
      notas: v.notas,
    }));

  return { comunidad, administracion, administracionesAnteriores, personas, numHojas };
}

/** Como se llama a quien administra, en una linea y sin mentir.
 *
 *  Si no sabemos la casa pero si la persona, se dice: "Tomas (falta la
 *  administracion)". Antes esto no se podia ni guardar, asi que se inventaba
 *  una empresa llamada "ADMIN TOMAS" que ensuciaba la cartera. */
export function nombreAdministracion(a: AdministracionActual): string {
  if (!a) return "—";
  if (a.empresa) return a.empresa;
  if (a.persona) return `${a.persona} (falta la administración)`;
  return "Falta saber la administración";
}

/** Administraciones para elegir. Se mantiene el nombre por las pantallas que
 *  ya lo llaman; debajo lee empresa, que es donde viven ahora. */
export async function administracionesParaSelector(): Promise<{ id: string; nombre: string }[]> {
  const filas = await rest<{ id: string; nombre_accesalia: string }[]>(
    "empresa?select=id,nombre_accesalia&activa=is.true&order=nombre_accesalia.asc&limit=2000",
  );
  return filas.map((f) => ({ id: f.id, nombre: f.nombre_accesalia }));
}
