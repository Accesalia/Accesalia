"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { enviarFactura, leerYCuadrar, type Lectura } from "../../../../lib/enviarFactura";

// PASO 2 DE LA PROFORMA: leer y cuadrar los dos PDF (no escribe) y enviar.

async function yo() {
  const y = await quienSoy();
  if (!y) redirect("/entrar?volver=/facturacion/cobrar/proforma");
  if (!puedeVerCobros(y)) redirect("/menu");
  return y;
}
const pdf = async (f: FormDataEntryValue | null) =>
  f instanceof File && f.size ? { nombre: f.name, contenido: new Uint8Array(await f.arrayBuffer()) } : null;

export async function accionLeerFactura(proformaId: string, fd: FormData): Promise<{ ok: true; lectura: Lectura } | { ok: false; error: string }> {
  try {
    const factura = await pdf(fd.get("factura"));
    if (!factura) return { ok: false, error: "Falta el PDF de la factura." };
    return { ok: true, lectura: await leerYCuadrar(await yo(), proformaId, factura, await pdf(fd.get("justificante"))) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionEnviarFactura(proformaId: string, fd: FormData): Promise<{ ok: true; factura: string } | { ok: false; error: string }> {
  try {
    const factura = await pdf(fd.get("factura"));
    if (!factura) return { ok: false, error: "Falta el PDF de la factura." };
    const r = await enviarFactura(
      await yo(),
      proformaId,
      factura,
      await pdf(fd.get("justificante")),
      { para: fd.getAll("para").map(String), asunto: String(fd.get("asunto") ?? ""), cuerpo: String(fd.get("cuerpo") ?? "") },
      String(fd.get("nota") ?? ""),
    );
    revalidatePath("/facturacion/cobrar/proforma");
    revalidatePath("/facturacion/cobrar/facturas");
    return { ok: true, factura: r.factura };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
