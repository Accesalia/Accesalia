import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import type { EscaneadoPendiente } from "../../lib/revisionPolycam";
import type { PorHacer } from "../../lib/mesaViabilidades";
import { accionBuscar, accionVincular } from "./revision-polycam/acciones";
import { Vincular } from "./revision-polycam/Piezas";
import { accionEmpezar, accionEmpezarSolicitud } from "./acciones";
import type { SolicitudPendiente } from "../../lib/solicitudViabilidad";
import { CorregirDireccion, Descartar, MaterialPedido, ResueltoPorDaniel } from "./BotonesMesa";
import { Salida } from "../components/Salida";

// ============================================================================
// MESA DE VIABILIDADES (Monica, 3-oct-2026; REHECHA el 14-oct-2026 sobre su
// maqueta, OneDrive/Imagenes/Screenshots/"esquema propusto pantalla iabilidades
// sobre todo estetica. .png"). Sus colores y su forma:
//   - arriba, "ESCANEADOS POLYCAM RECIBIDOS" y dos contadores: verde (#CADCBC,
//     viabilidades por hacer) y marron (#CDBAB0, pendientes de humano);
//   - dos columnas separadas por una linea verde: a la izquierda LISTAS PARA
//     EMPEZAR (la direccion ya esta identificada: las viabilidades por hacer); a
//     la derecha NECESITO UN HUMANO (no se sabe de que portal es, con su porque).
//   - un FILTRO arriba que su maqueta no tiene y ella pidio: "pendientes del ok
//     de Daniel" (avisado y sin resolver), y los que vengan.
//
// La abren quienes tienen la funcion `viabilidades` (Alex y Daniel) y quien lo
// ve todo. Las que mas esperan, arriba: es lo que hay que quitarse de encima.
// ============================================================================

const CARD = "rounded-2xl bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]";
const ABRIR =
  "inline-flex items-center rounded-[8px] bg-[#7ac943] px-4 py-1.5 text-[13px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white";
const CHAPA = "rounded-full border border-[#e8d9a8] bg-[#fdf6e0] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#6b5214]";
const CHAPA_RESUELTO = "rounded-full bg-[#3b6e1f] px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white";
const ENLACE_AJENO =
  "inline-flex h-[26px] items-center justify-center rounded-[8px] border border-ajeno/40 bg-ajeno-soft px-2.5 text-[11px] font-bold uppercase tracking-wide text-[#3f5f80] transition hover:bg-[#dde7f1]";
const VERDE = "#3b6e1f";
const GRANATE = "#7a2420";

const CUANDO = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });
const fecha = (iso: string | null) => (iso ? CUANDO.format(new Date(iso.length === 10 ? iso + "T12:00:00" : iso)) : null);

/** "esperando hace 4 días", como Monica quiere medirlo. */
function espera(iso: string): string {
  const horas = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (horas < 24) return "esperando desde hoy";
  const dias = Math.round(horas / 24);
  return dias === 1 ? "esperando desde ayer" : `esperando hace ${dias} días`;
}

// LOS FILTROS de la columna de la izquierda. Uno nuevo = una linea aqui.
const FILTROS: { clave: string; nombre: string; vale: (t: PorHacer) => boolean }[] = [
  { clave: "todas", nombre: "Todas", vale: () => true },
  { clave: "daniel", nombre: "Pendientes del ok de Daniel", vale: (t) => t.danielAvisado && !t.danielResuelto },
  { clave: "borrador", nombre: "Con borrador", vale: (t) => t.borrador },
  { clave: "sin-empezar", nombre: "Sin empezar", vale: (t) => !t.viabilidadId },
  { clave: "app", nombre: "Vinculadas por la app", vale: (t) => !!t.vinculadoPorApp },
];

function Contador({ n, texto, fondo, tinta }: { n: number; texto: string; fondo: string; tinta: string }) {
  return (
    <div className="min-w-[150px] rounded-[10px] px-6 py-2.5 text-center" style={{ backgroundColor: fondo, color: tinta }}>
      <div className="text-[22px] font-bold leading-none">{n}</div>
      <div className="mt-1.5 text-[12.5px] font-medium">{texto}</div>
    </div>
  );
}

function Cabecera({ titulo, n, color, children }: { titulo: string; n: number; color: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="flex items-center gap-3 text-[19px] font-extrabold uppercase tracking-tight" style={{ color }}>
        {titulo}
        <span className="rounded-full px-3 py-0.5 text-[15px] font-bold text-white" style={{ backgroundColor: color }}>{n}</span>
      </h2>
      {children}
    </div>
  );
}

/** La mesa ya con sus datos: separada de la carga para poder mirarla con datos de muestra. */
export function Mesa({
  pedidas,
  todas,
  sinVincular,
  ver,
  enviada,
  resuelveDaniel,
}: {
  /** Las viabilidades pedidas sin Polycam que aun nadie ha empezado (15-oct-2026). */
  pedidas: SolicitudPendiente[];
  todas: PorHacer[];
  sinVincular: EscaneadoPendiente[];
  ver?: string;
  enviada: boolean;
  resuelveDaniel: boolean;
}) {
  // Los que la app va a vincular sola en su siguiente pasada (no tienen duda) no
  // son de humano: salen aparte, contados.
  const humano = sinVincular.filter((e) => e.motivo !== "").sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  const solos = sinVincular.length - humano.length;

  const filtro = FILTROS.find((f) => f.clave === ver) ?? FILTROS[0];
  const trabajo = todas.filter(filtro.vale);

  return (
    <div className="min-h-screen bg-[#EEF5E8]">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-5">
        <Salida href="/menu">← Áreas de Accesalia</Salida>

        {/* ---------------------------------------------------- arriba */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-[15px] font-extrabold uppercase tracking-wide text-carbon">Escaneados Polycam recibidos</h1>
            <p className="mt-3 text-[14px] font-semibold" style={{ color: VERDE }}>
              Hay {todas.length} {todas.length === 1 ? "viabilidad pendiente" : "viabilidades pendientes"} de tu revisión. Pulsa en cualquiera para empezar con ella.
            </p>
          </div>
          <div className="flex gap-4">
            <Contador n={todas.length} texto="viabilidades por hacer" fondo="#CADCBC" tinta={VERDE} />
            <Contador n={humano.length} texto="pendientes de humano" fondo="#CDBAB0" tinta={GRANATE} />
          </div>
        </div>

        {enviada && (
          <div className="mt-4 rounded-[10px] border border-lima/50 bg-lima-soft px-4 py-3 text-[13px] text-lima-dark">
            <b>Enviada al comercial.</b> Ya está en sus manos: la completa y la manda con la hoja de encargo.
          </div>
        )}

        {/* --------------------------- las pedidas sin Polycam (15-oct-2026) */}
        {pedidas.length > 0 && <PedidasSinPolycam pedidas={pedidas} />}

        {/* ---------------------------------------------------- las dos columnas */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_2px_minmax(0,1fr)]">
          {/* ===== LISTAS PARA EMPEZAR ===== */}
          <section className="min-w-0">
            <Cabecera titulo="Listas para empezar" n={trabajo.length} color={VERDE}>
              <p className="mt-0.5 text-[13px] text-carbon">(con dirección identificada)</p>
              <p className="mt-2 text-[11.5px] leading-snug text-carbon/65">
                De todas formas, échale un ojo para confirmar que la identifiqué bien.
                <br />
                En el asunto viene la dirección.
              </p>
            </Cabecera>

            <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Filtrar">
              {FILTROS.map((f) => {
                const activo = f.clave === filtro.clave;
                const n = todas.filter(f.vale).length;
                return (
                  <Link
                    key={f.clave}
                    href={f.clave === "todas" ? "/viabilidades" : `/viabilidades?ver=${f.clave}`}
                    className={
                      "rounded-full border px-3 py-1 text-[12px] font-semibold transition " +
                      (activo ? "border-[#3b6e1f] bg-[#3b6e1f] text-white" : "border-[#a3cf84] bg-white text-carbon/75 hover:border-[#3b6e1f]")
                    }
                  >
                    {f.nombre} <span className={activo ? "text-white/80" : "text-carbon/55"}>{n}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 space-y-3">
              {trabajo.length === 0 ? (
                <p className={`${CARD} text-[13px] text-carbon/65`}>
                  {filtro.clave === "todas" ? "Nada por hacer. Lo que se vincule aparecerá aquí." : "Ninguna con este filtro."}
                </p>
              ) : (
                trabajo.map((t) => (
                  <div key={t.viabilidadId ?? t.escaneoId} className={`${CARD} flex flex-wrap items-start justify-between gap-x-4 gap-y-2`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[17px] font-bold uppercase leading-snug text-carbon/70">{t.direccion}</div>
                      {t.asunto && <div className="mt-1 text-[14px] font-bold text-carbon">{t.asunto}</div>}
                      <div className="mt-1 text-[11.5px] text-carbon/65">
                        {[
                          t.remitente,
                          t.proyecto,
                          t.escaleras,
                          t.escaneos > 1 ? `${t.escaneos} escaneos` : null,
                          t.fechaEscaneo ? `escaneado el ${fecha(t.fechaEscaneo)}` : null,
                          t.comercial ? `comercial ${t.comercial}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        {" · "}
                        <span className="font-semibold text-[#a3540f]">{espera(t.desde)}</span>
                      </div>
                      {t.vinculadoPorApp && (
                        <div className="mt-1.5 text-[11.5px] font-semibold text-[#3f5f80]" title={t.vinculadoPorApp}>
                          Vinculado por la app
                          <span className="font-normal text-carbon/60"> · {t.vinculadoPorApp}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {t.danielAvisado && <span className={CHAPA}>Daniel avisado</span>}
                        {t.viabilidadId && <span className={CHAPA}>Borrador</span>}
                        {t.viabilidadId ? (
                          <Link href={`/viabilidades/${t.viabilidadId}`} className={ABRIR}>
                            Abrir
                          </Link>
                        ) : t.opps.length === 0 ? (
                          <span className={CHAPA} title="Ningún acceso de este escaneo está en una oportunidad abierta">
                            el edificio no tiene opp abierta
                          </span>
                        ) : (
                          t.opps.map((o) => (
                            <form key={o.id} action={accionEmpezar}>
                              <input type="hidden" name="escaneo" value={t.escaneoId ?? ""} />
                              <input type="hidden" name="opp" value={o.id} />
                              <button className={ABRIR} title={o.nombre ?? undefined}>
                                {t.opps.length === 1 ? "Abrir" : `Abrir · ${o.codigo ?? o.proyecto ?? "opp"}`}
                              </button>
                            </form>
                          ))
                        )}
                      </div>
                      {t.danielResuelto && <span className={CHAPA_RESUELTO}>Resuelto por Daniel</span>}
                      {t.danielAvisado && !t.danielResuelto && t.viabilidadId && resuelveDaniel && <ResueltoPorDaniel viabilidadId={t.viabilidadId} />}
                      {t.vinculadoPorApp && !t.viabilidadId && t.escaneoId && <CorregirDireccion escaneoId={t.escaneoId} />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* la linea verde que separa */}
          <div className="hidden bg-[#3b6e1f] lg:block" aria-hidden />

          {/* ===== NECESITO UN HUMANO ===== */}
          <section className="min-w-0">
            <Cabecera titulo="Necesito un humano" n={humano.length} color={GRANATE}>
              <p className="mt-0.5 text-[13px] text-carbon">No he encontrado a qué dirección corresponden</p>
              <p className="mt-2 text-[11.5px] leading-snug text-carbon/65">
                Puede que no esté dada de alta, que la carpeta se llame de otra manera…
                <br />
                ¿Puedes usar el buscador a ver si está creada?
              </p>
            </Cabecera>
            {solos > 0 && (
              <p className="mt-4 text-[12px] text-carbon/65">
                {solos === 1 ? "Otro escaneo no tiene duda: la app lo vincula" : `Otros ${solos} escaneos no tienen duda: la app los vincula`} sola en su próxima pasada.
              </p>
            )}

            <div className="mt-4 space-y-3">
              {humano.length === 0 ? (
                <p className={`${CARD} text-[13px] text-carbon/65`}>Ningún escaneo esperando a que se diga de dónde es.</p>
              ) : (
                humano.map((e) => (
                  <div key={e.id} className={`${CARD} flex flex-wrap items-start justify-between gap-x-4 gap-y-2`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[16px] font-bold text-carbon">
                        {e.asunto || <span className="text-amber-700/80">(el correo venía sin asunto)</span>}
                      </div>
                      <div className="mt-1 text-[11.5px] text-carbon/65">
                        {e.remitente ?? "sin remitente"} · <span className="font-semibold text-[#a3540f]">{espera(e.creadoEn)}</span>
                      </div>
                      <div className="mt-1.5 text-[12.5px] font-semibold" style={{ color: GRANATE }}>{e.motivo}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Vincular
                        polycamId={e.id}
                        asunto={e.asunto}
                        candidatos={e.candidatos}
                        guardar={accionVincular}
                        buscar={accionBuscar}
                        rotulo="Buscar posible dirección"
                      />
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {e.enlaceFichero && (
                          <>
                            <Link href={`/viabilidades/escaneo/${e.id}`} className={ENLACE_AJENO}>Ver</Link>
                            <a href={`${e.enlaceFichero}&download=${encodeURIComponent(e.nombreOriginal ?? "escaneo.zip")}`} className={ENLACE_AJENO}>
                              Descargar
                            </a>
                          </>
                        )}
                        {e.rutaPolycam && (
                          <a href={e.rutaPolycam} target="_blank" rel="noreferrer" className={ENLACE_AJENO}>
                            Polycam
                          </a>
                        )}
                        <Descartar escaneoId={e.id} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ------------------------------------------------ pedidas sin Polycam

/** "Para cuando": con prisa (una semana o menos, o ya pasada) se destaca. */
function plazo(paraCuando: string | null): { texto: string; prisa: boolean } | null {
  if (!paraCuando) return null;
  const dias = Math.round((new Date(paraCuando + "T12:00:00").getTime() - Date.now()) / 86_400_000);
  const texto = dias < 0 ? `para el ${fecha(paraCuando)} (ya pasó)` : dias === 0 ? "para hoy" : `para el ${fecha(paraCuando)}`;
  return { texto, prisa: dias <= 7 };
}

/** VIABILIDADES PEDIDAS SIN POLYCAM (Monica, 15-oct-2026): las pide el comercial
 *  desde el bloque 1 de la opp, con su descripcion y su material. La mas antigua
 *  arriba. "Empezar" crea la viabilidad y lleva a su mesa de trabajo; desde ahi ya
 *  sale en "Listas para empezar" como borrador. */
function PedidasSinPolycam({ pedidas }: { pedidas: SolicitudPendiente[] }) {
  return (
    <section className="mt-8">
      <Cabecera titulo="Viabilidades pedidas sin Polycam" n={pedidas.length} color="#3f5f80">
        <p className="mt-0.5 text-[13px] text-carbon">El comercial las ha pedido con su descripción y lo que tenga: fotos, planos, croquis…</p>
      </Cabecera>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {pedidas.map((s) => {
          const p = plazo(s.paraCuando);
          return (
            <div key={s.id} className={`${CARD} flex flex-wrap items-start justify-between gap-x-4 gap-y-2`}>
              <div className="min-w-0 flex-1">
                <Link href={`/comercial/oportunidades/${s.oportunidadId}`} className="text-[17px] font-bold uppercase leading-snug text-carbon/70 hover:underline">
                  {s.opp}
                </Link>
                {s.accesos && <div className="text-[12px] text-carbon/65">{s.accesos}</div>}
                <div className="mt-1 text-[13px] font-semibold text-carbon">{s.quieren}</div>
                <p className="mt-1 whitespace-pre-line text-[14px] text-carbon/90">{s.descripcion}</p>
                <div className="mt-1.5 text-[11.5px] text-carbon/65">
                  {[s.pedidaPor ? `pedida por ${s.pedidaPor}` : null, s.codigo].filter(Boolean).join(" · ")}
                  {" · "}
                  <span className="font-semibold text-[#a3540f]">{espera(s.pedidaEn)}</span>
                </div>
                {s.material.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.material.map((m) => (
                      <MaterialPedido key={m.id} id={m.id} nombre={m.nombre} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {p && (
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide " +
                      (p.prisa ? "bg-alerta text-white" : "border border-[#e8d9a8] bg-[#fdf6e0] text-[#6b5214]")
                    }
                  >
                    {p.texto}
                  </span>
                )}
                <form action={accionEmpezarSolicitud.bind(null, s.id)}>
                  <button className={ABRIR}>Empezar</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
