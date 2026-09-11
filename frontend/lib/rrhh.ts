// lib/rrhh.ts
//
// Datos del area de RRHH. Solo de servidor, con la clave secreta, como el resto
// de la app. Las tablas son las `rrhh_` (migracion area_rrhh, 11-sep-2026).
//
// QUIEN VE QUE lo deciden las paginas y las acciones, no esta capa:
//   - cada empleado: lo suyo;
//   - funcion RRHH y direccion: todo;
//   - quien asigna trabajo: que alguien no esta, nunca el motivo.
// Aqui solo se lee y se escribe; nadie deberia llamar a estas funciones sin
// haber mirado antes quien pregunta (lib/sesion.ts).

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SECRETO,
      Authorization: `Bearer ${SECRETO}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  const txt = await r.text();
  return (txt ? JSON.parse(txt) : null) as T;
}

const escribir = (path: string, metodo: "POST" | "PATCH", cuerpo: unknown, extra: Record<string, string> = {}) =>
  rest<unknown>(path, { method: metodo, body: JSON.stringify(cuerpo), headers: { Prefer: "return=minimal", ...extra } });

// ---------------------------------------------------------------------------
// Fechas. Todo en dias de calendario (YYYY-MM-DD), a la hora de Madrid.
// ---------------------------------------------------------------------------

export function hoyMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

const aFecha = (s: string) => new Date(s + "T12:00:00Z");
const aTexto = (d: Date) => d.toISOString().slice(0, 10);

export function sumarDias(s: string, n: number): string {
  const d = aFecha(s);
  d.setUTCDate(d.getUTCDate() + n);
  return aTexto(d);
}

export function diasEntre(desde: string, hasta: string): string[] {
  const out: string[] = [];
  for (let d = aFecha(desde); aTexto(d) <= hasta; d.setUTCDate(d.getUTCDate() + 1)) out.push(aTexto(d));
  return out;
}

export const esFinde = (s: string) => {
  const w = aFecha(s).getUTCDay();
  return w === 0 || w === 6;
};

export const lunesDe = (s: string) => sumarDias(s, -((aFecha(s).getUTCDay() + 6) % 7));

// ---------------------------------------------------------------------------
// Calendario de la empresa: festivos, cierres obligatorios y turnos
// ---------------------------------------------------------------------------

export type DiaCalendario = { fecha: string; tipo: "festivo" | "cierre_obligatorio" | "turno"; descripcion: string | null };

export function calendarioEntre(desde: string, hasta: string): Promise<DiaCalendario[]> {
  return rest<DiaCalendario[]>(`rrhh_calendario?select=fecha,tipo,descripcion&fecha=gte.${desde}&fecha=lte.${hasta}&order=fecha.asc`);
}

/** Dias que no se trabajan para nadie: festivos y cierres. Un turno no cuenta: es a elegir. */
export const noLaborables = (cal: DiaCalendario[]) =>
  new Map(cal.filter((c) => c.tipo !== "turno").map((c) => [c.fecha, c.descripcion ?? (c.tipo === "festivo" ? "Festivo" : "Cierre")]));

/** Dias laborables entre dos fechas: sin fines de semana, festivos ni cierres. */
export function laborables(desde: string, hasta: string, fuera: Map<string, string>): number {
  return diasEntre(desde, hasta).filter((d) => !esFinde(d) && !fuera.has(d)).length;
}

// ---------------------------------------------------------------------------
// Personas (las del equipo) y sus funciones con fechas
// ---------------------------------------------------------------------------

export type FuncionAsignada = { funcionId: string; clave: string; nombre: string; desde: string | null; hasta: string | null };
export type Persona = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  activo: boolean;
  funciones: FuncionAsignada[]; // todas, tambien las pasadas: son su historia
};

type FilaPersona = {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  activo: boolean;
  equipo_funciones: { desde: string | null; hasta: string | null; funciones: { id: string; clave: string; nombre: string } | null }[];
};

export const nombreCompleto = (p: { nombre: string; apellidos: string | null }) => {
  // Hay fichas con el apellido metido tambien en el nombre ("Carlos Daza" + "Daza").
  if (p.apellidos && p.nombre.toLowerCase().endsWith(p.apellidos.toLowerCase())) return p.nombre;
  return [p.nombre, p.apellidos].filter(Boolean).join(" ");
};

export const vigenteEn = (f: { desde: string | null; hasta: string | null }, dia: string) =>
  (!f.desde || f.desde <= dia) && (!f.hasta || f.hasta >= dia);

export async function personas(activos: boolean | null = true): Promise<Persona[]> {
  const filtro = activos === null ? "" : `&activo=is.${activos}`;
  const filas = await rest<FilaPersona[]>(
    "equipo?select=id,nombre,apellidos,email,activo,equipo_funciones(desde,hasta,funciones(id,clave,nombre))" +
      `${filtro}&order=nombre.asc`,
  );
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    apellidos: f.apellidos,
    email: f.email,
    activo: f.activo,
    funciones: f.equipo_funciones
      .filter((ef) => ef.funciones)
      .map((ef) => ({ funcionId: ef.funciones!.id, clave: ef.funciones!.clave, nombre: ef.funciones!.nombre, desde: ef.desde, hasta: ef.hasta })),
  }));
}

// ---------------------------------------------------------------------------
// Ausencias
// ---------------------------------------------------------------------------

export type TipoAusencia = "vacaciones" | "permiso_retribuido" | "baja_medica" | "ausencia_justificada" | "otra";
export type EstadoAusencia = "solicitada" | "aprobada" | "rechazada" | "anulada";

export const TIPO_AUSENCIA: Record<TipoAusencia, string> = {
  vacaciones: "Vacaciones",
  permiso_retribuido: "Permiso retribuido",
  baja_medica: "Baja",
  ausencia_justificada: "Ausencia justificada",
  otra: "Otra",
};

export type Ausencia = {
  id: string;
  personaId: string;
  tipo: TipoAusencia;
  desde: string;
  hasta: string;
  dias: number | null;
  estado: EstadoAusencia;
  aCuentaDe: number | null;
  notas: string | null;
  motivoRechazo: string | null;
  creadoEn: string;
};

type FilaAusencia = {
  id: string;
  persona_id: string;
  tipo: TipoAusencia;
  desde: string;
  hasta: string;
  dias: number | null;
  estado: EstadoAusencia;
  a_cuenta_de: number | null;
  notas: string | null;
  motivo_rechazo: string | null;
  creado_en: string;
};

const SEL_AUS = "id,persona_id,tipo,desde,hasta,dias,estado,a_cuenta_de,notas,motivo_rechazo,creado_en";
const comoAusencia = (f: FilaAusencia): Ausencia => ({
  id: f.id,
  personaId: f.persona_id,
  tipo: f.tipo,
  desde: f.desde,
  hasta: f.hasta,
  dias: f.dias == null ? null : Number(f.dias),
  estado: f.estado,
  aCuentaDe: f.a_cuenta_de,
  notas: f.notas,
  motivoRechazo: f.motivo_rechazo,
  creadoEn: f.creado_en,
});

/** Ausencias vivas (pedidas o aprobadas) que pisan un tramo de fechas. */
export async function ausenciasEntre(desde: string, hasta: string): Promise<Ausencia[]> {
  const filas = await rest<FilaAusencia[]>(
    `rrhh_ausencias?select=${SEL_AUS}&estado=in.(solicitada,aprobada)&desde=lte.${hasta}&hasta=gte.${desde}&order=desde.asc`,
  );
  return filas.map(comoAusencia);
}

export async function solicitudesPendientes(): Promise<Ausencia[]> {
  const filas = await rest<FilaAusencia[]>(`rrhh_ausencias?select=${SEL_AUS}&estado=eq.solicitada&order=creado_en.asc`);
  return filas.map(comoAusencia);
}

export async function ausenciasDe(personaId: string): Promise<Ausencia[]> {
  const filas = await rest<FilaAusencia[]>(`rrhh_ausencias?select=${SEL_AUS}&persona_id=eq.${personaId}&order=desde.desc&limit=100`);
  return filas.map(comoAusencia);
}

export async function ausencia(id: string): Promise<Ausencia | null> {
  const [f] = await rest<FilaAusencia[]>(`rrhh_ausencias?select=${SEL_AUS}&id=eq.${id}&limit=1`);
  return f ? comoAusencia(f) : null;
}

export function crearAusencia(a: {
  personaId: string;
  tipo: TipoAusencia;
  desde: string;
  hasta: string;
  dias: number;
  estado: "solicitada" | "aprobada";
  resueltaPor?: string;
  notas?: string | null;
}) {
  return escribir("rrhh_ausencias", "POST", {
    persona_id: a.personaId,
    tipo: a.tipo,
    desde: a.desde,
    hasta: a.hasta,
    dias: a.dias,
    estado: a.estado,
    a_cuenta_de: a.tipo === "vacaciones" ? Number(a.desde.slice(0, 4)) : null,
    resuelta_por: a.estado === "aprobada" ? a.resueltaPor ?? null : null,
    resuelta_en: a.estado === "aprobada" ? new Date().toISOString() : null,
    notas: a.notas ?? null,
  });
}

export function resolverAusencia(id: string, estado: "aprobada" | "rechazada" | "anulada", porId: string | null, motivo?: string | null) {
  return escribir(`rrhh_ausencias?id=eq.${id}`, "PATCH", {
    estado,
    resuelta_por: porId,
    resuelta_en: new Date().toISOString(),
    motivo_rechazo: estado === "rechazada" ? motivo ?? null : null,
  });
}

// ---------------------------------------------------------------------------
// Saldo de vacaciones. Solo se guarda el derecho; lo gastado se calcula.
// ---------------------------------------------------------------------------

export type Saldo = {
  anio: number;
  cargado: boolean; // si RRHH ha puesto los dias de ese año
  derecho: number;
  arrastrados: number;
  total: number;
  cierres: number; // dias de cierre obligatorio: descuentan a todos
  disfrutados: number; // aprobadas (pasadas o futuras)
  pedidos: number; // solicitadas sin resolver
  quedan: number;
};

type FilaSaldo = { persona_id: string; anio: number; dias_derecho: number; dias_arrastrados: number };

/** Saldo del año para varias personas de una vez. */
export async function saldos(anio: number, ids: string[]): Promise<Map<string, Saldo>> {
  if (ids.length === 0) return new Map();
  const lista = ids.join(",");
  const [filas, aus, cal] = await Promise.all([
    rest<FilaSaldo[]>(`rrhh_saldo_vacaciones?select=persona_id,anio,dias_derecho,dias_arrastrados&anio=eq.${anio}&persona_id=in.(${lista})`),
    rest<FilaAusencia[]>(
      `rrhh_ausencias?select=${SEL_AUS}&tipo=eq.vacaciones&a_cuenta_de=eq.${anio}&estado=in.(solicitada,aprobada)&persona_id=in.(${lista})`,
    ),
    calendarioEntre(`${anio}-01-01`, `${anio}-12-31`),
  ]);
  const cierres = cal.filter((c) => c.tipo === "cierre_obligatorio" && !esFinde(c.fecha)).length;
  const out = new Map<string, Saldo>();
  for (const id of ids) {
    const s = filas.find((f) => f.persona_id === id);
    const mias = aus.filter((a) => a.persona_id === id);
    const suma = (estado: EstadoAusencia) => mias.filter((a) => a.estado === estado).reduce((t, a) => t + Number(a.dias ?? 0), 0);
    const derecho = s ? Number(s.dias_derecho) : 0;
    const arrastrados = s ? Number(s.dias_arrastrados) : 0;
    const disfrutados = suma("aprobada");
    const pedidos = suma("solicitada");
    const total = derecho + arrastrados;
    out.set(id, {
      anio,
      cargado: !!s,
      derecho,
      arrastrados,
      total,
      cierres,
      disfrutados,
      pedidos,
      quedan: total - cierres - disfrutados - pedidos,
    });
  }
  return out;
}

export function guardarSaldo(personaId: string, anio: number, derecho: number, arrastrados: number) {
  return escribir(
    "rrhh_saldo_vacaciones?on_conflict=persona_id,anio",
    "POST",
    { persona_id: personaId, anio, dias_derecho: derecho, dias_arrastrados: arrastrados },
    { Prefer: "return=minimal,resolution=merge-duplicates" },
  );
}

// ---------------------------------------------------------------------------
// Quien cubre: al aprobar las vacaciones de alguien que es el unico con una
// funcion, se le da esa funcion a otra persona con las fechas de la ausencia
// (idea de Monica, 11-sep-2026). Direccion no se cubre: son dos.
// ---------------------------------------------------------------------------

export type Cobertura = { funcionId: string; funcion: string; candidatos: { id: string; nombre: string }[] };

/** Funciones que solo tiene esta persona en esas fechas, con quien podria cubrirlas. */
export function funcionesSinSuplente(personaId: string, desde: string, hasta: string, equipo: Persona[]): Cobertura[] {
  const yo = equipo.find((p) => p.id === personaId);
  if (!yo) return [];
  const dias = diasEntre(desde, hasta);
  const mias = yo.funciones.filter((f) => vigenteEn(f, desde) || vigenteEn(f, hasta));
  const out: Cobertura[] = [];
  for (const f of mias) {
    // Hay suplente si otra persona activa la tiene todos esos dias.
    const otros = equipo.filter(
      (p) => p.id !== personaId && p.activo && dias.every((d) => p.funciones.some((g) => g.funcionId === f.funcionId && vigenteEn(g, d))),
    );
    if (otros.length > 0) continue;
    out.push({
      funcionId: f.funcionId,
      funcion: f.nombre,
      candidatos: equipo
        .filter((p) => p.id !== personaId && p.activo && p.email)
        .map((p) => ({ id: p.id, nombre: nombreCompleto(p) })),
    });
  }
  return out;
}

export function darFuncionTemporal(personaId: string, funcionId: string, desde: string, hasta: string) {
  return escribir("equipo_funciones", "POST", { equipo_id: personaId, funcion_id: funcionId, desde, hasta });
}

// ---------------------------------------------------------------------------
// Ficha: datos personales, contrato y horario vigentes
// ---------------------------------------------------------------------------

export type DatosPersonales = { dni: string | null; direccion: string | null; iban: string | null; notas: string | null };
export type Contrato = { id: string; tipo: string | null; categoria: string | null; horasSemana: number | null; desde: string; hasta: string | null };
export type Horario = {
  id: string;
  tipoJornada: string | null;
  lunes: string | null;
  martes: string | null;
  miercoles: string | null;
  jueves: string | null;
  viernes: string | null;
  tiempoComida: string | null;
  horasSemana: number | null;
  desde: string;
  hasta: string | null;
};

export async function datosPersonales(ids: string[]): Promise<Map<string, DatosPersonales>> {
  if (ids.length === 0) return new Map();
  const filas = await rest<(DatosPersonales & { persona_id: string })[]>(
    `rrhh_datos_personales?select=persona_id,dni,direccion,iban,notas&persona_id=in.(${ids.join(",")})`,
  );
  return new Map(filas.map((f) => [f.persona_id, { dni: f.dni, direccion: f.direccion, iban: f.iban, notas: f.notas }]));
}

export function guardarDatosPersonales(personaId: string, d: DatosPersonales) {
  return escribir(
    "rrhh_datos_personales?on_conflict=persona_id",
    "POST",
    { persona_id: personaId, ...d },
    { Prefer: "return=minimal,resolution=merge-duplicates" },
  );
}

type FilaContrato = { id: string; persona_id: string; tipo: string | null; categoria: string | null; horas_semana: number | null; desde: string; hasta: string | null };

/** El contrato vigente hoy de cada persona (el ultimo sin fin, o el que cubre hoy). */
export async function contratosVigentes(ids: string[], hoy: string): Promise<Map<string, Contrato>> {
  if (ids.length === 0) return new Map();
  const filas = await rest<FilaContrato[]>(
    `rrhh_contratos?select=id,persona_id,tipo,categoria,horas_semana,desde,hasta&persona_id=in.(${ids.join(",")})&order=desde.desc`,
  );
  const out = new Map<string, Contrato>();
  for (const f of filas) {
    if (out.has(f.persona_id) || !vigenteEn(f, hoy)) continue;
    out.set(f.persona_id, { id: f.id, tipo: f.tipo, categoria: f.categoria, horasSemana: f.horas_semana == null ? null : Number(f.horas_semana), desde: f.desde, hasta: f.hasta });
  }
  return out;
}

export function guardarContrato(
  personaId: string,
  id: string | null,
  c: { tipo: string | null; categoria: string | null; horasSemana: number | null; desde: string },
) {
  const cuerpo = { tipo: c.tipo, categoria: c.categoria, horas_semana: c.horasSemana, desde: c.desde };
  return id
    ? escribir(`rrhh_contratos?id=eq.${id}&persona_id=eq.${personaId}`, "PATCH", cuerpo)
    : escribir("rrhh_contratos", "POST", { persona_id: personaId, ...cuerpo });
}

type FilaHorario = {
  id: string;
  persona_id: string;
  tipo_jornada: string | null;
  lunes: string | null;
  martes: string | null;
  miercoles: string | null;
  jueves: string | null;
  viernes: string | null;
  tiempo_comida: string | null;
  horas_semana: number | null;
  desde: string;
  hasta: string | null;
};

export async function horarioVigente(personaId: string, hoy: string): Promise<Horario | null> {
  const filas = await rest<FilaHorario[]>(
    `rrhh_horarios?select=id,persona_id,tipo_jornada,lunes,martes,miercoles,jueves,viernes,tiempo_comida,horas_semana,desde,hasta` +
      `&persona_id=eq.${personaId}&order=desde.desc`,
  );
  const f = filas.find((x) => vigenteEn(x, hoy));
  if (!f) return null;
  return {
    id: f.id,
    tipoJornada: f.tipo_jornada,
    lunes: f.lunes,
    martes: f.martes,
    miercoles: f.miercoles,
    jueves: f.jueves,
    viernes: f.viernes,
    tiempoComida: f.tiempo_comida,
    horasSemana: f.horas_semana == null ? null : Number(f.horas_semana),
    desde: f.desde,
    hasta: f.hasta,
  };
}

export function guardarHorario(
  personaId: string,
  id: string | null,
  h: Omit<Horario, "id" | "hasta">,
) {
  const cuerpo = {
    tipo_jornada: h.tipoJornada,
    lunes: h.lunes,
    martes: h.martes,
    miercoles: h.miercoles,
    jueves: h.jueves,
    viernes: h.viernes,
    tiempo_comida: h.tiempoComida,
    horas_semana: h.horasSemana,
    desde: h.desde,
  };
  return id
    ? escribir(`rrhh_horarios?id=eq.${id}&persona_id=eq.${personaId}`, "PATCH", cuerpo)
    : escribir("rrhh_horarios", "POST", { persona_id: personaId, ...cuerpo });
}

// ---------------------------------------------------------------------------
// Salario bruto anual. SOLO direccion (Monica, 11-sep-2026: para costes y KPIs).
// ---------------------------------------------------------------------------

export type Salario = { id: string; personaId: string; brutoAnual: number; netoMensual: number | null; desde: string; hasta: string | null };

type FilaSalario = { id: string; persona_id: string; bruto_anual: number; neto_mensual: number | null; desde: string; hasta: string | null };
const comoSalario = (f: FilaSalario): Salario => ({
  id: f.id,
  personaId: f.persona_id,
  brutoAnual: Number(f.bruto_anual),
  netoMensual: f.neto_mensual == null ? null : Number(f.neto_mensual),
  desde: f.desde,
  hasta: f.hasta,
});

/** El sueldo vigente hoy de cada persona. */
export async function salariosVigentes(ids: string[], hoy: string): Promise<Map<string, Salario>> {
  if (ids.length === 0) return new Map();
  const filas = await rest<FilaSalario[]>(
    `rrhh_salarios?select=id,persona_id,bruto_anual,neto_mensual,desde,hasta&persona_id=in.(${ids.join(",")})&order=desde.desc`,
  );
  const out = new Map<string, Salario>();
  for (const f of filas) if (!out.has(f.persona_id) && vigenteEn(f, hoy)) out.set(f.persona_id, comoSalario(f));
  return out;
}

/** Un sueldo nuevo cierra el anterior el dia antes: asi queda la historia para los costes. */
export async function guardarSalario(personaId: string, brutoAnual: number, netoMensual: number | null, desde: string, hoy: string) {
  const actual = (await salariosVigentes([personaId], hoy)).get(personaId);
  if (actual && actual.desde === desde) {
    return escribir(`rrhh_salarios?id=eq.${actual.id}`, "PATCH", { bruto_anual: brutoAnual, neto_mensual: netoMensual });
  }
  if (actual && actual.desde < desde) {
    await escribir(`rrhh_salarios?id=eq.${actual.id}`, "PATCH", { hasta: sumarDias(desde, -1) });
  }
  return escribir("rrhh_salarios", "POST", { persona_id: personaId, bruto_anual: brutoAnual, neto_mensual: netoMensual, desde });
}

/** Documentos de la persona que hay en el archivo, por tipo (para saber que falta). */
export async function tiposDeDocumento(ids: string[]): Promise<Map<string, Set<string>>> {
  if (ids.length === 0) return new Map();
  const filas = await rest<{ persona_id: string; tipo: string }[]>(
    `rrhh_documentos?select=persona_id,tipo&persona_id=in.(${ids.join(",")})`,
  );
  const out = new Map<string, Set<string>>();
  for (const f of filas) {
    if (!out.has(f.persona_id)) out.set(f.persona_id, new Set());
    out.get(f.persona_id)!.add(f.tipo);
  }
  return out;
}
