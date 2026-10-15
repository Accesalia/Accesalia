"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionMarcarNecesidades } from "../../viabilidad-sin-polycam/acciones";
import { CAJA, ROT_CAJA } from "./estilo";

// LAS FASES QUE NO APLICAN (Monica, 15-oct-2026). Segun lo que dicen que
// quieren, la app decide si hace falta Polycam y viabilidad, y lo AVISA "por si
// acaso es una excepcion": "Como es Memoria valorada, no anoto que haya que hacer
// ni Polycam ni viabilidad... Si hay que cambiarlo, solo tienes que desmarcarlo
// aqui". Las dos casillas salen SIEMPRE, tambien cuando es automatico. Lo que se
// toca a mano ya no se recalcula solo; "volver a lo automatico" lo devuelve.

type N = { polycam: boolean; viabilidad: boolean; polycamAMano: boolean; viabilidadAMano: boolean; aviso: string | null };

export function Necesidades({ oppId, n }: { oppId: string; n: N }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const marcar = (d: { polycam?: boolean | null; viabilidad?: boolean | null }) =>
    empezar(async () => {
      setError(null);
      const r = await accionMarcarNecesidades(oppId, d);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const casilla = (que: "polycam" | "viabilidad", texto: string, aMano: boolean) => (
    <label className="flex items-center gap-2 text-[13.5px] text-carbon">
      <input
        type="checkbox"
        checked={n[que]}
        disabled={ocupado}
        onChange={(e) => marcar({ [que]: e.target.checked })}
        className="h-4 w-4 accent-[#104269]"
      />
      {texto}
      <span className="text-[11.5px] text-carbon/50">
        {aMano ? (
          <>
            · marcado a mano ·{" "}
            <button type="button" disabled={ocupado} onClick={() => marcar({ [que]: null })} className="underline hover:text-carbon">
              volver a lo automático
            </button>
          </>
        ) : (
          "· automático, según lo que quieren"
        )}
      </span>
    </label>
  );

  return (
    <div className={CAJA + " mb-[10px] px-3 py-2"}>
      <div className={ROT_CAJA}>Qué hace falta antes de darles precio</div>
      {n.aviso && <p className="mb-2 text-[13.5px] text-carbon/80">{n.aviso}</p>}
      <div className="flex flex-wrap gap-x-8 gap-y-1.5">
        {casilla("polycam", "Necesita Polycam", n.polycamAMano)}
        {casilla("viabilidad", "Necesita viabilidad", n.viabilidadAMano)}
      </div>
      {error && <p className="mt-1.5 text-[12px] text-alerta">{error}</p>}
    </div>
  );
}
