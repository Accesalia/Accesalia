"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { cambiarComercial, cerrar, pausar, reabrir, reactivar } from "../../../lib/gestionOportunidad";
import { quedaPorCobrar } from "../../../lib/cabeceraOpp";

// Cambiar el comercial o el estado desde el listado de todas las opps. Las
// mismas piezas que la ficha de la opp, con las mismas reglas: con algo por
// cobrar no se pausa ni se cierra, y cerrar pide su porque.

type Resultado = { error?: string };
const UUID = /^[0-9a-f-]{36}$/;

/** Es de direccion: se comprueba en CADA accion, no solo al abrir la pantalla. */
async function permiso() {
  const yo = await quienSoy();
  if (!yo || !yo.veTodo) throw new Error("Solo dirección puede cambiar esto desde aquí.");
  return yo;
}

const refrescar = (id: string) => {
  revalidatePath("/gestiones/oportunidades");
  revalidatePath(`/comercial/oportunidades/${id}`);
  revalidatePath("/comercial");
};

const comoError = (e: unknown): Resultado => ({ error: e instanceof Error ? e.message : String(e) });

export async function accionComercial(oppId: string, comercialId: string): Promise<Resultado> {
  try {
    await permiso();
    if (!UUID.test(oppId) || (comercialId && !UUID.test(comercialId))) throw new Error("Datos no válidos.");
    await cambiarComercial(oppId, comercialId || null);
    refrescar(oppId);
    return {};
  } catch (e) {
    return comoError(e);
  }
}

export type CambioEstado =
  | { a: "abierta" }
  | { a: "pausada"; nota: string }
  | { a: "cerrada"; perdida: boolean; motivo: string };

export async function accionEstado(oppId: string, desde: string, cambio: CambioEstado): Promise<Resultado> {
  try {
    const yo = await permiso();
    if (!UUID.test(oppId)) throw new Error("Datos no válidos.");
    if (cambio.a === desde) return {};
    if (cambio.a !== "abierta" && (await quedaPorCobrar(oppId))) throw new Error("Esto aún tiene cosas por cobrar: no se puede cerrar ni pausar.");
    if (cambio.a === "abierta") {
      if (desde === "pausada") await reactivar(oppId);
      else await reabrir(oppId);
    } else if (cambio.a === "pausada") {
      // De cerrada a pausada: se reabre y se pausa, para que la pausa quede en su historial.
      if (desde === "cerrada") await reabrir(oppId);
      await pausar(oppId, cambio.nota.trim() || null);
    } else {
      await cerrar(oppId, { perdida: cambio.perdida, motivo: cambio.motivo, quien: [yo.nombre, yo.apellidos].filter(Boolean).join(" ") });
    }
    refrescar(oppId);
    return {};
  } catch (e) {
    return comoError(e);
  }
}
