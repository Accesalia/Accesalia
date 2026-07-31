import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../lib/comunidades";
import { proyectosDeComunidad, tiposDe, type Proyecto } from "../../../../lib/proyecto";
import {
  licitacionesDeProyecto,
  listarContratas,
  pemProyecto,
  cumpleSubvencion,
  contrataDe,
  ESTADO_LICITACION,
  ESTADO_PRESUPUESTO,
  ROL_PRETENDIDO,
  type Licitacion,
  type Presupuesto,
  type ContrataOpcion,
} from "../../../../lib/licitacion";
import { SelectorComunidad } from "../../../expediente/SelectorComunidad";
import {
  crearLicitacion,
  actualizarLicitacion,
  borrarLicitacion,
  anadirPresupuesto,
  actualizarPresupuesto,
  borrarPresupuesto,
  marcarGanador,
} from "./acciones";
import { Guardando } from "../../../components/Guardando";

export const dynamic = "force-dynamic";

function eur(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString("es-ES")} €`;
}
function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
function Badge({ v }: { v: { label: string; clase: string } }) {
  if (!v.label) return null;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.clase}`}>{v.label}</span>;
}

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";
const btn = "rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white";
const link = "cursor-pointer list-none text-xs font-medium text-lima-dark hover:underline";

function SelectorContrata({ contratas, actual }: { contratas: ContrataOpcion[]; actual: string | null }) {
  return (
    <select name="contrata_id" defaultValue={actual ?? ""} className={`${inp} w-full`}>
      <option value="">— por texto / sin ficha —</option>
      {contratas.map((c) => (
        <option key={c.id} value={c.id}>{c.nombre}</option>
      ))}
    </select>
  );
}

// Fila de un presupuesto: identidad, importe, firmas, rol y acciones.
function FilaPresupuesto({
  comunidadId,
  licitacionId,
  p,
  contratas,
  esMenor,
}: {
  comunidadId: string;
  licitacionId: string;
  p: Presupuesto;
  contratas: ContrataOpcion[];
  esMenor: boolean;
}) {
  const esGanador = p.estado === "adjudicada";
  return (
    <li className={`rounded-xl border px-3 py-2.5 ${esGanador ? "border-emerald-300 bg-emerald-50/40" : "border-black/5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-carbon">{contrataDe(p)}</span>
          <Badge v={ROL_PRETENDIDO[p.rol_pretendido] ?? { label: "", clase: "" }} />
          {p.origen === "aportada_por_comunidad" && (
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-carbon/50">De la comunidad</span>
          )}
          <Badge v={ESTADO_PRESUPUESTO[p.estado] ?? { label: p.estado, clase: "bg-black/5 text-carbon/45" }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-carbon">{eur(p.importe_pem)}</span>
          {esMenor && <span className="rounded bg-lima-soft px-1.5 py-0.5 text-[10px] font-semibold text-lima-dark">más baja</span>}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className={p.firmado_contrata ? "font-medium text-emerald-700" : "text-amber-600"}>
          {p.firmado_contrata ? "✓" : "○"} firma contrata
        </span>
        {esGanador && (
          <span className={p.firmado_comunidad ? "font-medium text-emerald-700" : "text-amber-600"}>
            {p.firmado_comunidad ? "✓" : "○"} firma comunidad
          </span>
        )}
        {p.fecha_presupuesto && <span className="text-carbon/45">{fecha(p.fecha_presupuesto)}</span>}
        {p.enlace_documento && (
          <a href={p.enlace_documento} target="_blank" rel="noopener" className="text-lima-dark hover:underline">📄 PDF</a>
        )}
        {!esGanador && (
          <form action={marcarGanador.bind(null, comunidadId, licitacionId, p.id)}>
            <Guardando />
            <button className="font-semibold text-lima-dark hover:underline">★ marcar ganador</button>
          </form>
        )}
      </div>
      {p.notas && <p className="mt-1 text-xs text-carbon/50">{p.notas}</p>}

      <details className="mt-1.5">
        <summary className={link}>Editar presupuesto</summary>
        <form action={actualizarPresupuesto.bind(null, comunidadId, p.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-3">
          <Guardando />
          <label className="text-xs text-carbon/60 sm:col-span-2">Contrata (ficha)
            <div className="mt-1"><SelectorContrata contratas={contratas} actual={p.contrata_id} /></div>
          </label>
          <label className="text-xs text-carbon/60">Contrata (texto)
            <input name="contrata_externa_nombre" defaultValue={p.contrata_externa_nombre ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Importe PEM (€)
            <input name="importe_pem" defaultValue={p.importe_pem ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Origen
            <select name="origen" defaultValue={p.origen} className={`${inp} mt-1 w-full`}>
              <option value="invitada_por_nosotros">Invitada por nosotros</option>
              <option value="aportada_por_comunidad">Aportada por la comunidad</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Rol (solo invitadas)
            <select name="rol_pretendido" defaultValue={p.rol_pretendido} className={`${inp} mt-1 w-full`}>
              <option value="na">—</option>
              <option value="preferida">Preferida</option>
              <option value="palanca">Palanca</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Estado
            <select name="estado" defaultValue={p.estado} className={`${inp} mt-1 w-full`}>
              {Object.entries(ESTADO_PRESUPUESTO).map(([k, v]) => <option key={k} value={k}>{v.label || k}</option>)}
            </select>
          </label>
          <label className="text-xs text-carbon/60">Fecha
            <input type="date" name="fecha_presupuesto" defaultValue={p.fecha_presupuesto ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="firmado_contrata" defaultChecked={p.firmado_contrata} /> Firmado contrata</label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="firmado_comunidad" defaultChecked={p.firmado_comunidad} /> Firmado comunidad</label>
          <label className="text-xs text-carbon/60 sm:col-span-3">Enlace al PDF/BC3 original
            <input name="enlace_documento" defaultValue={p.enlace_documento ?? ""} placeholder="https://…" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60 sm:col-span-3">Notas
            <input name="notas" defaultValue={p.notas ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <div className="col-span-full flex items-center gap-2">
            <button className={btn}>Guardar</button>
            <button formAction={borrarPresupuesto.bind(null, comunidadId, p.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Borrar</button>
          </div>
        </form>
      </details>
    </li>
  );
}

function TarjetaLicitacion({
  comunidadId,
  l,
  contratas,
}: {
  comunidadId: string;
  l: Licitacion;
  contratas: ContrataOpcion[];
}) {
  const est = ESTADO_LICITACION[l.estado] ?? { label: l.estado, clase: "bg-black/5 text-carbon/45" };
  const sub = cumpleSubvencion(l);
  const presupuestos = l.presupuestos_licitacion;
  const importes = presupuestos.map((p) => p.importe_pem).filter((n): n is number => n != null);
  const menor = importes.length ? Math.min(...importes) : null;

  return (
    <div className="rounded-xl border border-black/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge v={est} />
          {l.paquete !== "unico" && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-carbon/50">{l.paquete}</span>}
          <span className="text-xs text-carbon/45">{presupuestos.length} presupuesto(s)</span>
          {l.esperando_de && <span className="text-xs text-amber-600">esperando: {l.esperando_de}</span>}
        </div>
      </div>

      {/* Checklist de subvención */}
      <div className={`mt-2 rounded-lg px-3 py-1.5 text-xs ${sub.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {sub.ok ? (
          <>✓ Expediente de subvención completo (≥3 firmados · ganador firmado por comunidad · acta de votación)</>
        ) : (
          <>⚠ Para subvención falta: {sub.faltan.join(" · ")}</>
        )}
      </div>

      {/* Presupuestos */}
      {presupuestos.length > 0 && (
        <ul className="mt-3 space-y-2">
          {presupuestos.map((p) => (
            <FilaPresupuesto key={p.id} comunidadId={comunidadId} licitacionId={l.id} p={p} contratas={contratas} esMenor={p.importe_pem != null && p.importe_pem === menor} />
          ))}
        </ul>
      )}

      {/* Añadir presupuesto */}
      <details className="mt-3">
        <summary className={link}>+ Añadir presupuesto</summary>
        <form action={anadirPresupuesto.bind(null, comunidadId, l.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-3">
          <Guardando />
          <label className="text-xs text-carbon/60 sm:col-span-2">Contrata (ficha)
            <div className="mt-1"><SelectorContrata contratas={contratas} actual={null} /></div>
          </label>
          <label className="text-xs text-carbon/60">Contrata (texto)
            <input name="contrata_externa_nombre" placeholder="si no está fichada" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Importe PEM (€)
            <input name="importe_pem" inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Origen
            <select name="origen" defaultValue="invitada_por_nosotros" className={`${inp} mt-1 w-full`}>
              <option value="invitada_por_nosotros">Invitada por nosotros</option>
              <option value="aportada_por_comunidad">Aportada por la comunidad</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Rol (solo invitadas)
            <select name="rol_pretendido" defaultValue="na" className={`${inp} mt-1 w-full`}>
              <option value="na">—</option>
              <option value="preferida">Preferida</option>
              <option value="palanca">Palanca</option>
            </select>
          </label>
          <label className="text-xs text-carbon/60">Fecha
            <input type="date" name="fecha_presupuesto" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="firmado_contrata" /> Firmado contrata</label>
          <label className="text-xs text-carbon/60 sm:col-span-3">Enlace al PDF/BC3
            <input name="enlace_documento" placeholder="https://…" className={`${inp} mt-1 w-full`} />
          </label>
          <div className="col-span-full"><button className={btn}>Añadir presupuesto</button></div>
        </form>
      </details>

      {/* Editar licitación (votación, acta, informe) */}
      <details className="mt-2">
        <summary className={link}>Votación y documentos de la licitación</summary>
        <form action={actualizarLicitacion.bind(null, comunidadId, l.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3">
          <Guardando />
          <label className="text-xs text-carbon/60">Estado
            <select name="estado" defaultValue={l.estado} className={`${inp} mt-1 w-full`}>
              {Object.entries(ESTADO_LICITACION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-carbon/60">Esperando de
            <input name="esperando_de" defaultValue={l.esperando_de ?? ""} placeholder="contrata / convocar junta…" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Fecha de votación
            <input type="date" name="fecha_votacion" defaultValue={l.fecha_votacion ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Acta de votación (enlace)
            <input name="acta_votacion_enlace" defaultValue={l.acta_votacion_enlace ?? ""} placeholder="https://…" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60 sm:col-span-2">Informe de adecuación (enlace)
            <input name="informe_adecuacion_enlace" defaultValue={l.informe_adecuacion_enlace ?? ""} placeholder="https://…" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60 sm:col-span-2">Notas
            <input name="notas" defaultValue={l.notas ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <div className="col-span-full flex items-center gap-2">
            <button className={btn}>Guardar licitación</button>
            <button formAction={borrarLicitacion.bind(null, comunidadId, l.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Borrar licitación</button>
          </div>
        </form>
      </details>
    </div>
  );
}

function TarjetaProyecto({
  comunidadId,
  p,
  licitaciones,
  contratas,
  pem,
  casoB,
}: {
  comunidadId: string;
  p: Proyecto;
  licitaciones: Licitacion[];
  contratas: ContrataOpcion[];
  pem: number | null;
  casoB: boolean;
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg text-lima-dark">⚑</span>
          {tiposDe(p).length > 0 ? tiposDe(p).map((t) => <span key={t.clave} className="rounded-lg bg-lima-soft px-2.5 py-1 text-sm font-semibold text-lima-dark">{t.nombre}</span>) : <h2 className="text-base font-semibold text-carbon">Proyecto</h2>}
          {casoB && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700" title="El proyecto ya venía con contrata; los otros presupuestos suelen ser palancas para la subvención">Caso B · ya con contrata</span>}
        </div>
        {pem != null && <span className="text-xs text-carbon/50">PEM ref. <b className="text-carbon">{eur(pem)}</b></span>}
      </div>

      {licitaciones.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm text-carbon/35">Sin licitación abierta todavía.</p>
          <form action={crearLicitacion.bind(null, comunidadId, p.id)} className="mt-2">
            <Guardando /><button className={btn}>+ Abrir licitación</button></form>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {licitaciones.map((l) => <TarjetaLicitacion key={l.id} comunidadId={comunidadId} l={l} contratas={contratas} />)}
          <form action={crearLicitacion.bind(null, comunidadId, p.id)}>
            <Guardando /><button className="text-xs font-medium text-lima-dark hover:underline">+ Otra licitación (paquete distinto)</button></form>
        </div>
      )}
    </section>
  );
}

export default async function TresPresupuestosComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, proyectos, contratas] = await Promise.all([
    comunidadPorId(id),
    proyectosDeComunidad(id),
    listarContratas(),
  ]);
  if (!ficha) notFound();

  const conProyecto = proyectos.filter((p) => p.estado !== "no_procede");
  const [licitacionesPorProy, pems] = await Promise.all([
    Promise.all(conProyecto.map((p) => licitacionesDeProyecto(p.id))),
    Promise.all(conProyecto.map((p) => pemProyecto(p.id))),
  ]);

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/tres-presupuestos" className="text-sm text-carbon/50 hover:text-carbon">← Tres Presupuestos</Link>
          <SelectorComunidad compacto hrefBase="/comunidades/" hrefSuffix="/tres-presupuestos" />
        </div>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">⚑</span> Tres Presupuestos</h1>
        <p className="mt-1 text-sm text-carbon/55">{ficha.comunidad.nombre} · <Link href={`/expediente/${id}`} className="text-lima-dark hover:underline">expediente completo</Link></p>

        <div className="mt-6 space-y-5">
          {conProyecto.length === 0 && <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center text-sm text-carbon/40">Sin proyecto registrado en esta comunidad.</div>}
          {conProyecto.map((p, i) => (
            <TarjetaProyecto key={p.id} comunidadId={id} p={p} licitaciones={licitacionesPorProy[i]} contratas={contratas} pem={pems[i].pem} casoB={pems[i].pemOrigen === "contrata"} />
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-carbon/35">El desglose por partidas del ganador (y con él contradictorios y certificaciones) llega en la próxima capa.</p>
      </main>
    </div>
  );
}
