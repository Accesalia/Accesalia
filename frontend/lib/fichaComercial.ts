// lib/fichaComercial.ts
//
// LA FICHA COMERCIAL COMPLETA: su pagina propia, una por oportunidad.
// Dictada por Monica el 12-sep-2026 (indice en su mensaje y en memoria).
//
// REGLA DE MODELADO, dicha por ella: "esta ficha es la semilla del expediente
// 360; muchos de los datos que incorporamos NO van a tablas comerciales aunque
// se incorporen aqui y se vean aqui". Por eso esto es una VENTANA: cada bloque
// dice de donde saldra el dato cuando exista. Regla practica: si un tecnico lo
// va a querer tres meses despues, no es un dato comercial.
//
// Hoy casi nada de esto vive en la base. La demostracion del fantasma lo trae
// inventado; una oportunidad de verdad ensena la ficha con sus huecos.

import "server-only";
import type { EntradaCuadro, FichaExtracto, HitoCobro } from "./cuadroComercial";

/** Una version de un documento. La ultima enviada manda. */
export type VersionDoc = { version: string; fecha: string; nota: string | null; href: string | null };

export type DocumentoComercial = {
  rotulo: string;
  versiones: VersionDoc[]; // de la mas nueva a la mas vieja
  falta: string; // que decir cuando no hay ninguna
};

export type PersonaFicha = {
  nombre: string;
  papel: string;
  telefono: string | null;
  email: string | null;
  porQue: string | null; // "su madre está en silla de ruedas desde este año"
};

/** El retrato del edificio. Vive en la COMUNIDAD, no en lo comercial. */
export type Edificio = {
  viviendas: number | null;
  anio: number | null;
  fachadas: number | null;
  tipoFachada: string | null;
  portalAccesible: boolean | null;
  ascensor: boolean | null;
  iee: string | null; // fecha de la IEE pasada, o null
  problemas: string[]; // lo que los vecinos dicen que tiene
};

/** Lo que un comercial sabe y no cabe en un campo. */
export type NotaOlfato = { tipo: string; texto: string };

export type Administrador = {
  nombre: string;
  desde: string | null; // cuanto hace que le conocemos
  viabilidades: number | null;
  firmadas: { fecha: string; que: string; importe: number }[];
  valoracion: string | null;
};

export type PasoConFecha = { numero: string | null; nombre: string; fecha: string | null; estado: string };

export type FichaComercial = {
  id: string;
  nombre: string;
  empresa: string | null;
  persona: string | null;
  que: string | null;
  precio: number | null;
  cobra: boolean | null; // si el administrador se lleva comision
  firmada: string | null; // el dia que se dio por buena la hoja
  pasos: PasoConFecha[]; // los tiempos: guardados aunque no se pinten en la lista
  documentos: DocumentoComercial[];
  tresPresupuestos: { aplica: boolean; nota: string } | null;
  financiacion: { ofrecida: boolean; entidad: string | null; nota: string } | null;
  tresD: { haceFalta: boolean; cual: string | null; tipo: string | null; href: string | null; nota: string } | null;
  junta: { haceFalta: boolean; fecha: string | null; nota: string } | null;
  personas: PersonaFicha[];
  edificio: Edificio;
  olfato: NotaOlfato[];
  administrador: Administrador | null;
  hitos: HitoCobro[];
  diario: EntradaCuadro[];
  extracto: FichaExtracto | null; // lo que ya se ve desplegado en la lista
};

export const EDIFICIO_VACIO: Edificio = {
  viviendas: null, anio: null, fachadas: null, tipoFachada: null,
  portalAccesible: null, ascensor: null, iee: null, problemas: [],
};
