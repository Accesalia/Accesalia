import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Volver } from "../../../components/Volver";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerLibro } from "../../../../lib/cobros";
import { leerProforma, libroDeEmpresa, paraEnviarProforma, referenciaFactusol } from "../../../../lib/proformas";
import { AccionesProforma, Copiar } from "./AccionesProforma";

export const dynamic = "force-dynamic";

// UNA PROFORMA (Monica, 12-oct-2026): a la izquierda lo que hay que pasar a
// Factusol (la Referencia con el codigo DELANTE, para que la factura se enlace
// sola al volcarla, y el texto de cada linea), enviarla por correo y anularla;
// a la derecha, el PDF.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default async function PaginaProforma({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/facturacion/proforma/${id}`);
  const p = await leerProforma(id);
  if (p && !puedeVerLibro(yo, libroDeEmpresa(p.empresa))) redirect("/menu");
  const envio = p ? await paraEnviarProforma(p) : null;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Volver siNoHay={p?.oppId ? `/facturacion/${p.oppId}` : "/facturacion/proformas"} />
        {!p || !envio ? (
          <p className="mt-6 text-carbon/70">Esa proforma no existe.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-black/10 pb-4">
              <h1 className="text-3xl font-bold text-carbon">Proforma {p.codigo}</h1>
              <span className="text-[13px] text-carbon/70">
                {p.emisora.nombre} · {p.fecha.split("-").reverse().join("/")} · {EUR.format(p.total)} €{p.emitidaPor ? ` · la emitió ${p.emitidaPor}` : ""}
              </span>
              {p.oppId && (
                <Link href={`/facturacion/${p.oppId}`} className="text-[13px] font-semibold text-[#2f5f8a] hover:underline">
                  {p.opp?.nombre || "la oportunidad"}
                </Link>
              )}
            </div>

            <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_620px]">
              <div className="space-y-4">
                {p.estado === "anulada" ? (
                  <p className="rounded-xl border border-black/10 bg-black/5 px-4 py-3 text-carbon/75">
                    <b>Anulada.</b> {p.motivoAnulacion}
                  </p>
                ) : p.factura ? (
                  <p className="rounded-xl border border-lima bg-lima-soft px-4 py-3 text-carbon">
                    <b>Facturada:</b> factura {p.factura.numero} ({p.factura.estado}), enlazada al volcar Factusol.
                  </p>
                ) : (
                  <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
                    Sin factura todavía. Al hacerla en Factusol, pon <b>{p.codigo}</b> delante en la Referencia: al volcarla, se enlaza sola con esta proforma y sus hitos.
                  </p>
                )}

                <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                  <h2 className="text-[12px] font-bold uppercase tracking-wide text-carbon/70">Para Factusol</h2>
                  <div className="mt-2 flex items-start gap-2">
                    <div className="flex-1">
                      <div className="text-[11.5px] text-carbon/60">Referencia (añade detrás la parte: «1 de 3», «2ª mitad»…)</div>
                      <div className="font-mono text-[13px]">{referenciaFactusol(p)}</div>
                    </div>
                    <Copiar texto={referenciaFactusol(p)} />
                  </div>
                  {p.lineas.map((l, i) => (
                    <div key={i} className="mt-3 flex items-start gap-2 border-t border-black/5 pt-3">
                      <div className="flex-1">
                        <div className="text-[11.5px] text-carbon/60">
                          Línea {i + 1} · {EUR.format(l.base)} € · {l.hitos.map((h) => `${h.tipo} ${EUR.format(h.importe)} €`).join(" + ")}
                        </div>
                        <div className="whitespace-pre-wrap text-[13px]">{l.concepto}</div>
                      </div>
                      <Copiar texto={l.concepto} />
                    </div>
                  ))}
                  <div className="mt-3 border-t border-black/5 pt-3 text-[12.5px] text-carbon/75">
                    A: <b>{p.pagador.nombre}</b>
                    {p.pagador.nif ? ` · ${p.pagador.nif}` : ""}
                    {p.pagador.domicilio ? ` · ${p.pagador.domicilio}` : ""} · IVA {EUR.format(p.ivaPct)} %{p.irpfPct ? ` · IRPF ${EUR.format(p.irpfPct)} %` : ""}
                  </div>
                  {p.notas && <div className="mt-2 text-[12.5px] italic text-carbon/65">Nota: {p.notas}</div>}
                </section>

                {p.envios.length > 0 && (
                  <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                    <h2 className="text-[12px] font-bold uppercase tracking-wide text-carbon/70">Enviada</h2>
                    <ul className="mt-1 text-[12.5px]">
                      {p.envios.map((e, i) => (
                        <li key={i} className={e.ok ? "" : "text-alerta"}>
                          {FECHA.format(new Date(e.creado_en))} · a {e.para.join(", ")}
                          {e.ok ? "" : ` · NO SALIÓ: ${e.error}`}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {p.estado === "emitida" && <AccionesProforma id={p.id} envio={envio} facturada={!!p.factura} />}
              </div>

              <div className="sticky top-4 rounded-2xl border border-black/10 bg-white p-2 shadow-sm">
                <div className="flex justify-end gap-3 px-2 pb-2 text-[12px] font-semibold">
                  <a href={`/facturacion/proforma/${p.id}/pdf?descargar=1`} className="text-[#2f5f8a] hover:underline">
                    descargar
                  </a>
                  <a href={`/facturacion/proforma/${p.id}/pdf`} target="_blank" rel="noreferrer" className="text-[#2f5f8a] hover:underline">
                    abrir aparte
                  </a>
                </div>
                <iframe src={`/facturacion/proforma/${p.id}/pdf`} title={`Proforma ${p.codigo}`} className="h-[78vh] w-full rounded-lg border border-black/10" />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
