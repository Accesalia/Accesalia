// lib/licencia.ts
//
// Acceso a datos de la fase LICENCIA (capa 1: ficha de tramitacion). Mismo patron
// que lib/visado.ts. La via (entidad/modalidad) vive en el proyecto. Los
// requerimientos son el punto critico pero se sistematizan en su propio sprint.

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

// ---- Tipos ----

export type Licencia = {
  id: string;
  proyecto_id: string;
  estado: string;
  tipo_tramite: string | null;
  tramitada_por: string; // nosotros | ellos
  organismo: string | null;
  tecnico_ayto: string | null;
  fecha_registro_ayto: string | null;
  fecha_aprobacion: string | null;
  enlace_doc: string | null;
  tasa_licencia_aplica: boolean | null;
  tasa_licencia_importe: number | null;
  icio_aplica: boolean | null;
  icio_bonificacion: boolean;
  icio_importe: number | null;
  residuos_aplica: boolean | null;
  residuos_importe: number | null;
  inicio_dr_autorizado: string | null;
  espera_subvencion: boolean;
  tramita_equipo_id: string | null;
  pausado: boolean;
  notas: string | null;
  equipo: { nombre: string } | null;
};

// ---- Vocabularios ----

export const ESTADO_LICENCIA: Record<string, { label: string; clase: string }> = {
  pendiente_definir: { label: "Pte de definir (licencia o DR)", clase: "bg-black/5 text-carbon/50" },
  compromiso: { label: "Compromiso (espera subvención)", clase: "bg-violet-100 text-violet-700" },
  solicitada: { label: "Solicitada", clase: "bg-sky-100 text-sky-700" },
  requerido: { label: "Requerido", clase: "bg-red-100 text-red-700" },
  aprobada: { label: "Aprobada", clase: "bg-emerald-100 text-emerald-700" },
};

export const TIPO_TRAMITE_LABEL: Record<string, string> = {
  licencia: "Licencia",
  dr: "DR",
  consulta_urbanistica: "Consulta urbanística",
  orden_ejecucion_ite: "Orden ejecución ITE",
};

export const INICIO_DR_LABEL: Record<string, string> = {
  ok_verbal: "OK verbal del técnico",
  ok_escrito: "OK escrito del técnico",
  exencion_firmada: "Exención firmada (comunidad asume)",
};

// El ciclo lineal (para el mini-stepper).
export const CICLO_LICENCIA: { clave: string; label: string }[] = [
  { clave: "solicitada", label: "Solicitada" },
  { clave: "requerido", label: "Requerido" },
  { clave: "aprobada", label: "Aprobada" },
];
const IDX: Record<string, number> = { pendiente_definir: 0, compromiso: 0, solicitada: 0, requerido: 1, aprobada: 2 };
export function licenciaIdx(estado: string): number {
  return IDX[estado] ?? 0;
}

/** True si es DR y aun NO se puede arrancar obra (sin OK del tecnico ni exencion). */
export function drSinArranque(l: { tipo_tramite: string | null; inicio_dr_autorizado: string | null; estado: string }): boolean {
  return l.tipo_tramite === "dr" && !l.inicio_dr_autorizado && l.estado !== "aprobada";
}

const SELECT =
  "id,proyecto_id,estado,tipo_tramite,tramitada_por,organismo,tecnico_ayto,fecha_registro_ayto,fecha_aprobacion," +
  "enlace_doc,tasa_licencia_aplica,tasa_licencia_importe,icio_aplica,icio_bonificacion,icio_importe," +
  "residuos_aplica,residuos_importe,inicio_dr_autorizado,espera_subvencion,tramita_equipo_id,pausado,notas," +
  "equipo:tramita_equipo_id(nombre)";

// ---- Consultas ----

export function licenciasDeProyecto(proyectoId: string): Promise<Licencia[]> {
  return rest<Licencia[]>(`licencias?select=${SELECT}&proyecto_id=eq.${proyectoId}&order=creado_en.asc`);
}

export type RequerimientoLic = {
  id: string;
  ronda: number;
  origen: string; // ayuntamiento | ecu
  descripcion: string;
  estado: string;
  fecha_recepcion: string | null;
  fecha_respuesta: string | null;
};

/** Requerimientos de licencia de un proyecto (ayto/ecu). El sistema completo es un sprint aparte. */
export function requerimientosLicencia(proyectoId: string): Promise<RequerimientoLic[]> {
  return rest<RequerimientoLic[]>(
    "requerimientos_tramitacion?select=id,ronda,origen,descripcion,estado,fecha_recepcion,fecha_respuesta" +
      `&proyecto_id=eq.${proyectoId}&origen=in.(ayuntamiento,ecu)&order=ronda.desc`,
  );
}

// ---- Panel ----

export type LicenciaFila = {
  licenciaId: string;
  proyectoId: string;
  comunidadId: string;
  comunidadNombre: string;
  municipio: string | null;
  estado: string;
  tipoTramite: string | null;
  tramitadaPor: string;
  organismo: string | null;
  fechaRegistro: string | null;
  fechaAprobacion: string | null;
  inicioDrAutorizado: string | null;
  esperaSubvencion: boolean;
  pausado: boolean;
  tramita: string | null;
  tipos: string[];
};

type FilaCruda = {
  id: string;
  proyecto_id: string;
  estado: string;
  tipo_tramite: string | null;
  tramitada_por: string;
  organismo: string | null;
  fecha_registro_ayto: string | null;
  fecha_aprobacion: string | null;
  inicio_dr_autorizado: string | null;
  espera_subvencion: boolean;
  pausado: boolean;
  equipo: { nombre: string } | null;
  proyectos: {
    comunidad_id: string;
    comunidades: { nombre: string; municipio: string | null } | null;
    proyecto_tipos: { tipos_proyecto: { nombre: string } }[];
  } | null;
};

export async function licenciasPanel(): Promise<LicenciaFila[]> {
  const filas = await rest<FilaCruda[]>(
    "licencias?select=id,proyecto_id,estado,tipo_tramite,tramitada_por,organismo,fecha_registro_ayto,fecha_aprobacion," +
      "inicio_dr_autorizado,espera_subvencion,pausado,equipo:tramita_equipo_id(nombre)," +
      "proyectos(comunidad_id,comunidades(nombre,municipio),proyecto_tipos(tipos_proyecto(nombre)))&limit=2000",
  );
  return filas
    .map((f) => ({
      licenciaId: f.id,
      proyectoId: f.proyecto_id,
      comunidadId: f.proyectos?.comunidad_id ?? "",
      comunidadNombre: f.proyectos?.comunidades?.nombre ?? "—",
      municipio: f.proyectos?.comunidades?.municipio ?? null,
      estado: f.estado,
      tipoTramite: f.tipo_tramite,
      tramitadaPor: f.tramitada_por,
      organismo: f.organismo,
      fechaRegistro: f.fecha_registro_ayto,
      fechaAprobacion: f.fecha_aprobacion,
      inicioDrAutorizado: f.inicio_dr_autorizado,
      esperaSubvencion: f.espera_subvencion,
      pausado: f.pausado,
      tramita: f.equipo?.nombre ?? null,
      tipos: (f.proyectos?.proyecto_tipos ?? []).map((t) => t.tipos_proyecto?.nombre).filter(Boolean),
    }))
    .sort((a, b) => a.comunidadNombre.localeCompare(b.comunidadNombre, "es"));
}

export type ResumenLicencia = {
  total: number;
  porEstado: Record<string, number>;
  compromiso: number; // esperando subvencion
  drSinArranque: number; // DR sin OK -> no se puede iniciar obra
  requeridos: number;
  tramitanEllos: number;
  pausados: number;
};

export function resumenLicencia(filas: LicenciaFila[]): ResumenLicencia {
  const porEstado: Record<string, number> = {};
  let drSA = 0;
  for (const f of filas) {
    porEstado[f.estado] = (porEstado[f.estado] ?? 0) + 1;
    if (drSinArranque({ tipo_tramite: f.tipoTramite, inicio_dr_autorizado: f.inicioDrAutorizado, estado: f.estado })) drSA++;
  }
  return {
    total: filas.length,
    porEstado,
    compromiso: filas.filter((f) => f.esperaSubvencion).length,
    drSinArranque: drSA,
    requeridos: porEstado["requerido"] ?? 0,
    tramitanEllos: filas.filter((f) => f.tramitadaPor === "ellos").length,
    pausados: filas.filter((f) => f.pausado).length,
  };
}

// ---- Resumen para la ventanita del expediente ----

export type ResumenLicenciaComunidad = {
  hay: boolean;
  total: number;
  aprobadas: number;
  ultimoEstado: string | null;
  tipoTramite: string | null;
  organismo: string | null;
};

export async function resumenLicenciaComunidad(comunidadId: string): Promise<ResumenLicenciaComunidad> {
  const ls = await rest<Licencia[]>(
    `licencias?select=${SELECT},proyectos!inner(comunidad_id)&proyectos.comunidad_id=eq.${comunidadId}&order=creado_en.asc`,
  );
  const ultimo = ls[ls.length - 1] ?? null;
  return {
    hay: ls.length > 0,
    total: ls.length,
    aprobadas: ls.filter((l) => l.estado === "aprobada").length,
    ultimoEstado: ultimo?.estado ?? null,
    tipoTramite: ultimo?.tipo_tramite ?? null,
    organismo: ultimo?.organismo ?? null,
  };
}
