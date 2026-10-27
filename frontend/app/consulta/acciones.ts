"use server";

import { quienSoy } from "../../lib/sesion";
import { comprobarAdministrador, comprobarDireccion, type AdminConocido, type OppConocida } from "../../lib/buscarYComprobar";

// COMPROBAR SI YA EXISTE (Monica, 27-oct-2026): cualquiera de la casa, como el buscador.
export async function accionComprobarDireccion(q: string): Promise<{ ok: true; opps: OppConocida[] } | { ok: false; error: string }> {
  if (!(await quienSoy())) return { ok: false, error: "Entra de nuevo en la app." };
  try {
    return { ok: true, opps: await comprobarDireccion(q) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
export async function accionComprobarAdministrador(q: string): Promise<{ ok: true; admins: AdminConocido[] } | { ok: false; error: string }> {
  if (!(await quienSoy())) return { ok: false, error: "Entra de nuevo en la app." };
  try {
    return { ok: true, admins: await comprobarAdministrador(q) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
