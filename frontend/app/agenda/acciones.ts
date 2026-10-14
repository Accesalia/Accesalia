"use server";

// LAS ACCIONES DE LA AGENDA (Monica, 14-oct-2026). La primera: apuntar o mover la
// visita de escaneo de una opp. La pinta la cabecera de la ficha de la opp (su
// boton "Agendar"); aqui solo se guarda.

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../lib/sesion";
import { puedeVerOpp } from "../../lib/hojaEncargo";
import { aHoraMadrid, guardarEscaneo } from "../../lib/citas";

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** `local`: la fecha y hora de Madrid de la casilla, "2026-10-20T10:30". */
export async function accionGuardarEscaneo(oppId: string, local: string): Promise<Resultado<{ inicio: string; local: string }>> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    if (!(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
    const c = await guardarEscaneo(oppId, local, yo.id);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, inicio: c.inicio, local: aHoraMadrid(c.inicio) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
