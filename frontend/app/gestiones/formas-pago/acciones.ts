"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { cambiarActiva, guardarForma, puedeGestionarFormas, type GuardarForma } from "../../../lib/formasPago";

type Resultado = { ok: true } | { ok: false; error: string };

async function permiso() {
  const yo = await quienSoy();
  if (!yo || !puedeGestionarFormas(yo)) throw new Error("No tienes permiso para cambiar las formas de pago.");
  return yo;
}

export async function accionGuardarForma(g: GuardarForma): Promise<Resultado> {
  try {
    const yo = await permiso();
    await guardarForma(g, yo);
    revalidatePath("/gestiones/formas-pago");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionCambiarActiva(id: string, activa: boolean): Promise<Resultado> {
  try {
    await permiso();
    await cambiarActiva(id, activa);
    revalidatePath("/gestiones/formas-pago");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
