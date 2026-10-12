"use client";

import { useState } from "react";
import { asignarAlerta, asignarVarias, descartarAlerta, descartarVarias, devolverAlMonton, recuperarAlerta } from "./acciones";
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
  const [abierto, setAbierto] = useState(false);

  // UN DESPLEGABLE PROPIO Y NO EL DEL NAVEGADOR (Monica, 10-oct-2026): "la letra
  // es tan pequeña que al darle a click se me va facil a otra linea". El
  // <select> nativo no deja cambiar ni el tamaño ni la separacion de sus
  // opciones (Chrome en Windows no hace caso), asi que cada comercial es un
  // boton grande, con aire entre uno y otro.
  return (
    <form
      action={asignarAlerta}
      onSubmit={() => {
        setMandando(true);
        setAbierto(false);
      }}
      className="relative flex shrink-0 items-center gap-2"
    >
      <input type="hidden" name="codigo" value={codigo} />
      <button
        type="button"
        disabled={mandando}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
        className="h-[32px] rounded-[8px] border border-black/25 bg-white px-3 text-[14px] text-carbon transition hover:border-carbon/50 disabled:opacity-50"
      >
        Asignar a… <span aria-hidden className="ml-1 text-carbon/60">▾</span>
      </button>
      {mandando && <span className="text-[13px] text-carbon/60">Enviando…</span>}

      {abierto && (
        <>
          {/* Pulsar fuera cierra, sin asignar nada. */}
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} aria-hidden />
          <div role="menu" className="absolute left-0 top-[36px] z-20 w-[220px] rounded-xl border border-black/15 bg-white p-1.5 shadow-lg">
            {comerciales.map((c) => (
              <button
                key={c.id}
                type="submit"
                name="comercial"
                value={c.id}
                role="menuitem"
                className="mb-1 block w-full rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold text-carbon transition last:mb-0 hover:bg-lima-soft"
              >
                {c.nombre}
                {c.correo ? "" : <span className="ml-1 text-[12px] font-normal text-carbon/60">(sin correo)</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="mt-1 block w-full rounded-lg border-t border-black/10 px-3 py-2 text-left text-[13px] text-carbon/60 hover:text-carbon"
            >
              cancelar
            </button>
          </div>
        </>
      )}
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

/** EN BLOQUE (Monica, 12-oct-2026): con un municipio elegido, seleccionar todas
 *  y asignarlas al mismo comercial o descartarlas a la vez. */
export function AccionesEnBloque({
  elegidas,
  posibles,
  comerciales,
  alMarcarTodas,
  alHacer,
}: {
  elegidas: string[];
  /** Las que se pueden repartir en lo que se ve. */
  posibles: string[];
  comerciales: ComercialAlQueAsignar[];
  alMarcarTodas: (todas: boolean) => void;
  alHacer: () => void;
}) {
  const [abierto, setAbierto] = useState<"asignar" | "descartar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = elegidas.length;
  const todas = n > 0 && n === posibles.length;

  const hacer = async (accion: () => Promise<{ ok: true; hechas: number } | { ok: false; error: string }>) => {
    setHaciendo(true);
    setError(null);
    const r = await accion();
    setHaciendo(false);
    if (r.ok) {
      setAbierto(null);
      setMotivo("");
      alHacer();
    } else setError(r.error);
  };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2">
      <button
        type="button"
        onClick={() => alMarcarTodas(!todas)}
        className="h-[32px] rounded-[8px] border border-black/25 bg-white px-3 text-[14px] font-semibold text-carbon transition hover:border-carbon/50"
      >
        {todas ? "Quitar la selección" : `Seleccionar todas (${posibles.length})`}
      </button>
      <span className="text-[13px] text-carbon/65">{n ? `${n} marcada${n === 1 ? "" : "s"}` : "Marca las que quieras, o todas"}</span>

      {n > 0 && (
        <div className="relative">
          <button
            type="button"
            disabled={haciendo}
            onClick={() => setAbierto(abierto === "asignar" ? null : "asignar")}
            className="h-[32px] rounded-[8px] bg-lima px-3 text-[14px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50"
          >
            Asignar las {n} a… <span aria-hidden className="ml-1">▾</span>
          </button>
          {abierto === "asignar" && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAbierto(null)} aria-hidden />
              <div role="menu" className="absolute left-0 top-[36px] z-20 w-[220px] rounded-xl border border-black/15 bg-white p-1.5 shadow-lg">
                {comerciales.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="menuitem"
                    disabled={haciendo}
                    onClick={() => hacer(() => asignarVarias(elegidas, c.id))}
                    className="mb-1 block w-full rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold text-carbon transition last:mb-0 hover:bg-lima-soft"
                  >
                    {c.nombre}
                    {c.correo ? "" : <span className="ml-1 text-[12px] font-normal text-carbon/60">(sin correo)</span>}
                  </button>
                ))}
                <button type="button" onClick={() => setAbierto(null)} className="mt-1 block w-full rounded-lg border-t border-black/10 px-3 py-2 text-left text-[13px] text-carbon/60 hover:text-carbon">
                  cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {n > 0 &&
        (abierto === "descartar" ? (
          <span className="flex items-center gap-1.5">
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
              autoFocus
              className="h-[30px] w-[170px] rounded-[6px] border border-black/20 bg-white px-2 text-[13px] text-carbon"
            />
            <button
              type="button"
              disabled={haciendo}
              onClick={() => hacer(() => descartarVarias(elegidas, motivo))}
              className="h-[30px] rounded-[6px] border border-carbon/30 bg-white px-2.5 text-[13px] font-semibold text-carbon transition hover:border-carbon disabled:opacity-50"
            >
              Descartar las {n}
            </button>
            <button type="button" onClick={() => setAbierto(null)} className="text-[12px] text-carbon/60 underline hover:text-carbon">
              cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={haciendo}
            onClick={() => setAbierto("descartar")}
            className="h-[32px] rounded-[8px] border border-black/25 bg-white px-3 text-[14px] text-carbon transition hover:border-carbon/50 disabled:opacity-50"
          >
            Descartar las {n}
          </button>
        ))}

      {haciendo && <span className="text-[13px] text-carbon/65">Haciendo…</span>}
      {error && <span className="text-[13px] font-semibold text-alerta">{error}</span>}
    </div>
  );
}
