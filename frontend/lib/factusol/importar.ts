// lib/factusol/importar.ts
//
// LOS FICHEROS QUE IMPORTA FACTUSOL (Monica, 24 y 25-oct-2026). Factusol no se toca por dentro: se le dan los ficheros
// de su importacion (Utilidades › Importaciones, doc GIP.F.01.13 Rev.12, en scripts/facturacion/factusol_importar/)
// y el los mete. Para una proforma de la app = un PEDIDO de cliente con el MISMO numero:
//   - PCL.xls: la cabecera del pedido (serie, numero, referencia, fecha, cliente, importes, forma de pago).
//   - LPC.xls: sus lineas.
//   - CLI.xls: solo si el cliente no existe aun en Factusol (con el codigo nuevo que se le da).
// En .xls antiguo (BIFF8), con los nombres fijos que exige Factusol. Columnas y valores, los del pedido de prueba que
// se importo bien el 19-oct (scripts/facturacion/factusol_importar/pedido_de_prueba.py).

import * as XLSX from "xlsx";
import { zipSync, strToU8 } from "fflate";

export type ClientePedido = { codigo: number; nif: string; nombre: string; domicilio: string; poblacion: string; cp: string; provincia: string; nuevo: boolean };
export type PedidoFactusol = {
  serie: number; numero: number; referencia: string; fecha: string; // aaaa-mm-dd
  cliente: ClientePedido;
  lineas: { concepto: string; base: number }[];
  base: number; ivaPct: number; iva: number; irpfPct: number; irpf: number; total: number;
  formaPago: string; // el codigo de la forma de pago en esa empresa (factusol_formas_cobro)
  observaciones: string;
  formaPagoCliente: string; // la del alta del cliente nuevo
};

const COL = (letra: string) => XLSX.utils.decode_col(letra);

/** Una fila con sus valores en las columnas que dice la documentacion (A, B, ... AT, BK...). */
function fila(valores: Record<string, unknown>): unknown[] {
  const n = Math.max(...Object.keys(valores).map(COL)) + 1;
  const r: unknown[] = Array(n).fill(null);
  for (const [k, v] of Object.entries(valores)) r[COL(k)] = v;
  return r;
}
function ceros(desde: string, hasta: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = COL(desde); i <= COL(hasta); i++) out[XLSX.utils.encode_col(i)] = 0;
  return out;
}
const fechaXls = (iso: string) => new Date(`${iso}T00:00:00Z`);
function xls(filas: unknown[][]): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(filas, { cellDates: true, dateNF: "dd/mm/yyyy" });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  return new Uint8Array(XLSX.write(wb, { bookType: "biff8", type: "array" }) as ArrayBuffer);
}
const corta = (s: string, n: number) => (s ?? "").slice(0, n);

/** Los ficheros de un pedido: { "PCL.xls": …, "LPC.xls": …, "CLI.xls"?: … }. */
export function ficherosPedido(p: PedidoFactusol): Record<string, Uint8Array> {
  const c = p.cliente;
  const out: Record<string, Uint8Array> = {};
  if (c.nuevo)
    out["CLI.xls"] = xls([fila({
      A: c.codigo, C: corta(c.nif, 18), D: corta(c.nombre, 100), E: corta(c.nombre, 100), F: corta(c.domicilio, 100), G: corta(c.poblacion, 30),
      H: corta(c.cp, 10), I: corta(c.provincia, 40), J: "ESPAÑA", U: p.formaPagoCliente, AK: 0, AL: 1, AM: 0, AN: fechaXls(p.fecha),
      AT: "Alta desde la app (proforma)",
    })]);
  const pcl: Record<string, unknown> = {
    A: p.serie, B: p.numero, C: corta(p.referencia, 50), D: fechaXls(p.fecha), E: 1,
    G: c.codigo, H: corta(c.nombre, 50), I: corta(c.domicilio, 100), J: corta(c.poblacion, 30), K: corta(c.cp, 10), L: corta(c.provincia, 40), M: corta(c.nif, 18),
    N: 0, O: 0, Q: 0, R: "GEN", S: p.base,
    ...ceros("T", "AS"),
    AT: p.base, AU: 0, AV: 0, AW: p.ivaPct, AX: 10, AY: 4, AZ: p.iva, BA: 0, BB: 0, BC: 5.2, BD: 1.4, BE: 0.5, BF: 0, BG: 0, BH: 0,
    BI: p.irpfPct, BJ: p.irpf, BK: p.total, BL: p.formaPago, BN: 0, BP: corta(p.observaciones, 50),
  };
  out["PCL.xls"] = xls([fila(pcl)]);
  out["LPC.xls"] = xls(p.lineas.map((l, i) => fila({ A: p.serie, B: p.numero, C: i + 1, E: l.concepto, F: 1, G: 0, H: 0, I: 0, J: l.base, K: l.base, L: 1, M: 0, X: 0 })));
  return out;
}

/** El nombre de la carpeta: el asunto del correo, sin lo que no admite una carpeta, y recortado. */
export function nombreCarpeta(asunto: string): string {
  return asunto.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 120).replace(/[. ]+$/, "") || "Pedido";
}

/** El zip con la carpeta dentro (para cuando la app no tiene acceso al Dropbox). */
export function zipCarpeta(carpeta: string, ficheros: Record<string, Uint8Array>, leeme: string): Uint8Array {
  const dentro: Record<string, Uint8Array> = {};
  for (const [n, f] of Object.entries(ficheros)) dentro[`${carpeta}/${n}`] = f;
  // Las instrucciones, fuera de la carpeta: dentro solo lo que importa Factusol.
  dentro["LEEME.txt"] = strToU8(leeme);
  return zipSync(dentro, { level: 6 });
}
