import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import {
  listarComerciales,
  oportunidadesEnMarcha,
  catalogoHitos,
  nombreComercial,
  puntoActual,
  HITO_ESTADO,
  HITO_ESTADOS,
  type HitoOportunidad,
  type HitoCatalogo,
} from "../../../lib/comercial";
import { listarEquipo } from "../../../lib/equipo";
import { iniciarPipeline, actualizarHito, registrarNegociacion } from "./acciones";
import { Barra } from "./Barra";

export const dynamic = "force-dynamic";

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";

function eur(n: number | null): string {
  return n == null ? "—" : `${n.toLocaleString("es-ES")} €`;
}

export default async function Oportunidades({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const [comerciales, oportunidades, catalogo, equipo] = await Promise.all([
    listarComerciales(),
    oportunidadesEnMarcha(c),
    catalogoHitos(),
    listarEquipo(true),
  ]);
  const yo = comerciales.find((x) => x.id === c) ?? null;
  const suf = c ? `?c=${c}` : "";

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1040px] px-6 py-8">
        <Link href={`/comercial${suf}`} className="text-sm text-carbon/50 hover:text-carbon">← Área comercial</Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">◇</span> Oportunidades en marcha</h1>
            <p className="mt-1 text-carbon/55">{oportunidades.length} activa{oportunidades.length === 1 ? "" : "s"}{yo ? <> · {nombreComercial(yo)}</> : ""}. En qué punto están y qué se negocia.</p>
            <Link href={`/comercial/oportunidades/nueva${suf}`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
              + Crear oportunidad
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href="/comercial/oportunidades" className={`rounded-full border px-3 py-1 text-sm ${!c ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/60 hover:border-lima"}`}>Todos</Link>
            {comerciales.map((m) => (
              <Link key={m.id} href={`/comercial/oportunidades?c=${m.id}`} className={`rounded-full border px-3 py-1 text-sm ${c === m.id ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/60 hover:border-lima"}`}>{m.nombre}</Link>
            ))}
          </div>
        </div>

        {oportunidades.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white px-5 py-12 text-center">
            <p className="text-sm text-carbon/50">No hay oportunidades activas{yo ? " tuyas" : ""} todavía.</p>
            <Link href={`/comercial/oportunidades/nueva${suf}`} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
              + Crear la primera oportunidad
            </Link>
            <p className="mx-auto mt-4 max-w-md text-xs text-carbon/40">También nacen solas al grabar un contacto con interés (Sali las detecta), pero puedes crearlas a mano cuando quieras.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {oportunidades.map((o) => {
              const titulo = o.comunidad?.nombre ?? o.comunidad_provisional ?? "Comunidad sin identificar";
              const neg = o.negociacion_oportunidad[0] ?? null;
              const conPipeline = o.hitos_oportunidad.length > 0;
              return (
                <section key={o.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {o.comunidad ? (
                          <Link href={`/comunidades/${o.comunidad.id}/comercial`} className="font-semibold text-carbon hover:text-lima-dark">{titulo}</Link>
                        ) : (
                          <span className="font-semibold text-carbon">{titulo}</span>
                        )}
                        {!o.comunidad && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">sin dar de alta</span>}
                      </div>
                      <div className="mt-0.5 text-xs text-carbon/50">
                        {o.administrador?.nombre && <span className="text-lima-dark">{o.administrador.nombre}{o.administrador.empresa ? ` (${o.administrador.empresa})` : ""}</span>}
                        {o.comercial?.nombre && !c && <span> · {o.comercial.nombre}</span>}
                      </div>
                    </div>
                    {o.comunidad && <Link href={`/expediente/${o.comunidad.id}`} className="shrink-0 text-xs font-semibold text-lima-dark hover:underline">Abrir expediente →</Link>}
                  </div>

                  {/* Negociación vigente (qué + precio) con histórico */}
                  <div className="mt-3 rounded-xl bg-lima-soft/30 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                      <span className="text-carbon/50">Oferta:</span>
                      <span className="font-semibold text-carbon">{neg?.que_vendemos ?? "— por definir —"}</span>
                      <span className="font-bold text-lima-dark">{eur(neg?.precio ?? null)}</span>
                      {neg?.alcance && <span className="text-xs text-carbon/55">· {neg.alcance}</span>}
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] text-carbon/45 hover:text-carbon/70">✎ actualizar oferta</summary>
                      <form action={registrarNegociacion} className="mt-2 flex flex-wrap items-end gap-2">
                        <input type="hidden" name="oportunidad_id" value={o.id} />
                        {c ? <input type="hidden" name="comercial_id" value={c} /> : null}
                        <input name="que_vendemos" defaultValue={neg?.que_vendemos ?? ""} placeholder="qué (ascensor, SATE…)" className={`${inp} w-40`} />
                        <input name="precio" defaultValue={neg?.precio ?? ""} placeholder="precio €" className={`${inp} w-28`} />
                        <input name="alcance" defaultValue={neg?.alcance ?? ""} placeholder="alcance" className={`${inp} w-40`} />
                        <input name="notas" placeholder="por qué el cambio" className={`${inp} w-44`} />
                        <button className="rounded-lg bg-carbon px-3 py-1.5 text-sm font-semibold text-white hover:bg-carbon/85">Guardar</button>
                      </form>
                    </details>
                  </div>
                  {o.origen_notas && !neg && <p className="mt-1.5 text-xs text-carbon/50">De la nota: {o.origen_notas}</p>}

                  {/* Pipeline por hitos */}
                  <div className="mt-3">
                    {!conPipeline ? (
                      <form action={iniciarPipeline}>
                        <input type="hidden" name="oportunidad_id" value={o.id} />
                        {c ? <input type="hidden" name="comercial_id" value={c} /> : null}
                        <button className="rounded-lg border border-lima bg-white px-3 py-1.5 text-sm font-semibold text-lima-dark hover:bg-lima hover:text-carbon">▶ Iniciar pipeline</button>
                        <span className="ml-2 text-xs text-carbon/45">crea los hitos del caso estándar (luego marcas qué aplica).</span>
                      </form>
                    ) : (
                      <>
                        <Barra hitos={o.hitos_oportunidad} catalogo={catalogo} />
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-carbon/50 hover:text-carbon/80">Gestionar hitos</summary>
                          <div className="mt-2 space-y-1.5">
                            {[...o.hitos_oportunidad]
                              .map((h) => ({ h, c: catalogo.find((x) => x.clave === h.hito)! }))
                              .filter((x) => x.c)
                              .sort((a, b) => a.c.orden - b.c.orden)
                              .map(({ h, c: cat }) => (
                                <form key={h.id} action={actualizarHito} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-black/5 bg-black/[0.015] px-2.5 py-1.5">
                                  <input type="hidden" name="hito_id" value={h.id} />
                                  {c ? <input type="hidden" name="comercial_id" value={c} /> : null}
                                  <span className="w-52 shrink-0 text-xs font-medium text-carbon/80">{cat.nombre}{cat.es_ramal ? " ↳" : ""}</span>
                                  <label className="flex items-center gap-1 text-[11px] text-carbon/50"><input type="checkbox" name="aplicable" defaultChecked={h.aplicable} /> aplica</label>
                                  <select name="estado" defaultValue={h.estado} className={`${inp} py-1`}>
                                    {HITO_ESTADOS.map((e) => <option key={e} value={e}>{HITO_ESTADO[e].label}</option>)}
                                  </select>
                                  <input type="date" name="fecha" defaultValue={h.fecha ?? ""} className={`${inp} py-1`} />
                                  <select name="responsable_id" defaultValue={h.responsable_id ?? ""} className={`${inp} py-1`} title="responsable">
                                    <option value="">— responsable —</option>
                                    {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                  </select>
                                  <input name="enlace_url" defaultValue={h.enlace_url ?? ""} placeholder="enlace Dropbox" className={`${inp} w-40 py-1`} />
                                  <button className="rounded-md bg-carbon px-2.5 py-1 text-xs font-semibold text-white hover:bg-carbon/85">✓</button>
                                </form>
                              ))}
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
