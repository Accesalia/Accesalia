"use server";

// LA REVISION DE OFERTAS (Monica, 14-oct-2026), POR HOJA desde el 25-oct-2026: dar el ok o pedir cambios. La logica,
// en lib/hojaEmitir.ts.

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { puedeRevisar } from "../../../lib/revisionOferta";
import { resolverOkDaniel } from "../../../lib/hojaEmitir";

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** EL OK DE DANIEL A UNA HOJA DEL SISTEMA NUEVO (25-oct-2026): por hoja, con el historial de estados. */
export async function accionOkHoja(versionId: string, decision: "ok" | "cambios", nota: string): Promise<Resultado<{ avisos: string[] }>> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    if (!puedeRevisar(yo)) return { ok: false, error: "No tienes la función de revisión de ofertas." };
    const r = await resolverOkDaniel(versionId, decision, nota, yo);
    revalidatePath("/comercial/revision");
    return { ok: true, avisos: r.avisos };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
