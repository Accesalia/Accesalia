import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { documentosDe } from "../../../lib/documentosReferencia";

export const dynamic = "force-dynamic";

// DOCUMENTACION DE MARKETING (Monica, 10-oct-2026): "es solo crear la pantalla
// con la lista de docs y dos botones: ver y descargar". Dossier, triptico,
// presentaciones... (tabla documentos_referencia, seccion marketing).

const BOTON =
  "inline-flex h-[34px] items-center justify-center rounded-[10px] px-4 text-[13px] font-bold transition";

const TIPO = { pdf: "PDF", powerpoint: "PowerPoint", otro: "Fichero" } as const;
const mb = (n: number | null) => (n ? `${(n / 1e6).toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB` : null);

export default async function Marketing() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/marketing");
  const docs = await documentosDe("marketing");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
        <Link href="/referencia" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Documentación de referencia
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Documentación de marketing</h1>
        <p className="mt-1 text-carbon/55">Dossieres, folletos y presentaciones para enseñar o mandar.</p>

        <div className="mt-6 space-y-3">
          {docs.length === 0 ? (
            <p className="rounded-2xl border border-black/5 bg-white p-5 text-[13px] text-carbon/55 shadow-sm">Todavía no hay documentos.</p>
          ) : (
            docs.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="text-[16px] font-bold text-carbon">{d.titulo}</div>
                  <div className="mt-0.5 text-[12.5px] text-carbon/55">
                    {[TIPO[d.tipo], mb(d.tamano)].filter(Boolean).join(" · ")}
                    {d.descripcion && <> · {d.descripcion}</>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {d.ver && (
                    <a href={d.ver} target="_blank" rel="noreferrer" className={BOTON + " bg-lima text-carbon hover:bg-lima-dark hover:text-white"}>
                      Ver
                    </a>
                  )}
                  {d.descargar && (
                    <a href={d.descargar} className={BOTON + " border border-carbon/20 bg-white text-carbon/80 hover:border-carbon/50"}>
                      Descargar
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
