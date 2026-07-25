"use server";

// Server actions de COMUNIDADES (el eje del ERP). Corren en el servidor con la
// clave secreta; escriben via REST de Supabase. Mismo patron que
// app/administraciones/acciones.ts.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

function cabeceras(extra: Record<string, string> = {}) {
  return {
    apikey: SECRETO,
    Authorization: `Bearer ${SECRETO}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}

function num(fd: FormData, k: string): number | null {
  const v = txt(fd, k);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---- Comunidad ----

function cuerpoComunidad(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (!nombre) throw new Error("El nombre de la comunidad es obligatorio.");
  return {
    nombre,
    direccion: txt(fd, "direccion"),
    cp: txt(fd, "cp"),
    municipio: txt(fd, "municipio"),
    provincia: txt(fd, "provincia"),
    cif_comunidad: txt(fd, "cif_comunidad"),
    referencia_catastral: txt(fd, "referencia_catastral"),
    anio_construccion: num(fd, "anio_construccion"),
    iban: txt(fd, "iban"),
    num_viviendas: num(fd, "num_viviendas"),
    administracion_id: txt(fd, "administracion_id"),
    activa: fd.get("activa") !== null,
  };
}

export async function crearComunidad(fd: FormData) {
  const res = await fetch(`${URL_BASE}/rest/v1/comunidades`, {
    method: "POST",
    headers: cabeceras({ Prefer: "return=representation" }),
    body: JSON.stringify(cuerpoComunidad(fd)),
  });
  if (!res.ok) throw new Error(`No se pudo crear la comunidad: ${await res.text()}`);
  const [creada] = (await res.json()) as { id: string }[];
  revalidatePath("/comunidades");
  redirect(`/comunidades/${creada.id}`);
}

export async function actualizarComunidad(id: string, fd: FormData) {
  const res = await fetch(`${URL_BASE}/rest/v1/comunidades?id=eq.${id}`, {
    method: "PATCH",
    headers: cabeceras(),
    body: JSON.stringify(cuerpoComunidad(fd)),
  });
  if (!res.ok) throw new Error(`No se pudo actualizar: ${await res.text()}`);
  revalidatePath("/comunidades");
  revalidatePath(`/comunidades/${id}`);
  redirect(`/comunidades/${id}`);
}

// ---- Personas de la comunidad (presidente, vecino de contacto...) ----

function cuerpoPersona(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (!nombre) throw new Error("El nombre de la persona es obligatorio.");
  return {
    nombre,
    rol: txt(fd, "rol") ?? "vecino",
    documento: txt(fd, "documento"),
    telefono: txt(fd, "telefono"),
    email: txt(fd, "email"),
    notas: txt(fd, "notas"),
    es_contacto_principal: fd.get("es_contacto_principal") !== null,
  };
}

export async function crearPersonaComunidad(comunidadId: string, fd: FormData) {
  const body = { ...cuerpoPersona(fd), comunidad_id: comunidadId };
  const res = await fetch(`${URL_BASE}/rest/v1/personas_comunidad`, {
    method: "POST",
    headers: cabeceras({ Prefer: "return=minimal" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`No se pudo crear la persona: ${await res.text()}`);
  revalidatePath(`/comunidades/${comunidadId}`);
  redirect(`/comunidades/${comunidadId}`);
}
