import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../lib/comunidades";
import { listarEquipo, type MiembroEquipo } from "../../../../lib/equipo";
import {
  proyectosDeComunidad,
  puntoDe,
  PUNTO_LABEL,
  ENTIDAD_LABEL,
  MODALIDAD_LABEL,
  tiposDe,
  type Proyecto,
} from "../../../../lib/proyecto";
import {
  visadosDeProyecto,
  requerimientosCoam,
  ESTADO_VISADO,
  MOMENTO_LABEL,
  TIPO_VISADO_LABEL,
  CICLO_VISADO,
  visadoIdx,
  type Visado,
  type RequerimientoCoam,
} from "../../../../lib/visado";
import { SelectorComunidad } from "../../../expediente/SelectorComunidad";
import { crearVisado, actualizarVisado, borrarVisado, registrarRequerimientoCoam } from "./acciones";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}
function eur(n: number | null): string {
  return n == null ? "—" : `${n.toLocaleString("es-ES", { minimumFractionDigits: 0 })} €`;
}
function Badge({ v }: { v: { label: string; clase: string } }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.clase}`}>{v.label}</span>;
}

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";
const btn = "rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white";
const resumenEditar = "cursor-pointer list-none text-xs font-medium text-lima-dark hover:underline";

/** Mini-stepper del ciclo del visado (pte enviar -> enviado -> visado). */
function StepperVisado({ estado }: { estado: string }) {
  const idx = visadoIdx(estado);
  const requerido = estado === "requerido";
  return (
    <div className="flex items-center gap-1">
      {CICLO_VISADO.map((c, i) => {
        const hecho = i < idx || (i === idx && estado === "visado");
        const actual = i === idx;
        return (
          <div key={c.clave} className="flex items-center gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                requerido && actual
                  ? "bg-red-100 text-red-700"
                  : hecho
                    ? "bg-emerald-100 text-emerald-700"
                    : actual
                      ? "bg-amber-100 text-amber-700"
                      : "bg-black/5 text-carbon/40"
              }`}
            >
              {requerido && actual ? "Requerido" : c.label}
            </span>
            {i < CICLO_VISADO.length - 1 && <span className="text-carbon/20">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function FilaVisado({ comunidadId, v, equipo }: { comunidadId: string; v: Visado; equipo: MiembroEquipo[] }) {
  const est = ESTADO_VISADO[v.estado] ?? { label: v.estado, clase: "bg-black/5 text-carbon/45" };
  return (
    <li className="rounded-xl border border-black/5 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-carbon/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-carbon/50">
            {MOMENTO_LABEL[v.momento] ?? v.momento}
          </span>
          {v.tipo && (
            <span className="rounded bg-carbon/5 px-1.5 py-0.5 text-[10px] font-semibold text-carbon/50">
              {TIPO_VISADO_LABEL[v.tipo] ?? v.tipo}
            </span>
          )}
          {v.referencia && <span className="font-mono text-xs text-carbon/70">{v.referencia}</span>}
          {v.pausado && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">⏸ Parado</span>}
        </div>
        <Badge v={est} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <StepperVisado estado={v.estado} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-carbon/55">
        {v.fecha_visado && <span>Visado: {fecha(v.fecha_visado)}</span>}
        <span>
          Tasa: {eur(v.tasa)}{" "}
          {v.tasa != null &&
            (v.pagado ? (
              <span className="font-semibold text-emerald-700">pagada</span>
            ) : (
              <span className="font-semibold text-amber-700">pendiente</span>
            ))}
        </span>
        {v.fecha_descarga && (
          <span>
            PDF descargado {fecha(v.fecha_descarga)}
            {v.entregado_al_pagador ? " · entregado ✓" : " · sin entregar"}
          </span>
        )}
        {v.equipo?.nombre && <span>Tramita: {v.equipo.nombre}</span>}
      </div>
      {v.notas && <p className="mt-1 text-xs text-carbon/50">{v.notas}</p>}

      <details className="mt-2">
        <summary className={resumenEditar}>Editar visado</summary>
        <form action={actualizarVisado.bind(null, comunidadId, v.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-4">
          <label className="text-xs text-carbon/60">Estado
            <select name="estado" defaultValue={v.estado} className={`${inp} mt-1 w-full`}>
              {Object.entries(ESTADO_VISADO).map(([k, val]) => <option key={k} value={k}>{val.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-carbon/60">Momento
            <select name="momento" defaultValue={v.momento} className={`${inp} mt-1 w-full`}>
              <option value="proyecto">Proyecto</option>
              <option value="fin_obra">Fin de obra</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Tipo
            <select name="tipo" defaultValue={v.tipo ?? ""} className={`${inp} mt-1 w-full`}>
              <option value="">—</option><option value="normal">Normal</option><option value="urgente">Urgente (48h)</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Código TL
            <input name="referencia" defaultValue={v.referencia ?? ""} placeholder="TL/000000/2026" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Tasa (€)
            <input name="tasa" defaultValue={v.tasa ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="pagado" defaultChecked={v.pagado} /> Tasa pagada</label>
          <label className="text-xs text-carbon/60">Enviado
            <input type="date" name="fecha_envio" defaultValue={v.fecha_envio ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Visado
            <input type="date" name="fecha_visado" defaultValue={v.fecha_visado ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Descarga PDF
            <input type="date" name="fecha_descarga" defaultValue={v.fecha_descarga ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="entregado_al_pagador" defaultChecked={v.entregado_al_pagador} /> Entregado a quien paga</label>
          <label className="text-xs text-carbon/60">Tramita
            <select name="tramita_equipo_id" defaultValue={v.tramita_equipo_id ?? ""} className={`${inp} mt-1 w-full`}>
              <option value="">—</option>
              {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.activo ? "" : " · ex"}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="pausado" defaultChecked={v.pausado} /> Parado (p.ej. ECU)</label>
          <label className="text-xs text-carbon/60 sm:col-span-4">Notas
            <input name="notas" defaultValue={v.notas ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <div className="col-span-full flex items-center gap-2">
            <button className={btn}>Guardar visado</button>
            <button formAction={borrarVisado.bind(null, comunidadId, v.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
              Borrar
            </button>
          </div>
        </form>
      </details>
    </li>
  );
}

function TarjetaProyectoVisado({
  comunidadId,
  p,
  visados,
  reqs,
  equipo,
}: {
  comunidadId: string;
  p: Proyecto;
  visados: Visado[];
  reqs: RequerimientoCoam[];
  equipo: MiembroEquipo[];
}) {
  const punto = puntoDe(p);
  const puntoLabel = PUNTO_LABEL[punto] ?? punto;
  const listoParaVisar = punto === "listo_para_visar";
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg text-lima-dark">✎</span>
          {tiposDe(p).length > 0 ? (
            tiposDe(p).map((t) => (
              <span key={t.clave} className="rounded-lg bg-lima-soft px-2.5 py-1 text-sm font-semibold text-lima-dark">{t.nombre}</span>
            ))
          ) : (
            <h2 className="text-base font-semibold text-carbon">Proyecto</h2>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${listoParaVisar ? "bg-emerald-100 text-emerald-700" : "bg-black/5 text-carbon/50"}`}>
          {puntoLabel}
        </span>
      </div>

      {/* Via */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-carbon/50">Vía:</span>
        {p.entidad_responsable ? (
          <span className="rounded-full bg-carbon/5 px-2 py-0.5 font-semibold text-carbon/70">{ENTIDAD_LABEL[p.entidad_responsable]}</span>
        ) : (
          <span className="text-carbon/30">sin definir</span>
        )}
        {p.modalidad_licencia && <span className="rounded-full bg-carbon/5 px-2 py-0.5 font-semibold text-carbon/70">{MODALIDAD_LABEL[p.modalidad_licencia]}</span>}
        {p.entidad_responsable === "ecu" && !p.ecu_visto_bueno && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">ECU pendiente (visar tras visto bueno)</span>
        )}
        <Link href={`/comunidades/${comunidadId}/proyecto`} className="text-lima-dark hover:underline">editar vía →</Link>
      </div>

      {/* Visados */}
      <div className="mt-4">
        {visados.length > 0 ? (
          <ul className="space-y-2">
            {visados.map((v) => <FilaVisado key={v.id} comunidadId={comunidadId} v={v} equipo={equipo} />)}
          </ul>
        ) : (
          <p className="text-sm text-carbon/35">Sin visado registrado todavía.</p>
        )}
      </div>

      {/* Requerimientos del COAM */}
      {reqs.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-carbon/40">Requerimientos del COAM</div>
          <ol className="space-y-1">
            {reqs.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-black/5 px-3 py-1.5 text-xs">
                <span className="min-w-0"><span className="font-semibold text-carbon/70">Ronda {r.ronda}</span> <span className="text-carbon/60">{r.descripcion}</span></span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${r.estado === "cerrado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {fecha(r.fecha_respuesta ?? r.fecha_recepcion)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap gap-4">
        <details>
          <summary className={resumenEditar}>+ Registrar visado</summary>
          <form action={crearVisado.bind(null, comunidadId, p.id)} className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-black/[0.02] p-3">
            <label className="text-xs text-carbon/60">Momento
              <select name="momento" className={`${inp} mt-1`}><option value="proyecto">Proyecto</option><option value="fin_obra">Fin de obra</option></select>
            </label>
            <label className="text-xs text-carbon/60">Tipo
              <select name="tipo" className={`${inp} mt-1`}><option value="">—</option><option value="normal">Normal</option><option value="urgente">Urgente (48h)</option></select>
            </label>
            <button className={btn}>Crear</button>
          </form>
        </details>

        {visados.length > 0 && (
          <details>
            <summary className={resumenEditar}>Requerimiento del COAM</summary>
            <form action={registrarRequerimientoCoam.bind(null, comunidadId, p.id, visados[visados.length - 1].id)} className="mt-2 space-y-2 rounded-xl bg-black/[0.02] p-3">
              <label className="block text-xs text-carbon/60">Estado
                <select name="resultado" className={`${inp} ml-2`}><option value="requerido">Requerido (pendiente subsanar)</option><option value="resuelto">Resuelto</option></select>
              </label>
              <label className="block text-xs text-carbon/60">Qué pide el COAM
                <textarea name="descripcion" rows={2} className={`${inp} mt-1 w-full`} />
              </label>
              <button className={btn}>Registrar</button>
            </form>
          </details>
        )}
      </div>
    </section>
  );
}

export default async function VisadoComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, proyectos, equipo] = await Promise.all([
    comunidadPorId(id),
    proyectosDeComunidad(id),
    listarEquipo(false),
  ]);
  if (!ficha) notFound();

  const visables = proyectos.filter((p) => p.requiere_visado && p.estado !== "no_procede");
  const [visadosPorProy, reqsPorProy] = await Promise.all([
    Promise.all(visables.map((p) => visadosDeProyecto(p.id))),
    Promise.all(visables.map((p) => requerimientosCoam(p.id))),
  ]);
  const noVisan = proyectos.filter((p) => !p.requiere_visado && p.estado !== "no_procede");

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/visado" className="text-sm text-carbon/50 hover:text-carbon">← Visado</Link>
          <SelectorComunidad compacto hrefBase="/comunidades/" hrefSuffix="/visado" />
        </div>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-carbon">
          <span className="text-lima-dark">✎</span> Visado COAM
        </h1>
        <p className="mt-1 text-sm text-carbon/55">
          {ficha.comunidad.nombre} · <Link href={`/expediente/${id}`} className="text-lima-dark hover:underline">expediente completo</Link>
        </p>

        <div className="mt-6 space-y-5">
          {visables.length === 0 && noVisan.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center text-sm text-carbon/40">
              Sin proyecto registrado en esta comunidad.
            </div>
          )}
          {visables.map((p, i) => (
            <TarjetaProyectoVisado key={p.id} comunidadId={id} p={p} visados={visadosPorProy[i]} reqs={reqsPorProy[i]} equipo={equipo} />
          ))}
          {noVisan.length > 0 && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-5 py-4 text-sm text-carbon/45">
              {noVisan.length} proyecto(s) que no se visan (memoria valorada / servicios).
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
