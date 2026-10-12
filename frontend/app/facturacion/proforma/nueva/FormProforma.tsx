"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Preparada } from "../../../../lib/proformas";
import { TEXTO_HITO } from "../../../../lib/cobrosCalculo";
import { accionEmitirProforma } from "../acciones";

// El formulario de la proforma: lineas (concepto + sus hitos con su importe),
// a quien va, IVA y retencion, y el total en vivo.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
// "1.556,25" (como se escribe aqui) o "1556.25" (como sale de la base)
const aNum = (s: string) => (s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s)) || 0;
const CAMPO = "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-lima";
const BTN = "rounded-lg border border-black/15 bg-white px-2.5 py-1 text-[12px] font-semibold text-carbon/75 hover:border-carbon/40";

export function FormProforma({ p }: { p: Preparada }) {
  const router = useRouter();
  const hito = new Map(p.hitos.map((h) => [h.id, h]));
  const [lineas, setLineas] = useState(p.lineas.map((l, i) => ({ k: i, concepto: l.concepto, hitos: l.hitos })));
  const [importes, setImportes] = useState<Record<string, string>>(
    Object.fromEntries(p.hitos.map((h) => [h.id, h.disponible != null ? EUR.format(h.disponible) : ""])),
  );
  const [pag, setPag] = useState({ nombre: p.pagador?.nombre ?? "", nif: p.pagador?.nif ?? "", domicilio: p.pagador?.domicilio ?? "" });
  const [iva, setIva] = useState(String(p.ivaPct));
  const [irpf, setIrpf] = useState(String(p.irpfPct));
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const baseDe = (ids: string[]) => ids.reduce((a, id) => a + aNum(importes[id] ?? ""), 0);
  const base = lineas.reduce((a, l) => a + baseDe(l.hitos), 0);
  const cuotaIva = (base * aNum(iva)) / 100;
  const ret = (base * aNum(irpf)) / 100;

  const mover = (id: string, destino: number) => {
    let ls = lineas.map((l) => ({ ...l, hitos: l.hitos.filter((x) => x !== id) }));
    if (destino === -1) ls = [...ls, { k: Date.now(), concepto: "", hitos: [id] }];
    else ls = ls.map((l) => (l.k === destino ? { ...l, hitos: [...l.hitos, id] } : l));
    setLineas(ls.filter((l) => l.hitos.length));
  };

  const emitir = () =>
    empezar(async () => {
      setError(null);
      const r = await accionEmitirProforma(p.oppId, {
        lineas: lineas.map((l) => ({ concepto: l.concepto, hitos: l.hitos.map((id) => ({ id, importe: aNum(importes[id] ?? "") })) })),
        pagador: { nombre: pag.nombre, nif: pag.nif || null, domicilio: pag.domicilio || null, email: null },
        ivaPct: aNum(iva),
        irpfPct: aNum(irpf),
        notas,
      });
      if (!r.ok) return setError(r.error);
      router.push(`/facturacion/proforma/${r.id}`);
    });

  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <h2 className="text-[12px] font-bold uppercase tracking-wide text-carbon/70">A quién va</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr]">
          <input value={pag.nombre} onChange={(e) => setPag({ ...pag, nombre: e.target.value })} placeholder="Nombre o razón social" className={CAMPO} />
          <input value={pag.nif} onChange={(e) => setPag({ ...pag, nif: e.target.value })} placeholder="NIF / CIF" className={CAMPO} />
          <input value={pag.domicilio} onChange={(e) => setPag({ ...pag, domicilio: e.target.value })} placeholder="Domicilio" className={CAMPO + " sm:col-span-2"} />
        </div>
        {!p.pagador && <p className="mt-1 text-[12px] text-amber-900">No se sabe quién paga estas líneas: escríbelo.</p>}
      </section>

      {lineas.map((l, i) => (
        <section key={l.k} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[12px] font-bold uppercase tracking-wide text-carbon/70">Línea {i + 1}</h2>
            <span className="font-bold tabular-nums">{EUR.format(baseDe(l.hitos))} €</span>
          </div>
          <textarea
            value={l.concepto}
            onChange={(e) => setLineas(lineas.map((x) => (x.k === l.k ? { ...x, concepto: e.target.value } : x)))}
            rows={3}
            placeholder="El concepto, tal como saldrá en la proforma y en la factura"
            className={CAMPO + " mt-2 resize-y"}
          />
          <div className="mt-2 divide-y divide-black/5">
            {l.hitos.map((id) => {
              const h = hito.get(id)!;
              const pasa = h.disponible != null && aNum(importes[id] ?? "") > h.disponible + 0.5;
              return (
                <div key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-[12.5px]">
                  <span className="min-w-[260px] flex-1">
                    <span className="text-carbon/60">{h.documento} · </span>
                    {h.linea} · <b>{TEXTO_HITO[h.tipo] ?? h.tipo}</b>
                    {h.esSubhito && " (parte)"}
                    <span className="text-carbon/60">
                      {" "}· {h.disponible != null ? `quedan ${EUR.format(h.disponible)} €` : "a éxito"}
                      {h.enProforma > 0 && ` (${EUR.format(h.enProforma)} € ya en otra proforma)`}
                    </span>
                  </span>
                  <input
                    value={importes[id] ?? ""}
                    onChange={(e) => setImportes({ ...importes, [id]: e.target.value })}
                    className={"w-28 rounded-md border bg-white px-2 py-0.5 text-right " + (pasa ? "border-alerta" : "border-black/15")}
                  />
                  <span>€</span>
                  <select value={l.k} onChange={(e) => mover(id, Number(e.target.value))} className="rounded-md border border-black/15 bg-white px-1 py-0.5 text-[12px]">
                    {lineas.map((x, j) => (
                      <option key={x.k} value={x.k}>
                        en la línea {j + 1}
                      </option>
                    ))}
                    <option value={-1}>en una línea nueva</option>
                  </select>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4 text-[13px]">
          <label className="text-carbon/70">
            IVA %
            <input value={iva} onChange={(e) => setIva(e.target.value)} className="ml-2 w-16 rounded-md border border-black/15 px-2 py-0.5 text-right" />
          </label>
          <label className="text-carbon/70">
            Retención IRPF %
            <input value={irpf} onChange={(e) => setIrpf(e.target.value)} className="ml-2 w-16 rounded-md border border-black/15 px-2 py-0.5 text-right" />
          </label>
          <div className="ml-auto text-right tabular-nums">
            <div>Base {EUR.format(base)} € · IVA {EUR.format(cuotaIva)} €{ret > 0 ? ` · IRPF −${EUR.format(ret)} €` : ""}</div>
            <div className="text-xl font-bold">Total {EUR.format(base + cuotaIva - ret)} €</div>
          </div>
        </div>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Nota interna (no sale en la proforma)" className={CAMPO + " mt-3 resize-y"} />
        {error && <p className="mt-2 text-[13px] font-semibold text-alerta">{error}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className={BTN} onClick={() => router.back()}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={emitir}
            className="rounded-lg bg-lima px-4 py-1.5 text-[13px] font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-50"
          >
            {ocupado ? "Emitiendo…" : "Emitir proforma"}
          </button>
        </div>
      </section>
    </div>
  );
}
