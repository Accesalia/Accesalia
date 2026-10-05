"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearEntrada } from "../../lib/entradaDiario";
import { extractoDeOportunidad } from "../../lib/cuadroComercial";
import { comercialDe, puedeEntrar, quienSoy } from "../../lib/sesion";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

/** GRABAR UNA ENTRADA DEL DIARIO desde el cuadro de mando.
 *
 *  De quien es la entrada: del comercial que se esta mirando si quien entra
 *  puede ver todas las carteras, y del suyo propio si es un comercial. Nunca se
 *  fia de lo que venga en el formulario para eso. */
export async function guardarEntrada(fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  const mio = await comercialDe(yo.id);
  const verTodo = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const comercialId = mio?.id ?? (verTodo ? texto(fd, "comercial") : null);

  await crearEntrada({
    texto: String(fd.get("texto") ?? ""),
    comoFue: String(fd.get("como_fue") ?? "manual"),
    fecha: texto(fd, "fecha"),
    comercialId,
    oportunidadId: texto(fd, "oportunidad"),
    puestoId: texto(fd, "con"),
    autorId: yo.id,
  });

  revalidatePath("/comercial");
}

/** Lo que se carga al DESPLEGAR una oportunidad en la lista: su diario y a
 *  quien llamar. Solo lectura, pero tambien con permiso: una pantalla abierta
 *  no es un permiso. */
export async function extractoOportunidad(id: string) {
  const yo = await quienSoy();
  if (!yo || !puedeEntrar(yo, "comercial")) return null;
  return extractoDeOportunidad(id);
}
