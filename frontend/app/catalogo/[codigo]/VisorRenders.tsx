"use client";

import { useState } from "react";

// Visor de renders: imagen grande + tira de miniaturas. Ver el dato sin clicar
// (la primera se muestra directamente); clicar solo cambia el foco.
export function VisorRenders({ urls }: { urls: string[] }) {
  const [sel, setSel] = useState(0);
  if (urls.length === 0) return null;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[sel]}
          alt={`Render ${sel + 1}`}
          className="max-h-[70vh] w-full bg-carbon/5 object-contain"
        />
      </div>
      {urls.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {urls.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setSel(i)}
              className={
                "h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition " +
                (i === sel
                  ? "border-lima"
                  : "border-transparent opacity-70 hover:opacity-100")
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Miniatura ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
