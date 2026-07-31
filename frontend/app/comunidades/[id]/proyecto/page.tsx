import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../lib/comunidades";
import { listarEquipo, type MiembroEquipo } from "../../../../lib/equipo";
import {
  proyectosDeComunidad,
  listarTiposProyecto,
  revisionesDeProyecto,
  puntoDe,
  PUNTO_LABEL,
  ESTADO_ETAPA,
  REVISION_ESTADO,
  PASO_LABEL,
  ENTIDAD_LABEL,
  MODALIDAD_LABEL,
  responsableDe,
  tiposDe,
  type Proyecto,
  type TipoCatalogo,
  type Revision,
} from "../../../../lib/proyecto";
import { ProgresoProyecto } from "../../../components/ProgresoProyecto";
import { SelectorComunidad } from "../../../expediente/SelectorComunidad";
import { crearProyecto, actualizarProyecto, actualizarVia, actualizarPaso, registrarRevision, actualizarTipos, modificarFases } from "./acciones";
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
function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-carbon/40">{etiqueta}</div>
      <div className="mt-0.5 text-sm text-carbon">{children || <span className="text-carbon/30">—</span>}</div>
    </div>
  );
}

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";
const btn = "rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white";
const resumenEditar = "cursor-pointer list-none text-xs font-medium text-lima-dark hover:underline";

function TarjetaProyecto({
  comunidadId,
  p,
  equipo,
  tipos,
  revisiones,
}: {
  comunidadId: string;
  p: Proyecto;
  equipo: MiembroEquipo[];
  tipos: TipoCatalogo[];
  revisiones: Revision[];
}) {
  const pausado = p.estado === "en_pausa";
  const puntoLabel = PUNTO_LABEL[puntoDe(p)] ?? puntoDe(p);
  const rev = p.revision_estado ? REVISION_ESTADO[p.revision_estado] : null;
  const APLICA: Record<string, boolean> = { escaneo: true, montaje_nube: true, estado_actual: true, proyecto: true };
  for (const e of p.etapas_proyecto) if (e.estado === "no_aplica") APLICA[e.tipo_etapa] = false;
  const cee =
    p.cee_estado === "listo" ? "Listo" : p.cee_estado === "pendiente" ? "Pendiente" : p.cee_estado === "no_requerido" ? "No requerido" : null;
  const misTipos = new Set(tiposDe(p).map((t) => t.clave));

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg text-lima-dark">▤</span>
          {tiposDe(p).length > 0 ? (
            tiposDe(p).map((t) => (
              <span key={t.clave} className="rounded-lg bg-lima-soft px-2.5 py-1 text-sm font-semibold text-lima-dark">
                {t.nombre}
              </span>
            ))
          ) : (
            <h2 className="text-base font-semibold text-carbon">Proyecto</h2>
          )}
          {p.proyecto_externo && (
            <span className="rounded-lg bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Externo</span>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${pausado ? "bg-red-100 text-red-700" : "bg-lima-soft text-lima-dark"}`}>
          {pausado ? "⏸ Pausado" : puntoLabel}
        </span>
      </div>

      {/* Stepper */}
      <div className="mt-5 px-1">
        <ProgresoProyecto p={p} />
      </div>

      {/* Modificar fases (retirar/reactivar) */}
      <details className="mt-2">
        <summary className={resumenEditar}>Modificar fases</summary>
        <form action={modificarFases.bind(null, comunidadId, p.id)} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-black/[0.02] p-3">
          <Guardando />
          {[["escaneo", "Escaneo"], ["montaje_nube", "Nube"], ["estado_actual", "Estado actual"], ["proyecto", "Solución"]].map(([k, lbl]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm text-carbon/80">
              <input type="checkbox" name={`aplica_${k}`} defaultChecked={APLICA[k]} /> {lbl}
            </label>
          ))}
          <button className={btn}>Guardar fases</button>
          <span className="w-full text-[11px] text-carbon/40">Desmarca las fases que no apliquen (p.ej. rampa sin escaneo). Se ocultan del flujo.</span>
        </form>
      </details>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato etiqueta="Contratado">{fecha(p.fecha_contratado)}</Dato>
        <Dato etiqueta="CEE">{cee}</Dato>
        <Dato etiqueta="Arranque">
          {p.arranque_cumplido ? <span className="text-emerald-700">Desbloqueado</span> : <span className="text-amber-700">Pendiente</span>}
        </Dato>
        <Dato etiqueta="Revisión Daniel">{rev ? <Badge v={rev} /> : "—"}</Dato>
      </div>

      {(p.condicion_arranque || p.arranque_referencia) && (
        <div className="mt-3 rounded-xl bg-black/[0.02] px-3 py-2 text-xs text-carbon/60">
          <span className="font-semibold text-carbon/70">Condición de arranque:</span> {p.condicion_arranque || "—"}
          {p.arranque_referencia ? ` · ref. ${p.arranque_referencia}` : ""}
        </div>
      )}

      {/* Via de licencia (decide el "OK de Daniel": por ECU no salta a listo para visar) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-carbon/50">Vía licencia:</span>
        {p.entidad_responsable ? (
          <span className="rounded-full bg-carbon/5 px-2 py-0.5 font-semibold text-carbon/70">{ENTIDAD_LABEL[p.entidad_responsable]}</span>
        ) : (
          <span className="text-carbon/30">sin definir</span>
        )}
        {p.modalidad_licencia && (
          <span className="rounded-full bg-carbon/5 px-2 py-0.5 font-semibold text-carbon/70">{MODALIDAD_LABEL[p.modalidad_licencia]}</span>
        )}
        {!p.requiere_visado && <span className="rounded-full bg-black/5 px-2 py-0.5 font-semibold text-carbon/40">⊘ No se visa</span>}
        {p.entidad_responsable === "ecu" && (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${p.ecu_visto_bueno ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            ECU {p.ecu_visto_bueno ? "✓ visto bueno" : "pendiente"}
          </span>
        )}
      </div>
      <details className="mt-1.5">
        <summary className={resumenEditar}>Editar vía de licencia</summary>
        <form action={actualizarVia.bind(null, comunidadId, p.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-4">
          <Guardando />
          <label className="text-xs text-carbon/60">Entidad
            <select name="entidad_responsable" defaultValue={p.entidad_responsable ?? ""} className={`${inp} mt-1 w-full`}>
              <option value="">— sin definir —</option>
              <option value="ayuntamiento">Ayuntamiento</option>
              <option value="ecu">ECU</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Modalidad
            <select name="modalidad_licencia" defaultValue={p.modalidad_licencia ?? ""} className={`${inp} mt-1 w-full`}>
              <option value="">— sin definir —</option>
              <option value="declaracion_responsable">Declaración responsable</option>
              <option value="licencia">Licencia</option>
            </select>
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="requiere_visado" defaultChecked={p.requiere_visado} /> Requiere visado</label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="ecu_visto_bueno" defaultChecked={p.ecu_visto_bueno} /> ECU dio visto bueno</label>
          <div className="col-span-full"><button className={btn}>Guardar vía</button></div>
          <span className="col-span-full text-[11px] text-carbon/40">Por ECU, tras el OK de Daniel el proyecto queda “pendiente de trámite ECU” hasta marcar el visto bueno; entonces pasa a “listo para visar”.</span>
        </form>
      </details>

      {/* Editar cabecera */}
      <details className="mt-3">
        <summary className={resumenEditar}>Editar datos del proyecto</summary>
        <form action={actualizarProyecto.bind(null, comunidadId, p.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-3">
          <Guardando />
          <label className="text-xs text-carbon/60">Situación
            <select name="estado" defaultValue={p.estado === "en_pausa" || p.estado === "no_procede" ? p.estado : "en_curso"} className={`${inp} mt-1 w-full`}>
              <option value="en_curso">En curso</option>
              <option value="en_pausa">Pausado</option>
              <option value="no_procede">No procede</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">CEE
            <select name="cee_estado" defaultValue={p.cee_estado ?? ""} className={`${inp} mt-1 w-full`}>
              <option value="">—</option><option value="pendiente">Pendiente</option><option value="listo">Listo</option><option value="no_requerido">No requerido</option>
            </select>
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="proyecto_externo" defaultChecked={p.proyecto_externo} /> Proyecto externo</label>
          <label className="text-xs text-carbon/60 sm:col-span-2">Condición de arranque
            <input name="condicion_arranque" defaultValue={p.condicion_arranque ?? ""} placeholder="cobro / orden de compra / firma HE…" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Referencia arranque
            <input name="arranque_referencia" defaultValue={p.arranque_referencia ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="arranque_cumplido" defaultChecked={p.arranque_cumplido} /> Arranque desbloqueado</label>
          <label className="text-xs text-carbon/60">Fecha arranque
            <input type="date" name="arranque_fecha" defaultValue={p.arranque_fecha ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60 sm:col-span-3">Nota / causa de pausa
            <textarea name="notas" defaultValue={p.notas ?? ""} rows={2} placeholder="Si está pausado: por qué y qué lo desbloquearía…" className={`${inp} mt-1 w-full`} />
          </label>
          <div className="col-span-full"><button className={btn}>Guardar</button></div>
        </form>
      </details>

      {/* Editar tipos (tags) */}
      <details className="mt-1.5">
        <summary className={resumenEditar}>Editar tipos</summary>
        <form action={actualizarTipos.bind(null, comunidadId, p.id)} className="mt-2 rounded-xl bg-black/[0.02] p-3">
          <Guardando />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {tipos.map((t) => (
              <label key={t.id} className={`flex items-center gap-1.5 text-sm text-carbon/80 ${t.parent_id ? "ml-4" : ""}`}>
                <input type="checkbox" name="tipo_id" value={t.id} defaultChecked={misTipos.has(t.clave)} /> {t.nombre}
              </label>
            ))}
          </div>
          <button className={`${btn} mt-2`}>Guardar tipos</button>
        </form>
      </details>

      {/* Pasos */}
      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-carbon/40">Pasos</div>
        <ol className="space-y-1.5">
          {p.etapas_proyecto.map((e) => {
            const ee = ESTADO_ETAPA[e.estado] ?? { label: e.estado, clase: "bg-black/5 text-carbon/45" };
            const resp = responsableDe(e);
            return (
              <li key={e.id} className="rounded-xl border border-black/5 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-24 shrink-0 text-sm font-medium text-carbon">{PASO_LABEL[e.tipo_etapa] ?? e.tipo_etapa}</span>
                    {resp && <span className="truncate text-xs text-carbon/55">{resp}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {e.fecha_inicio && <span className="text-xs text-carbon/40">{fecha(e.fecha_inicio)}</span>}
                    <Badge v={ee} />
                  </div>
                </div>
                <details className="mt-1.5">
                  <summary className={resumenEditar}>Editar</summary>
                  <form action={actualizarPaso.bind(null, comunidadId, e.id)} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Guardando />
                    <label className="text-xs text-carbon/60 sm:col-span-2">Responsable
                      <select name="responsable" defaultValue={e.responsable_tecnico_id ?? ""} className={`${inp} mt-1 w-full`}>
                        <option value="">— sin asignar —</option>
                        {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.activo ? "" : " · ex"}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-carbon/60">Estado
                      <select name="estado" defaultValue={e.estado} className={`${inp} mt-1 w-full`}>
                        {Object.entries(ESTADO_ETAPA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-carbon/60">Prevista
                      <input type="date" name="fecha_prevista" defaultValue={e.fecha_prevista ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60">Inicio
                      <input type="date" name="fecha_inicio" defaultValue={e.fecha_inicio ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <label className="text-xs text-carbon/60">Entrega
                      <input type="date" name="fecha_fin" defaultValue={e.fecha_fin ?? ""} className={`${inp} mt-1 w-full`} />
                    </label>
                    <div className="col-span-full"><button className={btn}>Guardar paso</button></div>
                  </form>
                </details>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Revisión de Daniel */}
      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-carbon/40">Revisión de Daniel</div>
        {revisiones.length > 0 && (
          <ol className="mb-2 space-y-1">
            {revisiones.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-black/5 px-3 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className="font-semibold text-carbon/70">Ronda {r.ronda}</span>{" "}
                  <span className="text-carbon/60">{r.descripcion}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${r.estado === "cerrado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {fecha(r.fecha_respuesta ?? r.fecha_recepcion)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <details>
          <summary className={resumenEditar}>Registrar ronda de revisión</summary>
          <form action={registrarRevision.bind(null, comunidadId, p.id)} className="mt-2 space-y-2 rounded-xl bg-black/[0.02] p-3">
            <Guardando />
            <label className="block text-xs text-carbon/60">Resultado
              <select name="resultado" className={`${inp} ml-2`}>
                <option value="cambios">Pidió cambios</option>
                <option value="ok">OK · listo para visar</option>
              </select>
            </label>
            <label className="block text-xs text-carbon/60">Qué se cambió / observaciones
              <textarea name="cambios" rows={2} placeholder="Cotas de la escalera, revisar mediciones…" className={`${inp} mt-1 w-full`} />
            </label>
            <button className={btn}>Registrar ronda</button>
          </form>
        </details>
      </div>
    </section>
  );
}

export default async function ProyectoComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, proyectos, equipo, tipos] = await Promise.all([
    comunidadPorId(id),
    proyectosDeComunidad(id),
    listarEquipo(false),
    listarTiposProyecto(),
  ]);
  if (!ficha) notFound();
  const revisiones = await Promise.all(proyectos.map((p) => revisionesDeProyecto(p.id)));

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/proyecto" className="text-sm text-carbon/50 hover:text-carbon">← Proyecto técnico</Link>
          <SelectorComunidad compacto hrefBase="/comunidades/" hrefSuffix="/proyecto" />
        </div>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-carbon">
          <span className="text-lima-dark">▤</span> Proyecto
        </h1>
        <p className="mt-1 text-sm text-carbon/55">
          {ficha.comunidad.nombre} · <Link href={`/expediente/${id}`} className="text-lima-dark hover:underline">expediente completo</Link>
        </p>

        <div className="mt-6 space-y-5">
          {proyectos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center">
              <p className="text-sm text-carbon/40">Sin proyecto registrado en esta comunidad.</p>
              <form action={crearProyecto.bind(null, id)} className="mt-3">
                <Guardando />
                <button className={btn}>+ Crear proyecto</button>
              </form>
            </div>
          )}
          {proyectos.map((p, i) => (
            <TarjetaProyecto key={p.id} comunidadId={id} p={p} equipo={equipo} tipos={tipos} revisiones={revisiones[i]} />
          ))}
        </div>
      </main>
    </div>
  );
}
