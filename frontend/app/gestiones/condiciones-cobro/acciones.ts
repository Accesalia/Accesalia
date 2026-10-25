"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { guardarCondicion, puedeGestionarCondiciones, type GuardarCondicion } from "../../../lib/condicionesCobro";

type Resultado = { ok: true } | { ok: false; error: string };

// Condiciones de cobro (Monica, 25-oct-2026): las gestionan quienes gestionan las formas de pago.
export async function accionGuardarCondicion(g: GuardarCondicion): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo || !puedeGestionarCondiciones(yo)) throw new Error("No tienes permiso para cambiar las condiciones de cobro.");
    await guardarCondicion(g, yo);
    revalidatePath("/gestiones/condiciones-cobro");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
