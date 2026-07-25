"use server";

// Escritura de la fase VISADO (colegio COAM). Mismo patron REST + server actions.
// Los requerimientos del COAM reutilizan requerimientos_tramitacion (origen='coam').

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
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
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
  revalidatePath(`/comunidades/${comunidadId}/visado`);
  revalidatePath(`/expediente/${comunidadId}`);
  revalidatePath("/visado");
}

/** Abre un visado para un proyecto (por defecto, del proyecto y pte de enviar). */
export async function crearVisado(comunidadId: string, proyectoId: string, fd: FormData) {
  await req("visados", "POST", {
    proyecto_id: proyectoId,
    momento: txt(fd, "momento") ?? "proyecto",
    tipo: txt(fd, "tipo"),
    estado: "pendiente_enviar",
    organismo: txt(fd, "organismo") ?? "COAM",
  });
  refrescar(comunidadId);
}

/** Edita un visado: estado, tipo, codigo TL, tasa, pagos, fechas, entrega, pausa. */
export async function actualizarVisado(comunidadId: string, visadoId: string, fd: FormData) {
  await req(`visados?id=eq.${visadoId}`, "PATCH", {
    momento: txt(fd, "momento") ?? "proyecto",
    tipo: txt(fd, "tipo"),
    estado: txt(fd, "estado") ?? "pendiente_enviar",
    organismo: txt(fd, "organismo") ?? "COAM",
    referencia: txt(fd, "referencia"),
    tasa: num(fd, "tasa"),
    pagado: bool(fd, "pagado"),
    fecha_envio: txt(fd, "fecha_envio"),
    fecha_visado: txt(fd, "fecha_visado"),
    fecha_descarga: txt(fd, "fecha_descarga"),
    entregado_al_pagador: bool(fd, "entregado_al_pagador"),
    tramita_equipo_id: txt(fd, "tramita_equipo_id"),
    pausado: bool(fd, "pausado"),
    notas: txt(fd, "notas"),
  });
  refrescar(comunidadId);
}

/** Elimina un visado (p.ej. creado por error). */
export async function borrarVisado(comunidadId: string, visadoId: string) {
  await req(`visados?id=eq.${visadoId}`, "DELETE");
  refrescar(comunidadId);
}

/** Requerimiento del COAM (rondas). Deja traza y marca el visado como 'requerido'. */
export async function registrarRequerimientoCoam(comunidadId: string, proyectoId: string, visadoId: string, fd: FormData) {
  const resuelto = txt(fd, "resultado") === "resuelto";
  const desc = txt(fd, "descripcion");
  const hoy = new Date().toISOString().slice(0, 10);

  const previas = (await req(
    `requerimientos_tramitacion?proyecto_id=eq.${proyectoId}&origen=eq.coam&select=ronda&order=ronda.desc&limit=1`,
    "GET",
    undefined,
    true,
  )) as { ronda: number }[];
  const ronda = (previas[0]?.ronda ?? 0) + 1;

  await req("requerimientos_tramitacion", "POST", {
    proyecto_id: proyectoId,
    origen: "coam",
    descripcion: desc ?? "Requerimiento del COAM",
    tipo_resolucion: "tecnica",
    fecha_recepcion: hoy,
    fecha_respuesta: resuelto ? hoy : null,
    estado: resuelto ? "cerrado" : "abierto",
    ronda,
    responsable_nombre: "COAM",
  });
  // El requerimiento reabre el visado; al resolver vuelve a 'enviado' (a la espera).
  await req(`visados?id=eq.${visadoId}`, "PATCH", { estado: resuelto ? "enviado" : "requerido" });
  refrescar(comunidadId);
}
