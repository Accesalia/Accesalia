"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { guardarNube, puedeVerCobros } from "../../../lib/cobros";

// NUBES DE PUNTOS: apuntar el escaneo de un trabajo, o de varios a la vez.
type Campo = "fecha_prevista_escaneo" | "escaneado_en" | "nube_lista_en";
const CAMPOS: Campo[] = ["fecha_prevista_escaneo", "escaneado_en", "nube_lista_en"];

async function yo() {
  const y = await quienSoy();
  if (!y || !puedeVerCobros(y)) throw new Error("Sin permiso.");
  return y;
}
const fecha = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export async function apuntarNube(oppId: string, campo: Campo, valor: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!CAMPOS.includes(campo)) throw new Error("Campo no valido");
    await guardarNube(oppId, { [campo]: fecha(valor) }, await yo());
    revalidatePath("/facturacion/nubes");
    revalidatePath("/facturacion/caja");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function apuntarVarias(oppIds: string[], campo: Campo, valor: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!CAMPOS.includes(campo)) throw new Error("Campo no valido");
    const y = await yo();
    for (const id of oppIds) await guardarNube(id, { [campo]: fecha(valor) }, y);
    revalidatePath("/facturacion/nubes");
    revalidatePath("/facturacion/caja");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
