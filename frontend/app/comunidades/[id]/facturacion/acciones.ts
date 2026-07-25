"use server";

// Escritura de FACTURACION (libro Accesalia). La app es TORRE DE CONTROL: no emite
// la factura fiscal (eso Factusol), registra su nº y guarda el PDF, y lleva el
// estado del hito (pendiente -> facturado -> cobrado, o devuelto). Los hitos son
// FLEXIBLES: se pueden trocear (renegociacion).

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
function num(fd: FormData, k: string): number | null {
  const v = txt(fd, k);
  if (v === null) return null;
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function int(fd: FormData, k: string): number | null {
  const v = txt(fd, k);
  if (v === null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
async function req(path: string, method: string, body?: unknown) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: cab({ Prefer: "return=minimal" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${await res.text()}`);
}
function refrescar(comunidadId: string) {
  revalidatePath(`/comunidades/${comunidadId}/facturacion`);
  revalidatePath(`/expediente/${comunidadId}`);
  revalidatePath("/facturacion");
}

/** Sube el PDF de la factura al bucket 'facturas' y devuelve su URL publica. */
async function subirFacturaPdf(hitoId: string, file: File): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const limpio = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${hitoId}/${Date.now()}-${limpio}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const res = await fetch(`${URL_BASE}/storage/v1/object/facturas/${path}`, {
    method: "POST",
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": file.type || "application/pdf", "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage: ${await res.text()}`);
  return `${URL_BASE}/storage/v1/object/public/facturas/${path}`;
}

/** Registra/edita un hito de cobro: estado, factura (nº + PDF), fechas, cobro, devolucion. */
export async function actualizarHito(comunidadId: string, hitoId: string, fd: FormData) {
  const file = fd.get("factura_pdf") as File | null;
  const nuevaUrl = file && file.size > 0 ? await subirFacturaPdf(hitoId, file) : null;

  await req(`hitos_cobro?id=eq.${hitoId}`, "PATCH", {
    hito: txt(fd, "hito") ?? "otro",
    importe: num(fd, "importe"),
    porcentaje: num(fd, "porcentaje"),
    estado: txt(fd, "estado") ?? "pendiente",
    numero_factura: txt(fd, "numero_factura"),
    numero_abono: txt(fd, "numero_abono"),
    fecha_factura: txt(fd, "fecha_factura"),
    fecha_vencimiento: txt(fd, "fecha_vencimiento"),
    fecha_cobro: txt(fd, "fecha_cobro"),
    gastos_devolucion: num(fd, "gastos_devolucion"),
    notas: txt(fd, "notas"),
    ...(nuevaUrl ? { url_factura_pdf: nuevaUrl } : {}),
  });
  refrescar(comunidadId);
}

/** Añade un hito a una linea (para trocear un cobro renegociado). */
export async function anadirHito(comunidadId: string, lineaId: string, fd: FormData) {
  await req("hitos_cobro", "POST", {
    linea_facturacion_id: lineaId,
    hito: txt(fd, "hito") ?? "otro",
    orden: int(fd, "orden") ?? 0,
    porcentaje: num(fd, "porcentaje"),
    importe: num(fd, "importe"),
    estado: "pendiente",
  });
  refrescar(comunidadId);
}

export async function borrarHito(comunidadId: string, hitoId: string) {
  await req(`hitos_cobro?id=eq.${hitoId}`, "DELETE");
  refrescar(comunidadId);
}

/** Ajusta la linea: importe, emisor y marcar como verificada (dejar de ser estimado de Monday). */
export async function actualizarLinea(comunidadId: string, lineaId: string, fd: FormData) {
  await req(`lineas_facturacion?id=eq.${lineaId}`, "PATCH", {
    descripcion: txt(fd, "descripcion"),
    importe: num(fd, "importe"),
    emisor: txt(fd, "emisor") ?? "accesalia",
    verificado: fd.get("verificado") === "on",
    notas: txt(fd, "notas"),
  });
  refrescar(comunidadId);
}
