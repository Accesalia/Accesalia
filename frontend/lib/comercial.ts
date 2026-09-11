// lib/comercial.ts
//
// Acceso a datos del area COMERCIAL (CRM), solo de servidor. La cartera gira
// sobre la ADMINISTRACION de fincas (unidad principal); las personas cuelgan de
// ella. Mismo patron que lib/datos.ts: REST con la clave SECRETA (service role).
//
// El modelo de debajo cambio al retirar el modelo viejo, y este fichero se
// reescribio para seguirlo. Devuelve las MISMAS formas que antes, a proposito:
// asi las pantallas no se enteran del cambio.
//
//     administraciones_fincas  ->  empresa
//     administradores          ->  puesto + persona
//     contactos                ->  empresa_departamento + correo
//     email (era una columna)  ->  correo
//     administrador_id         ->  puesto_id
//
// Por que persona y puesto van separados: la persona es quien es (constante) y
// el puesto es su trabajo en esa casa (vivo). Antes iban juntos, asi que cuando
// alguien cambiaba de administracion se perdia el rastro de lo hablado con ella.
//
// Ojo con una cosa: lo que las pantallas llaman "administrador" es un PUESTO, y
// su id es el id del puesto. No es casualidad: es el mismo id que guardan
// interacciones.puesto_id y oportunidades.puesto_id, asi que los enlaces de las
// conversaciones siguen funcionando sin traducir nada.

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

// Sin decidir todavia. No es un estado mas: es la ausencia de decision, y se
// pinta distinto para que se note que falta, no para disimularlo.
export const SIN_ESTADO = { label: "Sin definir", clase: "bg-black/5 text-carbon/35" };

/** Como se pinta un estado, incluido el caso de que no lo haya. */
export function estadoDe(estado: EstadoAdministracion | null): { label: string; clase: string } {
  return estado ? ESTADOS[estado] : SIN_ESTADO;
}

// ---- Tipos ----

export type Comercial = { id: string; nombre: string; apellidos: string | null };

// Una administracion de fincas. Debajo es una fila de empresa; el estado y las
// fechas del ciclo comercial estan vacios de momento, que es la verdad: hasta
// ahora no habia donde guardarlos.
export type AdministracionFincas = {
  id: string;
  nombre: string;
  nombre_legal: string | null;
  cif: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  municipio: string | null;
  notas: string | null;
  activo: boolean;
  // El titular ya no es una columna de la casa: es el puesto cuyo cargo dice
  // "titular". Se sigue asomando aqui como un id porque para las pantallas es
  // lo mismo de antes, y el id que se guarda es el del puesto.
  titular_id: string | null;
  estado: EstadoAdministracion | null;
  fecha_paso_a_cliente: string | null;
  motivo_fin: string | null;
  fecha_fin: string | null;
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
  comunidades: { count: number }[];
};

// Una persona EN una casa. El id es el del puesto, ver la nota de cabecera.
export type Administrador = {
  id: string;
  nombre: string;
  empresa: string | null;
  cargo: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  empresa_id: string | null;
  activo: boolean;
  comunidades: number;
};

// Un contacto por asunto: "contabilidad", "incidencias"... Debajo es un
// departamento de la empresa con su correo. Util en administraciones grandes,
// donde no escribes a una persona sino a un buzon.
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

// ---- Traduccion del modelo nuevo a las formas de siempre ----
//
// Todo lo que llega de Supabase pasa por aqui. Es el unico sitio del fichero
// que sabe como se llaman de verdad las columnas.

type CorreoFila = { email: string; principal: boolean };

/** El correo bueno de una lista: el marcado principal, y si no, el primero. */
function correoDe(correos: CorreoFila[] | null | undefined): string | null {
  if (!correos || !correos.length) return null;
  return (correos.find((c) => c.principal) ?? correos[0]).email;
}

type EmpresaFila = {
  id: string;
  nombre_accesalia: string;
  nombre_legal: string | null;
  cif: string | null;
  telefono: string | null;
  direccion: string | null;
  municipio: string | null;
  notas: string | null;
  activa: boolean;
  estado: EstadoAdministracion | null;
  fecha_paso_a_cliente: string | null;
  motivo_fin: string | null;
  fecha_fin: string | null;
  comercial_id: string | null;
  comercial_captador_id: string | null;
  fecha_alta_cartera: string | null;
  fecha_ultimo_contacto: string | null;
  fecha_ultimo_encargo: string | null;
  correo?: CorreoFila[];
};

function comoAdministracion(e: EmpresaFila, titularId: string | null = null): AdministracionFincas {
  return {
    id: e.id,
    nombre: e.nombre_accesalia,
    nombre_legal: e.nombre_legal,
    cif: e.cif,
    telefono: e.telefono,
    email: correoDe(e.correo),
    direccion: e.direccion,
    municipio: e.municipio,
    notas: e.notas,
    activo: e.activa,
    titular_id: titularId,
    estado: e.estado,
    fecha_paso_a_cliente: e.fecha_paso_a_cliente,
    motivo_fin: e.motivo_fin,
    fecha_fin: e.fecha_fin,
    comercial_id: e.comercial_id,
    comercial_captador_id: e.comercial_captador_id,
    fecha_alta_cartera: e.fecha_alta_cartera,
    fecha_ultimo_contacto: e.fecha_ultimo_contacto,
    fecha_ultimo_encargo: e.fecha_ultimo_encargo,
  };
}

type PuestoFila = {
  comunidades?: { count: number }[];
  id: string;
  empresa_id: string | null;
  cargo: string | null;
  telefono_empresa: string | null;
  telefono_personal: string | null;
  notas: string | null;
  persona: { nombre: string; activa: boolean } | null;
  empresa: { nombre_accesalia: string } | null;
  correo?: CorreoFila[];
};

function comoAdministrador(p: PuestoFila): Administrador {
  return {
    id: p.id,
    nombre: p.persona?.nombre ?? "(sin nombre)",
    empresa: p.empresa?.nombre_accesalia ?? null,
    cargo: p.cargo,
    // el de la oficina primero: es el que se marca para hablar de trabajo
    telefono: p.telefono_empresa ?? p.telefono_personal,
    email: correoDe(p.correo),
    notas: p.notas,
    empresa_id: p.empresa_id,
    activo: p.persona?.activa ?? true,
    comunidades: p.comunidades?.[0]?.count ?? 0,
  };
}

// Lo minimo de un puesto cuando solo hace falta decir de quien se habla.
type PuestoAsomado = {
  persona: { nombre: string } | null;
  empresa: { nombre_accesalia: string } | null;
} | null;

function quienEs(p: PuestoAsomado): { nombre: string; empresa: string | null } | null {
  if (!p) return null;
  return { nombre: p.persona?.nombre ?? "(sin nombre)", empresa: p.empresa?.nombre_accesalia ?? null };
}

// comerciales cuelga de empresa por dos sitios (quien la lleva y quien la
// trajo), asi que hay que decirle a PostgREST por cual entrar.
const SEL_EMPRESA =
  "id,nombre_accesalia,nombre_legal,cif,telefono,direccion,municipio,notas,activa,estado," +
  "fecha_paso_a_cliente,motivo_fin,fecha_fin,comercial_id,comercial_captador_id," +
  "fecha_alta_cartera,fecha_ultimo_contacto,fecha_ultimo_encargo," +
  "correo!correo_empresa_id_fkey(email,principal)";

const SEL_PUESTO =
  "id,empresa_id,cargo,telefono_empresa,telefono_personal,notas," +
  "persona:persona_id(nombre,activa),empresa:empresa_id(nombre_accesalia)," +
  "correo!correo_puesto_id_fkey(email,principal)," +
  // Cuantas comunidades lleva esta persona. Es el "a quien pregunto" de Monica,
  // y en la ficha va junto a su nombre: sin eso la lista de gente no dice nada.
  "comunidades:comunidad_admin_responsable(count)";

// ---- Consultas ----

/** El puesto que manda en una casa: el que lleva el cargo "titular". */
function puestoTitular(empresaId: string) {
  return rest<{ id: string; persona: { nombre: string } | null }[]>(
    `puesto?select=id,persona:persona_id(nombre)&empresa_id=eq.${empresaId}&cargo=eq.titular&limit=1`,
  );
}

/** Cartera: las administraciones con comercial dueno y nº de personas. Con
 *  comercialId, solo las suyas ("Mis administradores" del area comercial). */
export async function listarCartera(comercialId?: string): Promise<AdministracionCartera[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const filas = await rest<(EmpresaFila & {
    comercial: { nombre: string; apellidos: string | null } | null;
    personas: { count: number }[];
    comunidades: { count: number }[];
  })[]>(
    `empresa?select=${SEL_EMPRESA},` +
      "comercial:comerciales!empresa_comercial_id_fkey(nombre,apellidos)," +
      "personas:puesto(count)," +
      // Las comunidades que lleva hoy: es la cifra que dice de un vistazo si una
      // administracion es grande o testimonial, y la que Monica quiso en el listado.
      `comunidades:comunidad_admin_responsable(count)${f}&order=nombre_accesalia.asc`,
  );
  return filas.map((f) => ({
    ...comoAdministracion(f),
    comercial: f.comercial,
    personas: f.personas ?? [],
    comunidades: f.comunidades ?? [],
  }));
}

/** Cuantas comunidades lleva hoy, para el listado. */
export function nComunidades(a: { comunidades?: { count: number }[] }): number {
  return a.comunidades?.[0]?.count ?? 0;
}

// Las personas de todas las administraciones, con su puesto vigente. Alimenta la
// pestaña "Personas" del listado: hasta ahora no habia forma de buscar a alguien
// sin saber antes por que administracion entrar.
export type PersonaCartera = {
  id: string;
  nombre: string;
  cargo: string | null;
  empresaId: string | null;
  empresa: string | null;
  comunidades: number;
  email: string | null;
  telefono: string | null;
};

export async function listarPersonasAdmin(): Promise<PersonaCartera[]> {
  const filas = await rest<{
    id: string;
    cargo: string | null;
    telefono_empresa: string | null;
    telefono_personal: string | null;
    persona: { id: string; nombre: string } | null;
    empresa: { id: string; nombre_accesalia: string } | null;
    correo: { email: string; principal: boolean }[];
    comunidades: { count: number }[];
  }[]>(
    "puesto?select=id,cargo,telefono_empresa,telefono_personal," +
      "persona(id,nombre),empresa(id,nombre_accesalia)," +
      "correo!correo_puesto_id_fkey(email,principal)," +
      "comunidades:comunidad_admin_responsable(count)&hasta=is.null&order=cargo.asc",
  );
  return filas
    .filter((f) => f.persona)
    .map((f) => ({
      id: f.id,
      nombre: f.persona!.nombre,
      cargo: f.cargo,
      empresaId: f.empresa?.id ?? null,
      empresa: f.empresa?.nombre_accesalia ?? null,
      comunidades: f.comunidades?.[0]?.count ?? 0,
      email: (f.correo?.find((c) => c.principal) ?? f.correo?.[0])?.email ?? null,
      telefono: f.telefono_empresa ?? f.telefono_personal ?? null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Ficha completa de una administracion. */
export async function administracionPorId(id: string): Promise<AdministracionFicha | null> {
  const filas = await rest<EmpresaFila[]>(`empresa?select=${SEL_EMPRESA}&id=eq.${id}&limit=1`);
  if (!filas[0]) return null;
  const empresa = filas[0];

  const [comerciales, titulares, puestos, departamentos, origen] = await Promise.all([
    empresa.comercial_id
      ? rest<Comercial[]>(
          `comerciales?select=id,nombre,apellidos&id=eq.${empresa.comercial_id}&limit=1`,
        )
      : Promise.resolve([] as Comercial[]),
    puestoTitular(id),
    rest<PuestoFila[]>(`puesto?select=${SEL_PUESTO}&empresa_id=eq.${id}`),
    rest<{ id: string; departamento: string; telefono: string | null; notas: string | null;
           correo?: CorreoFila[] }[]>(
      "empresa_departamento?select=id,departamento,telefono,notas," +
        `correo!correo_departamento_id_fkey(email,principal)&empresa_id=eq.${id}` +
        "&order=departamento.asc",
    ),
    rest<Origen[]>(
      "administracion_origen?select=id,tipo_origen,referente_externo,condiciona_oferta,notas" +
        `&empresa_id=eq.${id}&order=creado_en.asc`,
    ),
  ]);

  const titular = titulares[0]
    ? { id: titulares[0].id, nombre: titulares[0].persona?.nombre ?? "(sin nombre)" }
    : null;

  return {
    administracion: comoAdministracion(empresa, titular?.id ?? null),
    comercial: comerciales[0] ?? null,
    titular,
    // se ordena aqui y no en la consulta: el nombre vive en la tabla de al lado
    personas: puestos.map(comoAdministrador).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    contactos: departamentos.map((d) => ({
      id: d.id,
      proposito: d.departamento,
      nombre: null,
      telefono: d.telefono,
      email: correoDe(d.correo),
      notas: d.notas,
      persona_id: null,
    })),
    origen,
  };
}

/** Administracion en crudo (para el formulario de edicion). */
export async function administracionCruda(id: string): Promise<AdministracionFincas | null> {
  const [filas, titulares] = await Promise.all([
    rest<EmpresaFila[]>(`empresa?select=${SEL_EMPRESA}&id=eq.${id}&limit=1`),
    puestoTitular(id),
  ]);
  return filas[0] ? comoAdministracion(filas[0], titulares[0]?.id ?? null) : null;
}

/** Una persona (para su ficha o edicion), con su administracion. */
export async function administradorPorId(
  id: string,
): Promise<{ admin: Administrador; administracion: { id: string; nombre: string } | null } | null> {
  const filas = await rest<(PuestoFila & { empresa: { id: string; nombre_accesalia: string } | null })[]>(
    `puesto?select=id,empresa_id,cargo,telefono_empresa,telefono_personal,notas,` +
      "persona:persona_id(nombre,activa),empresa:empresa_id(id,nombre_accesalia)," +
      `correo!correo_puesto_id_fkey(email,principal)&id=eq.${id}&limit=1`,
  );
  const fila = filas[0];
  if (!fila) return null;
  return {
    admin: comoAdministrador(fila),
    administracion: fila.empresa
      ? { id: fila.empresa.id, nombre: fila.empresa.nombre_accesalia }
      : null,
  };
}

// Alguien que ya esta dado de alta, para engancharlo en vez de volver a crearlo.
export type PersonaExistente = { id: string; nombre: string; donde: string };

/** Todas las personas de la app, con donde trabajan, para elegir de una lista.
 *
 *  Existe para no duplicar seres humanos: una gestora de Del Brio lleva quince
 *  comunidades, y si cada alta creara una persona nueva tendriamos quince
 *  Marias distintas. Devuelve el id de la PERSONA, no el del puesto: el puesto
 *  es lo que se crea despues, al engancharla a una casa. */
export async function personasParaElegir(): Promise<PersonaExistente[]> {
  const filas = await rest<{
    id: string; nombre: string;
    puesto: { empresa: { nombre_accesalia: string } | null }[];
  }[]>(
    "persona?select=id,nombre,puesto(empresa:empresa_id(nombre_accesalia))" +
      "&activa=is.true&order=nombre.asc&limit=2000",
  );
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    donde: (f.puesto ?? [])
      .map((p) => p.empresa?.nombre_accesalia)
      .filter(Boolean)
      .join(" · "),
  }));
}

// ---- Lo que necesita el buscador de personas ----
//
// Se manda entero al navegador (unos cientos de filas) y alli se filtra segun
// escribes. Es lo que permite que la lista responda al instante en vez de ir y
// volver al servidor en cada tecla.

export type PuestoElegible = {
  id: string;              // id del PUESTO: es lo que guardan comunidades e interacciones
  persona: string;
  empresa: string | null;  // vacio = todavia no se sabe de que casa es
  empresaId: string | null;
};

/** Todas las personas asignables, con la casa donde trabajan.
 *
 *  Existe para no duplicar seres humanos: una gestora de Del Brio lleva quince
 *  comunidades, y si cada asignacion creara una persona nueva tendriamos quince
 *  Marias con el rastro repartido. Primero se busca aqui; crear es el ultimo
 *  recurso. */
export async function puestosParaElegir(): Promise<PuestoElegible[]> {
  const filas = await rest<{
    id: string; empresa_id: string | null;
    persona: { nombre: string; activa: boolean } | null;
    empresa: { nombre_accesalia: string } | null;
  }[]>(
    "puesto?select=id,empresa_id,persona:persona_id(nombre,activa)," +
      "empresa:empresa_id(nombre_accesalia)&limit=3000",
  );
  return filas
    .filter((f) => f.persona?.activa !== false)
    .map((f) => ({
      id: f.id,
      persona: f.persona?.nombre ?? "(sin nombre)",
      empresa: f.empresa?.nombre_accesalia ?? null,
      empresaId: f.empresa_id,
    }))
    .sort((a, b) => a.persona.localeCompare(b.persona, "es"));
}

/** Las administraciones, para el buscador por empresa. */
export async function empresasParaElegir(): Promise<{ id: string; nombre: string }[]> {
  const filas = await rest<{ id: string; nombre_accesalia: string }[]>(
    "empresa?select=id,nombre_accesalia&activa=is.true&order=nombre_accesalia.asc&limit=2000",
  );
  return filas.map((f) => ({ id: f.id, nombre: f.nombre_accesalia }));
}

export async function listarComerciales(): Promise<Comercial[]> {
  return rest<Comercial[]>(
    "comerciales?select=id,nombre,apellidos&activo=eq.true&order=nombre.asc",
  );
}

export async function listarAdministraciones(): Promise<{ id: string; nombre: string }[]> {
  const filas = await rest<{ id: string; nombre_accesalia: string }[]>(
    "empresa?select=id,nombre_accesalia&activa=eq.true&order=nombre_accesalia.asc",
  );
  return filas.map((f) => ({ id: f.id, nombre: f.nombre_accesalia }));
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
  // con quien se hablo. Se llamaba "administradores" cuando era una fila de
  // aquella tabla; ahora es la persona, y el nombre lo dice.
  persona: { nombre: string; empresa: string | null } | null;
  comerciales: { nombre: string } | null;
};

const SEL_INT =
  "id,fecha_evento,creado_en,origen,tipo_evento,transcripcion,pendiente_vincular,requiere_humano," +
  "puesto:puesto_id(persona:persona_id(nombre),empresa:empresa_id(nombre_accesalia))," +
  "comerciales:comercial_id(nombre)";

type InteraccionCruda = Omit<Interaccion, "persona"> & { puesto: PuestoAsomado };

/** Las interacciones con el nombre de la persona ya resuelto. */
function comoInteracciones(filas: InteraccionCruda[]): Interaccion[] {
  return filas.map(({ puesto, ...i }) => ({ ...i, persona: quienEs(puesto) }));
}

/** Personas administradoras (el sujeto de una interaccion; FK puesto_id). */
export async function listarAdministradoresPersonas(): Promise<
  { id: string; nombre: string; empresa: string | null }[]
> {
  const filas = await rest<{ id: string; persona: { nombre: string; activa: boolean } | null;
                             empresa: { nombre_accesalia: string } | null }[]>(
    "puesto?select=id,persona:persona_id(nombre,activa),empresa:empresa_id(nombre_accesalia)" +
      "&limit=2000",
  );
  return filas
    .filter((f) => f.persona?.activa !== false)
    .map((f) => ({
      id: f.id,
      nombre: f.persona?.nombre ?? "(sin nombre)",
      empresa: f.empresa?.nombre_accesalia ?? null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Interacciones recientes (opcionalmente de un comercial), para el diario del hub. */
export async function interaccionesRecientes(comercialId?: string, limite = 25): Promise<Interaccion[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  return comoInteracciones(
    await rest<InteraccionCruda[]>(
      `interacciones?select=${SEL_INT}${f}&order=creado_en.desc&limit=${limite}`,
    ),
  );
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
  puesto_id: string | null;
  administrador: { puestoId: string; nombre: string; empresa: string | null; empresaId: string | null } | null;
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
  type Cruda = Omit<InteraccionRevision, "administrador" | "puesto_id"> & {
    puesto_id: string | null;
    puesto: (PuestoAsomado & { id: string; empresa_id: string | null }) | null;
  };
  const filas = await rest<Cruda[]>(
    "interacciones?select=id,transcripcion,origen,tipo_evento,fecha_evento,creado_en,extraccion," +
      "extraccion_estado,requiere_humano,motivo_requiere_humano,comercial_id,puesto_id," +
      "puesto:puesto_id(id,empresa_id,persona:persona_id(nombre),empresa:empresa_id(nombre_accesalia))," +
      `comercial:comercial_id(nombre,apellidos)&id=eq.${id}&limit=1`,
  );
  const cruda = filas[0];
  if (!cruda) return null;

  const { puesto, puesto_id, ...resto } = cruda;
  const interaccion: InteraccionRevision = {
    ...resto,
    puesto_id,
    administrador: puesto
      ? {
          puestoId: puesto.id,
          nombre: puesto.persona?.nombre ?? "(sin nombre)",
          empresa: puesto.empresa?.nombre_accesalia ?? null,
          empresaId: puesto.empresa_id,
        }
      : null,
  };

  const [eventos, comunidades] = await Promise.all([
    rest<EventoBitacora[]>(
      `bitacora_ia?select=id,tipo,target_tabla,target_id,datos,deshecho,creado_en,actor_tipo&operacion=eq.comercial:${id}&order=creado_en.asc`,
    ),
    // que comunidades lleva su casa: ya no es una columna de comunidades, es la
    // tabla que dice quien administra que, y solo cuenta lo vigente
    interaccion.administrador?.empresaId
      ? rest<{ comunidades: { id: string; nombre: string; direccion: string | null } | null }[]>(
          "comunidad_admin_responsable?select=comunidades(id,nombre,direccion)" +
            `&empresa_id=eq.${interaccion.administrador.empresaId}` +
            "&vigente=is.true&limit=300",
        )
      : Promise.resolve([] as { comunidades: { id: string; nombre: string; direccion: string | null } | null }[]),
  ]);

  const comunidadesDelAdmin = comunidades
    .map((c) => c.comunidades)
    .filter((c): c is { id: string; nombre: string; direccion: string | null } => !!c)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

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
    "resumenes_ia?select=fase,texto,actualizado_en&ambito=eq.administrador" +
      `&puesto_id=eq.${administradorId}&fase=eq.comercial&limit=1`,
  );
  return filas[0] ?? null;
}

/** Diario con un administrador-persona: sus interacciones, recientes primero. */
export async function interaccionesDeAdministrador(
  administradorId: string,
  limite = 25,
): Promise<Interaccion[]> {
  return comoInteracciones(
    await rest<InteraccionCruda[]>(
      `interacciones?select=${SEL_INT}&puesto_id=eq.${administradorId}&order=creado_en.desc&limit=${limite}`,
    ),
  );
}

/** Conversaciones que MENCIONAN una comunidad (vía el puente interaccion_comunidad).
 *  El texto crudo vive una vez en interacciones; aquí solo se asoma por el puntero. */
export async function interaccionesDeComunidad(comunidadId: string, limite = 25): Promise<Interaccion[]> {
  return comoInteracciones(
    await rest<InteraccionCruda[]>(
      `interacciones?select=${SEL_INT},interaccion_comunidad!inner(comunidad_id)` +
        `&interaccion_comunidad.comunidad_id=eq.${comunidadId}&order=creado_en.desc&limit=${limite}`,
    ),
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
  "comunidad:comunidad_id(id,nombre,direccion)," +
  "puesto:puesto_id(persona:persona_id(nombre),empresa:empresa_id(nombre_accesalia))," +
  "comercial:comercial_id(nombre)," +
  "hitos_oportunidad(id,hito,aplicable,estado,fecha,enlace_url,responsable_id)," +
  "negociacion_oportunidad(que_vendemos,precio,alcance,creado_en)";

/** Oportunidades EN MARCHA (activas) con sus hitos y la oferta vigente. */
export async function oportunidadesEnMarcha(comercialId?: string): Promise<OportunidadEnMarcha[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const filas = await rest<(Omit<OportunidadEnMarcha, "administrador"> & { puesto: PuestoAsomado })[]>(
    `oportunidades?select=${SEL_OPORTUNIDAD}&estado=eq.activa${f}&order=creado_en.desc&limit=200` +
      "&negociacion_oportunidad.order=creado_en.desc&negociacion_oportunidad.limit=1",
  );
  return filas.map(({ puesto, ...o }) => ({ ...o, administrador: quienEs(puesto) }));
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
    cnt("empresa"),
    cnt("interacciones", fc),
    cnt("oportunidades", fc),
    cnt("interacciones", `&pendiente_vincular=eq.true${fc}`),
  ]);
  return { admins, interacciones, oportunidades, pendientesVincular };
}

// ---------------------------------------------------------------------------
// Lo que se ve en la ficha de una administracion, repasado con Monica el
// 10-sep-2026. El orden de la pantalla lo puso ella, y no por importancia sino
// por frecuencia de uso: "si entro a la ficha de una administracion de fincas
// es justo porque busco algo de ellos, sobre todo su contacto".
// ---------------------------------------------------------------------------

/** Una comunidad suya y en que anda. Alimenta "Lo que tenemos abierto". */
export type ComunidadDeAdmin = {
  comunidad: string;
  municipio: string | null;
  tipo: string | null;
  estadoProyecto: string | null;
  estadoObra: string | null;
  quien: string | null;
};

export async function comunidadesDeAdministracion(empresaId: string): Promise<ComunidadDeAdmin[]> {
  const filas = await rest<{
    comunidad: {
      nombre: string;
      municipio: string | null;
      proyectos: { tipo: string | null; estado: string | null; obras: { estado: string | null }[] }[];
    } | null;
    puesto: { persona: { nombre: string } | null } | null;
  }[]>(
    "comunidad_admin_responsable?select=" +
      "comunidad:comunidades(nombre,municipio,proyectos(tipo,estado,obras(estado)))," +
      "puesto(persona(nombre))" +
      `&empresa_id=eq.${empresaId}&vigente=is.true`,
  );

  const salida: ComunidadDeAdmin[] = [];
  for (const f of filas) {
    if (!f.comunidad) continue;
    const quien = f.puesto?.persona?.nombre ?? null;
    const base = { comunidad: f.comunidad.nombre, municipio: f.comunidad.municipio, quien };
    if (!f.comunidad.proyectos?.length) {
      salida.push({ ...base, tipo: null, estadoProyecto: null, estadoObra: null });
      continue;
    }
    for (const p of f.comunidad.proyectos) {
      salida.push({ ...base, tipo: p.tipo, estadoProyecto: p.estado, estadoObra: p.obras?.[0]?.estado ?? null });
    }
  }
  // Primero lo vivo: obra en marcha, luego sin empezar, luego el resto.
  const peso = (c: ComunidadDeAdmin) =>
    c.estadoObra === "en_curso" ? 0 : c.estadoObra === "pendiente_inicio" ? 1 : c.estadoObra === "finalizada" ? 3 : 2;
  return salida.sort((a, b) => peso(a) - peso(b) || a.comunidad.localeCompare(b.comunidad, "es"));
}

/** Lo pactado con ellos: comisiones. */
export type AcuerdoComision = {
  id: string;
  base: string | null;
  importe: number | null;
  porcentaje: number | null;
  pagador: string | null;
  vigente: boolean;
  notas: string | null;
  tienePersona: boolean;
};

export async function acuerdosDeAdministracion(empresaId: string): Promise<AcuerdoComision[]> {
  const filas = await rest<{
    id: string; base_calculo: string | null; importe: number | null; porcentaje: number | null;
    pagador: string | null; vigente: boolean; notas: string | null; puesto_id: string | null;
  }[]>(
    "acuerdos_comision?select=id,base_calculo,importe,porcentaje,pagador,vigente,notas,puesto_id" +
      `&empresa_id=eq.${empresaId}&order=pagador.asc`,
  );
  return filas.map((f) => ({
    id: f.id, base: f.base_calculo, importe: f.importe, porcentaje: f.porcentaje,
    pagador: f.pagador, vigente: f.vigente, notas: f.notas, tienePersona: f.puesto_id !== null,
  }));
}

/** El diario: notas apiladas de la administracion y de su gente. */
export type NotaAdmin = {
  id: string;
  texto: string;
  autor: string | null;
  origen: string;
  creadoEn: string;
  // Cuando se corrigio, si se corrigio. Se ensena junto a la entrada: una nota
  // retocada no vale lo mismo que una escrita en caliente, y quien la lee
  // despues tiene derecho a saberlo.
  editadoEn: string | null;
  sobre: string | null;
};

export async function notasDeAdministracion(empresaId: string, puestoIds: string[]): Promise<NotaAdmin[]> {
  const trozos = [`empresa_id.eq.${empresaId}`];
  if (puestoIds.length) trozos.push(`puesto_id.in.(${puestoIds.join(",")})`);
  const filas = await rest<{
    id: string; texto: string; autor: string | null; origen: string;
    creado_en: string; actualizado_en: string;
    puesto: { persona: { nombre: string } | null } | null;
  }[]>(
    "notas_administracion_fincas?select=id,texto,autor,origen,creado_en,actualizado_en,puesto(persona(nombre))" +
      `&or=(${trozos.join(",")})&order=creado_en.desc`,
  );
  return filas.map((f) => ({
    id: f.id, texto: f.texto, autor: f.autor, origen: f.origen, creadoEn: f.creado_en,
    // Un par de segundos de margen: el trigger toca actualizado_en al insertar.
    editadoEn:
      new Date(f.actualizado_en).getTime() - new Date(f.creado_en).getTime() > 3000
        ? f.actualizado_en
        : null,
    sobre: f.puesto?.persona?.nombre ?? null,
  }));
}

/**
 * Indice minimo para el buscador de la ficha: solo id y nombre.
 *
 * Monica: "la barra de busqueda debe estar tambien en la pagina de empresas,
 * para poder buscar otra sin salir de aqui". Dos campos por fila, para que
 * cargarlo no cueste nada.
 */
export type EntradaIndice = { id: string; nombre: string; sub: string | null; tipo: "adm" | "per" };

export async function indiceMaestros(): Promise<EntradaIndice[]> {
  const [empresas, puestos] = await Promise.all([
    rest<{ id: string; nombre_accesalia: string; municipio: string | null }[]>(
      "empresa?select=id,nombre_accesalia,municipio&order=nombre_accesalia.asc",
    ),
    rest<{ id: string; cargo: string | null; persona: { nombre: string } | null; empresa: { nombre_accesalia: string } | null }[]>(
      "puesto?select=id,cargo,persona(nombre),empresa(nombre_accesalia)&hasta=is.null",
    ),
  ]);
  return [
    ...empresas.map((e) => ({
      id: e.id, nombre: e.nombre_accesalia, sub: e.municipio, tipo: "adm" as const,
    })),
    ...puestos
      .filter((p) => p.persona)
      .map((p) => ({
        id: p.id,
        nombre: p.persona!.nombre,
        sub: p.empresa?.nombre_accesalia ?? p.cargo,
        tipo: "per" as const,
      })),
  ];
}
