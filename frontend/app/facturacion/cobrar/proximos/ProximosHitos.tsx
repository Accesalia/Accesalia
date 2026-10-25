"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Cuando, HitoProximo } from "../../../../lib/proximosHitos";

// COBRAR › PROXIMOS HITOS A FACTURAR (maqueta validada, docs/figma/area-dinero-v1.html,
// pantalla 4): "Lo que vamos a tener que emitir, de lo mas cercano a lo mas lejano".
// Pestañas con su numero y su importe; lo que ya se puede facturar, arriba; se
// marcan hitos de una misma direccion y «Generar proforma».

const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);
const eur0 = (n: number) => Math.round(n).toLocaleString("es-ES", { useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PESTANAS: { clave: Cuando; titulo: string }[] = [
  { clave: "ya", titulo: "Facturable ya" },
  { clave: "semana", titulo: "Esta semana" },
  { clave: "mes", titulo: "Este mes" },
  { clave: "adelante", titulo: "Más adelante" },
  { clave: "pausa", titulo: "En pausa" },
  { clave: "antigua", titulo: "Firmadas antes de 2025" },
];

export function ProximosHitos({ hitos, previos, inicial }: { hitos: HitoProximo[]; previos: number; inicial: Cuando }) {
  const [tab, setTab] = useState<Cuando>(inicial);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const lista = useMemo(() => {
    const t = limpio(q.trim());
    return hitos.filter((h) => h.cuando === tab && (!t || limpio(`${h.direccion} ${h.hoja ?? ""} ${h.que} ${h.paga}`).includes(t)));
  }, [hitos, tab, q]);
  const sel = hitos.filter((h) => marcados.has(h.id));
  const dirs = [...new Set(sel.map((h) => h.oppId))];
  const total = sel.reduce((s, h) => s + (h.importe ?? 0), 0);

  const marcar = (id: string) =>
    setMarcados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <h1 className="text-[28px] font-bold leading-tight text-carbon">Próximos hitos a facturar</h1>
      <p className="mt-1 text-[14.5px] text-carbon/65">Lo que vamos a tener que emitir, de lo más cercano a lo más lejano</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {PESTANAS.map((p) => {
          const suyos = hitos.filter((h) => h.cuando === p.clave);
          const on = p.clave === tab;
          return (
            <button
              key={p.clave}
              type="button"
              onClick={() => setTab(p.clave)}
              className={`rounded-xl border px-4 py-2 text-[14px] font-semibold transition ${on ? "border-carbon bg-carbon text-white" : "border-black/10 bg-white text-carbon/80 hover:border-carbon/40"}`}
            >
              {p.titulo} <b className="ml-1">{suyos.length}</b>
              {p.clave !== "pausa" && <span className={`ml-1.5 font-normal ${on ? "text-white/70" : "text-carbon/50"}`}>· {eur0(suyos.reduce((s, h) => s + (h.importe ?? 0), 0))}</span>}
            </button>
          );
        })}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar dirección, hoja, pagador…"
          className="ml-auto w-[260px] rounded-xl border border-black/15 bg-white px-3 py-1.5 text-[13.5px] outline-none focus:border-carbon/50"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="grid grid-cols-[36px_minmax(0,1.1fr)_minmax(0,1.6fr)_170px_130px_100px_110px] gap-x-3 border-b border-black/10 px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-wide text-carbon/50">
          <span />
          <span>Dirección</span>
          <span>Línea · hito</span>
          <span>{tab === "ya" ? "Por qué ya" : "Cuándo"}</span>
          <span>Paga</span>
          <span className="text-right">Importe</span>
          <span>Proforma</span>
        </div>
        {lista.length === 0 && <div className="px-5 py-8 text-center text-[13.5px] text-carbon/55">Nada en esta pestaña.</div>}
        {lista.map((h) => (
          <label
            key={h.id}
            className={`grid cursor-pointer grid-cols-[36px_minmax(0,1.1fr)_minmax(0,1.6fr)_170px_130px_100px_110px] items-baseline gap-x-3 border-b border-black/5 px-4 py-2.5 text-[13.5px] last:border-0 ${marcados.has(h.id) ? "bg-[#f3f9ec]" : "hover:bg-[#fafbf9]"}`}
          >
            <input type="checkbox" checked={marcados.has(h.id)} onChange={() => marcar(h.id)} className="h-4 w-4 accent-[#104269]" />
            <span className="min-w-0 truncate font-semibold text-carbon">
              {h.oppId ? (
                <Link href={`/facturacion/${h.oppId}?desde=proximos`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                  {h.direccion}
                </Link>
              ) : (
                h.direccion
              )}
              {h.hoja && <span className="ml-1.5 text-[12px] font-normal text-carbon/45">{h.hoja}</span>}
            </span>
            <span className="min-w-0 truncate text-carbon/80" title={h.que}>
              {h.que}
              {!h.pasada && <span className="ml-1.5 rounded-full bg-[#fbefd0] px-1.5 py-px text-[11px] font-bold text-[#875f07]">en Nuevas hojas</span>}
            </span>
            <span>
              <span
                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                  h.cuando === "ya" ? "bg-[#e3f1d6] text-[#2f5d14]" : h.cuando === "pausa" ? "bg-[#fbefd0] text-[#875f07]" : "bg-[#e6eef8] text-[#2d4f7c]"
                }`}
              >
                {h.porQue}
              </span>
            </span>
            <span className="min-w-0 truncate text-carbon/75">{h.paga}</span>
            <span className="text-right font-semibold tabular-nums text-carbon">{h.importe == null ? <span className="font-normal text-carbon/45">a éxito</span> : eur(h.importe)}</span>
            <span className="truncate text-[12.5px] text-carbon/60">{h.proforma ?? "—"}</span>
          </label>
        ))}
        {tab === "antigua" && previos > 0 && (
          <div className="px-5 py-3 text-[12.5px] text-carbon/55">
            Hitos de hojas firmadas antes de 2025 sin factura enlazada. Las facturas de 2022 a 2024 ya están casadas con sus hitos, pero las de 2020 y 2021 se quedaron sueltas: un hito de aquí puede estar cobrado con una de ellas. Para revisar con calma, no para facturar.
          </div>
        )}
      </div>

      {/* LA BARRA DE ABAJO: lo marcado y el boton. La proforma es de UNA direccion. */}
      {sel.length > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center gap-4 rounded-2xl bg-carbon px-5 py-3.5 text-[14px] text-white shadow-lg">
          <span>
            <b>
              {sel.length} {sel.length === 1 ? "hito marcado" : "hitos marcados"}
            </b>
            {dirs.length === 1 ? ` de ${sel[0].direccion}` : ` de ${dirs.length} direcciones`} · {eur(total)} € + IVA
          </span>
          <span className="ml-auto flex items-center gap-3">
            <button type="button" onClick={() => setMarcados(new Set())} className="text-white/70 hover:text-white">
              quitar
            </button>
            {dirs.length === 1 ? (
              <Link href={`/facturacion/proforma/nueva?hitos=${sel.map((h) => h.id).join(",")}`} className="rounded-xl bg-lima px-4 py-2 font-bold text-carbon hover:bg-lima-dark hover:text-white">
                Generar proforma
              </Link>
            ) : (
              <span className="text-[13px] text-white/70">Una proforma es de una sola dirección</span>
            )}
          </span>
        </div>
      )}
    </>
  );
}
