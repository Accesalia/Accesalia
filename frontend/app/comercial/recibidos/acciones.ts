"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { aceptar, enlaceRecibido, rechazar } from "../../../lib/recibidos";

// REVISAR LO QUE SUBE LA COMUNIDAD. Cada accion comprueba que le toca a quien la hace.
async function yo() {
  const y = await quienSoy();
  if (!y) redirect("/entrar?volver=/comercial/recibidos");
  return y;
}
const refrescar = () => {
  revalidatePath("/comercial/recibidos");
  // la ficha de la comunidad y su portal enseñan lo revisado
  revalidatePath("/administracion/comunidades/[id]", "page");
  revalidatePath("/portal/c/[id]", "page");
  revalidatePath("/pendientes");
  revalidatePath("/facturacion");
};

export async function accionAceptar(id: string, fecha: string | null = null): Promise<{ ok: boolean; error?: string }> {
  try {
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("La fecha no es válida.");
    await aceptar(id, await yo(), fecha);
    refrescar();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionRechazar(id: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await rechazar(id, motivo, await yo());
    refrescar();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionVer(id: string): Promise<string | null> {
  return enlaceRecibido(id, await yo());
}
