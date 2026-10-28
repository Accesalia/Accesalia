"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionAgendarReunion, accionChoquesReunion } from "./acciones";

// AGENDAR DESDE EL BLOQUE 3 (Monica, 28-oct-2026): «que el comercial pueda agendar la junta desde esta pantalla… y
// otras reuniones con la comunidad», sin abrir la agenda. Se guarda en la agenda (una sola fuente) y avisa si choca.

const TIPOS = [
  { valor: "junta", texto: "Junta" },
  { valor: "visita_fuera", texto: "Reunión o visita" },
  { valor: "llamada", texto: "Llamada" },
  { valor: "videollamada", texto: "Videollamada" },
];
const CAMPO = "rounded-[6px] border border-[#cfcfcf] bg-white px-2 py-1.5 text-[12.5px] placeholder:text-carbon/55";

export function AgendarReunion({ oppId, nombreOpp }: { oppId: string; nombreOpp: string }) {
  const router = useRouter();
  const [d, setD] = useState({ tipo: "junta", dia: "", hora: "", lugar: "", tema: "" });
  const [choques, setChoques] = useState<{ asunto: string; desde: string; hasta: string }[]>([]);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  useEffect(() => {
    if (!d.dia || !d.hora) return setChoques([]);
    accionChoquesReunion(oppId, d.dia, d.hora).then(setChoques);
  }, [oppId, d.dia, d.hora]);

  const listo = d.dia && d.hora && (d.tipo === "junta" ? d.lugar.trim() : d.tema.trim());
  const agendar = () =>
    empezar(async () => {
      setError(null);
      const r = await accionAgendarReunion(oppId, { ...d, nombreOpp });
      if (!r.ok) return setError(r.error);
      setD({ tipo: "junta", dia: "", hora: "", lugar: "", tema: "" });
      setHecho(true);
      router.refresh();
    });

  return (
    <div className="rounded-[12px] border-[1.5px] border-[#104269] bg-[#f6f9fb] px-4 py-3">
      <b className="text-[13.5px]">+ Agendar una reunión</b>
      <span className="ml-2 text-[12px] text-carbon/65">se guarda en la agenda del comercial de la opp</span>
      <div className="mt-2 grid gap-2 lg:grid-cols-[150px_140px_100px_minmax(0,1fr)_minmax(0,1.3fr)_auto]">
        <select value={d.tipo} onChange={(e) => setD({ ...d, tipo: e.target.value })} className={CAMPO}>
          {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
        </select>
        <input type="date" value={d.dia} onChange={(e) => setD({ ...d, dia: e.target.value })} className={CAMPO} />
        <input type="time" value={d.hora} onChange={(e) => setD({ ...d, hora: e.target.value })} className={CAMPO} />
        <input value={d.lugar} onChange={(e) => setD({ ...d, lugar: e.target.value })} placeholder={d.tipo === "junta" ? "Lugar (obligatorio)" : "Lugar"} className={CAMPO} />
        <input
          value={d.tema}
          onChange={(e) => setD({ ...d, tema: e.target.value })}
          placeholder={d.tipo === "junta" ? "Tema (opcional)" : "Con quién / tema: «comisión de obras, explicar ayudas»"}
          className={CAMPO}
        />
        <button type="button" disabled={!listo || ocupado} onClick={agendar} className="rounded-[7px] bg-lima px-4 py-1.5 text-[13px] font-bold text-white transition hover:bg-lima-dark disabled:opacity-50">
          Agendar
        </button>
      </div>
      {choques.length > 0 && (
        <p className="mt-1.5 text-[12px] font-semibold text-[#9a6a00]">
          Ojo, ese día y hora ya tiene: {choques.map((c) => `${c.asunto} (${c.desde}–${c.hasta})`).join(" · ")}
        </p>
      )}
      {hecho && !error && <p className="mt-1.5 text-[12px] font-semibold text-lima-dark">Agendada. Ya está en la agenda.</p>}
      {error && <p className="mt-1.5 text-[12px] font-semibold text-alerta">{error}</p>}
    </div>
  );
}
