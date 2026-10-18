"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Comercial, EstadoHito, HitoComision, OppComisionComercial } from "../../../lib/comisionesComercial";
import { accionNoCuenta, accionPagada } from "./acciones";

// LA PANTALLA (Monica, 18-oct-2026): arriba sus cifras; debajo sus opps con hoja
// firmada, cada una con su desglose (para Accesalia · para el admin · su parte) y,
// al abrirla, sus lineas e hitos: cuanto, en que esta la factura, su comision y si
// se le ha pagado. Tablas ajustadas a su contenido (regla 8).

const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const eur0 = (n: number) => Math.round(n).toLocaleString("es-ES", { useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const dia = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const campo = "rounded-lg border border-black/15 bg-white px-2 py-1 text-[12.5px] outline-none focus:border-carbon/50";

const ESTADO: Record<EstadoHito, { texto: string; clase: string }> = {
  pendiente_emitir: { texto: "pendiente de emitir", clase: "bg-black/[.05] text-carbon/60" },
  emitida: { texto: "emitida, sin cobrar", clase: "bg-[#fbefd0] text-[#875f07]" },
  cobrada: { texto: "cobrada", clase: "bg-[#e3f1d6] text-[#2f5d14]" },
  devuelta: { texto: "devuelta", clase: "bg-[#f6dfdd] text-[#8e2f2d]" },
  a_exito: { texto: "a éxito", clase: "bg-black/[.05] text-carbon/50" },
  anulado: { texto: "anulado", clase: "bg-black/[.05] text-carbon/40" },
  completado_sin_factura: { texto: "cobrado (sin factura cargada)", clase: "bg-[#e3f1d6] text-[#2f5d14]" },
};
const PASO: Record<string, string> = { le_debemos: "le debemos", pedir_factura: "pedirle factura", su_factura: "su factura recibida", pagada: "pagada", la_paga_la_contrata: "la paga la contrata" };

function Cifra({ titulo, valor, tono }: { titulo: string; valor: number; tono?: "verde" | "ambar" }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-5 py-3 text-center">
      <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/60">{titulo}</div>
      <div className={`mt-0.5 text-[22px] font-bold tabular-nums ${tono === "verde" ? "text-[#2f5d14]" : tono === "ambar" ? "text-[#875f07]" : "text-carbon"}`}>{eur0(valor)}</div>
    </div>
  );
}

function Pago({ h, comercialId, editable }: { h: HitoComision; comercialId: string; editable: boolean }) {
  const [pend, empezar] = useTransition();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  if (h.comision == null) return null;
  if (!editable) return h.pagada ? <span className="text-[#2f5d14]">pagada {dia(h.fechaPago)}</span> : <span className="text-carbon/40">—</span>;
  if (h.pagada)
    return (
      <span className={`flex items-center gap-2 ${pend ? "opacity-50" : ""}`}>
        <span className="text-[#2f5d14]">pagada {dia(h.fechaPago)}</span>
        <button type="button" onClick={() => empezar(() => accionPagada(h.id, comercialId, false, null))} className="text-[11.5px] text-carbon/40 hover:text-carbon hover:underline">
          deshacer
        </button>
      </span>
    );
  if (!h.devengada) return <span className="text-carbon/35">aún no</span>;
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

function Opp({ o, comercial, editable }: { o: OppComisionComercial; comercial: Comercial; editable: boolean }) {
  return (
    <details className="group w-fit max-w-full rounded-2xl border border-black/10 bg-white">
      <summary className="cursor-pointer list-none px-5 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-carbon/40 transition group-open:rotate-90">›</span>
          <b className="text-[15px] text-carbon">{o.nombre}</b>
          <span className="text-[12.5px] text-carbon/55">
            {o.hojas.map((h) => h.codigo).join(" · ")} · firmada {dia(o.hojas[0]?.fecha ?? null)}
            {o.primeraFactura && ` · 1.ª factura ${dia(o.primeraFactura)}`}
          </span>
        </div>
        {/* EL DESGLOSE, sin abrir: lo firmado, lo de Accesalia, lo del admin y su parte. */}
        <div className="ml-5 mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[13px] tabular-nums">
          <span>
            Firmado <b>{eur(o.firmado)}</b>
          </span>
          <span>
            para Accesalia <b>{eur(o.paraAccesalia)}</b>
          </span>
          {o.admin && (
            <span className="text-carbon/70">
              para el admin <b className="text-carbon">{eur(o.admin.importe)}</b> ({o.admin.persona ?? "sin persona"} · {o.admin.pagada ? `pagada ${dia(o.admin.fechaPago)}` : PASO[o.admin.paso ?? ""] ?? "pendiente"})
            </span>
          )}
          <span className="rounded-lg bg-[#f3f9ec] px-2 py-0.5">
            su parte <b>{eur(o.suya)}</b> · devengada <b>{eur(o.devengada)}</b> · pagada {eur(o.pagada)}
            {o.porPagar > 0 && (
              <>
                {" "}
                · <b className="text-[#875f07]">por pagar {eur(o.porPagar)}</b>
              </>
            )}
          </span>
        </div>
        {o.fuera && (
          <div className="ml-5 mt-1 text-[12.5px] text-[#8e2f2d]">
            {o.fuera.motivo === "antes_de_2026" ? `No cuenta: su primera factura es de ${o.primeraFactura?.slice(0, 4)}, antes de 2026.` : `No cuenta para su comisión${o.fuera.nota ? `: ${o.fuera.nota}` : "."}`}
          </div>
        )}
      </summary>
      <div className="border-t border-black/10 px-5 pb-4 pt-2">
        <table className="border-collapse text-[13px] tabular-nums">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-wide text-carbon/50">
              <th className="py-1.5 pr-5 text-left">Línea · hito</th>
              <th className="py-1.5 pr-5 text-right">Importe</th>
              <th className="py-1.5 pr-5 text-left">Factura</th>
              <th className="py-1.5 pr-5 text-right">Su parte</th>
              <th className="py-1.5 text-left">Pagada</th>
            </tr>
          </thead>
          {o.lineas.map((l) => (
            <tbody key={l.id} className="border-t border-black/10">
              <tr>
                <td colSpan={5} className="max-w-[640px] pb-0.5 pt-2.5 font-semibold text-carbon">
                  {l.descripcion} <span className="font-normal text-carbon/50">· {eur(l.importe)}</span>
                </td>
              </tr>
              {l.hitos.map((h) => (
                <tr key={h.id} className="align-baseline">
                  <td className={`max-w-[420px] py-1 pr-5 text-carbon/80 ${h.sub ? "pl-8" : "pl-4"}`}>{h.texto}</td>
                  <td className="whitespace-nowrap py-1 pr-5 text-right">{h.importe == null ? <span className="text-carbon/45">a éxito</span> : eur(h.importe)}</td>
                  <td className="whitespace-nowrap py-1 pr-5">
                    <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ESTADO[h.estado].clase}`}>
                      {ESTADO[h.estado].texto}
                      {h.estado === "cobrada" && h.fechaCobro ? ` ${dia(h.fechaCobro)}` : ""}
                    </span>
                    {h.factura && <span className="ml-2 text-[12px] text-carbon/50">{h.factura}</span>}
                  </td>
                  <td className={`whitespace-nowrap py-1 pr-5 text-right ${h.devengada ? "font-semibold text-carbon" : "text-carbon/50"}`}>{h.comision == null ? "—" : eur(h.comision)}</td>
                  <td className="whitespace-nowrap py-1 text-[12.5px]">
                    <Pago h={h} comercialId={comercial.id} editable={editable} />
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <div className="mt-3 flex flex-wrap items-center gap-4">
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
  const suma = (k: "paraAccesalia" | "suya" | "devengada" | "pagada" | "porPagar") => cuentan.reduce((s, o) => s + o[k], 0);
  const lista = vista === "fuera" ? fuera : cuentan;
  const tab = (on: boolean) => `rounded-xl border px-4 py-2 text-[14px] font-semibold transition ${on ? "border-carbon bg-carbon text-white" : "border-black/10 bg-white text-carbon/80 hover:border-carbon/40"}`;
  const q = `c=${comercial.id}`;
  return (
    <div className="mt-5">
      <div className="grid w-fit max-w-full grid-cols-2 gap-3 sm:grid-cols-5">
        <Cifra titulo="Firmado para Accesalia" valor={suma("paraAccesalia")} />
        <Cifra titulo="Su comisión total" valor={suma("suya")} />
        <Cifra titulo="Devengada (cobrado)" valor={suma("devengada")} tono="verde" />
        <Cifra titulo="Pagada" valor={suma("pagada")} />
        <Cifra titulo="Por pagar" valor={suma("porPagar")} tono="ambar" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
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
      <div className="mt-4 flex flex-col gap-3">
        {lista.map((o) => (
          <Opp key={o.id} o={o} comercial={comercial} editable={editable} />
        ))}
        {!lista.length && (
          <div className="w-fit rounded-2xl border border-black/10 bg-white px-6 py-5 text-[14px] text-carbon/60">
            {opps.length ? "Ninguna en esta pestaña." : `${comercial.nombre.split(" ")[0]} todavía no tiene ninguna hoja de encargo firmada como responsable.`}
          </div>
        )}
      </div>
    </div>
  );
}
