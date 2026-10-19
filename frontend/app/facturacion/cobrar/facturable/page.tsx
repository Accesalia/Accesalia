import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { facturableYa } from "../../../../lib/facturableYa";
import { MarcoDinero } from "../../MarcoDinero";
import { TablaFacturable } from "./TablaFacturable";

export const dynamic = "force-dynamic";

// COBRAR › FACTURABLE YA (Monica, 19-oct-2026): la pantalla de trabajo que tiene
// que quedar a cero. Ver lib/facturableYa.ts.

export default async function Pagina() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/facturable");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const datos = await facturableYa();
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="facturable" cuentas={{ facturable: datos.opps.length }}>
      <TablaFacturable datos={datos} enlace={(id) => `/facturacion/${id}?desde=facturable`} />
    </MarcoDinero>
  );
}
