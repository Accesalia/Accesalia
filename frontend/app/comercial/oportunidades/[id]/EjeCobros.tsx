"use client";

import { useState } from "react";
import type { Cobro, EstadoCobro, LineaCobro, Punto } from "../../../../lib/bloque4";

// EL EJE DE LOS COBROS (Monica, 29-oct-2026: «me flipa la parte de los cobros»): cada fila, una cosa contratada; cada
// columna, un punto del encargo con lo que se cobra en el. Debajo, la linea del encargo: al pulsar un punto, que pasa
// aqui, cuanto suele tardar y que falta (lo de ellos en ambar). Solo el resultado de cada cobro, nunca el papel.

const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const dia = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

const PASTILLA: Record<EstadoCobro, { clase: string; texto: (c: Cobro) => string }> = {
  cobrada: { clase: "border-[#b6d9a4] bg-[#e6f2df] text-[#2b5e12]", texto: (c) => `cobrada${c.fecha ? ` ${dia(c.fecha)}` : ""}` },
  facturada: { clase: "border-[#9cc4ee] bg-[#eaf2fb] text-[#104269]", texto: () => "facturada, por cobrar" },
  ok: { clase: "border-[#9cc4ee] bg-[#eaf2fb] text-[#104269]", texto: () => "ok para cobrar" },
  emitida: { clase: "border-[1.5px] border-[#d4860b] bg-[#fdf0d9] text-[#6b4300]", texto: (c) => `emitida ${dia(c.fecha)}` },
  atascada: { clase: "border-[1.5px] border-[#b23a4c] bg-[#fbe9ec] text-[#6b2135]", texto: (c) => `atascada: pedida el ${dia(c.fecha)}` },
  devuelta: { clase: "border-[1.5px] border-[#b23a4c] bg-[#fbe9ec] text-[#6b2135]", texto: () => "devuelta" },
  por_pedir: { clase: "border-[#b9bfc5] bg-white text-[#4a4f55]", texto: () => "por pedir" },
  a_exito: { clase: "border-dashed border-[#9aa0a6] bg-white text-[#5b6168]", texto: () => "a éxito" },
};
/** Los tres puntitos: en facturacion · emitida · cobrada. */
function Tres({ c }: { c: Cobro }) {
  const n = c.estado === "cobrada" ? 3 : c.estado === "por_pedir" || c.estado === "a_exito" ? 1 : 2;
  return (
    <span className="mt-1 flex justify-center gap-[3px]">
      {[0, 1, 2].map((i) => <i key={i} className={"inline-block h-[7px] w-[7px] rounded-full " + (i < n ? "bg-[#3f8a1c]" : "bg-[#d4d8dc]")} />)}
    </span>
  );
}

export function EjeCobros({ lineas, puntos }: { lineas: LineaCobro[]; puntos: Punto[] }) {
  const [sel, setSel] = useState(puntos.find((p) => p.estado === "ahora")?.k ?? puntos.at(-1)?.k ?? null);
  const p = puntos.find((x) => x.k === sel) ?? null;
  const deEllos = p ? /^De ellos:/.test(p.falta) : false;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="w-[22%]" />
              {puntos.map((x) => (
                <th key={x.k} className="px-1.5 pb-1.5 text-center text-[11.5px] font-bold text-carbon/80">{x.t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.id}>
                <td className="border-t border-[#e3e6ea] py-2 pr-3 align-middle text-[12.5px] font-bold">
                  {l.que}
                  <small className="block text-[11px] font-semibold text-carbon/55">
                    {l.detalle && <>{l.detalle.toLowerCase()} · </>}
                    {l.importe ? `${EUR.format(l.importe)} €` : "a éxito"}
                  </small>
                </td>
                {puntos.map((x) => {
                  const cs = l.cobros.filter((c) => c.punto === x.k);
                  return (
                    <td key={x.k} className="border-t border-[#e3e6ea] px-1.5 py-2 align-middle">
                      <div className="flex flex-col gap-1">
                        {cs.map((c) => (
                          <span key={c.id} className={"block rounded-[8px] border px-1.5 py-1 text-center text-[11.5px] leading-tight " + PASTILLA[c.estado].clase} title={c.texto}>
                            <b className="block text-[12.5px] tabular-nums">{c.importe != null ? `${EUR.format(c.importe)} €` : c.texto.slice(0, 40)}</b>
                            {c.sub && <span className="block text-[10.5px] opacity-75">una parte</span>}
                            {PASTILLA[c.estado].texto(c)}
                            <Tres c={c} />
                          </span>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* LA LINEA DEL ENCARGO */}
            <tr>
              <td className="pt-4 pr-3 align-top text-[12.5px] font-bold text-[#2f6fb3]">
                El encargo
                <small className="block text-[11px] font-semibold text-carbon/55">pulsa un punto</small>
              </td>
              {puntos.map((x) => (
                <td key={x.k} className="px-1.5 pt-4 align-top">
                  <button type="button" onClick={() => setSel(x.k)} className="flex w-full flex-col items-center gap-1">
                    <span
                      className={
                        "h-4 w-4 rounded-full " +
                        (x.estado === "hecho" ? "bg-[#2f6fb3]" : x.estado === "ahora" ? "border-4 border-[#d4860b] bg-white" : "border-2 border-[#9aa0a6] bg-white") +
                        (sel === x.k ? " ring-4 ring-[#2f6fb3]/25" : "")
                      }
                    />
                    <span className={"text-center text-[11px] " + (x.estado === "luego" ? "text-carbon/55" : "font-bold text-carbon")}>
                      {x.estado === "hecho" ? x.hecho : x.t}
                    </span>
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-carbon/60">
        <span>cobrada · emitida (pedido el cobro) · atascada (3 días laborables sin su ok) · por pedir · a éxito</span>
        <span className="inline-flex items-center gap-1">
          <span className="flex gap-[3px]"><i className="inline-block h-[7px] w-[7px] rounded-full bg-[#3f8a1c]" /><i className="inline-block h-[7px] w-[7px] rounded-full bg-[#d4d8dc]" /><i className="inline-block h-[7px] w-[7px] rounded-full bg-[#d4d8dc]" /></span>
          en facturación · emitida · cobrada
        </span>
      </div>
      {p && (
        <div className="mt-3 grid gap-2.5 md:grid-cols-3">
          <div className="rounded-[10px] border border-[#d0d5da] bg-white px-3 py-2">
            <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Qué pasa aquí · {p.t}</div>
            {p.que}
          </div>
          <div className="rounded-[10px] border border-[#d0d5da] bg-white px-3 py-2">
            <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Cuánto suele tardar</div>
            {p.tarda}
          </div>
          <div className={"rounded-[10px] border px-3 py-2 " + (deEllos ? "border-[#d4860b] bg-[#fdf0d9]" : "border-[#d0d5da] bg-white")}>
            <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Qué falta y de quién</div>
            {p.falta}
          </div>
        </div>
      )}
    </>
  );
}
