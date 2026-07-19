"use server";

// Server actions del CRM de administradores. Corren en el SERVIDOR con la clave
// secreta (service role); nunca en el navegador. Escriben via REST de Supabase.

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

// Lee un campo de texto del formulario; devuelve null si viene vacio (para no
// escribir cadenas vacias donde el modelo espera null).
function txt(fd: FormData, clave: string): string | null {
  const v = String(fd.get(clave) ?? "").trim();
  return v === "" ? null : v;
}

function num(fd: FormData, clave: string): number | null {
  const v = String(fd.get(clave) ?? "").trim();
  if (v === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Construye el cuerpo comun de un administrador desde el formulario.
function cuerpoAdministrador(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (!nombre) throw new Error("El nombre del administrador es obligatorio.");
  return {
    nombre,
    empresa: txt(fd, "empresa"),
    cargo: txt(fd, "cargo"),
    telefono: txt(fd, "telefono"),
    email: txt(fd, "email"),
    comision_por_defecto: num(fd, "comision_por_defecto"),
    administracion_id: txt(fd, "administracion_id"),
    comercial_id: txt(fd, "comercial_id"),
    comercial_captador_id: txt(fd, "comercial_captador_id"),
    fecha_alta_administrador: txt(fd, "fecha_alta_administrador"),
    activo: fd.get("activo") !== null,
  };
}

/** Alta de un administrador. Redirige a su ficha recien creada. */
export async function crearAdministrador(fd: FormData) {
  const res = await fetch(`${URL_BASE}/rest/v1/administradores`, {
    method: "POST",
    headers: cabeceras({ Prefer: "return=representation" }),
    body: JSON.stringify(cuerpoAdministrador(fd)),
  });
  if (!res.ok) throw new Error(`No se pudo crear el administrador: ${await res.text()}`);
  const [creado] = (await res.json()) as { id: string }[];
  revalidatePath("/administradores");
  redirect(`/administradores/${creado.id}`);
}

/** Edicion de un administrador existente. */
export async function actualizarAdministrador(id: string, fd: FormData) {
  const res = await fetch(`${URL_BASE}/rest/v1/administradores?id=eq.${id}`, {
    method: "PATCH",
    headers: cabeceras(),
    body: JSON.stringify(cuerpoAdministrador(fd)),
  });
  if (!res.ok) throw new Error(`No se pudo actualizar el administrador: ${await res.text()}`);
  revalidatePath("/administradores");
  revalidatePath(`/administradores/${id}`);
  redirect(`/administradores/${id}`);
}

/** Baja/alta logica rapida desde la ficha. */
export async function cambiarActivoAdministrador(id: string, activo: boolean) {
  const res = await fetch(`${URL_BASE}/rest/v1/administradores?id=eq.${id}`, {
    method: "PATCH",
    headers: cabeceras(),
    body: JSON.stringify({ activo }),
  });
  if (!res.ok) throw new Error(`No se pudo cambiar el estado: ${await res.text()}`);
  revalidatePath("/administradores");
  revalidatePath(`/administradores/${id}`);
}

/**
 * Alta de una administracion de fincas. Tras crearla, lleva al alta de un
 * administrador (donde ya aparecera en el selector).
 */
export async function crearAdministracion(fd: FormData) {
  const nombre = txt(fd, "nombre");
  if (!nombre) throw new Error("El nombre de la administracion es obligatorio.");
  const body = {
    nombre,
    cif: txt(fd, "cif"),
    telefono: txt(fd, "telefono"),
    email: txt(fd, "email"),
    direccion: txt(fd, "direccion"),
    municipio: txt(fd, "municipio"),
    notas: txt(fd, "notas"),
  };
  const res = await fetch(`${URL_BASE}/rest/v1/administraciones_fincas`, {
    method: "POST",
    headers: cabeceras(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`No se pudo crear la administracion: ${await res.text()}`);
  revalidatePath("/administradores");
  redirect("/administradores/nuevo");
}
