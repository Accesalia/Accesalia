"use client";

import { useState } from "react";

// LA CABECERA PLEGADA (Monica, 16-oct-2026, "reducir espacios"): arriba solo la
// tira con lo que se mira siempre; "Ver completa" abre lo de siempre (el cuadro
// gris, Sali, los contactos), con el texto a la vista para que se sepa que esta.
export function CabeceraPlegable({
  izquierda,
  ir,
  caja,
  panel,
}: {
  /** El codigo, el nombre de la opp y lo que quieren: sobre el verde, sin caja. */
  izquierda: React.ReactNode;
  /** Ir a otra opp: pegado a la cajita de la derecha (Monica, 16-oct-2026). */
  ir?: React.ReactNode;
  /** Pendientes de y el admin, en su cajita blanca. */
  caja: React.ReactNode;
  /** Lo que se abre. */
  panel: React.ReactNode;
}) {
  // Al entrar, DESPLEGADA (Monica, 27-oct-2026: «ahora que las cards se pliegan»); se sigue pudiendo plegar.
  const [abierta, setAbierta] = useState(true);
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {izquierda}
        <div className="ml-auto flex min-w-0 items-center gap-2">
        {ir}
        {/* MELOCOTON QUE LLEGA AL BLANCO (Monica, 29-oct-2026: «darle algo de color y degradado, como el menu principal,
            para destacarlo de las demas cards; algo discreto»): el velo de las tarjetas del menu, en melocoton. */}
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] border border-[#f3c3a0] px-2.5 py-1"
          style={{ background: "linear-gradient(100deg, #ffd3b4 0%, #ffe6d4 30%, #ffffff 75%)" }}
        >
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
      </div>
      {abierta && <div className="mt-2">{panel}</div>}
    </>
  );
}
