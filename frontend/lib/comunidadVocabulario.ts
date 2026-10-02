// lib/comunidadVocabulario.ts
//
// << NOMBRE DE FICHERO PROPUESTO POR CLAUDE, PENDIENTE DE SU OK >>
// Sigue el patron que ya existe en lib/oportunidadVocabulario.ts.
//
// Las palabras de la comunidad. SIN "server-only" a proposito, porque las
// necesitan las dos orillas: la pantalla para pintar el selector y el servidor
// para validar lo que llega.

/** LAS SIETE FIGURAS, EN EL ORDEN EN QUE SE ENSEÑAN.
 *
 *  El orden es de Monica (2-oct-2026) y es POR FRECUENCIA DE USO, no por la
 *  ley: lo que mas se da, primero. Por eso la lista no sigue el orden del
 *  articulo 2 de la LPH.
 *
 *  ESTA LISTA Y EL CHECK DE LA BASE SON LA MISMA COSA EN DOS SITIOS, y no hay
 *  manera de que un CHECK de Postgres lea un fichero de TypeScript. Asi que si
 *  se toca una hay que tocar la otra: el CHECK vive en
 *  supabase/migrations/20261002000000_figura_mancomunidad_y_comunidad_del_acceso.sql
 *  y se llama comunidades_figura_check. El CHECK dice QUE VALE; esta lista dice
 *  EN QUE ORDEN se ve.
 *
 *  Vacio es un valor legitimo: "no consta". No se rellena a ojo. */
export const FIGURAS = [
  "Comunidad de Propietarios",
  "Mancomunidad",
  "Entidad Urbanística",
  "Propietario Particular",
  "Propietario Empresa",
  "Subcomunidad",
  "Comunidad sin título constitutivo",
] as const;

export type Figura = (typeof FIGURAS)[number];

/** Para validar lo que llega de un formulario antes de mandarlo a la base, y
 *  que el error salga en la pantalla en vez de como un 400 de Postgres. */
export function esFigura(v: unknown): v is Figura {
  return typeof v === "string" && (FIGURAS as readonly string[]).includes(v);
}
