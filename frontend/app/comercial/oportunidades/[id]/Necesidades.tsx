"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionMarcarNecesidades } from "../../viabilidad-sin-polycam/acciones";
import { EscaneoPrevisto } from "./EscaneoPrevisto";

// LAS FASES QUE NO APLICAN (Monica, 15-oct-2026). Segun lo que dicen que
// quieren, la app decide si hace falta Polycam y viabilidad, y lo AVISA "por si
// acaso es una excepcion": "Como es Memoria valorada, no anoto que haya que hacer
// ni Polycam ni viabilidad... Si hay que cambiarlo, solo tienes que desmarcarlo
// aqui". Las casillas salen SIEMPRE, tambien cuando es automatico. Lo que se
// toca a mano ya no se recalcula solo; "volver a lo automatico" lo devuelve.
//
// EN UNA TIRA (Monica, 16-oct-2026, su maqueta "propuesta tira 3d polycam y
// demas" y "reducir espacios"): las tres cajas de arriba del bloque 1 pasan a
// una sola linea en crema, partida en sus tres areas -3D, Polycam, viabilidad-.
// Lo que toca hacer va en pastilla: "Pedir al arquitecto" en granate; lo que ya
// ha llegado, en verde ("Recibido Polycam", "Recibida viabilidad").

type N = { polycam: boolean; viabilidad: boolean; polycamAMano: boolean; viabilidadAMano: boolean; aviso: string | null; tresd?: boolean };

const PASTILLA = "whitespace-nowrap rounded-full px-3 py-[3px] text-[9.5px] font-bold uppercase tracking-wide text-white";
export const PASTILLA_PEDIR = PASTILLA + " bg-[#7a2a26] transition hover:bg-[#5e1f1c]";
const LLEGADO = PASTILLA + " bg-[#3c6b2a]";
const AREA = "flex min-w-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-1 px-2";

/** dd/mm/aa */
const corta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`;

export function TiraBloque1({
  oppId,
  n,
  escaneo,
  polycamRecibido,
  viabilidadRecibida,
  viabilidad,
  pedir,
}: {
  oppId: string;
  n: N;
  /** La visita de escaneo apuntada, "AAAA-MM-DDTHH:MM" en hora de Madrid. */
  escaneo: string;
  /** El Polycam, si ha llegado: la fecha (o "" si llego sin fecha). null, si no. */
  polycamRecibido: string | null;
  /** Si el arquitecto ya definio la viabilidad. */
  viabilidadRecibida: boolean;
  /** El documento de viabilidad, si lo hay: a el lleva su pastilla. */
  viabilidad: { href: string; rotulo: string } | null;
  /** El boton "Pedir al arquitecto", cuando toca. */
  pedir?: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const marcar = (d: { polycam?: boolean | null; viabilidad?: boolean | null; tresd?: boolean | null }) =>
    empezar(async () => {
      setError(null);
      const r = await accionMarcarNecesidades(oppId, d);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const CASILLA = "h-4 w-4 accent-[#104269]";
  /** Automatico o a mano, en pequeño: el detalle, al pasar por encima. */
  const como = (que: "polycam" | "viabilidad", aMano: boolean) =>
    aMano ? (
      <span className="text-[10.5px] text-carbon/50">
        a mano ·{" "}
        <button type="button" disabled={ocupado} onClick={() => marcar({ [que]: null })} className="underline hover:text-carbon">
          volver a lo automático
        </button>
      </span>
    ) : (
      <span title="Automático, según lo que quieren. Si es una excepción, cámbialo aquí." className="cursor-help text-[10.5px] text-carbon/40">
        (auto)
      </span>
    );

  return (
    <div className="rounded-[8px] bg-[#f6ecd2] py-1.5 text-[13px] text-carbon">
      <div className="grid items-center gap-y-1.5 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,2.8fr)_minmax(0,1.6fr)]">
        {/* ¿NECESITA 3D PARA LA JUNTA? Va aparte y PRIMERO: es lo que hay que marcar
            expresamente, antes de la viabilidad para que Alex diga cual encaja.
            Sin marcar = no. */}
        <label className={AREA} title="Para la junta. Márcalo antes de la viabilidad: Alex dirá cuál encaja.">
          <span className="flex items-center gap-1.5">
            <input type="checkbox" checked={n.tresd ?? false} disabled={ocupado} onChange={(e) => marcar({ tresd: e.target.checked })} className={CASILLA} />
            Necesita 3D
          </span>
        </label>

        {/* EL POLYCAM: si hace falta, la visita de escaneo hasta que llega. */}
        <div className={AREA + " lg:border-l lg:border-carbon/30"}>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={n.polycam} disabled={ocupado} onChange={(e) => marcar({ polycam: e.target.checked })} className={CASILLA} />
            Necesita Polycam
          </label>
          {como("polycam", n.polycamAMano)}
          {n.polycam &&
            (polycamRecibido !== null ? (
              <span className="flex items-center gap-1.5">
                <span className={LLEGADO}>Recibido Polycam</span>
                {polycamRecibido && <span className="text-[11.5px] tabular-nums text-carbon/60">{corta(polycamRecibido)}</span>}
              </span>
            ) : (
              <span className="flex flex-wrap items-center gap-1.5">
                <EscaneoPrevisto id={oppId} inicial={escaneo} compacto />
                <span className="text-[11.5px] text-carbon/60">
                  · recibido: <span className="text-carbon/45">todavía no</span>
                </span>
              </span>
            ))}
        </div>

        {/* LA VIABILIDAD: pedirla, o lo que ya ha llegado. */}
        <div className={AREA + " lg:border-l lg:border-carbon/30"}>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={n.viabilidad} disabled={ocupado} onChange={(e) => marcar({ viabilidad: e.target.checked })} className={CASILLA} />
            Necesita viabilidad
          </label>
          {como("viabilidad", n.viabilidadAMano)}
          {n.viabilidad &&
            (viabilidadRecibida ? (
              viabilidad ? (
                <Link href={viabilidad.href} title={viabilidad.rotulo} className={LLEGADO + " hover:bg-[#2f5621]"}>
                  Recibida viabilidad →
                </Link>
              ) : (
                <span className={LLEGADO}>Recibida viabilidad</span>
              )
            ) : (
              pedir ??
              (viabilidad && (
                <Link href={viabilidad.href} className="whitespace-nowrap text-[11.5px] font-semibold text-carbon/70 underline hover:text-carbon">
                  {viabilidad.rotulo} →
                </Link>
              ))
            ))}
        </div>
      </div>
      {(n.aviso || error) && (
        <div className="mt-1 border-t border-carbon/10 px-3 pt-1 text-[12px]">
          {n.aviso && <span className="text-carbon/75">{n.aviso}</span>}
          {error && <span className="ml-2 text-alerta">{error}</span>}
        </div>
      )}
    </div>
  );
}
