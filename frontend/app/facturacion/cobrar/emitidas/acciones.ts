"use server";

import { revalidatePath } from "next/cache";
import { quienSoy, type Yo } from "../../../../lib/sesion";
import { puedeVerCobros, puedeVerEcobalance } from "../../../../lib/cobros";
import { enviarAFactusol, guardarNota, guardarOk, paraFactusol } from "../../../../lib/proformasEmitidas";

// PROFORMAS EMITIDAS: el ok, la nota y el envio a Factusol. Cada libro, lo suyo (lo comprueba cada funcion).

type Resp<T = undefined> = { ok: true; datos?: T } | { ok: false; error: string };
async function hacer<T>(f: (yo: Yo) => Promise<T>): Promise<Resp<T>> {
  const yo = await quienSoy();
  if (!yo || !(puedeVerCobros(yo) || puedeVerEcobalance(yo))) return { ok: false, error: "No tienes acceso a la facturación." };
  try {
    const datos = await f(yo);
    revalidatePath("/facturacion/cobrar/emitidas");
    return { ok: true, datos };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se ha podido guardar." };
  }
}

export async function accionParaFactusol(id: string) {
  return hacer((yo) => paraFactusol(yo, id));
}
export async function accionEnviarFactusol(id: string) {
  return hacer((yo) => enviarAFactusol(yo, id));
}
export async function accionOk(id: string, correo: string, fecha: string) {
  return hacer((yo) => guardarOk(yo, id, correo, fecha));
}
export async function accionNota(id: string, nota: string) {
  return hacer((yo) => guardarNota(yo, id, nota));
}
