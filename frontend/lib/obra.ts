// lib/obra.ts
//
// Acceso a datos de la fase OBRA (capa 1: espina). 3 fases: inicio, seguimiento,
// fin. Las visitas/actas (el punto critico) y el cierre (memoria de ejecucion,
// justificacion economica) van en sus propias capas.

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

export type Obra = {
  id: string;
  proyecto_id: string;
  estado: string;
  constructora_contrata_id: string | null;
  constructora: string | null;
  css_contratado: boolean;
  pss_aprobado: boolean;
  coordinador_css_equipo_id: string | null;
  coordinador_css_nombre: string | null;
  jefe_obra: string | null;
  fecha_apertura_centro_trabajo: string | null;
  fecha_acta_inicio: string | null;
  fecha_fin_obra: string | null;
  plazo_ejecucion_meses: number | null;
  cfo_estado: string | null;
  fecha_cfo_a_visar: string | null;
  fecha_cfo_visado: string | null;
  notas: string | null;
  contratas: { nombre: string } | null;
  equipo: { nombre: string } | null;
};

// ---- Vocabularios ----

export const ESTADO_OBRA: Record<string, { label: string; clase: string }> = {
  pendiente_inicio: { label: "Pendiente de inicio", clase: "bg-amber-100 text-amber-700" },
  en_curso: { label: "En curso", clase: "bg-sky-100 text-sky-700" },
  paralizada: { label: "Paralizada", clase: "bg-red-100 text-red-700" },
  finalizada: { label: "Fin de obra", clase: "bg-emerald-100 text-emerald-700" },
  cancelada: { label: "Cancelada", clase: "bg-black/10 text-carbon/50" },
  no_procede: { label: "No procede", clase: "bg-black/5 text-carbon/40" },
};

export const CFO_ESTADO: Record<string, { label: string; clase: string }> = {
  a_visar: { label: "CFO a visar", clase: "bg-amber-100 text-amber-700" },
  visado: { label: "CFO visado", clase: "bg-emerald-100 text-emerald-700" },
  no_procede: { label: "CFO no procede", clase: "bg-black/5 text-carbon/40" },
};

// Las 3 fases de la obra (para el stepper).
export const FASES_OBRA: { clave: string; label: string }[] = [
  { clave: "inicio", label: "Inicio" },
  { clave: "seguimiento", label: "Seguimiento" },
  { clave: "fin", label: "Fin de obra" },
];

/** Fase (0..2) segun el estado; -1 si es un overlay (cancelada/no_procede). */
export function faseObraIdx(estado: string): number {
  if (estado === "pendiente_inicio") return 0;
  if (estado === "en_curso" || estado === "paralizada") return 1;
  if (estado === "finalizada") return 2;
  return -1;
}

/** Qué falta del gate de inicio (CSS + PSS + acta + apertura) para arrancar. */
export function gateInicioPendiente(o: Obra): string[] {
  const falta: string[] = [];
  if (!o.css_contratado) falta.push("CSS");
  if (!o.pss_aprobado) falta.push("PSS");
  if (!o.fecha_acta_inicio) falta.push("acta de inicio");
  if (!o.fecha_apertura_centro_trabajo) falta.push("apertura centro trabajo");
  return falta;
}

/** Nombre de la constructora: ficha de contrata o crudo. */
export function constructoraDe(o: { contratas: { nombre: string } | null; constructora: string | null }): string | null {
  return o.contratas?.nombre ?? o.constructora ?? null;
}

const SELECT =
  "id,proyecto_id,estado,constructora_contrata_id,constructora,css_contratado,pss_aprobado," +
  "coordinador_css_equipo_id,coordinador_css_nombre,jefe_obra,fecha_apertura_centro_trabajo,fecha_acta_inicio," +
  "fecha_fin_obra,plazo_ejecucion_meses,cfo_estado,fecha_cfo_a_visar,fecha_cfo_visado,notas," +
  "contratas:constructora_contrata_id(nombre),equipo:coordinador_css_equipo_id(nombre)";

// ---- Consultas ----

export function obrasDeProyecto(proyectoId: string): Promise<Obra[]> {
  return rest<Obra[]>(`obras?select=${SELECT}&proyecto_id=eq.${proyectoId}&order=creado_en.asc`);
}

export type ContrataOpcion = { id: string; nombre: string };

/** Contratas para el selector de constructora. */
export function listarContratas(): Promise<ContrataOpcion[]> {
  return rest<ContrataOpcion[]>("contratas?select=id,nombre&order=nombre.asc&limit=1000");
}

// ---- Panel ----

export type ObraFila = {
  obraId: string;
  proyectoId: string;
  comunidadId: string;
  comunidadNombre: string;
  municipio: string | null;
  estado: string;
  constructora: string | null;
  coordinador: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  cfoEstado: string | null;
  gateFalta: string[];
  tipos: string[];
};

type FilaCruda = {
  id: string;
  proyecto_id: string;
  estado: string;
  constructora: string | null;
  css_contratado: boolean;
  pss_aprobado: boolean;
  fecha_apertura_centro_trabajo: string | null;
  fecha_acta_inicio: string | null;
  fecha_fin_obra: string | null;
  cfo_estado: string | null;
  contratas: { nombre: string } | null;
  equipo: { nombre: string } | null;
  coordinador_css_nombre: string | null;
  proyectos: {
    comunidad_id: string;
    comunidades: { nombre: string; municipio: string | null } | null;
    proyecto_tipos: { tipos_proyecto: { nombre: string } }[];
  } | null;
};

export async function obrasPanel(): Promise<ObraFila[]> {
  const filas = await rest<FilaCruda[]>(
    "obras?select=id,proyecto_id,estado,constructora,css_contratado,pss_aprobado,fecha_apertura_centro_trabajo," +
      "fecha_acta_inicio,fecha_fin_obra,cfo_estado,coordinador_css_nombre," +
      "contratas:constructora_contrata_id(nombre),equipo:coordinador_css_equipo_id(nombre)," +
      "proyectos(comunidad_id,comunidades(nombre,municipio),proyecto_tipos(tipos_proyecto(nombre)))&limit=2000",
  );
  return filas
    .map((f) => {
      const gateFalta: string[] = [];
      if (f.estado === "pendiente_inicio") {
        if (!f.css_contratado) gateFalta.push("CSS");
        if (!f.pss_aprobado) gateFalta.push("PSS");
        if (!f.fecha_acta_inicio) gateFalta.push("acta");
        if (!f.fecha_apertura_centro_trabajo) gateFalta.push("apertura");
      }
      return {
        obraId: f.id,
        proyectoId: f.proyecto_id,
        comunidadId: f.proyectos?.comunidad_id ?? "",
        comunidadNombre: f.proyectos?.comunidades?.nombre ?? "—",
        municipio: f.proyectos?.comunidades?.municipio ?? null,
        estado: f.estado,
        constructora: f.contratas?.nombre ?? f.constructora ?? null,
        coordinador: f.equipo?.nombre ?? f.coordinador_css_nombre ?? null,
        fechaInicio: f.fecha_acta_inicio,
        fechaFin: f.fecha_fin_obra,
        cfoEstado: f.cfo_estado,
        gateFalta,
        tipos: (f.proyectos?.proyecto_tipos ?? []).map((t) => t.tipos_proyecto?.nombre).filter(Boolean),
      };
    })
    .sort((a, b) => a.comunidadNombre.localeCompare(b.comunidadNombre, "es"));
}

export type ResumenObra = {
  total: number;
  porEstado: Record<string, number>;
  pendienteInicio: number;
  enCurso: number;
  cfoPendiente: number; // finalizadas sin CFO visado
  paralizadas: number;
};

export function resumenObra(filas: ObraFila[]): ResumenObra {
  const porEstado: Record<string, number> = {};
  let cfoPendiente = 0;
  for (const f of filas) {
    porEstado[f.estado] = (porEstado[f.estado] ?? 0) + 1;
    if (f.estado === "finalizada" && f.cfoEstado !== "visado" && f.cfoEstado !== "no_procede") cfoPendiente++;
  }
  return {
    total: filas.length,
    porEstado,
    pendienteInicio: porEstado["pendiente_inicio"] ?? 0,
    enCurso: porEstado["en_curso"] ?? 0,
    cfoPendiente,
    paralizadas: porEstado["paralizada"] ?? 0,
  };
}

// ---- Resumen para la ventanita del expediente ----

export type ResumenObraComunidad = {
  hay: boolean;
  estado: string | null;
  constructora: string | null;
  cfoEstado: string | null;
  fechaFin: string | null;
};

export async function resumenObraComunidad(comunidadId: string): Promise<ResumenObraComunidad> {
  const os = await rest<Obra[]>(
    `obras?select=${SELECT},proyectos!inner(comunidad_id)&proyectos.comunidad_id=eq.${comunidadId}&order=creado_en.asc`,
  );
  const o = os[os.length - 1] ?? null;
  return {
    hay: os.length > 0,
    estado: o?.estado ?? null,
    constructora: o ? constructoraDe(o) : null,
    cfoEstado: o?.cfo_estado ?? null,
    fechaFin: o?.fecha_fin_obra ?? null,
  };
}
