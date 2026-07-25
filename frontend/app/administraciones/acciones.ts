"use server";

// Server actions del CRM (eje administracion de fincas). Corren en el servidor
// con la clave secreta; escriben via REST de Supabase.

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

// ---- Administracion de fincas ----

function cuerpoAdministracion(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (!nombre) throw new Error("El nombre de la administración es obligatorio.");
  return {
    nombre,
    estado: txt(fd, "estado") ?? "contacto",
    cif: txt(fd, "cif"),
    telefono: txt(fd, "telefono"),
    email: txt(fd, "email"),
    direccion: txt(fd, "direccion"),
    municipio: txt(fd, "municipio"),
    notas: txt(fd, "notas"),
    comercial_id: txt(fd, "comercial_id"),
    comercial_captador_id: txt(fd, "comercial_captador_id"),
    titular_id: txt(fd, "titular_id"),
    fecha_alta_cartera: txt(fd, "fecha_alta_cartera"),
    motivo_fin: txt(fd, "motivo_fin"),
    fecha_fin: txt(fd, "fecha_fin"),
    activo: fd.get("activo") !== null,
  };
}

export async function crearAdministracion(fd: FormData) {
  const res = await fetch(`${URL_BASE}/rest/v1/administraciones_fincas`, {
    method: "POST",
    headers: cabeceras({ Prefer: "return=representation" }),
    body: JSON.stringify(cuerpoAdministracion(fd)),
  });
  if (!res.ok) throw new Error(`No se pudo crear la administración: ${await res.text()}`);
  const [creada] = (await res.json()) as { id: string }[];
  revalidatePath("/administraciones");
  redirect(`/administraciones/${creada.id}`);
}

export async function actualizarAdministracion(id: string, fd: FormData) {
  const res = await fetch(`${URL_BASE}/rest/v1/administraciones_fincas?id=eq.${id}`, {
    method: "PATCH",
    headers: cabeceras(),
    body: JSON.stringify(cuerpoAdministracion(fd)),
  });
  if (!res.ok) throw new Error(`No se pudo actualizar: ${await res.text()}`);
  revalidatePath("/administraciones");
  revalidatePath(`/administraciones/${id}`);
  redirect(`/administraciones/${id}`);
}

// ---- Personas (administradores) colgando de una administracion ----

function cuerpoPersona(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (!nombre) throw new Error("El nombre de la persona es obligatorio.");
  return {
    nombre,
    cargo: txt(fd, "cargo"),
    telefono: txt(fd, "telefono"),
    email: txt(fd, "email"),
    notas: txt(fd, "notas"),
    administracion_id: txt(fd, "administracion_id"),
    activo: fd.get("activo") !== null,
  };
}

export async function crearPersona(administracionId: string, fd: FormData) {
  const body = { ...cuerpoPersona(fd), administracion_id: administracionId };
  const res = await fetch(`${URL_BASE}/rest/v1/administradores`, {
    method: "POST",
    headers: cabeceras({ Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`No se pudo crear la persona: ${await res.text()}`);
  revalidatePath(`/administraciones/${administracionId}`);
  redirect(`/administraciones/${administracionId}`);
}

export async function actualizarPersona(id: string, administracionId: string, fd: FormData) {
  const res = await fetch(`${URL_BASE}/rest/v1/administradores?id=eq.${id}`, {
    method: "PATCH",
    headers: cabeceras(),
    body: JSON.stringify(cuerpoPersona(fd)),
  });
  if (!res.ok) throw new Error(`No se pudo actualizar la persona: ${await res.text()}`);
  revalidatePath(`/administraciones/${administracionId}`);
  revalidatePath(`/administradores/${id}`);
  redirect(`/administraciones/${administracionId}`);
}

/** Marca una persona como titular (dueño que percibe comisión) de su administración. */
export async function marcarTitular(administracionId: string, personaId: string) {
  const res = await fetch(
    `${URL_BASE}/rest/v1/administraciones_fincas?id=eq.${administracionId}`,
    {
      method: "PATCH",
      headers: cabeceras(),
      body: JSON.stringify({ titular_id: personaId }),
    },
  );
  if (!res.ok) throw new Error(`No se pudo marcar titular: ${await res.text()}`);
  revalidatePath(`/administraciones/${administracionId}`);
}
