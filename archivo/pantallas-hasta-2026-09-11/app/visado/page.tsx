import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { contarComunidades } from "../../lib/comunidades";
import { SelectorComunidad } from "../expediente/SelectorComunidad";
import { visadosPanel, resumenVisado, ESTADO_VISADO, MOMENTO_LABEL, TIPO_VISADO_LABEL, type VisadoFila } from "../../lib/visado";

export const dynamic = "force-dynamic";

function fechaCorta(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
function eur(n: number): string {
  return `${Math.round(n).toLocaleString("es-ES")} €`;
}
// La fecha relevante segun el estado (para saber "desde cuando lleva ahi").
function fechaEstado(x: VisadoFila): string | null {
  return x.estado === "visado" ? x.fechaVisado : x.fechaEnvio;
}
function diasDesde(v: string | null): number | null {
  if (!v) return null;
  const d = Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  return d >= 0 ? d : null;
}

// Orden de los estados en las pastillas.
const ESTADOS = ["pendiente_enviar", "enviado", "requerido", "visado"] as const;

function Tarjeta({ etiqueta, valor, sub, acento }: { etiqueta: string; valor: string; sub?: string; acento?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-carbon/40">{etiqueta}</div>
      <div className={`mt-1 text-2xl font-bold ${acento ?? "text-carbon"}`}>{valor}</div>
      {sub && <div className="mt-0.5 text-xs text-carbon/45">{sub}</div>}
    </div>
  );
}

export default async function EntradaVisado({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const [total, filas] = await Promise.all([contarComunidades(), visadosPanel()]);
  const r = resumenVisado(filas);

  const sel = f ?? null;
  let lista: VisadoFila[] = [];
  let titulo = "";
  if (sel === "pausado") {
    lista = filas.filter((x) => x.pausado);
    titulo = "Parados";
  } else if (sel === "sin_pagar") {
    lista = filas.filter((x) => x.estado === "visado" && !x.pagado);
    titulo = "Visados con tasa pendiente";
  } else if (sel && (ESTADOS as readonly string[]).includes(sel)) {
    lista = filas.filter((x) => x.estado === sel);
    titulo = ESTADO_VISADO[sel]?.label ?? sel;
  }

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="text-center">
          <span className="text-4xl text-lima-dark">✎</span>
          <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">Visado COAM</h1>
          <p className="mx-auto mt-2 max-w-md text-carbon/55">
            El visado no da sustos de flujo: lo que importa es lo económico. Aquí, el coste y qué falta cobrar o enviar.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <SelectorComunidad autoFocus hrefBase="/comunidades/" hrefSuffix="/visado" />
          <p className="mt-2 text-center text-xs text-carbon/40">{total.toLocaleString("es-ES")} comunidades · escribe 2+ letras</p>
        </div>

        {/* Resumen economico */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tarjeta etiqueta="Visados" valor={r.total.toLocaleString("es-ES")} sub={`${r.porEstado["visado"] ?? 0} concedidos`} />
          <Link href={sel === "sin_pagar" ? "/visado" : "/visado?f=sin_pagar"} scroll={false} className="block">
            <Tarjeta etiqueta="Tasa pendiente" valor={eur(r.tasasPendientes)} sub={`${r.visadosSinPagar} visado(s) sin pagar`} acento="text-amber-600" />
          </Link>
          <Tarjeta etiqueta="∑ Tasas" valor={eur(r.tasasTotal)} sub="coste de visado conocido" />
          <Tarjeta etiqueta="Re-visados" valor={r.reVisados.toLocaleString("es-ES")} sub="proyectos visados +1 vez" acento={r.reVisados ? "text-red-600" : "text-carbon"} />
        </div>
        <p className="mt-2 text-center text-[11px] text-carbon/35">Las tasas históricas de Monday no venían con importe: se irán rellenando a mano.</p>

        {/* Filtros por estado */}
        <div className="mt-10">
          <p className="text-center text-xs uppercase tracking-wide text-carbon/35">¿Por dónde va cada visado?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ESTADOS.map((e) => {
              const n = r.porEstado[e] ?? 0;
              const activo = sel === e;
              return (
                <Link
                  key={e}
                  href={activo ? "/visado" : `/visado?f=${e}`}
                  scroll={false}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                    activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/70 hover:border-lima"
                  }`}
                >
                  {ESTADO_VISADO[e].label}
                  <span className={`rounded-full px-1.5 text-xs ${activo ? "bg-carbon/10" : "bg-black/5 text-carbon/50"}`}>{n}</span>
                </Link>
              );
            })}
            <Link
              href={sel === "pausado" ? "/visado" : "/visado?f=pausado"}
              scroll={false}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                sel === "pausado" ? "border-red-400 bg-red-500 font-semibold text-white" : "border-red-200 bg-white text-red-600 hover:border-red-400"
              }`}
            >
              ⏸ Parados <span className={`rounded-full px-1.5 text-xs ${sel === "pausado" ? "bg-white/20" : "bg-red-50"}`}>{r.pausados}</span>
            </Link>
          </div>

          {sel && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-carbon">{titulo} · {lista.length} visado(s)</div>
              {lista.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-carbon/40">Ninguno aquí.</p>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-black/[0.02] text-left text-[11px] uppercase tracking-wide text-carbon/40">
                      <tr>
                        <th className="px-5 py-2 font-semibold">Comunidad</th>
                        <th className="px-3 py-2 font-semibold">Qué</th>
                        <th className="px-3 py-2 font-semibold">Código TL</th>
                        <th className="px-3 py-2 font-semibold">Tasa</th>
                        <th className="px-3 py-2 font-semibold">{sel === "visado" ? "Visado" : "Desde · antigüedad"}</th>
                        <th className="px-3 py-2 font-semibold">Tramita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {lista.map((x) => (
                        <tr key={x.visadoId} className="transition hover:bg-lima-soft/40">
                          <td className="px-5 py-2.5">
                            <Link href={`/comunidades/${x.comunidadId}/visado`} className="font-medium text-carbon hover:text-lima-dark">{x.comunidadNombre}</Link>
                            <div className="text-xs text-carbon/40">{[x.municipio, ...x.tipos].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-carbon/60">
                            {MOMENTO_LABEL[x.momento] ?? x.momento}{x.tipo ? ` · ${TIPO_VISADO_LABEL[x.tipo] ?? x.tipo}` : ""}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-carbon/70">{x.referencia ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-carbon/70">
                            {x.tasa == null ? "—" : eur(x.tasa)}
                            {x.tasa != null && (x.pagado ? <span className="ml-1 text-emerald-600">✓</span> : <span className="ml-1 text-amber-600">pdte</span>)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-carbon/70">
                            {(() => {
                              const fe = fechaEstado(x);
                              if (!fe) return <span className="text-carbon/30">—</span>;
                              const dias = x.estado !== "visado" ? diasDesde(fe) : null;
                              return (
                                <span>
                                  {fechaCorta(fe)}
                                  {dias != null && <span className={`ml-1 text-xs ${dias > 30 ? "font-semibold text-red-500" : "text-carbon/40"}`}>· {dias}d</span>}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2.5 text-carbon/60">{x.tramita ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
