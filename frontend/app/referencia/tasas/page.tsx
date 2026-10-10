import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { bonito } from "../../../lib/direccionNombre";
import { arbolTipos, municipiosConTasas, reglasDe, tramitesDe } from "../../../lib/tasas";
import { Calculadora } from "./Calculadora";

export const dynamic = "force-dynamic";

// TASAS DE AYUNTAMIENTO (Monica, 10-oct-2026): "un sitio donde visualizarlas
// si alguien pregunta 'cuanto es el ICIO en Fuenlabrada'", la calculadora y la
// ficha para los vecinos. Datos: reglas_tasas y tramites (solo lo vigente).
// El primer relleno sale del barrido de expedientes y esta SIN VALIDAR.

export default async function Tasas({ searchParams }: { searchParams: Promise<{ municipio?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/tasas");
  const { municipio } = await searchParams;
  const municipios = await municipiosConTasas();
  const elegido = municipios.find((m) => m.id === municipio) ?? null;
  const [reglas, tramites, arbol] = elegido
    ? await Promise.all([reglasDe(elegido.id), tramitesDe(elegido.id), arbolTipos()])
    : [[], [], []];
  const sinValidar = reglas.some((r) => !r.validada) || tramites.some((t) => !t.validada);

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <BarraSuperior />
      </div>
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 print:max-w-none print:p-0">
        <div className="print:hidden">
          <Link href="/referencia" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
            ← Documentación de referencia
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-carbon">Tasas de ayuntamiento</h1>
          <p className="mt-1 max-w-[75ch] text-carbon/55">
            Cuánto se paga en cada municipio y cómo se pide la licencia o la declaración responsable. Elige el municipio;
            con el importe de una obra, lo calcula y saca la ficha para los vecinos.
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {municipios.map((m) => (
              <Link
                key={m.id}
                href={`/referencia/tasas?municipio=${m.id}`}
                scroll={false}
                className={
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition " +
                  (m.id === elegido?.id
                    ? "border-lima-dark bg-lima-soft text-carbon"
                    : "border-black/10 bg-white text-carbon/65 hover:text-carbon")
                }
              >
                {bonito(m.nombre)}
              </Link>
            ))}
          </div>

          {elegido && sinValidar && (
            <p className="mt-4 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
              <b>Sin validar.</b> Sacado de expedientes reales de 2024-2026 (cada regla dice de cuál). Hay que revisarlo
              antes de fiarse de las cifras.
            </p>
          )}
          {!elegido && (
            <p className="mt-6 rounded-2xl border border-black/5 bg-white p-5 text-[13px] text-carbon/55 shadow-sm">
              Elige un municipio. Hoy están los siete grandes; los demás se irán añadiendo.
            </p>
          )}
        </div>

        {elegido && (
          <Calculadora key={elegido.id} municipio={bonito(elegido.nombre)} reglas={reglas} tramites={tramites} arbol={arbol} />
        )}
      </main>
    </div>
  );
}
