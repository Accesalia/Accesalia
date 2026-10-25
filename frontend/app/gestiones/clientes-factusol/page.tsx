import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { clientesFactusol, puedeVerClientesFactusol } from "../../../lib/factusolClientes";
import { ClientesFactusol } from "./ClientesFactusol";
import { MarcoDinero } from "../../facturacion/MarcoDinero";
import { puedeVerCobros } from "../../../lib/cobros";


export const dynamic = "force-dynamic";

// COBRAR > AJUSTES > CLIENTES DE FACTUSOL (Monica, 25-oct-2026): la copia de los clientes de cada empresa, SOLO PARA
// CONSULTAR («que no sea un punto ciego»). Se relee cada noche y con «Revisar ahora». Maqueta validada tal cual:
// docs/figma/condiciones-cobro-y-clientes-factusol.html.

export default async function PaginaClientesFactusol() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/clientes-factusol");
  if (!puedeVerClientesFactusol(yo)) redirect("/menu");
  const clientes = await clientesFactusol();
  // Desde Cobrar (Monica, 25-oct-2026): dentro del marco del dinero, con su menu lateral; quien no lleva Cobrar, sola.
  if (puedeVerCobros(yo))
    return (
      <MarcoDinero yo={yo} area="cobrar" activo="clientes-factusol">
        <ClientesFactusol clientes={clientes} />
      </MarcoDinero>
    );
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <ClientesFactusol clientes={clientes} />
    </div>
  );
}
