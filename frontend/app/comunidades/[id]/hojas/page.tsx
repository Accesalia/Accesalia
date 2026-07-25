import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../lib/comunidades";
import { hojasDeComunidad, estadoHoja } from "../../../../lib/hojas";

export const dynamic = "force-dynamic";

function eur(n: number | null): string {
  if (n == null) return "—";
  return `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
function fecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function HojasDeComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, hojas] = await Promise.all([comunidadPorId(id), hojasDeComunidad(id)]);
  if (!ficha) notFound();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-10">
        <Link href={`/comunidades/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← {ficha.comunidad.nombre}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-carbon sm:text-3xl">Hojas de encargo</h1>
            <p className="mt-1 text-carbon/55">{hojas.length} hoja(s) en esta comunidad</p>
          </div>
          <Link
            href={`/comunidades/${id}/hojas/nueva`}
            className="rounded-full bg-lima px-5 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            + Nueva hoja
          </Link>
        </div>

        {hojas.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-sm text-carbon/40">
            Aún no hay hojas de encargo. Crea la primera.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {hojas.map((h) => {
              const est = estadoHoja(h.estado);
              return (
                <li key={h.id}>
                  <Link
                    href={`/comunidades/${id}/hojas/${h.id}`}
                    className="block rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:border-lima hover:shadow-md"
                  >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${est.clase}`}>
                          {est.label}
                        </span>
                        {h.tienePdf && (
                          <span className="rounded-full bg-carbon px-2 py-0.5 text-[10px] font-semibold text-white" title="Tiene PDF firmado">
                            📄 PDF
                          </span>
                        )}
                        {h.numero_hoja && <span className="text-xs text-carbon/40">{h.numero_hoja}</span>}
                      </div>
                      <p className="mt-1.5 text-sm text-carbon">
                        {h.descripcion || <span className="text-carbon/30">Sin descripción</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-carbon/45">
                        {fecha(h.fecha_creacion)} · {h.numConceptos} concepto(s) ·{" "}
                        {h.pagador_tipo === "contrata" ? "paga la contrata" : "paga la comunidad"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wide text-carbon/40">Total</div>
                      <div className="text-base font-bold text-carbon">{eur(h.importe)}</div>
                    </div>
                  </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
