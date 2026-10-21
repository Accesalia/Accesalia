"use client";

import { useState } from "react";
import Link from "next/link";
import type { DineroMes, Linea } from "../../../lib/dineroMes";

// EL DINERO DEL MES: arriba, los seis bloques del mes con datos limpios, por empresa; abajo, las próximas 8 semanas.
// Cada cifra de ingresos dice de qué capa sale: seguro, previsto o estimado (la estacionalidad).

const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const e0 = (v: number) => `${v < 0 ? "−" : ""}${EUR0.format(Math.abs(v))}`;
const pc = (v: number) => `${(v * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })} %`;
const fecha = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;
const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const EMP = [["accesalia", "Accesalia"], ["daniel_autonomo", "Daniel"]] as const;
const suma = (l: Linea[]) => l.reduce((s, x) => s + x.importe, 0);

function Tarjeta({ n, titulo, children, pie }: { n: number; titulo: string; children: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white px-4 py-3">
      <h2 className="mb-2 text-[12px] font-extrabold uppercase tracking-widest text-carbon/70"><span className="mr-1.5 text-carbon/40">{n}</span>{titulo}</h2>
      {children}
      {pie && <div className="mt-2 border-t border-black/5 pt-1.5 text-[12px] text-carbon/60">{pie}</div>}
    </section>
  );
}

const Fila = ({ l, v, fuerte, tono, title }: { l: React.ReactNode; v: number | string; fuerte?: boolean; tono?: string; title?: string }) => (
  <div className={`flex items-baseline justify-between gap-6 py-0.5 text-[13.5px] ${fuerte ? "font-bold" : ""}`} title={title}>
    <span className="text-carbon/80">{l}</span>
    <span className={`whitespace-nowrap tabular-nums ${tono ?? "text-carbon"}`}>{typeof v === "number" ? e0(v) : v}</span>
  </div>
);

function Desplegable({ titulo, lineas }: { titulo: string; lineas: Linea[] }) {
  const [ver, setVer] = useState(false);
  if (!lineas.length) return null;
  return (
    <div className="ml-3">
      <button type="button" onClick={() => setVer(!ver)} className="text-[11.5px] font-semibold text-lima-dark hover:underline">{ver ? "▾" : "▸"} {titulo}</button>
      {ver && (
        <ul className="mb-1 text-[12px] text-carbon/75">
          {lineas.map((x, i) => (
            <li key={i} className="flex justify-between gap-4"><span className="max-w-[300px] truncate">{fecha(x.fecha)} · {x.concepto}</span><span className="tabular-nums">{e0(x.importe)}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Dinero({ d }: { d: DineroMes }) {
  const mesN = Number(d.mes.slice(5, 7));
  const siguiente = MES_LARGO[mesN % 12];
  const avisoLinea = -0.8 * d.limiteAccesalia;
  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {/* 3. Saldos */}
        <Tarjeta n={3} titulo="Saldos de las cuentas" pie={d.hasta ? `del último extracto (hasta el ${fecha(d.hasta)})` : undefined}>
          {d.saldos.map((s) => (
            <div key={s.clave}>
              <Fila l={`Saldo ${s.nombre}`} v={`${s.saldo.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} tono={s.saldo < 0 ? "text-alerta" : undefined} />
              {s.limite != null && <Fila l={<span className="pl-3 text-[12.5px]">línea de crédito: queda</span>} v={s.limite + s.saldo} tono="text-carbon/70" />}
            </div>
          ))}
        </Tarjeta>

        {/* 1. Impuestos */}
        <Tarjeta n={1} titulo={`Impuestos que quedan en ${MES_LARGO[mesN - 1]}`} pie={<Link href="/pagar" className="font-semibold text-lima-dark hover:underline">ver en Pagar › Impuestos →</Link>}>
          {EMP.map(([k, nombre]) => (
            <div key={k}>
              <Fila l={nombre} v={suma(d.e[k].impuestos)} fuerte />
              <Desplegable titulo={`${d.e[k].impuestos.length} pagos`} lineas={d.e[k].impuestos} />
            </div>
          ))}
        </Tarjeta>

        {/* 2. Gastos */}
        <Tarjeta n={2} titulo="Gastos" pie={<Link href={`/prever/gastos?mes=${d.mes}`} className="font-semibold text-lima-dark hover:underline">ver Gastos del mes →</Link>}>
          {EMP.map(([k, nombre]) => {
            const g = d.e[k].gastos, o = d.e[k].otros;
            return (
              <div key={k} className="mb-1.5">
                <Fila l={`${nombre} · queda por pagar`} v={g.queda} fuerte tono="text-amber-800" />
                <Fila l={<span className="pl-3 text-[12.5px]">ya pagado · previsto</span>} v={`${e0(g.pagado)} · ${e0(g.previsto)}`} tono="text-carbon/70" />
                <Fila l={<span className="pl-3 text-[12.5px]" title="Media de los últimos 9 meses">otros cada mes: {k === "accesalia" ? "a la cuenta de Daniel" : "de Accesalia"}, sin prever, devoluciones</span>}
                  v={`${e0(o.internos)} · ${e0(o.sinPrever)} · ${e0(o.devoluciones)}`} tono="text-carbon/70" />
              </div>
            );
          })}
        </Tarjeta>

        {/* 4. Ingresos */}
        <Tarjeta n={4} titulo={`Ingresos de ${MES_LARGO[mesN - 1]}`}
          pie={<>«Estimado»: lo que suele pesar {MES_LARGO[mesN - 1]} en el año (2021-2025, más peso a lo reciente) × el año en curso proyectado. Menos lo que ya entró y lo seguro y previsto.</>}>
          {EMP.map(([k, nombre]) => {
            const i = d.e[k].ingresos;
            const porEntrar = suma(i.seguro) + suma(i.previsto) + i.restoEstimado;
            return (
              <div key={k} className="mb-2">
                <Fila l={`${nombre} · por entrar`} v={porEntrar} fuerte tono="text-lima-dark" />
                <Fila l={<span className="pl-3 text-[12.5px]">ya entrado (banco)</span>} v={i.yaEntrado} tono="text-carbon/70" />
                <Fila l={<span className="pl-3 text-[12.5px]"><b className="text-lima-dark">seguro</b> · facturas emitidas pendientes</span>} v={suma(i.seguro)} />
                <Desplegable titulo={`${i.seguro.length} facturas`} lineas={i.seguro} />
                <Fila l={<span className="pl-3 text-[12.5px]"><b className="text-ajeno">previsto</b> · hitos con fecha</span>} v={suma(i.previsto)} />
                <Desplegable titulo={`${i.previsto.length} hitos`} lineas={i.previsto} />
                <Fila l={<span className="pl-3 text-[12.5px]"><b className="text-amber-800">estimado</b> · lo que falta hasta lo normal del mes</span>} v={i.restoEstimado} />
                <p className="pl-3 text-[11.5px] text-carbon/60">
                  {MES_LARGO[mesN - 1]} suele ser el {pc(i.pctMes)} del año · año proyectado {e0(i.est.anoProyectado)} → mes normal {e0(i.estimadoMes)} (entre {e0(i.horquilla[0])} y {e0(i.horquilla[1])})
                </p>
                {i.atrasadas.n > 0 && (
                  <p className="pl-3 text-[11.5px] text-carbon/55">No cuento {i.atrasadas.n} facturas pendientes de hace más de 90 días ({e0(i.atrasadas.importe)}).</p>
                )}
              </div>
            );
          })}
        </Tarjeta>

        {/* 5. Desbloquear */}
        <Tarjeta n={5} titulo="Lo que podríamos desbloquear">
          <p className="rounded-lg bg-amber-50/70 px-3 py-2 text-[13px] text-amber-900/85">
            Se calculará con Asignar: el reparto y el orden de los proyectos que meten más dinero en la cuenta antes de la fecha crítica (días de trabajo + visado + cobro de cada pagador). Asignar empieza a tener datos ahora.
          </p>
        </Tarjeta>

        {/* 6. Saldo al dia 1 */}
        <Tarjeta n={6} titulo={`Saldo estimado a 1 de ${siguiente}`} pie="Saldo de hoy + lo que entra − gastos − impuestos − otros, hasta fin de mes.">
          {EMP.map(([k, nombre]) => (
            <Fila key={k} l={nombre} v={d.e[k].saldoDia1} fuerte tono={d.e[k].saldoDia1 < (k === "accesalia" ? avisoLinea : 0) ? "text-alerta" : "text-carbon"} />
          ))}
          <Fila l="Las dos" v={d.e.accesalia.saldoDia1 + d.e.daniel_autonomo.saldoDia1} />
        </Tarjeta>
      </div>

      {/* Las 8 semanas */}
      <section className="mt-5 w-fit rounded-2xl border border-black/10 bg-white px-3 pb-3 pt-3">
        <h2 className="mb-1 ml-2 text-[12px] font-extrabold uppercase tracking-widest text-carbon/70">Próximas 8 semanas</h2>
        <table className="w-auto border-collapse tabular-nums">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-wide text-carbon/60">
              <th className="px-2 py-1 text-left">Semana</th>
              <th className="border-l border-black/10 px-2 py-1 text-right" colSpan={3}>Accesalia · entra · sale · saldo</th>
              <th className="border-l border-black/10 px-2 py-1 text-right" colSpan={3}>Daniel · entra · sale · saldo</th>
            </tr>
          </thead>
          <tbody>
            {d.semanas.map((s) => (
              <tr key={s.desde} className={`border-t border-black/5 text-[13px] ${s.previa ? "text-carbon/60" : ""}`}>
                <td className="whitespace-nowrap px-2 py-1">{s.previa ? `del ${fecha(s.desde)} a hoy (sin extracto)` : `${fecha(s.desde)} – ${fecha(s.hasta)}`}</td>
                {EMP.map(([k]) => {
                  const x = s.e[k];
                  const malo = x.saldo < (k === "accesalia" ? avisoLinea : 0);
                  return [
                    <td key={k + "e"} className="border-l border-black/10 px-2 py-1 text-right text-lima-dark">+{EUR0.format(x.entra)}</td>,
                    <td key={k + "s"} className="px-2 py-1 text-right text-carbon/75">−{EUR0.format(x.sale)}</td>,
                    <td key={k + "t"} className={`px-2 py-1 text-right font-bold ${malo ? "bg-red-50 text-alerta" : x.saldo < 0 ? "text-alerta" : ""}`}>{e0(x.saldo)}</td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ml-2 mt-2 max-w-[720px] text-[12px] text-carbon/60">
          Entra: lo seguro y lo previsto en su fecha, y lo estimado repartido por los días del mes. Sale: gastos en su día, impuestos en su fecha y lo de «otros» repartido.
          En rojo, Accesalia por debajo del 80 % de la línea de crédito ({e0(avisoLinea)}), o Daniel en negativo.
        </p>
      </section>
    </>
  );
}
