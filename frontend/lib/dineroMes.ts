// lib/dineroMes.ts
//
// PREVER › EL DINERO DEL MES (Monica, 21-oct-2026: «esto nos va a salvar el culo»). El resumen limpio de un mes, por
// empresa (Accesalia | Daniel):
//   1. impuestos que quedan (el calendario fiscal)          2. gastos: lo pagado y lo que queda (Gastos del mes)
//   3. saldos de las cuentas (el ultimo extracto)            4. ingresos, en tres capas, cada una con su etiqueta:
//        SEGURO   facturas emitidas pendientes de los ultimos 90 dias (las de antes no se cuentan: ≤2023 se dan por
//                 cobradas y lo demas, atrasado de verdad, no es caja de este mes); llegan ~8 dias despues (mediana)
//        PREVISTO hitos con fecha (prevista o de vencimiento) aun sin facturar
//        ESTIMADO la ESTACIONALIDAD, no la media plana: el % del año que suele pesar cada mes (2021-2025, mas peso a
//                 lo reciente) × el año en curso proyectado (lo facturado hasta el mes pasado / el % que suele llevar
//                 acumulado: asi entra sola la subida de precios). Menos lo que ya entro y lo seguro y previsto.
//   5. lo que se podria desbloquear: el optimo de Asignar (cuando tenga datos)   6. el saldo estimado al dia 1
// Y la vista de 8 semanas: semana a semana, lo que entra, lo que sale y el saldo, avisando cerca del limite de la linea.

import "server-only";
import type { Yo } from "./sesion";
import { calendarioFiscal } from "./fiscal";
import { gastosDelMes, mesMas, type EmpresaGasto } from "./gastosMes";

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

const EMPRESAS: EmpresaGasto[] = ["accesalia", "daniel_autonomo"];
const FACTURA_DE: Record<EmpresaGasto, string> = { accesalia: "accesalia", daniel_autonomo: "daniel" };
const CUENTAS_DE: Record<EmpresaGasto, string[]> = { accesalia: ["caixa_accesalia", "bbva_accesalia"], daniel_autonomo: ["caixa_daniel"] };
const DIAS_COBRO = 8;   // de la factura al cobro, mediana 2025-26
const PESOS: Record<number, number> = { 2021: 1, 2022: 2, 2023: 3, 2024: 4, 2025: 5 };

const finDeMes = (mes: string) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
const masDias = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const r0 = (n: number) => Math.round(n);

export type Linea = { fecha: string; concepto: string; importe: number };
export type Estacionalidad = { pct: number[]; pctMin: number[]; pctMax: number[]; anoProyectado: number; facturadoAno: number; acumulado: number };
export type IngresosEmpresa = {
  yaEntrado: number;
  seguro: Linea[];
  previsto: Linea[];
  estimadoMes: number;
  horquilla: [number, number];
  pctMes: number;
  restoEstimado: number;
  atrasadas: { n: number; importe: number };
  est: Estacionalidad;
};
export type Semana = { desde: string; hasta: string; previa?: boolean; e: Record<EmpresaGasto, { entra: number; sale: number; saldo: number }> };
export type DineroMes = {
  mes: string;
  hoy: string;
  hasta: string | null;
  saldos: { clave: string; nombre: string; saldo: number; fecha: string; limite: number | null }[];
  limiteAccesalia: number;
  e: Record<EmpresaGasto, {
    saldo: number;
    impuestos: Linea[];
    gastos: { previsto: number; pagado: number; queda: number };
    ingresos: IngresosEmpresa;
    /** Lo que no es gasto habitual ni impuesto pero sale (o entra) todos los meses: media de los ultimos 9 meses. */
    otros: { internos: number; sinPrever: number; devoluciones: number };
    saldoDia1: number;
  }>;
  semanas: Semana[];
};

// ------------------------------------------------------------------------------------------------ estacionalidad
async function estacionalidad(empresa: EmpresaGasto, hoy: string): Promise<Estacionalidad> {
  const fs = await leer<{ fecha: string; total: string | null }>(
    `facturas?select=fecha,total&empresa_emisora=eq.${FACTURA_DE[empresa]}&estado=neq.anulada&or=(tipo.is.null,tipo.eq.factura)&fecha=gte.2021-01-01`,
  );
  const porAno = new Map<number, number[]>();
  for (const f of fs) {
    const y = Number(f.fecha.slice(0, 4)), m = Number(f.fecha.slice(5, 7));
    const a = porAno.get(y) ?? Array(12).fill(0);
    a[m - 1] += Number(f.total ?? 0);
    porAno.set(y, a);
  }
  const pct = Array(12).fill(0), pctMin = Array(12).fill(1), pctMax = Array(12).fill(0);
  let pesos = 0;
  for (const [y, a] of porAno) {
    const w = PESOS[y];
    const tot = a.reduce((s, x) => s + x, 0);
    if (!w || !tot) continue;
    pesos += w;
    a.forEach((x, i) => { pct[i] += (w * x) / tot; pctMin[i] = Math.min(pctMin[i], x / tot); pctMax[i] = Math.max(pctMax[i], x / tot); });
  }
  for (let i = 0; i < 12; i++) pct[i] = pesos ? pct[i] / pesos : 1 / 12;
  const y = Number(hoy.slice(0, 4)), m = Number(hoy.slice(5, 7));
  const este = porAno.get(y) ?? Array(12).fill(0);
  const facturadoAno = este.slice(0, m - 1).reduce((s, x) => s + x, 0);
  const acumulado = pct.slice(0, m - 1).reduce((s, x) => s + x, 0);
  const anterior = (porAno.get(y - 1) ?? []).reduce((s, x) => s + x, 0);
  const anoProyectado = acumulado > 0.15 ? facturadoAno / acumulado : anterior;
  return { pct, pctMin, pctMax, anoProyectado, facturadoAno, acumulado };
}

// ------------------------------------------------------------------------------------------------ el mes
export async function dineroDelMes(mes: string, hoy: string, yo: Yo): Promise<DineroMes> {
  // Hasta donde se simula: el mes visto y las 8 semanas desde hoy
  const fin = [finDeMes(mes), masDias(hoy, 56)].sort()[1];
  const meses: string[] = [];
  for (let m = mesMas(hoy, -1); m <= fin.slice(0, 7); m = mesMas(m, 1)) meses.push(m);
  if (!meses.includes(mes)) meses.push(mes);

  const [gastosPorMes, pagos, cuentas, est, facturas, hitos, entradas] = await Promise.all([
    Promise.all(meses.map((m) => gastosDelMes(m, yo))),
    calendarioFiscal("accesalia"),
    leer<{ clave: string; limite_credito: string | null }>("cuentas_propias?select=clave,limite_credito&vigente=eq.true"),
    Promise.all(EMPRESAS.map((e) => estacionalidad(e, hoy))),
    leer<{ id: string; empresa_emisora: string; anio: number; numero: number; fecha: string; total: string | null; pagador_nombre: string | null; cobros: { importe: string }[] }>(
      `facturas?select=id,empresa_emisora,anio,numero,fecha,total,pagador_nombre,cobros(importe)&estado=in.(pendiente,cobrada_en_parte)&or=(tipo.is.null,tipo.eq.factura)&empresa_emisora=in.(accesalia,daniel)&fecha=gte.2024-01-01`,
    ),
    leer<{ importe: string; hito: string | null; fecha_prevista: string | null; fecha_vencimiento: string | null; linea: { emisor: string | null; hoja: { oportunidad: { nombre: string | null } | null } | null } | null }>(
      "hitos_cobro?select=importe,hito,fecha_prevista,fecha_vencimiento,linea:linea_facturacion_id(emisor,hoja:hoja_encargo_id(oportunidad:oportunidad_id(nombre)))&estado=in.(pendiente,parcial)&numero_factura=is.null&or=(fecha_prevista.not.is.null,fecha_vencimiento.not.is.null)",
    ),
    leer<{ cuenta: string; fecha: string; importe: string }>(`movimientos_bancarios?select=cuenta,fecha,importe&clase=eq.ingreso&tipo=is.null&fecha=gte.${meses[0]}-01`),
  ]);
  // Lo de todos los meses que no es gasto habitual ni impuesto (Monica vio el saldo de Accesalia subir a +157.000 sin
  // esto): lo que Accesalia pasa a Daniel, lo sin prever y las devoluciones. Media de los 9 ultimos meses completos.
  const ini9 = `${mesMas(hoy, -9)}-01`, fin9 = finDeMes(mesMas(hoy, -1));
  const otrosMovs = await leer<{ cuenta: string; importe: string; clase: string; tipo: string | null; gasto_habitual_id: string | null }>(
    `movimientos_bancarios?select=cuenta,importe,clase,tipo,gasto_habitual_id&fecha=gte.${ini9}&fecha=lte.${fin9}&clase=in.(interno,gasto,devolucion)`,
  );
  const g0 = gastosPorMes[meses.indexOf(mes)];
  const hasta = g0.hasta;
  const desdeSim = hasta ? masDias(hasta, 1) : hoy;
  const limiteAccesalia = Number(cuentas.find((c) => c.clave === "caixa_accesalia")?.limite_credito ?? 0);
  const deMes = (iso: string) => iso.slice(0, 7);

  // Eventos de la simulacion por empresa: [fecha, importe con signo]
  const eventos: Record<EmpresaGasto, [string, number][]> = { accesalia: [], daniel_autonomo: [] };
  const out = {} as DineroMes["e"];

  for (const [i, empresa] of EMPRESAS.entries()) {
    const saldo = g0.saldos.filter((s) => CUENTAS_DE[empresa].includes(s.clave)).reduce((s, x) => s + x.saldo, 0);

    // 2. Gastos que quedan, en su dia (lo de antes del extracto que «no pasó», al dia siguiente del extracto)
    for (const [k, m] of meses.entries()) {
      const b = gastosPorMes[k].bloques.find((x) => x.empresa === empresa)!;
      for (const f of b.filas) {
        if (f.previsto == null || f.estado === "pagado" || f.estado === "no_toca") continue;
        const dia = String(Math.min(f.gasto.dia ?? 15, Number(finDeMes(m).slice(8, 10)))).padStart(2, "0");
        const fecha = [`${m}-${dia}`, desdeSim].sort()[1];
        eventos[empresa].push([fecha, -f.previsto]);
      }
    }
    // 1. Impuestos que quedan (lo que sale de la cuenta: se paga, no solo se presenta; la SS va con los gastos)
    const imp = pagos.filter((p) => p.empresa === empresa && !p.sinCargo && p.estado === "pendiente" && !["SS", "RETA"].includes(p.modelo) && p.fecha >= desdeSim);
    for (const p of imp) eventos[empresa].push([p.fecha, -(p.real ?? p.previsto ?? 0)]);
    const impuestosMes = imp.filter((p) => deMes(p.fecha) === mes).map((p) => ({ fecha: p.fecha, concepto: `${p.nombre} · ${p.periodo}${p.plazo ? ` · ${p.plazo}` : ""}`, importe: p.real ?? p.previsto ?? 0 }));

    // 4. Ingresos
    const hace90 = masDias(hoy, -90);
    const pendientes = facturas.filter((f) => f.empresa_emisora === FACTURA_DE[empresa]).map((f) => ({
      f, queda: Number(f.total ?? 0) - f.cobros.reduce((s, c) => s + Number(c.importe), 0),
    })).filter((x) => x.queda > 0.5);
    const seguroTodo = pendientes.filter((x) => x.f.fecha >= hace90).map((x) => ({
      fecha: [masDias(x.f.fecha, DIAS_COBRO), desdeSim].sort()[1], concepto: `${x.f.anio}/${x.f.numero} · ${x.f.pagador_nombre ?? ""}`, importe: x.queda,
    }));
    const atrasadas = pendientes.filter((x) => x.f.fecha < hace90);
    const previstoTodo = hitos
      .filter((h) => (h.linea?.emisor ?? "accesalia") === empresa)
      .map((h) => ({ fecha: (h.fecha_prevista ?? h.fecha_vencimiento)!, concepto: `${h.linea?.hoja?.oportunidad?.nombre ?? ""} · ${h.hito ?? ""}`, importe: Number(h.importe) }))
      .filter((h) => h.fecha >= desdeSim && h.importe > 0);
    for (const x of [...seguroTodo, ...previstoTodo]) eventos[empresa].push([x.fecha, x.importe]);

    const e = est[i];
    const yaEn = (m: string) => entradas.filter((x) => CUENTAS_DE[empresa].includes(x.cuenta) && deMes(x.fecha) === m).reduce((s, x) => s + Number(x.importe), 0);
    const conocidoEn = (m: string) => [...seguroTodo, ...previstoTodo].filter((x) => deMes(x.fecha) === m).reduce((s, x) => s + x.importe, 0);
    let ingresosMes: IngresosEmpresa | null = null;
    for (const m of meses) {
      const mi = Number(m.slice(5, 7)) - 1;
      const estimado = e.anoProyectado * e.pct[mi];
      const resto = Math.max(0, estimado - yaEn(m) - conocidoEn(m));
      // el resto estimado se reparte por igual entre los dias que quedan del mes (desde el extracto)
      const ini = [`${m}-01`, desdeSim].sort()[1], fm = finDeMes(m);
      if (ini <= fm && resto > 0) {
        const n = (Date.parse(fm) - Date.parse(ini)) / 864e5 + 1;
        for (let d = 0; d < n; d++) eventos[empresa].push([masDias(ini, d), resto / n]);
      }
      if (m === mes)
        ingresosMes = {
          yaEntrado: r0(yaEn(m)),
          seguro: seguroTodo.filter((x) => deMes(x.fecha) === m),
          previsto: previstoTodo.filter((x) => deMes(x.fecha) === m),
          estimadoMes: r0(estimado),
          horquilla: [r0(e.anoProyectado * e.pctMin[mi]), r0(e.anoProyectado * e.pctMax[mi])],
          pctMes: e.pct[mi],
          restoEstimado: r0(resto),
          atrasadas: { n: atrasadas.length, importe: r0(atrasadas.reduce((s, x) => s + x.queda, 0)) },
          est: e,
        };
    }
    const mios = otrosMovs.filter((x) => CUENTAS_DE[empresa].includes(x.cuenta));
    const suma = (f: (x: (typeof mios)[number]) => boolean) => r0(mios.filter(f).reduce((s, x) => s + Number(x.importe), 0) / 9);
    // los internos ENTRE cuentas de la misma empresa (Caixa ↔ BBVA de Accesalia) se anulan solos al sumar
    const otros = {
      internos: suma((x) => x.clase === "interno"),
      sinPrever: suma((x) => x.clase === "gasto" && !x.gasto_habitual_id && !(x.tipo ?? "").startsWith("IMPUESTOS")),
      devoluciones: suma((x) => x.clase === "devolucion"),
    };
    const otrosMes = otros.internos + otros.sinPrever + otros.devoluciones;
    for (const m of meses) {
      const ini = [`${m}-01`, desdeSim].sort()[1], fm = finDeMes(m);
      if (ini > fm) continue;
      const total = (Date.parse(fm) - Date.parse(`${m}-01`)) / 864e5 + 1, n = (Date.parse(fm) - Date.parse(ini)) / 864e5 + 1;
      for (let d = 0; d < n; d++) eventos[empresa].push([masDias(ini, d), otrosMes / total]);
    }
    const b0 = g0.bloques.find((x) => x.empresa === empresa)!;
    const saldoDia1 = saldo + eventos[empresa].filter(([f]) => f <= finDeMes(mes)).reduce((s, [, v]) => s + v, 0);
    out[empresa] = {
      saldo,
      impuestos: impuestosMes,
      gastos: { previsto: r0(b0.previsto), pagado: r0(b0.pagado), queda: r0(b0.quedaPorPagar) },
      ingresos: ingresosMes!,
      otros,
      saldoDia1: r0(saldoDia1),
    };
  }

  // Las 8 semanas: de lunes a domingo, desde la de hoy; antes, lo que va del extracto a hoy
  const lunes = masDias(hoy, -((new Date(hoy + "T00:00:00Z").getUTCDay() + 6) % 7));
  const semanas: Semana[] = [];
  const tramo = (desde: string, hastaS: string, previa = false) => {
    const fila = { desde, hasta: hastaS, previa, e: {} as Semana["e"] };
    for (const empresa of EMPRESAS) {
      const ev = eventos[empresa].filter(([f]) => f >= desde && f <= hastaS);
      const entra = ev.filter(([, v]) => v > 0).reduce((s, [, v]) => s + v, 0);
      const sale = -ev.filter(([, v]) => v < 0).reduce((s, [, v]) => s + v, 0);
      const saldo = out[empresa].saldo + eventos[empresa].filter(([f]) => f <= hastaS).reduce((s, [, v]) => s + v, 0);
      fila.e[empresa] = { entra: r0(entra), sale: r0(sale), saldo: r0(saldo) };
    }
    semanas.push(fila);
  };
  if (desdeSim < lunes) tramo(desdeSim, masDias(lunes, -1), true);
  for (let k = 0; k < 8; k++) tramo(masDias(lunes, 7 * k), masDias(lunes, 7 * k + 6));

  return { mes, hoy, hasta, saldos: g0.saldos, limiteAccesalia, e: out, semanas };
}
