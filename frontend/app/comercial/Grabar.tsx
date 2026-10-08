"use client";

import { useState } from "react";
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
  return (
    <>
      <Acciones grabarEntrada={() => setAbierto(true)} />
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
