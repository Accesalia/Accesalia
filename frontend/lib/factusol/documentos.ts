// lib/factusol/documentos.ts
//
// LOS PEDIDOS Y LAS FACTURAS DE FACTUSOL, LEIDOS DE SU FICHERO (Monica, 25-oct-2026). Como los clientes
// (./clientes.ts): un solo nucleo, sin nada de Next, para la pasada de cada noche, «Revisar ahora» y la carga desde el
// PC. Solo las cabeceras: serie, numero, fecha, referencia, cliente, importes, forma de pago y estado. Se lee sobre una
// copia en memoria; nunca se escribe en Factusol. Las columnas, las mismas que ya usaban los scripts de volcado
// (scripts/facturacion/sacar_pedidos_factusol.ps1 y sacar_facturas_factusol.ps1).

import MDBReader from "mdb-reader";
// Solo el tipo (asi lo puede cargar tambien el script del PC, que importa el .ts tal cual).
import type { Empresa } from "./clientes";

const nifLimpio = (v: string | null | undefined) => (v ?? "").replace(/[\s.\-]/g, "").toUpperCase() || null;

export type DocFactusol = {
  serie: number; numero: number; fecha: string | null; referencia: string | null; cliente: number | null; nombre: string | null; nif: string | null;
  base: number; iva: number; retencion: number; total: number; forma_pago: string | null; estado: number | null;
};
export type FacturaFactusol = DocFactusol & { tipo: "factura" | "abono" };

const txt = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  return s ? s : null;
};
// La serie (TIP) y los importes llegan como texto («1», «1815.0000»): se pasan a numero.
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const entero = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
};
const fecha = (v: unknown) => (v instanceof Date && v.getUTCFullYear() > 1900 ? v.toISOString().slice(0, 10) : null);

/** Las cabeceras de una tabla de documentos de Factusol: P = el sufijo de sus columnas (PCL, FAC, FAB). */
function cabeceras(db: MDBReader, tabla: string, P: string): DocFactusol[] {
  if (!db.getTableNames().includes(tabla)) return [];
  const c = (x: string) => `${x}${P}`;
  const filas = db.getTable(tabla).getData({
    columns: [c("TIP"), c("COD"), c("REF"), c("FEC"), c("EST"), c("CLI"), c("CNO"), c("CNI"), c("FOP"),
      c("BAS1"), c("BAS2"), c("BAS3"), c("IIVA1"), c("IIVA2"), c("IIVA3"), c("IRET1"), c("TOT")],
  });
  return filas
    .filter((f) => entero(f[c("TIP")]) != null && entero(f[c("COD")]) != null)
    .map((f) => ({
      serie: entero(f[c("TIP")])!,
      numero: entero(f[c("COD")])!,
      fecha: fecha(f[c("FEC")]),
      referencia: txt(f[c("REF")]),
      cliente: entero(f[c("CLI")]),
      nombre: txt(f[c("CNO")]),
      nif: nifLimpio(txt(f[c("CNI")])),
      base: num(f[c("BAS1")]) + num(f[c("BAS2")]) + num(f[c("BAS3")]),
      iva: num(f[c("IIVA1")]) + num(f[c("IIVA2")]) + num(f[c("IIVA3")]),
      retencion: num(f[c("IRET1")]),
      total: num(f[c("TOT")]),
      forma_pago: txt(f[c("FOP")]),
      estado: entero(f[c("EST")]),
    }));
}

/** Los pedidos de cliente (F_PCL) de un fichero. */
export function leerPedidos(fichero: Buffer): DocFactusol[] {
  return cabeceras(new MDBReader(fichero), "F_PCL", "PCL");
}

/** Las facturas (F_FAC) y los abonos (F_FAB, las rectificativas) de un fichero. */
export function leerFacturas(fichero: Buffer): FacturaFactusol[] {
  const db = new MDBReader(fichero);
  return [
    ...cabeceras(db, "F_FAC", "FAC").map((d) => ({ ...d, tipo: "factura" as const })),
    ...cabeceras(db, "F_FAB", "FAB").map((d) => ({ ...d, tipo: "abono" as const })),
  ];
}

type Base = { url: string; llave: string };
async function pedir<T>(b: Base, ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${b.url}/rest/v1/${ruta}`, {
    ...init,
    headers: { apikey: b.llave, Authorization: `Bearer ${b.llave}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

export type ResumenDocs = { empresa: Empresa; anio: number; pedidos: number; facturas: number; abonos: number; quitados: number };

/** Guarda lo leido de una empresa y año (es una copia: pone al dia, añade y quita lo que ya no esta en Factusol). */
export async function guardarDocumentos(b: Base, empresa: Empresa, anio: number, pedidos: DocFactusol[], facturas: FacturaFactusol[]): Promise<ResumenDocs> {
  const ahora = new Date().toISOString();
  let quitados = 0;
  for (const [tabla, filas, clave] of [
    ["factusol_pedidos", pedidos.map((p) => ({ empresa, anio, ...p, leido_en: ahora })), "empresa,anio,serie,numero"],
    ["factusol_facturas", facturas.map((f) => ({ empresa, anio, ...f, leido_en: ahora })), "empresa,anio,tipo,serie,numero"],
  ] as const) {
    for (let i = 0; i < filas.length; i += 500)
      await pedir(b, `${tabla}?on_conflict=${clave}`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(filas.slice(i, i + 500)),
      });
    // Lo que no se ha vuelto a leer es que ya no esta en Factusol.
    const viejos = await pedir<{ id: string }[]>(b, `${tabla}?select=id&empresa=eq.${empresa}&anio=eq.${anio}&leido_en=lt.${encodeURIComponent(ahora)}&limit=20000`);
    for (let i = 0; i < viejos.length; i += 200)
      await pedir(b, `${tabla}?id=in.(${viejos.slice(i, i + 200).map((x) => x.id).join(",")})`, { method: "DELETE" });
    quitados += viejos.length;
  }
  return { empresa, anio, pedidos: pedidos.length, facturas: facturas.filter((f) => f.tipo === "factura").length, abonos: facturas.filter((f) => f.tipo === "abono").length, quitados };
}
