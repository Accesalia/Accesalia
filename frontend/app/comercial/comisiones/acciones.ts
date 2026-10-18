"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { marcarNoCuenta, marcarPagada } from "../../../lib/comisionesComercial";

// Lo que apunta DIRECCION (el comercial solo mira): si una opp no cuenta para su
// comision, y si su parte de un hito ya se le ha pagado.
async function direccion() {
  const yo = await quienSoy();
  if (!yo || !(yo.veTodo || puedeEntrar(yo, "comercial", "supervisar"))) redirect("/menu");
  return yo;
}

export async function accionNoCuenta(oppId: string, noCuenta: boolean, nota: string | null) {
  const yo = await direccion();
  await marcarNoCuenta(yo, oppId, noCuenta, nota);
  revalidatePath("/comercial/comisiones");
}

export async function accionPagada(hitoId: string, comercialId: string, pagada: boolean, fecha: string | null) {
  const yo = await direccion();
  await marcarPagada(yo, hitoId, comercialId, pagada, fecha);
  revalidatePath("/comercial/comisiones");
}
