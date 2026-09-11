"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ConvocatoriaResumen } from "@/lib/datos";

// Desplegable para saltar entre convocatorias + filtro "solo abiertas" + acceso
// a "Nueva convocatoria".
export function SelectorConvocatoria({
  convocatorias,
  actualId,
}: {
  convocatorias: ConvocatoriaResumen[];
  actualId: string;
}) {
  const router = useRouter();
  const [soloAbiertas, setSoloAbiertas] = useState(false);

  // Filtra por abiertas, pero conserva SIEMPRE la convocatoria actual (para que
  // el <select> nunca quede con un valor fuera de la lista).
  const opciones = convocatorias.filter(
    (c) => !soloAbiertas || c.abierta || c.id === actualId,
  );

  const abiertas = convocatorias.filter((c) => c.abierta).length;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setSoloAbiertas((v) => !v)}
        aria-pressed={soloAbiertas}
        title="Mostrar solo convocatorias con el plazo abierto"
        className={
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition " +
          (soloAbiertas
            ? "border-lima bg-lima text-carbon"
            : "border-black/10 text-carbon/70 hover:border-lima hover:text-lima-dark")
        }
      >
        <span
          className={
            "h-2 w-2 rounded-full " + (soloAbiertas ? "bg-carbon" : "bg-lima")
          }
        />
        Solo abiertas
        <span className={soloAbiertas ? "text-carbon/60" : "text-carbon/35"}>{abiertas}</span>
      </button>

      <select
        value={actualId}
        onChange={(e) => router.push(`/convocatoria/${e.target.value}`)}
        className="max-w-[300px] rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium text-carbon shadow-sm outline-none transition hover:border-lima focus:border-lima"
      >
        {opciones.map((c) => (
          <option key={c.id} value={c.id}>
            {c.plan} {c.anio ? c.anio : ""} · {c.entidad} {c.abierta ? "· Abierta" : "· Cerrada"}
          </option>
        ))}
      </select>

      <Link
        href="/nueva"
        title="Nueva convocatoria"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lima text-carbon transition hover:bg-lima-dark hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Link>
    </div>
  );
}
