"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Deuda, OppComision, Sobre } from "../../../../lib/comisionesAdmin";
import { accionDeuda, accionNotaOpp, accionSubirDocumento } from "../acciones";
import { eur, PASOS } from "../formato";

// PARTE 2 DE LA FICHA: sus opps firmadas. Cada una se despliega: LO NUESTRO
// (proyecto y subvenciones, sobre lo facturado) y LA CONTRATA (sobre el PEM
// adjudicado), cada cosa con su comision y su PASO (le debemos → pedirle factura
// → su factura → pagada, con su factura y el justificante); y la nota de esa opp.

const TITULO: Record<Sobre, string> = { proyecto: "Proyecto", subvenciones: "Subvenciones", contrata: "Contrata" };
const campo = "rounded-lg border border-black/15 bg-white px-2 py-1 text-[13px] outline-none focus:border-carbon/50";

/** Los pasos de una comision, el suyo marcado. En B no hay factura: de «le debemos» a «pagada». */
function Pasos({ d }: { d: Deuda }) {
  if (d.paso === "la_paga_la_contrata") return <span className="text-[12.5px] text-carbon/55">la paga la contrata directamente</span>;
  const pasos = PASOS.filter((p) => !d.enB || p.clave === "le_debemos" || p.clave === "pagada");
  const en = pasos.findIndex((p) => p.clave === d.paso);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {pasos.map((p, i) => (
        <span
          key={p.clave}
          className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
            i === en
              ? p.clave === "pagada" ? "bg-[#e3f1d6] text-[#2f5d14]" : p.clave === "pedir_factura" ? "bg-[#fbefd0] text-[#875f07]" : "bg-carbon text-white"
              : i < en ? "text-carbon/45" : "text-carbon/25"
          }`}
        >
          {i < en && "✓ "}
          {p.titulo}
        </span>
      ))}
    </span>
  );
}

/** Subir un PDF (su factura o el justificante) con un solo clic. */
function SubirPdf({ acuerdoId, oppId, sobre, que, fecha, children }: { acuerdoId: string; oppId: string; sobre: Sobre; que: "factura" | "justificante"; fecha?: string; children: React.ReactNode }) {
  const [pend, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <label className={`cursor-pointer rounded-lg border border-black/15 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-carbon hover:border-carbon/50 ${pend ? "opacity-50" : ""}`}>
      {pend ? "Subiendo…" : children}
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={pend}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const fd = new FormData();
          fd.set("pdf", f);
          fd.set("acuerdo", acuerdoId);
          fd.set("opp", oppId);
          fd.set("sobre", sobre);
          fd.set("que", que);
          if (fecha) fd.set("fecha", fecha);
          empezar(async () => {
            const r = await accionSubirDocumento(fd);
            setError(r.ok ? null : r.error);
          });
        }}
      />
      {error && <span className="ml-2 font-normal text-[#b4441c]">{error}</span>}
    </label>
  );
}

function LineaDeuda({ acuerdoId, oppId, d }: { acuerdoId: string; oppId: string; d: Deuda }) {
  const [pend, empezar] = useTransition();
  const [aMano, setAMano] = useState(d.aMano ? String(d.importe ?? "").replace(".", ",") : "");
  const [editando, setEditando] = useState(false);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const guardar = (x: Parameters<typeof accionDeuda>[3]) => empezar(() => accionDeuda(acuerdoId, oppId, d.sobre, x));
  const enlace = (href: string | null, texto: string) =>
    href && (
      <a href={href} target="_blank" rel="noreferrer" className="text-[12.5px] text-[#104269] hover:underline">
        {texto} ↗
      </a>
    );
  return (
    <div className={`grid grid-cols-[110px_170px_150px_minmax(0,1fr)] items-start gap-x-3 py-2 text-[13px] ${pend ? "opacity-60" : ""}`}>
      <span className="pt-0.5 font-semibold text-carbon/75">{TITULO[d.sobre]}</span>
      <span className="pt-0.5 tabular-nums text-carbon/60">{d.base == null ? "—" : `${d.sobre === "contrata" ? "PEM" : "facturado"} ${eur(d.base)}`}</span>
      <span className="min-w-0 pt-0.5">
        {editando ? (
          <span className="flex items-center gap-1.5">
            <input value={aMano} onChange={(e) => setAMano(e.target.value)} placeholder="importe" className={`${campo} w-[80px] text-right`} autoFocus />
            <button
              type="button"
              className="font-semibold text-[#104269]"
              onClick={() => {
                const v = aMano.trim() === "" ? null : Number(aMano.replace(/\./g, "").replace(",", "."));
                guardar({ importe: v != null && Number.isFinite(v) ? v : null });
                setEditando(false);
              }}
            >
              ok
            </button>
            <button type="button" className="text-carbon/45" onClick={() => setEditando(false)}>
              ✕
            </button>
          </span>
        ) : (
          <>
            {d.importe != null ? <b className="tabular-nums text-carbon">{eur(d.importe)}</b> : <span className="text-carbon/45">{d.aviso ?? "—"}</span>}
            {d.aMano && <span className="ml-1.5 text-[11.5px] text-carbon/50">a mano</span>}
            <button type="button" onClick={() => setEditando(true)} title="Poner el importe a mano" className="ml-2 text-[12px] text-carbon/40 hover:text-carbon">
              ✎
            </button>
          </>
        )}
      </span>
      {d.paso ? (
        <div className="min-w-0">
          <Pasos d={d} />
          {d.paso !== "la_paga_la_contrata" && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {/* Lo que toca hacer en este paso */}
              {!d.pagada && !d.enB && !d.factura && (
                <SubirPdf acuerdoId={acuerdoId} oppId={oppId} sobre={d.sobre} que="factura">
                  Subir su factura
                </SubirPdf>
              )}
              {!d.pagada && (
                <>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} title="Fecha del pago" />
                  {!d.enB && (
                    <SubirPdf acuerdoId={acuerdoId} oppId={oppId} sobre={d.sobre} que="justificante" fecha={fecha}>
                      Subir justificante
                    </SubirPdf>
                  )}
                  <button type="button" onClick={() => guardar({ pagada: true, fecha })} className="text-[12.5px] text-carbon/60 hover:text-carbon hover:underline">
                    {d.enB ? "Marcar pagada" : "pagada sin justificante"}
                  </button>
                </>
              )}
              {d.pagada && (
                <>
                  <span className="text-[12.5px] text-carbon/65">
                    el{" "}
                    <input
                      type="date"
                      defaultValue={d.fechaPago ?? ""}
                      onBlur={(e) => e.target.value && e.target.value !== d.fechaPago && guardar({ pagada: true, fecha: e.target.value })}
                      className={campo}
                    />
                  </span>
                  <button type="button" onClick={() => guardar({ pagada: false })} className="text-[12px] text-carbon/40 hover:text-carbon hover:underline">
                    deshacer
                  </button>
                </>
              )}
              {enlace(d.factura, "su factura")}
              {enlace(d.justificante, "justificante")}
            </div>
          )}
        </div>
      ) : (
        <span />
      )}
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
  const deudas = (o: OppComision) => [...o.nuestras, ...(o.contrata ? [o.contrata] : [])];
  const pedir = opps.filter((o) => deudas(o).some((d) => d.paso === "pedir_factura")).length;
  return (
    <>
      <div className="mt-3 flex items-center gap-4 text-[13.5px]">
        <span>
          <b>{opps.length}</b> firmadas · <b>{opps.filter((o) => o.enCurso).length}</b> en curso
        </span>
        <span>
          Por pagarle: <b className="tabular-nums">{eur(pendiente)}</b>
        </span>
        {pedir > 0 && <span className="rounded-full bg-[#fbefd0] px-2.5 py-0.5 font-semibold text-[#875f07]">pedirle factura en {pedir}</span>}
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
                {deudas(o).some((d) => d.paso === "pedir_factura") && (
                  <span className="ml-2 rounded-full bg-[#fbefd0] px-2 py-px text-[11.5px] font-bold text-[#875f07]">pedirle factura</span>
                )}
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
