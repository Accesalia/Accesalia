"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import {
  buscarEmpresas, buscarOpps, buscarPersonas, guardarAcuerdo, leerAcuerdo, ponerImporteOpp, puedeGestionarComisiones, puedeVerComisiones,
  puedeVerificarComisiones, SOBRES, type Sobre,
} from "../../../lib/comisionesAdmin";

// COMISIONES A ADMINS (Monica, 29-oct-2026): la secretaria comercial, los comerciales y direccion. Cada accion vuelve
// a comprobar quien es. Lo que va en B no lo ven ni lo tocan (se queda como estaba) y «verificado» solo lo marca
// direccion.
async function yoConPermiso() {
  const yo = await quienSoy();
  if (!yo || !puedeGestionarComisiones(yo)) redirect("/menu");
  return yo;
}

export async function accionGuardarAcuerdoGestion(id: string | null, d: Parameters<typeof guardarAcuerdo>[2]) {
  const yo = await yoConPermiso();
  try {
    const antes = id ? await leerAcuerdo(id) : null;
    if (id && !antes) throw new Error("Ese acuerdo no existe.");
    const verificado = puedeVerificarComisiones(yo) ? d.verificado : antes?.revision === "verificado";
    const condiciones = puedeVerComisiones(yo)
      ? d.condiciones
      : Object.fromEntries(SOBRES.map((s) => { const c = d.condiciones[s]; return [s, c ? { ...c, enB: antes?.condiciones[s]?.enB ?? false } : null]; }));
    const nuevo = await guardarAcuerdo(yo, id, { ...d, verificado, condiciones });
    revalidatePath("/comercial/comisiones-admins");
    revalidatePath("/ecobalance/comisiones");
    return { ok: true as const, id: nuevo };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function accionImporteOpp(acuerdoId: string, oppId: string, sobre: Sobre, importe: number | null, nota: string | null) {
  const yo = await yoConPermiso();
  try {
    await ponerImporteOpp(yo, acuerdoId, oppId, sobre, importe, nota);
    revalidatePath(`/comercial/comisiones-admins/${acuerdoId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function accionBuscarPersonasGestion(q: string) {
  await yoConPermiso();
  return buscarPersonas(q);
}
export async function accionBuscarEmpresasGestion(q: string) {
  await yoConPermiso();
  return buscarEmpresas(q);
}
export async function accionBuscarOpps(q: string) {
  await yoConPermiso();
  return buscarOpps(q);
}
