"use server";

import { revalidatePath } from "next/cache";
import { quienSoy, type Yo } from "../../../../lib/sesion";
import { puedeFacturacion } from "../../../../lib/recorridoHoja";
import { cambiarEmisor, emitirCosas, enviarDesdeCosas, guardarCif, guardarCodigo, guardarIban, type PedidoEmitir } from "../../../../lib/cosasAFacturar";

// COSAS A FACTURAR: lo que se completa ahi mismo, emitir y enviar. Solo facturacion.

type Resp<T = undefined> = { ok: true; datos?: T } | { ok: false; error: string };

async function hacer<T>(oppId: string, cambio: (yo: Yo) => Promise<T>): Promise<Resp<T>> {
  const yo = await quienSoy();
  if (!yo || !puedeFacturacion(yo)) return { ok: false, error: "No tienes acceso a la facturación." };
  try {
    const datos = await cambio(yo);
    revalidatePath(`/facturacion/cobrar/cosas/${oppId}`);
    revalidatePath("/facturacion/cobrar/cosas");
    return { ok: true, datos };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se ha podido guardar." };
  }
}

export async function accionCodigo(oppId: string, hojaId: string, codigo: string, valor: string) {
  return hacer(oppId, () => guardarCodigo(hojaId, codigo, valor));
}
export async function accionCif(oppId: string, comunidadId: string, cif: string) {
  return hacer(oppId, () => guardarCif(comunidadId, cif));
}
export async function accionIban(oppId: string, comunidadId: string, iban: string) {
  return hacer(oppId, () => guardarIban(comunidadId, iban));
}
export async function accionEmisor(oppId: string, lineaId: string, empresa: "accesalia" | "daniel") {
  return hacer(oppId, (yo) => cambiarEmisor(yo, lineaId, empresa));
}
export async function accionEmitir(oppId: string, pedido: PedidoEmitir) {
  return hacer(oppId, (yo) => emitirCosas(yo, oppId, pedido));
}
export async function accionEnviar(oppId: string, proformaId: string, para: string[], asunto: string, cuerpo: string, hojas: string[]) {
  return hacer(oppId, (yo) => enviarDesdeCosas(yo, proformaId, { para, asunto, cuerpo }, hojas));
}
