"use client";

// Botón de borrado con RED: antes de eliminar, avisa listando el efecto dominó
// (todo lo que Sali encadenó a esta entrada). Solo si el humano confirma se envía.

import { eliminarEntrada } from "./acciones";
import { Guardando } from "../../../components/Guardando";

export function BotonEliminar({
  acciones,
  interaccionId,
  comercialId,
}: {
  acciones: string[];
  interaccionId: string;
  comercialId?: string | null;
}) {
  const msg =
    "Vas a ELIMINAR esta entrada y deshacer todo lo que generó:\n\n" +
    (acciones.length ? acciones.map((a) => "• " + a).join("\n") : "• (no generó nada)") +
    "\n\nEsto no se puede deshacer. ¿Confirmas?";

  return (
    <form action={eliminarEntrada}>
      <Guardando />
      <input type="hidden" name="interaccion_id" value={interaccionId} />
      {comercialId ? <input type="hidden" name="comercial_id" value={comercialId} /> : null}
      <button
        type="submit"
        onClick={(e) => { if (!window.confirm(msg)) e.preventDefault(); }}
        className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-semibold text-carbon/55 transition hover:border-red-400 hover:text-red-600"
      >
        Eliminar entrada
      </button>
    </form>
  );
}
