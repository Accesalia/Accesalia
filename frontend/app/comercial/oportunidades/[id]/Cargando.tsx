"use client";

import { useLinkStatus } from "next/link";

// AL PULSAR UNA PESTAÑA (Monica, 29-oct-2026: «tarda como 2 segundos, me llama la atencion»): mientras llega el bloque, un
// punto que late dentro del enlace pulsado, para que se vea al instante que lo ha recogido. Va DENTRO de un <Link>.
export function Cargando() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-label="Cargando" className="ml-1.5 inline-block h-2 w-2 shrink-0 animate-pulse self-center rounded-full bg-current" /> : null;
}
