"use server";

// Escritura de TRES PRESUPUESTOS. Reglas del dominio que se hacen cumplir aqui:
//  - rol_pretendido (preferida/palanca) solo tiene sentido en invitadas nuestras;
//    si el presupuesto lo aporta la comunidad, se fuerza rol='na' (CHECK en BD).
//  - un unico ganador por licitacion: al marcar uno, los demas adjudicados pasan a
//    no_adjudicada y la licitacion pasa a 'adjudicada'.

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
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
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
  revalidatePath(`/comunidades/${comunidadId}/tres-presupuestos`);
  revalidatePath(`/expediente/${comunidadId}`);
  revalidatePath("/tres-presupuestos");
}

// ---- Licitacion ----

export async function crearLicitacion(comunidadId: string, proyectoId: string) {
  await req("licitaciones", "POST", { proyecto_id: proyectoId, estado: "abierta" });
  refrescar(comunidadId);
}

export async function actualizarLicitacion(comunidadId: string, licitacionId: string, fd: FormData) {
  await req(`licitaciones?id=eq.${licitacionId}`, "PATCH", {
    estado: txt(fd, "estado") ?? "abierta",
    esperando_de: txt(fd, "esperando_de"),
    acta_votacion_enlace: txt(fd, "acta_votacion_enlace"),
    fecha_votacion: txt(fd, "fecha_votacion"),
    informe_adecuacion_enlace: txt(fd, "informe_adecuacion_enlace"),
    notas: txt(fd, "notas"),
  });
  refrescar(comunidadId);
}

export async function borrarLicitacion(comunidadId: string, licitacionId: string) {
  await req(`presupuestos_licitacion?licitacion_id=eq.${licitacionId}`, "DELETE");
  await req(`licitaciones?id=eq.${licitacionId}`, "DELETE");
  refrescar(comunidadId);
}

// ---- Presupuestos ----

export async function anadirPresupuesto(comunidadId: string, licitacionId: string, fd: FormData) {
  const contrataId = txt(fd, "contrata_id");
  const externa = txt(fd, "contrata_externa_nombre");
  if (!contrataId && !externa) return; // identidad_check: hace falta una contrata
  const origen = txt(fd, "origen") ?? "invitada_por_nosotros";
  const rol = origen === "invitada_por_nosotros" ? txt(fd, "rol_pretendido") ?? "na" : "na";
  await req("presupuestos_licitacion", "POST", {
    licitacion_id: licitacionId,
    contrata_id: contrataId,
    contrata_externa_nombre: contrataId ? null : externa,
    origen,
    rol_pretendido: rol,
    importe_pem: num(fd, "importe_pem"),
    estado: "presupuestado",
    firmado_contrata: bool(fd, "firmado_contrata"),
    enlace_documento: txt(fd, "enlace_documento"),
    fecha_presupuesto: txt(fd, "fecha_presupuesto"),
  });
  refrescar(comunidadId);
}

export async function actualizarPresupuesto(comunidadId: string, presupuestoId: string, fd: FormData) {
  const contrataId = txt(fd, "contrata_id");
  const externa = txt(fd, "contrata_externa_nombre");
  const origen = txt(fd, "origen") ?? "invitada_por_nosotros";
  const rol = origen === "invitada_por_nosotros" ? txt(fd, "rol_pretendido") ?? "na" : "na";
  await req(`presupuestos_licitacion?id=eq.${presupuestoId}`, "PATCH", {
    contrata_id: contrataId,
    contrata_externa_nombre: contrataId ? null : externa,
    origen,
    rol_pretendido: rol,
    importe_pem: num(fd, "importe_pem"),
    estado: txt(fd, "estado") ?? "presupuestado",
    firmado_contrata: bool(fd, "firmado_contrata"),
    firmado_comunidad: bool(fd, "firmado_comunidad"),
    enlace_documento: txt(fd, "enlace_documento"),
    fecha_presupuesto: txt(fd, "fecha_presupuesto"),
    notas: txt(fd, "notas"),
  });
  refrescar(comunidadId);
}

export async function borrarPresupuesto(comunidadId: string, presupuestoId: string) {
  await req(`presupuestos_licitacion?id=eq.${presupuestoId}`, "DELETE");
  refrescar(comunidadId);
}

/** Marca un presupuesto como ganador: unico adjudicado, y la licitacion pasa a adjudicada. */
export async function marcarGanador(comunidadId: string, licitacionId: string, presupuestoId: string) {
  // los que estaban adjudicados dejan de estarlo
  await req(
    `presupuestos_licitacion?licitacion_id=eq.${licitacionId}&estado=eq.adjudicada`,
    "PATCH",
    { estado: "no_adjudicada" },
  );
  await req(`presupuestos_licitacion?id=eq.${presupuestoId}`, "PATCH", { estado: "adjudicada" });
  await req(`licitaciones?id=eq.${licitacionId}`, "PATCH", { estado: "adjudicada" });
  refrescar(comunidadId);
}
