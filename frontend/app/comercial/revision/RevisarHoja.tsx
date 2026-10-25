"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { HojaParaRevisar } from "../../../lib/hojaEmitir";
import { accionOkHoja } from "./acciones";

// EL OK DE DANIEL A UNA HOJA (Monica, 25-oct-2026), en el sistema nuevo: por hoja. Arriba su paquete (la hoja, su
// presupuesto y la viabilidad que fue con ella); luego sus LINEAS en arbol (que, en el papel, importe o %, forma de pago
// y la comision que va dentro) con un «Modifícalo» en cada una que la apunta en la nota; y el ok o los cambios. Quien
// revisa solo da el ok o pide cambios: la hoja la toca solo el comercial.

const EUROS = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: "always" });
const CUANDO = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const DOC = "inline-flex items-center gap-1.5 rounded-lg border border-lima/60 bg-lima-soft px-2.5 py-1 text-[13px] font-semibold text-lima-dark hover:border-lima-dark";
const BOTON = "rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-carbon/75 hover:border-lima hover:text-carbon disabled:opacity-50";

export function RevisarHoja({ h }: { h: HojaParaRevisar }) {
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const caja = useRef<HTMLTextAreaElement>(null);
  const pdf = `/comercial/hoja-encargo/pdf/${h.id}`;
  const pendiente = h.estado === "pendiente_ok_daniel";
  const marcar = (que: string) => {
    setNota((n) => (n.trim() ? n.replace(/\s*$/, "\n") : "") + `• ${que}: `);
    setTimeout(() => caja.current?.focus(), 0);
  };
  const resolver = (decision: "ok" | "cambios") =>
    empezar(async () => {
      setMsg(null);
      const r = await accionOkHoja(h.id, decision, nota);
      if (!r.ok) return setMsg(r.error);
      setMsg(r.avisos.join(" · ") || (decision === "ok" ? "Ok dado." : "Devuelta con cambios."));
      router.refresh();
    });

  return (
    <>
      <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">
        <Link href={`/comercial/oportunidades/${h.oppId}`} className="hover:underline">{h.opp}</Link>
      </h1>
      <p className="mt-1 text-[14px] text-carbon/75">
        {h.codigo ? `${h.codigo} · versión ${h.numero}` : "Hoja nueva (el código nace con tu ok)"}
        {h.aQuien && ` · para ${h.aQuien}`}
        {h.comercial && ` · comercial ${h.comercial}`}
        {h.generadaPor && ` · la generó ${h.generadaPor}`}
        {h.desde && ` · ${CUANDO.format(new Date(h.desde))}`}
      </p>
      {h.motivoCambio && (
        <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[14px] text-amber-900"><b>Por qué hay versión nueva.</b> {h.motivoCambio}</p>
      )}
      {h.cambiosAntes && (
        <p className="mt-2 rounded-lg border border-black/10 bg-hueso px-3 py-2 text-[14px] text-carbon/80"><b>La última vez pediste:</b> {h.cambiosAntes}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={pdf} target="_blank" rel="noreferrer" className={DOC}>📄 La hoja</a>
        {h.presupuestoId ? (
          <a href={`${pdf}?que=presupuesto`} target="_blank" rel="noreferrer" className={DOC}>📄 Su presupuesto</a>
        ) : (
          <span className="text-[13px] text-carbon/60">Sin presupuesto (no hay nada que se cobre con importe).</span>
        )}
        {h.viabilidad && (
          <a href={`/comercial/viabilidad/${h.viabilidad.id}`} target="_blank" rel="noreferrer" className={DOC}>📄 Viabilidad {h.viabilidad.numero ?? ""} v{h.viabilidad.version}</a>
        )}
      </div>

      <table className="mt-5 border-collapse text-[14px]">
        <thead>
          <tr className="border-b border-black/15 text-left text-[11px] font-bold uppercase tracking-wide text-carbon/60">
            <th className="px-3 py-1.5">Qué</th>
            <th className="px-3 py-1.5">En el papel</th>
            <th className="px-3 py-1.5 text-right">Importe</th>
            <th className="px-3 py-1.5">Cómo se cobra</th>
            <th className="px-3 py-1.5 text-right">Comisión dentro</th>
            {pendiente && <th />}
          </tr>
        </thead>
        <tbody>
          {h.lineas.map((l) => (
            <tr key={l.id} className={"border-b border-black/5 " + (l.nivel === 0 ? "font-bold" : "")}>
              <td className="px-3 py-1.5" style={{ paddingLeft: 12 + l.nivel * 20 }}>
                {l.que}
                {l.tipo && <span className="font-normal text-carbon/65"> · {l.tipo}</span>}
              </td>
              <td className="px-3 py-1.5 font-normal">{l.enPapel ? "sale" : <span className="text-carbon/55">no sale</span>}</td>
              <td className="px-3 py-1.5 text-right font-normal tabular-nums">
                {!l.seCobra ? (
                  <i className="text-carbon/60">incluido</i>
                ) : l.porcentaje != null ? (
                  `${String(l.porcentaje).replace(".", ",")} % de lo concedido`
                ) : l.importe != null ? (
                  <>
                    {EUROS.format(l.importe)}
                    {l.conjuntoSoloTotal && <span className="block text-[11px] text-carbon/55">dentro del total del conjunto</span>}
                  </>
                ) : (
                  <span className="text-carbon/55">el total del conjunto</span>
                )}
              </td>
              <td className="px-3 py-1.5 text-[13px] font-normal">{l.seCobra ? (l.forma ?? <span className="text-carbon/55">—</span>) : ""}</td>
              <td className="px-3 py-1.5 text-right font-normal tabular-nums">{l.comision ? EUROS.format(l.comision) : ""}</td>
              {pendiente && (
                <td className="px-3 py-1.5 font-normal">
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-carbon/60 underline-offset-2 hover:text-carbon hover:underline"
                    onClick={() => marcar(l.que + (l.tipo ? ` (${l.tipo})` : ""))}
                  >
                    Modifícalo
                  </button>
                </td>
              )}
            </tr>
          ))}
          <tr>
            <td className="px-3 py-2 font-bold">Total</td>
            <td />
            <td className="px-3 py-2 text-right font-bold tabular-nums">{EUROS.format(h.importe)} + IVA</td>
            <td colSpan={pendiente ? 3 : 2} />
          </tr>
        </tbody>
      </table>

      {pendiente ? (
        <div className="mt-5 max-w-[760px]">
          <textarea
            ref={caja}
            rows={3}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Si pides cambios, di cuáles (con «Modifícalo» se apunta la línea aquí). Si das el ok, una nota opcional."
            className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-[14px] focus:border-lima focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className={BOTON + " border-lima bg-lima font-bold text-carbon"} disabled={ocupado} onClick={() => resolver("ok")}>Dar el ok</button>
            <button type="button" className={BOTON} disabled={ocupado || !nota.trim()} onClick={() => resolver("cambios")}>Devolver con cambios</button>
            {msg && <span className="text-[13px] font-semibold text-carbon">{msg}</span>}
          </div>
        </div>
      ) : (
        <p className="mt-5 text-[14px] text-carbon/70">
          {msg ?? "Ya no espera el ok."} <Link href="/comercial/revision" className="font-semibold underline">Volver a la bandeja</Link>
        </p>
      )}

      <div className="mt-6 h-[80vh] overflow-hidden rounded-xl bg-[#e9e9e6]">
        <iframe src={pdf} title="La hoja" className="h-full w-full border-0" />
      </div>
    </>
  );
}
