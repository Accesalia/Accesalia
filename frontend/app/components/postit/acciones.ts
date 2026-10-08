"use server";

import { quienSoy } from "../../../lib/sesion";
import {
  cambiarEstado,
  guardarPostit,
  listarPostits,
  proponerDirecciones,
  proponerPersonas,
  type DatosPostit,
  type Postit,
  type PropuestaDireccion,
  type PropuestaPersona,
} from "../../../lib/llamadas";

/** Lo que la app propone al lado mientras se escribe. */
export async function proponer(
  campo: "persona" | "direccion",
  q: string,
): Promise<PropuestaPersona[] | PropuestaDireccion[]> {
  if (!(await quienSoy())) return [];
  if (q.trim().length < 2) return [];
  return campo === "persona" ? proponerPersonas(q) : proponerDirecciones(q);
}

/** A cada cambio: se guarda solo, sin pulsar nada. */
export async function guardarSolo(d: DatosPostit): Promise<{ estado: string } | { error: string }> {
  const yo = await quienSoy();
  if (!yo) return { error: "Sin sesión" };
  try {
    return { estado: await guardarPostit(d, yo.id) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** GUARDAR: hace falta lo que te dicen y una persona o una direccion elegida. */
export async function guardarDeVerdad(d: DatosPostit): Promise<{ ok: true } | { error: string }> {
  const yo = await quienSoy();
  if (!yo) return { error: "Sin sesión" };
  await guardarPostit(d, yo.id);
  if (!d.que_dicen.trim()) return { error: "Falta lo que te dicen." };
  if (!d.quien && !d.donde) return { error: "Elige una persona o una dirección: la nota tiene que colgar de algún sitio." };
  await cambiarEstado(d.id, yo.id, ["abierta"], "por_colocar");
  return { ok: true };
}

/** DESCARTAR: no se borra; se queda como descartada. */
export async function descartar(d: DatosPostit): Promise<{ ok: true } | { error: string }> {
  const yo = await quienSoy();
  if (!yo) return { error: "Sin sesión" };
  await guardarPostit(d, yo.id);
  await cambiarEstado(d.id, yo.id, ["abierta"], "descartada");
  return { ok: true };
}

/** Los mios; direccion puede pedir todos. */
export async function misPostits(todas = false): Promise<Postit[]> {
  const yo = await quienSoy();
  if (!yo) return [];
  return listarPostits(yo.id, { todas: todas && yo.veTodo });
}

/** Los que se quedaron abiertos (recargar, cerrar la pestaña): vuelven solos. */
export async function abiertosMios(): Promise<Postit[]> {
  const yo = await quienSoy();
  if (!yo) return [];
  return listarPostits(yo.id, { soloAbiertas: true });
}
