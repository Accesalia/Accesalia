import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { contarComunidades } from "../../lib/comunidades";
import { SelectorComunidad } from "../expediente/SelectorComunidad";
import { licitacionesPanel, resumenLicitacionPanel, ESTADO_LICITACION, type LicitacionFila } from "../../lib/licitacion";

export const dynamic = "force-dynamic";

const ESTADOS = ["abierta", "presupuestos_recibidos", "homogeneizando", "a_junta", "adjudicada", "desierta"] as const;

function Tarjeta({ etiqueta, valor, sub, acento, href }: { etiqueta: string; valor: string; sub?: string; acento?: string; href?: string }) {
  const cuerpo = (
    <div className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm transition hover:border-lima">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-carbon/40">{etiqueta}</div>
      <div className={`mt-1 text-2xl font-bold ${acento ?? "text-carbon"}`}>{valor}</div>
      {sub && <div className="mt-0.5 text-xs text-carbon/45">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} scroll={false} className="block">{cuerpo}</Link> : cuerpo;
}

export default async function EntradaTresPresupuestos({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const [total, filas] = await Promise.all([contarComunidades(), licitacionesPanel()]);
  const r = resumenLicitacionPanel(filas);

  const sel = f ?? null;
  let lista: LicitacionFila[] = [];
  let titulo = "";
  if (sel === "subvencion") {
    lista = filas.filter((x) => x.estado === "adjudicada" && !x.subvencionOk);
    titulo = "Adjudicadas sin expediente de subvención completo";
  } else if (sel && (ESTADOS as readonly string[]).includes(sel)) {
    lista = filas.filter((x) => x.estado === sel);
    titulo = ESTADO_LICITACION[sel]?.label ?? sel;
  }

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="text-center">
          <span className="text-4xl text-lima-dark">⚑</span>
          <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">Tres Presupuestos</h1>
          <p className="mx-auto mt-2 max-w-lg text-carbon/55">
            El presupuesto ciego a varias contratas, la comparación y la adjudicación en junta. Vigila las que esperan
            presupuestos y las adjudicadas a las que les falta expediente de subvención.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <SelectorComunidad autoFocus hrefBase="/comunidades/" hrefSuffix="/tres-presupuestos" />
          <p className="mt-2 text-center text-xs text-carbon/40">{total.toLocaleString("es-ES")} comunidades · escribe 2+ letras</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tarjeta etiqueta="Licitaciones" valor={r.total.toLocaleString("es-ES")} sub={`${r.adjudicadas} adjudicadas`} />
          <Tarjeta etiqueta="En curso" valor={r.abiertas.toLocaleString("es-ES")} sub="sin adjudicar" acento="text-sky-600" href={sel === "abierta" ? "/tres-presupuestos" : "/tres-presupuestos?f=abierta"} />
          <Tarjeta etiqueta="A junta" valor={(r.porEstado["a_junta"] ?? 0).toLocaleString("es-ES")} sub="pendiente de votar" acento="text-amber-600" href={sel === "a_junta" ? "/tres-presupuestos" : "/tres-presupuestos?f=a_junta"} />
          <Tarjeta etiqueta="Subvención pendiente" valor={r.subvencionPendiente.toLocaleString("es-ES")} sub="adjudicada sin expediente" acento={r.subvencionPendiente ? "text-red-600" : "text-carbon"} href={sel === "subvencion" ? "/tres-presupuestos" : "/tres-presupuestos?f=subvencion"} />
        </div>

        <div className="mt-10">
          <p className="text-center text-xs uppercase tracking-wide text-carbon/35">¿Por dónde va cada licitación?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ESTADOS.map((e) => {
              const n = r.porEstado[e] ?? 0;
              const activo = sel === e;
              return (
                <Link key={e} href={activo ? "/tres-presupuestos" : `/tres-presupuestos?f=${e}`} scroll={false}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/70 hover:border-lima"}`}>
                  {ESTADO_LICITACION[e].label}
                  <span className={`rounded-full px-1.5 text-xs ${activo ? "bg-carbon/10" : "bg-black/5 text-carbon/50"}`}>{n}</span>
                </Link>
              );
            })}
          </div>

          {sel && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-carbon">{titulo} · {lista.length} licitación(es)</div>
              {lista.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-carbon/40">Ninguna aquí.</p>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-black/[0.02] text-left text-[11px] uppercase tracking-wide text-carbon/40">
                      <tr>
                        <th className="px-5 py-2 font-semibold">Comunidad</th>
                        <th className="px-3 py-2 font-semibold">Presupuestos</th>
                        <th className="px-3 py-2 font-semibold">Firmados</th>
                        <th className="px-3 py-2 font-semibold">Ganador</th>
                        <th className="px-3 py-2 font-semibold">{sel === "subvencion" ? "Falta" : "Subvención"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {lista.map((x) => (
                        <tr key={x.licitacionId} className="transition hover:bg-lima-soft/40">
                          <td className="px-5 py-2.5">
                            <Link href={`/comunidades/${x.comunidadId}/tres-presupuestos`} className="font-medium text-carbon hover:text-lima-dark">{x.comunidadNombre}</Link>
                            <div className="text-xs text-carbon/40">{[x.municipio, ...x.tipos].filter(Boolean).join(" · ")}{x.casoB && " · caso B"}</div>
                          </td>
                          <td className="px-3 py-2.5 text-carbon/70">{x.numPresupuestos}</td>
                          <td className="px-3 py-2.5"><span className={x.firmados >= 3 ? "text-emerald-600" : "text-amber-600"}>{x.firmados}/3</span></td>
                          <td className="px-3 py-2.5 text-xs text-carbon/60">{x.ganador ?? <span className="text-carbon/30">—</span>}</td>
                          <td className="px-3 py-2.5 text-xs">
                            {sel === "subvencion"
                              ? <span className="text-red-600">{x.subvencionFaltan.join(" · ")}</span>
                              : (x.subvencionOk ? <span className="text-emerald-600">✓ completo</span> : <span className="text-amber-600">incompleto</span>)}
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
