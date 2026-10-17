"use client";

// «Descargar PDF»: el dialogo de imprimir del navegador, con «Guardar como PDF».
// Sale la ficha tal cual se ve (la barra y los botones no se imprimen).
export function Imprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl bg-lima px-4 py-2 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white">
      Descargar PDF
    </button>
  );
}
