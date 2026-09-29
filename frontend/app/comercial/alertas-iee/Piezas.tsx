"use client";

import { useState } from "react";
import { asignarAlerta, devolverAlMonton } from "./acciones";
import type { ComercialAlQueAsignar } from "../../../lib/alertasIEE";

// LAS PIEZAS QUE NECESITAN RATON.
//
// "Que al lado de cada botón, además del link, haya un botón con 'asignar a' y
// seleccionar un comercial" (Monica). Un solo gesto: se elige y se manda, sin
// un segundo boton de confirmar que solo añade un clic.

export function Asignador({
  codigo,
  comerciales,
}: {
  codigo: string;
  comerciales: ComercialAlQueAsignar[];
}) {
  const [mandando, setMandando] = useState(false);

  return (
    <form
      action={asignarAlerta}
      onSubmit={() => setMandando(true)}
      className="flex shrink-0 items-center gap-2"
    >
      <input type="hidden" name="codigo" value={codigo} />
      <label className="text-[12px] font-semibold text-carbon/55" htmlFor={`asignar-${codigo}`}>
        Asignar a
      </label>
      <select
        id={`asignar-${codigo}`}
        name="comercial"
        required
        disabled={mandando}
        defaultValue=""
        className="h-[32px] rounded-[6px] border border-black/20 bg-white px-2 text-[13px] text-carbon"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="" disabled>
          Elegir…
        </option>
        {comerciales.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
            {c.correo ? "" : " (sin correo)"}
          </option>
        ))}
      </select>
      {mandando && <span className="text-[12px] text-carbon/45">Enviando…</span>}
    </form>
  );
}

/** Toda pantalla necesita salida: si se asigna a quien no era, se deshace. */
export function VolverAlMonton({ codigo }: { codigo: string }) {
  return (
    <form action={devolverAlMonton}>
      <input type="hidden" name="codigo" value={codigo} />
      <button
        type="submit"
        className="text-[12px] font-semibold text-carbon/45 underline transition hover:text-carbon"
      >
        deshacer
      </button>
    </form>
  );
}
