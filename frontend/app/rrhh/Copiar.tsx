"use client";

import { useState } from "react";

// Copia un dato (una cuenta, un importe) para pegarlo en el banco.
export function Copiar({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const [hecho, setHecho] = useState(false);
  return (
    <button
      type="button"
      title={`Copiar ${etiqueta}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(valor);
          setHecho(true);
          setTimeout(() => setHecho(false), 1500);
        } catch {}
      }}
      className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs font-semibold text-carbon/60 transition hover:border-lima hover:text-carbon"
    >
      {hecho ? "Copiado" : "Copiar"}
    </button>
  );
}
