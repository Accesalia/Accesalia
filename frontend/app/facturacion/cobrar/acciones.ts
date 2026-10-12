"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import {
  anadirHito, anadirLinea, corregirHito, corregirLinea, hojaAbierta, ponerDuda, puedeValidar, quitarHito, quitarLinea, resolverDuda, validarLinea,
  type CampoHito, type CampoLinea, type HojaAbierta,
} from "../../../lib/nuevasHojas";

// NUEVAS HOJAS ENCARGO FIRMADAS: cada cambio comprueba quien eres y deja dicho
// quien lo hizo. Devuelven la hoja otra vez, ya con el cambio, o el error.

type Resp = { hoja?: HojaAbierta | null; error?: string };

async function hacer(cambio: (yo: NonNullable<Awaited<ReturnType<typeof quienSoy>>>) => Promise<string>): Promise<Resp> {
  const yo = await quienSoy();
  if (!yo || !puedeValidar(yo)) return { error: "No tienes acceso a la facturación." };
  try {
    const hojaId = await cambio(yo);
    revalidatePath("/facturacion/cobrar");
    return { hoja: await hojaAbierta(hojaId) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se ha podido guardar." };
  }
}

export async function abrir(hojaId: string): Promise<Resp> {
  const yo = await quienSoy();
  if (!yo || !puedeValidar(yo)) return { error: "No tienes acceso a la facturación." };
  return { hoja: await hojaAbierta(hojaId) };
}
export async function accionCorregirLinea(id: string, campo: CampoLinea, valor: string) {
  return hacer((yo) => corregirLinea(id, campo, valor, yo));
}
export async function accionCorregirHito(id: string, campo: CampoHito, valor: string) {
  return hacer((yo) => corregirHito(id, campo, valor, yo));
}
export async function accionAnadirHito(lineaId: string) {
  return hacer((yo) => anadirHito(lineaId, yo));
}
export async function accionQuitarHito(hitoId: string) {
  return hacer((yo) => quitarHito(hitoId, yo));
}
export async function accionAnadirLinea(hojaId: string) {
  return hacer((yo) => anadirLinea(hojaId, yo));
}
export async function accionQuitarLinea(lineaId: string) {
  return hacer((yo) => quitarLinea(lineaId, yo));
}
export async function accionValidar(lineaId: string) {
  return hacer((yo) => validarLinea(lineaId, yo));
}
export async function accionDuda(lineaId: string, texto: string) {
  return hacer((yo) => ponerDuda(lineaId, texto, yo));
}
export async function accionResolverDuda(notaId: string) {
  return hacer((yo) => resolverDuda(notaId, yo));
}
