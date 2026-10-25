"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../../lib/sesion";
import { puedeHacerHojas, puedeVerOpp } from "../../../../lib/hojaEncargo";
import { descartarBorrador, modificarHoja, oppDeVersion } from "../../../../lib/hojaCompromisos";
import { anularHoja, marcarEnviada, marcarNoFirmada } from "../../../../lib/hojaEmitir";
import type { Yo } from "../../../../lib/sesion";

// LO QUE SE HACE CON UNA HOJA DESDE EL BLOQUE 2 DE LA OPP (Monica, 25-oct-2026): «las acciones pasarían a esa pantalla».
// Las hojas del sistema nuevo (he_*). Se comprueba en CADA accion: hacer hojas (comercial, secretaria comercial,
// direccion) y que la opp sea de su cartera.
type Resultado = { ok: true; id?: string } | { ok: false; error: string };

async function conPermiso(versionId: string, hacer: (yo: Yo) => Promise<string | void>): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo || !puedeHacerHojas(yo)) throw new Error("No puedes tocar las hojas de encargo.");
    const oppId = await oppDeVersion(versionId);
    if (!(await puedeVerOpp(yo, oppId))) throw new Error("Esta oportunidad no es de tu cartera.");
    const id = await hacer(yo);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, id: id || undefined };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionHojaEnviada(versionId: string) {
  return conPermiso(versionId, (yo) => marcarEnviada(versionId, yo));
}
export async function accionHojaNoFirmada(versionId: string, motivo: string) {
  return conPermiso(versionId, (yo) => marcarNoFirmada(versionId, motivo, yo));
}
export async function accionHojaAnular(versionId: string, motivo: string) {
  return conPermiso(versionId, (yo) => anularHoja(versionId, motivo, yo));
}
export async function accionHojaDescartar(versionId: string) {
  return conPermiso(versionId, (yo) => descartarBorrador(versionId, yo));
}
export async function accionHojaModificar(versionId: string, pide: "comunidad" | "comercial", nota: string) {
  return conPermiso(versionId, (yo) => modificarHoja(versionId, pide, nota, yo));
}
