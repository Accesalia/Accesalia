// lib/fiscal.ts
//
// EL CALENDARIO FISCAL (Monica, 12-oct-2026): "vamos muy perdidos con los
// impuestos a pagar, no ya importes sino incluso fechas". Primera pieza del
// area PAGAR. Lee obligaciones_fiscales -> vencimientos_fiscales ->
// vencimiento_plazos (lo fraccionado: cada plazo cuenta en su mes).
//
// Dos libros, como la facturacion: Alexandra ve Accesalia y Daniel (cada una
// por separado, con el total junto); Ana, Ecobalance; direccion, todo.

import "server-only";
import type { Yo } from "./sesion";
import { EMPRESAS, type Empresa, type LibroFiscal, type Obligacion, type Pago } from "./fiscalTextos";
export * from "./fiscalTextos";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export function puedeVerFiscal(yo: Yo, libro: LibroFiscal): boolean {
  const clave = libro === "ecobalance" ? "facturacion_ecobalance" : "facturacion";
  return yo.veTodo || yo.funciones.some((f) => f.clave === clave);
}
export const librosFiscales = (yo: Yo) => (["accesalia", "ecobalance"] as LibroFiscal[]).filter((l) => puedeVerFiscal(yo, l));

type FilaVencimiento = {
  id: string; ejercicio: number; periodo: string; fecha_limite: string; fecha_domiciliacion: string | null;
  estado: string; importe_estimado: number | null; importe: number | null; notas: string | null;
  obligacion_id: string;
  obligacion: { empresa: Empresa; modelo: string; nombre: string; organismo: string; domiciliado: boolean };
  plazos: { numero: number; fecha: string; importe: number; estado: string }[];
};

const MES = new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric", timeZone: "UTC" });
function textoPeriodo(ejercicio: number, periodo: string) {
  if (periodo === "ANUAL") return `Año ${ejercicio}`;
  if (/^\d{2}$/.test(periodo)) return MES.format(new Date(Date.UTC(ejercicio, Number(periodo) - 1, 1)));
  return `${periodo}-${ejercicio}`;
}
const ESTADO_TEXTO: Record<string, string> = {
  previsto: "Pendiente", borrador: "Borrador recibido", presentado: "Presentado", pagado: "Pagado", fraccionado: "Fraccionado", no_aplica: "No aplica",
};

/** Todo el calendario de un libro, en pagos ordenados por fecha. */
export async function calendarioFiscal(libro: LibroFiscal): Promise<Pago[]> {
  const empresas = EMPRESAS[libro].join(",");
  const filas = await leer<FilaVencimiento[]>(
    "vencimientos_fiscales?select=id,obligacion_id,ejercicio,periodo,fecha_limite,fecha_domiciliacion,estado,importe_estimado,importe,notas," +
      "obligacion:obligacion_id!inner(empresa,modelo,nombre,organismo,domiciliado),plazos:vencimiento_plazos(numero,fecha,importe,estado)" +
      `&obligacion.empresa=in.(${empresas})&order=fecha_limite`,
  );
  const out: Pago[] = [];
  for (const v of filas) {
    const o = v.obligacion;
    const periodo = textoPeriodo(v.ejercicio, v.periodo);
    const hecho = ["presentado", "pagado", "no_aplica"].includes(v.estado);
    out.push({
      clave: v.id, empresa: o.empresa, modelo: o.modelo, nombre: o.nombre, periodo,
      fecha: v.fecha_limite, vigilar: v.fecha_domiciliacion ?? v.fecha_limite,
      importe: v.importe ?? v.importe_estimado, estimado: v.importe == null && v.importe_estimado != null,
      previsto: v.importe_estimado != null ? Number(v.importe_estimado) : null, real: v.importe != null ? Number(v.importe) : null, obligacion: v.obligacion_id,
      sinCargo: !o.domiciliado,
      estado: v.estado === "fraccionado" ? "fraccionado" : hecho ? "hecho" : "pendiente",
      estadoTexto: ESTADO_TEXTO[v.estado] ?? v.estado, notas: v.notas,
    });
    const n = v.plazos.length;
    for (const p of [...v.plazos].sort((a, b) => a.numero - b.numero)) {
      out.push({
        clave: `${v.id}-${p.numero}`, empresa: o.empresa, modelo: o.modelo, nombre: o.nombre, periodo,
        plazo: `plazo ${p.numero} de ${n}`, fecha: p.fecha, vigilar: p.fecha,
        importe: Number(p.importe), estimado: false, sinCargo: false, previsto: Number(p.importe), real: p.estado === "pagado" ? Number(p.importe) : null, obligacion: v.obligacion_id,
        estado: p.estado === "pagado" ? "hecho" : "pendiente", estadoTexto: p.estado === "pagado" ? "Pagado" : "Pendiente", notas: null,
      });
    }
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.empresa.localeCompare(b.empresa));
}

/** Las obligaciones de un libro, con su explicacion. La explicacion se lee
 *  aparte: si la columna aun no existe en la base, la pantalla sigue sin ella. */
export async function obligacionesFiscales(libro: LibroFiscal): Promise<Obligacion[]> {
  const empresas = EMPRESAS[libro].join(",");
  const base = await leer<Omit<Obligacion, "explicacion">[]>(`obligaciones_fiscales?select=id,empresa,modelo,nombre,domiciliado&empresa=in.(${empresas})`);
  const textos = await leer<{ id: string; explicacion: string | null }[]>(`obligaciones_fiscales?select=id,explicacion&empresa=in.(${empresas})`).catch(() => []);
  const de = new Map(textos.map((t) => [t.id, t.explicacion]));
  return base.map((o) => ({ ...o, explicacion: de.get(o.id) ?? null }));
}
