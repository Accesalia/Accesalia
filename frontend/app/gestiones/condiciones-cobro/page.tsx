import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { condicionesDeCobro, puedeGestionarCondiciones } from "../../../lib/condicionesCobro";
import { CondicionesCobro } from "./CondicionesCobro";
import { MarcoDinero } from "../../facturacion/MarcoDinero";
import { puedeVerCobros } from "../../../lib/cobros";


export const dynamic = "force-dynamic";

// COBRAR > AJUSTES > CONDICIONES DE COBRO (Monica, 25-oct-2026): como nos paga cada uno. Maqueta validada tal cual:
// docs/figma/condiciones-cobro-y-clientes-factusol.html. Direccion, facturacion y administracion.

export default async function PaginaCondicionesCobro() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/condiciones-cobro");
  if (!puedeGestionarCondiciones(yo)) redirect("/menu");
  const d = await condicionesDeCobro();
  // Desde Cobrar (Monica, 25-oct-2026): dentro del marco del dinero, con su menu lateral; quien no lleva Cobrar, sola.
  if (puedeVerCobros(yo))
    return (
      <MarcoDinero yo={yo} area="cobrar" activo="condiciones-cobro">
        <CondicionesCobro condiciones={d.condiciones} contratasSin={d.contratasSin} />
      </MarcoDinero>
    );
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <CondicionesCobro condiciones={d.condiciones} contratasSin={d.contratasSin} />
    </div>
  );
}
