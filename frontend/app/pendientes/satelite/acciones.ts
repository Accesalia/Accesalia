"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { apuntePendiente, cerrarApunte, descartarApunte } from "../../../lib/apuntesSatelite";
import { crearAdminDesdeMovil } from "../../../lib/adminMovil";
import { crearEntrada } from "../../../lib/entradaDiario";

// LO APUNTADO DESDE EL SATELITE, EN LA OFICINA (Monica, 13-oct-2026): se
// completa y se da de alta, o se descarta. Nada se borra.

async function yoComercial() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/satelite");
  if (!puedeEntrar(yo, "comercial", "trabajar")) throw new Error("Sin permiso.");
  return yo;
}

export type Resultado = { ok: true } | { ok: false; error: string };

/** El administrador apuntado: se crea como lo creaba el movil (persona + su
 *  puesto de administrador, sin administracion todavia, posible de quien lo
 *  trajo), con su nota. */
export async function accionAltaAdmin(id: string, d: { nombre: string; telefono: string; correo: string }): Promise<Resultado> {
  try {
    const yo = await yoComercial();
    const a = await apuntePendiente(yo, id);
    if (!a || a.tipo !== "administrador") throw new Error("Ese apunte ya no está pendiente o no es tuyo.");
    const personaId = crypto.randomUUID();
    const puestoId = await crearAdminDesdeMovil(yo, { personaId, puestoId: crypto.randomUUID(), nombre: d.nombre, telefono: d.telefono || null, correo: d.correo || null });
    if (a.nota.trim()) {
      await crearEntrada({
        texto: a.nota,
        canal: a.canal ?? "",
        fecha: a.fecha,
        oportunidadId: null,
        persona: "puesto:" + puestoId,
        dondeTexto: null,
        autorId: yo.id,
        autorNombre: yo.nombre,
        fotos: Array.isArray(a.datos.fotos) ? (a.datos.fotos as unknown[]).map(String) : [],
      });
    }
    await cerrarApunte(yo, id, { personaId });
    revalidatePath("/pendientes");
    revalidatePath("/pendientes/satelite");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionDescartar(id: string, motivo: string): Promise<Resultado> {
  try {
    const yo = await yoComercial();
    await descartarApunte(yo, id, motivo);
    revalidatePath("/pendientes");
    revalidatePath("/pendientes/satelite");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
