import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { fichaFinanciera, vistaDe } from "../../../lib/fichaFinanciera";
import { FichaFinanciera } from "./Ficha";
import { Imprimir } from "./Imprimir";

export const dynamic = "force-dynamic";

// LA FICHA FINANCIERA DE UNA OPORTUNIDAD (Monica, 17-oct-2026): su ficha de 2025,
// con datos vivos. En pantalla, y «Descargar PDF» aparte. Cada uno ve sus
// secciones: direccion todo; Alexandra sin lo de Ecobalance; Ana solo lo de
// Ecobalance. Ver lib/fichaFinanciera.ts.

export default async function PaginaFicha({ params }: { params: Promise<{ oppId: string }> }) {
  const { oppId } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/ficha-financiera/${oppId}`);
  const vista = vistaDe(yo);
  if (!vista) redirect("/menu");
  const f = await fichaFinanciera(oppId, vista);
  return (
    <div className="min-h-screen print:bg-white">
      <div className="print:hidden">
        <BarraSuperior />
      </div>
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-5 text-sm sm:px-6 print:p-0">
        <div className="mb-4 flex items-center justify-between gap-4 print:hidden">
          <Volver siNoHay="/ficha-financiera" />
          <div className="flex items-center gap-3">
            <Link href="/ficha-financiera" className="text-[13px] font-semibold text-[#2f5f8a] hover:underline">Otra dirección</Link>
            <Imprimir />
          </div>
        </div>
        {f ? <FichaFinanciera f={f} vista={vista} /> : <p className="mt-6 text-carbon/70">Esa oportunidad no existe.</p>}
      </main>
    </div>
  );
}
