"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionGuardarEscaneo } from "../../../agenda/acciones";

// LA VISITA DE ESCANEO (14-oct-2026). Es una cita de la agenda (tabla `citas`,
// tipo escaneo_polycam, una por opp): la crea o la mueve la accion de la agenda,
// y sale en la agenda de su comercial. Con la fecha puesta, la cabecera pasa de
// "cerrar la visita" a "enviar el Polycam".
/** `compacto`: dentro de la tira del bloque 1, con el rotulo en minusculas (16-oct-2026). */
export function EscaneoPrevisto({ id, inicial, compacto = false }: { id: string; inicial: string; compacto?: boolean }) {
  const [valor, setValor] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [ocupado, empezar] = useTransition();
  const router = useRouter();

  const guardar = () =>
    empezar(async () => {
      setError(null);
      const r = await accionGuardarEscaneo(id, valor);
      if (!r.ok) return setError(r.error);
      setValor(r.local);
      setHecho(true);
      router.refresh();
    });

  return (
    <span className={"flex flex-wrap items-center " + (compacto ? "gap-1.5" : "gap-2")}>
      {compacto ? (
        <span className="text-[11.5px] text-carbon/60">escaneo</span>
      ) : (
        <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#8a8a8a]">Escaneo previsto</span>
      )}
      <input
        type="datetime-local"
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          setHecho(false);
        }}
        className={"h-[24px] rounded-[5px] border border-[#cfcfcf] bg-white px-1.5 text-carbon " + (compacto ? "text-[11.5px]" : "text-[12px]")}
      />
      <button
        type="button"
        disabled={!valor || ocupado || (hecho && valor === inicial)}
        onClick={guardar}
        className={"rounded-[5px] border border-[#2b2b2b]/40 py-px font-bold text-carbon " + (compacto ? "px-1.5 text-[11px]" : "px-2.5 text-[11.5px]") + " transition hover:border-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-40"}
      >
        {ocupado ? "Agendando…" : inicial ? "Mover" : "Agendar"}
      </button>
      {hecho && !ocupado && <span className="text-[11px] text-lima-dark">en la agenda</span>}
      {error && <span className="text-[11px] text-alerta">{error}</span>}
    </span>
  );
}
