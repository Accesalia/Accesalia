"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { cambiarGasto, dejarDeIncluir, guardarGasto, puedeVerGastos, quitarGasto, volverAIncluir, type DatosGasto } from "../../../lib/gastosMes";

export type Resultado = { ok: true } | { ok: false; error: string };

/** En CADA accion: abrir la pantalla no es permiso para escribir. */
async function permiso() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever/gastos");
  if (!puedeVerGastos(yo)) redirect("/menu");
  return yo;
}

async function hacer(f: () => Promise<unknown>): Promise<Resultado> {
  try {
    await f();
    revalidatePath("/prever/gastos");
    revalidatePath("/prever/caja");
    revalidatePath("/prever/gastos/lista");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionGuardarGasto(d: DatosGasto, id: string | null) {
  const yo = await permiso();
  return hacer(() => guardarGasto(d, id, yo));
}

export async function accionQuitarGasto(id: string, mes: string) {
  await permiso();
  return hacer(() => quitarGasto(id, mes));
}

export async function accionCambiarGasto(id: string, cambio: { avisar?: boolean; notas?: string | null; importe?: number }) {
  await permiso();
  return hacer(() => cambiarGasto(id, cambio));
}

export async function accionDejarDeIncluir(id: string, ultimoMes: string) {
  await permiso();
  return hacer(() => dejarDeIncluir(id, ultimoMes));
}

export async function accionVolverAIncluir(id: string) {
  await permiso();
  return hacer(() => volverAIncluir(id));
}
