import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { MarcoDinero } from "../../MarcoDinero";
import { Pantalla } from "../modificar/Pantalla";

export const dynamic = "force-dynamic";

// COBRAR › BUSCAR DIRECCION (Consultar): lo mismo que Modificar Hitos, solo para
// mirar: una direccion, sus hojas firmadas, sus lineas, hitos y notas.

export default async function Pagina({ searchParams }: { searchParams: Promise<{ opp?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/buscar");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const { opp } = await searchParams;
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="buscar">
      <Pantalla ruta="/facturacion/cobrar/buscar" oppId={opp && /^[0-9a-f-]{36}$/.test(opp) ? opp : null} modificar={false} titulo="Buscar dirección" />
    </MarcoDinero>
  );
}
