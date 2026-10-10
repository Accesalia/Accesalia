"use client";

import { useEffect, useState } from "react";

/** Las imagenes del modelo; pinchando una se ve en grande, con flechas. */
export function Imagenes({ urls }: { urls: string[] }) {
  const [i, setI] = useState<number | null>(null);

  useEffect(() => {
    if (i === null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setI(null);
      if (e.key === "ArrowRight") setI((x) => (x === null ? x : (x + 1) % urls.length));
      if (e.key === "ArrowLeft") setI((x) => (x === null ? x : (x - 1 + urls.length) % urls.length));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [i, urls.length]);

  return (
    <>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {urls.map((u, n) => (
          <button key={u} type="button" onClick={() => setI(n)} className="overflow-hidden rounded-xl border border-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition hover:scale-105" />
          </button>
        ))}
      </div>

      {i !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setI(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[i]} alt="" className="max-h-full max-w-full rounded-lg" />
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[13px] text-white/70">
            {i + 1} / {urls.length} · flechas para pasar · Esc para cerrar
          </span>
        </div>
      )}
    </>
  );
}
