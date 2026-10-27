"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionAgendarJunta, accionChoquesJunta, accionNosPidenIr } from "./acciones";

// LA JUNTA DESDE LA FICHA (Monica, 27-oct-2026): «¿nos piden ir?» y agendar la fecha en una ventanita, sin abrir la
// agenda: dia, hora, lugar y la opp ya puesta; avisa si choca con otra cita y, al guardar, va a la agenda del comercial.

const BT = "rounded-full border-[1.5px] border-carbon/20 bg-white px-[13px] py-[5px] text-[12.5px] font-bold text-carbon/80 transition hover:border-carbon/50 hover:text-carbon disabled:opacity-50";
const BT_ON = "rounded-full border-[1.5px] border-[#2e3236] bg-[#2e3236] px-[11px] py-[3px] text-[12.5px] font-bold text-white";
const BT_LIMA = "rounded-full border-[1.5px] border-lima bg-lima px-[13px] py-[5px] text-[12.5px] font-bold text-carbon transition hover:brightness-95 disabled:opacity-50";
const CAMPO = "flex flex-col gap-1 text-[12px] font-bold text-carbon/65";
const ENTRADA = "rounded-[10px] border-[1.5px] border-carbon/20 bg-white px-2.5 py-2 text-[14px] font-medium text-carbon focus:border-lima focus:outline-none focus:ring-[3px] focus:ring-lima/20";

export function NosPidenIr({ oppId, valor }: { oppId: string; valor: boolean | null }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const poner = (v: boolean) =>
    empezar(async () => {
      const r = await accionNosPidenIr(oppId, valor === v ? null : v);
      if (!r.ok) return setError(r.error);
      setError(null);
      router.refresh();
    });
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      ¿Nos piden ir?
      <button type="button" disabled={ocupado} onClick={() => poner(true)} className={valor === true ? BT_ON : BT + " !px-2.5 !py-0.5"}>
        Sí
      </button>
      <button type="button" disabled={ocupado} onClick={() => poner(false)} className={valor === false ? BT_ON : BT + " !px-2.5 !py-0.5"}>
        No
      </button>
      {error && <span className="text-[12px] text-alerta">{error}</span>}
    </span>
  );
}

export function AgendarJunta({ oppId, agenda, nombreOpp, lugar: lugarInicial }: { oppId: string; agenda: string | null; nombreOpp: string; lugar: string }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("18:00");
  const [lugar, setLugar] = useState(lugarInicial);
  const [choques, setChoques] = useState<{ asunto: string; desde: string; hasta: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  // Al cambiar el dia o la hora, se mira si choca con algo de su agenda.
  useEffect(() => {
    if (!abierta || !agenda || !dia || !hora) return setChoques([]);
    let vivo = true;
    accionChoquesJunta(oppId, agenda, dia, hora).then((c) => vivo && setChoques(c));
    return () => {
      vivo = false;
    };
  }, [abierta, agenda, oppId, dia, hora]);

  const guardar = () =>
    empezar(async () => {
      if (!agenda) return;
      const r = await accionAgendarJunta(oppId, { agenda, dia, hora, lugar, nombreOpp });
      if (!r.ok) return setError(r.error);
      setError(null);
      setAbierta(false);
      router.refresh();
    });

  if (!agenda) return <span className="text-[12px] text-carbon/55">El comercial de esta opp no tiene agenda: no se puede agendar desde aquí.</span>;
  return (
    <>
      <button type="button" className={BT_LIMA} onClick={() => setAbierta(true)}>
        📅 Agendar fecha de junta
      </button>
      {abierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(e) => e.target === e.currentTarget && setAbierta(false)}>
          <div className="w-full max-w-[460px] rounded-2xl border border-black/15 bg-white p-6 shadow-[0_18px_36px_-18px_rgba(0,0,0,.6)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-[family-name:var(--letra-menu)] text-[20px] font-extrabold text-carbon">Fecha de la junta</div>
                <div className="text-[13px] text-carbon/60">Se apunta en la agenda del comercial, sin salir de aquí.</div>
              </div>
              <button type="button" onClick={() => setAbierta(false)} className="text-[22px] leading-none text-carbon/40 hover:text-carbon" aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className={CAMPO}>
                Día
                <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className={ENTRADA} />
              </label>
              <label className={CAMPO}>
                Hora
                <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={ENTRADA} />
              </label>
              <label className={CAMPO + " col-span-2"}>
                Lugar
                <input value={lugar} onChange={(e) => setLugar(e.target.value)} className={ENTRADA} />
              </label>
              <label className={CAMPO + " col-span-2"}>
                Oportunidad
                <input value={nombreOpp} disabled className={ENTRADA + " bg-hueso"} />
              </label>
            </div>
            {choques.length > 0 && (
              <div className="mt-4 rounded-[10px] border border-[#f0d9a8] bg-[#fbf1dc] px-3 py-2 text-[13px] text-[#6b4a00]">
                ⚠ A esa hora ya hay {choques.length === 1 ? "otra cita" : `${choques.length} citas`}:{" "}
                {choques.map((c, i) => (
                  <b key={i}>
                    {i ? ", " : ""}«{c.asunto}», {c.desde}–{c.hasta}
                  </b>
                ))}
                . Puedes guardarla igual.
              </div>
            )}
            {error && <p className="mt-3 text-[13px] text-alerta">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={BT} onClick={() => setAbierta(false)}>
                Cancelar
              </button>
              <button type="button" className={BT_LIMA} disabled={ocupado || !dia || !hora || !lugar.trim()} onClick={guardar}>
                {ocupado ? "Guardando…" : "Guardar en la agenda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
