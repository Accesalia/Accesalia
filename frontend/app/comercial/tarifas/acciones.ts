"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { puedeGestionarBloques } from "../../../lib/catalogoBloques";
import { asignarTarifa, darDeBaja, guardarPrecio, type DatosPrecio, type Forma } from "../../../lib/tarifas";

// Las tarifas las cambian los mismos que el catalogo de bloques: direccion y
// secretaria. Se comprueba en cada accion, no solo al abrir.
async function permiso() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/tarifas");
  if (!puedeGestionarBloques(yo)) redirect("/comercial");
  return yo;
}

export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string };

/** "1.980,50 €" -> 1980.5; vacio -> null. */
const numero = (v: string) => {
  const t = v.trim().replace(/\s|€|%/g, "");
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export type Formulario = {
  tarifaId: string;
  bloqueId: string;
  tipoId: string;
  desde: string;
  hasta: string;
  forma: Forma;
  valor: string;
  incluye: string[];
  nota: string;
};

function leer(f: Formulario): DatosPrecio | string {
  if (!f.bloqueId) return "Elige el concepto.";
  const valor = numero(f.valor);
  if (valor == null || Number.isNaN(valor) || valor < 0) return f.forma === "fijo" ? "Escribe el importe." : "Escribe el porcentaje.";
  const desde = f.desde.trim() ? Number(f.desde) : null;
  const hasta = f.hasta.trim() ? Number(f.hasta) : null;
  if ((desde != null && !Number.isInteger(desde)) || (hasta != null && !Number.isInteger(hasta))) return "Las viviendas van en números enteros.";
  if (desde != null && hasta != null && desde > hasta) return "El tramo de viviendas está al revés.";
  return {
    tarifaId: f.tarifaId,
    bloqueId: f.bloqueId,
    tipoId: f.tipoId || null,
    desde,
    hasta,
    forma: f.forma,
    importe: f.forma === "fijo" ? valor : null,
    porcentaje: f.forma === "fijo" ? null : valor,
    incluye: f.incluye.filter((x) => x !== f.bloqueId),
    nota: f.nota.trim() || null,
  };
}

export async function accionGuardarPrecio(f: Formulario, antes: Formulario | null): Promise<Resultado> {
  const yo = await permiso();
  const d = leer(f);
  if (typeof d === "string") return { ok: false, error: d };
  const a = antes ? leer(antes) : null;
  try {
    await guardarPrecio(d, yo.id ?? null, typeof a === "string" ? null : a);
    revalidatePath("/comercial/tarifas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "No se ha podido guardar: " + (e as Error).message };
  }
}

export async function accionQuitarPrecio(f: Formulario): Promise<Resultado> {
  const yo = await permiso();
  const d = leer(f);
  if (typeof d === "string") return { ok: false, error: d };
  try {
    await darDeBaja(d, yo.id ?? null);
    revalidatePath("/comercial/tarifas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "No se ha podido quitar: " + (e as Error).message };
  }
}

/** GUARDAR UN BLOQUE ENTERO (Monica, 17-oct-2026): se modifica por bloques
 *  logicos -todo el SATE, todo el ascensor...- y se guarda de una vez. */
export type Operacion = { quitar: boolean; f: Formulario; antes: Formulario | null };
export async function accionGuardarVarios(ops: Operacion[]): Promise<Resultado> {
  const yo = await permiso();
  const leidas: { quitar: boolean; d: DatosPrecio; antes: DatosPrecio | null }[] = [];
  for (const o of ops) {
    const d = leer(o.f);
    if (typeof d === "string") return { ok: false, error: d };
    const a = o.antes ? leer(o.antes) : null;
    leidas.push({ quitar: o.quitar, d, antes: typeof a === "string" ? null : a });
  }
  try {
    for (const o of leidas) {
      if (o.quitar) await darDeBaja(o.d, yo.id ?? null);
      else await guardarPrecio(o.d, yo.id ?? null, o.antes);
    }
    revalidatePath("/comercial/tarifas");
    return { ok: true, mensaje: `Guardado (${leidas.length} ${leidas.length === 1 ? "precio" : "precios"}). Vale desde hoy; lo de antes queda en el historial.` };
  } catch (e) {
    return { ok: false, error: "No se ha podido guardar todo: " + (e as Error).message };
  }
}

export async function accionAsignar(contrataId: string, tarifaId: string | null): Promise<Resultado> {
  await permiso();
  try {
    await asignarTarifa(contrataId, tarifaId);
    revalidatePath("/comercial/tarifas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "No se ha podido cambiar: " + (e as Error).message };
  }
}
