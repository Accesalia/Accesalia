// lib/pasosEscalera.ts
//
// LA ESCALERA DE COPYS ES LA UNICA VERDAD (Monica, 15-oct-2026). Cada paso de
// "lo que nos bloquea" (faltaTexto, en lib/cabeceraOpp.ts) lleva una CLAVE fija,
// y de la clave salen, aqui y solo aqui:
//   - la FASE comercial (los diez hitos de `hitos_comerciales`), y de ella el BLOQUE;
//   - la SECCION de las alertas (Paso);
//   - COMO SE DESBLOQUEA (Accion), para agrupar las alertas.
// Si cambia un copy, no se rompe nada: manda la clave, nunca el texto.
// estado_oportunidad guarda el resultado ya calculado (lib/estadoOportunidad.ts).
//
// Sin "use client": lo leen el servidor y las pantallas.

/** Los pasos, del mas avanzado al primero (el orden de faltaTexto). */
export const CLAVES = [
  "perdida",
  "completado",
  "primera_parte_cobrada",
  "falta_ok_cobro_primera",
  "junta_si_falta_firmada",
  "junta_no",
  "nueva_oferta_elaborar",
  "nueva_oferta_decision",
  "nueva_oferta_cambios",
  "nueva_oferta_enviar",
  "nueva_oferta_ok",
  "junta_por_celebrar",
  "junta_que_votaron",
  "falta_fecha_junta",
  "revision_cambios",
  "falta_enviar_doc",
  "falta_ok_oferta",
  "preparar_docs",
  "arquitecto_viabilidad",
  "enviar_polycam",
  "cerrar_visita",
] as const;
export type Clave = (typeof CLAVES)[number];

/** Los diez hitos comerciales (claves de `hitos_comerciales`). */
export type Fase =
  | "primer_contacto"
  | "visita"
  | "polycam"
  | "tresd"
  | "viabilidad_arquitecto"
  | "preparacion_documentos"
  | "envio_documentos"
  | "junta"
  | "firma"
  | "cobro";

/** LOS CUATRO BLOQUES (Monica, 5-oct-2026): los diez hitos agrupados. */
export const BLOQUES: { n: number; titulo: string; hitos: Fase[] }[] = [
  { n: 1, titulo: "Toma de datos", hitos: ["primer_contacto", "visita", "polycam", "tresd"] },
  { n: 2, titulo: "Documentación", hitos: ["viabilidad_arquitecto", "preparacion_documentos", "envio_documentos"] },
  { n: 3, titulo: "Decisión de los vecinos", hitos: ["junta"] },
  { n: 4, titulo: "Cierre", hitos: ["firma", "cobro"] },
];
export const bloqueDeFase = (f: Fase | null): number | null => (f ? (BLOQUES.find((b) => b.hitos.includes(f))?.n ?? null) : null);

/** La seccion de las alertas. "completado" y "cerrada" no salen en ellas. */
export type Paso = "escaneo" | "sin_hoja" | "hoja_enviada" | "junta" | "firma" | "cobro" | "completado" | "cerrada";

/** COMO SE DESBLOQUEA (Monica, 15-oct-2026). null: no es del comercial. */
export type Accion = "admin" | "interno" | "doc" | "polycam" | "perdida";

export type PasoEscalera = { clave: Clave; fase: Fase | null; seccion: Paso; accion: Accion | null; titulo: string };

/** LA EQUIVALENCIA. El criterio de la fase: la fase donde vive la tarea
 *  pendiente. primer_contacto nunca es fase actual (al dar de alta ya esta
 *  hecho), y el 3D va como EXTRA de junta_por_celebrar, no como paso propio. */
export const PASOS: PasoEscalera[] = [
  { clave: "perdida", fase: null, seccion: "cerrada", accion: null, titulo: "Perdida" },
  { clave: "completado", fase: null, seccion: "completado", accion: null, titulo: "Todo completado" },
  // Cobrada la primera parte, lo que queda es de facturacion, no del comercial.
  { clave: "primera_parte_cobrada", fase: "cobro", seccion: "completado", accion: null, titulo: "Cobro de la primera parte recibido" },
  { clave: "falta_ok_cobro_primera", fase: "cobro", seccion: "cobro", accion: "interno", titulo: "Pendiente de que nos den el ok al cobro de la primera parte" },
  { clave: "junta_si_falta_firmada", fase: "firma", seccion: "firma", accion: "admin", titulo: "La junta votó sí: pendiente de que nos envíen la hoja firmada" },
  { clave: "junta_no", fase: "junta", seccion: "junta", accion: "perdida", titulo: "La junta votó que no: cerrarla como perdida" },
  { clave: "nueva_oferta_elaborar", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "doc", titulo: "Pidieron modificar la oferta: pendiente de elaborar la nueva oferta" },
  { clave: "nueva_oferta_decision", fase: "junta", seccion: "hoja_enviada", accion: "admin", titulo: "Pendientes de la decisión sobre la nueva oferta" },
  { clave: "nueva_oferta_cambios", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "doc", titulo: "La revisión pidió cambios a la nueva oferta" },
  { clave: "nueva_oferta_enviar", fase: "envio_documentos", seccion: "sin_hoja", accion: "doc", titulo: "Falta enviar la nueva oferta a la comunidad" },
  { clave: "nueva_oferta_ok", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "interno", titulo: "Falta el ok a la nueva oferta" },
  { clave: "junta_por_celebrar", fase: "junta", seccion: "junta", accion: "admin", titulo: "Falta que se celebre la junta" },
  { clave: "junta_que_votaron", fase: "junta", seccion: "junta", accion: "admin", titulo: "Pendientes de que confirmen qué votaron" },
  { clave: "falta_fecha_junta", fase: "junta", seccion: "hoja_enviada", accion: "admin", titulo: "Falta que confirmen la fecha de la junta" },
  { clave: "revision_cambios", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "doc", titulo: "La revisión pidió cambios: corregir la oferta antes de enviarla" },
  { clave: "falta_enviar_doc", fase: "envio_documentos", seccion: "sin_hoja", accion: "doc", titulo: "Falta enviar la doc a la comunidad" },
  { clave: "falta_ok_oferta", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "interno", titulo: "Falta el ok a la oferta" },
  { clave: "preparar_docs", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "doc", titulo: "Preparar la HE, la VB y el presupuesto" },
  { clave: "arquitecto_viabilidad", fase: "viabilidad_arquitecto", seccion: "sin_hoja", accion: "interno", titulo: "Que el arquitecto defina la viabilidad" },
  { clave: "enviar_polycam", fase: "polycam", seccion: "escaneo", accion: "polycam", titulo: "Enviar el Polycam para la viabilidad" },
  { clave: "cerrar_visita", fase: "visita", seccion: "escaneo", accion: "polycam", titulo: "Cerrar la visita para el escaneo con Polycam" },
];

/** EL NOMBRE DE CADA FASE, como en la barra (lib/cuadroComercial.ts, CORTO),
 *  con su numero. "VB + HE + PPTO" es de Monica. */
export const FASES: { clave: Fase; n: number; nombre: string }[] = [
  { clave: "primer_contacto", n: 1, nombre: "Primer contacto" },
  { clave: "visita", n: 2, nombre: "Visita al inmueble" },
  { clave: "polycam", n: 3, nombre: "Escaneo Polycam" },
  { clave: "viabilidad_arquitecto", n: 4, nombre: "Viabilidad del arquitecto" },
  { clave: "preparacion_documentos", n: 5, nombre: "VB + HE + PPTO" },
  { clave: "envio_documentos", n: 6, nombre: "Envío a la comunidad" },
  { clave: "tresd", n: 0, nombre: "3D para la junta" },
  { clave: "junta", n: 7, nombre: "Junta de votación" },
  { clave: "firma", n: 8, nombre: "Firma" },
  { clave: "cobro", n: 9, nombre: "Cobro" },
];

/** El orden de los copys DENTRO de su fase, como ocurren: primero el camino
 *  normal y despues el bucle de la nueva oferta. */
export const ORDEN_EN_FASE: Clave[] = [
  "cerrar_visita", "enviar_polycam", "arquitecto_viabilidad",
  "preparar_docs", "falta_ok_oferta", "revision_cambios", "nueva_oferta_elaborar", "nueva_oferta_ok", "nueva_oferta_cambios",
  "falta_enviar_doc", "nueva_oferta_enviar",
  "falta_fecha_junta", "junta_por_celebrar", "junta_que_votaron", "nueva_oferta_decision", "junta_no",
  "junta_si_falta_firmada",
  "falta_ok_cobro_primera", "primera_parte_cobrada",
];

const POR_CLAVE = new Map(PASOS.map((p) => [p.clave, p]));
export const pasoDe = (c: Clave): PasoEscalera => POR_CLAVE.get(c)!;
