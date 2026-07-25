import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../../components/BarraSuperior";
import { hojaPorId, estadoHoja, NATURALEZA, ORDEN_ESTADOS, facturacionDeHoja, estadoHito, HITO_LABEL } from "../../../../../lib/hojas";
import { cambiarEstadoHoja } from "../acciones";

export const dynamic = "force-dynamic";

function fecha(iso: string | null): string {
  if (!iso || iso.startsWith("2000-01-01")) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function eur(n: number | null): string {
  return n == null ? "—" : `${n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
/** Convierte un link de Drive/Docs (/view, /edit) en su URL embebible (/preview). */
function previewUrl(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/d\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return url.includes("docs.google.com/document")
    ? `https://docs.google.com/document/d/${m[1]}/preview`
    : `https://drive.google.com/file/d/${m[1]}/preview`;
}
const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador", pendiente_firma_daniel: "Pendiente firma Daniel", firmada_daniel: "Firmada por Daniel",
  enviada_comunidad: "Enviada a comunidad", cambios_solicitados: "Cambios solicitados", devuelta_firmada: "Devuelta firmada",
  rechazada: "Rechazada", archivada: "Archivada", anulada: "Anulada",
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/5 py-1.5 last:border-0">
      <span className="text-xs text-carbon/45">{etiqueta}</span>
      <span className="text-right text-sm text-carbon">{valor || <span className="text-carbon/25">—</span>}</span>
    </div>
  );
}
function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function DetalleHoja({ params }: { params: Promise<{ id: string; hojaId: string }> }) {
  const { id, hojaId } = await params;
  const h = await hojaPorId(hojaId);
  if (!h || h.comunidad_id !== id) notFound();
  const facturacion = await facturacionDeHoja(hojaId);

  const est = estadoHoja(h.estado);
  const v = h.versiones_hoja[0]; // versión más reciente
  // Todos los PDFs firmados del encargo (un edificio firma varios documentos a la vez).
  const pdfs = Array.from(
    new Set(h.versiones_hoja.flatMap((x) => x.pdfs_firmados ?? (x.url_pdf_hoja ? [x.url_pdf_hoja] : []))),
  );
  const pdf = pdfs[0] ?? null;
  const importesTexto = h.versiones_hoja.find((x) => x.importes_forma_pago_texto)?.importes_forma_pago_texto ?? null;
  const cambiar = cambiarEstadoHoja.bind(null, id, hojaId);

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[980px] px-6 py-8">
        <Link href={`/comunidades/${id}/hojas`} className="text-sm text-carbon/50 hover:text-carbon">
          ← Hojas de {h.comunidades?.nombre ?? "la comunidad"}
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-carbon">{h.descripcion || "Hoja de encargo"}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${est.clase}`}>{est.label}</span>
              {h.numero_hoja && <span className="text-sm text-carbon/40">{h.numero_hoja}</span>}
            </div>
            <p className="mt-1 text-sm text-carbon/55">{h.comunidades?.nombre}</p>
          </div>
          {pdf ? (
            <a
              href={pdf}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-carbon px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-carbon/90"
            >
              📄 Abrir PDF firmado
            </a>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-black/5 px-4 py-2.5 text-sm text-carbon/40">
              Sin PDF firmado
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Cambiar estado — resuelve el grupo C */}
            <Tarjeta titulo="Estado">
              <form action={cambiar} className="flex flex-wrap items-end gap-3">
                <label className="flex-1">
                  <span className="text-xs text-carbon/45">Cambiar estado</span>
                  <select
                    name="estado"
                    defaultValue={h.estado}
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon outline-none focus:border-lima"
                  >
                    {ORDEN_ESTADOS.map((e) => (
                      <option key={e} value={e}>{ESTADO_LABEL[e] ?? e}</option>
                    ))}
                  </select>
                </label>
                <button className="rounded-full bg-lima px-5 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
                  Guardar
                </button>
              </form>
            </Tarjeta>

            <Tarjeta titulo={`Conceptos (${h.conceptos_hoja.length})`}>
              {h.conceptos_hoja.length === 0 ? (
                <p className="text-sm text-carbon/40">Sin conceptos registrados.</p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {h.conceptos_hoja.map((c, i) => {
                    const nat = c.bloques?.naturaleza ? NATURALEZA[c.bloques.naturaleza] : null;
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 text-sm text-carbon">
                          {c.bloques?.nombre ?? c.bloques?.codigo ?? "—"}
                          {nat && (
                            <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${nat.clase}`}>
                              {nat.label}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm text-carbon/60">{eur(c.importe)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>

            {facturacion.length > 0 && (
              <Tarjeta titulo={`Facturación (${facturacion.length} línea${facturacion.length > 1 ? "s" : ""})`}>
                {facturacion.every((l) => l.verificado) ? (
                  <span className="mb-3 inline-block rounded-full bg-lima-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase text-lima-dark">
                    ✓ Verificado con PDF
                  </span>
                ) : (
                  <span className="mb-3 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                    Estimado (Monday) · sin verificar
                  </span>
                )}
                <ul className="space-y-3">
                  {facturacion.map((l) => (
                    <li key={l.id} className="rounded-xl border border-black/5 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-carbon">{l.descripcion}</span>
                        <span className="shrink-0 text-sm font-semibold text-carbon">
                          {l.es_porcentaje ? `${l.porcentaje}%` : eur(l.importe)}
                        </span>
                      </div>
                      {l.base_porcentaje && <p className="text-xs text-carbon/45">sobre {l.base_porcentaje}</p>}
                      {l.notas && <p className="mt-0.5 text-xs text-carbon/50">{l.notas}</p>}
                      <ul className="mt-2 space-y-1 border-t border-black/5 pt-2">
                        {l.hitos_cobro.map((ht) => {
                          const e = estadoHito(ht.estado);
                          return (
                            <li key={ht.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-carbon/60">
                                {HITO_LABEL[ht.hito] ?? ht.hito}
                                {ht.porcentaje ? ` · ${ht.porcentaje}%` : ""}
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="text-carbon/70">{ht.importe != null ? eur(ht.importe) : "—"}</span>
                                <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${e.clase}`}>{e.label}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )}

            {h.versiones_hoja.length > 1 && (
              <Tarjeta titulo={`Versiones (${h.versiones_hoja.length})`}>
                <ul className="divide-y divide-black/5">
                  {h.versiones_hoja.map((ver) => (
                    <li key={ver.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-carbon">v{ver.numero_version} · {fecha(ver.fecha_generada)}</span>
                      <span className="text-carbon/60">{eur(ver.importe_total)}</span>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )}
          </div>

          <div className="space-y-5">
            <Tarjeta titulo="Datos">
              <dl>
                <Dato etiqueta="Comercial interno" valor={h.comercial_interno} />
                <Dato etiqueta="Quién lo trae" valor={h.quien_lo_trae} />
                <Dato etiqueta="Paga" valor={h.pagador_tipo === "contrata" ? "La contrata" : "La comunidad"} />
                <Dato etiqueta="Emisor" valor={h.emisor === "daniel_autonomo" ? "Daniel (autónomo)" : "Accesalia"} />
                <Dato etiqueta="Fecha creación" valor={fecha(h.fecha_creacion)} />
              </dl>
            </Tarjeta>

            <Tarjeta titulo="Importes">
              <dl>
                <Dato etiqueta="Base" valor={eur(v?.importe_base ?? null)} />
                <Dato etiqueta="IVA %" valor={v?.iva_porcentaje ?? "—"} />
                <Dato etiqueta="Total" valor={eur(v?.importe_total ?? null)} />
                <Dato etiqueta="Forma de pago" valor={v?.forma_pago} />
              </dl>
              {importesTexto && (
                <div className="mt-3 rounded-lg bg-black/[0.03] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-carbon/40">Importes (Monday, sin desglosar)</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-carbon/70">{importesTexto}</p>
                </div>
              )}
            </Tarjeta>
          </div>
        </div>

        {/* Colección de PDFs firmados — un edificio puede firmar varios documentos */}
        {pdfs.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">
              PDF{pdfs.length > 1 ? "s" : ""} firmado{pdfs.length > 1 ? "s" : ""} ({pdfs.length})
            </h2>
            <div className="mt-3 space-y-5">
              {pdfs.map((url, i) => {
                const prev = previewUrl(url);
                return (
                  <div key={url} className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
                      <span className="text-sm font-medium text-carbon/70">Documento {i + 1}</span>
                      <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-lima-dark hover:underline">
                        Abrir en Drive ↗
                      </a>
                    </div>
                    {prev ? (
                      <iframe src={prev} className="h-[620px] w-full bg-black/[0.02]" title={`PDF firmado ${i + 1}`} loading="lazy" />
                    ) : (
                      <p className="px-5 py-6 text-sm text-carbon/40">No se pudo generar la vista previa. Ábrelo en Drive.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
