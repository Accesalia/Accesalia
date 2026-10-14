"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { accionResolverDaniel } from "./acciones";
import { accionCorregirDireccion } from "./revision-polycam/acciones";

// Los dos botones de la tarjeta de la mesa que hacen algo sin salir de ella
// (Monica, 14-oct-2026): "corregir dirección" (lo que vinculo la app vuelve a
// "necesito un humano") y "resuelto por Daniel".

function useAccion() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const hacer = (a: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    empezar(async () => {
      setError(null);
      const r = await a().catch((e: Error) => ({ ok: false as const, error: e.message }));
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  return { error, pendiente, hacer };
}

export function CorregirDireccion({ escaneoId }: { escaneoId: string }) {
  const { error, pendiente, hacer } = useAccion();
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          if (window.confirm("¿Deshacer la dirección que puso la app? El escaneo vuelve a «Necesito un humano».")) hacer(() => accionCorregirDireccion(escaneoId));
        }}
        className="rounded-[8px] border border-[#9db6cf] bg-[#e3ecf5] px-3 py-1 text-[11.5px] font-semibold leading-tight text-[#3f5f80] transition hover:bg-[#d5e2ef] disabled:opacity-50"
      >
        corregir dirección
      </button>
      {error && <span className="mt-1 max-w-[220px] text-right text-[11px] text-alerta">{error}</span>}
    </span>
  );
}

export function ResueltoPorDaniel({ viabilidadId }: { viabilidadId: string }) {
  const { error, pendiente, hacer } = useAccion();
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => hacer(() => accionResolverDaniel(viabilidadId))}
        className="rounded-full border-2 border-[#3b6e1f] bg-white px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#3b6e1f] transition hover:bg-[#3b6e1f] hover:text-white disabled:opacity-50"
      >
        Marcar resuelto por Daniel
      </button>
      {error && <span className="mt-1 max-w-[220px] text-right text-[11px] text-alerta">{error}</span>}
    </span>
  );
}
