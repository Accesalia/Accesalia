import "server-only";
import { redirect } from "next/navigation";
import { quienSoy, type Yo } from "../../../../lib/sesion";
import { puedeHacerHojas, puedeVerComunidad } from "../../../../lib/hojaEncargo";
import { comunidadDeViabilidad } from "../../../../lib/viabilidadComercial";

/** Quien remata viabilidades: los mismos que hacen hojas (comercial,
 *  secretaria comercial y direccion), y un comercial solo las de su cartera.
 *  Se comprueba al abrir y en CADA accion. */
export async function permisoViabilidad(id: string): Promise<Yo> {
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/comercial/viabilidad/${id}`);
  if (!puedeHacerHojas(yo)) redirect("/comercial");
  const comunidad = await comunidadDeViabilidad(id);
  const ve = comunidad ? await puedeVerComunidad(yo, comunidad) : yo.veTodo || yo.funciones.some((f) => f.clave === "secretaria");
  if (!ve) throw new Error("Esta viabilidad no es de tu cartera.");
  return yo;
}
