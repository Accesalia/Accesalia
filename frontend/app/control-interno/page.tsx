import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { quienSoy } from "../../lib/sesion";
import { periodo, tecnicos } from "../../lib/negocio";
import { Fechas, Hueco, REJILLA, Seccion } from "../negocio/Piezas";

export const dynamic = "force-dynamic";

// CONTROL INTERNO (Monica, 12-oct-2026): solo Daniel y Monica. Los tecnicos
// entre fechas. HOY ES UNA PAGINA DE HUECOS: no hay fechas de las etapas del
// proyecto ni requerimientos guardados. Cada hueco dice que va y que falta.

const POR_TECNICO = [
  { titulo: "Proyectos hechos", va: "cuántos proyectos terminó cada técnico entre las fechas.", falta: "la fecha de entrega del técnico en cada proyecto (las áreas y sus fases)." },
  { titulo: "Requerimientos recibidos", va: "cuántos RQ llegaron de sus proyectos, y de qué organismo.", falta: "la tabla de requerimientos está vacía: hay que apuntarlos al recibirlos." },
  { titulo: "Tiempo por tipo de proyecto", va: "lo mínimo y lo máximo que tarda en cada tipo (rampa, ascensor, SATE…).", falta: "las fechas de inicio y entrega de cada proyecto, y su tipo." },
  { titulo: "Desviación sobre lo previsto", va: "días de más o de menos frente a la estimación del cronograma.", falta: "guardar la fecha prevista al asignar, y la real al entregar." },
];

const SALI = [
  { titulo: "Informe de Sali, a demanda", va: "un informe de cada técnico cuando lo pidas: qué ha hecho, cómo, dónde se atasca.", falta: "los datos de arriba; Sali escribe sobre ellos." },
  { titulo: "Comparativa de Sali", va: "los técnicos comparados entre sí, con lo que cuenta y lo que no.", falta: "los mismos datos, de todos." },
  { titulo: "Evolución mes a mes", va: "cómo va cada técnico mes a mes: proyectos, RQ y tiempos.", falta: "unos meses de datos apuntados." },
];

export default async function ControlInterno({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/control-interno");
  if (!yo.veTodo) redirect("/menu");
  const { desde, hasta } = periodo(await searchParams);
  const lista = await tecnicos();
  const th = "px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-carbon/60";

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Control interno</h1>
        <p className="mt-1 text-carbon/65">Los técnicos entre fechas. Solo dirección. De momento casi todo son huecos: cada uno dice qué irá y qué falta.</p>
        <Fechas desde={desde} hasta={hasta} />

        <Seccion titulo="Lo que se medirá de cada técnico">
          <div className={REJILLA}>
            {POR_TECNICO.map((h) => (
              <Hueco key={h.titulo} {...h} />
            ))}
          </div>
        </Seccion>

        <Seccion titulo={`Técnicos (${lista.length})`} sub="Los que tienen la función de proyecto, como en el cronograma.">
          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
            <table className="w-full text-[14px]">
              <thead className="border-b border-black/10">
                <tr>
                  <th className={th}>Técnico</th>
                  {POR_TECNICO.map((h) => (
                    <th key={h.titulo} className={th}>
                      {h.titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {lista.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2">{t.nombre}</td>
                    {POR_TECNICO.map((h) => (
                      <td key={h.titulo} className="px-3 py-2 text-carbon/40">
                        sin dato
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>

        <Seccion titulo="Sali">
          <div className={REJILLA}>
            {SALI.map((h) => (
              <Hueco key={h.titulo} {...h} />
            ))}
          </div>
        </Seccion>
      </main>
    </div>
  );
}
