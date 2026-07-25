import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../lib/comunidades";
import { listarEquipo, type MiembroEquipo } from "../../../../lib/equipo";
import { proyectosDeComunidad, ENTIDAD_LABEL, tiposDe, type Proyecto } from "../../../../lib/proyecto";
import {
  licenciasDeProyecto,
  requerimientosLicencia,
  ESTADO_LICENCIA,
  TIPO_TRAMITE_LABEL,
  INICIO_DR_LABEL,
  CICLO_LICENCIA,
  licenciaIdx,
  drSinArranque,
  type Licencia,
  type RequerimientoLic,
} from "../../../../lib/licencia";
import { SelectorComunidad } from "../../../expediente/SelectorComunidad";
import { crearLicencia, actualizarLicencia, borrarLicencia, registrarRequerimientoLic } from "./acciones";

export const dynamic = "force-dynamic";

function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}
function Badge({ v }: { v: { label: string; clase: string } }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.clase}`}>{v.label}</span>;
}
function flagValor(v: boolean | null): string {
  return v === true ? "si" : v === false ? "no" : "";
}

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";
const btn = "rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white";
const resumenEditar = "cursor-pointer list-none text-xs font-medium text-lima-dark hover:underline";

function StepperLicencia({ estado }: { estado: string }) {
  const idx = licenciaIdx(estado);
  const requerido = estado === "requerido";
  return (
    <div className="flex items-center gap-1">
      {CICLO_LICENCIA.map((c, i) => {
        const hecho = i < idx || (i === idx && estado === "aprobada");
        const actual = i === idx;
        return (
          <div key={c.clave} className="flex items-center gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                requerido && actual ? "bg-red-100 text-red-700" : hecho ? "bg-emerald-100 text-emerald-700" : actual ? "bg-amber-100 text-amber-700" : "bg-black/5 text-carbon/40"
              }`}
            >
              {c.label}
            </span>
            {i < CICLO_LICENCIA.length - 1 && <span className="text-carbon/20">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function FilaLicencia({ comunidadId, l, equipo }: { comunidadId: string; l: Licencia; equipo: MiembroEquipo[] }) {
  const est = ESTADO_LICENCIA[l.estado] ?? { label: l.estado, clase: "bg-black/5 text-carbon/45" };
  const drAlerta = drSinArranque(l);
  return (
    <li className="rounded-xl border border-black/5 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {l.tipo_tramite && <span className="rounded bg-carbon/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-carbon/50">{TIPO_TRAMITE_LABEL[l.tipo_tramite] ?? l.tipo_tramite}</span>}
          {l.tramitada_por === "ellos" && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">La tramitan ellos</span>}
          {l.organismo && <span className="text-xs text-carbon/60">{l.organismo}</span>}
          {l.pausado && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">⏸</span>}
        </div>
        <Badge v={est} />
      </div>

      <div className="mt-2"><StepperLicencia estado={l.estado} /></div>

      {/* Gate DR: alerta si no se puede arrancar obra */}
      {l.tipo_tramite === "dr" && (
        <div className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs ${drAlerta ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {drAlerta ? (
            <>⚠ DR sin autorización de arranque — no iniciar obra sin OK del técnico o exención firmada.</>
          ) : (
            <>✓ Arranque DR autorizado: {l.inicio_dr_autorizado ? INICIO_DR_LABEL[l.inicio_dr_autorizado] : "sí"}</>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-carbon/55">
        {l.fecha_registro_ayto && <span>Registro: {fecha(l.fecha_registro_ayto)}</span>}
        {l.fecha_aprobacion && <span>Aprobación: {fecha(l.fecha_aprobacion)}</span>}
        {l.tecnico_ayto && <span>Técnico: {l.tecnico_ayto}</span>}
        {l.equipo?.nombre && <span>Tramita: {l.equipo.nombre}</span>}
        {l.enlace_doc && <a href={l.enlace_doc} target="_blank" rel="noreferrer" className="text-lima-dark hover:underline">doc licencia ↗</a>}
      </div>

      {/* Tasas */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {(["tasa_licencia", "icio", "residuos"] as const).map((k) => {
          const aplica = k === "tasa_licencia" ? l.tasa_licencia_aplica : k === "icio" ? l.icio_aplica : l.residuos_aplica;
          const imp = k === "tasa_licencia" ? l.tasa_licencia_importe : k === "icio" ? l.icio_importe : l.residuos_importe;
          const lbl = k === "tasa_licencia" ? "Tasa lic." : k === "icio" ? "ICIO" : "Residuos";
          return (
            <span key={k} className={`rounded px-1.5 py-0.5 ${aplica === true ? "bg-amber-50 text-amber-700" : aplica === false ? "bg-black/5 text-carbon/35" : "bg-black/5 text-carbon/30"}`}>
              {lbl}: {aplica === true ? (imp != null ? `${imp.toLocaleString("es-ES")} €` : "aplica") : aplica === false ? "no" : "—"}
              {k === "icio" && l.icio_bonificacion && aplica === true && <span className="ml-1 font-semibold text-emerald-700">bonif.</span>}
            </span>
          );
        })}
      </div>
      {l.espera_subvencion && <p className="mt-1 text-xs text-violet-700">Compromiso: en espera de la subvención.</p>}
      {l.notas && <p className="mt-1 text-xs text-carbon/50">{l.notas}</p>}

      <details className="mt-2">
        <summary className={resumenEditar}>Editar licencia</summary>
        <form action={actualizarLicencia.bind(null, comunidadId, l.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-4">
          <label className="text-xs text-carbon/60">Estado
            <select name="estado" defaultValue={l.estado} className={`${inp} mt-1 w-full`}>
              {Object.entries(ESTADO_LICENCIA).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-carbon/60">Tipo trámite
            <select name="tipo_tramite" defaultValue={l.tipo_tramite ?? ""} className={`${inp} mt-1 w-full`}>
              <option value="">—</option>
              {Object.entries(TIPO_TRAMITE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-carbon/60">Tramitada por
            <select name="tramitada_por" defaultValue={l.tramitada_por} className={`${inp} mt-1 w-full`}>
              <option value="nosotros">Nosotros</option><option value="ellos">Ellos (comunidad)</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Organismo (ayto/junta o ECU)
            <input name="organismo" defaultValue={l.organismo ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Técnico ayto
            <input name="tecnico_ayto" defaultValue={l.tecnico_ayto ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Registro
            <input type="date" name="fecha_registro_ayto" defaultValue={l.fecha_registro_ayto ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Aprobación
            <input type="date" name="fecha_aprobacion" defaultValue={l.fecha_aprobacion ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Gate DR (arranque)
            <select name="inicio_dr_autorizado" defaultValue={l.inicio_dr_autorizado ?? ""} className={`${inp} mt-1 w-full`}>
              <option value="">— no autorizado —</option>
              {Object.entries(INICIO_DR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-carbon/60 sm:col-span-4">Enlace al doc de la licencia
            <input name="enlace_doc" defaultValue={l.enlace_doc ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          {/* Tasas */}
          <label className="text-xs text-carbon/60">Tasa licencia
            <select name="tasa_licencia_aplica" defaultValue={flagValor(l.tasa_licencia_aplica)} className={`${inp} mt-1 w-full`}>
              <option value="">—</option><option value="si">Aplica</option><option value="no">No</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Importe tasa
            <input name="tasa_licencia_importe" defaultValue={l.tasa_licencia_importe ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">ICIO
            <select name="icio_aplica" defaultValue={flagValor(l.icio_aplica)} className={`${inp} mt-1 w-full`}>
              <option value="">—</option><option value="si">Aplica</option><option value="no">No</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Importe ICIO
            <input name="icio_importe" defaultValue={l.icio_importe ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="icio_bonificacion" defaultChecked={l.icio_bonificacion} /> ICIO bonificación solicitada</label>
          <label className="text-xs text-carbon/60">Residuos
            <select name="residuos_aplica" defaultValue={flagValor(l.residuos_aplica)} className={`${inp} mt-1 w-full`}>
              <option value="">—</option><option value="si">Aplica</option><option value="no">No</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Importe residuos
            <input name="residuos_importe" defaultValue={l.residuos_importe ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="espera_subvencion" defaultChecked={l.espera_subvencion} /> Espera subvención</label>
          <label className="text-xs text-carbon/60">Tramita
            <select name="tramita_equipo_id" defaultValue={l.tramita_equipo_id ?? ""} className={`${inp} mt-1 w-full`}>
              <option value="">—</option>
              {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.activo ? "" : " · ex"}</option>)}
            </select>
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="pausado" defaultChecked={l.pausado} /> Parado</label>
          <label className="text-xs text-carbon/60 sm:col-span-4">Notas
            <input name="notas" defaultValue={l.notas ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <div className="col-span-full flex items-center gap-2">
            <button className={btn}>Guardar licencia</button>
            <button formAction={borrarLicencia.bind(null, comunidadId, l.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Borrar</button>
          </div>
        </form>
      </details>
    </li>
  );
}

function TarjetaProyectoLicencia({
  comunidadId,
  p,
  licencias,
  reqs,
  equipo,
}: {
  comunidadId: string;
  p: Proyecto;
  licencias: Licencia[];
  reqs: RequerimientoLic[];
  equipo: MiembroEquipo[];
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg text-lima-dark">✓</span>
          {tiposDe(p).length > 0 ? (
            tiposDe(p).map((t) => <span key={t.clave} className="rounded-lg bg-lima-soft px-2.5 py-1 text-sm font-semibold text-lima-dark">{t.nombre}</span>)
          ) : (
            <h2 className="text-base font-semibold text-carbon">Proyecto</h2>
          )}
        </div>
        {p.entidad_responsable && <span className="rounded-full bg-carbon/5 px-2.5 py-0.5 text-xs font-semibold text-carbon/70">{ENTIDAD_LABEL[p.entidad_responsable]}</span>}
      </div>

      <div className="mt-4">
        {licencias.length > 0 ? (
          <ul className="space-y-2">{licencias.map((l) => <FilaLicencia key={l.id} comunidadId={comunidadId} l={l} equipo={equipo} />)}</ul>
        ) : (
          <p className="text-sm text-carbon/35">Sin licencia registrada todavía.</p>
        )}
      </div>

      {reqs.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-carbon/40">Requerimientos ({reqs.length})</div>
          <ol className="space-y-1">
            {reqs.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg border border-black/5 px-3 py-1.5 text-xs">
                <span className="min-w-0"><span className="font-semibold text-carbon/70">R{r.ronda} · {r.origen === "ecu" ? "ECU" : "Ayto"}</span> <span className="text-carbon/60">{r.descripcion}</span></span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${r.estado === "cerrado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{fecha(r.fecha_respuesta ?? r.fecha_recepcion)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        <details>
          <summary className={resumenEditar}>+ Registrar licencia</summary>
          <form action={crearLicencia.bind(null, comunidadId, p.id)} className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-black/[0.02] p-3">
            <label className="text-xs text-carbon/60">Tipo
              <select name="tipo_tramite" className={`${inp} mt-1`}>
                <option value="">— pte definir —</option>
                {Object.entries(TIPO_TRAMITE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <button className={btn}>Crear</button>
          </form>
        </details>
        {licencias.length > 0 && (
          <details>
            <summary className={resumenEditar}>Registrar requerimiento</summary>
            <form action={registrarRequerimientoLic.bind(null, comunidadId, p.id, licencias[licencias.length - 1].id)} className="mt-2 space-y-2 rounded-xl bg-black/[0.02] p-3">
              <div className="flex gap-2">
                <label className="text-xs text-carbon/60">Origen
                  <select name="origen" className={`${inp} mt-1`}><option value="ayuntamiento">Ayuntamiento</option><option value="ecu">ECU</option></select>
                </label>
                <label className="text-xs text-carbon/60">Estado
                  <select name="resultado" className={`${inp} mt-1`}><option value="requerido">Requerido</option><option value="resuelto">Resuelto</option></select>
                </label>
              </div>
              <label className="block text-xs text-carbon/60">Qué piden
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

export default async function LicenciaComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, proyectos, equipo] = await Promise.all([comunidadPorId(id), proyectosDeComunidad(id), listarEquipo(false)]);
  if (!ficha) notFound();

  const conLic = proyectos.filter((p) => p.requiere_licencia && p.estado !== "no_procede");
  const [licsPorProy, reqsPorProy] = await Promise.all([
    Promise.all(conLic.map((p) => licenciasDeProyecto(p.id))),
    Promise.all(conLic.map((p) => requerimientosLicencia(p.id))),
  ]);
  const sinLic = proyectos.filter((p) => !p.requiere_licencia && p.estado !== "no_procede");

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/licencia" className="text-sm text-carbon/50 hover:text-carbon">← Licencia</Link>
          <SelectorComunidad compacto hrefBase="/comunidades/" hrefSuffix="/licencia" />
        </div>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">✓</span> Licencia / DR</h1>
        <p className="mt-1 text-sm text-carbon/55">{ficha.comunidad.nombre} · <Link href={`/expediente/${id}`} className="text-lima-dark hover:underline">expediente completo</Link></p>

        <div className="mt-6 space-y-5">
          {conLic.length === 0 && sinLic.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center text-sm text-carbon/40">Sin proyecto registrado en esta comunidad.</div>
          )}
          {conLic.map((p, i) => (
            <TarjetaProyectoLicencia key={p.id} comunidadId={id} p={p} licencias={licsPorProy[i]} reqs={reqsPorProy[i]} equipo={equipo} />
          ))}
          {sinLic.length > 0 && (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-5 py-4 text-sm text-carbon/45">{sinLic.length} proyecto(s) sin licencia (no se pide / cancelada).</div>
          )}
        </div>
      </main>
    </div>
  );
}
