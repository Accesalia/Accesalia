"use client";

// Boton para imprimir / guardar como PDF el acta (usa el dialogo del navegador).
export function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm font-medium text-carbon hover:border-lima"
    >
      🖨 Imprimir / PDF
    </button>
  );
}
