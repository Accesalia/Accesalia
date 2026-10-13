"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { emitirInformeCostes, type EntradaCostes, type TipoInforme } from "../../../lib/informeCostes";

// EMITIR EL INFORME DE COSTES (Monica, 12-oct-2026). Dos caminos:
//   - para una oportunidad nuestra: queda en ella;
//   - para una direccion nueva, "sin guardar": no se crea nada mas que el
//     rastro (Direcciones vistas que no llegaron a mayores), con la hora;
//   AQUI NO SE CREAN OPPS (Monica, 13-oct-2026): la direccion nueva queda en
//   Pendientes ("Direcciones para las que has generado informes").
// Cada camino devuelve el id del informe, y la pantalla salta a verlo.

type Resultado = { ok: true; id: string } | { ok: false; error: string };
type Resuelta = { nombre: string; portalIds: string[]; parcela: string | null };

async function yoOFuera() {
  const yo = await quienSoy();
  if (!yo) throw new Error("Tu sesión ha caducado: vuelve a entrar.");
  return yo;
}

const mal = (e: unknown): Resultado => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

export async function emitirParaOportunidad(oppId: string, entrada: EntradaCostes, clase: TipoInforme = "estimacion_costes"): Promise<Resultado> {
  try {
    const yo = await yoOFuera();
    const id = await emitirInformeCostes({ oppId, ref: null, direccion: "", municipio: null }, entrada, yo, clase);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, id };
  } catch (e) {
    return mal(e);
  }
}

export async function emitirSinGuardar(r: Resuelta, entrada: EntradaCostes, clase: TipoInforme = "estimacion_costes"): Promise<Resultado> {
  try {
    const yo = await yoOFuera();
    if (!r.parcela) throw new Error("Esa dirección no tiene referencia catastral: sin ella no se sabe el edificio.");
    const id = await emitirInformeCostes({ oppId: null, ref: r.parcela, direccion: r.nombre, municipio: null }, entrada, yo, clase);
    return { ok: true, id };
  } catch (e) {
    return mal(e);
  }
}
