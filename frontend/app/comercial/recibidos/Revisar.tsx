"use client";

import { useState, useTransition } from "react";
import { accionAceptar, accionRechazar, accionVer } from "./acciones";

// Los botones de cada documento recibido: verlo, darlo por bueno o rechazarlo.
// Los papeles con fecha la piden al darlos por buenos (el acta, obligatoria:
// de ahi sale hasta cuando vale el presidente).
const FECHA: Record<string, { et: string; obligatoria: boolean }> = {
  acta: { et: "Fecha del acta", obligatoria: true },
  dni: { et: "Caduca el", obligatoria: false },
  certificado: { et: "Fecha del certificado", obligatoria: false },
  votacion: { et: "Fecha de la junta", obligatoria: false },
};

export function Revisar({ id, esHoja, tipo = null }: { id: string; esHoja: boolean; tipo?: string | null }) {
  const [motivo, setMotivo] = useState<string | null>(null);
  const [fecha, setFecha] = useState("");
  const pide = tipo ? FECHA[tipo] : undefined;
  const [error, setError] = useState<string | null>(null);
  const [haciendo, empezar] = useTransition();
  const hacer = (f: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    empezar(async () => {
      const r = await f();
      if (!r.ok) setError(r.error ?? "No se ha podido.");
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={async () => {
          const u = await accionVer(id);
          if (u) window.open(u, "_blank");
          else setError("No se puede abrir.");
        }}
        className="rounded-lg border border-carbon/30 bg-white px-3 py-1 text-[13px] font-semibold hover:border-carbon"
      >
        Ver
      </button>
      {motivo === null ? (
        <>
          {pide && (
            <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-carbon/60">
              {pide.et}
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-[28px] rounded-md border border-black/20 px-1.5 text-[12.5px] font-normal normal-case" />
            </label>
          )}
          <button type="button" disabled={haciendo || (!!pide?.obligatoria && !fecha)} onClick={() => hacer(() => accionAceptar(id, fecha || null))} className="rounded-lg bg-lima px-3 py-1 text-[13px] font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-50">
            {esHoja ? "Es la firmada" : "Correcto"}
          </button>
          <button type="button" disabled={haciendo} onClick={() => setMotivo("")} className="text-[12.5px] text-carbon/65 underline hover:text-carbon">
            No es esto
          </button>
        </>
      ) : (
        <span className="flex items-center gap-1.5">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus placeholder="Por qué (opcional)" className="h-[28px] w-[180px] rounded-md border border-black/20 px-2 text-[12.5px]" />
          <button type="button" disabled={haciendo} onClick={() => hacer(() => accionRechazar(id, motivo))} className="rounded-md border border-carbon/30 bg-white px-2.5 py-0.5 text-[12.5px] font-semibold hover:border-carbon">
            Rechazar
          </button>
          <button type="button" onClick={() => setMotivo(null)} className="text-[12px] text-carbon/60 underline">
            cancelar
          </button>
        </span>
      )}
      {haciendo && <span className="text-[12px] text-carbon/60">…</span>}
      {error && <span className="text-[12.5px] font-semibold text-alerta">{error}</span>}
    </div>
  );
}
