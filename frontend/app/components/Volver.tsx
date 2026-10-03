"use client";

import { useRouter } from "next/navigation";

// VOLVER A DONDE SE ESTABA (Monica, 3-oct-2026): a una pantalla a la que se
// llega desde varios sitios, el "volver" no puede llevar a uno fijo; tiene que
// devolver a la pagina de antes. Si se abrio sin pagina de antes (un enlace
// pegado, una pestaña nueva), lleva a `siNoHay`.
export function Volver({ siNoHay = "/menu" }: { siNoHay?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(siNoHay))}
      className="text-sm font-semibold text-carbon/55 transition hover:text-carbon"
    >
      ← Volver
    </button>
  );
}
