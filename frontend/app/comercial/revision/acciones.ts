"use server";

// LA REVISION DE OFERTAS (Monica, 14-oct-2026): pedir el ok al paquete y darlo o
// pedir cambios. La logica, en lib/revisionOferta.ts.

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerOpp } from "../../../lib/hojaEncargo";
import { pedirRevision, puedeRevisar, resolverRevision } from "../../../lib/revisionOferta";

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

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

/** Quien tiene la funcion de revision de ofertas da el ok o pide cambios. */
export async function accionResolverRevision(
  revisionId: string,
  decision: "ok" | "cambios",
  comentario: string | null,
): Promise<Resultado<{ avisos: string[] }>> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    if (!puedeRevisar(yo)) return { ok: false, error: "No tienes la función de revisión de ofertas." };
    const r = await resolverRevision(revisionId, decision, comentario, yo);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true, avisos: r.avisos };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
