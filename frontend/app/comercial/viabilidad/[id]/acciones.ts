"use server";

import { revalidatePath } from "next/cache";
import { generarViabilidad, guardarComercial, type DatosComercial } from "../../../../lib/viabilidadComercial";
import { permisoViabilidad } from "./permiso";
import { capturaDelCatastro } from "../../../../lib/mesaViabilidades";

export type Resultado = { ok: true; numero?: string } | { ok: false; error: string };

export async function accionGuardar(id: string, d: DatosComercial): Promise<Resultado> {
  try {
    await permisoViabilidad(id);
    await guardarComercial(id, d);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Se guarda lo ultimo y se genera: lo que sale es lo que hay en pantalla. */
export async function accionGenerar(id: string, d: DatosComercial): Promise<Resultado> {
  try {
    const yo = await permisoViabilidad(id);
    await guardarComercial(id, d);
    const numero = await generarViabilidad(id, yo);
    revalidatePath(`/comercial/viabilidad/${id}`);
    return { ok: true, numero };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Sin captura del 3D (viabilidad sin Polycam): la imagen del Catastro, croquis o aerea (Monica, 29-oct-2026). */
export async function accionCapturaCatastro(id: string, que: "croquis" | "aerea"): Promise<Resultado> {
  try {
    await permisoViabilidad(id);
    await capturaDelCatastro(id, que);
    revalidatePath(`/comercial/viabilidad/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
