"use client";

import type { Casilla } from "@/lib/datos";

// Una caja del grid, estilo "portal de hipotecas".
// - ESTRUCTURA (partes / multiple / alternativa): real, del prompt 2.
// - APLICA / NO APLICA: lo marca el humano (de momento se guarda en el navegador;
//   luego persistira en BD con la capa de aplicabilidad).
// - Estado de recepcion (pendiente/recibido/validado): futuro (prompt 3).

const ETIQUETA_TIPO: Record<Casilla["tipo_completitud"], string> = {
  simple: "Documento",
  partes: "Varias partes",
  multiple: "Varios ejemplares",
  alternativa: "Una alternativa",
};

export function CasillaCard({
  casilla,
  aplica,
  esModelo = false,
  onToggleAplica,
}: {
  casilla: Casilla;
  aplica: boolean;
  esModelo?: boolean;
  onToggleAplica: () => void;
}) {
  const { documento, tipo_completitud, partes, cardinalidad, alternativas, notas } = casilla;

  return (
    <article
      className={
        "group relative flex aspect-square flex-col justify-between rounded-2xl border p-4 shadow-sm transition " +
        (aplica
          ? "border-black/5 bg-white ring-1 ring-black/[0.02] hover:-translate-y-0.5 hover:shadow-md"
          : "border-dashed border-black/10 bg-black/[0.02] opacity-55")
      }
    >
      {/* Toggle aplica / no aplica */}
      <button
        type="button"
        onClick={onToggleAplica}
        aria-pressed={aplica}
        title={aplica ? "Marcar como NO aplica" : "Marcar como aplica"}
        className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1.5"
      >
        <span
          className={
            "relative h-4 w-7 rounded-full transition " +
            (aplica ? "bg-lima" : "bg-carbon/20")
          }
        >
          <span
            className={
              "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all " +
              (aplica ? "left-3.5" : "left-0.5")
            }
          />
        </span>
        <span
          className={
            "text-[10px] font-semibold uppercase tracking-wide " +
            (aplica ? "text-lima-dark" : "text-carbon/35")
          }
        >
          {aplica ? "Aplica" : "No aplica"}
        </span>
      </button>

      <div className="pr-16">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-lima-dark">
            {ETIQUETA_TIPO[tipo_completitud]}
          </p>
          {esModelo && (
            <span className="rounded bg-carbon px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Modelo oficial
            </span>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-4 text-sm font-semibold leading-snug text-carbon">
          {documento}
        </h3>
      </div>

      <div className="mt-2 space-y-1 text-xs text-carbon/70">
        {tipo_completitud === "partes" && partes.length > 0 && (
          <ul className="space-y-0.5">
            {partes.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lima" />
                {p}
              </li>
            ))}
          </ul>
        )}

        {tipo_completitud === "multiple" && (
          <p className="inline-flex items-center rounded-full bg-lima-soft px-2 py-0.5 font-medium text-lima-dark">
            {cardinalidad} ejemplares
          </p>
        )}

        {tipo_completitud === "alternativa" && alternativas.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-carbon/40">Una de:</p>
            <ul className="space-y-0.5">
              {alternativas.map((a) => (
                <li key={a} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lima" />
                  <span className="line-clamp-2">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tipo_completitud === "simple" && notas && (
          <p className="line-clamp-3 text-carbon/50">{notas}</p>
        )}
      </div>
    </article>
  );
}
