import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { pendientesDeRevisar } from "../../lib/revisionPolycam";
import { porHacer } from "../../lib/mesaViabilidades";
import { accionBuscar, accionVincular, haceViabilidades } from "./revision-polycam/acciones";
import { Vincular } from "./revision-polycam/Piezas";
import { accionEmpezar } from "./acciones";

export const dynamic = "force-dynamic";

// ============================================================================
// MESA DE VIABILIDADES (Monica, 3-oct-2026). Maqueta aprobada:
// docs/figma/mesa-alex.html. Es la "Revision Polycam" del 2-oct crecida: su
// lista sigue arriba tal cual ("¿de que portal es?") y debajo esta lo que se
// hace con cada escaneo ya vinculado: la viabilidad.
//
// La abren quienes tienen la funcion `viabilidades` (Alex y Daniel) y quien lo
// ve todo. Las que mas esperan, arriba: es lo que hay que quitarse de encima.
// ============================================================================

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const ROTULO = "text-[11px] font-bold uppercase tracking-wider text-carbon/45";
const ENLACE_AJENO =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-ajeno/40 bg-ajeno-soft px-3.5 text-[12px] font-bold uppercase tracking-wide text-[#3f5f80] transition hover:bg-[#dde7f1]";
const ABRIR =
  "inline-flex items-center rounded-xl bg-lima px-5 py-2 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white";
const CHIP = "rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-800";

const CUANDO = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });
const fecha = (iso: string | null) => (iso ? CUANDO.format(new Date(iso.length === 10 ? iso + "T12:00:00" : iso)) : null);

/** "esperando hace 4 días", como Monica quiere medirlo. */
function espera(iso: string): string {
  const horas = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (horas < 24) return "hoy";
  const dias = Math.round(horas / 24);
  return dias === 1 ? "esperando desde ayer" : `esperando hace ${dias} días`;
}

export default async function MesaDeViabilidades({ searchParams }: { searchParams: Promise<{ enviada?: string }> }) {
  await haceViabilidades();
  const { enviada } = await searchParams;
  const [sinVincular, trabajo] = await Promise.all([pendientesDeRevisar(), porHacer()]);
  const lista = [...sinVincular].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1120px] px-6 pb-16 pt-5">
        <Link href="/menu" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Áreas de Accesalia
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <div className={ROTULO}>Viabilidades</div>
            <h1 className="mt-1 text-[25px] font-bold leading-tight text-carbon">Mesa de viabilidades</h1>
            <p className="mt-1.5 max-w-[70ch] text-[13px] text-carbon/60">
              Lo que entra por el buzón de Polycam. Primero se dice de qué portal es cada escaneo; después, cada
              escaneo vinculado es una viabilidad por hacer.
            </p>
          </div>
          <div className="flex gap-2.5">
            <div className="rounded-[10px] border border-ajeno/40 bg-ajeno-soft px-4 py-2.5 text-[#3f5f80]">
              <div className="text-[22px] font-bold leading-none">{lista.length}</div>
              <div className="mt-1 text-[12px] font-semibold">por vincular</div>
            </div>
            <div className="rounded-[10px] border border-lima/50 bg-lima-soft px-4 py-2.5 text-lima-dark">
              <div className="text-[22px] font-bold leading-none">{trabajo.length}</div>
              <div className="mt-1 text-[12px] font-semibold">viabilidades por hacer</div>
            </div>
          </div>
        </div>

        {enviada && (
          <div className="mt-4 rounded-[10px] border border-lima/50 bg-lima-soft px-4 py-3 text-[13px] text-lima-dark">
            <b>Enviada al comercial.</b> Ya está en sus manos: la completa y la manda con la hoja de encargo.
          </div>
        )}

        {/* ---------------------------------------------------- montón 1 */}
        <section className="mt-6">
          <h2 className="flex items-center gap-2.5 text-[15px] font-extrabold text-carbon">
            ¿De qué portal es?
            <span className="rounded-full bg-ajeno px-2.5 text-[12px] font-bold text-white">{lista.length}</span>
          </h2>
          <p className="mt-0.5 text-[12.5px] text-carbon/60">El cotejo propone y tú marcas.</p>
          {lista.length === 0 ? (
            <p className={`${CAJA} mt-2.5 px-5 py-4 text-[13px] text-carbon/55`}>Ningún escaneo esperando a que se diga de dónde es.</p>
          ) : (
            lista.map((e) => (
              <div key={e.id} className={`${CAJA} mt-2.5 flex flex-wrap items-center justify-between gap-4 px-5 py-3.5`}>
                <div className="min-w-0">
                  <div className="text-[16px] font-bold text-carbon/90">
                    {e.asunto || <span className="text-amber-700/80">(el correo venía sin asunto)</span>}
                  </div>
                  <div className="mt-1 text-[12px] text-carbon/60">
                    {e.remitente ?? "sin remitente"} · <span className="font-semibold text-amber-800">{espera(e.creadoEn)}</span>
                    {e.candidatos.length > 0 && (
                      <>
                        {" "}· Encaja con{" "}
                        {e.candidatos.map((g, i) => (
                          <span key={g.clave}>
                            {i > 0 && " · "}
                            <b className="font-semibold text-carbon/80">{g.direccion}</b> {g.municipio}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {e.enlaceFichero && (
                    <a href={e.enlaceFichero} target="_blank" rel="noreferrer" className={ENLACE_AJENO}>
                      Abrir el fichero
                    </a>
                  )}
                  {e.rutaPolycam && (
                    <a href={e.rutaPolycam} target="_blank" rel="noreferrer" className={ENLACE_AJENO}>
                      Abrir en Polycam
                    </a>
                  )}
                  <Vincular polycamId={e.id} asunto={e.asunto} candidatos={e.candidatos} guardar={accionVincular} buscar={accionBuscar} />
                </div>
              </div>
            ))
          )}
        </section>

        {/* ---------------------------------------------------- montón 2 */}
        <section className="mt-7">
          <h2 className="flex items-center gap-2.5 text-[15px] font-extrabold text-carbon">
            Viabilidades por hacer
            <span className="rounded-full bg-lima-dark px-2.5 text-[12px] font-bold text-white">{trabajo.length}</span>
          </h2>
          <p className="mt-0.5 text-[12.5px] text-carbon/60">Escaneos ya vinculados. Los que más esperan, arriba.</p>
          {trabajo.length === 0 ? (
            <p className={`${CAJA} mt-2.5 px-5 py-4 text-[13px] text-carbon/55`}>Nada por hacer. Lo que se vincule aparecerá aquí.</p>
          ) : (
            trabajo.map((t) => (
              <div key={t.viabilidadId ?? t.escaneoId} className={`${CAJA} mt-2.5 flex flex-wrap items-center justify-between gap-4 px-5 py-3.5`}>
                <div className="min-w-0">
                  <div className="text-[16px] font-bold text-carbon/90">{t.direccion}</div>
                  <div className="mt-1 text-[12px] text-carbon/60">
                    {[
                      t.proyecto,
                      t.escaleras,
                      t.escaneos > 1 ? `${t.escaneos} escaneos` : null,
                      t.fechaEscaneo ? `escaneado el ${fecha(t.fechaEscaneo)}` : null,
                      t.comercial ? `comercial ${t.comercial}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {" · "}
                    <span className="font-semibold text-amber-800">{espera(t.desde)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {t.danielAvisado && <span className={CHIP}>Daniel avisado</span>}
                  {t.viabilidadId ? (
                    <>
                      <span className={CHIP}>borrador</span>
                      <Link href={`/viabilidades/${t.viabilidadId}`} className={ABRIR}>
                        Abrir
                      </Link>
                    </>
                  ) : t.opps.length === 0 ? (
                    <span className={CHIP} title="Ningún acceso de este escaneo está en una oportunidad abierta">
                      el edificio no tiene opp abierta
                    </span>
                  ) : (
                    t.opps.map((o) => (
                      <form key={o.id} action={accionEmpezar}>
                        <input type="hidden" name="escaneo" value={t.escaneoId ?? ""} />
                        <input type="hidden" name="opp" value={o.id} />
                        <button className={ABRIR} title={o.nombre ?? undefined}>
                          {t.opps.length === 1 ? "Empezar" : `Empezar · ${o.codigo ?? o.proyecto ?? "opp"}`}
                        </button>
                      </form>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
