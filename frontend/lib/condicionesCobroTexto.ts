// Las condiciones de cobro en palabras: lo comparten la pantalla y el servidor (sin nada de servidor dentro).
import type { Condicion } from "./condicionesCobro";

/** Cuando paga, como se lee en la lista. */
export function cuandoPaga(c: Pick<Condicion, "regla" | "dias" | "diaCorte" | "diaRemesa">): string {
  if (c.regla === "al_cargo") return "al hacer el cargo";
  if (c.regla === "dias") return `${c.dias} días después de la factura`;
  if (c.regla === "corte_remesa") return `emitida hasta el día ${c.diaCorte}, en la remesa del día ${c.diaRemesa} del mes siguiente`;
  return "";
}
