import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { SelectorPersona } from "../../../components/SelectorPersona";
import { comunidadPorId, nombreAdministracion } from "../../../../lib/comunidades";
import { puestosParaElegir, empresasParaElegir } from "../../../../lib/comercial";
import { cambiarAdministracion } from "../../acciones";

export const dynamic = "force-dynamic";

const labelCls = "block text-sm font-medium text-carbon/70";
const inputCls =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon " +
  "outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";

export default async function CambiarAdministracion(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [ficha, puestos, empresas] = await Promise.all([
    comunidadPorId(id),
    puestosParaElegir(),
    empresasParaElegir(),
  ]);
  if (!ficha) notFound();

  const { comunidad: c, administracion, administracionesAnteriores } = ficha;
  const accion = cambiarAdministracion.bind(null, id);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[720px] px-6 py-10">
        <Link href={`/comunidades/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← {c.nombre}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">
          {administracion ? "Cambiar de administración" : "Asignar administración"}
        </h1>

        {administracion && (
          <p className="mt-1 text-carbon/55">
            Ahora la lleva <strong className="font-medium text-carbon">{nombreAdministracion(administracion)}</strong>
            {administracion.persona && administracion.empresa && ` · ${administracion.persona}`}.
            Al guardar se conserva como anterior, no se borra.
          </p>
        )}

        <form action={accion} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <SelectorPersona
              puestos={puestos}
              empresas={empresas}
              etiqueta="¿Quién la lleva ahora?"
            />
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="desde">¿Desde cuándo?</label>
                <input id="desde" name="desde" type="date" className={inputCls} />
                {/* la mayoria de cambios llegan sin fecha, y poner hoy seria
                    mentir: mejor vacio, que significa "no se sabe" */}
                <p className="mt-1 text-xs text-carbon/45">
                  Si no lo sabes, déjalo vacío. Es mejor que poner una fecha inventada.
                </p>
              </div>
              <div>
                <label className={labelCls} htmlFor="motivo">¿Por qué cambió?</label>
                <input id="motivo" name="motivo" className={inputCls}
                  placeholder="Se jubiló, la comunidad cambió de gestora…" />
                <p className="mt-1 text-xs text-carbon/45">
                  Se guarda con la administración anterior.
                </p>
              </div>
            </div>
          </section>

          {administracionesAnteriores.length > 0 && (
            <section className="rounded-2xl border border-black/5 bg-black/[0.015] p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-carbon/40">
                Ya constan como anteriores
              </div>
              <ul className="mt-2 space-y-1 text-sm text-carbon/60">
                {administracionesAnteriores.map((a) => (
                  <li key={a.vinculoId}>
                    {a.empresa ?? a.persona ?? "Sin identificar"}
                    {a.hasta && <span className="text-carbon/40"> · hasta {a.hasta}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex items-center gap-3">
            <button type="submit"
              className="rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
              Guardar
            </button>
            <Link href={`/comunidades/${id}`}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-carbon/60 hover:text-carbon">
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
