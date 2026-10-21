import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { listaGastos, puedeVerGastos } from "../../../../lib/gastosMes";
import { MarcoDinero } from "../../../facturacion/MarcoDinero";
import { Lista } from "./Lista";

export const dynamic = "force-dynamic";

// PREVER › GESTIONAR LA LISTA DE GASTOS (Monica, 21-oct-2026). Ver listaGastos en lib/gastosMes.ts.

const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

export default async function PaginaLista() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/prever/gastos/lista");
  if (!puedeVerGastos(yo)) redirect("/menu");
  const l = await listaGastos(yo, hoyMadrid().slice(0, 7));
  return (
    <MarcoDinero yo={yo} area="prever" activo="gastos">
      <Link href="/prever/gastos" className="text-sm font-semibold text-carbon/55 hover:text-carbon">← Gastos del mes</Link>
      <h1 className="mb-3 mt-1 border-b border-black/10 pb-3 text-[24px] font-bold leading-tight text-carbon">La lista de gastos</h1>
      <Lista l={l} />
    </MarcoDinero>
  );
}
