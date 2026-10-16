"use server";

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { buscarOpps } from "../../../lib/consulta";
import { corregir, estimar, nuevoRequerimiento, ordenar, puedeAsignar, puedeEstimar, terminar, type Dificultad } from "../../../lib/trabajosTecnico";

// ASIGNAR › PROYECTOS y la bandeja de Alex: lo que se guarda en trabajos_tecnico.
// Estimar, Alex (estimacion_proyectos); el resto, quien asigna (Alexandra).

type Res = { ok: boolean; error?: string };
const DIFICULTADES: Dificultad[] = ["baja", "normal", "alta"];

async function con(permiso: "estimar" | "asignar", hacer: (yo: NonNullable<Awaited<ReturnType<typeof quienSoy>>>) => Promise<void>): Promise<Res> {
  try {
    const yo = await quienSoy();
    if (!yo || !(permiso === "estimar" ? puedeEstimar(yo) || puedeAsignar(yo) : puedeAsignar(yo))) throw new Error("Sin permiso.");
    await hacer(yo);
    revalidatePath("/facturacion/caja");
    revalidatePath("/proyectos/estimar");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
const dificultad = (d: string): Dificultad => {
  if (!DIFICULTADES.includes(d as Dificultad)) throw new Error("Dificultad no valida");
  return d as Dificultad;
};

export async function accionEstimar(oppId: string, dif: string, dias: number, calculados: number | null) {
  return con("estimar", (yo) => estimar(oppId, dificultad(dif), dias, calculados, yo));
}
export async function accionCorregir(id: string, cambios: { dias?: number; dificultad?: string }) {
  return con("asignar", (yo) => corregir(id, { dias: cambios.dias, dificultad: cambios.dificultad ? dificultad(cambios.dificultad) : undefined }, yo));
}
export async function accionOrdenar(tecnicoId: string | null, ids: string[]) {
  return con("asignar", (yo) => ordenar(tecnicoId, ids, yo));
}
export async function accionRequerimiento(oppId: string, nombre: string, dias: number) {
  return con("asignar", (yo) => nuevoRequerimiento(oppId, nombre, dias, yo));
}
export async function accionTerminar(id: string, hecho: boolean) {
  return con("asignar", (yo) => terminar(id, hecho, yo));
}

/** El buscador del requerimiento: las opps por su direccion. */
export async function accionBuscarOpp(q: string): Promise<{ id: string; nombre: string; detalle: string }[]> {
  const yo = await quienSoy();
  if (!yo || !puedeAsignar(yo)) return [];
  return (await buscarOpps(q)).map(({ id, nombre, detalle }) => ({ id, nombre, detalle }));
}
