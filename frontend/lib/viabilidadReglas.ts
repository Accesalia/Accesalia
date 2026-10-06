// lib/viabilidadReglas.ts
//
// Lo que tiene que tener una viabilidad para poder generarla. Aparte y sin
// "server-only" porque lo usan las dos puntas: la pantalla, para decirlo
// mientras se escribe, y el servidor, que no se fia y lo vuelve a mirar.

import type { DocViabilidad } from "./viabilidadComercial";

type Para = Pick<DocViabilidad, "capturaUrl" | "objeto" | "obra" | "tasas" | "conHonorarios" | "honorarios">;

/** Vacio = se puede generar. */
export function loQueFalta(d: Para): string[] {
  const falta: string[] = [];
  if (!d.capturaUrl) falta.push("la captura del 3D (la guarda Alex en la mesa)");
  if (!d.objeto.trim()) falta.push("el objeto del proyecto");
  if (!d.obra.length) falta.push("el coste de obra estimado (lo pone Alex)");
  // "Tasas e ICIO van SIEMPRE: toda obra lleva licencia o DR."
  if (!d.tasas.some((t) => t.importe)) falta.push("las tasas e ICIO");
  if (d.conHonorarios && !d.honorarios.length)
    falta.push("los honorarios: prepara la hoja de encargo (puede quedar en borrador) o marca «sin honorarios»");
  return falta;
}
