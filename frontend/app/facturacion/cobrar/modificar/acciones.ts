"use server";

import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { buscarOpps } from "../../../../lib/consulta";

/** El buscador de Modificar Hitos / Buscar direccion: las opps por su direccion. */
export async function accionBuscarDireccion(q: string): Promise<{ id: string; nombre: string; detalle: string }[]> {
  const yo = await quienSoy();
  if (!yo || !puedeVerCobros(yo)) return [];
  return (await buscarOpps(q)).map(({ id, nombre, detalle }) => ({ id, nombre, detalle }));
}
