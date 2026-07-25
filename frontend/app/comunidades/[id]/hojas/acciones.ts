"use server";

// Generador de HOJAS DE ENCARGO. Ensambla la entidad completa desde la seleccion
// de conceptos del comercial:
//   hoja_encargo (carpeta, estado borrador)
//     └─ versiones_hoja v1 (importes)
//         └─ conceptos_hoja (un item por bloque marcado)
//     └─ historial (borrador)
// Mismo patron REST con clave secreta que el resto del CRM.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

function cabeceras(extra: Record<string, string> = {}) {
  return { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json", ...extra };
}
function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}
function nOrNull(fd: FormData, k: string): number | null {
  const v = txt(fd, k);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
async function post<T>(tabla: string, body: unknown, repr = false): Promise<T> {
  const res = await fetch(`${URL_BASE}/rest/v1/${tabla}`, {
    method: "POST",
    headers: cabeceras({ Prefer: repr ? "return=representation" : "return=minimal" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`No se pudo crear ${tabla}: ${await res.text()}`);
  return (repr ? (await res.json())[0] : null) as T;
}

export async function crearHojaEncargo(comunidadId: string, fd: FormData) {
  const hoy = new Date().toISOString().slice(0, 10);
  const pagadorTipo = txt(fd, "pagador_tipo") ?? "comunidad";
  const contrataId = pagadorTipo === "contrata" ? txt(fd, "pagador_contrata_id") : null;
  if (pagadorTipo === "contrata" && !contrataId) {
    throw new Error("Si paga la contrata, hay que elegir cuál.");
  }

  // 1) La hoja (carpeta) en borrador.
  const hoja = await post<{ id: string }>(
    "hojas_encargo",
    {
      comunidad_id: comunidadId,
      descripcion: txt(fd, "descripcion"),
      pagador_tipo: pagadorTipo,
      pagador_contrata_id: contrataId,
      emisor: txt(fd, "emisor") ?? "accesalia",
      canal_tarifa: txt(fd, "canal_tarifa"),
      vigencia_meses: nOrNull(fd, "vigencia_meses") ?? 3,
      generada_por: txt(fd, "generada_por"),
      numero_hoja: txt(fd, "numero_hoja"),
      estado: "borrador",
      fecha_creacion: hoy,
      fecha_estado: `${hoy}T00:00:00Z`,
    },
    true,
  );

  // 2) Version v1 con los importes calculados en pantalla.
  const version = await post<{ id: string }>(
    "versiones_hoja",
    {
      hoja_encargo_id: hoja.id,
      numero_version: 1,
      fecha_generada: hoy,
      forma_pago: txt(fd, "forma_pago"),
      importe_base: nOrNull(fd, "importe_base"),
      iva_porcentaje: nOrNull(fd, "iva_porcentaje"),
      importe_total: nOrNull(fd, "importe_total"),
    },
    true,
  );

  // 3) Un concepto por bloque marcado. Re-consultamos el catalogo para saber los ids.
  const bloques = (await (
    await fetch(`${URL_BASE}/rest/v1/bloques?select=id&activo=eq.true`, { headers: cabeceras() })
  ).json()) as { id: string }[];
  const conceptos = bloques
    .filter((b) => fd.get(`concepto_${b.id}`) === "on")
    .map((b) => ({
      hoja_encargo_id: hoja.id,
      version_hoja_id: version.id,
      bloque_id: b.id,
      incluido: true,
      importe: nOrNull(fd, `importe_${b.id}`),
    }));
  if (conceptos.length > 0) await post("conceptos_hoja", conceptos);

  // 4) Historial de estado.
  await post("hojas_encargo_estado_historial", {
    hoja_encargo_id: hoja.id,
    estado: "borrador",
    fecha_estado: `${hoy}T00:00:00Z`,
  });

  revalidatePath(`/comunidades/${comunidadId}`);
  revalidatePath(`/comunidades/${comunidadId}/hojas`);
  redirect(`/comunidades/${comunidadId}/hojas`);
}

/** Cambia el estado de una hoja (p.ej. marcar firmada) y lo registra en el historial. */
export async function cambiarEstadoHoja(comunidadId: string, hojaId: string, fd: FormData) {
  const estado = txt(fd, "estado");
  if (!estado) throw new Error("Falta el estado.");
  const hoy = new Date().toISOString();
  const res = await fetch(`${URL_BASE}/rest/v1/hojas_encargo?id=eq.${hojaId}`, {
    method: "PATCH",
    headers: cabeceras(),
    body: JSON.stringify({ estado, fecha_estado: hoy }),
  });
  if (!res.ok) throw new Error(`No se pudo cambiar el estado: ${await res.text()}`);
  await fetch(`${URL_BASE}/rest/v1/hojas_encargo_estado_historial`, {
    method: "POST",
    headers: cabeceras({ Prefer: "return=minimal" }),
    body: JSON.stringify({ hoja_encargo_id: hojaId, estado, fecha_estado: hoy, notas: txt(fd, "notas") }),
  });
  revalidatePath(`/comunidades/${comunidadId}/hojas/${hojaId}`);
  revalidatePath(`/comunidades/${comunidadId}/hojas`);
  redirect(`/comunidades/${comunidadId}/hojas/${hojaId}`);
}
