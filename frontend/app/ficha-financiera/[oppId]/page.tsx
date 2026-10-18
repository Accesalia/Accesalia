import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { fichaFinanciera, vistaDe } from "../../../lib/fichaFinanciera";
import { FichaFinancieraV2 } from "./FichaV2";
import { Imprimir } from "./Imprimir";

export const dynamic = "force-dynamic";

// LA FICHA FINANCIERA DE UNA OPORTUNIDAD (Monica, 17-oct-2026): su ficha de 2025,
// con datos vivos. En pantalla, y «Descargar PDF» aparte. Cada uno ve sus
// secciones: direccion todo; Alexandra sin lo de Ecobalance; Ana solo lo de
// Ecobalance. Ver lib/fichaFinanciera.ts.
// 18-oct: la version nueva (dos columnas, sus colores); la anterior, en ./anterior.

export default async function PaginaFicha({ params }: { params: Promise<{ oppId: string }> }) {
  const { oppId } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/ficha-financiera/${oppId}`);
  const vista = vistaDe(yo);
  if (!vista) redirect("/menu");
  const f = await fichaFinanciera(oppId, vista);
  return (
    <div className="min-h-screen bg-[#934c09] print:bg-white">
      <div className="print:hidden">
        <BarraSuperior />
      </div>
      <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4 px-6 pt-4 text-sm print:hidden">
        <div className="rounded-lg bg-white/90 px-2 py-1">
          <Volver siNoHay="/ficha-financiera" />
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/ficha-financiera/${oppId}/anterior`} className="text-[13px] font-semibold text-[#f8f8ee] hover:underline">Versión anterior</Link>
          <Link href="/ficha-financiera" className="text-[13px] font-semibold text-[#f8f8ee] hover:underline">Otra dirección</Link>
          <Imprimir />
        </div>
      </div>
      {f ? <FichaFinancieraV2 f={f} vista={vista} /> : <p className="mx-auto mt-6 max-w-[1100px] px-6 text-[#f8f8ee]">Esa oportunidad no existe.</p>}
    </div>
  );
}
