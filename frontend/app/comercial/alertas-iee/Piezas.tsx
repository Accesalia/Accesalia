"use client";

import { useState } from "react";
import { asignarAlerta, descartarAlerta, devolverAlMonton, recuperarAlerta } from "./acciones";
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
      {/* Sin rotulo aparte: va dentro de una tabla y la etiqueta suelta
          ensancharia la columna. La primera opcion dice lo que hace. */}
      <select
        id={`asignar-${codigo}`}
        name="comercial"
        aria-label="Asignar a un comercial"
        required
        disabled={mandando}
        defaultValue=""
        className="h-[28px] rounded-[6px] border border-black/20 bg-white px-2 text-[12px] text-carbon"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="" disabled>
          Asignar a…
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

/** DESCARTAR (Monica, 10-oct-2026). Dos gestos: se abre, se escribe un motivo
 *  si se quiere, y se confirma. Uno solo seria facil de pulsar sin querer. */
export function Descartar({ codigo }: { codigo: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-[12px] font-semibold text-carbon/45 underline transition hover:text-carbon"
      >
        descartar
      </button>
    );
  return (
    <form action={descartarAlerta} className="flex items-center gap-1.5">
      <input type="hidden" name="codigo" value={codigo} />
      <input
        name="motivo"
        placeholder="Motivo (opcional)"
        autoFocus
        className="h-[28px] w-[150px] rounded-[6px] border border-black/20 bg-white px-2 text-[12px] text-carbon"
      />
      <button
        type="submit"
        className="h-[28px] rounded-[6px] border border-carbon/30 bg-white px-2 text-[12px] font-semibold text-carbon transition hover:border-carbon"
      >
        Descartar
      </button>
      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="text-[12px] text-carbon/45 underline hover:text-carbon"
      >
        cancelar
      </button>
    </form>
  );
}

/** La salida de un descarte. */
export function Recuperar({ codigo }: { codigo: string }) {
  return (
    <form action={recuperarAlerta}>
      <input type="hidden" name="codigo" value={codigo} />
      <button type="submit" className="text-[12px] font-semibold text-carbon/45 underline transition hover:text-carbon">
        recuperar
      </button>
    </form>
  );
}
