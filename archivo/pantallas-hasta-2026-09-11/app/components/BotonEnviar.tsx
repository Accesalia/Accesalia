"use client";

import { useFormStatus } from "react-dom";

export function BotonEnviar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-carbon px-6 py-3 font-semibold text-white transition hover:bg-carbon-soft disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Subiendo y arrancando la IA…
        </>
      ) : (
        <>Extraer convocatoria →</>
      )}
    </button>
  );
}
