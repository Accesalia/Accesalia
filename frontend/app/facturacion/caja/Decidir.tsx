"use client";

import { useState, useTransition } from "react";
import { decidirNube } from "../nubes/acciones";

// ASIGNAR › NUBE · PENDIENTE DE DECIDIR (Monica, 16-oct-2026; maqueta
// area-dinero-v1, marco 7): Alexandra marca si cada trabajo necesita nube de
// puntos. Al pulsar, la fila se va: «si» pasa a Asignado como nube (Abraham);
// «no», directo a Proyectos.

export type FilaDecidir = { oppId: string; nombre: string; detalle: string };

function Fila({ f, alSalir }: { f: FilaDecidir; alSalir: () => void }) {
  const [haciendo, empezar] = useTransition();
  const [sale, setSale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decidir = (si: boolean) => {
    setError(null);
    empezar(async () => {
      const r = await decidirNube(f.oppId, si);
      if (!r.ok) return setError(r.error ?? "No se guardó");
      setSale(true);
      setTimeout(alSalir, 350);
    });
  };
  const BTN = "inline-flex h-8 items-center rounded-[9px] border px-3 text-[13px] font-bold disabled:opacity-50";
  return (
    <div className={`flex items-center gap-3.5 border-b border-[#f0f2ee] px-4 py-[13px] transition-opacity duration-[350ms] last:border-0 ${sale ? "opacity-0" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold">{f.nombre}</div>
        <div className="mt-0.5 text-[12.5px] text-[#7b8077]">{f.detalle}</div>
        {error && <div className="text-[12px] text-alerta">No se guardó: {error}</div>}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" disabled={haciendo} onClick={() => decidir(true)} className={BTN + " border-lima bg-lima text-[#1f3a0c] hover:bg-lima-dark hover:text-white"}>
          Nube sí
        </button>
        <button type="button" disabled={haciendo} onClick={() => decidir(false)} className={BTN + " border-[#d6dad2] bg-white text-carbon-soft hover:border-carbon/40"}>
          Nube no
        </button>
      </div>
    </div>
  );
}

export function Decidir({ filas }: { filas: FilaDecidir[] }) {
  const [quedan, setQuedan] = useState(filas);
  if (!quedan.length) return <p className="p-[26px] text-center text-[#7b8077]">Nada pendiente de decidir.</p>;
  return (
    <>
      {quedan.map((f) => (
        <Fila key={f.oppId} f={f} alSalir={() => setQuedan((l) => l.filter((x) => x.oppId !== f.oppId))} />
      ))}
    </>
  );
}
