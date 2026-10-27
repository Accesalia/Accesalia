import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Salida } from "../../../components/Salida";
import { letraMenu } from "../../../components/letraMenu";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { puedeVerOpp } from "../../../../lib/hojaGenerador";
import { euros, fichaComercial } from "../../../../lib/fichaComercial";
import { RESULTADOS_JUNTA } from "../../../../lib/gestionOportunidad";
import { AgendarJunta, NosPidenIr } from "./Junta";

export const dynamic = "force-dynamic";

// LA FICHA COMERCIAL DE LA OPP (Monica, 27-oct-2026; maqueta validada docs/figma/ficha-comercial.html). Pantalla
// NUEVA: la de bloques (/comercial/oportunidades/[id]) se queda como esta y es el detalle. Por ahora se llega desde
// «Buscar y comprobar»; donde mas se engancha se decide despues. Datos: lib/fichaComercial.ts.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
const fecha = (d: string | null) => (d ? FECHA.format(new Date(d.length === 10 ? `${d}T12:00:00` : d)).replace(/\./g, "").replace(/ /g, "-") : "");
const EUR = euros;

const PANEL = "rounded-2xl border border-black/15 bg-white shadow-[0_2px_4px_rgba(0,0,0,.18),0_18px_36px_-18px_rgba(0,0,0,.6)]";
const ROT = "font-[family-name:var(--letra-menu)] text-[11px] font-extrabold uppercase tracking-[0.12em] text-carbon/55";
const LNK = "font-semibold text-[#104269] underline decoration-[#104269]/30 underline-offset-2 hover:decoration-[#104269]";
const BT = "rounded-full border-[1.5px] border-carbon/20 bg-white px-[13px] py-[5px] text-[12.5px] font-bold text-carbon/80 transition hover:border-carbon/50 hover:text-carbon";
const EST = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-[9px] py-[2px] text-[12px] font-bold";
const OK = EST + " bg-lima-soft text-lima-dark";
const OJO = EST + " bg-[#fbf1dc] text-[#8a5a00]";
const GRIS = EST + " bg-[#efefec] text-carbon/60";
const VACIO = "italic text-carbon/45";

/** Una fase del avance: su numero (✓ hecha, oscuro en curso, gris por venir) y su resultado. */
function Fase({ titulo, como, children }: { titulo: string; como: "hecha" | "encurso" | "pendiente"; children: React.ReactNode }) {
  const bola = como === "hecha" ? "bg-lima text-white" : como === "encurso" ? "bg-[#2e3236] text-white" : "bg-[#e9e9e6] text-carbon/60";
  return (
    <div className="grid grid-cols-1 gap-x-3.5 gap-y-1 border-t border-black/[.08] py-3 first:border-t-0 sm:grid-cols-[150px_minmax(0,1fr)]">
      <div className="flex items-baseline gap-2 font-[family-name:var(--letra-menu)] text-[13px] font-extrabold text-carbon">
        <i className={"inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11.5px] not-italic " + bola}>{como === "hecha" ? "✓" : "•"}</i>
        {titulo}
      </div>
      <div className="min-w-0 text-[13.5px]">{children}</div>
    </div>
  );
}

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/ficha/" + id);
  if (!puedeEntrar(yo, "comercial")) redirect("/menu");
  if (!(await puedeVerOpp(yo, id))) redirect("/comercial");
  const f = await fichaComercial(id);
  if (!f) notFound();

  const bloques = `/comercial/oportunidades/${id}`;
  const firmadas = f.hojas.filter((h) => h.firmada);
  const hayHojas = f.hojas.length > 0;
  const resultado = RESULTADOS_JUNTA.find((r) => r.valor === f.junta?.resultado)?.texto ?? null;
  const juntaHecha = !!(f.junta?.celebrada || (f.junta?.resultado && f.junta.resultado !== "pendiente") || f.juntaDeducida);
  const cobroCompleto = f.cobro && f.cobro.pendiente === 0 && !f.cobro.aExito;

  return (
    <div className={`${letraMenu.variable} min-h-screen bg-[#2e3236]`}>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1470px] px-4 pb-16 pt-4 sm:px-6">
        <Salida href="/consulta">← Buscar y comprobar</Salida>
        <p className="mt-1 flex items-center gap-2 font-[family-name:var(--letra-menu)] text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#a6dc7e]">
          <span className="h-2 w-2 rounded-full bg-[#a6dc7e]" />
          Oportunidad <span className="text-[#f3f4f1]/45">›</span> Ficha comercial
        </p>

        {/* ===================== ARRIBA: LO COMUN ===================== */}
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <section className={PANEL + " p-5 sm:p-6"}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h1 className="font-[family-name:var(--letra-menu)] text-[28px] font-extrabold leading-tight text-carbon">{f.direccion}</h1>
              {f.codigo && <span className="font-[family-name:var(--letra-menu)] text-[15px] font-extrabold tabular-nums text-carbon/55">{f.codigo}</span>}
            </div>
            <p className="mt-1 text-[14px] text-carbon/65">
              {[f.distrito, f.anio ? `edificio de ${f.anio}` : null].filter(Boolean).join(" · ") || <span className={VACIO}>sin datos de Catastro</span>}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {f.estado.ganada && <span className={OK}>● Ganada{f.estado.ganada !== "sí" ? ` el ${fecha(f.estado.ganada)}` : ""}</span>}
              {f.estado.perdida && <span className={GRIS}>Perdida{f.estado.motivoCierre ? ` · ${f.estado.motivoCierre}` : ""}</span>}
              {f.estado.pausada && <span className={GRIS}>En pausa</span>}
              {f.estado.texto && <span className={OJO}>{f.estado.texto}</span>}
              {f.estado.extra && <span className="text-[12.5px] text-carbon/55">{f.estado.extra}</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={bloques} className={BT}>
                Ir a los bloques →
              </Link>
            </div>
          </section>

          <section className={PANEL + " p-5 sm:p-6"}>
            <div className={ROT}>Datos del primer contacto</div>
            <dl className="mt-3 grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-4 gap-y-2 text-[14px]">
              <dt className="text-carbon/55">Cómo nos ha llegado</dt>
              <dd>
                {f.trajo ? (
                  <>
                    La trajo <b>{f.trajo}</b>
                  </>
                ) : (
                  <span className={VACIO}>sin apuntar</span>
                )}
                {f.llegada && <>, el {fecha(f.llegada)}</>}
              </dd>
              <dt className="text-carbon/55">Qué les interesa</dt>
              <dd>{f.quieren ?? <span className={VACIO}>sin apuntar</span>}</dd>
              <dt className="text-carbon/55">Administrador</dt>
              <dd>
                {f.admin && (f.admin.persona || f.admin.empresa) ? (
                  <>
                    <b>{f.admin.persona ?? f.admin.empresa}</b>
                    {f.admin.persona && f.admin.empresa && <> · {f.admin.empresa}</>}
                    {f.admin.telefono && (
                      <>
                        {" · "}
                        {f.admin.telefono.split(/\s*\/\s*/).map((t, i) => (
                          <span key={t}>
                            {i ? " · " : ""}
                            <a className={LNK} href={`tel:${t.replace(/\s/g, "")}`}>
                              {t}
                            </a>
                          </span>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <span className={VACIO}>sin administrador</span>
                )}
              </dd>
              <dt className="text-carbon/55">Con quién hablo</dt>
              <dd>{f.hablo?.nombre ?? <span className={VACIO}>sin apuntar</span>}</dd>
              <dt className="text-carbon/55">Comercial</dt>
              <dd>{f.comercial ?? <span className={VACIO}>sin comercial</span>}</dd>
            </dl>
          </section>
        </div>

        {/* ===================== CENTRO: LA FASE ===================== */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,64fr)_minmax(0,36fr)]">
          <section className={PANEL + " p-5 sm:p-6"}>
            <div className="flex items-center justify-between gap-3">
              <div className={ROT}>Avance comercial</div>
              <span className="text-[12px] text-carbon/50">cada fase, con su resultado</span>
            </div>
            <div className="mt-2">
              <Fase titulo="Toma de datos" como={f.viabilidad?.enviada || hayHojas ? "hecha" : "encurso"}>
                {f.necesita && (f.necesita.polycam || f.necesita.viabilidad) ? (
                  <>
                    Necesitaba <b>{[f.necesita.polycam && "Polycam", f.necesita.viabilidad && "viabilidad"].filter(Boolean).join(" y ")}</b>.{" "}
                  </>
                ) : f.necesita ? (
                  <>No necesitaba Polycam ni viabilidad. </>
                ) : null}
                {f.viabilidad ? (
                  <>
                    Viabilidad v{f.viabilidad.version}{" "}
                    {f.viabilidad.enviada ? <b>enviada el {fecha(f.viabilidad.enviada)}</b> : <b>sin enviar</b>}
                    {f.viabilidad.viable === false && <span className="font-semibold text-alerta"> · no viable</span>}{" "}
                    {f.viabilidad.pdf && (
                      <a className={LNK} href={`/comercial/viabilidad/${f.viabilidad.id}/pdf`} target="_blank" rel="noreferrer">
                        ver PDF
                      </a>
                    )}
                  </>
                ) : f.necesita?.viabilidad ? (
                  <span className={VACIO}>Aún sin viabilidad.</span>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                  <Link className={LNK} href={`${bloques}?bloque=1`}>
                    Informe del edificio ↗
                  </Link>
                  <span className="text-carbon/55">Catastro, lo que condiciona hacer y pedir</span>
                </div>
              </Fase>

              <Fase titulo="Documentación" como={firmadas.length ? "hecha" : hayHojas ? "encurso" : "pendiente"}>
                <div className="mb-2 flex flex-wrap justify-end gap-2">
                  <Link href={`/comercial/hoja-encargo?opp=${id}`} className={BT}>
                    + Generar hoja de encargo
                  </Link>
                  <Link href={`${bloques}?bloque=1`} className={BT}>
                    + Pedir viabilidad
                  </Link>
                </div>
                {!hayHojas ? (
                  <p className={VACIO}>Aún no hay hojas de encargo.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="text-left text-[10.5px] font-extrabold uppercase tracking-[.07em] text-carbon/50">
                          <th className="border-b border-black/[.12] px-2 py-1">Hoja</th>
                          <th className="border-b border-black/[.12] px-2 py-1">Qué contiene</th>
                          <th className="border-b border-black/[.12] px-2 py-1 text-right">Importe</th>
                          <th className="border-b border-black/[.12] px-2 py-1">Viabilidad</th>
                          <th className="border-b border-black/[.12] px-2 py-1">Cómo está</th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.hojas.map((h) => (
                          <tr key={h.id} className="align-top">
                            <td className="whitespace-nowrap border-b border-black/[.06] px-2 py-[7px]">
                              <a className={LNK} href={`/comercial/hoja-encargo/pdf/${h.id}`} target="_blank" rel="noreferrer">
                                {h.codigo ?? "Hoja"}
                              </a>
                              <div className="text-[11.5px] text-carbon/50">
                                v{h.version}
                                {h.emitida ? ` · ${fecha(h.emitida)}` : ""}
                              </div>
                            </td>
                            <td className="border-b border-black/[.06] px-2 py-[7px]">{h.contenido || <span className={VACIO}>sin conceptos</span>}</td>
                            <td className="whitespace-nowrap border-b border-black/[.06] px-2 py-[7px] text-right tabular-nums">
                              {h.importe ? <b>{EUR(h.importe)}</b> : <span className="text-carbon/45">sin importes</span>}
                              {h.aPorcentaje && <span className="block text-[11.5px] text-carbon/50">{h.aPorcentaje}</span>}
                            </td>
                            <td className="whitespace-nowrap border-b border-black/[.06] px-2 py-[7px]">
                              {h.viabilidad ? (
                                <a className={LNK} href={`/comercial/viabilidad/${h.viabilidad.id}/pdf`} target="_blank" rel="noreferrer" title={h.viabilidad.deLaOpp ? "La viabilidad vigente de la opp" : "La viabilidad con la que se emitió"}>
                                  v{h.viabilidad.version}
                                </a>
                              ) : (
                                <span className="text-carbon/45">—</span>
                              )}
                            </td>
                            <td className="border-b border-black/[.06] px-2 py-[7px]">
                              <span className={h.firmada ? OK : h.estado === "enviada" || h.estado === "no_firmada" || h.estado === "borrador" ? GRIS : OJO}>{h.estadoTexto}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Fase>

              <Fase titulo="Junta" como={juntaHecha ? "hecha" : f.junta ? "encurso" : "pendiente"}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span>{f.junta?.fecha ? <>Junta el <b>{fecha(f.junta.fecha)}</b></> : <span className={VACIO}>Sin fecha de junta</span>}</span>
                  <NosPidenIr oppId={id} valor={f.junta?.nosPidenIr ?? null} />
                  <AgendarJunta oppId={id} agenda={f.agendaComercial} nombreOpp={[f.direccion, f.codigo].filter(Boolean).join(" · ")} lugar={f.direccion} />
                </div>
                {f.tresD && (
                  <div className="mt-1.5">
                    3D: hacía falta.{" "}
                    {f.tresD.entregado ? (
                      <>
                        <b>Entregado el {fecha(f.tresD.entregado)}</b>
                        {f.tresD.enlace && (
                          <>
                            {" "}
                            <a className={LNK} href={f.tresD.enlace} target="_blank" rel="noreferrer">
                              ver 3D
                            </a>
                          </>
                        )}
                      </>
                    ) : f.tresD.pedido ? (
                      <>
                        <b>Pedido el {fecha(f.tresD.pedido)}</b>
                        {f.tresD.necesario && <> para el {fecha(f.tresD.necesario)}</>} · <span className="font-semibold text-alerta">sin entregar</span>
                      </>
                    ) : (
                      <span className="font-semibold text-alerta">falta pedirlo</span>
                    )}
                  </div>
                )}
                <div className="mt-1.5">
                  {f.junta?.resultado && f.junta.resultado !== "pendiente" ? (
                    <>
                      Resultado: <b>{resultado?.toLowerCase()}</b>
                      {f.junta.detalle && <span className="text-carbon/65"> · {f.junta.detalle}</span>}
                    </>
                  ) : f.juntaDeducida ? (
                    <>
                      Resultado: <b>tenemos hoja firmada, así que asumimos que votaron sí</b>
                    </>
                  ) : f.estado.perdida && f.estado.motivoCierre ? (
                    <>
                      Resultado: <b>no</b> · {f.estado.motivoCierre}
                    </>
                  ) : (
                    <span className={VACIO}>Resultado: aún no lo sabemos</span>
                  )}
                </div>
              </Fase>

              <Fase titulo="Firma" como={firmadas.length ? "hecha" : "pendiente"}>
                {firmadas.length ? (
                  <>
                    Firmada{firmadas.length > 1 ? "s" : ""}
                    {f.firma.fecha && <> el <b>{fecha(f.firma.fecha)}</b></>}: {firmadas.map((h) => h.codigo).filter(Boolean).join(" y ")}
                  </>
                ) : (
                  <span className={VACIO}>Aún sin hoja firmada.</span>
                )}
              </Fase>

              <Fase titulo="Cobro" como={cobroCompleto ? "hecha" : f.cobro ? "encurso" : "pendiente"}>
                {f.cobro ? (
                  <>
                    <b>Cobrados {EUR(f.cobro.cobrado)}</b>
                    {f.cobro.pendiente > 0 && (
                      <>
                        {" "}
                        · faltan {EUR(f.cobro.pendiente)} ({f.cobro.queFalta.join(", ")})
                      </>
                    )}
                    {f.cobro.aExito && <> + la subvención si la conceden</>}
                  </>
                ) : (
                  <span className={VACIO}>Nada que cobrar todavía.</span>
                )}
              </Fase>
            </div>
          </section>

          <section className={PANEL + " p-5 sm:p-6"}>
            <div className={ROT}>Tu historia con ellos</div>
            {f.diario.length === 0 ? (
              <p className={"mt-3 text-[13.5px] " + VACIO}>Nada apuntado todavía.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-[13.5px]">
                {f.diario.map((d, i) => (
                  <li key={i}>
                    <div className="text-[12px] font-bold text-carbon/55">
                      {fecha(d.fecha)}
                      {d.quien ? ` · ${d.quien}` : ""}
                    </div>
                    <div className="whitespace-pre-line">{d.texto}</div>
                  </li>
                ))}
              </ul>
            )}
            <Link href={bloques} className="mt-3 inline-block text-[12.5px] font-bold text-lima-dark hover:underline">
              Apuntar algo nuevo, en los bloques →
            </Link>
            <div className={ROT + " mt-6"}>Mails enviados</div>
            {f.correos.length === 0 ? (
              <p className={"mt-2 text-[13.5px] " + VACIO}>Ninguno enviado desde la app.</p>
            ) : (
              <ul className="mt-2 space-y-2.5">
                {f.correos.slice(0, 8).map((c) => (
                  <li key={c.id} className="rounded-[10px] bg-[#f3f6fb] px-3 py-2 text-[12.5px]">
                    <div className="font-bold text-carbon/75">{fecha(c.creado_en)} · para {c.para.join(", ")}</div>
                    <div className="text-carbon/80">{c.asunto}</div>
                    {c.documentos.length > 0 && (
                      <div className="mt-0.5 text-carbon/60">
                        Adjuntos:{" "}
                        {c.documentos.map((d, i) => (
                          <span key={d.id}>
                            {i ? ", " : ""}
                            <a className={LNK} href={d.enlace} target="_blank" rel="noreferrer">
                              {d.nombre}
                            </a>
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ===================== ABAJO: LO TRANSVERSAL ===================== */}
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <section className={PANEL + " p-5"}>
            <div className={ROT}>El edificio</div>
            {f.referencia ? (
              <ul className="mt-3 space-y-2 text-[13.5px]">
                <li>
                  <Link className={LNK} href={`${bloques}?bloque=1`}>
                    Ficha de Catastro
                  </Link>
                  {f.anio && <span className="text-carbon/50"> · {f.anio}</span>}
                </li>
                <li>
                  <Link className={LNK} href={`${bloques}?bloque=1`}>
                    Lo que condiciona hacer y pedir
                  </Link>
                </li>
                <li>
                  IEE: <span className={f.iee ? "font-semibold" : "text-carbon/55"}>{f.iee ?? "no nos consta"}</span>
                </li>
                <li>
                  <a className={LNK} href={`${bloques}/anexo`} target="_blank" rel="noreferrer">
                    Informe de venta
                  </a>
                </li>
              </ul>
            ) : (
              <p className={"mt-3 text-[13.5px] " + VACIO}>Sin referencia catastral: se arregla fijando la dirección.</p>
            )}
          </section>
          <section className={PANEL + " p-5"}>
            <div className={ROT}>La comunidad</div>
            {f.contactos.length === 0 ? (
              <p className={"mt-3 text-[13.5px] " + VACIO}>Sin presidente ni contactos apuntados.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-[13.5px]">
                {f.contactos.map((c, i) => (
                  <li key={i}>
                    <b>{c.nombre}</b>
                    {c.papel && <span className="text-carbon/55"> · {c.papel}</span>}
                    {c.telefono && (
                      <>
                        {" · "}
                        <a className={LNK} href={`tel:${c.telefono.replace(/\s/g, "")}`}>
                          {c.telefono}
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={PANEL + " p-5"}>
            <div className={ROT}>Fotos y documentos</div>
            <p className="mt-3 text-[13.5px]">
              {f.fotos ? (
                <Link className={LNK} href={`${bloques}?bloque=1`}>
                  {f.fotos} {f.fotos === 1 ? "foto" : "fotos"}
                </Link>
              ) : (
                <span className={VACIO}>Sin fotos</span>
              )}
            </p>
            <ul className="mt-2 space-y-1.5 text-[13.5px]">
              {f.viabilidad?.pdf && (
                <li>
                  <a className={LNK} href={`/comercial/viabilidad/${f.viabilidad.id}/pdf`} target="_blank" rel="noreferrer">
                    Viabilidad v{f.viabilidad.version}
                  </a>
                  {f.viabilidad.enviada && <span className="text-carbon/50"> · {fecha(f.viabilidad.enviada)}</span>}
                </li>
              )}
              {f.documentos.map((d) => (
                <li key={d.id}>
                  {d.url ? (
                    <a className={LNK} href={d.url} target="_blank" rel="noreferrer">
                      {d.nombre}
                    </a>
                  ) : (
                    d.nombre
                  )}
                  <span className="text-carbon/50"> · {d.tipo}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className={PANEL + " p-5"}>
            <div className={ROT}>Avance del proyecto</div>
            <p className={"mt-3 text-[13.5px] " + VACIO}>Aquí saldrá, en corto, por dónde va: proyecto, licencia, obra y cada subvención con su estado. Esas áreas aún no están en la app.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
