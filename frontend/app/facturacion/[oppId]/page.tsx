import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { detalleCobro, puedeVerLibro, type Libro } from "../../../lib/cobros";
import { proformasPorHito } from "../../../lib/proformas";
import { Cobro } from "./Cobro";

export const dynamic = "force-dynamic";

// FACTURACION · UNA OPORTUNIDAD (Monica, 11-oct-2026): los documentos firmados
// (la fuente de verdad, con su visor en la pagina), sus hitos y subhitos, y las
// facturas que los pagan. Arriba, los cuadres.

export default async function PaginaCobro({ params, searchParams }: { params: Promise<{ oppId: string }>; searchParams: Promise<{ libro?: string }> }) {
  const { oppId } = await params;
  // Cada libro lo suyo (12-oct-2026): ?libro=ecobalance es el de Ana.
  const libro: Libro = (await searchParams).libro === "ecobalance" ? "ecobalance" : "accesalia";
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/facturacion/${oppId}`);
  if (!puedeVerLibro(yo, libro)) redirect("/menu");
  const [d, proformas] = await Promise.all([detalleCobro(oppId, libro), proformasPorHito(oppId)]);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Volver siNoHay="/facturacion" />
        {d ? <Cobro d={d} proformas={proformas} /> : <p className="mt-6 text-carbon/70">Esa oportunidad no existe.</p>}
      </main>
    </div>
  );
}
