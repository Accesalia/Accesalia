import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { quienSoy } from "../../../../lib/sesion";
import { detalleCobro, puedeVerLibro, type Libro } from "../../../../lib/cobros";
import { proformasPorHito } from "../../../../lib/proformas";
import { Cobro } from "../Cobro";

export const dynamic = "force-dynamic";

// LA GESTION DE LOS HITOS DE UNA OPP (la vista de facturacion del 11-oct-2026): la hoja
// firmada al lado, y en cada hito su fecha prevista, notas, pausar y fraccionar. Desde
// el 19-oct la entrada es la Ficha de facturacion (../page.tsx); esta queda para esas
// herramientas hasta que pasen a la ficha.

export default async function GestionHitos({ params, searchParams }: { params: Promise<{ oppId: string }>; searchParams: Promise<{ libro?: string }> }) {
  const { oppId } = await params;
  const libro: Libro = (await searchParams).libro === "ecobalance" ? "ecobalance" : "accesalia";
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/facturacion/${oppId}/gestion`);
  if (!puedeVerLibro(yo, libro)) redirect("/menu");
  const [d, proformas] = await Promise.all([detalleCobro(oppId, libro), proformasPorHito(oppId)]);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Link href={`/facturacion/${oppId}${libro === "ecobalance" ? "?libro=ecobalance" : ""}`} className="text-[13.5px] font-semibold text-lima-dark hover:underline">
          ← Ficha de facturación
        </Link>
        {d ? <Cobro d={d} proformas={proformas} /> : <p className="mt-6 text-carbon/70">Esa oportunidad no existe.</p>}
      </main>
    </div>
  );
}
