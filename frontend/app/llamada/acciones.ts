"use server";

import { redirect } from "next/navigation";
import { quienSoy } from "../../lib/sesion";
import {
  guardarLlamada,
  proponerDirecciones,
  proponerPersonas,
  type NuevaLlamada,
  type PropuestaDireccion,
  type PropuestaPersona,
} from "../../lib/llamadas";

const texto = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
};

/** Lo que la app propone al lado mientras se escribe. */
export async function proponer(
  campo: "persona" | "direccion",
  q: string,
): Promise<PropuestaPersona[] | PropuestaDireccion[]> {
  if (!(await quienSoy())) return [];
  if (q.trim().length < 2) return [];
  return campo === "persona" ? proponerPersonas(q) : proponerDirecciones(q);
}

export async function guardar(fd: FormData) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/llamada");

  const queDicen = texto(fd, "que_dicen");
  if (!queDicen) redirect("/llamada?falta=1");

  const quienTipo = texto(fd, "quien_tipo") as NonNullable<NuevaLlamada["quien"]>["tipo"] | null;
  const dondeTipo = texto(fd, "donde_tipo") as NonNullable<NuevaLlamada["donde"]>["tipo"] | null;

  const hecha = await guardarLlamada({
    apuntadaPor: yo.id,
    queDicen,
    quienTexto: texto(fd, "quien_texto"),
    quien: quienTipo ? { tipo: quienTipo, id: texto(fd, "quien_id") } : null,
    dondeTexto: texto(fd, "donde_texto"),
    donde: dondeTipo ? { tipo: dondeTipo, id: texto(fd, "donde_id") } : null,
    area: texto(fd, "area"),
  });

  redirect(`/llamada?guardada=${encodeURIComponent(hecha.recibida_en)}`);
}
