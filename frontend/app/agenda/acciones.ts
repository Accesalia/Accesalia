"use server";

// LAS ACCIONES DE LA AGENDA (Monica, 14-oct-2026). La primera: apuntar o mover la
// visita de escaneo de una opp. La pinta la cabecera de la ficha de la opp (su
// boton "Agendar"); aqui solo se guarda.

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../lib/sesion";
import { puedeVerOpp } from "../../lib/hojaEncargo";
import {
  aHoraMadrid,
  apuntarAdjunto,
  crearCita,
  enlaceAdjunto,
  guardarEscaneo,
  permisoAdjunto,
  puedeTocarCita,
  type CitaNueva,
} from "../../lib/citas";

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** `local`: la fecha y hora de Madrid de la casilla, "2026-10-20T10:30". */
export async function accionGuardarEscaneo(oppId: string, local: string): Promise<Resultado<{ inicio: string; local: string }>> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    if (!(await puedeVerOpp(yo, oppId))) return { ok: false, error: "No puedes tocar esta oportunidad." };
    const c = await guardarEscaneo(oppId, local, yo.id);
    revalidatePath(`/comercial/oportunidades/${oppId}`);
    return { ok: true, inicio: c.inicio, local: aHoraMadrid(c.inicio) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** CREAR UNA CITA desde la agenda (14-oct-2026). En la agenda propia; en la de
 *  otro, solo direccion y la secretaria comercial. */
export async function accionCrearCita(c: CitaNueva): Promise<Resultado<{ id: string }>> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    if (c.deQuien !== yo.id && !yo.veTodo && !yo.funciones.some((f) => f.clave === "secretaria"))
      return { ok: false, error: "Solo puedes apuntar en tu agenda." };
    if (c.oportunidadId && !(await puedeVerOpp(yo, c.oportunidadId))) return { ok: false, error: "No puedes tocar esa oportunidad." };
    const id = await crearCita(c, yo.id);
    revalidatePath("/agenda");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Adjuntar un fichero, paso 1: permiso de subida. El navegador hace PUT del
 *  fichero a `url` y despues llama a accionApuntarAdjunto con la `ruta`. */
export async function accionPermisoAdjunto(citaId: string, nombre: string): Promise<Resultado<{ ruta: string; url: string }>> {
  try {
    const yo = await quienSoy();
    if (!yo || !(await puedeTocarCita(yo, citaId))) return { ok: false, error: "No puedes tocar esta cita." };
    return { ok: true, ...(await permisoAdjunto(citaId, nombre)) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Adjuntar un fichero, paso 2: ya subido, queda en la cita. */
export async function accionApuntarAdjunto(citaId: string, ruta: string, nombre: string): Promise<Resultado<{ id: string }>> {
  try {
    const yo = await quienSoy();
    if (!yo || !(await puedeTocarCita(yo, citaId))) return { ok: false, error: "No puedes tocar esta cita." };
    const id = await apuntarAdjunto(citaId, ruta, nombre);
    revalidatePath("/agenda");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** El enlace para abrir un adjunto de tipo fichero (caduca en diez minutos). */
export async function accionEnlaceAdjunto(adjuntoId: string): Promise<string | null> {
  const yo = await quienSoy();
  if (!yo) return null;
  const e = await enlaceAdjunto(adjuntoId);
  if (!e || !(await puedeTocarCita(yo, e.citaId))) return null;
  return e.url;
}
