// lib/hojaBase.ts
//
// LAS HOJAS BASE (Monica, 14-oct-2026). Lo que dijeron en el alta que les
// interesa ("de lo que vendemos, que quieren": oportunidad_tipos) sale premarcado
// al hacer la hoja, en DOS hojas base:
//   - la de SUBVENCIONES: solo la subvencion (que arrastra la documentacion
//     tecnica y sus tres documentos);
//   - la de LO DEMAS: las obras como actuaciones con su redaccion de proyecto, y
//     el resto como sus bloques.
// Todo se puede cambiar despues: esto solo ahorra clics.
//
// Como se traduce cada interes:
//   - LAS OBRAS (accesibilidad y eficiencia del alta, y "Otros - proyecto
//     tecnico") -> una actuacion de ese tipo + REDACCION DE PROYECTO. Todas
//     proyecto, nunca memoria por defecto ("o se elegiria memoria directamente").
//     "Otros - proyecto tecnico" es lo excepcional (humedades, gargolas...): el
//     texto se escribe a mano.
//   - lo demas -> su bloque, por el nombre del interes.

import { COLUMNAS_INTERES } from "./columnasInteres";

/** El interes del alta -> el codigo de su bloque en el catalogo. */
export const BLOQUE_DE: Record<string, string> = {
  IEE: "IEE",
  LEE: "LEE",
  CEE: "CEE",
  CFO: "CERTIFICADO FIN DE OBRA",
  Licencia: "TRAMITACION LICENCIAS",
  "Visado Colegio": "VISADO",
  "Memoria técnica valorada": "MEMORIA TECNICA",
  "Informe técnico": "INFORME TECNICO",
  "Informe pericial": "INFORME PERICIAL",
  "Consulta urbanística": "CONSULTA URBANISTICA",
  "3 Presupuestos": "TRAMITACION 3 PRESUPUESTOS",
  CAES: "GESTION DE CAES",
  Financiación: "SOLICITUD DE FINANCIACION",
  DF: "DF",
  CSS: "CSS",
  "Toma de datos y Modelado 3D": "TOMA DE DATOS Y MODELADO 3D",
};
export const SUBVENCION: Record<string, string> = {
  Subvenciones: "TRAMITACION SUBVENCIONES",
  "Doc técnica subv (IEE+CEE+LEE)": "DOCUMENTACION TECNICA SUBVENCIONES",
};
const PROYECTO = "REDACCION PROYECTO";

/** Las obras: las columnas de accesibilidad y eficiencia del alta, y las que
 *  aun no tienen sitio en ellas. */
export const OBRAS = new Set([
  ...COLUMNAS_INTERES.filter((c) => c.titulo === "Accesibilidad" || c.titulo === "Eficiencia").flatMap((c) => c.nombres),
  "Sustitución de ascensor",
  "Otros - proyecto técnico",
]);

export type Base = "subvenciones" | "resto";

/** ¿Que hojas base tiene esta oportunidad? Las que tienen algo que marcar. */
export function basesDe(interes: { nombre: string }[]): Base[] {
  const subv = interes.some((t) => SUBVENCION[t.nombre]);
  const resto = interes.some((t) => OBRAS.has(t.nombre) || BLOQUE_DE[t.nombre]);
  return [...(subv ? (["subvenciones"] as const) : []), ...(resto ? (["resto"] as const) : [])];
}

/** Lo que sale premarcado en una hoja base: las actuaciones (tipos de la
 *  cabecera) y los codigos de los bloques. Las actuaciones son las obras; si no
 *  hay ninguna, el primer interes que pueda ir en la cabecera, para que la hoja
 *  tenga su "que se hace". */
export function hojaBase(
  base: Base,
  interes: { id: string; nombre: string }[],
  enCabecera: (tipoId: string) => boolean,
): { tipos: string[]; bloques: string[] } {
  const obras = interes.filter((t) => OBRAS.has(t.nombre) && enCabecera(t.id));
  const deEsta = interes.filter((t) => (base === "subvenciones" ? SUBVENCION[t.nombre] : BLOQUE_DE[t.nombre]));
  const bloques = deEsta.map((t) => (base === "subvenciones" ? SUBVENCION : BLOQUE_DE)[t.nombre]);
  if (base === "resto" && obras.length) bloques.unshift(PROYECTO);
  const tipos = obras.length ? obras.map((t) => t.id) : deEsta.filter((t) => enCabecera(t.id)).slice(0, 1).map((t) => t.id);
  return { tipos, bloques: [...new Set(bloques)] };
}
