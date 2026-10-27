"use client";

import { useRouter } from "next/navigation";
import { SalidaBoton } from "./Salida";
import { alVolver, anterior } from "./rastroPantallas";

// VOLVER A DONDE SE ESTABA (Monica, 3-oct-2026): a una pantalla a la que se
// llega desde varios sitios, el "volver" no puede llevar a uno fijo; tiene que
// devolver a la pagina de antes. Si se abrio sin pagina de antes (un enlace
// pegado, una pestaña nueva), lleva a `siNoHay`.
export function Volver({ siNoHay = "/menu" }: { siNoHay?: string }) {
  const router = useRouter();
  // En la barra negra, como todas las salidas (12-oct-2026).
  // Con el rastro de la app (27-oct-2026): la anterior DE LA APP, no la del navegador (que puede ser otra web).
  return (
    <SalidaBoton
      onClick={() => {
        const antes = anterior();
        alVolver();
        router.push(antes ?? siNoHay);
      }}
    >
      ← Volver
    </SalidaBoton>
  );
}
