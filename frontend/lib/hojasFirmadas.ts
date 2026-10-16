// lib/hojasFirmadas.ts
//
// COBRAR › TODO LO CONTRATADO: LAS HOJAS FIRMADAS (Monica, 16-oct-2026). Todas
// las hojas firmadas sin entrar en la opp: codigo, que cubre, estado de cobro y
// quien factura; debajo de cada linea, sus facturas y sus cobros.
//
// Una llamada por gesto (acordado con e3 el 16-oct): la funcion de la base
// hojas_firmadas filtra, busca, cuenta y pagina, y devuelve solo las 50 hojas de
// la pagina ya cruzadas. Las reglas del estado y del reparto de las facturas que
// cubren varias hojas estan en ella (migracion 20261016232000).

import "server-only";
import type { Yo } from "./sesion";
import { puedeVerCobros } from "./cobros";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

export type EstadoHoja = "alerta" | "total" | "parcial" | "pendiente" | "anterior";
export type Cobro = { id: string; fecha: string; importe: number | null; tipo: string };
export type FacturaDeLinea = {
  id: string; serie: string; numero: number; anio: number; fecha: string; total: number; base_linea: number;
  empresa: string; tiene_pdf: boolean; estado_cobro: "cobrada" | "devuelta" | "parcial" | "sin_cobro"; cobrado: number;
  cobros: Cobro[];
};
export type LineaHoja = {
  id: string; descripcion: string | null; importe: number | null; es_porcentaje: boolean; porcentaje: number | null;
  emisor: string; facturas: FacturaDeLinea[];
};
export type HojaFirmada = {
  id: string; numero: string; fecha_firma: string | null; opp: { id: string; nombre: string };
  estado: EstadoHoja; quien: string[]; contratado: number; facturado: number; cobrado: number; falta_facturar: boolean;
  pdf: { version: string; indice: number } | null; lineas: LineaHoja[];
};
export type PaginaHojas = {
  total: number; por_estado: Partial<Record<EstadoHoja, number>>; anios: number[];
  /** De todas las hojas que cumplen los filtros (no solo de la pagina), en base sin IVA. */
  sumas: { contratado: number; facturado: number; cobrado: number };
  filas: HojaFirmada[];
};
export type Filtros = { texto?: string; anio?: number | null; estado?: EstadoHoja | null; emisor?: string | null; pagina?: number };

export const POR_PAGINA = 50;
const ESTADOS: EstadoHoja[] = ["alerta", "total", "parcial", "pendiente", "anterior"];

/** Lo que llega del navegador, saneado: nada se pasa a la base tal cual. */
export function filtrosDe(p: URLSearchParams): Filtros {
  const anio = Number(p.get("anio"));
  const estado = p.get("estado") as EstadoHoja | null;
  const emisor = p.get("emisor");
  return {
    texto: (p.get("texto") ?? "").slice(0, 80),
    anio: Number.isInteger(anio) && anio > 2000 ? anio : null,
    estado: estado && ESTADOS.includes(estado) ? estado : null,
    emisor: emisor === "accesalia" || emisor === "daniel" ? emisor : null,
    pagina: Math.max(1, Math.min(1000, Number(p.get("pagina")) || 1)),
  };
}

/** El libro lo pone el servidor segun quien es, nunca el navegador. De momento,
 *  el de Accesalia (Accesalia + Daniel); Ecobalance tendra su pantalla. */
export async function hojasFirmadas(f: Filtros, yo: Yo): Promise<PaginaHojas> {
  if (!puedeVerCobros(yo)) throw new Error("No tienes acceso a la facturación.");
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/hojas_firmadas`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_libro: "accesalia", p_texto: f.texto || null, p_anio: f.anio ?? null, p_estado: f.estado ?? null,
      p_emisor: f.emisor ?? null, p_pagina: f.pagina ?? 1, p_por_pagina: POR_PAGINA,
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`hojas_firmadas ${r.status}: ${await r.text()}`);
  return (await r.json()) as PaginaHojas;
}

/** El PDF de un justificante de cobro (almacen privado `facturas`), si su factura es del libro de Accesalia. */
export async function pdfDeCobro(id: string, yo: Yo): Promise<{ pdf: Uint8Array; nombre: string } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id) || !puedeVerCobros(yo)) return null;
  const q = await fetch(
    `${URL_BASE}/rest/v1/cobros?select=justificante,fichero_origen,factura:factura_id(empresa_emisora)&id=eq.${id}`,
    { headers: CAB, cache: "no-store" },
  );
  if (!q.ok) return null;
  const [c] = (await q.json()) as { justificante: string; fichero_origen: string | null; factura: { empresa_emisora: string } | null }[];
  if (!c?.justificante.startsWith("almacen:") || c.factura?.empresa_emisora === "ecobalance") return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/${c.justificante.slice("almacen:".length)}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) return null;
  return { pdf: new Uint8Array(await r.arrayBuffer()), nombre: c.fichero_origen ?? "justificante.pdf" };
}
