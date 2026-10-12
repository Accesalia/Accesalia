"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// LOS CORREOS DADOS A MANO para la pagina de la comunidad (12-oct-2026). El
// administrador, el presidente y el comercial entran solos; estos, los que
// decidamos (la nuera del presidente, la comision de obras...).

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const CORREO_VALIDO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

async function permiso(id: string) {
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/comunidades/${id}`);
  if (!(yo.veTodo || puedeEntrar(yo, "comercial", "trabajar") || puedeEntrar(yo, "administracion", "trabajar"))) redirect("/menu");
  return yo;
}

export async function accionAutorizar(comunidadId: string, fd: FormData) {
  const yo = await permiso(comunidadId);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!CORREO_VALIDO.test(email)) redirect(`/administracion/comunidades/${comunidadId}?portal=correo#portal`);
  await fetch(`${URL_BASE}/rest/v1/portal_autorizados?on_conflict=comunidad_id,email`, {
    method: "POST",
    headers: { ...CAB, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      comunidad_id: comunidadId,
      email,
      nombre: String(fd.get("nombre") ?? "").trim() || null,
      motivo: String(fd.get("motivo") ?? "").trim() || null,
      puede_subir: true,
      activo: true,
      anadido_por: yo.id,
    }),
    cache: "no-store",
  });
  revalidatePath(`/administracion/comunidades/${comunidadId}`);
}

export async function accionQuitarAutorizado(comunidadId: string, autorizadoId: string) {
  await permiso(comunidadId);
  await fetch(`${URL_BASE}/rest/v1/portal_autorizados?id=eq.${autorizadoId}&comunidad_id=eq.${comunidadId}`, {
    method: "PATCH",
    headers: { ...CAB, Prefer: "return=minimal" },
    body: JSON.stringify({ activo: false }),
    cache: "no-store",
  });
  revalidatePath(`/administracion/comunidades/${comunidadId}`);
}
