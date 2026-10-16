import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { MarcoDinero } from "../../MarcoDinero";
import { Pantalla } from "./Pantalla";

export const dynamic = "force-dynamic";

// COBRAR › MODIFICAR HITOS (maqueta validada, Monica, 12-oct-2026): buscar una
// direccion, ver sus hojas firmadas y cambiar fecha o importe de un hito, o
// dividirlo en subhitos, siempre con el porque.

export default async function Pagina({ searchParams }: { searchParams: Promise<{ opp?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/modificar");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const { opp } = await searchParams;
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="modificar">
      <Pantalla ruta="/facturacion/cobrar/modificar" oppId={opp && /^[0-9a-f-]{36}$/.test(opp) ? opp : null} modificar titulo="Modificar Hitos" />
    </MarcoDinero>
  );
}
