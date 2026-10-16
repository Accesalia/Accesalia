import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { proximosHitos } from "../../../../lib/proximosHitos";
import { MarcoDinero } from "../../MarcoDinero";
import { ProximosHitos } from "./ProximosHitos";

export const dynamic = "force-dynamic";

// COBRAR › PROXIMOS HITOS y FACTURABLE YA (maqueta validada, Monica, 12-oct-2026):
// la misma pantalla, que se abre por «Facturable ya» (lo que ya se puede emitir,
// arriba). Desde el menu, ?ver=ya marca «Facturable ya» como la entrada activa.

export default async function Pagina({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/proximos");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const { ver } = await searchParams;
  const { hitos, previos } = await proximosHitos();
  const facturable = hitos.filter((h) => h.cuando === "ya").length;
  return (
    <MarcoDinero yo={yo} area="cobrar" activo={ver === "ya" ? "facturable" : "proximos"} cuentas={{ facturable }}>
      <ProximosHitos hitos={hitos} previos={previos} inicial="ya" />
    </MarcoDinero>
  );
}
