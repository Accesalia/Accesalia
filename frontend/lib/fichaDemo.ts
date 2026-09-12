// lib/fichaDemo.ts
//
// Los datos INVENTADOS de la ficha comercial completa, para la demostracion del
// comercial fantasma. No toca la base. Igual que cuadroDemo: para quitarlo,
// borrar el fichero.
//
// Solo dos oportunidades van completas del todo (ALHELI 2, que es la que Monica
// dibujo, y RIO DUERO 12, que ya esta firmada y en cobro). Las demas ensenan la
// ficha a medio llenar, que es lo normal y lo que hay que saber mirar.

import "server-only";
import { firmadasDemo, oportunidadesDemo } from "./cuadroDemo";
import { EDIFICIO_VACIO, type FichaComercial } from "./fichaComercial";
import type { EntradaCuadro } from "./cuadroComercial";

const dia = (d: number) => {
  const f = new Date();
  f.setDate(f.getDate() + d);
  return f.toISOString().slice(0, 10);
};

const PASOS = [
  ["1", "Primer contacto"], ["2", "Visita al inmueble"], ["3", "Escaneo Polycam"],
  ["4", "Viabilidad arquitecto"], ["5", "VB + HE + PPTO"], ["6", "Envío a la comunidad"],
  [null, "3D para la junta"], ["7", "Junta de votación"], ["8", "Firma"], ["9", "Cobro"],
] as const;

/** Los tiempos de cada paso: lo que alimenta las estadisticas de rendimiento. */
function tiempos(fechas: (number | null)[]): FichaComercial["pasos"] {
  return PASOS.map(([numero, nombre], i) => {
    const d = fechas[i];
    return {
      numero,
      nombre,
      fecha: d === null || d === undefined ? null : dia(d),
      estado: d === null || d === undefined ? "pendiente" : "hecho",
    };
  });
}

const DETALLE: Record<string, Partial<FichaComercial>> = {
  // ------------------------------------------------------------------ ALHELÍ 2
  o1: {
    cobra: true,
    pasos: tiempos([-96, -88, -84, -70, -52, -14, null, null, null, null]),
    documentos: [
      {
        rotulo: "Informe de viabilidad",
        falta: "sin hacer",
        versiones: [{ version: "v2", fecha: dia(-52), nota: "rehecha tras la sentencia del local", href: "#" },
                    { version: "v1", fecha: dia(-70), nota: null, href: "#" }],
      },
      {
        rotulo: "Presupuesto",
        falta: "sin hacer",
        versiones: [{ version: "v3", fecha: dia(-14), nota: "actualizado por la subida de precios · la enviada", href: "#" },
                    { version: "v2", fecha: dia(-50), nota: "con el foso reducido", href: "#" },
                    { version: "v1", fecha: dia(-68), nota: null, href: "#" }],
      },
      {
        rotulo: "Hoja de encargo",
        falta: "sin hacer",
        versiones: [{ version: "v2", fecha: dia(-14), nota: "la enviada, pendiente de firma", href: "#" },
                    { version: "v1", fecha: dia(-68), nota: "caducada al pararse por el juicio", href: "#" }],
      },
    ],
    tresPresupuestos: { aplica: true, nota: "Los pide la subvención. Los buscamos nosotros: el cliente es nuestro." },
    financiacion: { ofrecida: true, entidad: "UCI", nota: "Ofrecida en la visita. Interesados, pendiente de la junta." },
    tresD: { haceFalta: false, cual: null, tipo: null, href: null, nota: "No lo han pedido: el portal es sencillo de explicar." },
    junta: { haceFalta: true, fecha: null, nota: "Sin convocar todavía. Beatriz la mete en la ordinaria de octubre." },
    personas: [
      { nombre: "Beatriz Martínez", papel: "administradora", telefono: "654 99 88 32", email: "bmartinez@marcalasesores.es", porQue: null },
      { nombre: "Juan Vicente Arroyo", papel: "presidente", telefono: "610 24 77 05", email: "jvarroyo.presidente@gmail.com", porQue: "Nos apoya desde la primera visita." },
      { nombre: "María Cuesta", papel: "vecina · comisión de obras", telefono: "627 31 40 12", email: "maria.cuesta89@gmail.com", porQue: "Esto lo mueve ella: su madre está en silla de ruedas desde este año." },
      { nombre: "Ramón Solís", papel: "vecino del bajo", telefono: null, email: null, porQue: "El que se opone. No quiere ascensor bajo ningún concepto." },
    ],
    edificio: {
      viviendas: 24, anio: 1968, fachadas: 2, tipoFachada: "ladrillo cara vista",
      portalAccesible: false, ascensor: false, iee: dia(-1500),
      problemas: ["Humedades en el patio interior", "Los buzones no se pueden tocar", "Contadores en medio del foso"],
    },
    olfato: [
      { tipo: "palanca", texto: "Dos vecinos en silla de ruedas: el ascensor no es opcional, es legalmente obligatorio." },
      { tipo: "oposición", texto: "Los del bajo son intratables y no quieren ascensor bajo ningún concepto." },
      { tipo: "carácter", texto: "Comunidad trabajadora, sin dinero de sobra pero cumplidora. Han aguantado un juicio de dos años sin rendirse." },
      { tipo: "oportunidad cruzada", texto: "Tienen caldera comunitaria. Habría que comentarles cambiarla por aerotermia y optar a las Next Generation: les saldría mejor económicamente." },
    ],
    administrador: {
      nombre: "Marcal Asesores (Leganés) · Beatriz Martínez",
      desde: "2019",
      viabilidades: 11,
      firmadas: [
        { fecha: dia(-120), que: "Ascensor", importe: 12400 },
        { fecha: dia(-400), que: "SATE", importe: 28900 },
        { fecha: dia(-760), que: "Ascensor + licencia", importe: 15600 },
      ],
      valoracion: "De los buenos. Contesta, avisa cuando algo se retrasa y no regatea el precio. Es cartera prestada de otro comercial.",
    },
  },

  // -------------------------------------------------------------- SEPÚLVEDA 160
  o2: {
    cobra: true,
    pasos: tiempos([-22, -10, -10, null, null, null, null, null, null, null]),
    tresPresupuestos: { aplica: false, nota: "La trae Thyssen: la obra es suya. No les pasamos por encima." },
    financiacion: { ofrecida: false, entidad: null, nota: "Sin hablar todavía." },
    personas: [
      { nombre: "Pedro Aranda", papel: "lo trajo · Thyssen", telefono: "649 05 22 18", email: "paranda@thyssen.es", porQue: "El ascensor ya está decidido con ellos." },
      { nombre: "Trébol · centralita", papel: "administración", telefono: "915 44 10 90", email: "administracion@trebolfincas.es", porQue: null },
    ],
    edificio: { ...EDIFICIO_VACIO, viviendas: 18, anio: 1975, portalAccesible: false, ascensor: false, problemas: ["Entrada con dos escalones"] },
    olfato: [{ tipo: "aviso", texto: "Aquí no vendemos ascensor: vendemos proyecto y licencia. Cuidado con ofrecer lo que ya tienen." }],
  },

  // -------------------------------------------------------- BANDERAS DE CASTILLA
  o6: {
    cobra: null,
    pasos: tiempos([-122, null, null, null, null, null, null, null, null, null]),
    tresPresupuestos: null,
    financiacion: null,
    personas: [],
    edificio: EDIFICIO_VACIO,
    olfato: [],
  },

  // ------------------------------------------------------------- RÍO DUERO 12
  f2: {
    cobra: true,
    pasos: tiempos([-190, -170, -168, -150, -120, -110, null, -90, -76, -66]),
    documentos: [
      { rotulo: "Informe de viabilidad", falta: "sin hacer", versiones: [{ version: "v1", fecha: dia(-120), nota: null, href: "#" }] },
      { rotulo: "Presupuesto", falta: "sin hacer", versiones: [{ version: "v2", fecha: dia(-84), nota: "con la subvención desglosada · el enviado", href: "#" }, { version: "v1", fecha: dia(-118), nota: null, href: "#" }] },
      { rotulo: "Hoja de encargo", falta: "sin hacer", versiones: [{ version: "v2", fecha: dia(-76), nota: "FIRMADA y verificada", href: "#" }, { version: "v1", fecha: dia(-110), nota: "con dos hitos de pago en vez de tres", href: "#" }] },
    ],
    tresPresupuestos: { aplica: true, nota: "Obligatorios: van a subvención. Tres contratas invitadas, votada la segunda." },
    financiacion: { ofrecida: true, entidad: "BBVA", nota: "Rechazada: prefirieron derrama." },
    tresD: { haceFalta: true, cual: "SATE con mirador — modelo de catálogo 04", tipo: "de catálogo", href: "#", nota: "Se enseñó en la junta. Lo miran luego los técnicos para saber qué se vendió." },
    junta: { haceFalta: true, fecha: dia(-76), nota: "Aprobada con 31 votos a favor y 4 en contra." },
    personas: [
      { nombre: "Beatriz Martínez", papel: "administradora", telefono: "654 99 88 32", email: "bmartinez@marcalasesores.es", porQue: null },
      { nombre: "Lourdes Gil", papel: "presidenta", telefono: "622 08 17 94", email: null, porQue: "Muy metida. Es quien empuja el pago." },
    ],
    edificio: {
      viviendas: 45, anio: 1981, fachadas: 4, tipoFachada: "monocapa",
      portalAccesible: true, ascensor: true, iee: dia(-900),
      problemas: ["Fachada con desprendimientos en el patio", "Facturas de calefacción altísimas"],
    },
    olfato: [
      { tipo: "palanca", texto: "Van a subvención y la convocatoria cierra en noviembre. Si se retrasan en pagar, se quedan fuera. Es el argumento que les mueve." },
      { tipo: "carácter", texto: "Comunidad grande y con dinero, pero muy lenta en decidir: todo pasa por junta." },
    ],
    administrador: {
      nombre: "Marcal Asesores (Leganés) · Beatriz Martínez",
      desde: "2019",
      viabilidades: 11,
      firmadas: [{ fecha: dia(-76), que: "SATE + subvención", importe: 24600 }, { fecha: dia(-120), que: "Ascensor", importe: 12400 }],
      valoracion: "De los buenos. Contesta, avisa cuando algo se retrasa y no regatea el precio.",
    },
  },
};

/** Los tres documentos, cuando de esa oportunidad no sabemos nada todavia. */
const DOCS_VACIOS: FichaComercial["documentos"] = [
  { rotulo: "Informe de viabilidad", versiones: [], falta: "sin hacer" },
  { rotulo: "Presupuesto", versiones: [], falta: "sin hacer" },
  { rotulo: "Hoja de encargo", versiones: [], falta: "sin hacer" },
];

/** La ficha completa de una oportunidad de la demostracion, o null si no es suya. */
export function fichaDemo(id: string): FichaComercial | null {
  const o = oportunidadesDemo().find((x) => x.id === id);
  const f = firmadasDemo().find((x) => x.id === id);
  if (!o && !f) return null;

  const d = DETALLE[id] ?? {};
  const base = o ?? f!;
  const extracto = base.ficha;
  const diario: EntradaCuadro[] = extracto?.historia ?? [];

  return {
    id,
    nombre: base.nombre,
    empresa: base.empresa,
    persona: base.persona,
    que: base.que,
    precio: base.precio,
    cobra: d.cobra ?? extracto?.cobra ?? null,
    firmada: f ? f.firmada : null,
    pasos: d.pasos ?? [],
    documentos: d.documentos ?? DOCS_VACIOS,
    tresPresupuestos: d.tresPresupuestos ?? null,
    financiacion: d.financiacion ?? null,
    tresD: d.tresD ?? null,
    junta: d.junta ?? null,
    personas: d.personas ?? (extracto?.contactos ?? []).map((c) => ({
      nombre: c.nombre, papel: c.papel, telefono: c.telefono, email: null, porQue: null,
    })),
    edificio: d.edificio ?? EDIFICIO_VACIO,
    olfato: d.olfato ?? [],
    administrador: d.administrador ?? null,
    hitos: f ? f.hitos : [],
    diario,
    extracto,
  };
}
