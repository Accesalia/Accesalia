// lib/panoramica.ts
//
// VISTA PANORAMICA DEL DINERO (Monica, 16-oct-2026): de un vistazo, lo que va a
// entrar y lo que ya ha entrado. La unidad es la linea de facturacion (que y
// cuanto), agrupada por su opp; cada linea con su barra de cobrado. Accesalia y
// Daniel juntos. Una llamada por gesto a la funcion panoramica_cobros
// (migracion 20261016240000), que filtra, suma y pagina en la base.

import "server-only";
import type { Yo } from "./sesion";
import { puedeVerCobros } from "./cobros";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

export type LineaPanoramica = {
  id: string; hoja: string; fecha_firma: string | null; descripcion: string | null; importe: number | null;
  es_porcentaje: boolean; porcentaje: number | null; a_exito: boolean; facturado: number; cobrado: number; cobrada: boolean;
};
export type OppPanoramica = {
  opp: { id: string; nombre: string }; comercial: string | null;
  firmado: number; facturado: number; cobrado: number; queda: number; lineas: LineaPanoramica[];
};
export type Panoramica = {
  resumen: { firmado: number; facturado: number; cobrado: number; queda: number; lineas: number; cobradas: number; a_exito: number; opps: number };
  por_comercial: { id: string | null; nombre: string | null; firmado: number; cobrado: number; queda: number }[];
  total_opps: number;
  filas: OppPanoramica[];
};
export type FiltrosPanoramica = { desde?: string | null; hasta?: string | null; comercial?: string | null; pendientes?: boolean; pagina?: number };

export const POR_PAGINA_PANORAMICA = 40;
export const DESDE_POR_DEFECTO = "2025-01-01";
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Lo que llega del navegador, saneado. */
export function filtrosPanoramicaDe(p: URLSearchParams): FiltrosPanoramica {
  const desde = p.get("desde") ?? "";
  const hasta = p.get("hasta") ?? "";
  const comercial = p.get("comercial") ?? "";
  return {
    desde: FECHA.test(desde) ? desde : DESDE_POR_DEFECTO,
    hasta: FECHA.test(hasta) ? hasta : null,
    comercial: /^[0-9a-f-]{36}$/.test(comercial) ? comercial : null,
    pendientes: p.get("pendientes") === "1",
    pagina: Math.max(1, Math.min(1000, Number(p.get("pagina")) || 1)),
  };
}

export async function panoramica(f: FiltrosPanoramica, yo: Yo): Promise<Panoramica> {
  if (!puedeVerCobros(yo)) throw new Error("No tienes acceso a la facturación.");
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/panoramica_cobros`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_desde: f.desde ?? DESDE_POR_DEFECTO, p_hasta: f.hasta ?? null, p_comercial: f.comercial ?? null,
      p_pendientes: !!f.pendientes, p_pagina: f.pagina ?? 1, p_por_pagina: POR_PAGINA_PANORAMICA,
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`panoramica_cobros ${r.status}: ${await r.text()}`);
  return (await r.json()) as Panoramica;
}
