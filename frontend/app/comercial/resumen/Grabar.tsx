"use client";

import { useState, useTransition } from "react";
import { accionGrabarDesdeResumen } from "./acciones";

// EL BOTON GRABAR DE CADA LINEA: se abre ahi mismo, se escribe lo que ha pasado
// en la llamada y se guarda en el diario de la opp, sin salir de la lista.
const CANALES = [
  { valor: "llamada", texto: "Llamada" },
  { valor: "mail", texto: "Correo" },
  { valor: "visita", texto: "Visita" },
  { valor: "escrito", texto: "Escrito" },
];

export function Grabar({ oppId }: { oppId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  if (hecho) return <span className="text-[12px] font-semibold text-lima-dark">grabado ✓</span>;
  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-md border border-carbon/25 bg-white px-2.5 py-1 text-[12px] font-semibold text-carbon/75 transition hover:border-carbon/60"
      >
        Grabar
      </button>
    );
  return (
    <form
      action={(fd) =>
        empezar(async () => {
          setError(null);
          const r = await accionGrabarDesdeResumen(oppId, fd);
          if (r.ok) setHecho(true);
          else setError(r.error);
        })
      }
      className="flex w-full flex-col gap-1.5"
    >
      <textarea
        name="texto"
        rows={2}
        autoFocus
        required
        placeholder="Qué ha pasado: con quién hablaste y qué te dijo"
        className="w-full resize-y rounded-md border border-carbon/25 px-2 py-1 text-[13px] text-carbon outline-none focus:border-carbon/60"
      />
      <div className="flex items-center gap-1.5">
        <select name="canal" defaultValue="llamada" className="rounded-md border border-carbon/25 bg-white px-1.5 py-1 text-[12px]">
          {CANALES.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.texto}
            </option>
          ))}
        </select>
        <button disabled={ocupado} className="rounded-md bg-carbon px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-50">
          {ocupado ? "Grabando…" : "Guardar"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-[12px] text-carbon/55 hover:text-carbon">
          cancelar
        </button>
      </div>
      {error && <span className="text-[12px] text-alerta">{error}</span>}
    </form>
  );
}
