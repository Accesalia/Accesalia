"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../../lib/sesion";
import { guardarJustificante, type Empresa, type Pago, type TipoCobro } from "../../../../lib/justificantes";

const numero = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));

/** Guardar el justificante (el formulario lleva el fichero, los datos del cobro y los pagos en JSON). */
export async function accionGuardarJustificante(datos: FormData): Promise<{ ok?: string; error?: string }> {
  try {
    const yo = await quienSoy();
    if (!yo) return { error: "Tienes que entrar de nuevo." };
    const pagos = JSON.parse(String(datos.get("pagos") ?? "[]")) as Pago[];
    const r = await guardarJustificante(yo, {
      empresa: String(datos.get("empresa")) as Empresa,
      fecha: String(datos.get("fecha") ?? ""),
      tipo: String(datos.get("tipo")) as TipoCobro,
      ingresado: numero(datos.get("ingresado")),
      gasto: numero(datos.get("gasto")) || 0,
      pagos: pagos.map((p) => ({ facturaId: String(p.facturaId), importe: Number(p.importe) })),
      fichero: datos.get("fichero") as File,
    });
    revalidatePath("/facturacion/cobrar/justificantes");
    revalidatePath("/facturacion/cobrar/sin-justificante");
    return { ok: `Justificante guardado en ${r.facturas} factura${r.facturas > 1 ? "s" : ""}.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se ha podido guardar." };
  }
}
