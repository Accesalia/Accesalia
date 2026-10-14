"use server";

import { crearLineasDeHoja } from "../../../lib/lineasDeHoja";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import {
  apuntarFirmada,
  descartarBorrador,
  oppDeHoja,
  enlaceFirmada,
  generarHoja,
  marcarEnviada,
  permisoFirmada,
  puedeHacerHojas,
  puedeVerOpp,
  type Generar,
} from "../../../lib/hojaEncargo";

/** Se comprueba en CADA accion: abrir la pantalla no es permiso para escribir.
 *  Y no basta con la funcion: un comercial solo toca las de su cartera. */
async function permiso(oppId: string | null) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/hoja-encargo");
  if (!puedeHacerHojas(yo)) redirect("/comercial");
  if (!oppId || !(await puedeVerOpp(yo, oppId))) throw new Error("No puedes tocar las hojas de esta oportunidad.");
  return yo;
}

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function accionGenerar(g: Generar): Promise<Resultado<{ versionId: string; hojaId: string }>> {
  try {
    const yo = await permiso(g.oportunidadId);
    if (g.hojaId && (await oppDeHoja(g.hojaId)) !== g.oportunidadId) throw new Error("La hoja no es de esta oportunidad.");
    // La puerta de calidad esta en GENERAR (Monica, 26-sep): el dato a medias
    // se acepta en el alta, pero no llega a un documento.
    if (!g.oportunidadId) return { ok: false, error: "Elige de qué oportunidad es la hoja." };
    if (!g.actuaciones.length || g.actuaciones.some((a) => !a.tipoId))
      return { ok: false, error: "Cada actuación necesita su tipo de proyecto." };
    if (g.actuaciones.some((a) => !a.accesoIds.length)) return { ok: false, error: "Cada actuación necesita al menos un acceso." };
    if (!g.conceptos.length) return { ok: false, error: "Marca al menos un bloque." };
    // Las lineas que van DENTRO de un proyecto conjunto pueden ir a cero: "a
    // veces el proyecto conjunto tiene un precio unico, y otras se desglosa"
    // (Monica, 6-oct-2026). Lo que no puede faltar es el importe del conjunto.
    // Una linea a exito (Subvenciones: 3% de lo concedido) no tiene importe fijo:
    // lleva su porcentaje (14-oct-2026).
    if (g.conceptos.some((k) => k.desglose === "se_cobra" && !k.enConjunto && !(k.importe && k.importe > 0) && !(k.porcentaje && k.porcentaje > 0)))
      return { ok: false, error: "Falta el importe de alguna línea que se cobra." };
    if (g.conceptos.some((k) => k.formaPagoAMano && !(k.formaPago ?? "").trim()))
      return { ok: false, error: "Escribe la forma de pago de la línea que va a mano." };
    if (g.conjunto && !(g.conjunto.importe > 0))
      return { ok: false, error: "Falta el importe del proyecto conjunto." };
    if (g.aQuien.tipo !== "comunidad" && !g.aQuien.id) return { ok: false, error: "Elige a quién va la hoja." };
    const r = await generarHoja(g, yo);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: "No se ha podido generar: " + (e as Error).message };
  }
}

/** GUARDAR COMO BORRADOR (Monica, 6-oct-2026): "para no perder los datos NI
 *  generar el PDF". Guarda igual que generar pero sin el documento, asi que la
 *  hoja sigue viva y editable: es la excepcion a "si hay PDF, esta congelado".
 *
 *  Y por eso NO se exigen los importes: un borrador es justo lo que esta a
 *  medias. Lo que no se puede guardar vacio es a quien va y donde. */
export async function accionBorrador(g: Generar): Promise<Resultado<{ versionId: string; hojaId: string }>> {
  try {
    const yo = await permiso(g.oportunidadId);
    if (g.hojaId && (await oppDeHoja(g.hojaId)) !== g.oportunidadId) throw new Error("La hoja no es de esta oportunidad.");
    if (!g.oportunidadId) return { ok: false, error: "Elige de qué oportunidad es la hoja." };
    if (g.aQuien.tipo !== "comunidad" && !g.aQuien.id) return { ok: false, error: "Elige a quién va la hoja." };
    const r = await generarHoja({ ...g, borrador: true }, yo);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: "No se ha podido guardar: " + (e as Error).message };
  }
}

/** Descartar el borrador: solo lo que no ha salido de Accesalia (14-oct-2026). */
export async function accionDescartarBorrador(hojaId: string): Promise<Resultado> {
  try {
    await permiso(await oppDeHoja(hojaId));
    await descartarBorrador(hojaId);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionEnviada(hojaId: string): Promise<Resultado> {
  try {
    await permiso(await oppDeHoja(hojaId));
    await marcarEnviada(hojaId);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionPermisoFirmada(hojaId: string, nombre: string): Promise<Resultado<{ ruta: string; url: string }>> {
  try {
    await permiso(await oppDeHoja(hojaId));
    return { ok: true, ...(await permisoFirmada(hojaId, nombre)) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionApuntarFirmada(hojaId: string, ruta: string): Promise<Resultado> {
  try {
    await permiso(await oppDeHoja(hojaId));
    if (!ruta.startsWith(`hojas-encargo/${hojaId}/`)) throw new Error("Ruta que no es de esta hoja.");
    await apuntarFirmada(hojaId, ruta);
    // Firmada: nacen sus lineas e hitos de cobro (12-oct-2026).
    await crearLineasDeHoja(hojaId);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionEnlaceFirmada(hojaId: string, versionId: string, indice: number): Promise<string | null> {
  await permiso(await oppDeHoja(hojaId));
  return enlaceFirmada(hojaId, versionId, indice);
}
