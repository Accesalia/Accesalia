// lib/comercial.ts
//
// Acceso a datos del area COMERCIAL (CRM), solo de servidor. La cartera gira
// sobre la ADMINISTRACION de fincas (unidad principal); las personas cuelgan de
// ella. Mismo patron que lib/datos.ts: REST con la clave SECRETA (service role).

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

// ---- Catalogo de estados (ciclo de vida de la administracion) ----

export type EstadoAdministracion =
  | "contacto"
  | "cliente_activo"
  | "cliente_olvidado"
  | "cliente_descontento"
  | "cliente_baneado";

export const ESTADOS: Record<EstadoAdministracion, { label: string; clase: string }> = {
  contacto:            { label: "Contacto",    clase: "bg-black/5 text-carbon/60" },
  cliente_activo:      { label: "Cliente activo", clase: "bg-lima-soft text-lima-dark" },
  cliente_olvidado:    { label: "Olvidado",    clase: "bg-amber-100 text-amber-700" },
  cliente_descontento: { label: "Descontento", clase: "bg-orange-100 text-orange-700" },
  cliente_baneado:     { label: "Baneado",     clase: "bg-red-100 text-red-700" },
};

export const ESTADOS_LISTA = Object.keys(ESTADOS) as EstadoAdministracion[];

// ---- Tipos ----

export type Comercial = { id: string; nombre: string; apellidos: string | null };

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
  estado: EstadoAdministracion;
  fecha_paso_a_cliente: string | null;
  motivo_fin: string | null;
  fecha_fin: string | null;
  titular_id: string | null;
  comercial_id: string | null;
  comercial_captador_id: string | null;
  fecha_alta_cartera: string | null;
  fecha_ultimo_contacto: string | null;
  fecha_ultimo_encargo: string | null;
};

// Fila de cartera (administracion + comercial + nº de personas).
export type AdministracionCartera = AdministracionFincas & {
  comercial: { nombre: string; apellidos: string | null } | null;
  personas: { count: number }[];
};

export type Administrador = {
  id: string;
  nombre: string;
  empresa: string | null;
  cargo: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  administracion_id: string | null;
  activo: boolean;
};

export type Contacto = {
  id: string;
  proposito: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  persona_id: string | null;
};

export type Origen = {
  id: string;
  tipo_origen: string;
  referente_externo: string | null;
  condiciona_oferta: boolean;
  notas: string | null;
};

export type AdministracionFicha = {
  administracion: AdministracionFincas;
  comercial: Comercial | null;
  titular: { id: string; nombre: string } | null;
  personas: Administrador[];
  contactos: Contacto[];
  origen: Origen[];
};

const SELECT_CARTERA =
  "id,nombre,cif,telefono,email,direccion,municipio,notas,activo,estado," +
  "fecha_paso_a_cliente,motivo_fin,fecha_fin,titular_id,comercial_id," +
  "comercial_captador_id,fecha_alta_cartera,fecha_ultimo_contacto,fecha_ultimo_encargo," +
  "comercial:comerciales!comercial_id(nombre,apellidos)," +
  "personas:administradores!administracion_id(count)";

// ---- Consultas ----

/** Cartera: todas las administraciones con comercial dueno y nº de personas. */
export async function listarCartera(): Promise<AdministracionCartera[]> {
  return rest<AdministracionCartera[]>(
    `administraciones_fincas?select=${SELECT_CARTERA}&order=nombre.asc`,
  );
}

/** Ficha completa de una administracion. */
export async function administracionPorId(id: string): Promise<AdministracionFicha | null> {
  const filas = await rest<AdministracionFincas[]>(
    `administraciones_fincas?select=*&id=eq.${id}&limit=1`,
  );
  const administracion = filas[0];
  if (!administracion) return null;

  const [comerciales, titulares, personas, contactos, origen] = await Promise.all([
    administracion.comercial_id
      ? rest<Comercial[]>(
          `comerciales?select=id,nombre,apellidos&id=eq.${administracion.comercial_id}&limit=1`,
        )
      : Promise.resolve([] as Comercial[]),
    administracion.titular_id
      ? rest<{ id: string; nombre: string }[]>(
          `administradores?select=id,nombre&id=eq.${administracion.titular_id}&limit=1`,
        )
      : Promise.resolve([] as { id: string; nombre: string }[]),
    rest<Administrador[]>(
      `administradores?select=id,nombre,empresa,cargo,telefono,email,notas,administracion_id,activo&administracion_id=eq.${id}&order=nombre.asc`,
    ),
    rest<Contacto[]>(
      `contactos?select=id,proposito,nombre,telefono,email,notas,persona_id&administracion_id=eq.${id}&order=proposito.asc`,
    ),
    rest<Origen[]>(
      `administracion_origen?select=id,tipo_origen,referente_externo,condiciona_oferta,notas&administracion_id=eq.${id}&order=creado_en.asc`,
    ),
  ]);

  return {
    administracion,
    comercial: comerciales[0] ?? null,
    titular: titulares[0] ?? null,
    personas,
    contactos,
    origen,
  };
}

/** Administracion en crudo (para el formulario de edicion). */
export async function administracionCruda(id: string): Promise<AdministracionFincas | null> {
  const filas = await rest<AdministracionFincas[]>(
    `administraciones_fincas?select=*&id=eq.${id}&limit=1`,
  );
  return filas[0] ?? null;
}

/** Una persona (para su ficha o edicion), con su administracion. */
export async function administradorPorId(
  id: string,
): Promise<{ admin: Administrador; administracion: { id: string; nombre: string } | null } | null> {
  const filas = await rest<(Administrador & { administracion: { id: string; nombre: string } | null })[]>(
    `administradores?select=id,nombre,empresa,cargo,telefono,email,notas,administracion_id,activo,administracion:administraciones_fincas!administradores_administracion_id_fkey(id,nombre)&id=eq.${id}&limit=1`,
  );
  const row = filas[0];
  if (!row) return null;
  const { administracion, ...admin } = row;
  return { admin, administracion };
}

export async function listarComerciales(): Promise<Comercial[]> {
  return rest<Comercial[]>(
    "comerciales?select=id,nombre,apellidos&activo=eq.true&order=nombre.asc",
  );
}

export async function listarAdministraciones(): Promise<{ id: string; nombre: string }[]> {
  return rest<{ id: string; nombre: string }[]>(
    "administraciones_fincas?select=id,nombre&activo=eq.true&order=nombre.asc",
  );
}

// ---- Helpers de presentacion ----

export function nombreComercial(c: { nombre: string; apellidos: string | null } | null): string {
  if (!c) return "Sin asignar";
  return [c.nombre, c.apellidos].filter(Boolean).join(" ");
}

export function nPersonas(a: AdministracionCartera): number {
  return a.personas?.[0]?.count ?? 0;
}

// ---- Captura de contactos (interacciones) — el corazon del area comercial ----

export const ORIGEN_LABEL: Record<string, string> = {
  nota_voz: "Nota de voz", manual: "Escrito", mail: "Email", llamada: "Llamada", visita: "Visita",
};
export const TIPO_EVENTO_LABEL: Record<string, string> = {
  resultado_junta: "Resultado de junta", seguimiento: "Seguimiento",
  llamada_administrador: "Llamada a administrador", envio_documentos: "Envío de documentos", otro: "Otro",
};

export type Interaccion = {
  id: string;
  fecha_evento: string | null;
  creado_en: string;
  origen: string;
  tipo_evento: string;
  transcripcion: string | null;
  pendiente_vincular: boolean;
  requiere_humano: boolean;
  administradores: { nombre: string; empresa: string | null } | null;
  comerciales: { nombre: string } | null;
};

const SEL_INT =
  "id,fecha_evento,creado_en,origen,tipo_evento,transcripcion,pendiente_vincular,requiere_humano," +
  "administradores:administrador_id(nombre,empresa),comerciales:comercial_id(nombre)";

/** Personas administradoras (el sujeto de una interaccion; FK administrador_id). */
export function listarAdministradoresPersonas(): Promise<{ id: string; nombre: string; empresa: string | null }[]> {
  return rest<{ id: string; nombre: string; empresa: string | null }[]>(
    "administradores?select=id,nombre,empresa&activo=eq.true&order=nombre.asc&limit=2000",
  );
}

/** Interacciones recientes (opcionalmente de un comercial), para el diario del hub. */
export function interaccionesRecientes(comercialId?: string, limite = 25): Promise<Interaccion[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  return rest<Interaccion[]>(`interacciones?select=${SEL_INT}${f}&order=creado_en.desc&limit=${limite}`);
}

// ---- Revisión de una interacción (lo grabado | lo que Ordelia hizo) ----

// Un evento de la bitácora = una cosa que la IA HIZO con esta nota. Es la verdad
// de las acciones (y lo que deshace el botón del pánico, evento a evento).
export type EventoBitacora = {
  id: string;
  tipo: string;               // oportunidad_creada | tarea_creada | pendiente_crear_comunidad | item_* | ...
  target_tabla: string | null;
  target_id: string | null;
  datos: Record<string, unknown>;   // el item del abanico (accion, sujeto_nombre, importe, ...)
  deshecho: boolean;
  creado_en: string;
  actor_tipo: string;
};

// Lo que la IA propuso, en crudo (el JSON del esquema de la edge).
export type ExtraccionIA = {
  resumen_para_comercial?: string;
  requiere_humano?: boolean;
  motivo_humano?: string;
  items?: Record<string, unknown>[];
  resumenes_actualizados?: { comunidad_id: string; resumen: string }[];
};

export type InteraccionRevision = {
  id: string;
  transcripcion: string | null;
  origen: string;
  tipo_evento: string | null;
  fecha_evento: string | null;
  creado_en: string;
  extraccion: ExtraccionIA | null;
  extraccion_estado: string;
  requiere_humano: boolean;
  motivo_requiere_humano: string | null;
  comercial_id: string | null;
  administrador_id: string | null;
  administrador: { id: string; nombre: string; empresa: string | null; administracion_id: string | null } | null;
  comercial: { nombre: string; apellidos: string | null } | null;
};

export type RevisionCompleta = {
  interaccion: InteraccionRevision;
  eventos: EventoBitacora[];
  // Comunidades del administrador de la nota (para el desplegable de "vincular a existente").
  comunidadesDelAdmin: { id: string; nombre: string; direccion: string | null }[];
};

/** Todo lo necesario para revisar una interacción: la nota, lo que hizo la IA y el contexto para desambiguar. */
export async function revisionInteraccion(id: string): Promise<RevisionCompleta | null> {
  const filas = await rest<(InteraccionRevision & {
    administrador: { id: string; nombre: string; empresa: string | null; administracion_id: string | null } | null;
    comercial: { nombre: string; apellidos: string | null } | null;
  })[]>(
    `interacciones?select=id,transcripcion,origen,tipo_evento,fecha_evento,creado_en,extraccion,extraccion_estado,requiere_humano,motivo_requiere_humano,comercial_id,administrador_id,` +
      `administrador:administrador_id(id,nombre,empresa,administracion_id),comercial:comercial_id(nombre,apellidos)&id=eq.${id}&limit=1`,
  );
  const interaccion = filas[0];
  if (!interaccion) return null;

  const [eventos, comunidadesDelAdmin] = await Promise.all([
    rest<EventoBitacora[]>(
      `bitacora_ia?select=id,tipo,target_tabla,target_id,datos,deshecho,creado_en,actor_tipo&operacion=eq.comercial:${id}&order=creado_en.asc`,
    ),
    interaccion.administrador?.administracion_id
      ? rest<{ id: string; nombre: string; direccion: string | null }[]>(
          `comunidades?select=id,nombre,direccion&administracion_id=eq.${interaccion.administrador.administracion_id}&activa=eq.true&order=nombre.asc&limit=300`,
        )
      : Promise.resolve([] as { id: string; nombre: string; direccion: string | null }[]),
  ]);

  return { interaccion, eventos, comunidadesDelAdmin };
}

// ---- Resúmenes IA vivos de Sali (tabla resumenes_ia, por ámbito) ----

export type ResumenIA = { fase: string; texto: string; actualizado_en: string };

export const FASE_LABEL: Record<string, string> = {
  comercial: "Comercial", proyecto: "Proyecto", visado: "Visado", licencia: "Licencia",
  obra: "Obra", facturacion: "Facturación", subvenciones: "Subvenciones", global: "Global",
};

/** Resumen vivo de Sali de un administrador-persona (fase comercial). */
export async function resumenAdmin(administradorId: string): Promise<ResumenIA | null> {
  const filas = await rest<ResumenIA[]>(
    `resumenes_ia?select=fase,texto,actualizado_en&ambito=eq.administrador&administrador_id=eq.${administradorId}&fase=eq.comercial&limit=1`,
  );
  return filas[0] ?? null;
}

/** Diario con un administrador-persona: sus interacciones, recientes primero. */
export function interaccionesDeAdministrador(administradorId: string, limite = 25): Promise<Interaccion[]> {
  return rest<Interaccion[]>(`interacciones?select=${SEL_INT}&administrador_id=eq.${administradorId}&order=creado_en.desc&limit=${limite}`);
}

/** Conversaciones que MENCIONAN una comunidad (vía el puente interaccion_comunidad).
 *  El texto crudo vive una vez en interacciones; aquí solo se asoma por el puntero. */
export function interaccionesDeComunidad(comunidadId: string, limite = 25): Promise<Interaccion[]> {
  return rest<Interaccion[]>(
    `interacciones?select=${SEL_INT},interaccion_comunidad!inner(comunidad_id)&interaccion_comunidad.comunidad_id=eq.${comunidadId}&order=creado_en.desc&limit=${limite}`,
  );
}

/** Todos los resúmenes de Sali de una comunidad, por fase (el "ciclo de vida"). */
export async function resumenesComunidad(comunidadId: string): Promise<ResumenIA[]> {
  return rest<ResumenIA[]>(
    `resumenes_ia?select=fase,texto,actualizado_en&ambito=eq.comunidad&comunidad_id=eq.${comunidadId}&order=actualizado_en.desc`,
  );
}

export type Condicionante = { id: string; texto: string; categoria: string | null; creado_en: string };

/** Brief técnico de la comunidad: deseos y condicionantes que dijo la comunidad (para el redactor). */
export function condicionantesComunidad(comunidadId: string): Promise<Condicionante[]> {
  return rest<Condicionante[]>(
    `condicionantes_comunidad?select=id,texto,categoria,creado_en&comunidad_id=eq.${comunidadId}&order=creado_en.desc`,
  );
}

// ---- Pipeline COMERCIAL por HITOS (barra "¿en qué punto estamos?") ----

// Estado de cada hito. El color pinta la barra (naranja=en curso, verde=hecho).
export const HITO_ESTADO: Record<string, { label: string; clase: string; dot: string }> = {
  pendiente: { label: "Pendiente", clase: "bg-black/5 text-carbon/50",     dot: "bg-black/15" },
  en_curso:  { label: "En curso",  clase: "bg-amber-100 text-amber-700",   dot: "bg-amber-400" },
  hecho:     { label: "Hecho",     clase: "bg-lima-soft text-lima-dark",   dot: "bg-lima" },
  no_aplica: { label: "No aplica", clase: "bg-black/5 text-carbon/30",     dot: "bg-black/10" },
};
export const HITO_ESTADOS = ["pendiente", "en_curso", "hecho", "no_aplica"];

export type HitoCatalogo = { clave: string; nombre: string; orden: number; es_ramal: boolean; aplicable_por_defecto: boolean; responsable_rol: string | null };
export type HitoOportunidad = { id: string; hito: string; aplicable: boolean; estado: string; fecha: string | null; enlace_url: string | null; responsable_id: string | null };
export type NegociacionVigente = { que_vendemos: string | null; precio: number | null; alcance: string | null; creado_en: string };

export type OportunidadEnMarcha = {
  id: string;
  estado: string;
  comunidad_provisional: string | null;
  origen_notas: string | null;
  creado_en: string;
  comunidad: { id: string; nombre: string; direccion: string | null } | null;
  administrador: { nombre: string; empresa: string | null } | null;
  comercial: { nombre: string } | null;
  hitos_oportunidad: HitoOportunidad[];
  negociacion_oportunidad: NegociacionVigente[]; // solo la vigente (limit 1)
};

/** Fecha del último contacto por comunidad (máx. interacción vía el puente). */
export async function ultimoContactoComunidades(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const rows = await rest<{ comunidad_id: string; interacciones: { fecha_evento: string | null; creado_en: string } | null }[]>(
    `interaccion_comunidad?select=comunidad_id,interacciones(fecha_evento,creado_en)&comunidad_id=in.(${ids.join(",")})`,
  );
  const out: Record<string, string> = {};
  for (const r of rows) {
    const d = r.interacciones?.fecha_evento ?? r.interacciones?.creado_en?.slice(0, 10);
    if (!d) continue;
    if (!out[r.comunidad_id] || d > out[r.comunidad_id]) out[r.comunidad_id] = d;
  }
  return out;
}

/** Comunidades para el selector de alta manual de oportunidad. */
export function listarComunidadesSelector(): Promise<{ id: string; nombre: string }[]> {
  return rest<{ id: string; nombre: string }[]>(
    "comunidades?select=id,nombre&activa=eq.true&order=nombre.asc&limit=3000",
  );
}

/** Catálogo de hitos del pipeline comercial (ordenado). */
export function catalogoHitos(): Promise<HitoCatalogo[]> {
  return rest<HitoCatalogo[]>(
    "hitos_comerciales?select=clave,nombre,orden,es_ramal,aplicable_por_defecto,responsable_rol&order=orden.asc",
  );
}

const SEL_OPORTUNIDAD =
  "id,estado,comunidad_provisional,origen_notas,creado_en," +
  "comunidad:comunidad_id(id,nombre,direccion),administrador:administrador_id(nombre,empresa),comercial:comercial_id(nombre)," +
  "hitos_oportunidad(id,hito,aplicable,estado,fecha,enlace_url,responsable_id)," +
  "negociacion_oportunidad(que_vendemos,precio,alcance,creado_en)";

/** Oportunidades EN MARCHA (activas) con sus hitos y la oferta vigente. */
export function oportunidadesEnMarcha(comercialId?: string): Promise<OportunidadEnMarcha[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  return rest<OportunidadEnMarcha[]>(
    `oportunidades?select=${SEL_OPORTUNIDAD}&estado=eq.activa${f}&order=creado_en.desc&limit=200` +
      "&negociacion_oportunidad.order=creado_en.desc&negociacion_oportunidad.limit=1",
  );
}

// Deriva el punto actual: primer hito aplicable, NO ramal y no 'hecho', por orden.
export function puntoActual(hitos: HitoOportunidad[], catalogo: HitoCatalogo[]): HitoCatalogo | null {
  const cat = new Map(catalogo.map((h) => [h.clave, h]));
  const aplic = hitos
    .filter((h) => h.aplicable && !cat.get(h.hito)?.es_ramal)
    .map((h) => ({ h, c: cat.get(h.hito)! }))
    .filter((x) => x.c)
    .sort((a, b) => a.c.orden - b.c.orden);
  const pend = aplic.find((x) => x.h.estado !== "hecho");
  return pend?.c ?? aplic[aplic.length - 1]?.c ?? null;
}

export type ResumenComercial = { admins: number; interacciones: number; oportunidades: number; pendientesVincular: number };

/** Contadores del hub (opcionalmente por comercial). */
export async function resumenComercial(comercialId?: string): Promise<ResumenComercial> {
  const cnt = async (tabla: string, filtro = "") => {
    const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?select=id${filtro}`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Prefer: "count=exact", Range: "0-0" },
      cache: "no-store",
    });
    return Number(r.headers.get("content-range")?.split("/")[1] ?? 0);
  };
  const fc = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const [admins, interacciones, oportunidades, pendientesVincular] = await Promise.all([
    cnt("administraciones_fincas"),
    cnt("interacciones", fc),
    cnt("oportunidades", fc),
    cnt("interacciones", `&pendiente_vincular=eq.true${fc}`),
  ]);
  return { admins, interacciones, oportunidades, pendientesVincular };
}
