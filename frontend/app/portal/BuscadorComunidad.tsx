"use client";

import { useRouter } from "next/navigation";
import { Elegir } from "../components/Elegir";

// EL BUSCADOR DE DIRECCION en el portal (Monica, 12-oct-2026): entra en todas
// las comunidades sin aparecer en ninguna; elige aqui a cual entrar.
export function BuscadorComunidad({ opciones }: { opciones: { valor: string; texto: string; pista: string }[] }) {
  const router = useRouter();
  return (
    <div className="mb-5 rounded-2xl border border-carbon/20 bg-white p-3 shadow-sm">
      <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/60">Dirección · entrar en cualquier comunidad</span>
      <Elegir id="portal_comunidad" nombre="" opciones={opciones} alElegir={(v) => v && router.push(`/portal/c/${v}`)} vacio="busca una comunidad…" conPista clase="mt-1" />
    </div>
  );
}
