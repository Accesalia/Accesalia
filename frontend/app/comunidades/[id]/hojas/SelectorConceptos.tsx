"use client";

import { useState } from "react";
import type { Bloque } from "../../../../lib/hojas";

// Selector de conceptos de la hoja. Cada bloque activo del catalogo = una linea
// con check + importe. Marca -> se incluye en la hoja (conceptos_hoja). El importe
// arranca en el honorario por defecto del catalogo (hoy vacio; se rellena a mano)
// y suma a un total en vivo con su IVA. Todo son inputs del <form> padre, que los
// envia a la server action.

function eur(n: number): string {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SelectorConceptos({
  bloques,
  iniciales = [],
  ivaInicial = "21",
}: {
  bloques: Bloque[];
  iniciales?: { bloque_id: string | null; importe: number | null }[];
  ivaInicial?: string;
}) {
  const [marcados, setMarcados] = useState<Record<string, boolean>>(
    Object.fromEntries(iniciales.filter((i) => i.bloque_id).map((i) => [i.bloque_id as string, true])),
  );
  const [importes, setImportes] = useState<Record<string, string>>(
    Object.fromEntries(
      bloques.map((b) => {
        const ini = iniciales.find((i) => i.bloque_id === b.id);
        return [
          b.id,
          ini?.importe != null ? String(ini.importe) : b.honorarios_defecto != null ? String(b.honorarios_defecto) : "",
        ];
      }),
    ),
  );
  const [iva, setIva] = useState(ivaInicial);

  const base = bloques.reduce((s, b) => (marcados[b.id] ? s + (Number(importes[b.id]) || 0) : s), 0);
  const ivaN = Number(iva) || 0;
  const total = base * (1 + ivaN / 100);
  const nSel = bloques.filter((b) => marcados[b.id]).length;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <ul className="divide-y divide-black/5">
          {bloques.map((b) => {
            const on = !!marcados[b.id];
            return (
              <li key={b.id} className={`flex items-center gap-3 px-4 py-2.5 transition ${on ? "bg-lima-soft/50" : ""}`}>
                <input type="hidden" name={`concepto_${b.id}`} value={on ? "on" : ""} />
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => setMarcados((m) => ({ ...m, [b.id]: e.target.checked }))}
                    className="h-4 w-4 shrink-0 rounded border-black/20 text-lima focus:ring-lima"
                  />
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${on ? "font-medium text-carbon" : "text-carbon/70"}`}>
                      {b.nombre}
                    </span>
                    {b.es_paquete && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-lima-dark">Paquete</span>
                    )}
                  </span>
                </label>
                <div className="flex shrink-0 items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    name={`importe_${b.id}`}
                    value={importes[b.id] ?? ""}
                    onChange={(e) => setImportes((v) => ({ ...v, [b.id]: e.target.value }))}
                    disabled={!on}
                    placeholder="—"
                    className="w-28 rounded-lg border border-black/10 bg-white px-2 py-1 text-right text-sm text-carbon outline-none transition focus:border-lima disabled:bg-black/[0.03] disabled:text-carbon/30"
                  />
                  <span className={`text-sm ${on ? "text-carbon/60" : "text-carbon/25"}`}>€</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-carbon px-5 py-4 text-white">
        <div className="text-sm text-white/70">
          {nSel} concepto{nSel === 1 ? "" : "s"} seleccionado{nSel === 1 ? "" : "s"}
        </div>
        <div className="flex items-end gap-6">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Base</div>
            <div className="text-sm font-medium">{eur(base)} €</div>
          </div>
          <label className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-white/50">IVA %</div>
            <input
              name="iva_porcentaje"
              type="number"
              step="0.01"
              value={iva}
              onChange={(e) => setIva(e.target.value)}
              className="mt-0.5 w-16 rounded-md bg-white/10 px-2 py-0.5 text-right text-sm outline-none focus:bg-white/20"
            />
          </label>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-lima">Total</div>
            <div className="text-lg font-bold text-lima">{eur(total)} €</div>
          </div>
        </div>
      </div>
      <input type="hidden" name="importe_base" value={base.toFixed(2)} />
      <input type="hidden" name="importe_total" value={total.toFixed(2)} />
    </div>
  );
}
