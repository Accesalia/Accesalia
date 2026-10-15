"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionMarcarNecesidades } from "../../viabilidad-sin-polycam/acciones";
import { CAJA, ROT_CAJA } from "./estilo";
import { EscaneoPrevisto } from "./EscaneoPrevisto";

// LAS FASES QUE NO APLICAN (Monica, 15-oct-2026). Segun lo que dicen que
// quieren, la app decide si hace falta Polycam y viabilidad, y lo AVISA "por si
// acaso es una excepcion": "Como es Memoria valorada, no anoto que haya que hacer
// ni Polycam ni viabilidad... Si hay que cambiarlo, solo tienes que desmarcarlo
// aqui". Las dos casillas salen SIEMPRE, tambien cuando es automatico. Lo que se
// toca a mano ya no se recalcula solo; "volver a lo automatico" lo devuelve.

type N = { polycam: boolean; viabilidad: boolean; polycamAMano: boolean; viabilidadAMano: boolean; aviso: string | null; tresd?: boolean };

// QUE HACE FALTA PARA DARLES PRECIO: Polycam y viabilidad. Si necesita Polycam,
// se abre lo del escaneo (cuando, agendar, si ha llegado); si no, no sale
// (Monica, 15-oct-2026). Y debajo, cuando toca, el boton de pedir la viabilidad.
export function Necesidades({
  oppId,
  n,
  escaneo,
  recibido,
  pedir,
}: {
  oppId: string;
  n: N;
  /** La visita de escaneo apuntada, "AAAA-MM-DDTHH:MM" en hora de Madrid. */
  escaneo: string;
  recibido: boolean;
  /** El boton "Pedir viabilidad", cuando toca. */
  pedir?: React.ReactNode;
}) {
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
    <div className={CAJA + " px-3 py-2"}>
      <div className={ROT_CAJA}>Qué hace falta para darles precio</div>
      {n.aviso && <p className="mb-2 text-[13.5px] text-carbon/80">{n.aviso}</p>}
      <div className="flex flex-col gap-1.5">
        {casilla("polycam", "Necesita Polycam", n.polycamAMano)}
        {n.polycam && (
          <div className="ml-6 flex flex-wrap items-center gap-x-5 gap-y-1">
            <EscaneoPrevisto id={oppId} inicial={escaneo} />
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#8a8a8a]">Recibido</span>
              <span className={"text-[11.5px] " + (recibido ? "font-semibold text-lima-dark" : "text-[#8a8a8a]")}>{recibido ? "sí" : "todavía no ha llegado"}</span>
            </span>
          </div>
        )}
        {casilla("viabilidad", "Necesita viabilidad", n.viabilidadAMano)}
        {pedir && <div className="ml-6">{pedir}</div>}
      </div>
      {error && <p className="mt-1.5 text-[12px] text-alerta">{error}</p>}
    </div>
  );
}

/** ¿NECESITA 3D PARA LA JUNTA? (Monica, 15-oct-2026). Va aparte y PRIMERO: es lo
 *  que hay que marcar expresamente. No hace falta para dar precio sino para la
 *  junta; se decide antes de la viabilidad para que Alex diga cual encaja, y se
 *  usa en el bloque 3. Sin marcar = no. */
export function NecesitaTresD({ oppId, si }: { oppId: string; si: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  return (
    <div className={CAJA + " px-3 py-2"}>
      <div className={ROT_CAJA}>Para la junta</div>
      <label className="flex items-center gap-2 text-[13.5px] text-carbon">
        <input
          type="checkbox"
          checked={si}
          disabled={ocupado}
          onChange={(e) =>
            empezar(async () => {
              setError(null);
              const r = await accionMarcarNecesidades(oppId, { tresd: e.target.checked });
              if (!r.ok) setError(r.error);
              else router.refresh();
            })
          }
          className="h-4 w-4 accent-[#104269]"
        />
        Necesita 3D
      </label>
      <p className="mt-0.5 text-[11.5px] leading-snug text-carbon/55">Márcalo antes de la viabilidad: Alex dirá cuál encaja.</p>
      {error && <p className="mt-1 text-[12px] text-alerta">{error}</p>}
    </div>
  );
}
