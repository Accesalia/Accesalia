"use server";

import { revalidatePath } from "next/cache";
import { quienSoy, type Yo } from "../../../lib/sesion";
import { puedeHacerHojas, puedeVerOpp } from "../../../lib/hojaGenerador";
import { guardarBorrador, type FilaHoja, type Pagador } from "../../../lib/hojaCompromisos";
import { generarHoja } from "../../../lib/hojaEmitir";

// GUARDAR Y GENERAR LA HOJA (Monica, 22-25-oct-2026). Lo hace quien hace hojas (comercial, secretaria comercial,
// direccion) y solo de las opps de su cartera: se comprueba en CADA accion, abrir la pantalla no es permiso para escribir.
type Resultado = { ok: true; id: string; avisos?: string[] } | { ok: false; error: string };

async function conPermiso(oppId: string, hacer: (yo: Yo) => Promise<{ id: string; avisos?: string[] }>): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo || !puedeHacerHojas(yo)) throw new Error("No puedes hacer hojas de encargo.");
    if (!(await puedeVerOpp(yo, oppId))) throw new Error("Esta oportunidad no es de tu cartera.");
    const r = await hacer(yo);
    revalidatePath("/comercial/hoja-encargo");
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Guardar en borrador. Con versionId sigue el mismo borrador; sin el, nace uno nuevo. */
export async function accionGuardarBorrador(oppId: string, filas: FilaHoja[], versionId: string | null, pagador: Pagador): Promise<Resultado> {
  return conPermiso(oppId, async (yo) => ({ id: await guardarBorrador(oppId, filas, yo, versionId, pagador) }));
}

/** Generar: se guarda tal cual y va al ok de Daniel con su presupuesto (y la viabilidad, si la hay). */
export async function accionGenerar(oppId: string, filas: FilaHoja[], versionId: string | null, pagador: Pagador, papel: string): Promise<Resultado> {
  return conPermiso(oppId, (yo) => generarHoja(oppId, filas, versionId, pagador, papel, yo));
}
