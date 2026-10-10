"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elegir } from "../components/Elegir";
import { Acciones } from "./CuadroPiezas";
import { ModalEntrada } from "./ModalEntrada";
import type { Opcion } from "../components/Elegir";
import type { OppEntrada } from "../../lib/entradaDiario";
import type { GuardadoEntrada } from "./acciones";

// Las tres baldosas, y la ventana que abre la primera. Vive aparte porque la
// pantalla es de servidor y quien recuerda si la ventana esta abierta tiene que
// estar en el navegador.
export function Grabar({
  hoy,
  canales,
  oportunidades,
  personas,
  miComercialId,
  guardar,
}: {
  hoy: string;
  canales: readonly { valor: string; texto: string }[];
  oportunidades: OppEntrada[];
  personas: Opcion[];
  miComercialId: string | null;
  guardar: (fd: FormData) => Promise<GuardadoEntrada>;
}) {
  const [abierto, setAbierto] = useState(false);
  // HOJA DE ENCARGO (9-oct-2026): primero la oportunidad, y de ahi a su hoja
  // con el generador abierto. La hoja trabaja por comunidad: sin ella no hay.
  const router = useRouter();
  // PRESUPUESTO (10-oct-2026): la misma ventana, y de ahi a construirlo.
  const [hoja, setHoja] = useState<false | "hoja" | "presupuesto">(false);
  const [sinComunidad, setSinComunidad] = useState<string | null>(null);
  const irAHoja = (id: string) => {
    const o = oportunidades.find((x) => x.valor === id);
    if (!o) return;
    if (!o.comunidadId) return setSinComunidad(id);
    router.push(
      hoja === "presupuesto" ? `/comercial/presupuesto?opp=${id}` : `/comercial/hoja-encargo?comunidad=${o.comunidadId}&opp=${id}&nueva=1`,
    );
  };
  return (
    <>
      <Acciones
        grabarEntrada={() => setAbierto(true)}
        hojaEncargo={
          oportunidades.length
            ? () => {
                setSinComunidad(null);
                setHoja("hoja");
              }
            : undefined
        }
        presupuesto={
          oportunidades.length
            ? () => {
                setSinComunidad(null);
                setHoja("presupuesto");
              }
            : undefined
        }
      />
      {hoja && (
        <div
          onMouseDown={(e) => e.target === e.currentTarget && setHoja(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-alta-opp/70 p-4 pt-[15vh]"
        >
          <div className="w-full max-w-[560px] rounded-[14px] border border-[#223A5D] bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#223A5D]">{hoja === "presupuesto" ? "Presupuesto" : "Hoja de encargo"} · ¿de qué oportunidad?</h3>
              <button type="button" onClick={() => setHoja(false)} aria-label="Cerrar" className="text-lg leading-none text-carbon/45 hover:text-carbon">
                ×
              </button>
            </div>
            <Elegir
              id="hoja_de_opp"
              nombre=""
              opciones={oportunidades}
              valor=""
              alElegir={(id) => id && irAHoja(id)}
              vacio="Busca la dirección, el código o el comercial…"
              conPista
              abrirAlMontar
              clase="mt-3"
            />
            {sinComunidad && (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                Esta oportunidad todavía no tiene comunidad, y sin ella no se puede hacer {hoja === "presupuesto" ? "el presupuesto" : "la hoja"}.{" "}
                <Link href={`/comercial/oportunidades/${sinComunidad}`} className="font-bold underline">
                  Abrir su ficha
                </Link>
              </p>
            )}
          </div>
        </div>
      )}
      <ModalEntrada
        abierto={abierto}
        hoy={hoy}
        canales={canales}
        oportunidades={oportunidades}
        personas={personas}
        miComercialId={miComercialId}
        alCerrar={() => setAbierto(false)}
        guardar={guardar}
      />
    </>
  );
}
