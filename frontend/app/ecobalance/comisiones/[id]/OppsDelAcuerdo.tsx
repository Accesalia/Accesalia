"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Deuda, OppComision, Sobre } from "../../../../lib/comisionesAdmin";
import { accionDeuda, accionNotaOpp } from "../acciones";
import { eur } from "../formato";

// PARTE 2 DE LA FICHA: sus opps firmadas. Cada una se despliega: LO NUESTRO
// (proyecto y subvenciones, sobre lo facturado) y LA CONTRATA (sobre el PEM
// adjudicado), cada cosa con su comision, Pagada y la fecha; y la nota de esa opp.

const TITULO: Record<Sobre, string> = { proyecto: "Proyecto", subvenciones: "Subvenciones", contrata: "Contrata" };
const campo = "rounded-lg border border-black/15 bg-white px-2 py-1 text-[13px] outline-none focus:border-carbon/50";

function LineaDeuda({ acuerdoId, oppId, d }: { acuerdoId: string; oppId: string; d: Deuda }) {
  const [pend, empezar] = useTransition();
  const [aMano, setAMano] = useState(d.aMano ? String(d.importe ?? "").replace(".", ",") : "");
  const [editando, setEditando] = useState(false);
  const guardar = (x: Parameters<typeof accionDeuda>[3]) => empezar(() => accionDeuda(acuerdoId, oppId, d.sobre, x));
  return (
    <div className={`grid grid-cols-[110px_150px_minmax(0,1fr)_120px_200px] items-center gap-x-3 py-1.5 text-[13px] ${pend ? "opacity-60" : ""}`}>
      <span className="font-semibold text-carbon/75">{TITULO[d.sobre]}</span>
      <span className="tabular-nums text-carbon/60">
        {d.base == null ? "—" : `${d.sobre === "contrata" ? "PEM" : "facturado"} ${eur(d.base)}`}
      </span>
      <span className="min-w-0 truncate">
        {editando ? (
          <span className="flex items-center gap-1.5">
            <input value={aMano} onChange={(e) => setAMano(e.target.value)} placeholder="importe" className={`${campo} w-[90px] text-right`} autoFocus />
            <button
              type="button"
              className="font-semibold text-[#104269]"
              onClick={() => {
                const v = aMano.trim() === "" ? null : Number(aMano.replace(/\./g, "").replace(",", "."));
                guardar({ importe: v != null && Number.isFinite(v) ? v : null });
                setEditando(false);
              }}
            >
              guardar
            </button>
            <button type="button" className="text-carbon/45" onClick={() => setEditando(false)}>
              cancelar
            </button>
          </span>
        ) : (
          <>
            {d.importe != null ? <b className="tabular-nums text-carbon">{eur(d.importe)}</b> : <span className="text-carbon/45">{d.aviso ?? "—"}</span>}
            {d.aMano && <span className="ml-1.5 text-[11.5px] text-carbon/50">a mano</span>}
            <button type="button" onClick={() => setEditando(true)} className="ml-2 text-[12px] text-carbon/40 hover:text-carbon">
              ✎
            </button>
          </>
        )}
      </span>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={d.pagada} onChange={(e) => guardar({ pagada: e.target.checked })} className="h-4 w-4 accent-[#2f5d14]" />
        Pagada
      </label>
      <span>
        {d.pagada && <input type="date" defaultValue={d.fechaPago ?? ""} onBlur={(e) => e.target.value && e.target.value !== d.fechaPago && guardar({ pagada: true, fecha: e.target.value })} className={campo} />}
      </span>
    </div>
  );
}

function Nota({ acuerdoId, oppId, nota }: { acuerdoId: string; oppId: string; nota: string | null }) {
  const [t, setT] = useState(nota ?? "");
  const [pend, empezar] = useTransition();
  return (
    <textarea
      value={t}
      onChange={(e) => setT(e.target.value)}
      onBlur={() => t.trim() !== (nota ?? "") && empezar(() => accionNotaOpp(acuerdoId, oppId, t))}
      rows={1}
      placeholder="Nota de esta opp…"
      className={`${campo} mt-1 w-full ${pend ? "opacity-60" : ""}`}
    />
  );
}

export function OppsDelAcuerdo({ acuerdoId, opps }: { acuerdoId: string; opps: OppComision[] }) {
  const [verCerradas, setVerCerradas] = useState(true);
  const lista = opps.filter((o) => verCerradas || o.enCurso);
  const pendiente = opps.reduce((s, o) => s + o.pendiente, 0);
  return (
    <>
      <div className="mt-3 flex items-center gap-4 text-[13.5px]">
        <span>
          <b>{opps.length}</b> firmadas · <b>{opps.filter((o) => o.enCurso).length}</b> en curso
        </span>
        <span>
          Por pagarle: <b className="tabular-nums">{eur(pendiente)}</b>
        </span>
        <label className="ml-auto flex items-center gap-1.5 text-carbon/70">
          <input type="checkbox" checked={verCerradas} onChange={(e) => setVerCerradas(e.target.checked)} className="accent-[#104269]" />
          ver también las cerradas
        </label>
      </div>
      <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white">
        {lista.length === 0 && <div className="px-5 py-6 text-center text-[13.5px] text-carbon/55">Ninguna opp firmada.</div>}
        {lista.map((o) => (
          <details key={o.id} className="group border-b border-black/5 last:border-0">
            <summary className="grid cursor-pointer list-none grid-cols-[18px_minmax(0,1fr)_100px_90px_170px] items-baseline gap-x-3 px-4 py-2.5 text-[13.5px] hover:bg-[#fafbf9]">
              <span className="text-carbon/40 transition group-open:rotate-90">›</span>
              <span className="min-w-0 truncate font-semibold text-carbon">
                {o.nombre}
                {o.nota && <span className="ml-2 font-normal text-carbon/50">· {o.nota}</span>}
              </span>
              <span className="text-carbon/60">{o.firmada ? new Date(o.firmada).toLocaleDateString("es-ES") : "—"}</span>
              <span>
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${o.enCurso ? "bg-[#e6eef8] text-[#2d4f7c]" : "bg-black/5 text-carbon/55"}`}>{o.enCurso ? "en curso" : "cerrada"}</span>
              </span>
              <span className={`whitespace-nowrap text-right tabular-nums ${o.pendiente ? "font-bold text-carbon" : "text-[#2f5d14]"}`}>{o.pendiente ? `${eur(o.pendiente)} por pagar` : "al día"}</span>
            </summary>
            <div className="border-t border-black/5 bg-[#fbfcfa] px-10 py-3">
              {o.nuestras.length > 0 && (
                <>
                  <div className="text-[11.5px] font-bold uppercase tracking-wide text-carbon/45">Lo nuestro</div>
                  {o.nuestras.map((d) => (
                    <LineaDeuda key={d.sobre} acuerdoId={acuerdoId} oppId={o.id} d={d} />
                  ))}
                </>
              )}
              {o.contrata && (
                <>
                  <div className="mt-2 text-[11.5px] font-bold uppercase tracking-wide text-carbon/45">La contrata</div>
                  <LineaDeuda acuerdoId={acuerdoId} oppId={o.id} d={o.contrata} />
                </>
              )}
              <Nota acuerdoId={acuerdoId} oppId={o.id} nota={o.nota} />
              <Link href={`/comercial/oportunidades/${o.id}`} className="mt-1 inline-block text-[12.5px] text-[#104269] hover:underline">
                Abrir la opp →
              </Link>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
