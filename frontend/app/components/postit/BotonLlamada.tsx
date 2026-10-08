"use client";

import { EVENTO_LISTA, EVENTO_NUEVA } from "./Postits";

// El boton de la barra de arriba (Monica, 8-oct-2026): "un boton grande,
// visible". LLAMADA pone un postit nuevo delante; al lado, los mios.
export function BotonLlamada() {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(EVENTO_NUEVA))}
        className="inline-flex items-center gap-2 rounded-full border-2 border-lima bg-white px-5 py-2 text-base font-bold tracking-wide text-carbon transition hover:bg-lima"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        LLAMADA
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(EVENTO_LISTA))}
        className="rounded-full border border-white/25 px-3 py-2 text-sm text-white/85 transition hover:border-lima hover:text-white"
      >
        Mis llamadas
      </button>
    </div>
  );
}
