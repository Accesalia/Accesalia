"use client";

import { useState } from "react";
import { Acciones } from "./CuadroPiezas";
import { ModalEntrada } from "./ModalEntrada";
import type { Opcion } from "../components/Elegir";

// Las tres baldosas, y la ventana que abre la primera. Vive aparte porque la
// pantalla es de servidor y quien recuerda si la ventana esta abierta tiene que
// estar en el navegador.
export function Grabar({
  hoy,
  comoFue,
  oportunidades,
  personas,
  comercialId,
  guardar,
}: {
  hoy: string;
  comoFue: readonly { valor: string; texto: string }[];
  oportunidades: Opcion[];
  personas: Opcion[];
  comercialId: string | null;
  guardar: (fd: FormData) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Acciones grabarEntrada={() => setAbierto(true)} />
      <ModalEntrada
        abierto={abierto}
        hoy={hoy}
        comoFue={comoFue}
        oportunidades={oportunidades}
        personas={personas}
        comercialId={comercialId}
        alCerrar={() => setAbierto(false)}
        guardar={guardar}
      />
    </>
  );
}
