"use server";

import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../../../lib/sesion";
import { enviarDesdeOportunidad, type Envio } from "../../../../../lib/envioCorreo";

// ENVIAR desde la oportunidad (Monica, 12-oct-2026). Devuelve el resultado en
// vez de saltar: si falla, que se vea por que sin perder lo escrito.
export async function accionEnviar(oppId: string, e: Envio): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const yo = await quienSoy();
    if (!yo) throw new Error("Tu sesión ha caducado: vuelve a entrar.");
    if (!puedeEntrar(yo, "comercial", "trabajar")) throw new Error("Enviar es del área comercial.");
    await enviarDesdeOportunidad(yo, oppId, e);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
