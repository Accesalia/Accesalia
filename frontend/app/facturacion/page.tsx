import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { contarComunidades } from "../../lib/comunidades";
import { SelectorComunidad } from "../expediente/SelectorComunidad";
import { facturacionPanel, avisosFacturables, type FacturaComunidadFila, type AvisoFacturable } from "../../lib/facturacion";
import { HITO_LABEL } from "../../lib/hojas";

export const dynamic = "force-dynamic";

function eur(n: number): string {
  return `${Math.round(n).toLocaleString("es-ES")} €`;
}

function Tarjeta({ etiqueta, valor, sub, acento, href }: { etiqueta: string; valor: string; sub?: string; acento?: string; href?: string }) {
  const cuerpo = (
    <div className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm transition hover:border-lima">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-carbon/40">{etiqueta}</div>
      <div className={`mt-1 text-2xl font-bold ${acento ?? "text-carbon"}`}>{valor}</div>
      {sub && <div className="mt-0.5 text-xs text-carbon/45">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} scroll={false} className="block">{cuerpo}</Link> : cuerpo;
}

export default async function EntradaFacturacion({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const hoy = new Date().toISOString().slice(0, 10);
  const [total, { filas, resumen }, av] = await Promise.all([contarComunidades(), facturacionPanel(hoy), avisosFacturables()]);

  const sel = f ?? null;
  let lista: FacturaComunidadFila[] = [];
  let titulo = "";
  if (sel === "facturar") {
    lista = filas.filter((x) => x.pendiente > 0).sort((a, b) => b.pendiente - a.pendiente);
    titulo = "Con hitos pendientes de facturar";
  } else if (sel === "cobrar") {
    lista = filas.filter((x) => x.facturado > 0).sort((a, b) => Number(b.vencido) - Number(a.vencido) || b.facturado - a.facturado);
    titulo = "Facturado pendiente de cobro";
  } else if (sel === "devuelto") {
    lista = filas.filter((x) => x.devuelto > 0).sort((a, b) => b.devuelto - a.devuelto);
    titulo = "Con cobros devueltos";
  }
  const nVencido = filas.filter((x) => x.vencido).length;

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="text-center">
          <span className="text-4xl text-lima-dark">€</span>
          <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">Facturación</h1>
          <p className="mx-auto mt-2 max-w-lg text-carbon/55">
            Libro de Accesalia: qué está contratado, facturado, cobrado y pendiente. Factusol emite la factura; aquí se
            registra y se vigila el cobro.
          </p>
          <span className="mt-2 inline-block rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-semibold text-carbon/50">ámbito Accesalia · Ecobalance va aparte</span>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <SelectorComunidad autoFocus hrefBase="/comunidades/" hrefSuffix="/facturacion" />
          <p className="mt-2 text-center text-xs text-carbon/40">{total.toLocaleString("es-ES")} comunidades · escribe 2+ letras</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tarjeta etiqueta="Contratado" valor={eur(resumen.contratado)} sub={`${resumen.comunidades} comunidades`} />
          <Tarjeta etiqueta="Cobrado" valor={eur(resumen.cobrado)} acento="text-lima-dark" />
          <Tarjeta etiqueta="Pendiente de facturar" valor={eur(resumen.pendiente)} acento={resumen.pendiente ? "text-amber-600" : "text-carbon"} href={sel === "facturar" ? "/facturacion" : "/facturacion?f=facturar"} />
          <Tarjeta etiqueta="Facturado sin cobrar" valor={eur(resumen.facturado)} sub={nVencido ? `${nVencido} con vencido` : undefined} acento={resumen.facturado ? "text-sky-600" : "text-carbon"} href={sel === "cobrar" ? "/facturacion" : "/facturacion?f=cobrar"} />
        </div>

        {/* El punto caliente: hitos cuyo disparador ya se cumplió */}
        {av.avisos.length > 0 && (
          <Link href={sel === "ahora" ? "/facturacion" : "/facturacion?f=ahora"} scroll={false}
            className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-lima bg-lima-soft px-5 py-3 text-sm">
            <span className="font-semibold text-lima-dark">✦ Facturables ahora</span>
            <span className="text-carbon/70"><b>{av.avisos.length}</b> hito(s) · {eur(av.importeTotal)}</span>
            <span className="text-carbon/50">{Object.entries(av.porDisparador).map(([d, n]) => `${n} ${HITO_LABEL[d] ?? d}`).join(" · ")}</span>
            <span className="text-lima-dark underline">ver</span>
          </Link>
        )}

        {sel === "ahora" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <div className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-carbon">Facturables ahora · {av.avisos.length} hito(s) · {eur(av.importeTotal)}</div>
            <div className="max-h-[560px] overflow-y-auto divide-y divide-black/5">
              {av.avisos.map((a: AvisoFacturable) => (
                <div key={a.hitoId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm hover:bg-lima-soft/40">
                  <div>
                    <Link href={`/comunidades/${a.comunidadId}/facturacion`} className="font-medium text-carbon hover:text-lima-dark">{a.comunidadNombre}</Link>
                    <span className="ml-2 text-xs text-carbon/40">{a.municipio}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-lima-soft px-2 py-0.5 text-[11px] font-semibold text-lima-dark">{HITO_LABEL[a.disparador] ?? a.disparador}</span>
                    <span className="font-semibold text-carbon">{a.importe != null ? eur(a.importe) : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {resumen.devuelto > 0 && (
            <Link href={sel === "devuelto" ? "/facturacion" : "/facturacion?f=devuelto"} scroll={false} className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600">
              Devuelto {eur(resumen.devuelto)}
            </Link>
          )}
          {resumen.hayEstimado && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">Incluye importes estimados de Monday</span>}
        </div>

        {sel && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <div className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-carbon">{titulo} · {lista.length} comunidad(es)</div>
            {lista.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-carbon/40">Ninguna aquí.</p>
            ) : (
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-black/[0.02] text-left text-[11px] uppercase tracking-wide text-carbon/40">
                    <tr>
                      <th className="px-5 py-2 font-semibold">Comunidad</th>
                      <th className="px-3 py-2 font-semibold">Pendiente</th>
                      <th className="px-3 py-2 font-semibold">Facturado</th>
                      <th className="px-3 py-2 font-semibold">Cobrado</th>
                      {sel === "devuelto" && <th className="px-3 py-2 font-semibold">Devuelto</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {lista.map((x) => (
                      <tr key={x.comunidadId} className="transition hover:bg-lima-soft/40">
                        <td className="px-5 py-2.5">
                          <Link href={`/comunidades/${x.comunidadId}/facturacion`} className="font-medium text-carbon hover:text-lima-dark">{x.comunidadNombre}</Link>
                          <div className="text-xs text-carbon/40">{x.municipio}{x.vencido && <span className="ml-2 font-semibold text-red-500">· vencido</span>}</div>
                        </td>
                        <td className="px-3 py-2.5 text-amber-600">{x.pendiente ? eur(x.pendiente) : <span className="text-carbon/30">—</span>}</td>
                        <td className="px-3 py-2.5 text-sky-600">{x.facturado ? eur(x.facturado) : <span className="text-carbon/30">—</span>}</td>
                        <td className="px-3 py-2.5 text-lima-dark">{x.cobrado ? eur(x.cobrado) : <span className="text-carbon/30">—</span>}</td>
                        {sel === "devuelto" && <td className="px-3 py-2.5 text-red-600">{eur(x.devuelto)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
