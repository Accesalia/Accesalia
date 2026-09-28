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

/** QUE ES la persona que se crea. No es una etiqueta: DECIDE DONDE SE GUARDA.
 *
 *  Tres casillas a la vista y un "otro" de texto libre, porque una lista cerrada
 *  siempre se queda corta: el tecnico del ayuntamiento, el del banco, la de la
 *  comision de obras. Antes eran seis valores fijos (Monica, 28-sep-2026). */
export const QUE_ES = [
  { valor: "administrador", texto: "Administrador" },
  { valor: "contrata", texto: "Comercial contrata" },
  { valor: "vecino", texto: "Vecino" },
] as const;

/** Lo que se escribe en el cargo de cada uno. Para "otro" se usa lo que escriba
 *  ella misma en la casilla de texto. */
export const CARGO_DE: Record<string, string> = {
  administrador: "Administrador de fincas",
  contrata: "Comercial de contrata",
  vecino: "Vecino",
};
