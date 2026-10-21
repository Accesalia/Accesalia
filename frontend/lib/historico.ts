// lib/historico.ts
//
// NEGOCIO › HISTÓRICO FACTURADO (Monica, 21-oct-2026). Por empresa (Accesalia, Daniel) y las dos juntas, mes a mes y
// año a año:
//   FACTURADO  base sin IVA de las facturas emitidas, con los abonos restados (desde 2019, Factusol + la app).
//   GASTOS     lo que salio del banco y es gasto de la actividad (movimientos_bancarios, desde que hay extractos):
//              sin los impuestos (van en su fila) ni lo personal de Daniel (casa, gastos suyos: va en su fila). A
//              Accesalia se le suman, como gasto, las facturas que le hace Daniel.
//   RESULTADO  facturado − gastos, en los meses con extracto.
// LAS DOS JUNTAS: sin duplicar lo de casa: las facturas de Daniel a Accesalia no son ni ingreso ni gasto del grupo, y
// los traspasos entre cuentas (internos) nunca cuentan.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
async function leer<T>(path: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${desde}-${desde + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const trozo = (await r.json()) as T[];
    todo.push(...trozo);
    if (trozo.length < 1000) return todo;
  }
}

export type Clave = "accesalia" | "daniel" | "las_dos";
/** Por año: 12 meses (null = sin dato ese mes). */
export type PorAno = Record<number, (number | null)[]>;
export type Historico = {
  anos: number[];
  /** Los meses con extracto (enteros) de cada una: desde / hasta, AAAA-MM. */
  conGastos: Record<Clave, { desde: string; hasta: string } | null>;
  e: Record<Clave, { facturado: PorAno; gastos: PorAno; impuestos: PorAno; personal: PorAno; internas: PorAno; resultado: PorAno }>;
};

const ACCESALIA_NIF = "B86374055";
const CUENTA_EMPRESA: Record<string, "accesalia" | "daniel"> = { caixa_accesalia: "accesalia", bbva_accesalia: "accesalia", caixa_daniel: "daniel" };
const vacio = (): (number | null)[] => Array(12).fill(null);
const sumar = (p: PorAno, y: number, m: number, v: number) => {
  p[y] ??= vacio();
  p[y][m] = (p[y][m] ?? 0) + v;
};

export async function historico(): Promise<Historico> {
  const [facturas, movs] = await Promise.all([
    leer<{ empresa_emisora: string; fecha: string; base: string | null; pagador_nif: string | null; pagador_nombre: string | null }>(
      "facturas?select=empresa_emisora,fecha,base,pagador_nif,pagador_nombre&estado=neq.anulada&empresa_emisora=in.(accesalia,daniel)&fecha=gte.2019-01-01",
    ),
    leer<{ cuenta: string; fecha: string; importe: string; clase: string; tipo: string | null; mes_imputado: string | null }>(
      "movimientos_bancarios?select=cuenta,fecha,importe,clase,tipo,mes_imputado&clase=in.(gasto,devolucion)",
    ),
  ]);
  const e = Object.fromEntries((["accesalia", "daniel", "las_dos"] as Clave[]).map((k) => [k, { facturado: {}, gastos: {}, impuestos: {}, personal: {}, internas: {}, resultado: {} }])) as Historico["e"];
  const anos = new Set<number>();

  for (const f of facturas) {
    const y = Number(f.fecha.slice(0, 4)), m = Number(f.fecha.slice(5, 7)) - 1, v = Number(f.base ?? 0);
    const emp = f.empresa_emisora as "accesalia" | "daniel";
    anos.add(y);
    sumar(e[emp].facturado, y, m, v);
    const interna = emp === "daniel" && ((f.pagador_nif ?? "").toUpperCase().startsWith(ACCESALIA_NIF) || /ACCESALIA|SOLUCIONES ACCESIBILIDAD/i.test(f.pagador_nombre ?? ""));
    if (interna) {
      sumar(e.daniel.internas, y, m, v);
      sumar(e.accesalia.gastos, y, m, v);   // para Accesalia, lo que le factura Daniel es gasto
    }
  }
  // las dos juntas: lo de Accesalia + lo de Daniel que no es a Accesalia
  for (const y of anos) {
    e.las_dos.facturado[y] = Array.from({ length: 12 }, (_, m) => {
      const a = e.accesalia.facturado[y]?.[m] ?? null, d = e.daniel.facturado[y]?.[m] ?? null, i = e.daniel.internas[y]?.[m] ?? 0;
      return a == null && d == null ? null : (a ?? 0) + (d ?? 0) - i;
    });
  }

  // Meses con extracto, POR EMPRESA y con SU cuenta principal (la Caixa): Accesalia tiene desde 2018 y Daniel desde
  // 2025. Solo meses enteros: el primero si el extracto empieza en sus primeros dias, el ultimo si llega a fin de mes
  // (el BBVA llegaba al 5-oct y la Caixa al 30-sep: octubre a medias inflaba el resultado).
  const PRINCIPAL = { accesalia: "caixa_accesalia", daniel: "caixa_daniel" } as const;
  const primeraDe = new Map<string, string>(), ultimaDe = new Map<string, string>();
  for (const mv of movs) {
    if (!primeraDe.has(mv.cuenta) || mv.fecha < primeraDe.get(mv.cuenta)!) primeraDe.set(mv.cuenta, mv.fecha);
    if ((ultimaDe.get(mv.cuenta) ?? "") < mv.fecha) ultimaDe.set(mv.cuenta, mv.fecha);
  }
  const mesMasN = (mes: string, n: number) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);
  const tramo = (cuenta: string) => {
    const a = primeraDe.get(cuenta), z = ultimaDe.get(cuenta);
    if (!a || !z) return null;
    const desde = Number(a.slice(8, 10)) <= 5 ? a.slice(0, 7) : mesMasN(a.slice(0, 7), 1);
    const hasta = Number(z.slice(8, 10)) >= 28 ? z.slice(0, 7) : mesMasN(z.slice(0, 7), -1);
    return desde <= hasta ? { desde, hasta } : null;
  };
  const cubre = { accesalia: tramo(PRINCIPAL.accesalia), daniel: tramo(PRINCIPAL.daniel) };
  const enTramo = (t: { desde: string; hasta: string } | null, y: number, m: number) => {
    const k = `${y}-${String(m + 1).padStart(2, "0")}`;
    return !!t && k >= t.desde && k <= t.hasta;
  };
  for (const mv of movs) {
    const cuando = mv.mes_imputado ?? mv.fecha.slice(0, 7);   // las nominas, en su mes
    const y = Number(cuando.slice(0, 4)), m = Number(cuando.slice(5, 7)) - 1, v = -Number(mv.importe);
    const emp = CUENTA_EMPRESA[mv.cuenta];
    const tipo = mv.tipo ?? "";
    anos.add(y);
    if (tipo.startsWith("IMPUESTOS")) sumar(e[emp].impuestos, y, m, v);
    else if (/^(CASA|PERSONAL DE DANIEL|PRÉSTAMO DE MÓNICA)/.test(tipo)) sumar(e[emp].personal, y, m, v);
    else sumar(e[emp].gastos, y, m, v);
  }
  // Los meses con extracto: ahi los gastos son 0 si no salio nada, no «sin dato»; fuera, sin dato
  for (const k of ["accesalia", "daniel"] as const)
    for (const p of [e[k].gastos, e[k].impuestos, e[k].personal])
      for (const y of anos) {
        p[y] ??= vacio();
        p[y] = p[y].map((v, m) => (enTramo(cubre[k], y, m) ? v ?? 0 : null));
      }
  for (const y of anos) {
    for (const nombre of ["gastos", "impuestos", "personal"] as const) {
      e.las_dos[nombre][y] = Array.from({ length: 12 }, (_, m) => {
        const a = e.accesalia[nombre][y]?.[m], d = e.daniel[nombre][y]?.[m];
        if (a == null || d == null) return null;   // juntas, solo los meses que tienen las DOS
        // en las dos juntas, lo que Daniel factura a Accesalia no es gasto del grupo
        return (a ?? 0) + (d ?? 0) - (nombre === "gastos" ? e.daniel.internas[y]?.[m] ?? 0 : 0);
      });
    }
    for (const k of ["accesalia", "daniel", "las_dos"] as Clave[])
      e[k].resultado[y] = Array.from({ length: 12 }, (_, m) => {
        const g = e[k].gastos[y]?.[m];
        if (g == null) return null;
        if (!e[k].facturado[y]?.some((v) => v != null)) return null;   // un año sin facturas en la app (Accesalia 2018-19): sin resultado
        return (e[k].facturado[y]?.[m] ?? 0) - g;
      });
  }
  const juntas = cubre.accesalia && cubre.daniel
    ? { desde: [cubre.accesalia.desde, cubre.daniel.desde].sort()[1], hasta: [cubre.accesalia.hasta, cubre.daniel.hasta].sort()[0] } : null;
  return { anos: [...anos].sort(), conGastos: { accesalia: cubre.accesalia, daniel: cubre.daniel, las_dos: juntas }, e };
}
