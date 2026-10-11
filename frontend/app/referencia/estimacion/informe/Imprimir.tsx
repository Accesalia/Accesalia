"use client";

export function Imprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-lima px-5 py-2 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white"
    >
      Imprimir
    </button>
  );
}
