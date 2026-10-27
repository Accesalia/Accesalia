"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionConsultarIee } from "./acciones";

// CONSULTAR LA IEE APOSTA PARA ESTA DIRECCION (Monica, 15-oct-2026). Solo sale
// cuando no consta: si el registro la tiene, se guarda y la fila pasa a ensenar
// sus datos, sin boton.
export function ConsultarIee({ oppId }: { oppId: string }) {
  const router = useRouter();
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  return (
    <span className="ml-2 inline-flex flex-wrap items-center gap-2 align-middle">
      <button
        type="button"
        disabled={ocupado}
        onClick={() =>
          empezar(async () => {
            setAviso(null);
            const r = await accionConsultarIee(oppId).catch((e: Error) => ({ ok: false as const, error: e.message }));
            if (!r.ok) return setAviso(r.error);
            if (r.guardadas > 0) return router.refresh();
            setAviso(
              r.fuera
                ? "Su municipio no está en el registro de IEE de la Comunidad."
                : "Consultado ahora: el registro no tiene IEE inscrita para estos portales.",
            );
          })
        }
        className="whitespace-nowrap rounded-[6px] border border-[#0C8124] bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0C8124] transition hover:bg-[#E9F3EC] disabled:opacity-60"
      >
        {ocupado ? "Consultando el registro…" : "Consultar IEE"}
      </button>
      {aviso && <span className="text-[11.5px] text-[#6e6e6e]">{aviso}</span>}
    </span>
  );
}
