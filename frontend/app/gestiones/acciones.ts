"use server";

// GESTIONES DE LA APP (Monica, 14-oct-2026): lo que se puede tocar de la app,
// reunido en un sitio. Aqui, asignar funciones a personas (solo direccion).

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../lib/sesion";
import { asignarFuncion, quitarFuncion } from "../../lib/gestionFunciones";

export type Resultado = { ok: true } | { ok: false; error: string };

export async function accionAsignarFuncion(funcionId: string, equipoId: string): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    await asignarFuncion(funcionId, equipoId, yo);
    revalidatePath("/gestiones");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionQuitarFuncion(asignacionId: string): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    await quitarFuncion(asignacionId, yo);
    revalidatePath("/gestiones");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
