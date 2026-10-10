"use client";

import { useEffect } from "react";

const VISOR = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js";

/** El visor de .glb para mirar: el escaneo antes de vincularlo y el catalogo
 *  de ascensores. Va dentro de una caja con `relative` y alto fijo. */
export function Visor3D({ url }: { url: string }) {
  useEffect(() => {
    if (document.querySelector(`script[src="${VISOR}"]`)) return;
    const s = document.createElement("script");
    s.type = "module";
    s.src = VISOR;
    document.head.appendChild(s);
  }, []);

  return (
    <>
      {/* @ts-expect-error: model-viewer es un elemento web, no de React */}
      <model-viewer src={url} camera-controls="" shadow-intensity="1" style={{ width: "100%", height: "100%", background: "transparent" }} />
      <span className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-carbon/50">
        Arrastra para girar · rueda para acercar
      </span>
    </>
  );
}
