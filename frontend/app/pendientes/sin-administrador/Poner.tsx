"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { accionAdminsParaElegir } from "../../comercial/accionesCartera";
import { accionCompletar } from "../../comercial/oportunidades/[id]/acciones";

// «+ administrador» ahi mismo: el mismo boton de la cartera de administradores
// (CarteraGestores, PonerAdmin) y la misma accion que «Completar». Desde el
// 18-oct-2026 el administrador va a la COMUNIDAD de la opp, no a la opp.
export function Poner({ oppId }: { oppId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [opciones, setOpciones] = useState<Opcion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const abrir = () =>
    empezar(async () => {
      setError(null);
      if (!opciones) setOpciones(await accionAdminsParaElegir());
      setAbierto(true);
    });
  const poner = (puesto: string) =>
    empezar(async () => {
      setError(null);
      const r = await accionCompletar(oppId, { contacto: null, contactoNombre: null, contactoTelefono: null, siguientePaso: null, administrador: puesto });
      if (!r.ok) return setError(r.error);
      setAbierto(false);
      router.refresh();
    });
  if (!abierto)
    return (
      <button
        type="button"
        onClick={abrir}
        disabled={ocupado}
        className="whitespace-nowrap rounded-md border border-amber-400 bg-white px-2.5 py-1 text-[12px] font-semibold text-amber-900 hover:border-amber-600 disabled:opacity-50"
      >
        {ocupado ? "…" : "+ administrador"}
      </button>
    );
  return (
    <div className="w-[300px]">
      <Elegir id={`admin-${oppId}`} nombre="" opciones={opciones ?? []} alElegir={(v) => v && poner(v)} vacio="busca al administrador…" conPista abrirAlMontar desactivado={ocupado} />
      <div className="mt-0.5 flex items-center gap-2 text-[11px]">
        <button type="button" onClick={() => setAbierto(false)} className="text-carbon/60 underline hover:text-carbon">
          cancelar
        </button>
        {ocupado && <span className="text-carbon/60">guardando…</span>}
        {error && <span className="text-alerta">{error}</span>}
      </div>
    </div>
  );
}
