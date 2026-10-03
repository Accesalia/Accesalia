"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { enlaceAlModelo, empezar, guardar, guardarCaptura, juntar, marcar, type DatosMesa } from "../../lib/mesaViabilidades";
import { haceViabilidades } from "./revision-polycam/acciones";

// Lo que la Mesa de viabilidades le pide al servidor. Cada accion comprueba
// quien pregunta: una accion de servidor es una puerta a produccion.

const leer = async <T,>(path: string) => {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: process.env.SUPABASE_SECRET_KEY ?? "", Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY ?? ""}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}`);
  return (await r.json()) as T;
};

/** Empezar la viabilidad de un escaneo vinculado, para la opp elegida. */
export async function accionEmpezar(fd: FormData) {
  const yo = await haceViabilidades();
  const escaneo = String(fd.get("escaneo") ?? "");
  const opp = String(fd.get("opp") ?? "");
  if (!escaneo || !opp) return;
  const id = await empezar(escaneo, opp, yo.id);
  redirect(`/viabilidades/${id}`);
}

/** El .glb para el visor. Se pide al elegir la pestaña del escaneo: la primera
 *  vez hay que sacarlo del zip, y no se paga eso por cada escaneo al abrir. */
export async function accionModelo(escaneoId: string): Promise<string | null> {
  await haceViabilidades();
  const [e] = await leer<{ id: string; polycam: string | null }[]>(
    `escaneados_polycam?select=id,polycam&id=eq.${encodeURIComponent(escaneoId)}&limit=1`,
  );
  return e ? enlaceAlModelo(e) : null;
}

export async function accionGuardar(id: string, d: DatosMesa): Promise<string> {
  await haceViabilidades();
  await guardar(id, d);
  return new Date().toISOString();
}

/** La captura llega como JPEG en base64 (ya con fondo: la del visor es
 *  transparente y en JPEG saldria negra). */
export async function accionCaptura(id: string, base64: string): Promise<string | null> {
  await haceViabilidades();
  const datos = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  if (datos.length < 100 || datos.length > 3_000_000) throw new Error("La captura no ha salido bien");
  return guardarCaptura(id, datos);
}

export async function accionJuntar(id: string, escaneoId: string) {
  await haceViabilidades();
  await juntar(id, escaneoId);
  revalidatePath(`/viabilidades/${id}`);
}

/** "Me he atascado": queda apuntado cuando, y la viabilidad lo enseña en la
 *  lista para que Daniel, que tambien la ve, sepa que le toca. */
export async function accionAvisarDaniel(id: string, d: DatosMesa) {
  await haceViabilidades();
  await guardar(id, d);
  await marcar(id, "daniel_avisado_en");
  revalidatePath("/viabilidades");
  revalidatePath(`/viabilidades/${id}`);
}

/** Se guarda lo ultimo y pasa al comercial. Sale de la lista de Alex. */
export async function accionEnviar(id: string, d: DatosMesa) {
  await haceViabilidades();
  await guardar(id, d);
  await marcar(id, "enviada_en");
  revalidatePath("/viabilidades");
  redirect("/viabilidades?enviada=1");
}
