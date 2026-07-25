import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { contarComunidades } from "../../lib/comunidades";
import { SelectorComunidad } from "../expediente/SelectorComunidad";
import { licenciasPanel, resumenLicencia, ESTADO_LICENCIA, TIPO_TRAMITE_LABEL, drSinArranque, type LicenciaFila } from "../../lib/licencia";

export const dynamic = "force-dynamic";

function fechaCorta(v: string | null): string {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

const ESTADOS = ["pendiente_definir", "compromiso", "solicitada", "requerido", "aprobada"] as const;

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

export default async function EntradaLicencia({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const [total, filas] = await Promise.all([contarComunidades(), licenciasPanel()]);
  const r = resumenLicencia(filas);

  const sel = f ?? null;
  let lista: LicenciaFila[] = [];
  let titulo = "";
  if (sel === "requerido") {
    lista = filas.filter((x) => x.estado === "requerido");
    titulo = "Requeridos";
  } else if (sel === "dr_sin_arranque") {
    lista = filas.filter((x) => drSinArranque({ tipo_tramite: x.tipoTramite, inicio_dr_autorizado: x.inicioDrAutorizado, estado: x.estado }));
    titulo = "DR sin autorización de arranque";
  } else if (sel === "compromiso") {
    lista = filas.filter((x) => x.esperaSubvencion);
    titulo = "Compromiso (espera subvención)";
  } else if (sel === "ellos") {
    lista = filas.filter((x) => x.tramitadaPor === "ellos");
    titulo = "La tramitan ellos";
  } else if (sel === "pausado") {
    lista = filas.filter((x) => x.pausado);
    titulo = "Parados";
  } else if (sel && (ESTADOS as readonly string[]).includes(sel)) {
    lista = filas.filter((x) => x.estado === sel);
    titulo = ESTADO_LICENCIA[sel]?.label ?? sel;
  }

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1040px] px-6 py-12">
        <div className="text-center">
          <span className="text-4xl text-lima-dark">✓</span>
          <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">Licencia / DR</h1>
          <p className="mx-auto mt-2 max-w-lg text-carbon/55">
            El dolor aquí son los requerimientos. Vigila los requeridos y los DR que no se pueden arrancar aún.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <SelectorComunidad autoFocus hrefBase="/comunidades/" hrefSuffix="/licencia" />
          <p className="mt-2 text-center text-xs text-carbon/40">{total.toLocaleString("es-ES")} comunidades · escribe 2+ letras</p>
        </div>

        {/* Resumen: el foco es requerimientos + riesgo DR */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tarjeta etiqueta="Licencias" valor={r.total.toLocaleString("es-ES")} sub={`${r.porEstado["aprobada"] ?? 0} aprobadas`} />
          <Tarjeta etiqueta="Requeridos" valor={r.requeridos.toLocaleString("es-ES")} sub="con requerimiento abierto" acento={r.requeridos ? "text-red-600" : "text-carbon"} href={sel === "requerido" ? "/licencia" : "/licencia?f=requerido"} />
          <Tarjeta etiqueta="DR sin arranque" valor={r.drSinArranque.toLocaleString("es-ES")} sub="riesgo: falta OK / exención" acento={r.drSinArranque ? "text-amber-600" : "text-carbon"} href={sel === "dr_sin_arranque" ? "/licencia" : "/licencia?f=dr_sin_arranque"} />
          <Tarjeta etiqueta="Compromiso" valor={r.compromiso.toLocaleString("es-ES")} sub="espera subvención" acento={r.compromiso ? "text-violet-600" : "text-carbon"} href={sel === "compromiso" ? "/licencia" : "/licencia?f=compromiso"} />
        </div>

        {/* Filtros por estado */}
        <div className="mt-10">
          <p className="text-center text-xs uppercase tracking-wide text-carbon/35">¿Por dónde va cada licencia?</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ESTADOS.map((e) => {
              const n = r.porEstado[e] ?? 0;
              const activo = sel === e;
              return (
                <Link key={e} href={activo ? "/licencia" : `/licencia?f=${e}`} scroll={false}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/70 hover:border-lima"}`}>
                  {ESTADO_LICENCIA[e].label.split(" (")[0]}
                  <span className={`rounded-full px-1.5 text-xs ${activo ? "bg-carbon/10" : "bg-black/5 text-carbon/50"}`}>{n}</span>
                </Link>
              );
            })}
            <Link href={sel === "ellos" ? "/licencia" : "/licencia?f=ellos"} scroll={false}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${sel === "ellos" ? "border-sky-400 bg-sky-500 font-semibold text-white" : "border-sky-200 bg-white text-sky-600 hover:border-sky-400"}`}>
              La tramitan ellos <span className={`rounded-full px-1.5 text-xs ${sel === "ellos" ? "bg-white/20" : "bg-sky-50"}`}>{r.tramitanEllos}</span>
            </Link>
            <Link href={sel === "pausado" ? "/licencia" : "/licencia?f=pausado"} scroll={false}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${sel === "pausado" ? "border-red-400 bg-red-500 font-semibold text-white" : "border-red-200 bg-white text-red-600 hover:border-red-400"}`}>
              ⏸ Parados <span className={`rounded-full px-1.5 text-xs ${sel === "pausado" ? "bg-white/20" : "bg-red-50"}`}>{r.pausados}</span>
            </Link>
          </div>

          {sel && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="border-b border-black/5 px-5 py-3 text-sm font-semibold text-carbon">{titulo} · {lista.length} licencia(s)</div>
              {lista.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-carbon/40">Ninguna aquí.</p>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-black/[0.02] text-left text-[11px] uppercase tracking-wide text-carbon/40">
                      <tr>
                        <th className="px-5 py-2 font-semibold">Comunidad</th>
                        <th className="px-3 py-2 font-semibold">Tipo</th>
                        <th className="px-3 py-2 font-semibold">Organismo</th>
                        <th className="px-3 py-2 font-semibold">Registro</th>
                        <th className="px-3 py-2 font-semibold">Aprobación</th>
                        <th className="px-3 py-2 font-semibold">Tramita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {lista.map((x) => (
                        <tr key={x.licenciaId} className="transition hover:bg-lima-soft/40">
                          <td className="px-5 py-2.5">
                            <Link href={`/comunidades/${x.comunidadId}/licencia`} className="font-medium text-carbon hover:text-lima-dark">{x.comunidadNombre}</Link>
                            <div className="text-xs text-carbon/40">{[x.municipio, ...x.tipos].filter(Boolean).join(" · ")}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs text-carbon/60">{x.tipoTramite ? TIPO_TRAMITE_LABEL[x.tipoTramite] ?? x.tipoTramite : "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-carbon/60">{x.organismo ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-carbon/70">{fechaCorta(x.fechaRegistro)}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-carbon/70">{fechaCorta(x.fechaAprobacion)}</td>
                          <td className="px-3 py-2.5 text-carbon/60">{x.tramita ?? "—"}</td>
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
