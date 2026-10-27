"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { apuntar } from "./rastroPantallas";

// Apunta cada pantalla por la que se pasa (ver rastroPantallas.ts). Va en el layout, una vez para toda la app.
export function Rastro() {
  const pathname = usePathname();
  const consulta = useSearchParams().toString();
  useEffect(() => {
    apuntar(window.location.pathname + window.location.search);
  }, [pathname, consulta]);
  return null;
}
