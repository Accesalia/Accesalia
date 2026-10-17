// lib/cajaMes.ts
//
// LA CAJA DEL MES (Monica, 17-oct-2026, el nombre es suyo): el resumen
// financiero de un mes. Que impuestos tocan (de Accesalia y de Daniel; a Ana,
// los de Ecobalance), que gastos estan previstos (los habituales y los que
// tocan ese mes, como un seguro semestral) y que ingresos se esperan, todo en
// un saco. Una cifra por Accesalia, otra por Daniel y la de las dos.
//   - Impuestos: el calendario fiscal (lib/fiscal.ts), lo real o lo previsto.
//   - Gastos: gastos_habituales (semilla: su Excel; se contrastara con los
//     extractos del banco).
//   - Ingresos: los hitos con fecha de cobro en el mes (lib/cobros.ts). Lo que
//     vendra de Asignar y de los hitos sin fecha, cuando esten esas areas.
// Dos libros, como siempre: Accesalia y Daniel (Alexandra y direccion) y
// Ecobalance (Ana y direccion).

import "server-only";
import type { Yo } from "./sesion";
import { calendarioFiscal, EMPRESAS, type Empresa, type LibroFiscal } from "./fiscal";
import { datosCaja } from "./cobros";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** Quien ve cada libro de la caja: Accesalia y Daniel, facturacion; Ecobalance, la suya; direccion, los dos. */
export function librosCaja(yo: Yo): LibroFiscal[] {
  const tiene = (c: string) => yo.funciones.some((f) => f.clave === c);
  return (["accesalia", "ecobalance"] as LibroFiscal[]).filter((l) => yo.veTodo || tiene(l === "ecobalance" ? "facturacion_ecobalance" : "facturacion"));
}

export type LineaCaja = { fecha: string | null; concepto: string; empresa: Empresa; importe: number | null; estimado: boolean; nota: string | null };
export type CajaMes = {
  libro: LibroFiscal;
  mes: string; // AAAA-MM
  empresas: Empresa[];
  impuestos: LineaCaja[];
  gastos: LineaCaja[];
  ingresos: { fecha: string; concepto: string; importe: number }[];
};

type Gasto = { empresa: Empresa; concepto: string; importe: number | null; cada: string; dia: number | null; meses: number[] | null; desde: string | null; hasta: string | null; origen: string; notas: string | null };

/** ¿Toca este gasto en el mes? Mensual, siempre; el resto, si el mes esta en sus meses. Y dentro de su desde/hasta. */
function tocaEn(g: Gasto, mes: string) {
  const ini = `${mes}-01`;
  const fin = `${mes}-31`;
  if (g.desde && g.desde > fin) return false;
  if (g.hasta && g.hasta < ini) return false;
  if (g.cada === "mensual") return true;
  return !!g.meses?.includes(Number(mes.slice(5, 7)));
}

export async function cajaDelMes(libro: LibroFiscal, mes: string): Promise<CajaMes> {
  const empresas = EMPRESAS[libro];
  const [pagos, gastos, caja] = await Promise.all([
    calendarioFiscal(libro),
    leer<Gasto[]>(`gastos_habituales?select=empresa,concepto,importe,cada,dia,meses,desde,hasta,origen,notas&activo=eq.true&empresa=in.(${empresas.join(",")})&order=empresa,concepto`),
    // Los ingresos con fecha: hoy solo los del libro de Accesalia y Daniel.
    libro === "accesalia" ? datosCaja() : Promise.resolve(null),
  ]);
  const impuestos: LineaCaja[] = pagos
    // Lo que sale de la cuenta ese mes: lo que se paga (no lo que solo se presenta), lo
    // aplazado plazo a plazo. La Seguridad Social y la cuota de autonomo van con los gastos.
    .filter((p) => p.fecha.startsWith(mes) && !p.sinCargo && p.estado !== "fraccionado" && !["SS", "RETA"].includes(p.modelo))
    .map((p) => ({
      fecha: p.fecha,
      concepto: `${p.nombre} · ${p.periodo}${p.plazo ? ` · ${p.plazo}` : ""}`,
      empresa: p.empresa,
      importe: p.real ?? p.previsto,
      estimado: p.real == null && !p.plazo,
      nota: null,
    }));
  const lineasGasto: LineaCaja[] = gastos
    .filter((g) => tocaEn(g, mes))
    .map((g) => ({
      fecha: g.dia ? `${mes}-${String(g.dia).padStart(2, "0")}` : null,
      concepto: g.concepto,
      empresa: g.empresa,
      importe: g.importe != null ? Number(g.importe) : null,
      estimado: true,
      nota: g.notas,
    }));
  const ingresos = (caja?.fijos ?? []).filter((f) => f.fecha.startsWith(mes)).map((f) => ({ fecha: f.fecha, concepto: f.nombre, importe: f.importe }));
  return { libro, mes, empresas, impuestos, gastos: lineasGasto, ingresos };
}
