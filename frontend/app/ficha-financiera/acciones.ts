"use server";

import { quienSoy } from "../../lib/sesion";
import { buscarOpps } from "../../lib/consulta";
import { vistaDe } from "../../lib/fichaFinanciera";

/** El buscador de la ficha financiera: las opps por su direccion. */
export async function accionBuscarFicha(q: string): Promise<{ id: string; nombre: string; detalle: string }[]> {
  const yo = await quienSoy();
  if (!yo || !vistaDe(yo)) return [];
  return (await buscarOpps(q)).map(({ id, nombre, detalle }) => ({ id, nombre, detalle }));
}
