"use server";

import { quienSoy } from "../../lib/sesion";
import { puedeVerCobros, puedeVerEcobalance } from "../../lib/cobros";
import { opcionesFicha, type OpcionFicha } from "../../lib/fichaFinanciera";

/** La lista del buscador «Buscar la facturacion de una opp»: las opps con hoja
 *  firmada, la ultima firma primero (la misma que la ficha financiera). Se pide la
 *  primera vez que se pincha, para no cargarla en cada pantalla del area. */
export async function accionOpcionesFacturacion(): Promise<OpcionFicha[]> {
  const yo = await quienSoy();
  if (!yo || !(puedeVerCobros(yo) || puedeVerEcobalance(yo))) return [];
  return opcionesFicha();
}
