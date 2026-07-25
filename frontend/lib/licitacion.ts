// lib/licitacion.ts
//
// Acceso a datos de TRES PRESUPUESTOS (la licitacion de contrata).
//
// Flujo: se envia un presupuesto CIEGO a varias contratas -> devuelven presupuestos
// (firmados) -> se homogeneizan y comparan -> la comunidad vota en junta -> se
// adjudica un ganador (firmado por la comunidad) + acta de votacion.
//
// SIEMPRE deben existir >=3 presupuestos firmados y el ganador firmado por la
// comunidad + acta, por exigencia de la SUBVENCION. De ahi las "palancas": en el
// caso B (el proyecto ya viene con contrata; pem_origen='contrata') se piden 2
// presupuestos de acompanamiento a contratas amigas para cubrir el expediente.
//
// El desglose por PARTIDAS del ganador (cimiento de contradictorios y
// certificaciones) llega en la capa siguiente.

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

export type Presupuesto = {
  id: string;
  licitacion_id: string;
  contrata_id: string | null;
  contrata_externa_nombre: string | null;
  origen: string; // invitada_por_nosotros | aportada_por_comunidad
  rol_pretendido: string; // preferida | palanca | na
  importe_pem: number | null;
  estado: string; // invitada..adjudicada|no_adjudicada|retirada
  firmado_contrata: boolean;
  firmado_comunidad: boolean;
  enlace_documento: string | null;
  fecha_presupuesto: string | null;
  notas: string | null;
  contratas: { nombre: string } | null;
};

export type Licitacion = {
  id: string;
  proyecto_id: string;
  paquete: string;
  estado: string;
  estado_desde: string;
  esperando_de: string | null;
  esperando_desde: string | null;
  acta_votacion_enlace: string | null;
  fecha_votacion: string | null;
  informe_adecuacion_enlace: string | null;
  notas: string | null;
  presupuestos_licitacion: Presupuesto[];
};

// ---- Vocabularios ----

export const ESTADO_LICITACION: Record<string, { label: string; clase: string }> = {
  abierta: { label: "Abierta", clase: "bg-sky-100 text-sky-700" },
  presupuestos_recibidos: { label: "Presupuestos recibidos", clase: "bg-sky-100 text-sky-700" },
  homogeneizando: { label: "Homogeneizando", clase: "bg-amber-100 text-amber-700" },
  a_junta: { label: "A junta", clase: "bg-amber-100 text-amber-700" },
  adjudicada: { label: "Adjudicada", clase: "bg-emerald-100 text-emerald-700" },
  desierta: { label: "Desierta", clase: "bg-black/10 text-carbon/50" },
  cancelada: { label: "Cancelada", clase: "bg-black/10 text-carbon/50" },
};

export const ESTADO_PRESUPUESTO: Record<string, { label: string; clase: string }> = {
  invitada: { label: "Invitada", clase: "bg-black/5 text-carbon/50" },
  presupuestado: { label: "Presupuestado", clase: "bg-sky-100 text-sky-700" },
  correccion_pedida: { label: "Corrección pedida", clase: "bg-amber-100 text-amber-700" },
  homogeneizado: { label: "Homogeneizado", clase: "bg-sky-100 text-sky-700" },
  a_junta: { label: "A junta", clase: "bg-amber-100 text-amber-700" },
  adjudicada: { label: "Ganador", clase: "bg-emerald-100 text-emerald-700" },
  no_adjudicada: { label: "No adjudicada", clase: "bg-black/5 text-carbon/40" },
  retirada: { label: "Retirada", clase: "bg-black/5 text-carbon/40" },
};

export const ROL_PRETENDIDO: Record<string, { label: string; clase: string }> = {
  preferida: { label: "Preferida", clase: "bg-lima-soft text-lima-dark" },
  palanca: { label: "Palanca", clase: "bg-violet-100 text-violet-700" },
  na: { label: "", clase: "" },
};

export const ORIGEN_LABEL: Record<string, string> = {
  invitada_por_nosotros: "Invitada por nosotros",
  aportada_por_comunidad: "Aportada por la comunidad",
};

/** Nombre de la contrata: ficha o texto libre. */
export function contrataDe(p: Presupuesto): string {
  return p.contratas?.nombre ?? p.contrata_externa_nombre ?? "—";
}

/** El presupuesto adjudicado (ganador), si lo hay. */
export function ganadorDe(l: Licitacion): Presupuesto | null {
  return l.presupuestos_licitacion.find((p) => p.estado === "adjudicada") ?? null;
}

// ---- Cumplimiento de subvencion (regla dura) ----

export type Subvencion = {
  ok: boolean;
  firmadosContrata: number;
  tresPresupuestos: boolean; // >=3 firmados por contrata
  ganador: Presupuesto | null;
  ganadorFirmado: boolean; // ganador firmado por la comunidad
  tieneActa: boolean;
  faltan: string[];
};

/** Checklist de subvencion: >=3 firmados por contrata + ganador firmado por comunidad + acta de votacion. */
export function cumpleSubvencion(l: Licitacion): Subvencion {
  const firmadosContrata = l.presupuestos_licitacion.filter((p) => p.firmado_contrata).length;
  const tresPresupuestos = firmadosContrata >= 3;
  const ganador = ganadorDe(l);
  const ganadorFirmado = !!ganador?.firmado_comunidad;
  const tieneActa = !!l.acta_votacion_enlace;
  const faltan: string[] = [];
  if (!tresPresupuestos) faltan.push(`${firmadosContrata}/3 firmados`);
  if (!ganador) faltan.push("sin ganador");
  else if (!ganadorFirmado) faltan.push("ganador sin firma de la comunidad");
  if (!tieneActa) faltan.push("acta de votación");
  return { ok: faltan.length === 0, firmadosContrata, tresPresupuestos, ganador, ganadorFirmado, tieneActa, faltan };
}

const SELECT =
  "id,proyecto_id,paquete,estado,estado_desde,esperando_de,esperando_desde," +
  "acta_votacion_enlace,fecha_votacion,informe_adecuacion_enlace,notas," +
  "presupuestos_licitacion(id,licitacion_id,contrata_id,contrata_externa_nombre,origen,rol_pretendido," +
  "importe_pem,estado,firmado_contrata,firmado_comunidad,enlace_documento,fecha_presupuesto,notas," +
  "contratas:contrata_id(nombre))";

// ---- Consultas ----

export function licitacionesDeProyecto(proyectoId: string): Promise<Licitacion[]> {
  return rest<Licitacion[]>(`licitaciones?select=${SELECT}&proyecto_id=eq.${proyectoId}&order=creado_en.asc`);
}

export type ContrataOpcion = { id: string; nombre: string };

export function listarContratas(): Promise<ContrataOpcion[]> {
  return rest<ContrataOpcion[]>("contratas?select=id,nombre&order=nombre.asc&limit=1000");
}

/** PEM de referencia del proyecto y su origen (nuestro proyecto / ya venia con contrata = caso B). */
export async function pemProyecto(proyectoId: string): Promise<{ pem: number | null; pemOrigen: string | null }> {
  const r = await rest<{ pem: number | null; pem_origen: string | null }[]>(
    `proyectos?select=pem,pem_origen&id=eq.${proyectoId}`,
  );
  return { pem: r[0]?.pem ?? null, pemOrigen: r[0]?.pem_origen ?? null };
}

// ---- Panel /tres-presupuestos ----

export type LicitacionFila = {
  licitacionId: string;
  proyectoId: string;
  comunidadId: string;
  comunidadNombre: string;
  municipio: string | null;
  estado: string;
  numPresupuestos: number;
  firmados: number;
  ganador: string | null;
  subvencionOk: boolean;
  subvencionFaltan: string[];
  esperandoDe: string | null;
  tipos: string[];
  casoB: boolean; // el proyecto ya venia con contrata (pem_origen='contrata')
};

type FilaCruda = Licitacion & {
  proyectos: {
    comunidad_id: string;
    pem_origen: string | null;
    comunidades: { nombre: string; municipio: string | null } | null;
    proyecto_tipos: { tipos_proyecto: { nombre: string } }[];
  } | null;
};

export async function licitacionesPanel(): Promise<LicitacionFila[]> {
  const filas = await rest<FilaCruda[]>(
    `licitaciones?select=${SELECT},proyectos(comunidad_id,pem_origen,comunidades(nombre,municipio),proyecto_tipos(tipos_proyecto(nombre)))&limit=2000`,
  );
  return filas
    .map((l) => {
      const sub = cumpleSubvencion(l);
      const g = ganadorDe(l);
      return {
        licitacionId: l.id,
        proyectoId: l.proyecto_id,
        comunidadId: l.proyectos?.comunidad_id ?? "",
        comunidadNombre: l.proyectos?.comunidades?.nombre ?? "—",
        municipio: l.proyectos?.comunidades?.municipio ?? null,
        estado: l.estado,
        numPresupuestos: l.presupuestos_licitacion.length,
        firmados: sub.firmadosContrata,
        ganador: g ? contrataDe(g) : null,
        subvencionOk: sub.ok,
        subvencionFaltan: sub.faltan,
        esperandoDe: l.esperando_de,
        tipos: (l.proyectos?.proyecto_tipos ?? []).map((t) => t.tipos_proyecto?.nombre).filter(Boolean),
        casoB: l.proyectos?.pem_origen === "contrata",
      };
    })
    .sort((a, b) => a.comunidadNombre.localeCompare(b.comunidadNombre, "es"));
}

export type ResumenLicitacionPanel = {
  total: number;
  porEstado: Record<string, number>;
  abiertas: number; // aun sin adjudicar (esperando presupuestos / homogeneizando / a junta)
  adjudicadas: number;
  subvencionPendiente: number; // adjudicadas pero sin cumplir el expediente
};

export function resumenLicitacionPanel(filas: LicitacionFila[]): ResumenLicitacionPanel {
  const porEstado: Record<string, number> = {};
  let subvencionPendiente = 0;
  for (const f of filas) {
    porEstado[f.estado] = (porEstado[f.estado] ?? 0) + 1;
    if (f.estado === "adjudicada" && !f.subvencionOk) subvencionPendiente++;
  }
  const adjudicadas = porEstado["adjudicada"] ?? 0;
  return {
    total: filas.length,
    porEstado,
    abiertas: filas.length - adjudicadas - (porEstado["desierta"] ?? 0) - (porEstado["cancelada"] ?? 0),
    adjudicadas,
    subvencionPendiente,
  };
}

// ---- Resumen para la ventanita del expediente ----

export type ResumenLicitacionComunidad = {
  hay: boolean;
  estado: string | null;
  numPresupuestos: number;
  ganador: string | null;
  subvencionOk: boolean;
};

export async function resumenLicitacionComunidad(comunidadId: string): Promise<ResumenLicitacionComunidad> {
  const ls = await rest<Licitacion[]>(
    `licitaciones?select=${SELECT},proyectos!inner(comunidad_id)&proyectos.comunidad_id=eq.${comunidadId}&order=creado_en.asc`,
  );
  const l = ls[ls.length - 1] ?? null;
  const g = l ? ganadorDe(l) : null;
  return {
    hay: ls.length > 0,
    estado: l?.estado ?? null,
    numPresupuestos: l?.presupuestos_licitacion.length ?? 0,
    ganador: g ? contrataDe(g) : null,
    subvencionOk: l ? cumpleSubvencion(l).ok : false,
  };
}
