// lib/casarBusqueda.ts
//
// SI LO QUE SE ESCRIBE CASA CON UNA OPCION DEL BUSCADOR (Monica, 15-oct-2026:
// "hay alguna pantalla donde meta una direccion y me salga la opp?"). Una opcion
// casa por su NOMBRE o por cualquiera de sus PORTALES: los accesos de la opp y
// los de su clave DIR (los otros portales del mismo edificio), y el propio
// codigo DIR. Asi "etruria 58" encuentra la opp "Etruria 56" si el 58 es otro
// portal suyo.
//
// Sin "server-only": lo usan la pantalla (el desplegable filtra al escribir) y
// el servidor (la lista entera de "Buscar") con la misma regla.

export type ConPortales = { nombre: string; detalle: string; portales?: string[] };

export const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const palabrasDe = (q: string) => limpio(q).split(/[\s,.]+/).filter(Boolean);

/** Todas las palabras en el texto; un NUMERO tiene que ser un numero entero de
 *  `conNumeros`: "mostoles 3" no es "Carlos V 32" ni el codigo DAN-2023. */
function casaTexto(palabras: string[], conNumeros: string, resto: string) {
  const t = `${limpio(conNumeros)} ${limpio(resto)}`;
  const numeros: string[] = limpio(conNumeros).match(/\d+/g) ?? [];
  return palabras.every((p) => (/^\d+$/.test(p) ? numeros.includes(p) : t.includes(p)));
}

/** null si no casa; si casa, por donde: por su nombre (por: null) o por uno de
 *  sus portales (por: ese portal, para enseñarlo). Un portal se mira entero, con
 *  su numero: "etruria 3" no casa por tener Etruria 56 y otro portal en el 3. */
export function casa(palabras: string[], s: ConPortales): { por: string | null } | null {
  if (!palabras.length) return null;
  if (casaTexto(palabras, s.nombre, s.detalle)) return { por: null };
  for (const p of s.portales ?? []) if (casaTexto(palabras, p, s.detalle)) return { por: p };
  return null;
}
