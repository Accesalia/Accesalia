import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { formasDePago, puedeGestionarFormas } from "../../../lib/formasPago";
import { FormasDePago } from "./FormasDePago";
import { MarcoDinero } from "../../facturacion/MarcoDinero";
import { puedeVerCobros } from "../../../lib/cobros";


export const dynamic = "force-dynamic";

// FORMAS DE PAGO (Monica, 24-oct-2026): las que se eligen en cada linea de la hoja de encargo, con sus hitos y cuando
// salen por defecto. Maqueta validada: docs/figma/formas-de-pago.html. Direccion, facturacion y administracion (no comercial).

export default async function PaginaFormasDePago() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/formas-pago");
  if (!puedeGestionarFormas(yo)) redirect("/menu");
  const datos = await formasDePago();
  // Desde Cobrar (Monica, 25-oct-2026): dentro del marco del dinero, con su menu lateral; quien no lleva Cobrar, sola.
  if (puedeVerCobros(yo))
    return (
      <MarcoDinero yo={yo} area="cobrar" activo="formas-pago">
        <FormasDePago formas={datos.formas} bloques={datos.bloques} pagadores={datos.pagadores} />
      </MarcoDinero>
    );
  return (
    <div className="min-h-screen bg-white">
      <BarraSuperior />
      <main className="mx-auto max-w-[1480px] px-4 pb-16 pt-4 sm:px-6">
        {yo.veTodo ? <Salida href="/gestiones">← Gestiones de la app</Salida> : <Salida href="/facturacion/cobrar">← Cobrar</Salida>}
        <FormasDePago formas={datos.formas} bloques={datos.bloques} pagadores={datos.pagadores} />
      </main>
    </div>
  );
}
