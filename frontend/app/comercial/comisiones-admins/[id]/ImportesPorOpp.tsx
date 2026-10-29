"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ImporteAMano, Sobre } from "../../../../lib/comisionesAdmin";
import { accionBuscarOpps, accionImporteOpp } from "../acciones";

// UN IMPORTE DISTINTO EN UNA OPP (Monica, 29-oct-2026): las que ya lo tienen, con quitar; y buscar otra para ponerselo.

const TITULO: Record<Sobre, string> = { proyecto: "proyecto", subvenciones: "subvenciones", contrata: "contrata" };
const campo = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-[13.5px] outline-none focus:border-carbon/50";
const eur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions) + " €";

export function ImportesPorOpp({ acuerdoId, importes, sobres }: { acuerdoId: string; importes: ImporteAMano[]; sobres: Sobre[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ id: string; nombre: string }[]>([]);
  const [opp, setOpp] = useState<{ id: string; nombre: string } | null>(null);
  const [sobre, setSobre] = useState<Sobre>(sobres[0] ?? "proyecto");
  const [importe, setImporte] = useState("");
  const [nota, setNota] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length < 3) setRes([]);
      else accionBuscarOpps(q).then(setRes);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const hacer = (f: () => Promise<{ ok: true } | { ok: false; error: string }>, despues?: () => void) =>
    empezar(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.error);
      despues?.();
      router.refresh();
    });
  const numero = importe.trim() === "" ? null : Number(importe.replace(/\./g, "").replace(",", "."));

  return (
    <div className="mt-2 rounded-2xl border border-black/10 bg-white p-5 text-[13.5px] text-carbon">
      {importes.length > 0 ? (
        <ul className="mb-4 divide-y divide-black/5">
          {importes.map((x) => (
            <li key={x.oppId + x.sobre} className="flex flex-wrap items-baseline gap-x-3 py-2">
              <b>{x.opp}</b>
              <span className="text-carbon/60">sobre {TITULO[x.sobre]}</span>
              <b className="tabular-nums">{eur(x.importe)}</b>
              {x.notas && <span className="text-carbon/60">· {x.notas}</span>}
              <button
                type="button"
                disabled={pendiente}
                onClick={() => hacer(() => accionImporteOpp(acuerdoId, x.oppId, x.sobre, null, null))}
                className="ml-auto text-[12.5px] font-semibold text-[#b4441c] hover:underline"
              >
                quitar (vuelve al acuerdo)
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-carbon/55">Ninguna opp con un importe distinto.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {opp ? (
          <span className="rounded-lg bg-[#f3f6f2] px-2.5 py-1.5 font-semibold">
            {opp.nombre}
            <button type="button" onClick={() => setOpp(null)} className="ml-2 text-carbon/45 hover:text-carbon">✕</button>
          </span>
        ) : (
          <div className="relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar la opp por su dirección…" className={`${campo} w-[320px]`} />
            {res.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-[260px] w-[420px] overflow-auto rounded-xl border border-black/10 bg-white shadow-lg">
                {res.map((x) => (
                  <button key={x.id} type="button" onClick={() => { setOpp(x); setQ(""); setRes([]); }} className="block w-full px-3 py-1.5 text-left text-[13.5px] hover:bg-[#f3f6f2]">
                    {x.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <select value={sobre} onChange={(e) => setSobre(e.target.value as Sobre)} className={campo}>
          {(sobres.length ? sobres : (["proyecto"] as Sobre[])).map((s) => <option key={s} value={s}>sobre {TITULO[s]}</option>)}
        </select>
        <input value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="importe €" className={`${campo} w-[110px] text-right tabular-nums`} />
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="por qué (opcional)" className={`${campo} min-w-[200px] flex-1`} />
        <button
          type="button"
          disabled={pendiente || !opp || numero == null || !Number.isFinite(numero)}
          onClick={() => opp && numero != null && hacer(() => accionImporteOpp(acuerdoId, opp.id, sobre, numero, nota), () => { setOpp(null); setImporte(""); setNota(""); })}
          className="rounded-xl bg-carbon px-4 py-1.5 font-bold text-white hover:bg-carbon/85 disabled:opacity-40"
        >
          Poner este importe
        </button>
      </div>
      {error && <p className="mt-2 text-[#b4441c]">{error}</p>}
    </div>
  );
}
