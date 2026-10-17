import type { Condicion, Paso } from "../../../lib/comisionesAdmin";

export const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
export const eur0 = (n: number) => Math.round(n).toLocaleString("es-ES", { useGrouping: "always" } as Intl.NumberFormatOptions) + " €";

/** «1.000 €», «3 % del PEM · vía nosotros», «pendiente». */
export function textoCondicion(c: Condicion | undefined, contrata = false): { valor: string; detalle: string | null } | null {
  if (!c) return null;
  if (c.estado === "pendiente") return { valor: "pendiente", detalle: "de negociar" };
  const valor = c.valor == null ? "sin importe" : c.forma === "eur" ? eur0(c.valor) : `${c.valor.toLocaleString("es-ES")} %${contrata ? " del PEM" : ""}`;
  const det = [c.enB ? "en B" : "con factura", contrata && c.via ? (c.via === "nosotros" ? "vía nosotros" : "directo de la contrata") : null].filter(Boolean).join(" · ");
  return { valor, detalle: det };
}

/** Los pasos de una comision (Monica): firmada = le debemos → primera parte cobrada
 *  = pedirle factura → su factura → pagada (justificante). */
export const PASOS: { clave: Paso; titulo: string }[] = [
  { clave: "le_debemos", titulo: "Le debemos" },
  { clave: "pedir_factura", titulo: "Pedirle factura" },
  { clave: "su_factura", titulo: "Su factura" },
  { clave: "pagada", titulo: "Pagada" },
];
