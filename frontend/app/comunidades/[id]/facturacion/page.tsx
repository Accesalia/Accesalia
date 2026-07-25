import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../lib/comunidades";
import {
  facturacionComunidad,
  resumenFacturacionComunidad,
  estadoHito,
  HITO_LABEL,
  type LineaFacturacion,
  type HitoCobro,
} from "../../../../lib/hojas";
import { EMISOR_LABEL, EMISORES_ACCESALIA, hitosFacturablesDeComunidad } from "../../../../lib/facturacion";
import { SelectorComunidad } from "../../../expediente/SelectorComunidad";
import { actualizarHito, anadirHito, borrarHito, actualizarLinea } from "./acciones";

export const dynamic = "force-dynamic";

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${Math.round(n).toLocaleString("es-ES")} €`;
}
function fecha(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
function Badge({ v }: { v: { label: string; clase: string } }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.clase}`}>{v.label}</span>;
}

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";
const btn = "rounded-lg bg-lima px-3 py-1.5 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white";
const link = "cursor-pointer list-none text-xs font-medium text-lima-dark hover:underline";
const HITOS = Object.keys(HITO_LABEL);
const ESTADOS_HITO = ["pendiente", "facturado", "cobrado", "devuelto", "anulado"];

function Chip({ etiqueta, valor, acento }: { etiqueta: string; valor: string; acento?: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white px-4 py-2.5 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-carbon/40">{etiqueta}</div>
      <div className={`mt-0.5 text-lg font-bold ${acento ?? "text-carbon"}`}>{valor}</div>
    </div>
  );
}

function HitoRow({ comunidadId, h, facturable }: { comunidadId: string; h: HitoCobro; facturable: boolean }) {
  const est = estadoHito(h.estado);
  return (
    <li className={`rounded-lg border px-3 py-2 ${facturable ? "border-lima bg-lima-soft/30" : "border-black/5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-carbon">{HITO_LABEL[h.hito] ?? h.hito}</span>
          {h.porcentaje != null && <span className="text-carbon/45">{h.porcentaje}%</span>}
          <span className="font-semibold text-carbon">{eur(h.importe)}</span>
          <Badge v={est} />
          {facturable && <span className="rounded-full bg-lima px-2 py-0.5 text-[11px] font-semibold text-carbon">✦ facturable ahora</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-carbon/55">
          {h.numero_factura && <span>fra. {h.numero_factura}</span>}
          {h.fecha_factura && <span>emit. {fecha(h.fecha_factura)}</span>}
          {h.fecha_vencimiento && <span>vto. {fecha(h.fecha_vencimiento)}</span>}
          {h.fecha_cobro && <span className="text-emerald-700">cobr. {fecha(h.fecha_cobro)}</span>}
          {h.url_factura_pdf && <a href={h.url_factura_pdf} target="_blank" rel="noopener" className="text-lima-dark hover:underline">📄 PDF</a>}
        </div>
      </div>

      <details className="mt-1">
        <summary className={link}>Registrar / editar</summary>
        <form action={actualizarHito.bind(null, comunidadId, h.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-4">
          <label className="text-xs text-carbon/60">Disparador
            <select name="hito" defaultValue={h.hito} className={`${inp} mt-1 w-full`}>
              {HITOS.map((k) => <option key={k} value={k}>{HITO_LABEL[k]}</option>)}
            </select>
          </label>
          <label className="text-xs text-carbon/60">Estado
            <select name="estado" defaultValue={h.estado} className={`${inp} mt-1 w-full`}>
              {ESTADOS_HITO.map((k) => <option key={k} value={k}>{estadoHito(k).label}</option>)}
            </select>
          </label>
          <label className="text-xs text-carbon/60">Importe (€)
            <input name="importe" defaultValue={h.importe ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">%
            <input name="porcentaje" defaultValue={h.porcentaje ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Nº factura
            <input name="numero_factura" defaultValue={h.numero_factura ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Fecha factura
            <input type="date" name="fecha_factura" defaultValue={h.fecha_factura ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Vencimiento
            <input type="date" name="fecha_vencimiento" defaultValue={h.fecha_vencimiento ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Fecha cobro
            <input type="date" name="fecha_cobro" defaultValue={h.fecha_cobro ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Nº abono
            <input name="numero_abono" defaultValue={h.numero_abono ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60">Gastos devolución (€)
            <input name="gastos_devolucion" defaultValue={h.gastos_devolucion ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} />
          </label>
          <label className="text-xs text-carbon/60 sm:col-span-2">PDF de la factura (Factusol)
            <input type="file" name="factura_pdf" accept="application/pdf,image/*" className="mt-1 block w-full text-xs text-carbon/70 file:mr-2 file:rounded file:border-0 file:bg-lima-soft file:px-2 file:py-1 file:text-xs file:font-semibold file:text-lima-dark" />
          </label>
          <label className="text-xs text-carbon/60 sm:col-span-4">Notas
            <input name="notas" defaultValue={h.notas ?? ""} className={`${inp} mt-1 w-full`} />
          </label>
          <div className="col-span-full flex items-center gap-2">
            <button className={btn}>Guardar hito</button>
            <button formAction={borrarHito.bind(null, comunidadId, h.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">Borrar</button>
          </div>
        </form>
      </details>
    </li>
  );
}

function LineaCard({ comunidadId, l, facturables }: { comunidadId: string; l: LineaFacturacion; facturables: Set<string> }) {
  const total = l.hitos_cobro.reduce((s, h) => s + (h.importe ?? 0), 0);
  return (
    <div className="rounded-xl border border-black/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-carbon">{l.bloques?.nombre ?? l.descripcion ?? "Concepto"}</span>
          {l.emisor !== "accesalia" && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-carbon/50">{EMISOR_LABEL[l.emisor] ?? l.emisor}</span>}
          {!l.verificado && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700" title="Importe estimado de Monday, sin verificar">estimado</span>}
        </div>
        <span className="text-sm text-carbon/60">{eur(l.importe)}{l.es_porcentaje && l.porcentaje ? ` · ${l.porcentaje}%` : ""}</span>
      </div>

      {l.hitos_cobro.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {l.hitos_cobro.map((h) => <HitoRow key={h.id} comunidadId={comunidadId} h={h} facturable={facturables.has(h.id)} />)}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-carbon/35">Sin hitos de cobro. Añade el plan de cobro.</p>
      )}
      {l.hitos_cobro.length > 0 && !l.es_porcentaje && Math.abs(total - (l.importe ?? 0)) > 1 && (
        <p className="mt-1 text-[11px] text-amber-600">⚠ Los hitos suman {eur(total)} y la línea es {eur(l.importe)}.</p>
      )}

      <div className="mt-2 flex flex-wrap gap-3">
        <details>
          <summary className={link}>+ Añadir hito</summary>
          <form action={anadirHito.bind(null, comunidadId, l.id)} className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-black/[0.02] p-3">
            <label className="text-xs text-carbon/60">Disparador
              <select name="hito" className={`${inp} mt-1 block`}>{HITOS.map((k) => <option key={k} value={k}>{HITO_LABEL[k]}</option>)}</select>
            </label>
            <label className="text-xs text-carbon/60">Orden<input name="orden" defaultValue={l.hitos_cobro.length} inputMode="numeric" className={`${inp} mt-1 block w-16`} /></label>
            <label className="text-xs text-carbon/60">%<input name="porcentaje" inputMode="decimal" className={`${inp} mt-1 block w-20`} /></label>
            <label className="text-xs text-carbon/60">Importe (€)<input name="importe" inputMode="decimal" className={`${inp} mt-1 block w-28`} /></label>
            <button className={btn}>Añadir</button>
          </form>
        </details>
        <details>
          <summary className={link}>Editar línea</summary>
          <form action={actualizarLinea.bind(null, comunidadId, l.id)} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-black/[0.02] p-3 sm:grid-cols-3">
            <label className="text-xs text-carbon/60 sm:col-span-2">Descripción<input name="descripcion" defaultValue={l.descripcion ?? ""} className={`${inp} mt-1 w-full`} /></label>
            <label className="text-xs text-carbon/60">Importe (€)<input name="importe" defaultValue={l.importe ?? ""} inputMode="decimal" className={`${inp} mt-1 w-full`} /></label>
            <label className="text-xs text-carbon/60">Emisor
              <select name="emisor" defaultValue={l.emisor} className={`${inp} mt-1 w-full`}>
                {Object.entries(EMISOR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="flex items-end gap-1.5 text-xs text-carbon/60"><input type="checkbox" name="verificado" defaultChecked={l.verificado} /> Verificada</label>
            <label className="text-xs text-carbon/60 sm:col-span-3">Notas<input name="notas" defaultValue={l.notas ?? ""} className={`${inp} mt-1 w-full`} /></label>
            <div className="col-span-full"><button className={btn}>Guardar línea</button></div>
          </form>
        </details>
      </div>
    </div>
  );
}

export default async function FacturacionComunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, hojas, resumen, facturables] = await Promise.all([
    comunidadPorId(id),
    facturacionComunidad(id),
    resumenFacturacionComunidad(id),
    hitosFacturablesDeComunidad(id),
  ]);
  if (!ficha) notFound();

  // Ambito Accesalia: fuera lo de Ecobalance.
  const accesalia = new Set<string>(EMISORES_ACCESALIA);
  const hojasVis = hojas
    .map((h) => ({ ...h, lineas: h.lineas.filter((l) => accesalia.has(l.emisor)) }))
    .filter((h) => h.lineas.length > 0);

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/facturacion" className="text-sm text-carbon/50 hover:text-carbon">← Facturación</Link>
          <SelectorComunidad compacto hrefBase="/comunidades/" hrefSuffix="/facturacion" />
        </div>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">€</span> Facturación</h1>
        <p className="mt-1 text-sm text-carbon/55">
          {ficha.comunidad.nombre} · <Link href={`/expediente/${id}`} className="text-lima-dark hover:underline">expediente completo</Link>
          <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-carbon/50">ámbito Accesalia</span>
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Chip etiqueta="Contratado" valor={eur(resumen.totalContratado)} />
          <Chip etiqueta="Cobrado" valor={eur(resumen.cobrado)} acento="text-lima-dark" />
          <Chip etiqueta="Facturado" valor={eur(resumen.facturado)} acento="text-sky-600" />
          <Chip etiqueta="Pendiente" valor={eur(resumen.pendiente)} acento="text-amber-600" />
          <Chip etiqueta="Devuelto" valor={eur(resumen.devuelto)} acento={resumen.devuelto ? "text-red-600" : "text-carbon"} />
        </div>
        {resumen.hayEstimado && <p className="mt-2 text-xs text-amber-600">⚠ Hay importes estimados de Monday sin verificar. Márcalos como “verificada” al confirmarlos.</p>}

        <div className="mt-6 space-y-5">
          {hojasVis.length === 0 && <div className="rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center text-sm text-carbon/40">Sin facturación de Accesalia en esta comunidad.</div>}
          {hojasVis.map((h) => (
            <section key={h.hojaId} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-lima-dark">€</span>
                  <Link href={`/comunidades/${id}/hojas/${h.hojaId}`} className="text-base font-semibold text-carbon hover:text-lima-dark">{h.descripcion ?? "Hoja de encargo"}</Link>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {h.lineas.map((l) => <LineaCard key={l.id} comunidadId={id} l={l} facturables={facturables} />)}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-carbon/35">Factusol emite la factura; aquí se registra su nº + PDF y se lleva el cobro. Los avisos por hito facturable llegan en la próxima capa.</p>
      </main>
    </div>
  );
}
