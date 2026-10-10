import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { manias, type Mania } from "../../../lib/manias";
import { bonito } from "../../../lib/direccionNombre";
import { Filtros } from "./Filtros";
import { Lista } from "./Lista";

export const dynamic = "force-dynamic";

// MANIAS DETECTADAS (Monica, 10-oct-2026). La tabla manias_organismos: lo que
// cada ayuntamiento, junta, ECU o tecnico pide o hace a su manera, sacado de
// las notas de las fichas. Arriba el buscador por palabras (Lista.tsx); debajo,
// filtros por municipio, entidad y persona.
//
// LA FECHA MANDA: "una mania de un ayuntamiento de hace 5 años puede no ser tan
// relevante como una del mes pasado, y puede incluso contradecirla". Por eso
// van de la mas reciente a la mas antigua y cada una dice cuanto hace.
// La cita literal de la nota va a la vista, debajo de la mania: es la prueba.

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";

function contar(lista: Mania[], campo: (m: Mania) => string | null) {
  const n = new Map<string, number>();
  for (const m of lista) {
    const v = campo(m);
    if (v) n.set(v, (n.get(v) ?? 0) + 1);
  }
  return Array.from(n, ([valor, k]) => ({ valor, n: k })).sort((a, b) => a.valor.localeCompare(b.valor, "es"));
}

export default async function Manias({
  searchParams,
}: {
  searchParams: Promise<{ municipio?: string; entidad?: string; persona?: string }>;
}) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/manias");
  const filtro = await searchParams;
  const todas = (await manias()).map((m) => ({ ...m, municipio: m.municipio ? bonito(m.municipio) : null }));

  const lista = todas.filter(
    (m) =>
      (!filtro.municipio || m.municipio === filtro.municipio) &&
      (!filtro.entidad || m.entidad === filtro.entidad) &&
      (!filtro.persona || m.tecnico === filtro.persona),
  );

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
        <Link href="/referencia" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Documentación de referencia
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Manías detectadas</h1>
        <p className="mt-1 max-w-[70ch] text-carbon/55">
          Lo que cada ayuntamiento, junta, ECU o técnico pide o hace a su manera, sacado de las notas de las fichas.
          Las más recientes, arriba: una manía antigua puede haber cambiado.
        </p>

        <Lista manias={lista} total={lista.length}>
          <div className={CAJA + " mt-3 p-4"}>
            <Filtros
              actual={filtro}
              municipios={contar(todas, (m) => m.municipio)}
              entidades={contar(todas, (m) => m.entidad)}
              personas={contar(todas, (m) => m.tecnico)}
            />
            {(filtro.municipio || filtro.entidad || filtro.persona) && (
              <div className="mt-3 text-right text-[12.5px]">
                <Link href="/referencia/manias" scroll={false} className="font-semibold text-[#2B6CB0] hover:underline">
                  Quitar los filtros
                </Link>
              </div>
            )}
          </div>
        </Lista>
      </main>
    </div>
  );
}
