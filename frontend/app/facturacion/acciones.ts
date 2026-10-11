"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../lib/sesion";
import { fechaDeHito, fraccionarHito, notaDeHito, pausarHito, puedeVerCobros } from "../../lib/cobros";

export type Resultado = { ok: true } | { ok: false; error: string };

/** En CADA accion: abrir la pantalla no es permiso para escribir. */
async function permiso() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion");
  if (!puedeVerCobros(yo)) redirect("/menu");
  return yo;
}

async function hacer(oppId: string, f: () => Promise<void>): Promise<Resultado> {
  try {
    await f();
    revalidatePath(`/facturacion/${oppId}`);
    revalidatePath("/facturacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionNota(oppId: string, hitoId: string, texto: string) {
  const yo = await permiso();
  return hacer(oppId, () => notaDeHito(hitoId, texto, yo));
}

export async function accionPausa(oppId: string, hitoId: string, pausar: boolean, motivo: string) {
  const yo = await permiso();
  return hacer(oppId, () => pausarHito(hitoId, pausar, motivo, yo));
}

export async function accionFecha(oppId: string, hitoId: string, fecha: string | null) {
  await permiso();
  return hacer(oppId, () => fechaDeHito(hitoId, fecha));
}

export async function accionFraccionar(oppId: string, hitoId: string, partes: { importe: number; fecha: string | null }[], motivo: string) {
  const yo = await permiso();
  return hacer(oppId, () => fraccionarHito(hitoId, partes, motivo, yo));
}
