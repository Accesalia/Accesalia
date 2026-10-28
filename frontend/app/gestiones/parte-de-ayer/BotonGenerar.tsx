"use client";

import { useFormStatus } from "react-dom";

// Bajar el correo y que Sali lo lea tarda entre medio minuto y dos: que se vea.
export function BotonGenerar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-lima px-6 py-2 text-[14px] font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-60"
    >
      {pending ? "Sali está leyendo el correo…" : "Generar el parte"}
    </button>
  );
}
