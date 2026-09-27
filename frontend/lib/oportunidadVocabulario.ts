// lib/oportunidadVocabulario.ts
//
// Las palabras del alta de oportunidad, en un fichero SIN "server-only" porque
// las necesitan las dos orillas: la pantalla para pintarlas y el servidor para
// decidir donde guarda cada cosa.

/** Los tres pasos del flujo comercial por los que se puede entrar. El flujo
 *  entero ya existe (`hitos_comerciales`, diez pasos): aqui solo se dice por
 *  cual nos enganchamos, y los de antes quedan como NO APLICAN.
 *  El copy es de Monica, literal. */
export const PASOS_DE_ARRANQUE = [
  { clave: "primer_contacto", texto: "Llamar para que me cuenten" },
  { clave: "visita", texto: "Ir a verlo" },
  { clave: "envio_documentos", texto: "Enviar Hoja de Encargo" },
] as const;

/** Que es la persona que llamo, cuando hay que crearla. No es una etiqueta:
 *  DECIDE DONDE SE GUARDA, que es lo que ella detecto.
 *
 *  Sus dos familias: con los de arriba hay una relacion comercial estable —nos
 *  facturamos, y nos llaman justo para esto—; con los de abajo la relacion es de
 *  otro tipo, y que te llamen por un proyecto es la excepcion. */
export const RELACIONES = [
  { valor: "administrador", texto: "Administrador de fincas", pista: "relación comercial estable" },
  { valor: "contrata", texto: "Comercial de contrata", pista: "relación comercial estable" },
  { valor: "banco", texto: "Comercial de banco", pista: "relación comercial estable" },
  { valor: "comunidad", texto: "Contacto de comunidad", pista: "otro tipo de relación" },
  { valor: "organismo", texto: "Contacto de organismo oficial", pista: "otro tipo de relación" },
  { valor: "personal", texto: "Contacto personal", pista: "otro tipo de relación" },
] as const;
