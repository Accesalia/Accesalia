"use server";

import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { puedeVerOpp } from "../../../../lib/hojaGenerador";
import { agendarJunta, choquesJunta, marcarNosPidenIr } from "../../../../lib/juntaFicha";

// LA JUNTA DESDE LA FICHA COMERCIAL (Monica, 27-oct-2026).
async function puede(oppId: string) {
  const yo = await quienSoy();
  if (!yo || !puedeEntrar(yo, "comercial", "trabajar") || !(await puedeVerOpp(yo, oppId))) return null;
  return yo;
}

export async function accionChoquesJunta(oppId: string, agenda: string, dia: string, hora: string) {
  if (!(await puede(oppId))) return [];
  return choquesJunta(agenda, dia, hora).catch(() => []);
}

export async function accionAgendarJunta(
  oppId: string,
  d: { agenda: string; dia: string; hora: string; lugar: string; nombreOpp: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const yo = await puede(oppId);
  if (!yo) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    await agendarJunta(oppId, d, yo.id);
    revalidatePath(`/comercial/ficha/${oppId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionNosPidenIr(oppId: string, valor: boolean | null): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await puede(oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
  try {
    await marcarNosPidenIr(oppId, valor);
    revalidatePath(`/comercial/ficha/${oppId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
