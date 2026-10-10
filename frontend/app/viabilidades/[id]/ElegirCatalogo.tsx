"use client";

import { useEffect, useState } from "react";
import type { Mesa } from "../../../lib/mesaViabilidades";

// ELEGIR EL 3D DEL CATALOGO (Monica, 10-oct-2026, lo que pidio Alex): "no le
// basta el nombre, necesita ver el modelo que es, al menos una miniatura, y en
// caso de duda un boton para entrar a ver en detalle ese modelo 3D, y luego
// volver". El detalle se abre ENCIMA de la mesa y no en otra pagina: al volver,
// lo que Alex llevaba escrito sigue ahi.

type Modelo = Mesa["catalogo"][number];

const ver =
  "inline-flex h-[26px] items-center justify-center rounded-[7px] border border-ajeno/40 bg-ajeno-soft px-2.5 text-[11px] font-bold uppercase tracking-wide text-[#3f5f80] transition hover:bg-[#dde7f1]";

export function ElegirCatalogo({ catalogo, valor, cambiar }: { catalogo: Modelo[]; valor: string; cambiar: (id: string) => void }) {
  const [detalle, setDetalle] = useState<Modelo | null>(null);
  // Elegido uno, la lista se recoge y queda solo ese, con "Cambiar".
  const [abierta, setAbierta] = useState(!valor);
  const elegido = catalogo.find((c) => c.id === valor) ?? null;
  const lista = abierta || !elegido ? catalogo : [elegido];

  return (
    <>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {lista.map((c) => {
          const es = c.id === valor;
          return (
            <div
              key={c.id}
              className={
                "flex flex-col overflow-hidden rounded-[10px] border bg-white transition " +
                (es ? "border-[#3f5f80] ring-2 ring-ajeno/40" : "border-carbon/20 hover:border-carbon/40")
              }
            >
              <button
                type="button"
                onClick={() => {
                  cambiar(c.id);
                  setAbierta(false);
                }}
                title={`Elegir ${c.codigo}`}
                className="block bg-white p-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.miniatura} alt={c.nombre} loading="lazy" className="h-[110px] w-full object-contain" />
              </button>
              <div className="flex items-center justify-between gap-1 border-t border-black/[0.06] px-2 py-1.5">
                <span className={"text-[12px] " + (es ? "font-bold text-[#3f5f80]" : "font-semibold text-carbon/80")}>
                  {es ? "✓ " : ""}
                  {c.codigo}
                </span>
                <button type="button" onClick={() => setDetalle(c)} className={ver}>
                  Ver detalle
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {elegido && !abierta && (
        <button type="button" onClick={() => setAbierta(true)} className="mt-1.5 text-[12px] font-semibold text-[#3f5f80] hover:underline">
          Cambiar de modelo
        </button>
      )}

      {detalle && (
        <Detalle
          c={detalle}
          elegido={detalle.id === valor}
          elegir={() => {
            cambiar(detalle.id);
            setAbierta(false);
            setDetalle(null);
          }}
          volver={() => setDetalle(null)}
        />
      )}
    </>
  );
}

function Detalle({ c, elegido, elegir, volver }: { c: Modelo; elegido: boolean; elegir: () => void; volver: () => void }) {
  const [imagen, setImagen] = useState<string | null>(null);

  // Escape vuelve, como el boton.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && (imagen ? setImagen(null) : volver());
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [imagen, volver]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-carbon/60 p-4" onClick={volver}>
      <div className="mx-auto max-w-[1100px] rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={volver} className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
            ← Volver a la viabilidad
          </button>
          <div className="flex flex-wrap gap-2">
            {c.plano && (
              <a href={c.plano} target="_blank" rel="noreferrer" className={ver}>
                Ver el plano
              </a>
            )}
            <button
              type="button"
              onClick={elegir}
              disabled={elegido}
              className="inline-flex h-[30px] items-center rounded-[8px] bg-lima px-4 text-[13px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-60"
            >
              {elegido ? "✓ Es el elegido" : `Elegir ${c.codigo}`}
            </button>
          </div>
        </div>

        <h2 className="mt-3 text-[20px] font-bold text-carbon">
          {c.codigo} · {c.nombre}
        </h2>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_300px]">
          <div className="relative h-[520px] overflow-hidden rounded-xl border border-ajeno/30 bg-[#fffaf0]">
            {/* @ts-expect-error: model-viewer es un elemento web, no de React */}
            <model-viewer src={c.modelo} camera-controls="" shadow-intensity="1" style={{ width: "100%", height: "100%", background: "transparent" }} />
            <span className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-carbon/50">
              Arrastra para girar · rueda para acercar · la primera vez tarda unos segundos
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.miniatura} alt={`Planta y sección de ${c.codigo}`} className="w-full rounded-xl border border-black/5 object-contain" />
        </div>

        {c.imagenes.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {c.imagenes.map((u) => (
              <button key={u} type="button" onClick={() => setImagen(u)} className="overflow-hidden rounded-lg border border-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition hover:scale-105" />
              </button>
            ))}
          </div>
        )}
      </div>

      {imagen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={(e) => { e.stopPropagation(); setImagen(null); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagen} alt="" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
