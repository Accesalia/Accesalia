"use client";

import { useEffect, useMemo, useState } from "react";
import type { Casilla, GrupoFase } from "@/lib/datos";
import { CasillaCard } from "./CasillaCard";

// Grid con 4 pestañas (Todo / Solicitud / Justificación / Otros), toggle
// aplica/no aplica por casilla y filtro "ver solo lo que aplica".
//
// OJO: la marca aplica/no aplica se guarda de momento en localStorage (prototipo
// de la interacción). El siguiente paso es persistirla en BD y consolidarla como
// plantilla validada por convocatoria. La UI es la misma: solo cambia el backend.

type Pestana = "todo" | "modelos" | GrupoFase;

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: "todo", etiqueta: "Todo" },
  { id: "solicitud", etiqueta: "Solicitud" },
  { id: "justificacion", etiqueta: "Justificación" },
  { id: "otros", etiqueta: "Otros" },
  { id: "modelos", etiqueta: "Modelos" },
];

function claveCasilla(c: Casilla, i: number): string {
  return `${i}::${c.documento}`;
}

// Modelos oficiales de la convocatoria: "MODELO I", "Modelo VII"... (anexos
// numerados en romanos). Eje transversal: cruzan solicitud y justificacion.
function esModelo(c: Casilla): boolean {
  return /\bmodelos?\s+[ivxlcdm]+\b/i.test(c.documento);
}

// Predicado de pertenencia a una pestaña.
function enPestana(c: Casilla, p: Pestana): boolean {
  if (p === "todo") return true;
  if (p === "modelos") return esModelo(c);
  return c.grupo === p;
}

export function GridCasillas({
  casillas,
  convocatoriaId,
}: {
  casillas: Casilla[];
  convocatoriaId: string;
}) {
  const [pestana, setPestana] = useState<Pestana>("todo");
  const [soloAplica, setSoloAplica] = useState(false);
  const [aplicaMap, setAplicaMap] = useState<Record<string, boolean>>({});

  const storageKey = `accesalia:aplica:${convocatoriaId}`;

  // Cargar marcas guardadas (solo cliente).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setAplicaMap(JSON.parse(raw));
    } catch {
      /* ignorar */
    }
  }, [storageKey]);

  const aplicaDe = (key: string) => aplicaMap[key] ?? true; // por defecto aplica

  const toggle = (key: string) => {
    setAplicaMap((prev) => {
      const next = { ...prev, [key]: !(prev[key] ?? true) };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignorar */
      }
      return next;
    });
  };

  // Casillas de la pestaña activa.
  const deLaPestana = useMemo(
    () =>
      casillas
        .map((c, i) => ({ c, key: claveCasilla(c, i) }))
        .filter(({ c }) => enPestana(c, pestana)),
    [casillas, pestana],
  );

  const visibles = soloAplica
    ? deLaPestana.filter(({ key }) => aplicaDe(key))
    : deLaPestana;

  // Conteos por pestaña (total y "aplican").
  const conteo = (p: Pestana) => {
    const items = casillas
      .map((c, i) => ({ c, key: claveCasilla(c, i) }))
      .filter(({ c }) => enPestana(c, p));
    const aplican = items.filter(({ key }) => aplicaDe(key)).length;
    return { total: items.length, aplican };
  };

  const totalAplican = conteo("todo").aplican;

  return (
    <div>
      {/* Barra de pestañas + filtro */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-3">
        <div className="flex flex-wrap gap-1">
          {PESTANAS.map((p) => {
            const { total } = conteo(p.id);
            const activa = pestana === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPestana(p.id)}
                className={
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition " +
                  (activa
                    ? "bg-carbon text-white"
                    : "text-carbon/60 hover:bg-black/5")
                }
              >
                {p.etiqueta}
                <span className={"ml-1.5 text-xs " + (activa ? "text-white/60" : "text-carbon/35")}>
                  {total}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSoloAplica((v) => !v)}
          aria-pressed={soloAplica}
          className={
            "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition " +
            (soloAplica
              ? "border-lima bg-lima text-carbon"
              : "border-black/10 text-carbon/70 hover:border-lima hover:text-lima-dark")
          }
        >
          <span
            className={
              "relative h-4 w-7 rounded-full transition " +
              (soloAplica ? "bg-carbon/80" : "bg-carbon/20")
            }
          >
            <span
              className={
                "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all " +
                (soloAplica ? "left-3.5" : "left-0.5")
              }
            />
          </span>
          Ver solo lo que aplica
        </button>
      </div>

      {/* Resumen */}
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-carbon">Documentación</h2>
        <span className="text-sm text-carbon/50">
          {visibles.length} en vista · {totalAplican} de {casillas.length} aplican
        </span>
      </div>

      {/* Grid */}
      {visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/10 p-8 text-center text-carbon/50">
          No hay documentos en esta vista.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {visibles.map(({ c, key }) => (
            <CasillaCard
              key={key}
              casilla={c}
              aplica={aplicaDe(key)}
              esModelo={esModelo(c)}
              onToggleAplica={() => toggle(key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
