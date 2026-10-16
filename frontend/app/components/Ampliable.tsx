"use client";

import { useEffect, useState } from "react";

// UNA IMAGEN QUE SE AMPLIA AL PINCHARLA (Monica, 16-oct-2026): "se resuelve
// mejor haciendolas ampliables con un click, y asi dejan sitio a la info
// relevante". Se abre encima de la pantalla, sin irse a otra pestaña; se cierra
// pinchando en cualquier sitio o con Esc.
export function Ampliable({
  src,
  grande,
  alt,
  className,
}: {
  src: string;
  /** La version grande, si la hay; si no, la misma. */
  grande?: string;
  alt: string;
  className?: string;
}) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierta(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta]);

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} title="Ampliar" className="block w-full cursor-zoom-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className + " transition hover:opacity-85"} />
      </button>
      {abierta && (
        <div
          role="dialog"
          aria-label={alt}
          onClick={() => setAbierta(false)}
          className="fixed inset-0 z-[100] flex cursor-zoom-out flex-col items-center justify-center gap-2 bg-black/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={grande ?? src} alt={alt} className="max-h-[88vh] max-w-[92vw] rounded-[10px] bg-white object-contain" />
          <span className="text-[12px] text-white/70">{alt} · pincha o pulsa Esc para cerrar</span>
        </div>
      )}
    </>
  );
}
