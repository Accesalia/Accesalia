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
export const PASTILLA_PEDIR = PASTILLA + " bg-[#6b2135] transition hover:bg-[#52192a]";
const ROT_TIRA = "text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/60";

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

  // LA VIABILIDAD, UNA DE TRES (Monica, 29-oct-2026, su maqueta «ejemplo barra 3d y viabilidad»): no hace falta, con
  // Polycam o sin Polycam. Siempre las tres, para poder cambiar. Debajo, el flujo de la elegida: lo hecho en gris con
  // su ✓, lo que toca resaltado, lo que falta en gris claro. Con Polycam empieza en «falta hacer y enviar el Polycam»;
  // sin Polycam, en «pedir al arquitecto»; los dos acaban en la viabilidad recibida.
  const opcion: "no" | "con" | "sin" = !n.viabilidad ? "no" : n.polycam ? "con" : "sin";
  const elegir = (o: "no" | "con" | "sin") =>
    marcar(o === "no" ? { viabilidad: false, polycam: false } : o === "con" ? { viabilidad: true, polycam: true } : { viabilidad: true, polycam: false });
  type Paso = { texto: React.ReactNode; hecho: boolean };
  const recibida = viabilidad ? (
    <Link href={viabilidad.href} title={viabilidad.rotulo} className="underline-offset-2 hover:underline">
      Recibida la viabilidad
    </Link>
  ) : (
    "Recibida la viabilidad"
  );
  const flujo: Paso[] =
    opcion === "con"
      ? [
          {
            texto:
              polycamRecibido === null ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  Falta hacer y enviar el Polycam
                  <EscaneoPrevisto id={oppId} inicial={escaneo} compacto />
                </span>
              ) : (
                "Polycam hecho y enviado"
              ),
            hecho: polycamRecibido !== null,
          },
          { texto: polycamRecibido ? `Recibido el Polycam ${corta(polycamRecibido)}` : "Recibido el Polycam", hecho: polycamRecibido !== null && viabilidadRecibida },
          { texto: recibida, hecho: false },
        ]
      : opcion === "sin"
        ? [
            { texto: pedir ?? "Pedida al arquitecto", hecho: !pedir },
            { texto: "Pendiente del arquitecto", hecho: viabilidadRecibida },
            { texto: recibida, hecho: false },
          ]
        : [];
  // El paso en que esta: el primero sin hacer (si ha llegado la viabilidad, el ultimo).
  const actual = viabilidadRecibida && opcion !== "no" ? flujo.length - 1 : flujo.findIndex((x) => !x.hecho);
  const RADIO = "flex items-center gap-1.5 whitespace-nowrap";

  return (
    <div className="rounded-[8px] border border-[#efe4c8] bg-[#fffcf4] px-3.5 py-1.5 text-[13px] text-carbon">
      <div className="grid gap-y-2 md:grid-cols-[auto_minmax(0,1fr)]">
        {/* ¿NECESITA 3D PARA LA JUNTA? Aparte y primero: se marca antes de la viabilidad para que Alex diga cual encaja. */}
        <div className="pr-5" title="Para la junta. Márcalo antes de la viabilidad: Alex dirá cuál encaja.">
          <div className={ROT_TIRA}>3D</div>
          <label className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
            <input type="checkbox" checked={n.tresd ?? false} disabled={ocupado} onChange={(e) => marcar({ tresd: e.target.checked })} className={CASILLA} />
            Necesita 3D
          </label>
        </div>
        <div className="min-w-0 md:border-l-2 md:border-[#6b6255] md:pl-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className={ROT_TIRA}>Viabilidad</span>
            {(
              [
                ["no", "No hace falta"],
                ["con", "Con Polycam"],
                ["sin", "Sin Polycam"],
              ] as const
            ).map(([k, t]) => (
              <label key={k} className={RADIO}>
                <input type="radio" name={`viab-${oppId}`} checked={opcion === k} disabled={ocupado} onChange={() => elegir(k)} className={CASILLA} />
                {t}
              </label>
            ))}
          </div>
          <div className="mt-1 flex min-h-[24px] flex-wrap items-center gap-1 text-[12px]">
            {opcion === "no" ? (
              <span className="text-carbon/60">Ni Polycam ni viabilidad: se pasa directamente a darles precio.</span>
            ) : (
              flujo.map((x, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-carbon/30">›</span>}
                  <span
                    className={
                      "whitespace-nowrap rounded-full px-2 py-px " +
                      (i < actual || x.hecho
                        ? "text-carbon/55"
                        : i === actual
                          ? i === flujo.length - 1
                            ? "bg-[#3c6b2a] font-bold text-white"
                            : "font-bold text-carbon ring-1 ring-carbon/25"
                          : "text-carbon/35")
                    }
                  >
                    {(i < actual || x.hecho) && "✓ "}
                    {x.texto}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
      {(n.aviso || error) && (
        <div className="mt-1 border-t border-carbon/10 pt-1 text-[12px]">
          {n.aviso && <span className="text-carbon/75">{n.aviso}</span>}
          {error && <span className="ml-2 text-alerta">{error}</span>}
        </div>
      )}
    </div>
  );
}
