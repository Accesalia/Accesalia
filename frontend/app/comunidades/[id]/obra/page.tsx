import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../lib/comunidades";
import { proyectosDeComunidad, tiposDe, type Proyecto } from "../../../../lib/proyecto";
import {
  obrasDeProyecto,
  listarContratas,
  ESTADO_OBRA,
  CFO_ESTADO,
  FASES_OBRA,
  faseObraIdx,
  gateInicioPendiente,
  constructoraDe,
  type Obra,
  type ContrataOpcion,
} from "../../../../lib/obra";
import { visitasDeObra, destinatariosDeComunidad, TIPO_DESTINATARIO, type Visita, type Destinatario } from "../../../../lib/visita";
import { SelectorComunidad } from "../../../expediente/SelectorComunidad";
import { crearObra, actualizarObra, borrarObra } from "./acciones";
import { anadirDestinatario, borrarDestinatario } from "./visita/acciones";
import { Guardando } from "../../../components/Guardando";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}
function Badge({ v }: { v: { label: string; clase: string } }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.clase}`}>{v.label}</span>;
}

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";
const btn = "rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white";
const resumenEditar = "cursor-pointer list-none text-xs font-medium text-lima-dark hover:underline";

function StepperObra({ estado }: { estado: string }) {
  const idx = faseObraIdx(estado);
  const overlay = idx === -1;
  return (
    <div className="flex items-center gap-1">
      {FASES_OBRA.map((f, i) => {
        const hecho = !overlay && (i < idx || (i === idx && estado === "finalizada"));
        const actual = !overlay && i === idx;
        return (
          <div key={f.clave} className="flex items-center gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${hecho ? "bg-emerald-100 text-emerald-700" : actual ? "bg-amber-100 text-amber-700" : "bg-black/5 text-carbon/40"}`}>{f.label}</span>
            {i < FASES_OBRA.length - 1 && <span className="text-carbon/20">→</span>}
          </div>
        );
      })}
      {overlay && <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-carbon/50">{ESTADO_OBRA[estado]?.label}</span>}
    </div>
  );
}

function TarjetaObra({ comunidadId, p, obras, contratas, visitasPorObra }: { comunidadId: string; p: Proyecto; obras: Obra[]; contratas: ContrataOpcion[]; visitasPorObra: Record<string, Visita[]> }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg text-lima-dark">⬒</span>
          {tiposDe(p).length > 0 ? tiposDe(p).map((t) => <span key={t.clave} className="rounded-lg bg-lima-soft px-2.5 py-1 text-sm font-semibold text-lima-dark">{t.nombre}</span>) : <h2 className="text-base font-semibold text-carbon">Proyecto</h2>}
        </div>
      </div>

      {obras.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm text-carbon/35">Sin obra registrada todavía.</p>
          <form action={crearObra.bind(null, comunidadId, p.id)} className="mt-2">
            <Guardando /><button className={btn}>+ Registrar obra</button></form>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {obras.map((o) => {
            const est = ESTADO_OBRA[o.estado] ?? { label: o.estado, clase: "bg-black/5 text-carbon/45" };
            const falta = gateInicioPendiente(o);
            const cfo = o.cfo_estado ? CFO_ESTADO[o.cfo_estado] : null;
            return (
              <li key={o.id} className="rounded-xl border border-black/5 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {constructoraDe(o) && <span className="text-sm font-medium text-carbon">{constructoraDe(o)}</span>}
                    {cfo && <Badge v={cfo} />}
                  </div>
                  <Badge v={est} />
                </div>

                <div className="mt-2"><StepperObra estado={o.estado} /></div>

                {/* Gate de inicio */}
                {o.estado === "pendiente_inicio" && (
                  <div className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs ${falta.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {falta.length ? <>⚠ Falta para arrancar: {falta.join(" · ")}</> : <>✓ Listo para arrancar (CSS + PSS + acta + apertura)</>}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-carbon/55">
                  <span className={o.css_contratado ? "text-emerald-700" : "text-carbon/40"}>{o.css_contratado ? "✓" : "○"} CSS</span>
                  <span className={o.pss_aprobado ? "text-emerald-700" : "text-carbon/40"}>{o.pss_aprobado ? "✓" : "○"} PSS</span>
                  {(o.coordinador_css_nombre || o.equipo?.nombre) && <span>Coord.: {o.equipo?.nombre ?? o.coordinador_css_nombre}</span>}
                  {o.fecha_acta_inicio && <span>Inicio: {fecha(o.fecha_acta_inicio)}</span>}
                  {o.fecha_fin_obra && <span>Fin: {fecha(o.fecha_fin_obra)}</span>}
                  {o.jefe_obra && <span>Jefe obra: {o.jefe_obra}</span>}
                </div>
                {o.notas && <p className="mt-1 text-xs text-carbon/50">{o.notas}</p>}

                <details className="mt-2">
                  <summary className={resumenEditar}>Editar obra</summary>
                  <form action={actualizarObra.bind(null, comunidadId, o.id, p.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-4">
                    <Guardando />
                    <label className="text-xs text-carbon/60">Estado
                      <select name="estado" defaultValue={o.estado} className={`${inp} mt-1 w-full`}>
                        {Object.entries(ESTADO_OBRA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-carbon/60 sm:col-span-2">Constructora (ficha)
                      <select name="constructora_contrata_id" defaultValue={o.constructora_contrata_id ?? ""} className={`${inp} mt-1 w-full`}>
                        <option value="">— sin ficha —</option>
                        {contratas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-carbon/60">Constructora (texto)
                      <input name="constructora" defaultValue={o.constructora ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    {/* Gate de inicio */}
                    <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="css_contratado" defaultChecked={o.css_contratado} /> CSS contratado</label>
                    <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="pss_aprobado" defaultChecked={o.pss_aprobado} /> PSS aprobado</label>
                    <label className="text-xs text-carbon/60">Coordinador S+S
                      <input name="coordinador_css_nombre" defaultValue={o.equipo?.nombre ?? o.coordinador_css_nombre ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60">Jefe de obra
                      <input name="jefe_obra" defaultValue={o.jefe_obra ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60">Apertura c. trabajo
                      <input type="date" name="fecha_apertura_centro_trabajo" defaultValue={o.fecha_apertura_centro_trabajo ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60">Acta inicio
                      <input type="date" name="fecha_acta_inicio" defaultValue={o.fecha_acta_inicio ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60">Fin de obra
                      <input type="date" name="fecha_fin_obra" defaultValue={o.fecha_fin_obra ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60">Plazo (meses)
                      <input name="plazo_ejecucion_meses" defaultValue={o.plazo_ejecucion_meses ?? ""} inputMode="numeric" className={`${inp} mt-1 w-full`} />
                    </label>
                    {/* CFO -> visado fin_obra */}
                    <label className="text-xs text-carbon/60">CFO
                      <select name="cfo_estado" defaultValue={o.cfo_estado ?? ""} className={`${inp} mt-1 w-full`}>
                        <option value="">—</option><option value="a_visar">A visar</option><option value="visado">Visado</option><option value="no_procede">No procede</option>
                      </select>
                    </label>
                    <label className="text-xs text-carbon/60">CFO a visar
                      <input type="date" name="fecha_cfo_a_visar" defaultValue={o.fecha_cfo_a_visar ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60">CFO visado
                      <input type="date" name="fecha_cfo_visado" defaultValue={o.fecha_cfo_visado ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60 sm:col-span-4">Notas
                      <input name="notas" defaultValue={o.notas ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <div className="col-span-full flex items-center gap-2">
                      <button className={btn}>Guardar obra</button>
                      <button formAction={borrarObra.bind(null, comunidadId, o.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Borrar</button>
                    </div>
                    <p className="col-span-full text-[11px] text-carbon/40">Al marcar el CFO como “a visar” o “visado” se crea su visado de fin de obra en la fase visado.</p>
                  </form>
                </details>

                {/* Actas de visita */}
                <div className="mt-3 border-t border-black/5 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-carbon/40">Actas de visita</span>
                    <Link href={`/comunidades/${comunidadId}/obra/visita/nueva?obra=${o.id}`} className="rounded-lg bg-lima px-2.5 py-1 text-xs font-semibold text-carbon hover:bg-lima-dark hover:text-white">
                      + Generar acta de visita
                    </Link>
                  </div>
                  {(visitasPorObra[o.id] ?? []).length === 0 ? (
                    <p className="text-xs text-carbon/35">Sin actas todavía.</p>
                  ) : (
                    <ul className="space-y-1">
                      {(visitasPorObra[o.id] ?? []).map((v) => (
                        <li key={v.id}>
                          <Link href={`/comunidades/${comunidadId}/obra/visita/${v.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-black/5 px-3 py-1.5 text-xs hover:border-lima">
                            <span className="text-carbon/70">
                              <span className="font-semibold">Acta {v.numero ?? "—"}</span> · {fecha(v.fecha_visita)}
                              {v.fotos_acta.length > 0 && <span className="text-carbon/40"> · {v.fotos_acta.length} 📷</span>}
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${v.enviada ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{v.enviada ? "enviada" : "sin enviar"}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Destinatarios({ comunidadId, destinatarios }: { comunidadId: string; destinatarios: Destinatario[] }) {
  return (
    <details className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer list-none text-sm font-semibold text-lima-dark">A informar de las visitas ({destinatarios.filter((d) => d.activo).length})</summary>
      <p className="mt-1 text-xs text-carbon/45">Correos a los que enviar las actas de esta comunidad: contrata, administrador, presidente, otros.</p>
      {destinatarios.length > 0 && (
        <ul className="mt-3 space-y-1">
          {destinatarios.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-black/5 px-3 py-1.5 text-sm">
              <span className="min-w-0 truncate">
                <span className="rounded bg-carbon/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-carbon/50">{TIPO_DESTINATARIO[d.tipo] ?? d.tipo}</span>{" "}
                {d.nombre && <span className="text-carbon/70">{d.nombre} · </span>}
                <span className="text-carbon/60">{d.email}</span>
              </span>
              <form action={borrarDestinatario.bind(null, comunidadId, d.id)}>
                <Guardando />
                <button className="shrink-0 text-xs text-red-500 hover:underline">quitar</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={anadirDestinatario.bind(null, comunidadId)} className="mt-3 flex flex-wrap items-end gap-2">
        <Guardando />
        <label className="text-xs text-carbon/60">Tipo
          <select name="tipo" className="mt-1 block rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima">
            <option value="contrata">Contrata</option><option value="administrador">Administrador</option><option value="presidente">Presidente</option><option value="otro">Otro</option>
          </select>
        </label>
        <label className="text-xs text-carbon/60">Nombre
          <input name="nombre" className="mt-1 block rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima" />
        </label>
        <label className="text-xs text-carbon/60">Email
          <input name="email" type="email" required className="mt-1 block rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima" />
        </label>
        <button className="rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white">Añadir</button>
      </form>
    </details>
  );
}

export default async function ObraComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, proyectos, contratas, destinatarios] = await Promise.all([
    comunidadPorId(id),
    proyectosDeComunidad(id),
    listarContratas(),
    destinatariosDeComunidad(id),
  ]);
  if (!ficha) notFound();

  const conObra = proyectos.filter((p) => p.estado !== "no_procede");
  const obrasPorProy = await Promise.all(conObra.map((p) => obrasDeProyecto(p.id)));
  const todasObras = obrasPorProy.flat();
  const visitasLista = await Promise.all(todasObras.map((o) => visitasDeObra(o.id)));
  const visitasPorObra: Record<string, Visita[]> = {};
  todasObras.forEach((o, i) => (visitasPorObra[o.id] = visitasLista[i]));

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/obra" className="text-sm text-carbon/50 hover:text-carbon">← Obra</Link>
          <SelectorComunidad compacto hrefBase="/comunidades/" hrefSuffix="/obra" />
        </div>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">⬒</span> Obra</h1>
        <p className="mt-1 text-sm text-carbon/55">{ficha.comunidad.nombre} · <Link href={`/expediente/${id}`} className="text-lima-dark hover:underline">expediente completo</Link></p>

        <div className="mt-6 space-y-5">
          {conObra.length === 0 && <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center text-sm text-carbon/40">Sin proyecto registrado en esta comunidad.</div>}
          {conObra.map((p, i) => <TarjetaObra key={p.id} comunidadId={id} p={p} obras={obrasPorProy[i]} contratas={contratas} visitasPorObra={visitasPorObra} />)}
          {conObra.length > 0 && <Destinatarios comunidadId={id} destinatarios={destinatarios} />}
        </div>
        <p className="mt-6 text-center text-xs text-carbon/35">Las visitas y actas de obra (el punto crítico) llegan en la próxima capa.</p>
      </main>
    </div>
  );
}
