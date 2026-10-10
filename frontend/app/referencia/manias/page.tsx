import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { manias, type Mania } from "../../../lib/manias";
import { bonito } from "../../../lib/direccionNombre";
import { Filtros } from "./Filtros";

export const dynamic = "force-dynamic";

// MANIAS DETECTADAS (Monica, 10-oct-2026). La tabla manias_organismos: lo que
// cada ayuntamiento, junta, ECU o tecnico pide o hace a su manera, sacado de
// las notas de las fichas. Filtros por municipio, entidad y persona.
//
// LA FECHA MANDA: "una mania de un ayuntamiento de hace 5 años puede no ser tan
// relevante como una del mes pasado, y puede incluso contradecirla". Por eso
// van de la mas reciente a la mas antigua y cada una dice cuanto hace.
// La cita literal de la nota va a la vista, debajo de la mania: es la prueba.

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });

function cuantoHace(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso + "T12:00:00").getTime()) / 864e5);
  if (dias < 31) return "este mes";
  const meses = Math.floor(dias / 30.44);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
  const años = Math.floor(meses / 12);
  return `hace ${años} ${años === 1 ? "año" : "años"}`;
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function contar(lista: Mania[], campo: (m: Mania) => string | null) {
  const n = new Map<string, number>();
  for (const m of lista) {
    const v = campo(m);
    if (v) n.set(v, (n.get(v) ?? 0) + 1);
  }
  return Array.from(n, ([valor, k]) => ({ valor, n: k })).sort((a, b) => a.valor.localeCompare(b.valor, "es"));
}

export default async function Manias({
  searchParams,
}: {
  searchParams: Promise<{ municipio?: string; entidad?: string; persona?: string }>;
}) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/manias");
  const filtro = await searchParams;
  const todas = await manias();
  const muni = (m: Mania) => (m.municipio ? bonito(m.municipio) : null);

  const lista = todas.filter(
    (m) =>
      (!filtro.municipio || muni(m) === filtro.municipio) &&
      (!filtro.entidad || m.entidad === filtro.entidad) &&
      (!filtro.persona || m.tecnico === filtro.persona),
  );

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-4 py-6 sm:px-6">
        <Link href="/referencia" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Documentación de referencia
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Manías detectadas</h1>
        <p className="mt-1 max-w-[70ch] text-carbon/55">
          Lo que cada ayuntamiento, junta, ECU o técnico pide o hace a su manera, sacado de las notas de las fichas.
          Las más recientes, arriba: una manía antigua puede haber cambiado.
        </p>

        <div className={CAJA + " mt-5 p-4"}>
          <Filtros
            actual={filtro}
            municipios={contar(todas, muni)}
            entidades={contar(todas, (m) => m.entidad)}
            personas={contar(todas, (m) => m.tecnico)}
          />
          <div className="mt-3 flex items-center justify-between text-[12.5px] text-carbon/55">
            <span>
              {lista.length === todas.length ? `${todas.length} manías` : `${lista.length} de ${todas.length} manías`}
            </span>
            {(filtro.municipio || filtro.entidad || filtro.persona) && (
              <Link href="/referencia/manias" scroll={false} className="font-semibold text-[#2B6CB0] hover:underline">
                Quitar los filtros
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {lista.length === 0 ? (
            <p className={CAJA + " p-5 text-[13px] text-carbon/55"}>Ninguna manía con esos filtros.</p>
          ) : (
            lista.map((m) => (
              <article key={m.id} className={CAJA + " px-5 py-4"}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="text-[13px] text-carbon/70">
                    <b className="text-carbon">{m.entidad ?? "Sin entidad"}</b>
                    {m.detalle && <span> · {m.detalle}</span>}
                    {m.tecnico && <span> · {m.tecnico}</span>}
                    {/* El municipio, si la entidad no lo dice ya ("Ayuntamiento de Alcorcón"). */}
                    {muni(m) && !sinTildes(m.entidad ?? "").includes(sinTildes(muni(m)!)) && <span className="text-carbon/45"> · {muni(m)}</span>}
                  </div>
                  <div className="shrink-0 text-[12.5px] tabular-nums text-carbon/60">
                    {m.fecha ? (
                      <>
                        <b className="text-carbon/80">{FECHA.format(new Date(m.fecha + "T12:00:00"))}</b> · {cuantoHace(m.fecha)}
                      </>
                    ) : (
                      "sin fecha"
                    )}
                  </div>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-snug text-carbon">{m.mania}</p>
                {m.cita && (
                  <blockquote className="mt-2 whitespace-pre-line border-l-2 border-black/10 pl-3 text-[12.5px] leading-relaxed text-carbon/55">
                    {m.cita}
                  </blockquote>
                )}
                {m.oportunidad && (
                  <div className="mt-2 text-[12px] text-carbon/50">
                    De la ficha de{" "}
                    <Link href={`/comercial/oportunidades/${m.oportunidad.id}`} className="font-semibold text-[#2B6CB0] hover:underline">
                      {m.oportunidad.nombre ?? m.oportunidad.codigo}
                    </Link>
                    {m.oportunidad.codigo && m.oportunidad.nombre ? ` (${m.oportunidad.codigo})` : ""}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
