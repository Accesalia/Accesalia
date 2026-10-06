// lib/estadoHoja.ts
//
// Como se dice el estado de una hoja de encargo, con su color. Aparte para que
// la pantalla de hojas y el bloque 2 de la oportunidad digan lo mismo. (No vive
// en un fichero "use client": sus exports llegarian al servidor como
// referencias, no como texto.)

export type EstadoPinta = { texto: string; clase: string };

const AMBAR = "border-[#f0d78c] bg-[#fdf6e3] text-[#8a5a00]";

export const ESTADO_HOJA: Record<string, EstadoPinta> = {
  borrador: { texto: "Generada", clase: "border-black/15 bg-hueso text-carbon/70" },
  enviada_comunidad: { texto: "Enviada, sin firmar", clase: AMBAR },
  devuelta_firmada: { texto: "Firmada", clase: "border-lima bg-lima-soft text-lima-dark" },
  pendiente_firma_daniel: { texto: "Pendiente de firma de Daniel", clase: AMBAR },
  firmada_daniel: { texto: "Firmada por Daniel", clase: AMBAR },
  cambios_solicitados: { texto: "Piden cambios", clase: AMBAR },
  rechazada: { texto: "Rechazada", clase: "border-alerta/40 bg-[#fbeeee] text-alerta" },
  archivada: { texto: "Archivada", clase: "border-black/15 bg-hueso text-carbon/60" },
};

/** Un borrador se dice: no tiene PDF, no ha salido y no se marca enviado. */
export function estadoDeHoja(estado: string, enBorrador: boolean): EstadoPinta {
  if (enBorrador && estado === "borrador") return { texto: "Borrador", clase: "border-dashed border-carbon/30 bg-white text-carbon/60" };
  return ESTADO_HOJA[estado] ?? { texto: estado, clase: "border-black/15 bg-hueso text-carbon/70" };
}
