import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { contarComunidades } from "../../lib/comunidades";
import { SelectorComunidad } from "../expediente/SelectorComunidad";
import { proyectosPorPunto, PUNTOS } from "../../lib/proyecto";

export const dynamic = "force-dynamic";

function fechaCorta(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
function pagadorLabel(v: string | null): string {
  if (!v) return "—";
  return v.toUpperCase() === "CDAD" ? "Comunidad" : v;
}

export default async function EntradaProyecto({ searchParams }: { searchParams: Promise<{ punto?: string }> }) {
  const { punto } = await searchParams;
  const [total, filas] = await Promise.all([contarComunidades(), proyectosPorPunto()]);

  const conteo: Record<string, number> = {};
  for (const f of filas) conteo[f.punto] = (conteo[f.punto] ?? 0) + 1;
  const pausados = filas.filter((f) => f.pausado).length;

  const sel = punto === "pausado" ? "pausado" : PUNTOS.some((p) => p.clave === punto) ? punto : null;
  const lista = sel === "pausado" ? filas.filter((f) => f.pausado) : sel ? filas.filter((f) => f.punto === sel) : [];
  const titulo = sel === "pausado" ? "Pausados" : PUNTOS.find((p) => p.clave === sel)?.label ?? "";

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="text-center">
          <span className="text-4xl text-lima-dark">▤</span>
          <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">Proyecto técnico</h1>
          <p className="mx-auto mt-2 max-w-md text-carbon/55">
            Busca un proyecto, o filtra por el punto en que está cada uno para ver qué necesita moverse.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <SelectorComunidad autoFocus hrefBase="/comunidades/" hrefSuffix="/proyecto" />
          <p className="mt-2 text-center text-xs text-carbon/40">{total.toLocaleString("es-ES")} comunidades · escribe 2+ letras</p>
        </div>

        {/* Filtros por punto */}
        <div className="mt-12">
          <p className="text-center text-xs uppercase tracking-wide text-carbon/35">¿En qué punto está cada proyecto?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {PUNTOS.map((p) => {
              const n = conteo[p.clave] ?? 0;
              const activo = sel === p.clave;
              return (
                <Link
                  key={p.clave}
                  href={activo ? "/proyecto" : `/proyecto?punto=${p.clave}`}
                  scroll={false}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                    activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/70 hover:border-lima"
                  } ${p.necesitaTecnico && !activo ? "ring-1 ring-amber-300" : ""}`}
                  title={p.necesitaTecnico ? "Necesita asignar técnico" : undefined}
                >
                  {p.label}
                  <span className={`rounded-full px-1.5 text-xs ${activo ? "bg-carbon/10" : "bg-black/5 text-carbon/50"}`}>{n}</span>
                </Link>
              );
            })}
            <Link
              href={sel === "pausado" ? "/proyecto" : "/proyecto?punto=pausado"}
              scroll={false}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                sel === "pausado" ? "border-red-400 bg-red-500 font-semibold text-white" : "border-red-200 bg-white text-red-600 hover:border-red-400"
              }`}
            >
              ⏸ Pausados <span className={`rounded-full px-1.5 text-xs ${sel === "pausado" ? "bg-white/20" : "bg-red-50"}`}>{pausados}</span>
            </Link>
          </div>

          {sel && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-carbon">
                {titulo} · {lista.length} proyecto(s)
              </div>
              {lista.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-carbon/40">Ninguno aquí.</p>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-black/[0.02] text-left text-[11px] uppercase tracking-wide text-carbon/40">
                      <tr>
                        <th className="px-5 py-2 font-semibold">Comunidad</th>
                        <th className="px-3 py-2 font-semibold">Firma</th>
                        <th className="px-3 py-2 font-semibold">Paga</th>
                        <th className="px-3 py-2 font-semibold">Comercial</th>
                        <th className="px-3 py-2 font-semibold">{sel === "pausado" ? "Causa" : "Responsable / desde"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {lista.map((f) => (
                        <tr key={f.proyectoId} className="transition hover:bg-lima-soft/40">
                          <td className="px-5 py-2.5">
                            <Link href={`/comunidades/${f.comunidadId}/proyecto`} className="font-medium text-carbon hover:text-lima-dark">
                              {f.comunidadNombre}
                            </Link>
                            <div className="text-xs text-carbon/40">{[f.municipio, ...f.tipos].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-carbon/70">{fechaCorta(f.fechaContratado)}</td>
                          <td className="px-3 py-2.5 text-carbon/70">{pagadorLabel(f.pagador)}</td>
                          <td className="px-3 py-2.5 text-carbon/60">{f.comercialInterno ?? "—"}</td>
                          <td className="px-3 py-2.5 text-carbon/60">
                            {sel === "pausado"
                              ? f.notas ?? "—"
                              : f.responsableActual
                                ? `${f.responsableActual}${f.fechaFaseActual ? ` · ${fechaCorta(f.fechaFaseActual)}` : ""}`
                                : "—"}
                          </td>
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
