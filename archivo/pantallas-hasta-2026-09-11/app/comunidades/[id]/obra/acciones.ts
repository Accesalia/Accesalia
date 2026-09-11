"use server";

// Escritura de la fase OBRA (capa 1). Al marcar el CFO como a_visar/visado se
// genera (si no existe) un visado momento=fin_obra, cerrando el circulo con visado.

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
function int(fd: FormData, k: string): number | null {
  const v = txt(fd, k);
  if (v === null) return null;
  const n = parseInt(v, 10);
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
  revalidatePath(`/comunidades/${comunidadId}/obra`);
  revalidatePath(`/comunidades/${comunidadId}/visado`);
  revalidatePath(`/expediente/${comunidadId}`);
  revalidatePath("/obra");
}

/** Abre una obra para un proyecto (pendiente de inicio). */
export async function crearObra(comunidadId: string, proyectoId: string) {
  await req("obras", "POST", { proyecto_id: proyectoId, estado: "pendiente_inicio" });
  refrescar(comunidadId);
}

/** Edita una obra: estado, constructora, gate de inicio (CSS/PSS/acta/apertura), CFO. */
export async function actualizarObra(comunidadId: string, obraId: string, proyectoId: string, fd: FormData) {
  const cfoEstado = txt(fd, "cfo_estado");
  const contrataId = txt(fd, "constructora_contrata_id");

  // CFO -> visado momento=fin_obra (crea uno si aun no hay y ya toca visar)
  let cfoVisadoId: string | null | undefined = undefined;
  if (cfoEstado === "a_visar" || cfoEstado === "visado") {
    const obra = (await req(`obras?id=eq.${obraId}&select=cfo_visado_id`, "GET", undefined, true)) as { cfo_visado_id: string | null }[];
    const existente = obra[0]?.cfo_visado_id ?? null;
    if (!existente) {
      const hoy = new Date().toISOString().slice(0, 10);
      const [v] = await req(
        "visados",
        "POST",
        {
          proyecto_id: proyectoId,
          momento: "fin_obra",
          estado: cfoEstado === "visado" ? "visado" : "enviado",
          organismo: "COAM",
          fecha_visado: cfoEstado === "visado" ? txt(fd, "fecha_cfo_visado") ?? hoy : null,
          fecha_envio: txt(fd, "fecha_cfo_a_visar"),
        },
        true,
      );
      cfoVisadoId = v.id;
    }
  }

  await req(`obras?id=eq.${obraId}`, "PATCH", {
    estado: txt(fd, "estado") ?? "pendiente_inicio",
    constructora_contrata_id: contrataId,
    constructora: txt(fd, "constructora"),
    css_contratado: bool(fd, "css_contratado"),
    pss_aprobado: bool(fd, "pss_aprobado"),
    coordinador_css_nombre: txt(fd, "coordinador_css_nombre"),
    jefe_obra: txt(fd, "jefe_obra"),
    fecha_apertura_centro_trabajo: txt(fd, "fecha_apertura_centro_trabajo"),
    fecha_acta_inicio: txt(fd, "fecha_acta_inicio"),
    fecha_fin_obra: txt(fd, "fecha_fin_obra"),
    plazo_ejecucion_meses: int(fd, "plazo_ejecucion_meses"),
    cfo_estado: cfoEstado,
    fecha_cfo_a_visar: txt(fd, "fecha_cfo_a_visar"),
    fecha_cfo_visado: txt(fd, "fecha_cfo_visado"),
    notas: txt(fd, "notas"),
    ...(cfoVisadoId ? { cfo_visado_id: cfoVisadoId } : {}),
  });
  refrescar(comunidadId);
}

export async function borrarObra(comunidadId: string, obraId: string) {
  await req(`obras?id=eq.${obraId}`, "DELETE");
  refrescar(comunidadId);
}
