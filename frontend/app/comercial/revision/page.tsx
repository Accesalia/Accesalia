import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { puedeRevisar } from "../../../lib/revisionOferta";
import { RevisarHoja } from "./RevisarHoja";
import { hojaParaRevisar, pendientesOkDaniel } from "../../../lib/hojaEmitir";

export const dynamic = "force-dynamic";

// REVISION DE OFERTAS (Monica, 14-oct-2026): antes de mandarla a la comunidad, la revisa quien tiene la funcion
// revision_ofertas (hoy Daniel y Monica). Es un paso critico: la oferta se envia en caliente.
//
// POR HOJA (25-oct-2026): al generar una hoja, va sola al ok con su presupuesto y la viabilidad que fue con ella. Sin
// `v`, la bandeja: lo que espera, lo mas antiguo arriba. Con `v`, una hoja: sus lineas en arbol con su «Modifícalo», su
// paquete, el ok o los cambios, y el visor.

const CUANDO = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });

export default async function PaginaRevision({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/revision");
  if (!puedeRevisar(yo)) redirect("/menu");
  const { v } = await searchParams;

  if (v) {
    const h = await hojaParaRevisar(v);
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <main className="mx-auto w-full max-w-[1300px] px-4 pb-20 pt-5 sm:px-6">
          <Salida href="/comercial/revision">← Ofertas esperando el ok</Salida>
          {h ? <RevisarHoja h={h} /> : <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">Esa hoja no existe.</p>}
        </main>
      </div>
    );
  }

  const nuevas = await pendientesOkDaniel();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-5 sm:px-6">
        <Salida href="/menu">← Áreas de Accesalia</Salida>
        <h1 className="mt-3 border-b border-black/10 pb-4 text-3xl font-bold text-carbon sm:text-4xl">Ofertas esperando el ok</h1>

        {nuevas.length === 0 ? (
          <p className="mt-8 text-center text-[15px] text-carbon/65">No hay ninguna oferta esperando.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {nuevas.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/comercial/revision?v=${h.id}`}
                  className="block rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-lima hover:shadow-md"
                >
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-lg font-bold text-carbon">{h.opp}</span>
                    <span className="text-[13px] text-carbon/70">
                      {h.codigo ? `${h.codigo} v${h.numero}` : "Hoja nueva"} · {h.generadaPor ?? h.comercial ?? "—"}
                      {h.desde && ` · ${CUANDO.format(new Date(h.desde))}`}
                    </span>
                    <span className="ml-auto text-sm font-bold text-lima-dark">Revisar →</span>
                  </div>
                  <p className="mt-1 text-[13px] text-carbon/75">
                    {EUR.format(h.importe)} € + IVA{h.aQuien && ` · para ${h.aQuien}`}{h.comercial && ` · comercial ${h.comercial}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
