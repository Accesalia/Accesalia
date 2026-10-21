"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { COLCHON_DE_PARTIDA, guardarUmbralesColchon, type UmbralesColchon } from "../../../lib/negocio";

// LOS UMBRALES DEL COLCHON (Monica, 21-oct-2026): se cambian desde la propia
// tarjeta. Es de direccion: se comprueba aqui, no solo al abrir la pantalla.

type Resultado = { error?: string };

export async function accionUmbralesColchon(u: UmbralesColchon): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo || !yo.veTodo) throw new Error("Solo dirección puede cambiar los umbrales.");
    const limpio = { ...COLCHON_DE_PARTIDA };
    for (const k of Object.keys(COLCHON_DE_PARTIDA) as (keyof UmbralesColchon)[]) {
      const n = Number(u[k]);
      if (!Number.isFinite(n) || n < 0 || n > 1000) throw new Error("Hay un número que no vale.");
      limpio[k] = Math.round(n * 10) / 10;
    }
    if (!(limpio.minimo <= limpio.idealDesde && limpio.idealDesde <= limpio.idealHasta && limpio.idealHasta <= limpio.maximo))
      throw new Error("Las semanas tienen que ir en orden: poco colchón ≤ ideal desde ≤ ideal hasta ≤ colapso.");
    if (limpio.horasDia <= 0) throw new Error("Las horas por día tienen que ser más de 0.");
    await guardarUmbralesColchon(limpio);
    revalidatePath("/negocio/trabajo-contratado");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
