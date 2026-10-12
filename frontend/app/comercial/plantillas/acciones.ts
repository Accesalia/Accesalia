"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { quienSoy } from "../../../lib/sesion";
import { crearPlantilla, guardarPlantilla, quitarPlantilla, puedeVerPlantillas } from "../../../lib/plantillasCorreo";

const leer = (fd: FormData) => ({
  nombre: String(fd.get("nombre") ?? "").trim(),
  asunto: String(fd.get("asunto") ?? "").trim(),
  texto: String(fd.get("texto") ?? "").trim(),
});

async function yo() {
  const y = await quienSoy();
  if (!y) redirect("/entrar?volver=/comercial/plantillas");
  if (!puedeVerPlantillas(y)) redirect("/menu");
  return y;
}

export async function accionCrear(fd: FormData) {
  const y = await yo();
  const d = leer(fd);
  if (!d.nombre || !d.asunto || !d.texto) redirect("/comercial/plantillas/nueva?falta=1");
  const id = await crearPlantilla(y, d, fd.get("clase") === "general");
  revalidatePath("/comercial/plantillas");
  redirect(`/comercial/plantillas/${id}`);
}

export async function accionGuardar(id: string, fd: FormData) {
  const y = await yo();
  const d = leer(fd);
  if (!d.nombre || !d.asunto || !d.texto) redirect(`/comercial/plantillas/${id}?editar=1&falta=1`);
  await guardarPlantilla(y, id, d);
  revalidatePath("/comercial/plantillas");
  redirect(`/comercial/plantillas/${id}`);
}

export async function accionQuitar(id: string) {
  const y = await yo();
  await quitarPlantilla(y, id);
  revalidatePath("/comercial/plantillas");
  redirect("/comercial/plantillas");
}
