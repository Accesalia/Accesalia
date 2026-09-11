import type { ConvocatoriaResumen, VisorConvocatoria } from "@/lib/datos";
import { BarraSuperior } from "./BarraSuperior";
import { GridCasillas } from "./GridCasillas";
import { SelectorConvocatoria } from "./SelectorConvocatoria";

function formatearFecha(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function Fecha({ etiqueta, iso }: { etiqueta: string; iso: string | null }) {
  const valor = formatearFecha(iso);
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-carbon/40">{etiqueta}</p>
      {valor ? (
        <p className="font-medium text-carbon">{valor}</p>
      ) : (
        <p className="font-medium italic text-carbon/35">Por confirmar</p>
      )}
    </div>
  );
}

export function Visor({
  datos,
  convocatorias,
}: {
  datos: VisorConvocatoria;
  convocatorias: ConvocatoriaResumen[];
}) {
  const { convocatoria, extraccion } = datos;
  const p1 = extraccion.borrador_prompt1;
  const p2 = extraccion.borrador_prompt2;
  const casillas = p2?.casillas ?? [];
  const requisitos = p1?.requisitos_a_cumplir ?? [];
  const resumen = p1?.resumen_convocatoria?.trim();

  return (
    <div className="min-h-screen">
      <BarraSuperior />

      {/* Cabecera de la convocatoria */}
      <section className="border-b border-black/5 bg-white px-6 py-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-carbon/40">
              Convocatoria
            </span>
            <SelectorConvocatoria convocatorias={convocatorias} actualId={convocatoria.id} />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-lima-dark">
                {convocatoria.entidad}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-carbon sm:text-3xl">
                {convocatoria.plan}{" "}
                <span className="text-carbon/40">{convocatoria.anio}</span>
              </h1>
            </div>
            <div className="flex gap-6 text-sm">
              <Fecha etiqueta="Apertura" iso={convocatoria.fecha_apertura} />
              <Fecha etiqueta="Cierre" iso={convocatoria.fecha_cierre} />
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Izquierda ~70%: grid de casillas con pestañas + aplicabilidad */}
          <div className="lg:w-[70%]">
            {casillas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/10 p-8 text-center text-carbon/50">
                Aún no se han modelado las casillas (prompt 2).
              </p>
            ) : (
              <GridCasillas casillas={casillas} convocatoriaId={convocatoria.id} />
            )}
          </div>

          {/* Derecha ~30%: requisitos de elegibilidad */}
          <aside className="lg:w-[30%]">
            <div className="sticky top-20 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-carbon">Requisitos de elegibilidad</h2>
              <p className="mt-0.5 text-sm text-carbon/50">
                Condiciones que debe cumplir el edificio o la comunidad
              </p>
              <ul className="mt-4 space-y-3">
                {requisitos.map((r) => (
                  <li key={r.identificador} className="border-l-2 border-lima pl-3">
                    <p className="text-sm font-medium leading-snug text-carbon">{r.descripcion}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-carbon/35">
                      {r.identificador}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Abajo: resumen divulgativo (IA) */}
        <section className="mt-10 rounded-2xl bg-lima-soft p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-carbon">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-lima text-xs font-bold text-white">
              i
            </span>
            ¿Qué es esta ayuda?
          </h2>
          {resumen ? (
            <p className="mt-3 max-w-4xl text-[15px] leading-relaxed text-carbon/80">{resumen}</p>
          ) : (
            <p className="mt-3 max-w-4xl text-[15px] leading-relaxed text-carbon/50">
              El resumen divulgativo aún no se ha generado para esta convocatoria.
              Se creará la próxima vez que se ejecute la extracción (prompt&nbsp;1),
              ahora que el campo <code className="rounded bg-white/60 px-1">resumen_convocatoria</code> forma
              parte de la salida.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
