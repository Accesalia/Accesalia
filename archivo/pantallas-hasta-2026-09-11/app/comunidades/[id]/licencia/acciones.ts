"use server";

// Escritura de la fase LICENCIA (capa 1). Mismo patron REST + server actions.
// Los requerimientos reutilizan requerimientos_tramitacion (origen ayuntamiento/ecu).

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
function num(fd: FormData, k: string): number | null {
  const v = txt(fd, k);
  if (v === null) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
// Tri-estado para las banderas de tasa (sí / no / sin definir).
function triflag(fd: FormData, k: string): boolean | null {
  const v = txt(fd, k);
  return v === "si" ? true : v === "no" ? false : null;
}
async function req(path: string, method: string, body?: unknown, repr = false) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: cab({ Prefer: repr ? "return=representation" : "return=minimal" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${await res.text()}`);
  return repr ? await res.json() : null;
}
function refrescar(comunidadId: string) {
  revalidatePath(`/comunidades/${comunidadId}/licencia`);
  revalidatePath(`/expediente/${comunidadId}`);
  revalidatePath("/licencia");
}

/** Abre una licencia para un proyecto (pendiente de definir por defecto). */
export async function crearLicencia(comunidadId: string, proyectoId: string, fd: FormData) {
  await req("licencias", "POST", {
    proyecto_id: proyectoId,
    estado: txt(fd, "estado") ?? "pendiente_definir",
    tipo_tramite: txt(fd, "tipo_tramite"),
  });
  refrescar(comunidadId);
}

/** Edita una licencia: estado, tipo, organismo, fechas, tasas, gate DR, tramita. */
export async function actualizarLicencia(comunidadId: string, licenciaId: string, fd: FormData) {
  await req(`licencias?id=eq.${licenciaId}`, "PATCH", {
    estado: txt(fd, "estado") ?? "pendiente_definir",
    tipo_tramite: txt(fd, "tipo_tramite"),
    tramitada_por: txt(fd, "tramitada_por") ?? "nosotros",
    organismo: txt(fd, "organismo"),
    tecnico_ayto: txt(fd, "tecnico_ayto"),
    fecha_registro_ayto: txt(fd, "fecha_registro_ayto"),
    fecha_aprobacion: txt(fd, "fecha_aprobacion"),
    enlace_doc: txt(fd, "enlace_doc"),
    tasa_licencia_aplica: triflag(fd, "tasa_licencia_aplica"),
    tasa_licencia_importe: num(fd, "tasa_licencia_importe"),
    icio_aplica: triflag(fd, "icio_aplica"),
    icio_bonificacion: bool(fd, "icio_bonificacion"),
    icio_importe: num(fd, "icio_importe"),
    residuos_aplica: triflag(fd, "residuos_aplica"),
    residuos_importe: num(fd, "residuos_importe"),
    inicio_dr_autorizado: txt(fd, "inicio_dr_autorizado"),
    espera_subvencion: bool(fd, "espera_subvencion"),
    tramita_equipo_id: txt(fd, "tramita_equipo_id"),
    pausado: bool(fd, "pausado"),
    notas: txt(fd, "notas"),
  });
  refrescar(comunidadId);
}

export async function borrarLicencia(comunidadId: string, licenciaId: string) {
  await req(`licencias?id=eq.${licenciaId}`, "DELETE");
  refrescar(comunidadId);
}

/** Requerimiento de ayto/ECU (rondas). Deja traza y marca la licencia 'requerido'. */
export async function registrarRequerimientoLic(comunidadId: string, proyectoId: string, licenciaId: string, fd: FormData) {
  const origen = txt(fd, "origen") ?? "ayuntamiento"; // ayuntamiento | ecu
  const resuelto = txt(fd, "resultado") === "resuelto";
  const desc = txt(fd, "descripcion");
  const hoy = new Date().toISOString().slice(0, 10);

  const previas = (await req(
    `requerimientos_tramitacion?proyecto_id=eq.${proyectoId}&origen=in.(ayuntamiento,ecu)&select=ronda&order=ronda.desc&limit=1`,
    "GET",
    undefined,
    true,
  )) as { ronda: number }[];
  const ronda = (previas[0]?.ronda ?? 0) + 1;

  await req("requerimientos_tramitacion", "POST", {
    proyecto_id: proyectoId,
    origen,
    descripcion: desc ?? "Requerimiento",
    tipo_resolucion: "tecnica",
    fecha_recepcion: hoy,
    fecha_respuesta: resuelto ? hoy : null,
    estado: resuelto ? "cerrado" : "abierto",
    ronda,
    responsable_nombre: origen === "ecu" ? "ECU" : "Ayuntamiento",
  });
  await req(`licencias?id=eq.${licenciaId}`, "PATCH", { estado: resuelto ? "solicitada" : "requerido" });
  refrescar(comunidadId);
}
