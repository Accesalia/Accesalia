"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import {
  activarBloque,
  crearBloque,
  DESGLOSES,
  guardarBloque,
  moverBloque,
  puedeGestionarBloques,
  retirarBloque,
  type DatosBloque,
  type Desglose,
} from "../../../lib/catalogoBloques";

/** Se comprueba en CADA accion: abrir la pantalla no es permiso para escribir. */
async function permiso() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/bloques");
  if (!puedeGestionarBloques(yo)) redirect("/comercial");
}

export type Resultado = { ok: true; id?: string } | { ok: false; error: string };

/** "1.980", "1980,50" o "1980" -> numero. Vacio -> sin importe. */
function importe(v: string): number | null | "mal" {
  const t = v.trim().replace(/\s|€/g, "");
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : "mal";
}

function leer(d: { nombreCorto: string; texto: string; desglose: string; importe: string }): DatosBloque | string {
  if (!d.nombreCorto.trim()) return "Falta el nombre corto.";
  if (!d.texto.trim()) return "Falta el texto que va a la hoja.";
  if (!DESGLOSES.includes(d.desglose as Desglose)) return "Elige cómo sale en el desglose.";
  const imp = importe(d.importe);
  if (imp === "mal") return "El importe no es un número.";
  return { nombreCorto: d.nombreCorto, texto: d.texto, desglose: d.desglose as Desglose, importe: imp };
}

export async function accionGuardar(
  id: string | null,
  d: { nombreCorto: string; texto: string; desglose: string; importe: string },
): Promise<Resultado> {
  await permiso();
  const datos = leer(d);
  if (typeof datos === "string") return { ok: false, error: datos };
  try {
    const nuevoId = id ? (await guardarBloque(id, datos), id) : await crearBloque(datos);
    revalidatePath("/comercial/bloques");
    return { ok: true, id: nuevoId };
  } catch (e) {
    return { ok: false, error: "No se ha podido guardar: " + (e as Error).message };
  }
}

export async function accionMover(id: string, sentido: -1 | 1) {
  await permiso();
  await moverBloque(id, sentido);
  revalidatePath("/comercial/bloques");
}

export async function accionRetirar(id: string) {
  await permiso();
  await retirarBloque(id);
  revalidatePath("/comercial/bloques");
}

export async function accionActivar(id: string) {
  await permiso();
  await activarBloque(id);
  revalidatePath("/comercial/bloques");
}
