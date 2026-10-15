"use client";

import { useRef, useState } from "react";
import { accionPatios } from "./acciones";

// LOS PATIOS, QUE SE MARCAN AQUI (Monica, 7-oct-2026: "no me deja marcar la
// casilla"). Lo que se guarda es un NUMERO -su maqueta pregunta "¿cuantos?"-:
//   No  -> 0 patios, y se guarda al pulsar;
//   Si  -> lleva al "¿cuantos?", porque un si sin numero no dice nada.
// El 0 es un dato (no tiene) y el vacio es otro (nadie los ha contado).

const BOT = (on: boolean) =>
  "rounded-[5px] border px-2 py-px text-[11.5px] transition " +
  (on ? "border-[#2b2b2b] bg-[#2b2b2b] font-bold text-white" : "border-[#bdbdbd] bg-white text-[#5a5a5a] hover:border-[#2b2b2b]");

export function Patios({
  referencia,
  id,
  patios,
  quien,
  cuando,
}: {
  referencia: string;
  id: string;
  patios: number | null;
  quien: string | null;
  cuando: string | null;
}) {
  const [si, setSi] = useState(patios !== null && patios > 0);
  const caja = useRef<HTMLInputElement>(null);
  const guardar = accionPatios.bind(null, referencia, id);

  // EN FILA (Monica, 15-oct-2026): "¿Tiene patios?" a la izquierda; Si / No,
  // "¿cuantos?" y quien los conto, a la derecha.
  return (
    <form action={guardar} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
      <div className="pt-px text-[12.5px] font-bold text-[#14781E]">¿Tiene patios?</div>
      <div className="text-center">
        <div className="flex items-baseline justify-center gap-[5px] text-[12px]">
          <button
            type="button"
            className={BOT(si)}
            onClick={() => {
              setSi(true);
              caja.current?.focus();
            }}
          >
            Sí
          </button>
          {/* "No" se guarda tal cual: 0 patios. */}
          <button type="submit" name="patios" value="0" formNoValidate className={BOT(patios === 0 && !si)} onClick={() => setSi(false)}>
            No
          </button>
        </div>
        {si && (
          <div className="mt-[4px] flex items-baseline justify-center gap-x-1.5 text-[11.5px]">
            <span className="text-[#8a8a8a]">¿cuántos?</span>
            <input
              ref={caja}
              name="patios"
              type="number"
              min={1}
              max={99}
              defaultValue={patios && patios > 0 ? patios : ""}
              aria-label="Cuántos patios tiene"
              className="w-[38px] rounded-[5px] border border-[#bdbdbd] bg-white px-1 py-px text-center text-[11.5px] text-carbon outline-none focus:border-lima"
            />
            <button type="submit" className="text-[11px] font-semibold text-[#14781E] hover:underline">
              guardar
            </button>
          </div>
        )}
        <p className="mt-[3px] text-[11px] leading-[1.3] text-[#8a8a8a]">
          {quien ? (
            <>
              {quien}
              {cuando && (
                <>
                  {" "}
                  el {cuando.slice(8, 10)}/{cuando.slice(5, 7)}
                </>
              )}
            </>
          ) : (
            "sin mirar"
          )}
        </p>
      </div>
    </form>
  );
}
