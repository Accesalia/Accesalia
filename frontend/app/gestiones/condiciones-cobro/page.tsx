import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { condicionesDeCobro, puedeGestionarCondiciones } from "../../../lib/condicionesCobro";
import { CondicionesCobro } from "./CondicionesCobro";

export const dynamic = "force-dynamic";

// COBRAR > AJUSTES > CONDICIONES DE COBRO (Monica, 25-oct-2026): como nos paga cada uno. Maqueta validada tal cual:
// docs/figma/condiciones-cobro-y-clientes-factusol.html. Direccion, facturacion y administracion.

export default async function PaginaCondicionesCobro() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/condiciones-cobro");
  if (!puedeGestionarCondiciones(yo)) redirect("/menu");
  const d = await condicionesDeCobro();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <CondicionesCobro condiciones={d.condiciones} contratasSin={d.contratasSin} />
    </div>
  );
}
