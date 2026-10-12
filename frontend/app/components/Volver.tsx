"use client";

import { useRouter } from "next/navigation";
import { SalidaBoton } from "./Salida";

// VOLVER A DONDE SE ESTABA (Monica, 3-oct-2026): a una pantalla a la que se
// llega desde varios sitios, el "volver" no puede llevar a uno fijo; tiene que
// devolver a la pagina de antes. Si se abrio sin pagina de antes (un enlace
// pegado, una pestaña nueva), lleva a `siNoHay`.
export function Volver({ siNoHay = "/menu" }: { siNoHay?: string }) {
  const router = useRouter();
  // En la barra negra, como todas las salidas (12-oct-2026).
  return <SalidaBoton onClick={() => (window.history.length > 1 ? router.back() : router.push(siNoHay))}>← Volver</SalidaBoton>;
}
