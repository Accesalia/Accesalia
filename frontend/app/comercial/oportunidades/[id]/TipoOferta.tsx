"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { accionMarcarNecesidades } from "../../viabilidad-sin-polycam/acciones";

// EL TIPO DE OFERTA (Monica, 27-oct-2026): «hay dos tipos de ofertas, con o sin viabilidad; y dentro de con
// viabilidad, las que para hacerla necesitan Polycam y las que no» (SATE, sobre todo). No es un dato nuevo: son las
// dos casillas que ya tenia la opp («necesita Polycam», «necesita viabilidad», 15-oct), dichas como una sola eleccion.

const TIPOS = [
  { clave: "sin", texto: "Sin viabilidad", polycam: false, viabilidad: false },
  { clave: "polycam", texto: "Con viabilidad · con Polycam", polycam: true, viabilidad: true },
  { clave: "solicitud", texto: "Con viabilidad · sin Polycam (p. ej. SATE)", polycam: false, viabilidad: true },
] as const;

export function TipoOferta({ oppId, polycam, viabilidad }: { oppId: string; polycam: boolean; viabilidad: boolean }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const actual = !viabilidad ? "sin" : polycam ? "polycam" : "solicitud";
  const elegir = (t: (typeof TIPOS)[number]) =>
    empezar(async () => {
      setError(null);
      const r = await accionMarcarNecesidades(oppId, { polycam: t.polycam, viabilidad: t.viabilidad });
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.06em] text-carbon/65">Tipo de oferta</span>
      {TIPOS.map((t) => (
        <button
          key={t.clave}
          type="button"
          disabled={ocupado}
          onClick={() => t.clave !== actual && elegir(t)}
          className={
            "rounded-[20px] border px-3 py-1 text-[12.5px] transition " +
            (t.clave === actual ? "border-[#104269] bg-[#104269] font-bold text-white" : "border-[#c9c9c9] bg-white hover:border-[#104269]")
          }
        >
          {t.texto}
        </button>
      ))}
      {error && <span className="font-semibold text-alerta">{error}</span>}
    </div>
  );
}
