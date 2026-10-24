"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { guardarBorrador, type FilaHoja } from "../../../lib/hojaCompromisos";

type Resultado = { ok: true } | { ok: false; error: string };

// Guardar la hoja de prueba en borrador, en las tablas nuevas (Monica, 24-oct-2026). Solo direccion, como la pantalla.
export async function accionGuardarBorrador(oppId: string, filas: FilaHoja[]): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo?.veTodo) throw new Error("Solo dirección puede guardar desde la prueba.");
    await guardarBorrador(oppId, filas, yo);
    revalidatePath("/gestiones/hoja-prueba");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
