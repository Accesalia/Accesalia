"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// LO GRABADO SE VE AL MOMENTO (Oscar, por Monica, 28-oct-2026: «hasta que no
// sale y vuelve a entrar no se le actualiza el dato»; grabo notas con un
// administrador delante, fue a mirarlas y no estaban, y penso que las habia
// perdido. Estaban guardadas: lo viejo era la pantalla).
//
// Dos avisos, y quien enseña datos que se piden aparte (el diario desplegado de
// una opp) los escucha para volver a pedirlos:
//  · al guardar algo, quien guarda llama a `avisarDatosNuevos()`;
//  · al volver a la app (otra pestaña, el movil que se desbloquea, el ordenador
//    despues de grabar en el movil), se refresca la pantalla sola.

export const DATOS_NUEVOS = "accesalia:datos-nuevos";

/** Lo llama quien acaba de guardar: refresca lo que se pide aparte. */
export function avisarDatosNuevos() {
  window.dispatchEvent(new Event(DATOS_NUEVOS));
}

/** Escuchar el aviso (al guardar y al volver a la app). */
export function useAlDia(alCambiar: () => void) {
  useEffect(() => {
    window.addEventListener(DATOS_NUEVOS, alCambiar);
    return () => window.removeEventListener(DATOS_NUEVOS, alCambiar);
  }, [alCambiar]);
}

/** Va una vez en el marco de la app. Al volver tras mas de 15 s fuera, refresca. */
export function AlDia() {
  const router = useRouter();
  useEffect(() => {
    let fuera = 0;
    const cambio = () => {
      if (document.visibilityState === "hidden") fuera = Date.now();
      else if (fuera && Date.now() - fuera > 15_000) {
        fuera = 0;
        router.refresh();
        avisarDatosNuevos();
      }
    };
    document.addEventListener("visibilitychange", cambio);
    return () => document.removeEventListener("visibilitychange", cambio);
  }, [router]);
  return null;
}
