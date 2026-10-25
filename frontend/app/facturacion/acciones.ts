"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../lib/sesion";
import { cambiarHito, fechaDeHito, anadirConcesion, cerrarExito, fraccionarHito, libroDeHito, notaDeHito, pausarHito, puedeVerCobros, puedeVerEcobalance, puedeVerLibro } from "../../lib/cobros";

export type Resultado = { ok: true } | { ok: false; error: string };

/** En CADA accion: abrir la pantalla no es permiso para escribir. Y el hito
 *  tiene que ser del libro de quien lo toca (12-oct-2026): Alexandra, Accesalia
 *  y Daniel; Ana, Ecobalance. */
async function permiso(hitoId: string) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion");
  if (!puedeVerCobros(yo) && !puedeVerEcobalance(yo)) redirect("/menu");
  const libro = await libroDeHito(hitoId);
  if (!libro || !puedeVerLibro(yo, libro)) throw new Error("Ese hito es del otro libro de facturación.");
  return yo;
}

async function hacer(oppId: string, f: () => Promise<void>): Promise<Resultado> {
  try {
    await f();
    revalidatePath(`/facturacion/${oppId}`);
    revalidatePath("/facturacion");
    revalidatePath(`/ecobalance/${oppId}`);
    revalidatePath("/ecobalance");
    revalidatePath("/facturacion/cobrar/modificar");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionNota(oppId: string, hitoId: string, texto: string) {
  const yo = await permiso(hitoId);
  return hacer(oppId, () => notaDeHito(hitoId, texto, yo));
}

export async function accionPausa(oppId: string, hitoId: string, pausar: boolean, motivo: string) {
  const yo = await permiso(hitoId);
  return hacer(oppId, () => pausarHito(hitoId, pausar, motivo, yo));
}

export async function accionFecha(oppId: string, hitoId: string, fecha: string | null) {
  await permiso(hitoId);
  return hacer(oppId, () => fechaDeHito(hitoId, fecha));
}

/** Modificar Hitos (Cobrar): fecha o importe, con el porque. */
export async function accionCambiarHito(oppId: string, hitoId: string, cambio: { fecha?: string | null; importe?: number }, motivo: string) {
  const yo = await permiso(hitoId);
  return hacer(oppId, () => cambiarHito(hitoId, cambio, motivo, yo));
}

export async function accionConcesion(oppId: string, hitoId: string, c: { convocatoria: string; concedido: number; fecha: string }) {
  const yo = await permiso(hitoId);
  return hacer(oppId, () => anadirConcesion(hitoId, c, yo));
}
export async function accionCerrarExito(oppId: string, hitoId: string, motivo: string) {
  const yo = await permiso(hitoId);
  return hacer(oppId, () => cerrarExito(hitoId, motivo, yo));
}
export async function accionFraccionar(oppId: string, hitoId: string, partes: { importe: number; fecha: string | null }[], motivo: string) {
  const yo = await permiso(hitoId);
  return hacer(oppId, () => fraccionarHito(hitoId, partes, motivo, yo));
}
