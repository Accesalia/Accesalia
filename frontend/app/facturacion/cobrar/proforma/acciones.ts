"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { buscarEnDrive, enviarFactura, leerYCuadrar, type EnDrive, type Lectura } from "../../../../lib/enviarFactura";
import { descargarDeFacturas } from "../../../../lib/driveFacturas";

// PASO 2 DE LA PROFORMA: buscar la factura en la carpeta del Drive, leer y
// cuadrar los dos PDF (no escribe) y enviar. Los PDF llegan soltados a mano o,
// si la app los encontro en el Drive, por su id ("drive_factura", "drive_justificante").

async function yo() {
  const y = await quienSoy();
  if (!y) redirect("/entrar?volver=/facturacion/cobrar/proforma");
  if (!puedeVerCobros(y)) redirect("/menu");
  return y;
}
const suelto = async (f: FormDataEntryValue | null) =>
  f instanceof File && f.size ? { nombre: f.name, contenido: new Uint8Array(await f.arrayBuffer()) } : null;
async function pdf(fd: FormData, campo: "factura" | "justificante") {
  const deDrive = fd.get(`drive_${campo}`);
  return (await suelto(fd.get(campo))) ?? (typeof deDrive === "string" && deDrive ? descargarDeFacturas(deDrive) : null);
}

export async function accionBuscarEnDrive(proformaId: string): Promise<{ ok: true; drive: EnDrive } | { ok: false; error: string }> {
  try {
    return { ok: true, drive: await buscarEnDrive(await yo(), proformaId) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionLeerFactura(proformaId: string, fd: FormData): Promise<{ ok: true; lectura: Lectura } | { ok: false; error: string }> {
  try {
    const y = await yo();
    const factura = await pdf(fd, "factura");
    if (!factura) return { ok: false, error: "Falta el PDF de la factura." };
    return { ok: true, lectura: await leerYCuadrar(y, proformaId, factura, await pdf(fd, "justificante")) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionEnviarFactura(proformaId: string, fd: FormData): Promise<{ ok: true; factura: string } | { ok: false; error: string }> {
  try {
    const y = await yo();
    const factura = await pdf(fd, "factura");
    if (!factura) return { ok: false, error: "Falta el PDF de la factura." };
    const r = await enviarFactura(
      y,
      proformaId,
      factura,
      await pdf(fd, "justificante"),
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
