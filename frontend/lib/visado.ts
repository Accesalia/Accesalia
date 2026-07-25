// lib/visado.ts
//
// Acceso a datos de la fase VISADO (colegio COAM). Solo de servidor, mismo patron
// REST que lib/proyecto.ts. Guardamos HECHOS (codigo TL, tasa, fechas, estado);
// las metricas (coste total, nº re-visados) se calculan al vuelo.

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

export type Visado = {
  id: string;
  proyecto_id: string;
  momento: string; // proyecto | fin_obra
  tipo: string | null; // normal | urgente
  estado: string;
  organismo: string;
  referencia: string | null; // codigo TL
  tasa: number | null;
  pagado: boolean;
  fecha_envio: string | null;
  fecha_visado: string | null;
  fecha_descarga: string | null;
  entregado_al_pagador: boolean;
  tramita_equipo_id: string | null;
  pausado: boolean;
  notas: string | null;
  equipo: { nombre: string } | null;
};

// ---- Vocabularios (etiqueta + color) ----

// El ciclo lineal del visado (para el mini-stepper). Ver memoria modelo-visado.
export const CICLO_VISADO: { clave: string; label: string }[] = [
  { clave: "pendiente_enviar", label: "Pte de enviar" },
  { clave: "enviado", label: "Enviado" },
  { clave: "visado", label: "Visado" },
];

export const ESTADO_VISADO: Record<string, { label: string; clase: string }> = {
  pendiente_enviar: { label: "Pte de enviar", clase: "bg-amber-100 text-amber-700" },
  enviado: { label: "Enviado a visar", clase: "bg-sky-100 text-sky-700" },
  requerido: { label: "Requerido COAM", clase: "bg-red-100 text-red-700" },
  visado: { label: "Visado", clase: "bg-emerald-100 text-emerald-700" },
};

export const MOMENTO_LABEL: Record<string, string> = { proyecto: "Proyecto", fin_obra: "Fin de obra" };
export const TIPO_VISADO_LABEL: Record<string, string> = { normal: "Normal", urgente: "Urgente (48h)" };

// Orden del ciclo, para saber "por donde va" en el stepper.
const IDX: Record<string, number> = { pendiente_enviar: 0, enviado: 1, requerido: 1, visado: 2 };
export function visadoIdx(estado: string): number {
  return IDX[estado] ?? 0;
}

const SELECT =
  "id,proyecto_id,momento,tipo,estado,organismo,referencia,tasa,pagado," +
  "fecha_envio,fecha_visado,fecha_descarga,entregado_al_pagador,tramita_equipo_id,pausado,notas," +
  "equipo:tramita_equipo_id(nombre)";

// ---- Consultas ----

/** Visados de un proyecto (mas reciente primero). Normalmente 1; re-visados = varios. */
export function visadosDeProyecto(proyectoId: string): Promise<Visado[]> {
  return rest<Visado[]>(`visados?select=${SELECT}&proyecto_id=eq.${proyectoId}&order=creado_en.asc`);
}

/** Visados de todos los proyectos de una comunidad (para la ventanita del expediente). */
export async function visadosDeComunidad(comunidadId: string): Promise<Visado[]> {
  return rest<Visado[]>(
    `visados?select=${SELECT},proyectos!inner(comunidad_id)&proyectos.comunidad_id=eq.${comunidadId}&order=creado_en.asc`,
  );
}

export type RequerimientoCoam = {
  id: string;
  ronda: number;
  descripcion: string;
  estado: string;
  fecha_recepcion: string | null;
  fecha_respuesta: string | null;
};

/** Requerimientos del COAM de un proyecto (rondas, mas reciente primero). */
export function requerimientosCoam(proyectoId: string): Promise<RequerimientoCoam[]> {
  return rest<RequerimientoCoam[]>(
    "requerimientos_tramitacion?select=id,ronda,descripcion,estado,fecha_recepcion,fecha_respuesta" +
      `&proyecto_id=eq.${proyectoId}&origen=eq.coam&order=ronda.desc`,
  );
}

// ---- Panel: fila con contexto de comunidad + tipos ----

export type VisadoFila = {
  visadoId: string;
  proyectoId: string;
  comunidadId: string;
  comunidadNombre: string;
  municipio: string | null;
  momento: string;
  tipo: string | null;
  estado: string;
  referencia: string | null;
  tasa: number | null;
  pagado: boolean;
  fechaEnvio: string | null;
  fechaVisado: string | null;
  pausado: boolean;
  tramita: string | null;
  tipos: string[];
};

type FilaCruda = {
  id: string;
  proyecto_id: string;
  momento: string;
  tipo: string | null;
  estado: string;
  referencia: string | null;
  tasa: number | null;
  pagado: boolean;
  fecha_envio: string | null;
  fecha_visado: string | null;
  pausado: boolean;
  equipo: { nombre: string } | null;
  proyectos: {
    comunidad_id: string;
    comunidades: { nombre: string; municipio: string | null } | null;
    proyecto_tipos: { tipos_proyecto: { nombre: string } }[];
  } | null;
};

/** Todos los visados con su contexto (para el panel). */
export async function visadosPanel(): Promise<VisadoFila[]> {
  const filas = await rest<FilaCruda[]>(
    "visados?select=id,proyecto_id,momento,tipo,estado,referencia,tasa,pagado,fecha_envio,fecha_visado,pausado," +
      "equipo:tramita_equipo_id(nombre)," +
      "proyectos(comunidad_id,comunidades(nombre,municipio),proyecto_tipos(tipos_proyecto(nombre)))&limit=2000",
  );
  return filas
    .map((f) => ({
      visadoId: f.id,
      proyectoId: f.proyecto_id,
      comunidadId: f.proyectos?.comunidad_id ?? "",
      comunidadNombre: f.proyectos?.comunidades?.nombre ?? "—",
      municipio: f.proyectos?.comunidades?.municipio ?? null,
      momento: f.momento,
      tipo: f.tipo,
      estado: f.estado,
      referencia: f.referencia,
      tasa: f.tasa,
      pagado: f.pagado,
      fechaEnvio: f.fecha_envio,
      fechaVisado: f.fecha_visado,
      pausado: f.pausado,
      tramita: f.equipo?.nombre ?? null,
      tipos: (f.proyectos?.proyecto_tipos ?? []).map((t) => t.tipos_proyecto?.nombre).filter(Boolean),
    }))
    .sort((a, b) => a.comunidadNombre.localeCompare(b.comunidadNombre, "es"));
}

// ---- Resumen para la ventanita del expediente ----

export type ResumenVisadoComunidad = {
  hay: boolean;
  total: number;
  visados: number; // concedidos
  ultimoEstado: string | null; // estado del mas reciente
  referencia: string | null; // codigo TL mas reciente
  tasasPendientes: number;
};

/** Resumen compacto de los visados de una comunidad (para la ventanita). */
export async function resumenVisadoComunidad(comunidadId: string): Promise<ResumenVisadoComunidad> {
  const vs = await visadosDeComunidad(comunidadId);
  const concedidos = vs.filter((v) => v.estado === "visado").length;
  const tasasPendientes = vs.reduce((s, v) => s + (v.tasa && !v.pagado ? v.tasa : 0), 0);
  const ultimo = vs[vs.length - 1] ?? null;
  return {
    hay: vs.length > 0,
    total: vs.length,
    visados: concedidos,
    ultimoEstado: ultimo?.estado ?? null,
    referencia: [...vs].reverse().find((v) => v.referencia)?.referencia ?? null,
    tasasPendientes,
  };
}

// ---- Resumen economico (el foco: coste, no flujo) ----

export type ResumenVisado = {
  total: number;
  porEstado: Record<string, number>;
  pausados: number;
  visadosSinPagar: number; // visados concedidos con tasa pendiente de pagar
  tasasTotal: number; // suma de tasas conocidas
  tasasPendientes: number; // suma de tasas de los no pagados
  reVisados: number; // proyectos con mas de un visado (encarecen)
};

/** Resumen para la cabecera del panel de visado. */
export function resumenVisado(filas: VisadoFila[]): ResumenVisado {
  const porEstado: Record<string, number> = {};
  const porProyecto: Record<string, number> = {};
  let tasasTotal = 0;
  let tasasPendientes = 0;
  let pausados = 0;
  let visadosSinPagar = 0;
  for (const f of filas) {
    porEstado[f.estado] = (porEstado[f.estado] ?? 0) + 1;
    porProyecto[f.proyectoId] = (porProyecto[f.proyectoId] ?? 0) + 1;
    if (f.pausado) pausados++;
    if (f.tasa) tasasTotal += f.tasa;
    if (f.tasa && !f.pagado) tasasPendientes += f.tasa;
    if (f.estado === "visado" && !f.pagado) visadosSinPagar++;
  }
  const reVisados = Object.values(porProyecto).filter((n) => n > 1).length;
  return {
    total: filas.length,
    porEstado,
    pausados,
    visadosSinPagar,
    tasasTotal,
    tasasPendientes,
    reVisados,
  };
}
