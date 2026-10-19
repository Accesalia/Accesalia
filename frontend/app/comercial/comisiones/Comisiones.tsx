"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Comercial, EstadoHito, HitoComision, HojaComision, LineaComision, OppComisionComercial } from "../../../lib/comisionesComercial";
import { accionNoCuenta, accionPagada } from "./acciones";

// MIS COMISIONES (Monica, 18-oct-2026, sobre su boceto). La lee EL COMERCIAL: «mi
// parte», «ya cobrado». Cerrada, cada opp dice lo justo: su codigo y nombre, cada hoja
// con lo que lleva, si esta cobrada, lo mio y si me lo han pagado; y cuatro cajitas
// (total contratado, mi parte, ya cobrado, pendiente de cobrar). Abierta, cada hoja con
// sus conceptos y debajo sus pagos: importe, en que esta la factura, mi parte y si se
// me ha pagado. Columnas con lineas; «mi parte» y «pagada» sobre crema.

const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const eur0 = (n: number) => Math.round(n).toLocaleString("es-ES", { useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const dia = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const campo = "rounded-lg border border-black/15 bg-white px-2 py-1 text-[12.5px] outline-none focus:border-carbon/50";
const CREMA = "bg-[#fdf8e6]";

const ESTADO: Record<EstadoHito, { texto: string; clase: string }> = {
  pendiente_emitir: { texto: "pendiente de emitir", clase: "bg-black/[.05] text-carbon/60" },
  emitida: { texto: "facturada, sin cobrar", clase: "bg-[#fbefd0] text-[#875f07]" },
  cobrada: { texto: "cobrada", clase: "bg-[#e3f1d6] text-[#2f5d14]" },
  devuelta: { texto: "devuelta", clase: "bg-[#f6dfdd] text-[#8e2f2d]" },
  a_exito: { texto: "a éxito", clase: "bg-black/[.05] text-carbon/50" },
  anulado: { texto: "anulado", clase: "bg-black/[.05] text-carbon/40" },
  completado_sin_factura: { texto: "cobrada", clase: "bg-[#e3f1d6] text-[#2f5d14]" },
};
const PASO: Record<string, string> = { le_debemos: "le debemos", pedir_factura: "hay que pedirle factura", su_factura: "su factura recibida", pagada: "pagada", la_paga_la_contrata: "la paga la contrata" };

/** Lo de una hoja: cuanto es mio, cuanto esta cobrado y si me lo han pagado. */
function cuentasHoja(ls: LineaComision[]) {
  const hs = ls.flatMap((l) => l.hitos).filter((h) => h.comision != null && h.comision > 0);
  const mio = hs.reduce((s, h) => s + (h.comision ?? 0), 0);
  const cobradas = hs.filter((h) => h.devengada);
  const pagadas = hs.filter((h) => h.pagada);
  return {
    mio,
    cobro: !hs.length ? "sin_importe" : cobradas.length === hs.length ? "cobrada" : cobradas.length ? "en_parte" : "pendiente",
    pagada: hs.length > 0 && pagadas.length === hs.length,
    fechaPago: pagadas.map((h) => h.fechaPago).filter((x): x is string => !!x).sort().at(-1) ?? null,
    pagadaEnParte: pagadas.length > 0 && pagadas.length < hs.length,
  } as const;
}

function Caja({ titulo, valor, fuerte, tono, crema }: { titulo: string; valor: number; fuerte?: boolean; tono?: "verde" | "ambar"; crema?: boolean }) {
  return (
    <div className={`min-w-[132px] rounded-xl border border-black/15 px-4 py-2 text-center ${crema ? CREMA : "bg-white"}`}>
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-carbon/55">{titulo}</div>
      <div className={`mt-0.5 tabular-nums ${fuerte ? "text-[18px] font-bold" : "text-[15px] font-semibold"} ${tono === "verde" ? "text-[#2f5d14]" : tono === "ambar" ? "text-[#875f07]" : "text-carbon"}`}>{eur0(valor)}</div>
    </div>
  );
}

function Pago({ h, comercialId, editable }: { h: HitoComision; comercialId: string; editable: boolean }) {
  const [pend, empezar] = useTransition();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  if (h.comision == null) return <span className="text-carbon/30">—</span>;
  if (h.pagada)
    return (
      <span className={`flex items-center gap-2 ${pend ? "opacity-50" : ""}`}>
        <span className="font-semibold text-[#2f5d14]">✓ pagada {dia(h.fechaPago)}</span>
        {editable && (
          <button type="button" onClick={() => empezar(() => accionPagada(h.id, comercialId, false, null))} className="text-[11.5px] text-carbon/40 hover:text-carbon hover:underline">
            deshacer
          </button>
        )}
      </span>
    );
  if (!h.devengada) return <span className="text-carbon/35">aún no</span>;
  if (!editable) return <span className="text-[#875f07]">pendiente de pagarme</span>;
  return (
    <span className={`flex items-center gap-1.5 ${pend ? "opacity-50" : ""}`}>
      <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
      <button type="button" onClick={() => empezar(() => accionPagada(h.id, comercialId, true, fecha))} className="rounded-lg bg-carbon px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-carbon/85">
        Pagada
      </button>
    </span>
  );
}

function NoCuenta({ o, editable }: { o: OppComisionComercial; editable: boolean }) {
  const [pend, empezar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  if (!editable || o.fuera?.motivo === "antes_de_2026") return null;
  if (o.fuera?.motivo === "marcada")
    return (
      <button type="button" disabled={pend} onClick={() => empezar(() => accionNoCuenta(o.id, false, null))} className="text-[12.5px] font-semibold text-[#104269] hover:underline">
        Vuelve a contar para su comisión
      </button>
    );
  return abierto ? (
    <span className={`flex flex-wrap items-center gap-2 ${pend ? "opacity-50" : ""}`}>
      <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por qué (p. ej. heredada para gestión)" className={`${campo} w-[300px]`} autoFocus />
      <button type="button" onClick={() => empezar(() => accionNoCuenta(o.id, true, nota))} className="rounded-lg bg-carbon px-2.5 py-1 text-[12px] font-semibold text-white">
        No cuenta
      </button>
      <button type="button" onClick={() => setAbierto(false)} className="text-[12px] text-carbon/50">
        cancelar
      </button>
    </span>
  ) : (
    <button type="button" onClick={() => setAbierto(true)} className="text-[12.5px] text-carbon/55 hover:text-carbon hover:underline">
      No cuenta para su comisión…
    </button>
  );
}

/** Una fila de hoja en la cabecera: que lleva, firmada, si esta cobrada, lo mio y si me lo han pagado. */
function FilaHoja({ h, ls }: { h: HojaComision; ls: LineaComision[] }) {
  const c = cuentasHoja(ls);
  return (
    <tr className="align-baseline text-[13px]">
      <td className="whitespace-nowrap py-1 pr-5 text-[12px] text-carbon/50">{h.codigo}</td>
      <td className="py-1 pr-5 font-semibold text-carbon">{h.que || "—"}</td>
      <td className="whitespace-nowrap py-1 pr-5 text-carbon/60">firmada {dia(h.fecha)}</td>
      <td className="whitespace-nowrap py-1 pr-5">
        {c.cobro === "cobrada" ? (
          <span className="font-semibold text-[#2f5d14]">cobrada ✓</span>
        ) : c.cobro === "en_parte" ? (
          <span className="text-[#875f07]">cobrada en parte</span>
        ) : c.cobro === "pendiente" ? (
          <span className="text-carbon/60">pendiente de cobro</span>
        ) : (
          <span className="text-carbon/40">a éxito</span>
        )}
      </td>
      <td className="whitespace-nowrap py-1 pr-5 text-right">
        <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/45">lo mío</span> <b className="tabular-nums">{eur(c.mio)}</b>
      </td>
      <td className="whitespace-nowrap py-1">
        {c.pagada ? (
          <span className="font-semibold text-[#2f5d14]">pagada ✓ {dia(c.fechaPago)}</span>
        ) : c.pagadaEnParte ? (
          <span className="text-[#875f07]">pagada en parte</span>
        ) : (
          <span className="text-carbon/45">pendiente</span>
        )}
      </td>
    </tr>
  );
}

/** El titulo de un concepto en dos niveles: lo principal y, debajo, su detalle. */
function partir(desc: string): [string, string | null] {
  const m = desc.match(/^(.+?)\s+(?:\/|—|–)\s+(.+)$/);
  return m ? [m[1], m[2]] : [desc, null];
}

const TH = "whitespace-nowrap border-l border-black/15 px-4 py-2 text-[10.5px] font-bold uppercase tracking-wide text-carbon/55 first:border-l-0 first:pl-0";
const TD = "border-l border-black/15 px-4 first:border-l-0 first:pl-0";

function TablaHoja({ h, ls, comercial, editable }: { h: HojaComision; ls: LineaComision[]; comercial: Comercial; editable: boolean }) {
  return (
    <section className="mt-6 first:mt-3">
      <h4 className="flex flex-wrap items-baseline gap-x-2 rounded-lg border-l-4 border-[#5f86ad] bg-[#eaf0f6] px-4 py-2 text-[14px] font-bold text-[#1f3f5f]">
        <span>{h.codigo}</span>
        <span className="font-normal text-[#1f3f5f]/70">· {h.que} · firmada {dia(h.fecha)} · total</span>
        <span className="tabular-nums">{eur(h.total)}</span>
      </h4>
      <div className="mt-2 overflow-x-auto">
        <table className="border-collapse text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-black/15">
              <th className={`${TH} text-left`}>Concepto</th>
              <th className={`${TH} text-right`}>Importe</th>
              <th className={`${TH} text-left`}>Factura</th>
              <th className={`${TH} ${CREMA} text-right`}>Mi parte</th>
              <th className={`${TH} ${CREMA} text-left`}>Pagada</th>
            </tr>
          </thead>
          {ls.map((l) => {
            const [titulo, detalle] = partir(l.descripcion);
            return (
              <tbody key={l.id} className="border-b border-black/15">
                <tr className="align-baseline">
                  <td className={`${TD} max-w-[460px] pb-1 pt-3`}>
                    <span className="font-semibold text-carbon">{titulo}</span>
                    {detalle && <span className="block text-[12px] text-carbon/55">{detalle}</span>}
                  </td>
                  <td className={`${TD} whitespace-nowrap pt-3 text-right text-[14px] font-bold text-[#3f7a1c]`}>{eur(l.importe)}</td>
                  <td className={TD} />
                  <td className={`${TD} ${CREMA} whitespace-nowrap pt-3 text-right font-bold text-carbon`}>{l.comision ? eur(l.comision) : ""}</td>
                  <td className={`${TD} ${CREMA}`} />
                </tr>
                {l.hitos.map((x, i) => (
                  <tr key={x.id} className="align-baseline">
                    <td className={`${TD} max-w-[460px] py-1.5 ${x.sub ? "pl-12" : "pl-8"} text-carbon/80`}>
                      <span className="mr-1.5 text-[12px] font-semibold text-carbon/45">Pago {i + 1}</span>
                      {x.texto}
                    </td>
                    <td className={`${TD} whitespace-nowrap py-1.5 text-right`}>{x.importe == null ? <span className="text-carbon/45">a éxito</span> : eur(x.importe)}</td>
                    <td className={`${TD} whitespace-nowrap py-1.5`}>
                      <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ESTADO[x.estado].clase}`}>
                        {ESTADO[x.estado].texto}
                        {(x.estado === "cobrada" || x.estado === "completado_sin_factura") && x.fechaCobro ? ` el ${dia(x.fechaCobro)}` : ""}
                      </span>
                      {x.factura && <span className="ml-2 text-[12px] text-carbon/45">{x.factura}</span>}
                    </td>
                    <td className={`${TD} ${CREMA} whitespace-nowrap py-1.5 text-right ${x.devengada ? "font-semibold text-carbon" : "text-carbon/45"}`}>{x.comision == null ? "—" : eur(x.comision)}</td>
                    <td className={`${TD} ${CREMA} whitespace-nowrap py-1.5 text-[12.5px]`}>
                      <Pago h={x} comercialId={comercial.id} editable={editable} />
                    </td>
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}

function Opp({ o, comercial, editable }: { o: OppComisionComercial; comercial: Comercial; editable: boolean }) {
  const deHoja = (id: string) => o.lineas.filter((l) => l.hojaId === id);
  return (
    <details className="group rounded-2xl border border-black/15 bg-white">
      <summary className="cursor-pointer list-none px-6 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-carbon/40 transition group-open:rotate-90">›</span>
          {o.codigo && <span className="text-[12px] text-carbon/50">{o.codigo}</span>}
          <b className="text-[15.5px] text-carbon">{o.nombre}</b>
          {/* Para ver el administrador y el resto de datos sin abrir la card (Monica, 19-oct). */}
          <Link
            href={`/comercial/oportunidades/${o.id}`}
            onClick={(e) => e.stopPropagation()}
            className="ml-2 rounded-lg border border-[#104269]/30 px-2.5 py-0.5 text-[12px] font-semibold text-[#104269] hover:bg-[#eaf0f6]"
          >
            Ver opp →
          </Link>
        </div>
        <table className="ml-5 mt-1.5 border-collapse">
          <tbody>
            {o.hojas.map((h) => (
              <FilaHoja key={h.id} h={h} ls={deHoja(h.id)} />
            ))}
          </tbody>
        </table>
        <div className="ml-5 mt-3 flex flex-wrap gap-2.5">
          <Caja titulo="Total contratado" valor={o.firmado} />
          <Caja titulo="Mi parte" valor={o.suya} fuerte crema />
          <Caja titulo="Ya cobrado" valor={o.devengada} tono="verde" crema />
          <Caja titulo="Pendiente de cobrar" valor={Math.max(0, o.suya - o.devengada)} tono="ambar" crema />
        </div>
        {o.fuera && (
          <div className="ml-5 mt-2 text-[12.5px] text-[#8e2f2d]">
            {o.fuera.motivo === "antes_de_2026" ? `No cuenta: su primera factura es de ${o.primeraFactura?.slice(0, 4)}, antes de 2026.` : `No cuenta para su comisión${o.fuera.nota ? `: ${o.fuera.nota}` : "."}`}
          </div>
        )}
      </summary>
      <div className="border-t border-black/15 px-6 pb-5 pt-2">
        {/* Lo que hay detras de «mi parte»: lo del administrador sale del total antes de calcularla. */}
        <p className="mt-2 text-[12.5px] text-carbon/60">
          Mi parte es el {comercial.pct?.toLocaleString("es-ES") ?? "—"} % de {eur(o.paraAccesalia)}
          {o.admin ? (
            <>
              {" "}
              (el total menos {eur(o.admin.importe)} para el administrador, {o.admin.persona ?? "sin persona"}: {o.admin.pagada ? `pagada ${dia(o.admin.fechaPago)}` : PASO[o.admin.paso ?? ""] ?? "pendiente"})
            </>
          ) : null}
          . Se cobra a medida que Accesalia cobra cada pago.
        </p>
        {o.hojas.map((h) => (
          <TablaHoja key={h.id} h={h} ls={deHoja(h.id)} comercial={comercial} editable={editable} />
        ))}
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <Link href={`/comercial/oportunidades/${o.id}`} className="text-[12.5px] text-[#104269] hover:underline">
            Abrir la opp →
          </Link>
          <NoCuenta o={o} editable={editable} />
        </div>
      </div>
    </details>
  );
}

export function Comisiones({ comercial, opps, vista, editable }: { comercial: Comercial; opps: OppComisionComercial[]; vista: "cuentan" | "fuera"; editable: boolean }) {
  const cuentan = opps.filter((o) => !o.fuera);
  const fuera = opps.filter((o) => o.fuera);
  const suma = (k: "firmado" | "suya" | "devengada" | "pagada") => cuentan.reduce((s, o) => s + o[k], 0);
  const lista = vista === "fuera" ? fuera : cuentan;
  const tab = (on: boolean) => `rounded-xl border px-4 py-2 text-[14px] font-semibold transition ${on ? "border-carbon bg-carbon text-white" : "border-black/15 bg-white text-carbon/80 hover:border-carbon/40"}`;
  const q = `c=${comercial.id}`;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3">
        <Caja titulo="Total contratado" valor={suma("firmado")} />
        <Caja titulo="Mi parte" valor={suma("suya")} fuerte crema />
        <Caja titulo="Ya cobrado" valor={suma("devengada")} tono="verde" crema />
        <Caja titulo="Pendiente de cobrar" valor={Math.max(0, suma("suya") - suma("devengada"))} tono="ambar" crema />
        <Caja titulo="Ya me han pagado" valor={suma("pagada")} crema />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/comercial/comisiones?${q}`} className={tab(vista === "cuentan")}>
          Cuentan <b className="ml-1">{cuentan.length}</b>
        </Link>
        <Link href={`/comercial/comisiones?${q}&ver=fuera`} className={tab(vista === "fuera")}>
          No cuentan <b className="ml-1">{fuera.length}</b>
        </Link>
      </div>
      {vista === "fuera" && fuera.length > 0 && (
        <p className="mt-2 text-[13px] text-carbon/60">Las de primera factura anterior a 2026 y las que dirección ha marcado (heredadas para gestión, por ejemplo).</p>
      )}
      <div className="mt-4 flex flex-col gap-4">
        {lista.map((o) => (
          <Opp key={o.id} o={o} comercial={comercial} editable={editable} />
        ))}
        {!lista.length && (
          <div className="rounded-2xl border border-black/15 bg-white px-6 py-5 text-[14px] text-carbon/60">
            {opps.length ? "Ninguna en esta pestaña." : `${comercial.nombre.split(" ")[0]} todavía no tiene ninguna hoja de encargo firmada como responsable.`}
          </div>
        )}
      </div>
    </div>
  );
}
