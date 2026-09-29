"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { colocarAMano, repasarBuzon } from "../../../lib/buzonPolycam";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";

async function permiso() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/buzon");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");
}

export async function accionRepasar() {
  await permiso();
  const r = await repasarBuzon();
  revalidatePath("/comercial/buzon");
  redirect(`/comercial/buzon?hecho=${r.colocados}&mirados=${r.mirados}`);
}

export async function accionColocar(uid: number, fd: FormData) {
  await permiso();
  const oportunidadId = String(fd.get("oportunidad") ?? "").trim();
  if (!oportunidadId) redirect("/comercial/buzon?falta=1");
  await colocarAMano(uid, oportunidadId);
  revalidatePath("/comercial/buzon");
  revalidatePath(`/comercial/oportunidades/${oportunidadId}`);
  redirect("/comercial/buzon?colocado=1");
}
