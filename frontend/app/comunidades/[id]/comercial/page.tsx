import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { cockpitComunidad, type OportunidadCockpit } from "../../../../lib/cockpit";
import { nombreAdministracion } from "../../../../lib/comunidades";
import { puntoActual, ORIGEN_LABEL, TIPO_EVENTO_LABEL, type HitoCatalogo } from "../../../../lib/comercial";
import { Barra } from "../../../comercial/oportunidades/Barra";
import { crearViabilidad, nuevaOportunidad, aplazarOportunidad, reactivarOportunidad } from "./acciones";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
function eur(n: number | null | undefined): string {
  return n == null ? "—" : `${n.toLocaleString("es-ES")} €`;
}

// Fecha de junta de una oportunidad (de la tabla juntas, o del hito junta).
function fechaJunta(o: OportunidadCockpit): string | null {
  const j = o.juntas.find((x) => x.fecha_junta)?.fecha_junta;
  if (j) return j;
  return o.hitos_oportunidad.find((h) => h.hito === "junta")?.fecha ?? null;
}
// Estado 3D de una oportunidad (a partir del hito tresd + modelos_3d_venta).
function estado3d(o: OportunidadCockpit): { req: boolean; txt: string } {
  const tresd = o.hitos_oportunidad.find((h) => h.hito === "tresd");
  const req = !!tresd && tresd.aplicable && tresd.estado !== "no_aplica";
  if (!req) return { req: false, txt: "no" };
  const m = o.modelos_3d_venta[0];
  if (!m) return { req: true, txt: "pendiente" };
  if (m.de_catalogo) return { req: true, txt: "catálogo · listo" };
  return { req: true, txt: `específico · ${m.estado}` };
}

function FilaDoc({ etiqueta, estado, clase, accion }: { etiqueta: string; estado: string; clase: string; accion: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-black/5 px-3 py-2 last:border-0">
      <span className="w-28 shrink-0 text-sm font-medium text-carbon/80">{etiqueta}</span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${clase}`}>{estado}</span>
      <div className="ml-auto">{accion}</div>
    </div>
  );
}

// Un bloque de oportunidad (= un "encargo") con su stepper, docs y 3D.
function BloqueOportunidad({ id, o, catalogo }: { id: string; o: OportunidadCockpit; catalogo: HitoCatalogo[] }) {
  const neg = o.negociacion_oportunidad[0] ?? null;
  const v = o.viabilidades.find((x) => x.vigente) ?? o.viabilidades[0];
  const paso = puntoActual(o.hitos_oportunidad, catalogo);
  const t3 = estado3d(o);

  return (
    <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-carbon/[0.03] px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-carbon">
            {neg?.que_vendemos || <span className="text-carbon/40">Oportunidad sin definir</span>}
            {neg?.precio != null && <span className="ml-2 font-bold text-lima-dark">{eur(neg.precio)}</span>}
          </h3>
          <div className="text-[11px] text-carbon/45">Siguiente paso: <b className="text-carbon/70">{paso?.nombre ?? "—"}</b></div>
        </div>
        <details className="text-right">
          <summary className="cursor-pointer list-none text-[11px] text-carbon/40 hover:text-amber-700" title="Aplazar: queda latente y reactivable">aplazar ⏸</summary>
          <form action={aplazarOportunidad.bind(null, id, o.id)} className="mt-2 flex flex-col items-end gap-1.5">
            <input name="reactivar_nota" placeholder="retomar cuándo (hagan hucha, salga subv…)" className="w-64 rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs outline-none focus:border-lima" />
            <input type="date" name="reactivar_fecha" title="fecha de reactivación (opcional)" className="rounded-lg border border-black/15 bg-white px-2.5 py-1 text-xs outline-none focus:border-lima" />
            <button className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600">Aparcar</button>
          </form>
        </details>
      </div>

      <div className="px-3 pt-2">
        <Barra hitos={o.hitos_oportunidad} catalogo={catalogo} sinEnlaces />
      </div>

      <div className="mt-1">
        <FilaDoc
          etiqueta="Viabilidad"
          estado={v ? `borrador v${v.version}` : "pendiente"}
          clase={v ? "bg-amber-100 text-amber-700" : "bg-black/5 text-carbon/50"}
          accion={
            v ? (
              <span className="flex items-center gap-2">
                <Link href={`/comunidades/${id}/comercial/viabilidad/${v.id}`} className="text-xs font-semibold text-lima-dark hover:underline">Editar</Link>
                <a href={`/comunidades/${id}/comercial/viabilidad/${v.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-carbon/60 hover:text-carbon hover:underline">PDF ↗</a>
              </span>
            ) : (
              <form action={crearViabilidad.bind(null, id, o.id)}>
                <button className="rounded-lg bg-lima px-3 py-1 text-xs font-semibold text-carbon hover:bg-lima-dark hover:text-white">Crear</button>
              </form>
            )
          }
        />
        <FilaDoc
          etiqueta={`Hoja(s) (${o.hojas_encargo.length})`}
          estado={o.hojas_encargo.length ? o.hojas_encargo[0].estado : "pendiente"}
          clase={o.hojas_encargo.length ? "bg-lima-soft text-lima-dark" : "bg-black/5 text-carbon/50"}
          accion={<Link href={`/comunidades/${id}/hojas/nueva`} className="text-xs font-semibold text-lima-dark hover:underline">+ Hoja</Link>}
        />
        <FilaDoc etiqueta="Presupuesto" estado="—" clase="bg-black/5 text-carbon/50" accion={<span className="text-xs text-carbon/30">Subir PDF (Factusol)</span>} />
      </div>

      <div className="flex items-center gap-2 border-t border-black/5 px-4 py-2 text-xs text-carbon/55">
        <span>3D:</span>
        {t3.req ? (
          <span className="rounded-full bg-lima-soft px-2 py-0.5 font-semibold text-lima-dark">{t3.txt}</span>
        ) : (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-carbon/40">no requiere</span>
        )}
        <span className="ml-auto text-carbon/30">(catálogo / específico, desde el hito 3D)</span>
      </div>
    </section>
  );
}

export default async function CockpitComercial({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ck = await cockpitComunidad(id);
  if (!ck || !ck.comunidad) notFound();

  const { comunidad: ficha, catalogoHitos: catalogo } = ck;
  const c = ficha.comunidad;
  const presidente = ficha.personas.find((p) => p.rol === "presidente");
  const activas = ck.oportunidades.filter((o) => o.estado === "activa");
  const latentes = ck.oportunidades.filter((o) => o.estado === "latente");
  const dir2 = [c.cp, c.municipio].filter(Boolean).join(" ");

  // Puntos clave (derivados de las oportunidades activas)
  const proximaJunta = activas.map(fechaJunta).filter(Boolean).sort()[0] ?? null;
  const con3dPend = activas.some((o) => { const t = estado3d(o); return t.req && t.txt !== "catálogo · listo"; });
  const proxRec = ck.recordatorios[0];

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1120px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/comercial" className="text-sm text-carbon/50 hover:text-carbon">← Área comercial</Link>
          <Link href={`/expediente/${id}`} className="text-xs font-semibold text-lima-dark hover:underline">Expediente 360 →</Link>
        </div>

        {/* Cabecera: datos generales (IZQ) + Puntos Clave (DCHA) */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-bold text-carbon">{c.nombre}</h1>
            <p className="text-sm text-carbon/55">{[c.direccion, dir2].filter(Boolean).join(" · ")}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-carbon/45">Administración</dt><dd className="text-carbon">{ficha.administracion ? `${nombreAdministracion(ficha.administracion)}${ficha.administracion.telefono ? ` · ${ficha.administracion.telefono}` : ""}` : "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-carbon/45">Presidente</dt><dd className="text-carbon">{presidente ? `${presidente.nombre}${presidente.telefono ? ` · ${presidente.telefono}` : ""}` : "—"}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-lima/30 bg-lima-soft/25 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-lima-dark/80">Puntos clave</div>
            <ul className="mt-2 space-y-1 text-sm text-carbon/80">
              <li>• Próxima junta: <b>{proximaJunta ? fecha(proximaJunta) : "—"}</b></li>
              <li>• 3D: {con3dPend ? <b className="text-amber-700">pendiente de tener listo</b> : "sin pendientes"}</li>
              {proxRec && <li>⏰ {proxRec.texto}{proxRec.fecha_limite ? ` · ${fecha(proxRec.fecha_limite)}` : ""}</li>}
              <li className="text-carbon/40">Sali irá añadiendo aquí lo relevante (riesgos, tips…).</li>
            </ul>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 2/3 — Sali + oportunidades */}
          <div className="space-y-5 lg:col-span-2">
            {ck.resumenComercial && (
              <div className="rounded-2xl border border-lima/30 bg-lima-soft/30 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-lima-dark/80">Sali · qué movemos ahora</div>
                <p className="mt-1 text-sm leading-relaxed text-carbon/85">{ck.resumenComercial.texto}</p>
              </div>
            )}

            {activas.length === 0 && (
              <p className="rounded-2xl border border-dashed border-black/15 bg-white px-5 py-8 text-center text-sm text-carbon/45">
                Sin oportunidades activas. Abre una abajo.
              </p>
            )}
            {activas.map((o) => <BloqueOportunidad key={o.id} id={id} o={o} catalogo={catalogo} />)}

            {/* Nueva oportunidad */}
            <form action={nuevaOportunidad.bind(null, id)} className="flex flex-wrap items-center gap-2">
              <input name="que_vendemos" placeholder="qué se vende (ascensor, IEE…)" className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-lima" />
              <input name="precio" placeholder="precio €" className="w-28 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-lima" />
              <button className="rounded-full bg-lima px-4 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white">+ Nueva oportunidad</button>
            </form>

            {/* Latentes (aparcadas / histórico) */}
            {latentes.length > 0 && (
              <details className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                <summary className="cursor-pointer text-xs font-semibold text-carbon/50 hover:text-carbon/80">Aparcadas / latentes ({latentes.length})</summary>
                <div className="mt-3 space-y-2">
                  {latentes.map((o) => {
                    const neg = o.negociacion_oportunidad[0] ?? null;
                    return (
                      <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-black/[0.015] px-3 py-2">
                        <div className="text-sm text-carbon/75">
                          {neg?.que_vendemos ?? "Oportunidad"}
                          {o.reactivar_nota && <span className="ml-2 text-[11px] text-amber-700">retomar: {o.reactivar_nota}{o.reactivar_fecha ? ` (${fecha(o.reactivar_fecha)})` : ""}</span>}
                        </div>
                        <form action={reactivarOportunidad.bind(null, id, o.id)}>
                          <button className="rounded-lg border border-lima bg-white px-3 py-1 text-xs font-semibold text-lima-dark hover:bg-lima hover:text-carbon">↻ Retomar</button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* 1/3 — diario + recordatorios */}
          <div className="space-y-5">
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">Diario de esta comunidad</h2>
                <Link href="/comercial/contacto" className="text-xs font-semibold text-lima-dark hover:underline">🎤 Grabar</Link>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                {ck.diario.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-carbon/40">Sin contactos aún.</p>
                ) : (
                  <ul className="divide-y divide-black/5">
                    {ck.diario.map((i) => (
                      <li key={i.id}>
                        <Link href={`/comercial/interaccion/${i.id}`} className="block px-4 py-2.5 transition hover:bg-black/[0.015]">
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-carbon/50">
                            <span className="font-semibold text-carbon/70">{fecha(i.fecha_evento) || fecha(i.creado_en.slice(0, 10))}</span>
                            {i.tipo_evento && <span className="rounded-full bg-black/5 px-1.5 py-0.5 font-semibold">{TIPO_EVENTO_LABEL[i.tipo_evento] ?? i.tipo_evento}</span>}
                            <span>{ORIGEN_LABEL[i.origen] ?? i.origen}</span>
                          </div>
                          {i.transcripcion && <p className="mt-0.5 line-clamp-2 text-xs text-carbon/75">{i.transcripcion}</p>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-carbon/35">⏰ Recordatorios</h2>
              <div className="mt-3 space-y-2">
                {ck.recordatorios.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-black/15 bg-white px-4 py-5 text-center text-sm text-carbon/40">Sin recordatorios abiertos.</p>
                ) : (
                  ck.recordatorios.map((t) => (
                    <div key={t.id} className="rounded-xl border border-black/5 bg-white px-3 py-2 shadow-sm">
                      <div className="text-sm text-carbon/85">{t.texto}</div>
                      {t.fecha_limite && <div className="text-[11px] font-semibold text-amber-700">antes del {fecha(t.fecha_limite)}</div>}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
