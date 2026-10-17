"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { apuntarDeuda, apuntarNotaOpp, buscarEmpresas, buscarPersonas, guardarAcuerdo, puedeVerComisiones, type Sobre } from "../../../lib/comisionesAdmin";

// Cada accion vuelve a comprobar quien es: solo Ana y direccion.
async function yoConPermiso() {
  const yo = await quienSoy();
  if (!yo || !puedeVerComisiones(yo)) redirect("/menu");
  return yo;
}

export async function accionGuardarAcuerdo(id: string | null, d: Parameters<typeof guardarAcuerdo>[2]) {
  const yo = await yoConPermiso();
  try {
    const nuevo = await guardarAcuerdo(yo, id, d);
    revalidatePath("/ecobalance/comisiones");
    return { ok: true as const, id: nuevo };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function accionDeuda(acuerdoId: string, oppId: string, sobre: Sobre, d: { pagada?: boolean; fecha?: string | null; importe?: number | null }) {
  const yo = await yoConPermiso();
  await apuntarDeuda(yo, acuerdoId, oppId, sobre, d);
  revalidatePath(`/ecobalance/comisiones/${acuerdoId}`);
}

export async function accionNotaOpp(acuerdoId: string, oppId: string, texto: string) {
  const yo = await yoConPermiso();
  await apuntarNotaOpp(yo, acuerdoId, oppId, texto);
  revalidatePath(`/ecobalance/comisiones/${acuerdoId}`);
}

export async function accionBuscarPersonas(q: string) {
  await yoConPermiso();
  return buscarPersonas(q);
}
export async function accionBuscarEmpresas(q: string) {
  await yoConPermiso();
  return buscarEmpresas(q);
}
