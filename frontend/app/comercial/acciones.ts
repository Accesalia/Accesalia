"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearEntrada, type Destino } from "../../lib/entradaDiario";
import { extractoDeOportunidad } from "../../lib/cuadroComercial";
import { puedeEntrar, quienSoy } from "../../lib/sesion";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

export type GuardadoEntrada = { ok: true; donde: Destino["donde"] } | { ok: false; error: string };

/** GRABAR UNA ENTRADA DEL DIARIO desde el cuadro de mando. Quien la escribe
 *  sale de la sesion: es el autor, y por eso se detectan los conflictos. Dice
 *  donde ha acabado la nota, o por que no se ha podido guardar. */
export async function guardarEntrada(fd: FormData): Promise<GuardadoEntrada> {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  try {
    const destino = await crearEntrada({
      texto: String(fd.get("texto") ?? ""),
      canal: String(fd.get("canal") ?? ""),
      fecha: texto(fd, "fecha"),
      oportunidadId: texto(fd, "oportunidad"),
      persona: texto(fd, "con"),
      dondeTexto: texto(fd, "donde_texto"),
      autorId: yo.id,
      autorNombre: yo.nombre,
    });
    revalidatePath("/comercial");
    return { ok: true, donde: destino.donde };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Lo que se carga al DESPLEGAR una oportunidad en la lista: su diario y a
 *  quien llamar. Solo lectura, pero tambien con permiso: una pantalla abierta
 *  no es un permiso. */
export async function extractoOportunidad(id: string) {
  const yo = await quienSoy();
  if (!yo || !puedeEntrar(yo, "comercial")) return null;
  return extractoDeOportunidad(id);
}
