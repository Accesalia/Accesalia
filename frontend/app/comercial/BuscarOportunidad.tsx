"use client";

import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../components/Elegir";

// IR A UNA OPORTUNIDAD CONCRETA (Monica, 8-oct-2026: "lista TODAS; necesita un
// buscador para encontrar una concreta"). Busca en TODAS las abiertas -la
// lista de abajo solo enseña las 200 mas recientes- por direccion, codigo o
// comercial, y al elegir abre su ficha.
export function BuscarOportunidad({ oportunidades }: { oportunidades: Opcion[] }) {
  const router = useRouter();
  return (
    <Elegir
      id="ir_a_oportunidad"
      nombre=""
      opciones={oportunidades}
      valor=""
      alElegir={(id) => id && router.push(`/comercial/oportunidades/${id}`)}
      vacio="🔍 Buscar una oportunidad: dirección, código o comercial…"
      marco="border-carbon/30"
      conPista
      clase="w-full max-w-[520px]"
    />
  );
}
