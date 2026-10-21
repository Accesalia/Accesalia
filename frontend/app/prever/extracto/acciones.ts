"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerGastos } from "../../../lib/gastosMes";
import { decirQueEs, subirExtractos, type ResultadoCuenta } from "../../../lib/extractos";

async function permiso() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever/extracto");
  if (!puedeVerGastos(yo)) redirect("/menu");
  return yo;
}

export async function accionSubirExtractos(fd: FormData): Promise<{ ok: true; resultados: ResultadoCuenta[] } | { ok: false; error: string }> {
  await permiso();
  try {
    const ficheros = await Promise.all(
      fd.getAll("ficheros").filter((f): f is File => f instanceof File && f.size > 0).map(async (f) => ({ nombre: f.name, datos: await f.arrayBuffer() })),
    );
    if (!ficheros.length) return { ok: false, error: "No ha llegado ningún fichero." };
    const resultados = await subirExtractos(ficheros);
    revalidatePath("/prever/gastos");
    revalidatePath("/prever/extracto");
    return { ok: true, resultados };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionDecirQueEs(id: string, d: { tipo: string; seRepite: "si" | "no" | null; gastoId: string | null; patron: string }) {
  await permiso();
  try {
    await decirQueEs(id, d);
    revalidatePath("/prever/gastos");
    revalidatePath("/prever/extracto");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
