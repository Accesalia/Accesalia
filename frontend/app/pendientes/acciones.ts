"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { marcarHecha } from "../../lib/llamadas";
import { quienSoy } from "../../lib/sesion";

/** "Hecha": la llamada sale de la lista. La marca quien coloca las llamadas
 *  (hoy la secretaria comercial) o direccion. */
export async function accionLlamadaHecha(id: string) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes");
  if (!(yo.veTodo || yo.funciones.some((f) => f.clave === "secretaria"))) throw new Error("Sin permiso para marcar llamadas.");
  await marcarHecha(id, yo.id);
  revalidatePath("/pendientes");
  revalidatePath("/pendientes/llamadas");
}
