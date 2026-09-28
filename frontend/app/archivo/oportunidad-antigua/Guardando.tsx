"use client";

// Aviso de "esto se esta enviando", para todo formulario.
//
// El problema que resuelve, y no era pequeno: al pulsar Guardar no pasaba nada
// visible durante varios segundos, asi que se volvia a pulsar. Y se guardaba
// otra vez. De ahi salieron las siete notas identicas del 23 de julio: no era
// que fallara, es que no contestaba.
//
// Se pone DENTRO del <form>, que es donde useFormStatus sabe si hay un envio en
// marcha. Mientras dura, tapa la pantalla: ademas de avisar, se come los toques
// repetidos, que es lo que de verdad evita el duplicado.

import { useFormStatus } from "react-dom";

export function Guardando({ texto = "Guardando…" }: { texto?: string }) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-carbon/25 backdrop-blur-[1px]"
    >
      <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-xl">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-lima/30 border-t-lima-dark" />
        <span className="text-sm font-semibold text-carbon">{texto}</span>
      </div>
    </div>
  );
}

/** El boton de enviar, que se apaga solo mientras se guarda.
 *
 *  El aviso de arriba ya impide el doble toque, pero ver el propio boton
 *  cambiar es la senal mas directa: pulsas y te contesta. */
export function BotonGuardar(
  { children, className, guardando = "Guardando…" }:
  { children: React.ReactNode; className?: string; guardando?: string },
) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}>
      {pending ? guardando : children}
    </button>
  );
}
