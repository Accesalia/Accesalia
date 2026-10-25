"use server";

import { revalidatePath } from "next/cache";
import { quienSoy, type Yo } from "../../../lib/sesion";
import {
  comprobarDireccion, devolverHoja, levantarPausa, meterEnProduccion, pausarHoja, puedeBandeja, puedeFacturacion, reanudarHoja, type Tejado,
} from "../../../lib/recorridoHoja";

// EL RECORRIDO DE LA HOJA FIRMADA (Monica, 25-oct-2026): lo que se hace desde el Diario (facturacion) y desde la
// Bandeja comercial (la secretaria comercial). Cada uno comprueba quien eres y deja dicho quien lo hizo.

type Resp = { ok?: boolean; error?: string };

async function hacer(puede: (yo: Yo) => boolean, cambio: (yo: Yo) => Promise<void>): Promise<Resp> {
  const yo = await quienSoy();
  if (!yo || !puede(yo)) return { error: "No tienes acceso." };
  try {
    await cambio(yo);
    for (const p of ["/facturacion/cobrar", "/facturacion/cobrar/diario", "/facturacion/cobrar/primer-cobro", "/bandeja-comercial", "/facturacion/caja"]) revalidatePath(p);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se ha podido guardar." };
  }
}

// ---- facturacion, desde el diario
export async function accionDevolver(hojaId: string, motivo: string) {
  return hacer(puedeFacturacion, (yo) => devolverHoja(yo, hojaId, motivo));
}
export async function accionPausarFacturacion(hojaId: string, motivo: string, tejado: Tejado, condicion: string) {
  return hacer(puedeFacturacion, (yo) => pausarHoja(yo, hojaId, "facturacion", motivo, tejado, condicion));
}
export async function accionLevantar(hojaId: string, motivo: string) {
  return hacer(puedeFacturacion, (yo) => levantarPausa(yo, hojaId, motivo));
}

// ---- la secretaria comercial, desde la bandeja
export async function accionDireccionOk(hojaId: string) {
  return hacer(puedeBandeja, (yo) => comprobarDireccion(yo, hojaId));
}
export async function accionMeter(hojaId: string, areas: string[]) {
  return hacer(puedeBandeja, (yo) => meterEnProduccion(yo, hojaId, areas));
}
export async function accionPausarSecretaria(hojaId: string, motivo: string, tejado: Tejado, condicion: string) {
  return hacer(puedeBandeja, (yo) => pausarHoja(yo, hojaId, "secretaria", motivo, tejado, condicion));
}
export async function accionReanudar(hojaId: string) {
  return hacer(puedeBandeja, (yo) => reanudarHoja(yo, hojaId));
}
