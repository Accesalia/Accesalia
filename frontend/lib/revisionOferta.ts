// lib/revisionOferta.ts
//
// LA REVISION DE OFERTAS (Monica, 14-oct-2026): antes de mandar la oferta a la comunidad, alguien con la funcion
// `revision_ofertas` (hoy Daniel y Monica, "no por ser direccion") le da el ok o pide cambios. Quien revisa solo da el ok o
// pide cambios: "la hoja la toca solo el comercial, SOLO SUS MANOS".
//
// Desde el 25-oct-2026 el ok es POR HOJA (sistema nuevo): pendiente_ok_daniel -> ok_daniel / cambios_daniel en
// he_estados_hoja, y la bandeja y el ok viven en lib/hojaEmitir.ts. Aqui queda quien revisa y cuantas esperan. El paquete
// de antes (revisiones_oferta) se fue con las hojas viejas.

import "server-only";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
export const FUNCION_REVISION = "revision_ofertas";

/** ¿Puede revisar ofertas? Por su FUNCION, no por ser direccion. */
export function puedeRevisar(yo: Yo): boolean {
  return yo.funciones.some((f) => f.clave === FUNCION_REVISION);
}

/** Cuantas hojas esperan el ok de Daniel. */
export async function contarPendientes(): Promise<number> {
  const r = await fetch(`${URL_BASE}/rest/v1/he_versiones_hoja?select=id&estado=eq.pendiente_ok_daniel`, {
    headers: { ...CAB, Prefer: "count=exact", Range: "0-0" },
    cache: "no-store",
  });
  const total = r.headers.get("content-range")?.split("/")[1];
  return total ? Number(total) : 0;
}
