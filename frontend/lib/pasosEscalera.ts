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

export type PasoEscalera = { clave: Clave; fase: Fase | null; seccion: Paso; accion: Accion | null };

/** LA EQUIVALENCIA. El criterio de la fase: la fase donde vive la tarea
 *  pendiente. primer_contacto nunca es fase actual (al dar de alta ya esta
 *  hecho), y el 3D va como EXTRA de junta_por_celebrar, no como paso propio. */
export const PASOS: PasoEscalera[] = [
  { clave: "perdida", fase: null, seccion: "cerrada", accion: null },
  { clave: "completado", fase: null, seccion: "completado", accion: null },
  // Cobrada la primera parte, lo que queda es de facturacion, no del comercial.
  { clave: "primera_parte_cobrada", fase: "cobro", seccion: "completado", accion: null },
  { clave: "falta_ok_cobro_primera", fase: "cobro", seccion: "cobro", accion: "interno" },
  { clave: "junta_si_falta_firmada", fase: "firma", seccion: "firma", accion: "admin" },
  { clave: "junta_no", fase: "junta", seccion: "junta", accion: "perdida" },
  { clave: "nueva_oferta_elaborar", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "doc" },
  { clave: "nueva_oferta_decision", fase: "junta", seccion: "hoja_enviada", accion: "admin" },
  { clave: "nueva_oferta_cambios", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "doc" },
  { clave: "nueva_oferta_enviar", fase: "envio_documentos", seccion: "sin_hoja", accion: "doc" },
  { clave: "nueva_oferta_ok", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "interno" },
  { clave: "junta_por_celebrar", fase: "junta", seccion: "junta", accion: "admin" },
  { clave: "junta_que_votaron", fase: "junta", seccion: "junta", accion: "admin" },
  { clave: "falta_fecha_junta", fase: "junta", seccion: "hoja_enviada", accion: "admin" },
  { clave: "revision_cambios", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "doc" },
  { clave: "falta_enviar_doc", fase: "envio_documentos", seccion: "sin_hoja", accion: "doc" },
  { clave: "falta_ok_oferta", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "interno" },
  { clave: "preparar_docs", fase: "preparacion_documentos", seccion: "sin_hoja", accion: "doc" },
  { clave: "arquitecto_viabilidad", fase: "viabilidad_arquitecto", seccion: "sin_hoja", accion: "interno" },
  { clave: "enviar_polycam", fase: "polycam", seccion: "escaneo", accion: "polycam" },
  { clave: "cerrar_visita", fase: "visita", seccion: "escaneo", accion: "polycam" },
];

const POR_CLAVE = new Map(PASOS.map((p) => [p.clave, p]));
export const pasoDe = (c: Clave): PasoEscalera => POR_CLAVE.get(c)!;
