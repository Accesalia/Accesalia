"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { guardarBorrador, type FilaHoja, type Pagador } from "../../../lib/hojaCompromisos";

type Resultado = { ok: true; id: string } | { ok: false; error: string };

// Guardar la hoja de prueba en borrador, en las tablas nuevas (Monica, 24-oct-2026). Solo direccion, como la pantalla.
// Con versionId sigue el mismo borrador; sin el, nace uno nuevo.
export async function accionGuardarBorrador(oppId: string, filas: FilaHoja[], versionId: string | null, pagador: Pagador): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo?.veTodo) throw new Error("Solo dirección puede guardar desde la prueba.");
    const id = await guardarBorrador(oppId, filas, yo, versionId, pagador);
    revalidatePath("/gestiones/hoja-prueba");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
