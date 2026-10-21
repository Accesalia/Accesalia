"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionUmbralesColchon } from "./acciones";
import type { UmbralesColchon } from "../../../lib/negocio";

// EL MODAL DE LOS UMBRALES DEL COLCHON (Monica, 21-oct-2026: "si pulsas se te abre
// un modal de modificar umbrales de alerta del colchon"). Las semanas de cada zona
// y la capacidad del equipo; se guardan en parametros_alerta.

const CAMPOS: { k: keyof UmbralesColchon; texto: string; unidad: string }[] = [
  { k: "minimo", texto: "Poco colchón por debajo de", unidad: "semanas" },
  { k: "idealDesde", texto: "Lo ideal, desde", unidad: "semanas" },
  { k: "idealHasta", texto: "Lo ideal, hasta", unidad: "semanas" },
  { k: "maximo", texto: "Colapso por encima de", unidad: "semanas" },
  { k: "tecnicos", texto: "Técnicos a jornada completa", unidad: "personas" },
  { k: "horasTecnico", texto: "Horas de proyecto de cada uno", unidad: "h por semana" },
  { k: "horasParcial", texto: "Horas del técnico a media jornada", unidad: "h por semana" },
  { k: "horasDia", texto: "Horas por día de tiempo estándar", unidad: "horas" },
];

export function BotonUmbrales({ umbrales }: { umbrales: UmbralesColchon }) {
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState(umbrales);
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();
  const router = useRouter();
  const capacidad = v.tecnicos * v.horasTecnico + v.horasParcial;
  const campo = "w-20 rounded-[5px] border border-carbon/25 bg-white px-2 py-1 text-right text-[14px] tabular-nums outline-none focus:border-lima";

  const cerrar = () => {
    setAbierto(false);
    setV(umbrales);
    setError(null);
  };
  const guardar = () =>
    empezar(async () => {
      const r = await accionUmbralesColchon(v);
      if (r.error) return setError(r.error);
      setAbierto(false);
      router.refresh();
    });

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="text-[11.5px] font-bold text-[#2f6a14] underline decoration-[#2f6a14]/40 underline-offset-2 hover:decoration-[#2f6a14]">
        Cambiar umbrales
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={cerrar}>
          <div role="dialog" aria-modal="true" aria-labelledby="umbrales-titulo" className="w-full max-w-[460px] rounded-[7px] bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 id="umbrales-titulo" className="font-[family-name:var(--letra-menu)] text-[18px] font-extrabold">Umbrales del colchón de proyectos</h2>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={cerrar} className="rounded-[5px] border border-carbon/20 px-3 py-1 text-[13.5px] font-semibold text-carbon/75 hover:text-carbon">
                  Cancelar
                </button>
                <button type="button" onClick={guardar} disabled={guardando} className="rounded-[5px] bg-lima px-3 py-1 text-[13.5px] font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-60">
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {CAMPOS.map((c, i) => (
                <label key={c.k} htmlFor={`u-${c.k}`} className={`flex items-center justify-between gap-3 text-[13.5px] ${i === 4 ? "mt-3 border-t border-black/10 pt-3" : ""}`}>
                  <span className="text-carbon/80">{c.texto}</span>
                  <span className="flex items-center gap-2">
                    <input
                      id={`u-${c.k}`}
                      type="number"
                      step="0.5"
                      min="0"
                      value={v[c.k]}
                      onChange={(e) => setV({ ...v, [c.k]: Number(e.target.value) })}
                      className={campo}
                    />
                    <span className="w-[86px] text-[12.5px] text-carbon/60">{c.unidad}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-carbon/65">
              El equipo saca <b className="text-carbon">{capacidad} h de proyecto por semana</b>.
            </p>
            {error && <p className="mt-2 rounded-[5px] bg-[#ffeeee] px-3 py-2 text-[13px] text-[#9f3a38]">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
