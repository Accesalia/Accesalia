"use server";

// Escritura del area de PROYECTO. Mismo patron REST con clave secreta que el
// resto del CRM (server actions + revalidatePath). Sin login por ahora.

import { revalidatePath } from "next/cache";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

function cab(extra: Record<string, string> = {}) {
  return { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json", ...extra };
}
function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}
function bool(fd: FormData, k: string): boolean {
  return fd.get(k) === "on";
}
async function req(path: string, method: string, body?: unknown, repr = false) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: cab({ Prefer: repr ? "return=representation" : "return=minimal" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${await res.text()}`);
  return repr ? (await res.json()) : null;
}
function refrescar(comunidadId: string) {
  revalidatePath(`/comunidades/${comunidadId}/proyecto`);
  revalidatePath(`/expediente/${comunidadId}`);
}

/** Crea un proyecto vacio para una comunidad, con los 4 pasos base en pendiente. */
export async function crearProyecto(comunidadId: string) {
  const [p] = await req("proyectos", "POST", { comunidad_id: comunidadId, estado: "no_asignado" }, true);
  const base = [
    ["escaneo", 10],
    ["montaje_nube", 20],
    ["estado_actual", 30],
    ["proyecto", 40],
  ] as const;
  await req(
    "etapas_proyecto",
    "POST",
    base.map(([tipo_etapa, orden]) => ({ proyecto_id: p.id, tipo_etapa, orden, estado: "pendiente" })),
  );
  refrescar(comunidadId);
}

/** Cabecera del proyecto: situacion (en_curso/pausado/no_procede), CEE, externo,
 *  gate de cobro y nota (causa de pausa). El "punto" no se edita: se deriva. */
export async function actualizarProyecto(comunidadId: string, proyectoId: string, fd: FormData) {
  await req(`proyectos?id=eq.${proyectoId}`, "PATCH", {
    estado: txt(fd, "estado") ?? "en_curso",
    cee_estado: txt(fd, "cee_estado"),
    proyecto_externo: bool(fd, "proyecto_externo"),
    condicion_arranque: txt(fd, "condicion_arranque"),
    arranque_cumplido: bool(fd, "arranque_cumplido"),
    arranque_referencia: txt(fd, "arranque_referencia"),
    arranque_fecha: txt(fd, "arranque_fecha"),
    notas: txt(fd, "notas"),
  });
  refrescar(comunidadId);
}

/** Via de licencia: entidad (ayuntamiento/ecu) + modalidad (DR/licencia) + si se
 *  visa + visto bueno de la ECU. Gobierna el "OK de Daniel" (por ECU el proyecto
 *  no salta a "listo para visar" sino a "pendiente de tramite ECU"). */
export async function actualizarVia(comunidadId: string, proyectoId: string, fd: FormData) {
  await req(`proyectos?id=eq.${proyectoId}`, "PATCH", {
    entidad_responsable: txt(fd, "entidad_responsable"),
    modalidad_licencia: txt(fd, "modalidad_licencia"),
    requiere_visado: bool(fd, "requiere_visado"),
    ecu_visto_bueno: bool(fd, "ecu_visto_bueno"),
  });
  refrescar(comunidadId);
}

/** Modificar fases: retira (no_aplica) o reactiva (pendiente) fases del proyecto. */
export async function modificarFases(comunidadId: string, proyectoId: string, fd: FormData) {
  for (const clave of ["escaneo", "montaje_nube", "estado_actual", "proyecto"]) {
    const aplica = fd.get(`aplica_${clave}`) === "on";
    if (aplica) {
      // reactivar solo las retiradas (no tocar las ya hechas)
      await req(`etapas_proyecto?proyecto_id=eq.${proyectoId}&tipo_etapa=eq.${clave}&estado=eq.no_aplica`, "PATCH", { estado: "pendiente" });
    } else {
      // retirar solo las no terminadas
      await req(`etapas_proyecto?proyecto_id=eq.${proyectoId}&tipo_etapa=eq.${clave}&estado=neq.terminada`, "PATCH", { estado: "no_aplica" });
    }
  }
  refrescar(comunidadId);
}

/** Un paso: responsable (persona de equipo), estado y fechas (para desviacion). */
export async function actualizarPaso(comunidadId: string, etapaId: string, fd: FormData) {
  const resp = txt(fd, "responsable"); // uuid de equipo o null
  await req(`etapas_proyecto?id=eq.${etapaId}`, "PATCH", {
    responsable_equipo_id: resp,
    responsable_nombre: resp ? null : txt(fd, "responsable_nombre"),
    estado: txt(fd, "estado") ?? "pendiente",
    fecha_inicio: txt(fd, "fecha_inicio"),
    fecha_prevista: txt(fd, "fecha_prevista"),
    fecha_fin: txt(fd, "fecha_fin"),
  });
  refrescar(comunidadId);
}

/** Registra una ronda de revision de Daniel (traza de QUE se cambio) + rollup. */
export async function registrarRevision(comunidadId: string, proyectoId: string, fd: FormData) {
  const resultado = txt(fd, "resultado") ?? "cambios"; // 'ok' | 'cambios'
  const cambios = txt(fd, "cambios");
  const hoy = new Date().toISOString().slice(0, 10);

  // siguiente numero de ronda
  const previas = (await req(
    `requerimientos_tramitacion?proyecto_id=eq.${proyectoId}&origen=eq.revision_interna&select=ronda&order=ronda.desc&limit=1`,
    "GET",
    undefined,
    true,
  )) as { ronda: number }[];
  const ronda = (previas[0]?.ronda ?? 0) + 1;

  await req("requerimientos_tramitacion", "POST", {
    proyecto_id: proyectoId,
    origen: "revision_interna",
    descripcion: cambios ?? (resultado === "ok" ? "Aprobado sin cambios" : "Cambios solicitados"),
    tipo_resolucion: "tecnica",
    fecha_recepcion: hoy,
    fecha_respuesta: hoy,
    estado: resultado === "ok" ? "cerrado" : "abierto",
    ronda,
    responsable_nombre: "Daniel",
  });
  await req(`proyectos?id=eq.${proyectoId}`, "PATCH", {
    revision_estado: resultado === "ok" ? "ok" : "corrigiendo",
  });
  refrescar(comunidadId);
}

/** Tags de tipo del proyecto (checkboxes): borra y reinserta. */
export async function actualizarTipos(comunidadId: string, proyectoId: string, fd: FormData) {
  await req(`proyecto_tipos?proyecto_id=eq.${proyectoId}`, "DELETE");
  const ids = fd.getAll("tipo_id").map(String).filter(Boolean);
  if (ids.length) {
    await req(
      "proyecto_tipos",
      "POST",
      ids.map((tipo_id) => ({ proyecto_id: proyectoId, tipo_id })),
    );
  }
  refrescar(comunidadId);
}
