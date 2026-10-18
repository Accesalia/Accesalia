"use client";

import { useState, useTransition } from "react";
import { accionEstimar } from "../../facturacion/caja/acciones";

// PROYECTOS POR ESTIMAR (Monica, 16-oct-2026): la bandeja de Alex. Lo que tiene
// la nube lista o no necesita nube. De cada proyecto: que es, la dificultad
// (normal por defecto; solo informa a quien asigna: «puede atascarse») y los
// dias (los del tipo). Cambia o da OK, y pasa a Asignar.

export type FilaEstimar = { oppId: string; direccion: string; que: string; obras: string[]; calculados: number | null };

const BTN = "inline-flex h-8 items-center rounded-[9px] border px-3 text-[13px] font-bold disabled:opacity-50";
const IN = "h-8 rounded-[7px] border border-[#d6dad2] bg-white px-2 text-[13px]";

function Fila({ f, alSalir }: { f: FilaEstimar; alSalir: () => void }) {
  const [dificultad, setDificultad] = useState("normal");
  const [dias, setDias] = useState(f.calculados != null ? String(f.calculados).replace(".", ",") : "");
  const [haciendo, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sale, setSale] = useState(false);
  const n = Number(dias.replace(",", "."));
  const ok = () =>
    empezar(async () => {
      setError(null);
      const r = await accionEstimar(f.oppId, dificultad, n, f.calculados);
      if (!r.ok) return setError(r.error ?? "No se guardó");
      setSale(true);
      setTimeout(alSalir, 350);
    });
  return (
    <tr className={`transition-opacity duration-[350ms] ${sale ? "opacity-0" : ""}`}>
      <td className="border-b border-[#f0f2ee] px-3.5 py-3 align-middle">
        <div className="text-[14.5px] font-bold">{f.direccion}</div>
        <div className="mt-0.5 text-[12.5px] text-[#7b8077]">{f.que}</div>
        {error && <div className="text-[12px] text-alerta">No se guardó: {error}</div>}
      </td>
      <td className="border-b border-[#f0f2ee] px-3.5 py-3 align-middle">
        <div className="flex flex-wrap gap-1.5">
          {f.obras.length ? (
            f.obras.map((o) => (
              <span key={o} className="inline-flex h-[22px] items-center rounded-full bg-[#f0f1ee] px-2.5 text-[12px] font-bold text-[#55594f]">{o}</span>
            ))
          ) : (
            <span className="text-[12.5px] text-amber-800/80">sin obra con días estándar</span>
          )}
        </div>
      </td>
      <td className="border-b border-[#f0f2ee] px-3.5 py-3 align-middle">
        <select value={dificultad} onChange={(e) => setDificultad(e.target.value)} className={IN} aria-label="Dificultad">
          <option value="baja">baja</option>
          <option value="normal">normal</option>
          <option value="alta">alta</option>
        </select>
      </td>
      <td className="border-b border-[#f0f2ee] px-3.5 py-3 align-middle whitespace-nowrap">
        <input value={dias} onChange={(e) => setDias(e.target.value)} inputMode="decimal" className={IN + " w-16 text-right"} aria-label="Días" placeholder="días" /> días
        {f.calculados != null && n !== f.calculados && <div className="text-[11.5px] text-[#7b8077]">estándar: {String(f.calculados).replace(".", ",")}</div>}
      </td>
      <td className="border-b border-[#f0f2ee] px-3.5 py-3 text-right align-middle">
        <button type="button" disabled={haciendo || !(n > 0)} onClick={ok} className={BTN + " border-lima bg-lima text-[#1f3a0c] hover:bg-lima-dark hover:text-white"}>
          OK
        </button>
      </td>
    </tr>
  );
}

export function Estimar({ filas }: { filas: FilaEstimar[] }) {
  const [quedan, setQuedan] = useState(filas);
  const TH = "border-b border-[#e9ece5] bg-[#fafbf9] px-3.5 py-[11px] text-left text-[11.5px] font-bold uppercase tracking-[.08em] text-[#7b8077]";
  return (
    <div className="w-fit overflow-hidden rounded-[14px] border border-[#e3e6df] bg-white">
      {quedan.length ? (
        <table className="w-auto border-collapse text-[14px] tabular-nums">
          <thead>
            <tr>
              <th className={TH}>Proyecto</th>
              <th className={TH}>Obras</th>
              <th className={TH}>Dificultad</th>
              <th className={TH}>Días estimados</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {quedan.map((f) => (
              <Fila key={f.oppId} f={f} alSalir={() => setQuedan((l) => l.filter((x) => x.oppId !== f.oppId))} />
            ))}
          </tbody>
        </table>
      ) : (
        <p className="p-[26px] text-center text-[#7b8077]">Nada por estimar.</p>
      )}
    </div>
  );
}
