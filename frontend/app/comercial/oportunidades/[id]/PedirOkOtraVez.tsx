"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionHojaPedirOkOtraVez } from "./accionesHoja";

// EL OK DE DANIEL CADUCADO (Monica, 28-oct-2026: «un ok de Daniel debe durar 3 meses»): la hoja vuelve a su mesa tal cual.
export function PedirOkOtraVez({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={ocupado}
        onClick={() =>
          empezar(async () => {
            setError(null);
            const r = await accionHojaPedirOkOtraVez(versionId);
            if (r.ok) router.refresh();
            else setError(r.error);
          })
        }
        className="font-semibold text-[#104269] underline-offset-2 hover:underline disabled:opacity-50"
      >
        {ocupado ? "pidiéndolo…" : "volver a pedir el ok"}
      </button>
      {error && <span className="text-alerta"> · {error}</span>}
    </>
  );
}
