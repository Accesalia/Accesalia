"use server";

// PEDIR VIABILIDAD SIN POLYCAM y LAS FASES QUE NO APLICAN (Monica, 15-oct-2026).
// Las acciones del bloque 1 de la opp; la logica en lib/solicitudViabilidad.ts y
// lib/necesidadesOpp.ts. Las pinta la ficha de la opp.

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerOpp } from "../../../lib/hojaEncargo";
import { marcarNecesidades } from "../../../lib/necesidadesOpp";
import { apuntarMaterial, enlaceMaterial, oppDeSolicitud, pedirViabilidad, permisoMaterial, type NuevaSolicitud } from "../../../lib/solicitudViabilidad";

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function permiso(oppId: string | null) {
  const yo = await quienSoy();
  if (!yo) throw new Error("Tienes que entrar en la app.");
  if (!oppId || !(await puedeVerOpp(yo, oppId))) throw new Error("No puedes tocar esta oportunidad.");
  return yo;
}

/** Pedir viabilidad y costes al arquitecto, sin Polycam. Devuelve el id de la
 *  solicitud: con el se sube despues el material (accionPermisoMaterial). */
export async function accionPedirViabilidad(oppId: string, s: NuevaSolicitud): Promise<Resultado<{ id: string; avisos: string[] }>> {
  try {
    const yo = await permiso(oppId);
    const r = await pedirViabilidad(oppId, s, yo);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    revalidatePath("/viabilidades");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Material de la solicitud, paso 1: permiso de subida (PUT del fichero a `url`). */
export async function accionPermisoMaterial(solicitudId: string, nombre: string): Promise<Resultado<{ ruta: string; url: string }>> {
  try {
    await permiso(await oppDeSolicitud(solicitudId));
    return { ok: true, ...(await permisoMaterial(solicitudId, nombre)) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Material de la solicitud, paso 2: ya subido, queda en ella. */
export async function accionApuntarMaterial(solicitudId: string, ruta: string, nombre: string): Promise<Resultado<{ id: string }>> {
  try {
    await permiso(await oppDeSolicitud(solicitudId));
    const id = await apuntarMaterial(solicitudId, ruta, nombre);
    revalidatePath("/viabilidades");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Abrir un fichero de una solicitud (enlace de diez minutos). Lo abren el
 *  comercial de la opp y quien hace viabilidades. */
export async function accionEnlaceMaterial(adjuntoId: string): Promise<string | null> {
  const yo = await quienSoy();
  if (!yo) return null;
  if (!yo.veTodo && !yo.funciones.some((f) => ["viabilidades", "comercial", "secretaria"].includes(f.clave))) return null;
  return enlaceMaterial(adjuntoId);
}

/** DESMARCAR LAS FASES QUE NO APLICAN: Polycam y viabilidad (y el 3D, expreso). true/false lo
 *  decide la persona; null vuelve a lo automatico (segun lo que quieren). */
export async function accionMarcarNecesidades(oppId: string, d: { polycam?: boolean | null; viabilidad?: boolean | null; tresd?: boolean | null }): Promise<Resultado> {
  try {
    const yo = await permiso(oppId);
    await marcarNecesidades(oppId, d, yo);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
