"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { cambiarComercial } from "../../../lib/gestionOportunidad";

/** Asignar o cambiar el comercial de una opp. Solo quien supervisa el area
 *  comercial (Alejandra, Daniel, Monica): un comercial no se reasigna opps. */
export async function accionAsignar(oppId: string, fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/gestion");
  if (!puedeEntrar(yo, "comercial", "supervisar")) redirect("/comercial");
  const c = String(fd.get("comercial") ?? "").trim();
  await cambiarComercial(oppId, c || null);
  revalidatePath("/comercial/gestion");
  revalidatePath(`/comercial/oportunidades/${oppId}`);
}
