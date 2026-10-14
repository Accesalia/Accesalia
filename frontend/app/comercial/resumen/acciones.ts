"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearEntrada } from "../../../lib/entradaDiario";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";

/** GRABAR desde el resumen (Monica, 14-oct-2026): "lo suyo es que con la pantalla
 *  delante les llame, y en cuanto cuelgue grabe el resultado". Es la entrada del
 *  diario de siempre, ya enganchada a su opp. */
export async function accionGrabarDesdeResumen(oppId: string, fd: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/resumen");
  if (!puedeEntrar(yo, "comercial", "trabajar")) return { ok: false, error: "No tienes permiso para grabar en esta opp." };
  const texto = String(fd.get("texto") ?? "").trim();
  if (!texto) return { ok: false, error: "Escribe qué ha pasado." };
  try {
    await crearEntrada({
      texto,
      canal: String(fd.get("canal") ?? "llamada"),
      fecha: null,
      oportunidadId: oppId,
      persona: null,
      dondeTexto: null,
      autorId: yo.id,
      autorNombre: yo.nombre,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/comercial/resumen");
  revalidatePath(`/comercial/oportunidades/${oppId}`);
  return { ok: true };
}
