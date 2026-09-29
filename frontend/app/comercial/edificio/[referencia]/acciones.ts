"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// ¿HAY ASCENSOR? (Monica, 29-sep-2026).
//
// Es la pregunta que decide si hay negocio, y NO LA DICE NINGUN DATO. Pero se ve
// en la ortofoto: el caseton de la azotea. "Son dos segundos del comercial
// marcando la casilla."
//
// Se guarda con QUIEN y CUANDO: no es un dato de un organismo, es lo que vio una
// persona mirando una foto. Si mañana alguien dice lo contrario, hay que poder
// saber quien lo miro.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export async function marcarAscensor(referencia: string, hay: boolean | null) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/edificio/" + referencia);
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  const cab = {
    apikey: SECRETO,
    Authorization: `Bearer ${SECRETO}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };

  // Va por upsert y no por update: si la ficha todavia no se habia guardado -por
  // ejemplo porque Catastro fallo-, la marca no se pierde.
  await fetch(`${URL_BASE}/rest/v1/ficha_catastro?on_conflict=referencia`, {
    method: "POST",
    headers: cab,
    body: JSON.stringify({
      referencia: referencia.replace(/\s/g, "").toUpperCase().slice(0, 14),
      tiene_ascensor: hay,
      ascensor_visto_por: hay === null ? null : yo.id,
      ascensor_visto_en: hay === null ? null : new Date().toISOString(),
    }),
  });

  revalidatePath(`/comercial/edificio/${referencia}`);
}
