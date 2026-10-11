import { redirect } from "next/navigation";
import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { Volver } from "../components/Volver";
import { quienSoy } from "../../lib/sesion";
import { porCobrar, puedeVerCobros } from "../../lib/cobros";
import { PorCobrar } from "./PorCobrar";

export const dynamic = "force-dynamic";

// FACTURACION · LO QUE QUEDA POR COBRAR (Monica, 11-oct-2026): la vista general.
// Una fila por oportunidad con documentos firmados: lo firmado, lo facturado,
// lo cobrado, lo que queda por facturar y su proximo hito. De cada fila se entra
// a la vista de la oportunidad. Arriba, la puerta al cronograma de caja.

export default async function PaginaFacturacion() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const filas = await porCobrar();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Volver siNoHay="/menu" />
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-black/10 pb-4">
          <h1 className="text-3xl font-bold leading-tight text-carbon">Facturación y asignación</h1>
          <Link href="/facturacion/caja" className="rounded-xl border border-black/10 bg-white px-4 py-2 text-[13px] font-semibold text-carbon/75 hover:border-carbon/40">
            Cronograma y previsión de caja →
          </Link>
        </div>
        <PorCobrar filas={filas} />
      </main>
    </div>
  );
}
