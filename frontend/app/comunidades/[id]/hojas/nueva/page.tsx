import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../../lib/comunidades";
import { bloquesActivos, contratasParaSelector } from "../../../../../lib/hojas";
import { crearHojaEncargo } from "../acciones";
import { SelectorConceptos } from "../SelectorConceptos";

export const dynamic = "force-dynamic";

const campo = "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon outline-none transition focus:border-lima";
const etiqueta = "text-xs font-medium uppercase tracking-wide text-carbon/45";

export default async function NuevaHoja({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, bloques, contratas] = await Promise.all([
    comunidadPorId(id),
    bloquesActivos(),
    contratasParaSelector(),
  ]);
  if (!ficha) notFound();

  const crear = crearHojaEncargo.bind(null, id);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href={`/comunidades/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← {ficha.comunidad.nombre}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Nueva hoja de encargo</h1>
        <p className="mt-1 text-carbon/55">
          Compón la hoja eligiendo los conceptos del catálogo. Se guarda como <strong>borrador</strong> (versión 1);
          después se firma y se envía.
        </p>

        <form action={crear} className="mt-8 space-y-8">
          {/* Datos de la actuacion */}
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Actuación</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className={etiqueta}>Descripción de la actuación</span>
                <input name="descripcion" className={campo} placeholder="Instalación de ascensor con derribo de escalera" />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={etiqueta}>Emisor</span>
                  <select name="emisor" defaultValue="accesalia" className={campo}>
                    <option value="accesalia">Accesalia</option>
                    <option value="daniel_autonomo">Daniel (autónomo)</option>
                  </select>
                </label>
                <label className="block">
                  <span className={etiqueta}>Quién genera la hoja</span>
                  <select name="generada_por" defaultValue="secretaria_comercial" className={campo}>
                    <option value="secretaria_comercial">Secretaría comercial</option>
                    <option value="comercial">Comercial</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          {/* Pagador y tarifa */}
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Pagador y tarifa</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={etiqueta}>Quién paga</span>
                <select name="pagador_tipo" defaultValue="comunidad" className={campo}>
                  <option value="comunidad">La comunidad</option>
                  <option value="contrata">Una contrata</option>
                </select>
              </label>
              <label className="block">
                <span className={etiqueta}>Contrata (si paga la contrata)</span>
                <select name="pagador_contrata_id" defaultValue="" className={campo}>
                  <option value="">—</option>
                  {contratas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={etiqueta}>Canal / tarifa</span>
                <select name="canal_tarifa" defaultValue="" className={campo}>
                  <option value="">—</option>
                  <option value="directo_comunidad">Directo a comunidad</option>
                  <option value="convenio_contratista">Convenio con contratista</option>
                  <option value="condiciones_especiales">Condiciones especiales</option>
                </select>
              </label>
              <label className="block">
                <span className={etiqueta}>Vigencia (meses)</span>
                <input name="vigencia_meses" type="number" defaultValue={3} className={campo} />
              </label>
              <label className="block sm:col-span-2">
                <span className={etiqueta}>Forma de pago</span>
                <input name="forma_pago" className={campo} placeholder="50% a la firma, 50% a la entrega…" />
              </label>
            </div>
          </section>

          {/* Conceptos: el corazon del generador */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Conceptos de la hoja</h2>
              <span className="text-xs text-carbon/40">marca lo que incluye y pon su honorario</span>
            </div>
            <SelectorConceptos bloques={bloques} />
          </section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-lima px-6 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Crear hoja (borrador)
            </button>
            <Link href={`/comunidades/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
