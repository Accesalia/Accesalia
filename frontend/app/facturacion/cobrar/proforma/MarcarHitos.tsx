"use client";

import { useState } from "react";
import Link from "next/link";
import { cuentasDeHito, TEXTO_HITO, type Documento, type Hito } from "../../../../lib/cobrosCalculo";

// GENERAR PROFORMA › MARCAR LOS HITOS (maqueta validada): sus hojas firmadas con
// sus lineas e hitos; "marcas los que entran y «Generar proforma»". Cada hito
// dice por que no se puede marcar: ya facturado, ya en una proforma, a exito
// ("entra cuando se conceda").

const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);
const fecha = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

export function MarcarHitos({ documentos, enProforma }: { documentos: Documento[]; enProforma: Record<string, { codigo: string }[]> }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const todos = documentos.flatMap((d) => d.lineas.flatMap((l) => l.hitos.flatMap((h) => (h.subhitos.length ? h.subhitos : [h]))));
  const total = todos.filter((h) => marcados.has(h.id)).reduce((s, h) => s + (h.importe ?? 0), 0);

  const porQueNo = (h: Hito): string | null => {
    const c = cuentasDeHito(h);
    if (h.estado === "anulado") return "anulado";
    if (c.facturado > 0 && c.facturado >= c.importe - 1) return "ya facturado";
    if (enProforma[h.id]?.length) return `en la proforma ${enProforma[h.id][0].codigo}`;
    if (h.importe == null) return "a éxito: entra cuando se conceda";
    if (h.estado === "completado") return "cobrado";
    return null;
  };

  const fila = (h: Hito, sub: boolean) => {
    const no = porQueNo(h);
    const on = marcados.has(h.id);
    return (
      <label key={h.id} className={`flex items-baseline gap-3 rounded-lg px-2 py-1.5 text-[13.5px] ${sub ? "ml-6" : ""} ${no ? "cursor-default" : "cursor-pointer hover:bg-[#f3f9ec]"} ${on ? "bg-[#f3f9ec]" : ""}`}>
        <input
          type="checkbox"
          disabled={!!no}
          checked={on}
          onChange={() =>
            setMarcados((s) => {
              const n = new Set(s);
              if (n.has(h.id)) n.delete(h.id);
              else n.add(h.id);
              return n;
            })
          }
          className="h-4 w-4 accent-[#104269] disabled:opacity-30"
        />
        <span className={`min-w-0 flex-1 ${no ? "text-carbon/50" : "text-carbon/85"}`}>
          {h.texto ?? TEXTO_HITO[h.tipo] ?? h.tipo}
          {no && <span className="ml-2 text-[12px] font-semibold text-carbon/45">{no}</span>}
        </span>
        <span className="w-16 text-right tabular-nums text-carbon/50">{h.porcentaje != null ? `${Number(h.porcentaje).toLocaleString("es-ES")} %` : ""}</span>
        <span className={`w-28 text-right tabular-nums ${no ? "text-carbon/45" : "font-semibold text-carbon"}`}>{h.importe != null ? `${eur(h.importe)} €` : "a éxito"}</span>
      </label>
    );
  };

  return (
    <>
      <h2 className="mt-7 text-[16px] font-bold text-carbon">Marca los hitos que entran en la proforma</h2>
      {documentos.map((d) => (
        <section key={d.id} className="mt-3 overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/10 bg-[#fafbf9] px-5 py-3 text-[14px] text-carbon/75">
            <b className="text-carbon">{d.codigo ?? "—"}</b>
            {d.titulo && ` · ${d.titulo}`}
            {d.fecha && ` · firmada el ${fecha(d.fecha)}`}
          </div>
          {d.lineas.map((l, i) => (
            <div key={l.id} className="border-b border-black/5 px-5 py-3 last:border-0">
              <div className="flex items-baseline gap-3">
                <span className="w-5 text-right text-[13px] font-bold text-carbon/40">{i + 1}</span>
                <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-carbon">{l.descripcion}</span>
                <span className="whitespace-nowrap text-[14px] font-bold tabular-nums text-carbon">
                  {l.esPorcentaje ? `${l.porcentaje ?? ""} % a éxito` : l.importe != null ? `${eur(l.importe)} € + IVA` : "—"}
                </span>
              </div>
              <div className="mt-1 pl-6">{l.hitos.map((h) => (h.subhitos.length ? h.subhitos.map((s) => fila(s, true)) : fila(h, false)))}</div>
            </div>
          ))}
        </section>
      ))}
      <div className="sticky bottom-4 mt-4 flex items-center gap-4 rounded-2xl bg-carbon px-5 py-3.5 text-[14px] text-white shadow-lg">
        <span>{marcados.size ? <><b>{marcados.size} {marcados.size === 1 ? "hito marcado" : "hitos marcados"}</b> · {eur(total)} € + IVA</> : "Ningún hito marcado"}</span>
        <span className="ml-auto">
          {marcados.size ? (
            <Link href={`/facturacion/proforma/nueva?hitos=${[...marcados].join(",")}`} className="rounded-xl bg-lima px-4 py-2 font-bold text-carbon hover:bg-lima-dark hover:text-white">
              Generar proforma
            </Link>
          ) : (
            <span className="rounded-xl bg-white/15 px-4 py-2 font-bold text-white/50">Generar proforma</span>
          )}
        </span>
      </div>
    </>
  );
}
