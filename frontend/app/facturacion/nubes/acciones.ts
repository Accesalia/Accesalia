"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { guardarEnNube, puedeDecidirNube, puedeVerNubes } from "../../../lib/nubes";

// ASIGNAR › NUBE y PROCESO DE NUBES: decidir si un trabajo necesita nube (lo
// marca facturacion) y apuntar su escaneo (quien escanea y facturacion, igual).
type Campo = "fecha_prevista_escaneo" | "escaneado_en" | "nube_lista_en" | "notas";
const CAMPOS: Campo[] = ["fecha_prevista_escaneo", "escaneado_en", "nube_lista_en", "notas"];
type Res = { ok: boolean; error?: string };

const fecha = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const refrescar = () => {
  revalidatePath("/facturacion/nubes");
  revalidatePath("/facturacion/caja");
};
const fallo = (e: unknown): Res => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

export async function decidirNube(oppId: string, necesita: boolean | null): Promise<Res> {
  try {
    const yo = await quienSoy();
    if (!yo || !puedeDecidirNube(yo)) throw new Error("Sin permiso.");
    await guardarEnNube(oppId, { necesita_nube: necesita }, yo);
    refrescar();
    return { ok: true };
  } catch (e) {
    return fallo(e);
  }
}

export async function apuntarNube(oppId: string, campo: Campo, valor: string | null): Promise<Res> {
  try {
    const yo = await quienSoy();
    if (!yo || !puedeVerNubes(yo)) throw new Error("Sin permiso.");
    if (!CAMPOS.includes(campo)) throw new Error("Campo no valido");
    const v = campo === "notas" ? (valor ?? "").trim().slice(0, 2000) || null : fecha(valor);
    await guardarEnNube(oppId, { [campo]: v }, yo);
    refrescar();
    return { ok: true };
  } catch (e) {
    return fallo(e);
  }
}
