import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { formasDePago, puedeGestionarFormas } from "../../../lib/formasPago";
import { FormasDePago } from "./FormasDePago";

export const dynamic = "force-dynamic";

// FORMAS DE PAGO (Monica, 24-oct-2026): las que se eligen en cada linea de la hoja de encargo, con sus hitos y cuando
// salen por defecto. Maqueta validada: docs/figma/formas-de-pago.html. De momento, solo direccion.

export default async function PaginaFormasDePago() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/formas-pago");
  if (!puedeGestionarFormas(yo)) redirect("/gestiones");
  const datos = await formasDePago();
  return (
    <div className="min-h-screen bg-white">
      <BarraSuperior />
      <main className="mx-auto max-w-[1480px] px-4 pb-16 pt-4 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <FormasDePago formas={datos.formas} bloques={datos.bloques} pagadores={datos.pagadores} />
      </main>
    </div>
  );
}
