"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionVolverAConsultar } from "./acciones";

// VOLVER A CONSULTAR EL EDIFICIO, SOLO SI FALTAN DATOS (Monica, 15-oct-2026: "si
// hay datos de Catastro no aparece; si faltan, si"; si no, le darian por
// aburrimiento).
export function VolverAConsultar({ oppId, referencia }: { oppId: string; referencia: string }) {
  const router = useRouter();
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={ocupado}
        onClick={() =>
          empezar(async () => {
            setAviso(null);
            const r = await accionVolverAConsultar(oppId, referencia).catch((e: Error) => ({ ok: false as const, error: e.message }));
            if (!r.ok) return setAviso(r.error);
            if (!r.completo) setAviso("Sigue faltando algo: Catastro o el geoportal no lo han dado.");
            router.refresh();
          })
        }
        className="whitespace-nowrap rounded-[6px] border border-[#104269] bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#104269] transition hover:bg-[#E3EAF0] disabled:opacity-60"
      >
        {ocupado ? "Consultando…" : "Volver a consultar"}
      </button>
      {aviso && <span className="text-[11.5px] text-[#6e6e6e]">{aviso}</span>}
    </span>
  );
}
