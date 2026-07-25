// lib/proyecto.ts
//
// Acceso a datos del area de PROYECTO (produccion tecnica). Solo de servidor,
// mismo patron REST que lib/comunidades.ts. Guardamos HECHOS (fechas, estados,
// responsables); las metricas (tiempo, desviacion, "proyectos abiertos") se
// calculan al vuelo, no se guardan.

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

export type EtapaProyecto = {
  id: string;
  tipo_etapa: string;
  orden: number | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_prevista: string | null;
  fecha_fin: string | null;
  responsable_tecnico_id: string | null;
  responsable_nombre: string | null;
  equipo: { nombre: string } | null;
};

export type TipoProyecto = { clave: string; nombre: string; naturaleza: string | null };

export type Proyecto = {
  id: string;
  estado: string;
  tipo: string | null;
  pagador: string | null;
  comercial_interno: string | null;
  proyecto_externo: boolean;
  fecha_contratado: string | null;
  condicion_arranque: string | null;
  arranque_cumplido: boolean;
  arranque_referencia: string | null;
  arranque_fecha: string | null;
  cee_estado: string | null;
  revision_estado: string | null;
  notas: string | null;
  entidad_responsable: string | null;   // ayuntamiento | ecu
  modalidad_licencia: string | null;     // declaracion_responsable | licencia
  requiere_visado: boolean;
  requiere_licencia: boolean;
  ecu_visto_bueno: boolean;
  etapas_proyecto: EtapaProyecto[];
  proyecto_tipos: { tipos_proyecto: TipoProyecto }[];
};

// Via de tramitacion de la licencia (se decide al inicio; ver memoria modelo-visado).
export const ENTIDAD_LABEL: Record<string, string> = { ayuntamiento: "Ayuntamiento", ecu: "ECU" };
export const MODALIDAD_LABEL: Record<string, string> = {
  declaracion_responsable: "Declaración responsable",
  licencia: "Licencia",
};

/** Tags de tipo de un proyecto (los combos ya vienen desglosados). */
export function tiposDe(p: Proyecto): TipoProyecto[] {
  return (p.proyecto_tipos ?? []).map((x) => x.tipos_proyecto).filter(Boolean);
}

// ---- Vocabularios (etiqueta + color) ----

export const ESTADO_PROYECTO: Record<string, { label: string; clase: string }> = {
  no_procede: { label: "No procede", clase: "bg-black/5 text-carbon/40" },
  no_asignado: { label: "Sin asignar", clase: "bg-amber-100 text-amber-700" },
  ea_listo: { label: "EA listo", clase: "bg-sky-100 text-sky-700" },
  en_curso: { label: "En curso", clase: "bg-lima-soft text-lima-dark" },
  en_pausa: { label: "En pausa", clase: "bg-amber-100 text-amber-700" },
  listo: { label: "Proyecto listo", clase: "bg-emerald-100 text-emerald-700" },
};

export const ESTADO_ETAPA: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente", clase: "bg-black/5 text-carbon/45" },
  en_curso: { label: "En curso", clase: "bg-amber-100 text-amber-700" },
  terminada: { label: "Hecho", clase: "bg-emerald-100 text-emerald-700" },
  reabierta: { label: "Reabierta", clase: "bg-sky-100 text-sky-700" },
  no_aplica: { label: "N/A", clase: "bg-black/[0.03] text-carbon/30" },
};

export const REVISION_ESTADO: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Revisión pendiente", clase: "bg-black/5 text-carbon/45" },
  en_cola: { label: "En cola de revisión", clase: "bg-amber-100 text-amber-700" },
  corrigiendo: { label: "Corrigiendo", clase: "bg-amber-100 text-amber-700" },
  ok: { label: "OK Daniel · listo para visar", clase: "bg-emerald-100 text-emerald-700" },
  no_requerido: { label: "Revisión N/R", clase: "bg-black/[0.03] text-carbon/30" },
};

export const PASO_LABEL: Record<string, string> = {
  escaneo: "Escaneo",
  montaje_nube: "Nube",
  estado_actual: "Estado actual",
  proyecto: "Proyecto",
};

/** Responsable a mostrar: persona de equipo, o el nombre crudo, o null. */
export function responsableDe(e: EtapaProyecto): string | null {
  return e.equipo?.nombre ?? e.responsable_nombre ?? null;
}

const SELECT =
  "id,estado,tipo,pagador,comercial_interno,proyecto_externo,fecha_contratado,condicion_arranque,arranque_cumplido," +
  "arranque_referencia,arranque_fecha,cee_estado,revision_estado,notas," +
  "entidad_responsable,modalidad_licencia,requiere_visado,requiere_licencia,ecu_visto_bueno," +
  "etapas_proyecto(id,tipo_etapa,orden,estado,fecha_inicio,fecha_prevista,fecha_fin,responsable_tecnico_id,responsable_nombre,equipo(nombre))," +
  "proyecto_tipos(tipos_proyecto(clave,nombre,naturaleza))";

// ---- Consultas ----

/** Proyectos de una comunidad con sus pasos (etapas) y responsables. */
export async function proyectosDeComunidad(comunidadId: string): Promise<Proyecto[]> {
  const filas = await rest<Proyecto[]>(
    `proyectos?select=${SELECT}&comunidad_id=eq.${comunidadId}&order=creado_en.asc`,
  );
  for (const p of filas) {
    p.etapas_proyecto = (p.etapas_proyecto ?? []).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  }
  return filas;
}

export type TipoCatalogo = TipoProyecto & { id: string; parent_id: string | null };

/** Catalogo de tipos (para los checkboxes de edicion). Padres e hijos, por orden. */
export function listarTiposProyecto(): Promise<TipoCatalogo[]> {
  return rest<TipoCatalogo[]>(
    "tipos_proyecto?select=id,clave,nombre,naturaleza,parent_id,orden&activo=is.true&order=orden.asc",
  );
}

// ---- Estado del proyecto: los 8 PUNTOS (una lista lineal, derivada del avance) ----
// Ver memoria modelo-estado-proyecto. Pausado y aplicabilidad de fases (no_aplica)
// se SUPERPONEN, no son puntos.

export const PUNTOS: { clave: string; label: string; necesitaTecnico?: boolean }[] = [
  { clave: "pendiente_cobro", label: "Pendiente de cobro" },
  { clave: "pendiente_escaneo", label: "Pendiente de escaneo" },
  { clave: "pendiente_nube", label: "Pendiente de nube" },
  { clave: "pendiente_estado_actual", label: "Pendiente de estado actual", necesitaTecnico: true },
  { clave: "pendiente_tecnico", label: "Pendiente de técnico", necesitaTecnico: true },
  { clave: "en_desarrollo", label: "En desarrollo" },
  { clave: "pendiente_revision", label: "Pendiente de revisión de Daniel" },
  { clave: "pendiente_ecu", label: "Pendiente de trámite ECU" },
  { clave: "listo_para_visar", label: "Listo para visar" },
];
export const PUNTO_LABEL: Record<string, string> = Object.fromEntries(PUNTOS.map((p) => [p.clave, p.label]));

// Las fases (unidades de trabajo) del ciclo, para el stepper.
export const CICLO_PROYECTO: { clave: string; label: string }[] = [
  { clave: "escaneo", label: "Escaneo" },
  { clave: "montaje_nube", label: "Nube" },
  { clave: "estado_actual", label: "Estado actual" },
  { clave: "proyecto", label: "Solución" },
  { clave: "revision", label: "Revisión de Daniel" },
];

type PasoEstado = { tipo_etapa: string; estado: string };

/** El punto actual (1 de los 9), derivado del gate + pasos aplicables + revision + via. */
function computePunto(
  arranqueCumplido: boolean,
  pasos: PasoEstado[],
  revisionEstado: string | null,
  entidad: string | null,
  ecuVistoBueno: boolean,
): string {
  if (!arranqueCumplido) return "pendiente_cobro";
  const byKey: Record<string, string> = {};
  for (const e of pasos) byKey[e.tipo_etapa] = e.estado;
  for (const paso of ["escaneo", "montaje_nube", "estado_actual", "proyecto"]) {
    const est = byKey[paso];
    if (est === undefined || est === "no_aplica" || est === "terminada") continue; // fase cerrada o retirada
    if (paso === "escaneo") return "pendiente_escaneo";
    if (paso === "montaje_nube") return "pendiente_nube";
    if (paso === "estado_actual") return "pendiente_estado_actual";
    // solucion: si ya tiene tecnico trabajando -> en desarrollo; si no -> pendiente de tecnico
    return est === "en_curso" ? "en_desarrollo" : "pendiente_tecnico";
  }
  // Proyecto tecnicamente terminado: el OK de Daniel abre la puerta segun la via.
  if (revisionEstado !== "ok") return "pendiente_revision";
  // Por ECU: primero la ECU da el visto bueno (arreglar fallos), luego se visa.
  if (entidad === "ecu" && !ecuVistoBueno) return "pendiente_ecu";
  return "listo_para_visar";
}

/** Punto actual de un Proyecto completo (para el stepper/detalle). */
export function puntoDe(p: Proyecto): string {
  return computePunto(p.arranque_cumplido, p.etapas_proyecto, p.revision_estado, p.entidad_responsable, p.ecu_visto_bueno);
}

/** Estado a mostrar: 'pausado' si esta en pausa, si no el punto. */
export function estadoMostrado(p: Proyecto): { pausado: boolean; punto: string } {
  return { pausado: p.estado === "en_pausa", punto: puntoDe(p) };
}

export type ProyectoFila = {
  proyectoId: string;
  comunidadId: string;
  comunidadNombre: string;
  municipio: string | null;
  punto: string;
  pausado: boolean;
  fechaContratado: string | null;
  pagador: string | null;
  comercialInterno: string | null;
  tipos: string[];
  responsableActual: string | null; // responsable de la fase en curso (si aplica)
  fechaFaseActual: string | null;    // fecha de inicio/prevista de la fase actual
  notas: string | null;
};

type FilaCruda = {
  id: string;
  estado: string;
  arranque_cumplido: boolean;
  revision_estado: string | null;
  entidad_responsable: string | null;
  ecu_visto_bueno: boolean;
  fecha_contratado: string | null;
  pagador: string | null;
  comercial_interno: string | null;
  notas: string | null;
  comunidad_id: string;
  comunidades: { nombre: string; municipio: string | null } | null;
  etapas_proyecto: {
    tipo_etapa: string;
    estado: string;
    fecha_inicio: string | null;
    fecha_prevista: string | null;
    responsable_nombre: string | null;
    equipo: { nombre: string } | null;
  }[];
  proyecto_tipos: { tipos_proyecto: { nombre: string } }[];
};

// Mapea el punto a la fase (paso) cuya info (responsable/fecha) es relevante.
const PUNTO_A_PASO: Record<string, string> = {
  pendiente_escaneo: "escaneo",
  pendiente_nube: "montaje_nube",
  pendiente_estado_actual: "estado_actual",
  pendiente_tecnico: "proyecto",
  en_desarrollo: "proyecto",
};

/** Todos los proyectos con su punto + contexto (para el panel filtrable). */
export async function proyectosPorPunto(): Promise<ProyectoFila[]> {
  const filas = await rest<FilaCruda[]>(
    "proyectos?select=id,estado,arranque_cumplido,revision_estado,entidad_responsable,ecu_visto_bueno,fecha_contratado,pagador,comercial_interno,notas," +
      "comunidad_id,comunidades(nombre,municipio)," +
      "etapas_proyecto(tipo_etapa,estado,fecha_inicio,fecha_prevista,responsable_nombre,equipo(nombre))," +
      "proyecto_tipos(tipos_proyecto(nombre))&limit=2000",
  );
  return filas
    .filter((f) => f.estado !== "no_procede") // servicios sin pipeline: fuera del panel
    .map((f) => {
      const punto = computePunto(f.arranque_cumplido, f.etapas_proyecto, f.revision_estado, f.entidad_responsable, f.ecu_visto_bueno);
      const pasoRel = PUNTO_A_PASO[punto];
      const etapa = pasoRel ? f.etapas_proyecto.find((e) => e.tipo_etapa === pasoRel) : undefined;
      return {
        proyectoId: f.id,
        comunidadId: f.comunidad_id,
        comunidadNombre: f.comunidades?.nombre ?? "—",
        municipio: f.comunidades?.municipio ?? null,
        punto,
        pausado: f.estado === "en_pausa",
        fechaContratado: f.fecha_contratado,
        pagador: f.pagador,
        comercialInterno: f.comercial_interno,
        tipos: (f.proyecto_tipos ?? []).map((t) => t.tipos_proyecto?.nombre).filter(Boolean),
        responsableActual: etapa ? (etapa.equipo?.nombre ?? etapa.responsable_nombre ?? null) : null,
        fechaFaseActual: etapa ? (etapa.fecha_inicio ?? etapa.fecha_prevista) : null,
        notas: f.notas,
      };
    })
    .sort((a, b) => a.comunidadNombre.localeCompare(b.comunidadNombre, "es"));
}

export type Revision = {
  id: string;
  ronda: number;
  descripcion: string;
  estado: string;
  fecha_recepcion: string | null;
  fecha_respuesta: string | null;
  responsable_nombre: string | null;
};

/** Rondas de la revision interna de Daniel de un proyecto (mas reciente primero). */
export function revisionesDeProyecto(proyectoId: string): Promise<Revision[]> {
  return rest<Revision[]>(
    `requerimientos_tramitacion?select=id,ronda,descripcion,estado,fecha_recepcion,fecha_respuesta,responsable_nombre` +
      `&proyecto_id=eq.${proyectoId}&origen=eq.revision_interna&order=ronda.desc`,
  );
}

export type ResumenProyecto = {
  hay: boolean;
  num: number;
  principal: Proyecto | null;
  // "abierto" = calculado al vuelo: ni no_procede ni... (sin CFO todavia; CFO llega en obra)
  abiertos: number;
};

/** Resumen para la ventanita del expediente (sin precalcular nada persistido). */
export async function resumenProyectoComunidad(comunidadId: string): Promise<ResumenProyecto> {
  const ps = await proyectosDeComunidad(comunidadId);
  // abierto = aun no esta listo para visar y no es "no procede"
  const abiertos = ps.filter((p) => p.estado !== "no_procede" && puntoDe(p) !== "listo_para_visar").length;
  const principal = ps.find((p) => p.estado !== "no_procede") ?? ps[0] ?? null;
  return { hay: ps.length > 0, num: ps.length, principal, abiertos };
}

// ---- Cartera de proyectos de un COMERCIAL (vista del area comercial) ----
// Por comercial_id = responsable ACTUAL (quien lo lleva hoy; ver migracion
// proyecto_comercial_vinculo y memoria comercial-en-proyecto-captador-responsable).

export type ProyectoComercialFila = {
  proyectoId: string;
  comunidadId: string | null;
  comunidadNombre: string;
  municipio: string | null;
  estado: string;
  fechaContratado: string | null;
  pagador: string | null;
  tipos: string[];
};

/** Proyectos que un comercial lleva hoy (comercial_id), recientes primero. */
export async function proyectosDeComercial(comercialId: string): Promise<ProyectoComercialFila[]> {
  const filas = await rest<{
    id: string;
    estado: string;
    tipo: string | null;
    fecha_contratado: string | null;
    pagador: string | null;
    comunidad_id: string | null;
    comunidades: { nombre: string; municipio: string | null } | null;
    proyecto_tipos: { tipos_proyecto: { nombre: string } | null }[];
  }[]>(
    "proyectos?select=id,estado,tipo,fecha_contratado,pagador,comunidad_id," +
      "comunidades(nombre,municipio),proyecto_tipos(tipos_proyecto(nombre))" +
      `&comercial_id=eq.${comercialId}&order=fecha_contratado.desc.nullslast&limit=2000`,
  );
  return filas.map((f) => {
    const tipos = (f.proyecto_tipos ?? []).map((t) => t.tipos_proyecto?.nombre).filter((x): x is string => !!x);
    return {
      proyectoId: f.id,
      comunidadId: f.comunidad_id,
      comunidadNombre: f.comunidades?.nombre ?? "—",
      municipio: f.comunidades?.municipio ?? null,
      estado: f.estado,
      fechaContratado: f.fecha_contratado,
      pagador: f.pagador,
      tipos: tipos.length ? tipos : (f.tipo ? [f.tipo] : []),
    };
  });
}
