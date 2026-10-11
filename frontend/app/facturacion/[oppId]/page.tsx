import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { detalleCobro, puedeVerCobros } from "../../../lib/cobros";
import { Cobro } from "./Cobro";

export const dynamic = "force-dynamic";

// FACTURACION · UNA OPORTUNIDAD (Monica, 11-oct-2026): los documentos firmados
// (la fuente de verdad, con su visor en la pagina), sus hitos y subhitos, y las
// facturas que los pagan. Arriba, los cuadres.

export default async function PaginaCobro({ params }: { params: Promise<{ oppId: string }> }) {
  const { oppId } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/facturacion/${oppId}`);
  if (!puedeVerCobros(yo)) redirect("/menu");
  const d = await detalleCobro(oppId);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Volver siNoHay="/facturacion" />
        {d ? <Cobro d={d} /> : <p className="mt-6 text-carbon/70">Esa oportunidad no existe.</p>}
      </main>
    </div>
  );
}
