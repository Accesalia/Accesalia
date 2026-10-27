"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { alVolver, anterior, ruta } from "./rastroPantallas";

// LA SALIDA, EN LA BARRA NEGRA (Monica, 12-oct-2026): "el boton volver, con la
// flecha a la izquierda, esta en la pantalla de fondo verde: al navegar dentro
// de la pagina se queda arriba tapado al hacer scroll. Quiero subirlo a la
// barra negra, mismo texto y acceso que ahora; es solo la posicion".
//
// Cada pantalla la sigue poniendo donde siempre, con su texto y su destino; la
// pieza la lleva al hueco de la barra (BarraSuperior, id="barra-salida"), que va
// pegada arriba. Si la pantalla no tiene barra, se queda donde esta.

export const HUECO_SALIDA = "barra-salida";
const EN_BARRA = "whitespace-nowrap text-sm font-semibold text-white/75 transition hover:text-white";
const EN_PAGINA = "text-sm font-semibold text-carbon/65 transition hover:text-carbon";

function useHueco() {
  const [hueco, setHueco] = useState<HTMLElement | null | undefined>(undefined);
  useEffect(() => setHueco(document.getElementById(HUECO_SALIDA)), []);
  return hueco;
}

/** Un enlace de salida: "← Menú", "← La oportunidad"…
 *
 *  VUELVE A LA PANTALLA ANTERIOR DE VERDAD (Monica, 27-oct-2026: «los botones de volver no llevan a la pantalla
 *  anterior, es desconcertante»). `href` es solo el destino si se entro aqui directamente (un enlace pegado, una
 *  pestaña nueva). Si la anterior es ese mismo sitio, conserva su texto; si es otro, dice «← Volver». */
export function Salida({ href, children }: { href: string; children: React.ReactNode }) {
  const hueco = useHueco();
  const [antes, setAntes] = useState<string | null>(null);
  useEffect(() => setAntes(anterior()), []);
  if (hueco === undefined) return null; // aun no se sabe si hay barra: no parpadea
  const destino = antes ?? href;
  const texto = !antes || ruta(antes) === ruta(href) ? children : "← Volver";
  const enlace = (clase: string) => (
    <Link href={destino} onClick={() => antes && alVolver()} className={clase}>
      {texto}
    </Link>
  );
  if (!hueco) return enlace(EN_PAGINA + " print:hidden");
  return createPortal(enlace(EN_BARRA), hueco);
}

/** Lo mismo para un boton (el "← Volver" que vuelve a la pagina de antes). */
export function SalidaBoton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const hueco = useHueco();
  if (hueco === undefined) return null;
  const boton = (enBarra: boolean) => (
    <button type="button" onClick={onClick} className={(enBarra ? EN_BARRA : EN_PAGINA) + " print:hidden"}>
      {children}
    </button>
  );
  return hueco ? createPortal(boton(true), hueco) : boton(false);
}
