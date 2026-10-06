"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import {
  apuntarFirmada,
  comunidadDeHoja,
  enlaceFirmada,
  generarHoja,
  marcarEnviada,
  permisoFirmada,
  puedeHacerHojas,
  puedeVerComunidad,
  type Generar,
} from "../../../lib/hojaEncargo";

/** Se comprueba en CADA accion: abrir la pantalla no es permiso para escribir.
 *  Y no basta con la funcion: un comercial solo toca las de su cartera. */
async function permiso(comunidadId: string | null) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/hoja-encargo");
  if (!puedeHacerHojas(yo)) redirect("/comercial");
  if (!comunidadId || !(await puedeVerComunidad(yo, comunidadId))) throw new Error("No puedes tocar las hojas de esta comunidad.");
  return yo;
}

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function accionGenerar(g: Generar): Promise<Resultado<{ versionId: string; hojaId: string }>> {
  try {
    const yo = await permiso(g.comunidadId);
    if (g.hojaId && (await comunidadDeHoja(g.hojaId)) !== g.comunidadId) throw new Error("La hoja no es de esta comunidad.");
    // La puerta de calidad esta en GENERAR (Monica, 26-sep): el dato a medias
    // se acepta en el alta, pero no llega a un documento.
    if (!g.oportunidadId) return { ok: false, error: "Elige de qué oportunidad es la hoja." };
    if (!g.actuaciones.length || g.actuaciones.some((a) => !a.tipoId))
      return { ok: false, error: "Cada actuación necesita su tipo de proyecto." };
    if (g.actuaciones.some((a) => !a.accesoIds.length)) return { ok: false, error: "Cada actuación necesita al menos un acceso." };
    if (!g.conceptos.length) return { ok: false, error: "Marca al menos un bloque." };
    if (g.conceptos.some((k) => k.desglose === "se_cobra" && !(k.importe && k.importe > 0)))
      return { ok: false, error: "Falta el importe de alguna línea que se cobra." };
    if (g.aQuien.tipo === "contrata" && !g.aQuien.id) return { ok: false, error: "Elige la contrata." };
    const r = await generarHoja(g, yo);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: "No se ha podido generar: " + (e as Error).message };
  }
}

export async function accionEnviada(hojaId: string): Promise<Resultado> {
  try {
    await permiso(await comunidadDeHoja(hojaId));
    await marcarEnviada(hojaId);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionPermisoFirmada(hojaId: string, nombre: string): Promise<Resultado<{ ruta: string; url: string }>> {
  try {
    await permiso(await comunidadDeHoja(hojaId));
    return { ok: true, ...(await permisoFirmada(hojaId, nombre)) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionApuntarFirmada(hojaId: string, ruta: string): Promise<Resultado> {
  try {
    await permiso(await comunidadDeHoja(hojaId));
    if (!ruta.startsWith(`hojas-encargo/${hojaId}/`)) throw new Error("Ruta que no es de esta hoja.");
    await apuntarFirmada(hojaId, ruta);
    revalidatePath("/comercial/hoja-encargo");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionEnlaceFirmada(hojaId: string, versionId: string, indice: number): Promise<string | null> {
  await permiso(await comunidadDeHoja(hojaId));
  return enlaceFirmada(hojaId, versionId, indice);
}
