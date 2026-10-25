"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { anularProforma, crearProforma, enviarProforma, leerProforma, type NuevaProforma } from "../../../lib/proformas";
import { pdfDeProforma } from "../../../lib/pdf/ProformaDoc";

// LAS PROFORMAS (12-oct-2026). Cada accion comprueba el libro dentro de
// lib/proformas: abrir la pantalla no es permiso para escribir.

export type Resultado = { ok: true; id?: string; dice?: string } | { ok: false; error: string };

async function yo() {
  const y = await quienSoy();
  if (!y) redirect("/entrar?volver=/facturacion");
  return y;
}

function refrescar(oppId: string | null, id?: string) {
  if (oppId) revalidatePath(`/facturacion/${oppId}`);
  if (id) revalidatePath(`/facturacion/proforma/${id}`);
  revalidatePath("/facturacion/proformas");
}

export async function accionEmitirProforma(oppId: string, n: NuevaProforma): Promise<Resultado> {
  try {
    const id = await crearProforma(await yo(), n);
    refrescar(oppId, id);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionAnularProforma(id: string, motivo: string): Promise<Resultado> {
  try {
    const dice = await anularProforma(await yo(), id, motivo);
    const p = await leerProforma(id);
    refrescar(p?.oppId ?? null, id);
    return { ok: true, dice };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionEnviarProforma(id: string, para: string[], asunto: string, cuerpo: string): Promise<Resultado> {
  try {
    const y = await yo();
    const p = await leerProforma(id);
    if (!p) throw new Error("Esa proforma no existe.");
    await enviarProforma(y, id, { para, asunto, cuerpo }, await pdfDeProforma(p));
    refrescar(p.oppId, id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
