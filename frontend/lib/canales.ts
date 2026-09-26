// lib/canales.ts
//
// COMO HA LLEGADO HASTA ACCESALIA: UNA SOLA LISTA, Y ES ESTA (Monica, 26-sep-2026).
//
// Antes la misma pregunta estaba escrita en cinco sitios: el catalogo de la base,
// dos listas cerradas en la propia base (una por tabla, con valores distintos) y
// dos listas a mano en el codigo de las dos pantallas. Resultado: "web" en la
// ficha de una comunidad y "web" en la de una administracion no eran la misma
// palabra, y nunca se habrian podido sumar.
//
// Manda `canal_captacion`, que se creo para esto. Vive en la base porque la lista
// es VIVA: el dia que haga falta LinkedIn se anade sin tocar codigo.
//
// El orden es el del negocio real, no el alfabetico: cartera de admin ~60%,
// boca a boca ~30%, otra obra ~10%, web 3-4%, el resto excepciones. Lo que mas
// pasa, primero.
//
// Y no todos valen para las dos altas: nadie llega a nosotros a traves de su
// PROPIA cartera, asi que "cartera de admin nuestro" solo sale en la oportunidad.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export type Canal = {
  id: string;
  codigo: string;
  nombre: string;
  /** Para que sirve el dato, en palabras de ella:
   *  nos_lo_dijeron -> condiciones, restricciones, comisiones
   *  lo_vio         -> que hay que potenciar
   *  se_lo_contamos -> que acciones funcionan */
  familia: string | null;
};

export async function canalesDe(aplica: "administracion" | "oportunidad"): Promise<Canal[]> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/canal_captacion?select=id,codigo,nombre,familia` +
      `&activo=is.true&aplica=in.(${aplica},ambas)&order=orden.asc`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Supabase canal_captacion ${r.status}: ${await r.text()}`);
  return r.json() as Promise<Canal[]>;
}
