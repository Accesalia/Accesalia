"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { puedeHacerHojas, puedeVerComunidad } from "../../../lib/hojaEncargo";
import { borrarBorrador, comunidadDeOportunidad, guardarPresupuesto, oportunidadDePresupuesto, type GuardarPresupuesto } from "../../../lib/presupuesto";

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** En CADA accion: abrir la pantalla no es permiso para escribir, y un
 *  comercial solo toca las de su cartera. */
async function permiso(oppId: string | null) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial");
  if (!puedeHacerHojas(yo)) redirect("/comercial");
  const comunidad = oppId ? await comunidadDeOportunidad(oppId) : null;
  if (!comunidad || !(await puedeVerComunidad(yo, comunidad))) throw new Error("No puedes tocar los presupuestos de esta oportunidad.");
  return yo;
}

export async function accionGuardar(g: GuardarPresupuesto): Promise<Resultado<{ id: string; codigo: string | null }>> {
  try {
    const yo = await permiso(g.oportunidadId);
    if (g.presupuestoId && (await oportunidadDePresupuesto(g.presupuestoId)) !== g.oportunidadId)
      throw new Error("Ese presupuesto no es de esta oportunidad.");
    const r = await guardarPresupuesto(g, yo);
    revalidatePath("/comercial/presupuesto");
    revalidatePath(`/comercial/oportunidades/${g.oportunidadId}`);
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: (g.borrador ? "No se ha podido guardar: " : "No se ha podido generar: ") + (e as Error).message };
  }
}

export async function accionBorrar(id: string): Promise<Resultado> {
  try {
    const opp = await oportunidadDePresupuesto(id);
    await permiso(opp);
    await borrarBorrador(id);
    revalidatePath("/comercial/presupuesto");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
