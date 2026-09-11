import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { contarComunidades } from "../../lib/comunidades";
import { SelectorComunidad } from "../expediente/SelectorComunidad";
import { obrasPanel, resumenObra, ESTADO_OBRA, type ObraFila } from "../../lib/obra";
import { cadenciaVisitas, type VisitaObraCadencia } from "../../lib/visita";

export const dynamic = "force-dynamic";

function fechaCorta(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const ESTADOS = ["pendiente_inicio", "en_curso", "paralizada", "finalizada", "no_procede"] as const;

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

// Una obra tiene la visita "muy espaciada" si supera su cadencia (o 30 días por defecto).
function espaciada(c: VisitaObraCadencia): boolean {
  if (c.diasDesdeUltima == null) return false;
  return c.diasDesdeUltima > (c.cadenciaDias ?? 30);
}

export default async function EntradaObra({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const [total, filas, cadencia] = await Promise.all([contarComunidades(), obrasPanel(), cadenciaVisitas()]);
  const r = resumenObra(filas);

  const actasSinEnviar = cadencia.reduce((s, c) => s + c.actasSinEnviar, 0);
  const espaciadas = cadencia.filter(espaciada);

  const sel = f ?? null;
  let lista: ObraFila[] = [];
  let titulo = "";
  if (sel === "cfo_pendiente") {
    lista = filas.filter((x) => x.estado === "finalizada" && x.cfoEstado !== "visado" && x.cfoEstado !== "no_procede");
    titulo = "Fin de obra sin CFO visado";
  } else if (sel && (ESTADOS as readonly string[]).includes(sel)) {
    lista = filas.filter((x) => x.estado === sel);
    titulo = ESTADO_OBRA[sel]?.label ?? sel;
  }

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="text-center">
          <span className="text-4xl text-lima-dark">⬒</span>
          <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">Obra</h1>
          <p className="mx-auto mt-2 max-w-lg text-carbon/55">
            Inicio → seguimiento → fin de obra. Vigila las que no arrancan y los fines de obra sin CFO cerrado.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <SelectorComunidad autoFocus hrefBase="/comunidades/" hrefSuffix="/obra" />
          <p className="mt-2 text-center text-xs text-carbon/40">{total.toLocaleString("es-ES")} comunidades · escribe 2+ letras</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tarjeta etiqueta="Obras" valor={r.total.toLocaleString("es-ES")} sub={`${r.porEstado["finalizada"] ?? 0} con fin de obra`} />
          <Tarjeta etiqueta="Pte de inicio" valor={r.pendienteInicio.toLocaleString("es-ES")} sub="falta CSS/PSS/acta/apertura" acento={r.pendienteInicio ? "text-amber-600" : "text-carbon"} href={sel === "pendiente_inicio" ? "/obra" : "/obra?f=pendiente_inicio"} />
          <Tarjeta etiqueta="En curso" valor={r.enCurso.toLocaleString("es-ES")} sub="en seguimiento" acento="text-sky-600" href={sel === "en_curso" ? "/obra" : "/obra?f=en_curso"} />
          <Tarjeta etiqueta="CFO pendiente" valor={r.cfoPendiente.toLocaleString("es-ES")} sub="fin de obra sin CFO visado" acento={r.cfoPendiente ? "text-red-600" : "text-carbon"} href={sel === "cfo_pendiente" ? "/obra" : "/obra?f=cfo_pendiente"} />
        </div>

        {/* Seguimiento: el punto crítico (actas al día) */}
        {(actasSinEnviar > 0 || espaciadas.length > 0) && (
          <Link href={sel === "seguimiento" ? "/obra" : "/obra?f=seguimiento"} scroll={false} className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm">
            <span className="font-semibold text-amber-700">⚠ Seguimiento</span>
            {actasSinEnviar > 0 && <span className="text-amber-700"><b>{actasSinEnviar}</b> acta(s) sin enviar</span>}
            {espaciadas.length > 0 && <span className="text-amber-700"><b>{espaciadas.length}</b> obra(s) con visita muy espaciada</span>}
            <span className="text-amber-600/70 underline">ver seguimiento</span>
          </Link>
        )}

        {sel === "seguimiento" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <div className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-carbon">Seguimiento de obra · {cadencia.length} obra(s) activa(s)</div>
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-black/[0.02] text-left text-[11px] uppercase tracking-wide text-carbon/40">
                  <tr>
                    <th className="px-5 py-2 font-semibold">Comunidad</th>
                    <th className="px-3 py-2 font-semibold">Última visita</th>
                    <th className="px-3 py-2 font-semibold">Hace</th>
                    <th className="px-3 py-2 font-semibold">Actas sin enviar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {cadencia.map((c) => (
                    <tr key={c.obraId} className={`transition hover:bg-lima-soft/40 ${espaciada(c) || c.actasSinEnviar > 0 ? "" : "opacity-60"}`}>
                      <td className="px-5 py-2.5">
                        <Link href={`/comunidades/${c.comunidadId}/obra`} className="font-medium text-carbon hover:text-lima-dark">{c.comunidadNombre}</Link>
                        <div className="text-xs text-carbon/40">{c.municipio}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-carbon/70">{c.ultimaVisita ? fechaCorta(c.ultimaVisita) : <span className="text-red-500">sin visitas</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{c.diasDesdeUltima != null ? <span className={espaciada(c) ? "font-semibold text-amber-600" : "text-carbon/60"}>{c.diasDesdeUltima}d</span> : "—"}</td>
                      <td className="px-3 py-2.5">{c.actasSinEnviar > 0 ? <span className="font-semibold text-amber-600">{c.actasSinEnviar}</span> : <span className="text-carbon/30">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-10">
          <p className="text-center text-xs uppercase tracking-wide text-carbon/35">¿Por dónde va cada obra?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ESTADOS.map((e) => {
              const n = r.porEstado[e] ?? 0;
              const activo = sel === e;
              return (
                <Link key={e} href={activo ? "/obra" : `/obra?f=${e}`} scroll={false}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/70 hover:border-lima"} ${e === "paralizada" && !activo ? "ring-1 ring-red-200" : ""}`}>
                  {ESTADO_OBRA[e].label}
                  <span className={`rounded-full px-1.5 text-xs ${activo ? "bg-carbon/10" : "bg-black/5 text-carbon/50"}`}>{n}</span>
                </Link>
              );
            })}
          </div>

          {sel && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-carbon">{titulo} · {lista.length} obra(s)</div>
              {lista.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-carbon/40">Ninguna aquí.</p>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-black/[0.02] text-left text-[11px] uppercase tracking-wide text-carbon/40">
                      <tr>
                        <th className="px-5 py-2 font-semibold">Comunidad</th>
                        <th className="px-3 py-2 font-semibold">Constructora</th>
                        <th className="px-3 py-2 font-semibold">Inicio</th>
                        <th className="px-3 py-2 font-semibold">Fin</th>
                        <th className="px-3 py-2 font-semibold">{sel === "pendiente_inicio" ? "Falta" : "Coordinador"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {lista.map((x) => (
                        <tr key={x.obraId} className="transition hover:bg-lima-soft/40">
                          <td className="px-5 py-2.5">
                            <Link href={`/comunidades/${x.comunidadId}/obra`} className="font-medium text-carbon hover:text-lima-dark">{x.comunidadNombre}</Link>
                            <div className="text-xs text-carbon/40">{[x.municipio, ...x.tipos].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-carbon/60">{x.constructora ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-carbon/70">{fechaCorta(x.fechaInicio)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-carbon/70">{fechaCorta(x.fechaFin)}</td>
                          <td className="px-3 py-2.5 text-xs text-carbon/60">
                            {sel === "pendiente_inicio" ? (x.gateFalta.length ? <span className="text-amber-600">{x.gateFalta.join(" · ")}</span> : <span className="text-emerald-600">listo</span>) : (x.coordinador ?? "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
