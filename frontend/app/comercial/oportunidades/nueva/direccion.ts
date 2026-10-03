"use server";

// Lo que la ventana "Buscar la direccion" le pide al servidor, paso a paso.
// Toda la logica esta en lib/buscarDireccion.ts; aqui solo se comprueba quien
// pregunta. Ver la maqueta en docs/figma/buscar-direccion.html.

import {
  buscarCalle,
  buscarNumero,
  guardarFicha,
  partirLinea,
  portalesDe,
  type BuscarCalle,
  type BuscarNumero,
  type Entendido,
  type Portal,
  type Via,
} from "../../../../lib/buscarDireccion";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

async function puede() {
  const yo = await quienSoy();
  if (!yo || (!puedeEntrar(yo, "comercial") && !puedeEntrar(yo, "administracion"))) {
    throw new Error("Sin permiso");
  }
}

export async function entender(escrito: string): Promise<Entendido> {
  await puede();
  return partirLinea(escrito);
}

export async function buscarLaCalle(calle: string, municipio: string, tipo: string): Promise<BuscarCalle> {
  await puede();
  return buscarCalle(calle, municipio, tipo);
}

export async function buscarElNumero(via: Via, numero: string): Promise<BuscarNumero> {
  await puede();
  return buscarNumero(via, numero);
}

export async function verPortales(parcelas: string[]): Promise<Portal[]> {
  await puede();
  return portalesDe(parcelas);
}

/**
 * EL DISPARADOR DE LA FICHA (Monica, 3-oct-2026): el comercial ha dicho que la
 * direccion es esa, y en ese momento se guarda la ficha de Catastro de cada
 * parcela. Devuelve los portales elegidos ya guardados, con su id, para que el
 * formulario los enlace a la oportunidad al guardarla.
 */
export async function confirmarDireccion(parcelas: string[], claves: string[]): Promise<{ portalIds: string[] }> {
  await puede();
  const portalIds: string[] = [];
  for (const parcela of parcelas) {
    const ficha = await guardarFicha(parcela);
    for (const p of ficha.portales) {
      if (claves.includes(`${parcela}|${p.numero}|${p.escalera}`)) portalIds.push(p.id);
    }
  }
  return { portalIds };
}
