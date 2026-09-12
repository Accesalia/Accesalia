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
import {
  mapaDe,
  pasosComerciales,
  umbrales,
  type CuadroComercial,
  type EntradaCuadro,
  type EstadoTramo,
  type FichaExtracto,
} from "./cuadroComercial";

export const ID_FANTASMA = "fantasma";

// Fechas relativas a hoy, para que la demostracion no envejezca.
const dia = (desplazamiento: number) => {
  const d = new Date();
  d.setDate(d.getDate() + desplazamiento);
  return d.toISOString().slice(0, 10);
};
const DIA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric" });
const DIA_LARGO = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const enviadoEl = (d: number) => `enviado por mail el ${DIA_LARGO.format(new Date(dia(d)))}`;

// Atajos para escribir las fichas desplegadas sin repetirse.
const hecho = (rotulo: string): FichaExtracto["documentos"][number] => ({ rotulo, href: "#", falta: "" });
const falta = (rotulo: string, texto: string): FichaExtracto["documentos"][number] => ({ rotulo, href: null, falta: texto });
let nEntrada = 0;
const paso = (d: number, tipo: string, con: string | null, texto: string, revisar = false): EntradaCuadro => ({
  id: `h${++nEntrada}`, fecha: dia(d), tipo, con, texto, revisar, href: null,
});

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
        ficha: {
          cobra: true,
          documentos: [hecho("Viabilidad enviada"), hecho("Presupuesto enviado"), hecho("Hoja de encargo enviada")],
          envio: {
            cuando: enviadoEl(-14),
            para: ["bmartinez@marcalasesores.es"],
            cc: ["jvarroyo.presidente@gmail.com", "maria.cuesta89@gmail.com"],
            hrefMail: null,
          },
          contactos: [
            { papel: "administradora", nombre: "Beatriz Martínez", telefono: "654 99 88 32" },
            { papel: "presidente", nombre: "Juan Vicente Arroyo", telefono: "610 24 77 05" },
            { papel: "vecina interesada", nombre: "María Cuesta", telefono: "627 31 40 12" },
          ],
          sali: {
            atencion: true,
            cuando: "hace 2 horas",
            conclusion:
              "Esto pide un empujón: la documentación salió hace 23 días y llevas 14 sin hablar con Beatriz. Marcal es buen administrador y no suele dar problemas, así que lo más probable es que esté esperando a la junta; una llamada corta lo aclara.",
            parrafos: [
              "Te llamó Beatriz el 2 de septiembre para ir a ver un portal de 24 vecinos que querían ascensor. En la visita el propio presidente te dijo que la comunidad estaba muy interesada.",
              "El problema principal es el foso: hay que invadir parte del local de al lado. La comunidad negoció con el dueño perdonarle la derrama a cambio de que cediera ese trozo.",
              "El dueño del local no quiso llegar a un acuerdo, fueron a juicio y lo ganó la comunidad. El proyecto se retomó tras la sentencia hace tres semanas. Lo que se vota ahora en junta es el incremento de presupuesto por la subida de precios.",
            ],
          },
          historia: [
            paso(0, "visita", "Beatriz Martínez", "Hemos ido a ver el portal. El foso da problemas, hay contadores que habría que mover. Beatriz dice que no quieren tocar los buzones bajo ningún concepto."),
            paso(-14, "correo", "Beatriz Martínez", "Le enviamos la viabilidad y la hoja de encargo. Quedamos en que las lleva a la próxima junta."),
            paso(-23, "llamada", "Beatriz Martínez", "Nos confirma que la sentencia es firme y que retoman el proyecto. Pide presupuesto actualizado con los precios de ahora."),
            paso(-41, "visita", null, "Segunda visita con el técnico para medir el foso, ya con el local liberado."),
          ],
        },
      },
      {
        id: "o2", nombre: "SEPÚLVEDA 160 MADRID", sinComunidad: false,
        empresa: "Trébol", persona: null, prestada: false, trajo: "Pedro Aranda (Thyssen)",
        precio: 9800, que: "Ascensor",
        tramos: barra(H(3), "viabilidad_arquitecto"),
        actual: { numero: "4", nombre: "Viabilidad arquitecto", ajeno: true, quien: "arquitecto" },
        diasAqui: 9, esperando: "al arquitecto", proximo: null, ultimoContacto: dia(-10), href: "#",
        ficha: {
          cobra: true,
          documentos: [falta("Viabilidad", "la está haciendo el arquitecto"), falta("Presupuesto", "aún no toca"), falta("Hoja de encargo", "aún no toca")],
          envio: null,
          contactos: [
            { papel: "lo trajo · Thyssen", nombre: "Pedro Aranda", telefono: "649 05 22 18" },
            { papel: "administración", nombre: "Trébol · centralita", telefono: "915 44 10 90" },
          ],
          sali: {
            atencion: false,
            cuando: "hace 2 horas",
            conclusion:
              "Dentro de lo normal, pero con la pelota en nuestro tejado: la viabilidad lleva 9 días con el arquitecto y Trébol ya la ha reclamado una vez.",
            parrafos: [
              "Pedro Aranda, de Thyssen, nos pasó el contacto. El ascensor ya está decidido con ellos: nos quieren para el proyecto y la licencia, no para la venta.",
              "Escaneado hecho. Falta la viabilidad del arquitecto para poder preparar la hoja.",
            ],
          },
          historia: [
            paso(-8, "correo", "Trébol", "Reclaman la viabilidad de Sepúlveda. Les digo que está con el arquitecto."),
            paso(-10, "visita", null, "Escaneo del portal. Entrada con dos escalones, el hueco da justo."),
            paso(-15, "correo", null, "Pedro Aranda pasa el contacto. Ya tienen el ascensor decidido con Thyssen."),
          ],
        },
      },
      {
        id: "o3", nombre: "CARLOS FUENTES 61 MADRID", sinComunidad: false,
        empresa: "Trébol", persona: null, prestada: false, trajo: "Javier Parra (Schindler)",
        precio: 11200, que: "Ascensor",
        // La trae Schindler: la viabilidad la hacen ellos, asi que ese paso no aplica.
        tramos: barra(["primer_contacto", "visita", "polycam", "preparacion_documentos"], "envio_documentos", ["tresd", "viabilidad_arquitecto"]),
        actual: { numero: "6", nombre: "Envío a la comunidad", ajeno: false, quien: null },
        diasAqui: 4, esperando: null, proximo: null, ultimoContacto: dia(-4), href: "#",
        ficha: {
          cobra: false,
          documentos: [falta("Viabilidad", "la hace Schindler"), hecho("Presupuesto enviado"), hecho("Hoja de encargo enviada")],
          envio: {
            cuando: enviadoEl(-4),
            para: ["administracion@trebolfincas.es"],
            cc: ["jparra@schindler.es"],
            hrefMail: null,
          },
          contactos: [
            { papel: "lo trajo · Schindler", nombre: "Javier Parra", telefono: "600 77 31 45" },
            { papel: "administración", nombre: "Trébol · centralita", telefono: "915 44 10 90" },
          ],
          sali: {
            atencion: false,
            cuando: "hace 2 horas",
            conclusion: "Todo normal. Salió hace 4 días, aún es pronto para insistir.",
            parrafos: [
              "La trae Javier Parra, de Schindler, con la viabilidad ya hecha por ellos. Nosotros entramos con la hoja de encargo directamente.",
              "Al venir de Schindler hace falta su orden de compra antes de arrancar nada.",
            ],
          },
          historia: [
            paso(-4, "correo", "Trébol", "Enviada la hoja de encargo con copia a Javier Parra."),
            paso(-11, "visita", "Javier Parra", "Visita conjunta con Schindler. El hueco de escalera da de sobra."),
          ],
        },
      },
      {
        id: "o4", nombre: "DOCTOR FLEMING 44 MADRID", sinComunidad: false,
        empresa: "Villaraco Asesores", persona: null, prestada: false, trajo: null,
        precio: 21300, que: "SATE + cubierta",
        // La junta pidio el 3D y era de catalogo: listo al momento.
        tramos: barra([...H(6), "tresd"], "junta", []),
        actual: { numero: "7", nombre: "Junta de votación", ajeno: false, quien: null },
        diasAqui: 6, esperando: null, proximo: `junta el ${DIA.format(new Date(dia(1)))}`, ultimoContacto: dia(-3), href: "#",
        ficha: {
          cobra: true,
          documentos: [hecho("Viabilidad enviada"), hecho("Presupuesto enviado"), hecho("Hoja de encargo enviada")],
          envio: {
            cuando: enviadoEl(-6),
            para: ["obras@villaracoasesores.com"],
            cc: [],
            hrefMail: null,
          },
          contactos: [
            { papel: "administrador", nombre: "Nacho Villaraco", telefono: "618 92 44 73" },
            { papel: "presidenta", nombre: "Sonia Redondo", telefono: null },
          ],
          sali: {
            atencion: false,
            cuando: "hace 2 horas",
            conclusion: "Va bien y tiene fecha: junta mañana a las 20:00, con el 3D pedido y ya entregado.",
            parrafos: [
              "Villaraco manda muchas oportunidades y firma poquísimo, pero esta ha llegado hasta la junta con todo enviado.",
              "Pidieron el 3D para enseñarlo a los vecinos; era de catálogo y se les mandó el mismo día.",
            ],
          },
          historia: [
            paso(-3, "junta", "Villaraco", "Confirman junta mañana a las 20:00. Piden llevar el 3D para enseñarlo a los vecinos."),
            paso(-6, "correo", "Villaraco", "Enviadas viabilidad y hoja de encargo para llevar a junta."),
            paso(-20, "visita", null, "Visita a la cubierta y a las fachadas. Hay humedades en el patio interior."),
          ],
        },
      },
      {
        id: "o5", nombre: "AV. BADAJOZ 18 MADRID", sinComunidad: false,
        empresa: "Effic", persona: null, prestada: false, trajo: null,
        precio: 16800, que: "Ascensor + subvención",
        // 3D a medida: encargado al tecnico y esperando a que lo tenga.
        tramos: barra(H(6), "junta", [], ["tresd"]),
        actual: { numero: "7", nombre: "Junta de votación", ajeno: false, quien: null },
        diasAqui: 6, esperando: "el 3D a medida", proximo: `junta el ${DIA.format(new Date(dia(6)))}`, ultimoContacto: dia(-2), href: "#",
        ficha: {
          cobra: true,
          documentos: [hecho("Viabilidad enviada"), hecho("Presupuesto enviado"), hecho("Hoja de encargo enviada")],
          envio: {
            cuando: enviadoEl(-6),
            para: ["administracion@effic.es", "presidencia.badajoz18@gmail.com"],
            cc: [],
            hrefMail: null,
          },
          contactos: [
            { papel: "administradora", nombre: "Carmen Ureña", telefono: "637 10 58 26" },
            { papel: "presidente", nombre: "Alfonso Gil", telefono: "699 41 03 87" },
          ],
          sali: {
            atencion: true,
            cuando: "hace 2 horas",
            conclusion:
              "Ojo con esto: la junta es en 6 días y el 3D a medida sigue sin llegar. Sin él los vecinos votan a ciegas. Conviene apretar al técnico esta semana.",
            parrafos: [
              "Effic pregunta también por la subvención: quieren llevar a la junta el precio con y sin ayuda.",
              "El 3D no es de catálogo, hay que hacerlo: el patio obliga a una solución rara y por eso está encargado al técnico.",
            ],
          },
          historia: [
            paso(-2, "llamada", "Carmen Ureña", "Pregunta si llegamos con el 3D a la junta. Le digo que sí, pero hay que confirmarlo con el técnico."),
            paso(-6, "correo", "Effic", "Enviadas viabilidad y hoja de encargo, con el desglose de la subvención aparte."),
            paso(-18, "visita", null, "Visita al portal. El patio complica el recorrido, hará falta 3D a medida."),
          ],
        },
      },
      {
        id: "o6", nombre: "BANDERAS DE CASTILLA 25", sinComunidad: true,
        empresa: "Marcal Asesores (Castilla-La Mancha)", persona: null, prestada: true, trajo: null,
        precio: null, que: null,
        tramos: barra([], "primer_contacto"),
        actual: { numero: "1", nombre: "Primer contacto", ajeno: false, quien: null },
        diasAqui: 120, esperando: null, proximo: null, ultimoContacto: dia(-122), href: "#",
        // Lo que no ha pasado se ve vacio, no se esconde.
        ficha: {
          cobra: null,
          documentos: [falta("Viabilidad", "sin hacer"), falta("Presupuesto", "sin hacer"), falta("Hoja de encargo", "sin hacer")],
          envio: null,
          contactos: [],
          sali: {
            atencion: true,
            cuando: "hace 2 horas",
            conclusion:
              "Esto está muerto: 120 días en primer contacto y ni una llamada en cuatro meses. O se retoma esta semana o conviene cerrarla como latente, con la condición apuntada.",
            parrafos: [
              "Llegó por Marcal de Castilla-La Mancha, en una tanda de direcciones sueltas. No hay ni comunidad dada de alta ni persona de contacto.",
              "No consta ninguna visita ni ningún correo.",
            ],
          },
          historia: [],
        },
      },
    ],

    // LA SEGUNDA VIDA COMERCIAL: ya firmadas, ahora hay que cobrarlas. Tres
    // casos distintos a proposito: 50/50 al dia, tres plazos a medias, y el
    // adelanto atascado (el caso de "pasó una derrama y vamos haciendo hucha").
    firmadas: [
      {
        id: "f1", nombre: "ERAS 9 FUENLABRADA",
        empresa: "Fincas Ortega Delgado", persona: "Toñi Cárdenas",
        que: "Ascensor + licencia", precio: 13800, firmada: dia(-38),
        hitos: [
          { nombre: "Adelanto a la firma", importe: 6900, comision: 207, previsto: dia(-31), cobrado: dia(-29) },
          { nombre: "Entrega del proyecto", importe: 6900, comision: 207, previsto: dia(12), cobrado: null },
        ],
        ficha: {
          cobra: true,
          documentos: [hecho("Viabilidad enviada"), hecho("Presupuesto enviado"), hecho("Hoja de encargo firmada")],
          envio: { cuando: enviadoEl(-45), para: ["tcardenas@ortegadelgado.es"], cc: [], hrefMail: null },
          contactos: [
            { papel: "administradora", nombre: "Toñi Cárdenas", telefono: "615 88 20 41" },
            { papel: "presidente", nombre: "Emilio Rada", telefono: "600 12 93 55" },
          ],
          sali: {
            atencion: false, cuando: "hace 2 horas",
            conclusion: "Al día. El adelanto entró a los dos días y el segundo tramo no vence hasta dentro de 12 días.",
            parrafos: ["La comisión de obras llevaba el tema muy de cerca y eso ha agilizado todo: votaron y pagaron sin recordatorios."],
          },
          historia: [
            paso(-29, "correo", "Toñi Cárdenas", "Confirmado el ingreso del adelanto."),
            paso(-38, "junta", "Fincas Ortega Delgado", "Aprobado en junta por unanimidad. Nos mandan la hoja firmada."),
          ],
        },
      },
      {
        id: "f2", nombre: "RÍO DUERO 12 LEGANÉS",
        empresa: "Marcal Asesores (Leganés)", persona: "Beatriz Martínez",
        que: "SATE + subvención", precio: 24600, firmada: dia(-76),
        hitos: [
          { nombre: "Adelanto a la firma", importe: 7380, comision: 221, previsto: dia(-69), cobrado: dia(-66) },
          { nombre: "Entrega del proyecto", importe: 9840, comision: 295, previsto: dia(-9), cobrado: null },
          { nombre: "Concesión de licencia", importe: 7380, comision: 221, previsto: dia(45), cobrado: null },
        ],
        ficha: {
          cobra: true,
          documentos: [hecho("Viabilidad enviada"), hecho("Presupuesto enviado"), hecho("Hoja de encargo firmada")],
          envio: { cuando: enviadoEl(-84), para: ["bmartinez@marcalasesores.es"], cc: [], hrefMail: null },
          contactos: [{ papel: "administradora", nombre: "Beatriz Martínez", telefono: "654 99 88 32" }],
          sali: {
            atencion: true, cuando: "hace 2 horas",
            conclusion:
              "El segundo tramo venció hace 9 días y son 9.840 €, de los que 295 € son tuyos. El proyecto está entregado, así que no hay excusa técnica: toca llamar a Beatriz.",
            parrafos: [
              "Van a subvención y la convocatoria cierra en noviembre; retrasarse en el pago retrasa la licencia y se quedan fuera. Es el argumento que mueve a esta comunidad.",
            ],
          },
          historia: [
            paso(-9, "correo", "Marcal", "Entregado el proyecto y emitida la factura del segundo tramo."),
            paso(-66, "correo", "Beatriz Martínez", "Adelanto ingresado."),
          ],
        },
      },
      {
        id: "f3", nombre: "SAN IGNACIO 6 ALCORCÓN",
        empresa: "Villaraco Asesores", persona: null,
        que: "Bajada a cota cero", precio: 8900, firmada: dia(-24),
        hitos: [
          { nombre: "Adelanto a la firma", importe: 4450, comision: 134, previsto: dia(-17), cobrado: null },
          { nombre: "Entrega del proyecto", importe: 4450, comision: 134, previsto: dia(30), cobrado: null },
        ],
        ficha: {
          cobra: false,
          documentos: [hecho("Viabilidad enviada"), hecho("Presupuesto enviado"), hecho("Hoja de encargo firmada")],
          envio: { cuando: enviadoEl(-30), para: ["obras@villaracoasesores.com"], cc: [], hrefMail: null },
          contactos: [
            { papel: "administrador", nombre: "Nacho Villaraco", telefono: "618 92 44 73" },
            { papel: "presidenta", nombre: "Sonia Redondo", telefono: null },
          ],
          sali: {
            atencion: true, cuando: "hace 2 horas",
            conclusion:
              "Firmada hace 24 días y el adelanto sigue sin entrar: vencía hace 17. La fase comercial no está cerrada y tú no has cobrado nada de esta.",
            parrafos: [
              "Dijeron que había pasado una derrama de fachada y que iban haciendo hucha. Quedaron en pagar la mitad este mes y no ha llegado nada.",
              "Villaraco manda mucho y firma poco; esta la firmaron, así que conviene no dejarla enfriar.",
            ],
          },
          historia: [
            paso(-17, "llamada", "Nacho Villaraco", "Pasó una derrama de fachada, van haciendo hucha. Quedan en adelantar la mitad este mes."),
            paso(-24, "junta", "Villaraco", "Aprobada y firmada la hoja de encargo."),
          ],
        },
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
