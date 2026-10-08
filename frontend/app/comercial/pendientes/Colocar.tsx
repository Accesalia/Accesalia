"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { Miniaturas } from "../../components/Miniaturas";
import { tipoDeNota } from "../../../lib/tipoDeNota";
import type { Pendiente } from "../../../lib/pendientes";
import { accionColocar } from "./acciones";

// UNA NOTA PENDIENTE Y SUS TRES SALIDAS (Monica, 8-oct-2026): la oportunidad
// correcta (la direccion estaba mal escrita), la persona del administrador (no
// iba de una direccion), o "Es nueva": el alta, con todo ya puesto.

const ETQ = "block text-[10px] font-bold uppercase tracking-[0.05em] text-carbon/60";
const BOT = "h-[31px] rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

export function Colocar({ p, oportunidades, personas }: { p: Pendiente; oportunidades: Opcion[]; personas: Opcion[] }) {
  const router = useRouter();
  const [opp, setOpp] = useState("");
  const [persona, setPersona] = useState(p.persona ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const colocar = (destino: { oportunidadId: string } | { persona: string }) =>
    empezar(async () => {
      setError(null);
      const r = await accionColocar(p.id, destino);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const esNueva = () => {
    const q = new URLSearchParams({
      direccion: p.donde ?? "",
      nota: p.texto,
      fecha: p.fecha ?? "",
      canal: p.canal ?? "",
      pendiente: p.id,
    });
    router.push("/comercial/oportunidades/nueva?" + q.toString());
  };

  const deAdmin = persona.startsWith("puesto:") || persona.startsWith("persona:");

  return (
    <li className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-carbon/60">
        <span className="font-bold text-carbon/85">{p.fecha ? p.fecha.split("-").reverse().join("/") : "sin fecha"}</span>
        <span className="rounded-full border border-black/5 bg-hueso px-2 py-px text-[11px] font-semibold">{tipoDeNota("persona", p.canal)}</span>
        {p.autor && <span>{p.autor}</span>}
        {p.quien && <span className="text-lima-dark">con {p.quien}</span>}
      </div>
      <p className="mt-1.5 whitespace-pre-line text-[14px] leading-snug text-carbon/85">{p.texto}</p>
      <Miniaturas fotos={p.fotos} />
      {p.donde && (
        <p className="mt-2 text-[13px] text-carbon/70">
          Escribió la dirección: <b className="text-[#5c4208]">«{p.donde}»</b>, que no estaba en la lista.
        </p>
      )}

      <div className="mt-3 grid gap-3 border-t border-black/5 pt-3 md:grid-cols-2">
        <div>
          <span className={ETQ}>Era esta oportunidad</span>
          <div className="mt-1 flex gap-2">
            <Elegir id={`opp-${p.id}`} nombre="" opciones={oportunidades} valor={opp} alElegir={setOpp} vacio="busca la dirección buena…" conPista clase="min-w-0 flex-1" />
            <button
              type="button"
              disabled={!opp || ocupado}
              onClick={() => colocar({ oportunidadId: opp })}
              className={BOT + " border-lima bg-lima text-carbon hover:bg-lima-dark hover:text-white"}
            >
              Colocar
            </button>
          </div>
        </div>
        <div>
          <span className={ETQ}>O no iba de una dirección: es de esta persona del administrador</span>
          <div className="mt-1 flex gap-2">
            <Elegir id={`per-${p.id}`} nombre="" opciones={personas} valor={persona} alElegir={setPersona} vacio="busca la persona…" conPista clase="min-w-0 flex-1" />
            <button
              type="button"
              disabled={!deAdmin || ocupado}
              title={persona && !deAdmin ? "Con un presidente o un vecino, la nota va a su oportunidad" : undefined}
              onClick={() => colocar({ persona })}
              className={BOT + " border-black/15 bg-white text-carbon/80 hover:border-carbon"}
            >
              Colocar
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-carbon/55">¿No está en ninguna lista porque es una oportunidad nueva?</span>
        <button type="button" disabled={ocupado} onClick={esNueva} className={BOT + " border-[#8a6410] bg-form-nuevo text-[#5c4208] hover:bg-[#ffeeb0]"}>
          Es nueva: darla de alta
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] font-semibold text-alerta">{error}</p>}
    </li>
  );
}
