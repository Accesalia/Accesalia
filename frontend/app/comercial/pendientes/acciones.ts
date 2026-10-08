"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { colocarPendiente } from "../../../lib/pendientes";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";

/** Colocar una nota pendiente en su oportunidad o en su persona. Quien coloca
 *  se comprueba dentro: solo su autor (o quien comparte su cartera, o
 *  direccion). Una pantalla abierta no es un permiso. */
export async function accionColocar(
  id: string,
  destino: { oportunidadId: string } | { persona: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/pendientes");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");
  try {
    await colocarPendiente(yo, id, destino);
    revalidatePath("/comercial/pendientes");
    revalidatePath("/comercial");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
