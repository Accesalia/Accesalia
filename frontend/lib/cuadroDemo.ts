// lib/cuadroDemo.ts
//
// MODO DEMOSTRACION del cuadro de mando comercial: "Comercial Fantasma".
//
// Para que se vea la pantalla llena antes de tener los datos de verdad (idea de
// Monica, 11-sep-2026: "para ponerle los ojos golosos"). NO escribe nada en la
// base: los datos inventados viven aqui, en el codigo. Lo unico que lee de la
// base es lo que ya es real y no es de nadie en concreto: los pasos, los
// umbrales de alerta y el mapa.
//
// PARA QUITARLO: borrar este fichero y la opcion "Fantasma" de
// app/comercial/page.tsx. No hay nada que limpiar en la base.

import "server-only";
import { mapaDe, pasosComerciales, umbrales, type CuadroComercial, type EstadoTramo } from "./cuadroComercial";

export const ID_FANTASMA = "fantasma";

// Fechas relativas a hoy, para que la demostracion no envejezca.
const dia = (desplazamiento: number) => {
  const d = new Date();
  d.setDate(d.getDate() + desplazamiento);
  return d.toISOString().slice(0, 10);
};
const DIA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric" });

// Una barra: cada paso con su estado. Lo que no se dice, pendiente.
const ORDEN = ["primer_contacto", "visita", "polycam", "viabilidad_arquitecto", "preparacion_documentos",
  "envio_documentos", "tresd", "junta", "firma", "cobro"];
function barra(hechos: string[], actual: string | null, noAplica: string[] = ["tresd"], tambienActual: string[] = []) {
  const t: Record<string, EstadoTramo> = {};
  for (const k of ORDEN) {
    t[k] = noAplica.includes(k) ? "no_aplica"
      : hechos.includes(k) ? "hecho"
      : k === actual || tambienActual.includes(k) ? "actual"
      : "pendiente";
  }
  return t;
}
const H = (hasta: number) => ORDEN.filter((k) => k !== "tresd").slice(0, hasta);

export async function cuadroDemo(): Promise<CuadroComercial> {
  const [pasos, u, mapa] = await Promise.all([pasosComerciales(), umbrales(), mapaDe(null)]);

  return {
    demo: true,
    pasos,
    umbralParado: u.parado,
    umbralSinContacto: u.sinContacto,
    mapa,

    agenda: [
      { id: "t1", texto: "Enviar la hoja de encargo firmada a Fincas Monge", donde: "Alhelí 2, Leganés · Beatriz Martínez", fecha: dia(-1), hora: null },
      { id: "t2", texto: "Llamar a Toñi Cárdenas: quieren saber si entra en subvención", donde: "Río Duero 12, Leganés", fecha: dia(0), hora: null },
      { id: "t3", texto: "Cita en la oficina de Fermín Monge — vamos a ver tres portales", donde: "Sin dirección todavía · saldrán 3 oportunidades", fecha: dia(0), hora: "17:00" },
      { id: "t4", texto: "Concertar visita técnica con Pedro Aranda (Thyssen)", donde: "Sepúlveda 160, Madrid", fecha: dia(2), hora: null },
      { id: "t5", texto: "Presupuesto prometido a la comisión de obras", donde: "Eras 9, Fuenlabrada", fecha: dia(3), hora: null },
      { id: "t6", texto: "Junta de votación — Villaraco Asesores", donde: "Doctor Fleming 44, Madrid", fecha: dia(1), hora: "20:00" },
    ],

    diario: [
      { id: "d1", fecha: dia(0), tipo: "visita", con: "Beatriz Martínez", revisar: false, href: null,
        texto: "Hemos ido a ver el portal. El foso da problemas, hay contadores que habría que mover. Beatriz dice que no quieren tocar los buzones bajo ningún concepto." },
      { id: "d2", fecha: dia(-1), tipo: "llamada", con: "Fermín Monge", revisar: true, href: null,
        texto: "Me llama Fermín, que el martes me lleva a ver tres portales que tienen ascensor. Quedamos en su oficina y vamos desde allí." },
      { id: "d3", fecha: dia(-3), tipo: "junta", con: "Villaraco", revisar: false, href: null,
        texto: "Confirman junta mañana a las 20:00. Piden llevar el 3D para enseñarlo a los vecinos." },
      { id: "d4", fecha: dia(-4), tipo: "correo", con: null, revisar: false, href: null,
        texto: "Pedro Aranda pasa el contacto de Sepúlveda 160. Ya tienen el ascensor decidido con Thyssen, nos quieren para el proyecto y la licencia." },
      { id: "d5", fecha: dia(-5), tipo: "llamada", con: "Toñi Cárdenas", revisar: false, href: null,
        texto: "Pregunta por Río Duero 12. Quiere saber si entra en la convocatoria de accesibilidad antes de llevarlo a junta." },
      { id: "d6", fecha: dia(-7), tipo: "visita", con: null, revisar: false, href: null,
        texto: "Eras 9. Comisión de obras muy metida en el tema, tres vecinos. Quieren presupuesto cerrado antes del 15." },
      { id: "d7", fecha: dia(-8), tipo: "correo", con: "Trébol", revisar: false, href: null,
        texto: "Reclaman la viabilidad de Sepúlveda. Les digo que está con el arquitecto." },
    ],

    oportunidades: [
      {
        id: "o1", nombre: "ALHELÍ 2 LEGANÉS", sinComunidad: false,
        empresa: "Marcal Asesores (Leganés)", persona: "Beatriz Martínez", prestada: true, trajo: null,
        precio: 14500, que: "Ascensor + licencia",
        tramos: barra(H(5), "envio_documentos"),
        actual: { numero: "6", nombre: "Envío a la comunidad", ajeno: false, quien: null },
        diasAqui: 23, esperando: null, proximo: null, ultimoContacto: dia(-14), href: "#",
      },
      {
        id: "o2", nombre: "SEPÚLVEDA 160 MADRID", sinComunidad: false,
        empresa: "Trébol", persona: null, prestada: false, trajo: "Pedro Aranda (Thyssen)",
        precio: 9800, que: "Ascensor",
        tramos: barra(H(3), "viabilidad_arquitecto"),
        actual: { numero: "4", nombre: "Viabilidad arquitecto", ajeno: true, quien: "arquitecto" },
        diasAqui: 9, esperando: "al arquitecto", proximo: null, ultimoContacto: dia(-10), href: "#",
      },
      {
        id: "o3", nombre: "CARLOS FUENTES 61 MADRID", sinComunidad: false,
        empresa: "Trébol", persona: null, prestada: false, trajo: "Javier Parra (Schindler)",
        precio: 11200, que: "Ascensor",
        // La trae Schindler: la viabilidad la hacen ellos, asi que ese paso no aplica.
        tramos: barra(["primer_contacto", "visita", "polycam", "preparacion_documentos"], "envio_documentos", ["tresd", "viabilidad_arquitecto"]),
        actual: { numero: "6", nombre: "Envío a la comunidad", ajeno: false, quien: null },
        diasAqui: 4, esperando: null, proximo: null, ultimoContacto: dia(-4), href: "#",
      },
      {
        id: "o4", nombre: "DOCTOR FLEMING 44 MADRID", sinComunidad: false,
        empresa: "Villaraco Asesores", persona: null, prestada: false, trajo: null,
        precio: 21300, que: "SATE + cubierta",
        // La junta pidio el 3D y era de catalogo: listo al momento.
        tramos: barra([...H(6), "tresd"], "junta", []),
        actual: { numero: "7", nombre: "Junta de votación", ajeno: false, quien: null },
        diasAqui: 6, esperando: null, proximo: `junta el ${DIA.format(new Date(dia(1)))}`, ultimoContacto: dia(-3), href: "#",
      },
      {
        id: "o5", nombre: "AV. BADAJOZ 18 MADRID", sinComunidad: false,
        empresa: "Effic", persona: null, prestada: false, trajo: null,
        precio: 16800, que: "Ascensor + subvención",
        // 3D a medida: encargado al tecnico y esperando a que lo tenga.
        tramos: barra(H(6), "junta", [], ["tresd"]),
        actual: { numero: "7", nombre: "Junta de votación", ajeno: false, quien: null },
        diasAqui: 6, esperando: "el 3D a medida", proximo: `junta el ${DIA.format(new Date(dia(6)))}`, ultimoContacto: dia(-2), href: "#",
      },
      {
        id: "o6", nombre: "BANDERAS DE CASTILLA 25", sinComunidad: true,
        empresa: "Marcal Asesores (Castilla-La Mancha)", persona: null, prestada: true, trajo: null,
        precio: null, que: null,
        tramos: barra([], "primer_contacto"),
        actual: { numero: "1", nombre: "Primer contacto", ajeno: false, quien: null },
        diasAqui: 120, esperando: null, proximo: null, ultimoContacto: dia(-122), href: "#",
      },
    ],

    cifras: [
      { etiqueta: "Administradores nuevos", valor: "7", pie: "2 más que el trimestre anterior" },
      { etiqueta: "Hojas enviadas", valor: "23", pie: "de 31 oportunidades" },
      { etiqueta: "Hojas firmadas", valor: "14", pie: "9 sin respuesta", acento: true },
      { etiqueta: "Contratado", valor: "168.400 €", pie: "suma de lo firmado", acento: true },
      { etiqueta: "Comisión generada", valor: "5.052 €", pie: "sin liquidar" },
      { etiqueta: "Acaba en firma", valor: "61 %", pie: "14 de 23 enviadas" },
      { etiqueta: "Hasta la firma", valor: "47 días", pie: "la más lenta, 6 meses" },
      { etiqueta: "Encargo medio", valor: "12.030 €", pie: "el mayor, 38.900 €" },
    ],

    cartera: {
      cifras: [
        { valor: "25", etiqueta: "administraciones" },
        { valor: "132", etiqueta: "comunidades" },
        { valor: "18", etiqueta: "prestadas" },
      ],
      mias: [
        { nombre: "Trébol", dato: "9" },
        { nombre: "Effic", dato: "7" },
        { nombre: "Administración Rey", dato: "5" },
        { nombre: "Marcal (Leganés)", dato: "3", prestada: true },
      ],
      estrella: [
        { nombre: "Trébol", dato: "4 · 41.200 €" },
        { nombre: "Fincas Ortega Delgado", dato: "3 · 28.700 €" },
        { nombre: "Del Brío y Blanco", dato: "2 · 24.100 €" },
        { nombre: "Effic", dato: "2 · 19.500 €" },
        { nombre: "Administración Rey", dato: "1 · 12.400 €" },
      ],
      marean: [
        { nombre: "Villaraco Asesores", dato: "11 · 0" },
        { nombre: "Martín y Lorente", dato: "9 · 1" },
        { nombre: "Jimeco", dato: "8 · 0" },
        { nombre: "SM Fincas", dato: "7 · 1" },
        { nombre: "Vallejo y Lara", dato: "6 · 0" },
      ],
      faltaEstrella: "",
      faltaMarean: "",
    },
  };
}
