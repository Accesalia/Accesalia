"use server";

// LA REVISION DE OFERTAS (Monica, 14-oct-2026): pedir el ok al paquete y darlo o
// pedir cambios. La logica, en lib/revisionOferta.ts.

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerOpp } from "../../../lib/hojaEncargo";
import { cerrarRevision, marcarModificar, pedirRevision, puedeRevisar } from "../../../lib/revisionOferta";
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

/** El comercial (o quien lleve su cartera) pide el ok a la oferta de su opp. */
export async function accionPedirRevision(oppId: string, nota: string | null): Promise<Resultado<{ numero: number; avisos: string[] }>> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    if (!(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
    const r = await pedirRevision(oppId, nota, yo);
    revalidatePath("/comercial/hoja-encargo");
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, numero: r.numero, avisos: r.avisos };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Quien tiene la funcion de revision de ofertas CIERRA la revision: ok al
 *  paquete entero (sin ningun "modificalo" marcado) o la devuelve con cambios. */
export async function accionResolverRevision(
  revisionId: string,
  decision: "ok" | "cambios",
  comentario: string | null,
): Promise<Resultado<{ avisos: string[] }>> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    if (!puedeRevisar(yo)) return { ok: false, error: "No tienes la función de revisión de ofertas." };
    const r = await cerrarRevision(revisionId, decision, comentario, yo);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true, avisos: r.avisos };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** MODIFICALO en un bloque, con su nota; con la nota vacia, se quita. */
export async function accionMarcarModificar(revisionId: string, conceptoId: string, nota: string | null): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    await marcarModificar(revisionId, conceptoId, nota, yo);
    revalidatePath("/comercial/revision");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
