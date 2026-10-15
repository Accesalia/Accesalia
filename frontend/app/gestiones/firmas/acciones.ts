"use server";

// FIRMAS DIGITALES (Monica, 15-oct-2026): subir o renovar el certificado de un
// titular, retirarlo y elegir con que firma se firma cada uso. La logica, en
// lib/firmaDigital.ts.

import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { elegirFirmaDeUso, retirarFirma, subirFirma } from "../../../lib/firmaDigital";

export type Resultado = { ok: true } | { ok: false; error: string };

async function hacer(f: (yo: NonNullable<Awaited<ReturnType<typeof quienSoy>>>) => Promise<unknown>): Promise<Resultado> {
  try {
    const yo = await quienSoy();
    if (!yo) return { ok: false, error: "Tienes que entrar en la app." };
    await f(yo);
    revalidatePath("/gestiones/firmas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** El fichero .p12 / .pfx y su contraseña, del formulario. */
export async function accionSubirFirma(datos: FormData): Promise<Resultado> {
  const empresa = String(datos.get("empresa") ?? "");
  const clave = String(datos.get("clave") ?? "");
  const fichero = datos.get("certificado");
  if (!(fichero instanceof File) || !fichero.size) return { ok: false, error: "Elige el fichero del certificado (.p12 o .pfx)." };
  if (!clave) return { ok: false, error: "Falta la contraseña del certificado." };
  return hacer(async (yo) => subirFirma(empresa, new Uint8Array(await fichero.arrayBuffer()), clave, yo));
}

export async function accionRetirarFirma(firmaId: string): Promise<Resultado> {
  return hacer((yo) => retirarFirma(firmaId, yo));
}

export async function accionElegirFirmaDeUso(uso: string, empresa: string | null): Promise<Resultado> {
  return hacer((yo) => elegirFirmaDeUso(uso, empresa, yo));
}
