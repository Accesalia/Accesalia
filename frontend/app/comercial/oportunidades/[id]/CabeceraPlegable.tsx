"use client";

import { useState } from "react";

// LA CABECERA PLEGADA (Monica, 16-oct-2026, "reducir espacios"): arriba solo la
// tira con lo que se mira siempre; "Ver completa" abre lo de siempre (el cuadro
// gris, Sali, los contactos), con el texto a la vista para que se sepa que esta.
export function CabeceraPlegable({
  izquierda,
  caja,
  panel,
}: {
  /** El codigo, el nombre de la opp y lo que quieren: sobre el verde, sin caja. */
  izquierda: React.ReactNode;
  /** Pendientes de y el admin, en su cajita blanca. */
  caja: React.ReactNode;
  /** Lo que se abre. */
  panel: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {izquierda}
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] bg-white px-2.5 py-1">
          {caja}
          <button
            type="button"
            onClick={() => setAbierta((x) => !x)}
            aria-expanded={abierta}
            className="whitespace-nowrap rounded-md border border-carbon/25 px-2 py-0.5 text-[11px] font-semibold text-carbon/70 transition hover:border-carbon/60 hover:text-carbon"
          >
            {abierta ? "▴ Plegar" : "▾ Ver completa"}
          </button>
        </div>
      </div>
      {abierta && <div className="mt-2">{panel}</div>}
    </>
  );
}
