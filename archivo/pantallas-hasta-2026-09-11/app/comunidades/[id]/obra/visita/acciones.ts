"use server";

// Actas de visita: crear/editar, subir fotos a Storage (bucket 'actas'),
// destinatarios "a informar" y marcar enviada. Patron REST con clave secreta.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

function cab(extra: Record<string, string> = {}) {
  return { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json", ...extra };
}
function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
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
function refrescar(comunidadId: string, obraId?: string) {
  revalidatePath(`/comunidades/${comunidadId}/obra`);
  if (obraId) revalidatePath(`/comunidades/${comunidadId}/obra`);
  revalidatePath("/obra");
}

/** Sube las fotos del FormData (campo 'fotos') al bucket y crea filas fotos_acta. */
async function subirFotos(visitaId: string, fd: FormData, ordenBase = 0) {
  const archivos = fd.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  let orden = ordenBase;
  const filas: { visita_id: string; storage_path: string; orden: number }[] = [];
  for (const archivo of archivos) {
    const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ruta = `${visitaId}/${orden}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const up = await fetch(`${URL_BASE}/storage/v1/object/actas/${ruta}`, {
      method: "POST",
      headers: cab({ "Content-Type": archivo.type || "image/jpeg", "x-upsert": "true" }),
      body: bytes,
    });
    if (!up.ok) throw new Error(`No se pudo subir la foto: ${await up.text()}`);
    filas.push({ visita_id: visitaId, storage_path: ruta, orden });
    orden++;
  }
  if (filas.length) await req("fotos_acta", "POST", filas);
}

/** Crea el acta (visita) con texto, fecha, autor y fotos; lleva al acta generada. */
export async function crearActa(comunidadId: string, obraId: string, fd: FormData) {
  // numero correlativo dentro de la obra
  const previas = (await req(
    `visitas_obra?obra_id=eq.${obraId}&select=numero&order=numero.desc.nullslast&limit=1`,
    "GET",
    undefined,
    true,
  )) as { numero: number | null }[];
  const numero = (previas[0]?.numero ?? 0) + 1;

  const [v] = await req(
    "visitas_obra",
    "POST",
    {
      obra_id: obraId,
      numero,
      fecha_visita: txt(fd, "fecha_visita") ?? new Date().toISOString().slice(0, 10),
      texto_acta: txt(fd, "texto_acta"),
      autor_tecnico_id: txt(fd, "autor_tecnico_id"),
    },
    true,
  );
  await subirFotos(v.id, fd);
  refrescar(comunidadId, obraId);
  redirect(`/comunidades/${comunidadId}/obra/visita/${v.id}`);
}

/** Edita el texto/fecha/autor del acta y anade fotos nuevas. */
export async function actualizarActa(comunidadId: string, visitaId: string, fd: FormData) {
  await req(`visitas_obra?id=eq.${visitaId}`, "PATCH", {
    fecha_visita: txt(fd, "fecha_visita") ?? new Date().toISOString().slice(0, 10),
    texto_acta: txt(fd, "texto_acta"),
    autor_tecnico_id: txt(fd, "autor_tecnico_id"),
  });
  const yaHay = (await req(`fotos_acta?visita_id=eq.${visitaId}&select=id`, "GET", undefined, true)) as unknown[];
  await subirFotos(visitaId, fd, yaHay.length);
  refrescar(comunidadId);
  revalidatePath(`/comunidades/${comunidadId}/obra/visita/${visitaId}`);
}

export async function borrarFoto(comunidadId: string, visitaId: string, fotoId: string, ruta: string) {
  await fetch(`${URL_BASE}/storage/v1/object/actas/${ruta}`, { method: "DELETE", headers: cab() });
  await req(`fotos_acta?id=eq.${fotoId}`, "DELETE");
  revalidatePath(`/comunidades/${comunidadId}/obra/visita/${visitaId}`);
}

/** Marca el acta como enviada (tras abrir el correo / firmarla). */
export async function marcarEnviada(comunidadId: string, visitaId: string) {
  await req(`visitas_obra?id=eq.${visitaId}`, "PATCH", { enviada: true, fecha_enviada: new Date().toISOString().slice(0, 10) });
  refrescar(comunidadId);
  revalidatePath(`/comunidades/${comunidadId}/obra/visita/${visitaId}`);
}

export async function borrarVisita(comunidadId: string, obraId: string, visitaId: string) {
  await req(`fotos_acta?visita_id=eq.${visitaId}`, "DELETE");
  await req(`visitas_obra?id=eq.${visitaId}`, "DELETE");
  refrescar(comunidadId, obraId);
  redirect(`/comunidades/${comunidadId}/obra`);
}

// ---- Destinatarios "a informar" ----

export async function anadirDestinatario(comunidadId: string, fd: FormData) {
  await req("destinatarios_informe", "POST", {
    comunidad_id: comunidadId,
    tipo: txt(fd, "tipo") ?? "otro",
    nombre: txt(fd, "nombre"),
    email: txt(fd, "email"),
  });
  revalidatePath(`/comunidades/${comunidadId}/obra`);
}

export async function borrarDestinatario(comunidadId: string, destinatarioId: string) {
  await req(`destinatarios_informe?id=eq.${destinatarioId}`, "DELETE");
  revalidatePath(`/comunidades/${comunidadId}/obra`);
}
