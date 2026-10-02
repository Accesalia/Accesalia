"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { buscarAMano, vincular, type Busqueda } from "../../../lib/revisionPolycam";
import { quienSoy } from "../../../lib/sesion";

const DONDE = "/viabilidades/revision-polycam";

/** QUIEN ENTRA: quien tiene la funcion `viabilidades`, que hoy son Alex Figueroa y
 *  Daniel. Monica: "van a tener acceso alexander figueroa y daniel, ambos porque
 *  tienen la funcion viabilidades". Por funcion y no por nombre, asi que si manaña
 *  entra otro con esa funcion le aparece sin tocar codigo.
 *
 *  Y quien lo ve todo tambien, que es como entran direccion y ella misma. */
export async function haceViabilidades() {
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=${DONDE}`);
  if (!yo.veTodo && !yo.funciones.some((f) => f.clave === "viabilidades")) redirect("/menu");
  return yo;
}

/** Buscar el acceso a mano, cuando el cotejo no lo propuso. El permiso se
 *  comprueba igual que en todo lo demas: una accion de servidor es una puerta a
 *  produccion, no un detalle de la pantalla. */
export async function accionBuscar(texto: string): Promise<Busqueda> {
  await haceViabilidades();
  return buscarAMano(texto);
}

export async function accionVincular(fd: FormData) {
  const yo = await haceViabilidades();

  const polycamId = String(fd.get("polycam") ?? "").trim();
  const accesos = fd.getAll("acceso").map(String).filter(Boolean);
  if (!polycamId || !accesos.length) return;

  await vincular(polycamId, accesos, yo.id);
  revalidatePath(DONDE);
}
