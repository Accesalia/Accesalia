import Link from "next/link";
import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerLibro, type Libro } from "../../../lib/cobros";
import { fichaFacturacion } from "../../../lib/fichaFacturacion";
import { MarcoDinero } from "../MarcoDinero";
import { FichaFacturacionVista } from "./FichaFacturacion";

export const dynamic = "force-dynamic";

// LA FICHA DE FACTURACION DE UNA OPP (Monica, 19-oct-2026, su maqueta aprobada).
// Se llega con «Buscar la facturacion de una opp» (en la franja de Cobrar · Pagar…)
// y desde las listas. Ver lib/fichaFacturacion.ts.

export default async function PaginaFicha({ params, searchParams }: { params: Promise<{ oppId: string }>; searchParams: Promise<{ libro?: string }> }) {
  const { oppId } = await params;
  // Cada libro lo suyo (12-oct-2026): ?libro=ecobalance es el de Ana.
  const libro: Libro = (await searchParams).libro === "ecobalance" ? "ecobalance" : "accesalia";
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/facturacion/${oppId}`);
  if (!puedeVerLibro(yo, libro)) redirect("/menu");
  const f = await fichaFacturacion(oppId, libro);
  const sufijo = libro === "ecobalance" ? "?libro=ecobalance" : "";
  return (
    <MarcoDinero yo={yo} area="cobrar">
      {f ? (
        <>
          <FichaFacturacionVista f={f} />
          {/* Lo que la ficha aun no hace (fecha prevista, notas, pausar, fraccionar): en la vista de hitos. */}
          <p className="mt-6 text-[13px] text-carbon/60">
            Fecha prevista, notas, pausar o fraccionar un hito:{" "}
            <Link href={`/facturacion/${oppId}/gestion${sufijo}`} className="font-semibold text-[#104269] hover:underline">
              gestionar los hitos →
            </Link>
            {" · "}
            <Link href={`/ficha-financiera/${oppId}`} className="font-semibold text-[#104269] hover:underline">
              ficha financiera →
            </Link>
          </p>
        </>
      ) : (
        <p className="mt-6 text-carbon/70">Esa oportunidad no existe.</p>
      )}
    </MarcoDinero>
  );
}
