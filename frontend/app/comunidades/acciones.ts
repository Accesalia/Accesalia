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
    comunidad_autonoma: txt(fd, "comunidad_autonoma"),
    // la administracion NO se guarda aqui: es una relacion con historia, y
    // tiene su propia accion (cambiarAdministracion) para no perder la anterior
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

// ---- Quien administra la comunidad ----
//
// Cambiar de administracion no es sobrescribir una casilla: es cerrar una
// etapa y abrir otra. La anterior se queda como historica, y por eso se puede
// entender despues por que un documento de 2023 lleva una firma y el de 2025
// otra, sin tener que adivinarlo.

async function api(path: string, method: string, body?: unknown, prefer?: string) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: cabeceras(prefer ? { Prefer: prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${method} ${path}\n${await res.text()}`);
  return res;
}

/** Resuelve a quien se asigna: alguien que ya existe, o alguien nuevo.
 *
 *  Lo manda el buscador. Si eliges de la lista viene puesto_id y no se crea
 *  nada: es la misma persona con la que ya hablabas, no una copia. Si no esta,
 *  vienen el nombre y la casa (que puede quedar pendiente a proposito). */
async function puestoParaAsignar(fd: FormData): Promise<{ puestoId: string; empresaId: string | null }> {
  const yaExiste = txt(fd, "puesto_id");
  if (yaExiste) {
    const filas = (await (await api(
      `puesto?select=id,empresa_id&id=eq.${yaExiste}&limit=1`, "GET")).json()) as
      { id: string; empresa_id: string | null }[];
    if (!filas[0]) throw new Error("No encuentro a esa persona.");
    return { puestoId: filas[0].id, empresaId: filas[0].empresa_id };
  }

  const nombre = txt(fd, "persona_nueva");
  if (!nombre) throw new Error("Elige a una persona de la lista o crea una nueva.");

  const empresaId = txt(fd, "empresa_nueva_id");
  const desconocida = txt(fd, "empresa_desconocida") !== null;
  if (!empresaId && !desconocida) {
    throw new Error(
      "Falta la administración de fincas. Elígela, o marca «Todavía no lo sé» para dejarla pendiente.",
    );
  }

  const rp = await api("persona", "POST", { nombre, activa: true }, "return=representation");
  const [persona] = (await rp.json()) as { id: string }[];
  try {
    const rpu = await api("puesto", "POST",
      { persona_id: persona.id, empresa_id: empresaId }, "return=representation");
    const [puesto] = (await rpu.json()) as { id: string }[];
    return { puestoId: puesto.id, empresaId };
  } catch (e) {
    await api(`persona?id=eq.${persona.id}`, "DELETE").catch(() => {});
    throw e;
  }
}

export async function cambiarAdministracion(comunidadId: string, fd: FormData) {
  const { puestoId, empresaId } = await puestoParaAsignar(fd);
  const desde = txt(fd, "desde");
  const motivo = txt(fd, "motivo");

  // 1. cerrar la etapa anterior. La fecha solo se pone si se sabe: la mayoria
  //    de cambios llegan sin fecha, y poner hoy seria mentir.
  await api(`comunidad_admin_responsable?comunidad_id=eq.${comunidadId}&vigente=is.true`,
    "PATCH", { vigente: false, hasta: desde, notas: motivo });

  // 2. abrir la nueva
  await api("comunidad_admin_responsable", "POST", {
    comunidad_id: comunidadId,
    puesto_id: puestoId,
    empresa_id: empresaId,
    vigente: true,
    desde,
  });

  revalidatePath(`/comunidades/${comunidadId}`);
  revalidatePath(`/comunidades/${comunidadId}/comercial`);
  redirect(`/comunidades/${comunidadId}`);
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
