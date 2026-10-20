"use server";

import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { PAPELES, permisoPapel, registrarPapel, type ClavePapel, type DatosPapel } from "../../../../lib/fichaComunidad";

// SUBIR LOS PAPELES DE LA COMUNIDAD desde su ficha (Monica, 20-oct-2026). Puede
// quien puede dar acceso a su pagina de documentacion: comercial o
// administracion con nivel de trabajar, o quien lo ve todo.

const TOPE = 25 * 1024 * 1024;
const MIME = /^(application\/pdf|image\/)/;

async function puede(): Promise<string | null> {
  const yo = await quienSoy();
  if (!yo) return "Tienes que entrar en la app.";
  if (!(yo.veTodo || puedeEntrar(yo, "comercial", "trabajar") || puedeEntrar(yo, "administracion", "trabajar"))) return "No tienes permiso para subir documentos.";
  return null;
}

export async function accionPermisoPapel(
  comunidadId: string,
  clave: ClavePapel,
  nombre: string,
  mime: string,
  tamano: number,
): Promise<{ ok: true; ruta: string; url: string } | { ok: false; error: string }> {
  const no = await puede();
  if (no) return { ok: false, error: no };
  if (!(clave in PAPELES)) return { ok: false, error: "Documento no válido." };
  if (tamano > TOPE) return { ok: false, error: "El fichero pasa de 25 MB." };
  if (mime && !MIME.test(mime)) return { ok: false, error: "Tiene que ser un PDF o una foto." };
  try {
    return { ok: true, ...(await permisoPapel(comunidadId, clave, nombre)) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionRegistrarPapel(d: DatosPapel): Promise<{ ok: true } | { ok: false; error: string }> {
  const no = await puede();
  if (no) return { ok: false, error: no };
  try {
    await registrarPapel(d);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath(`/administracion/comunidades/${d.comunidadId}`);
  return { ok: true };
}
