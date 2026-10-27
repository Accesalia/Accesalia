import Link from "next/link";
import type { ReactNode } from "react";
import type { Documentacion } from "../../../../lib/bloqueDocumentacion";
import type { VersionHe } from "../../../../lib/hojasOpp";
import { FASE_HE } from "../../../../lib/hojasOpp";
import type { Necesidades } from "../../../../lib/necesidadesOpp";
import type { InformeGuardado } from "../../../../lib/informeCostes";
import type { CorreoEnviado } from "../../../../lib/envioCorreo";
import type { DatosPedirViabilidad } from "../../viabilidad-sin-polycam/datos";
import { PedirViabilidad } from "../../viabilidad-sin-polycam/PedirViabilidad";
import { Fila, PorValidar } from "./HojasNuevas";
import { TipoOferta } from "./TipoOferta";
import { EscaneoPrevisto } from "./EscaneoPrevisto";

// BLOQUE 2 · OFERTAS A LA COMUNIDAD (Monica, 27-oct-2026; maqueta docs/figma/bloque2-documentacion.html, «esta
// inmejorable, yo montaria esto tal cual»). Antes «Documentacion». Se ordena por lo que el comercial viene a HACER (el
// proceso), no por los documentos que salen (el resultado): «me estaba centrando en el resultado en vez de en el
// proceso». Menu a la izquierda; lo elegido, en el centro; el diario, integrado a la derecha en el mismo recuadro
// (opcion B: «se ve el contenido sin generar ruido»).
//
// LA OFERTA = el paquete que se envia a la comunidad: siempre una hoja de encargo con el ok de Daniel y, si el tipo lo
// pide, la viabilidad del arquitecto (con Polycam: la pide el envio del escaneo; sin Polycam: un boton).

const AZUL = "#104269";
const CAJA_R = "rounded-[12px] border-[1.5px] px-4 py-3.5";
const BOTON_P = "inline-flex items-center rounded-[7px] bg-lima px-3.5 py-2 text-[13px] font-bold text-white transition hover:bg-lima-dark";
const BOTON_S = "inline-flex items-center rounded-[7px] border border-carbon bg-white px-3 py-1.5 text-[12.5px] font-bold hover:bg-[#f3f3f3]";
const ENLACE = "font-semibold text-[#104269] underline-offset-2 hover:underline";
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const dia = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const HORA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
const hace = (iso: string) => {
  const n = diasDesde(iso);
  return n === 0 ? "hoy" : n === 1 ? "hace 1 día" : `hace ${n} días`;
};

export type VistaOferta = "preparar" | "enviadas" | "validar" | "costes" | "ayudas" | "proteccion" | "inmueble" | "fotos" | "documentos";
export const VISTAS_OFERTA: VistaOferta[] = ["preparar", "enviadas", "validar", "costes", "ayudas", "proteccion", "inmueble", "fotos", "documentos"];

const ESPERA_FIRMADA = ["ok_daniel", "enviada", "firma_con_errores"];
const CERRADAS = ["no_firmada", "anulada", "sustituida"];

/** Las ofertas del pasado: las hojas enviadas el mismo dia son un mismo envio (Monica, 27-oct: «para el historico,
 *  deberia salir de las hojas de encargo enviadas»). */
function ofertasDeHojas(versiones: VersionHe[]) {
  const porDia = new Map<string, VersionHe[]>();
  for (const v of versiones) {
    const f = v.fechas.enviada;
    if (!f) continue;
    const k = f.slice(0, 10);
    porDia.set(k, [...(porDia.get(k) ?? []), v]);
  }
  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([fecha, hojas]) => {
      const firmada = hojas.find((v) => v.fechas.firmada_recibida);
      const todas = (e: string) => hojas.every((v) => v.estado === e);
      const estado = firmada
        ? { texto: `aceptada · firmada el ${dia(firmada.fechas.firmada_recibida)}`, clase: "bg-lima-soft text-lima-dark" }
        : todas("sustituida")
          ? { texto: "sustituida", clase: "bg-[#fdf6e3] text-[#7a5a00]" }
          : hojas.every((v) => CERRADAS.includes(v.estado))
            ? { texto: "no firmada / anulada", clase: "bg-[#f1f1f1] text-carbon/70" }
            : { texto: "sin respuesta", clase: "bg-[#fde3a0] text-[#6b4a00]" };
      return { fecha, hojas, estado };
    });
}

export function OfertasComunidad({
  id,
  ver,
  d,
  necesita,
  pedir,
  faltaClave,
  polycamRecibido,
  escaneo,
  referencia,
  informes,
  enviados,
  fotos,
  cajon,
  diario,
}: {
  id: string;
  ver: VistaOferta | null;
  d: Documentacion;
  necesita: Necesidades | null;
  pedir: DatosPedirViabilidad | null;
  /** El paso en que esta la opp (cabeceraOpp): dice si la viabilidad ya se pidio. */
  faltaClave: string | null;
  /** El Polycam, si ha llegado: su fecha («» si llego sin fecha). null, si no. */
  polycamRecibido: string | null;
  /** La visita de escaneo prevista (para el campo de fecha). */
  escaneo: string;
  referencia: string | null;
  informes: InformeGuardado[];
  enviados: CorreoEnviado[];
  fotos: ReactNode;
  cajon: ReactNode;
  diario: ReactNode;
}) {
  const todas = d.hojasNuevas.flatMap((h) => [h.actual, ...h.anteriores]);
  const actuales = d.hojasNuevas.map((h) => h.actual);
  const anterioresDe = new Map(d.hojasNuevas.map((h) => [h.actual.id, h.anteriores.length]));
  const aMedias = actuales.filter((v) => v.estado === "borrador" || v.estado === "cambios_daniel");
  const esperando = actuales.filter((v) => v.estado === "pendiente_ok_daniel");
  const listas = actuales.filter((v) => v.estado === "ok_daniel");
  const ofertas = ofertasDeHojas(todas);
  const porValidar = d.firmadas.porValidar;
  const candidatas = actuales.filter((v) => ESPERA_FIRMADA.includes(v.estado));
  const enviadasSinFirmar = actuales.filter((v) => v.estado === "enviada");
  const costes = informes.filter((x) => x.tipo === "estimacion_costes");
  const estudios = informes.filter((x) => x.tipo === "estudio_ayudas");

  // Al entrar se abre lo que pide atencion: validar si hay una aceptada sin validar; si no, preparar (OK suyo, 27-oct).
  const vista: VistaOferta = ver ?? (porValidar.length ? "validar" : "preparar");
  const href = (v: VistaOferta) => `/comercial/oportunidades/${id}?bloque=2&ver=${v}`;

  // ---------------------------------------------------------------- la viabilidad, segun el tipo y su punto
  const v = d.viabilidad;
  const necesitaViab = necesita?.viabilidad ?? true;
  const conPolycam = necesita?.polycam ?? true;
  const viabHecha = !!v && v.fase === "generada";
  const viab: { listo: boolean; estado: ReactNode; accion?: ReactNode; pista?: ReactNode } = !necesitaViab
    ? { listo: true, estado: <span className="text-carbon/70">No hace falta para este tipo de oferta.</span> }
    : viabHecha
      ? {
          listo: true,
          estado: (
            <>
              <b className="text-lima-dark">✓ Hecha</b> · {v!.historica ? "informe" : `${v!.numero ?? ""} v${v!.version}`}
              {v!.generadaEl && ` del ${dia(v!.generadaEl)}`} ·{" "}
              <a href={`/comercial/viabilidad/${v!.id}/pdf`} target="_blank" rel="noreferrer" className={ENLACE}>
                ver
              </a>
            </>
          ),
        }
      : v?.fase === "rematar"
        ? {
            listo: false,
            estado: <><b className="text-[#9a6a00]">Alex ha terminado</b> · te toca rematarla</>,
            accion: <Link href={`/comercial/viabilidad/${v.id}`} className={BOTON_P}>Rematar la viabilidad</Link>,
          }
        : v
          ? { listo: false, estado: <><b className="text-[#9a6a00]">La está haciendo Alex</b>{v.redacta && ` · ${v.redacta}`}</> }
          : conPolycam
            ? polycamRecibido !== null
              ? { listo: false, estado: <><b className="text-[#9a6a00]">Polycam recibido{polycamRecibido && ` el ${dia(polycamRecibido)}`}</b> · en la mesa de Alex</> }
              : {
                  listo: false,
                  estado: <><b className="text-[#9a6a00]">Falta el Polycam</b> · envíalo al buzón del Polycam y Alex empieza la viabilidad</>,
                  accion: (
                    <span className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                      Visita de escaneo: <EscaneoPrevisto id={id} inicial={escaneo} compacto />
                    </span>
                  ),
                }
            : faltaClave === "pedir_viabilidad" && pedir
              ? {
                  listo: false,
                  estado: <><b className="text-[#9a6a00]">Falta pedirla</b> · sin Polycam, la pides tú</>,
                  accion: <PedirViabilidad {...pedir} rotulo="Solicitar que el arquitecto estudie la viabilidad" claseBoton={BOTON_P} />,
                }
              : { listo: false, estado: <><b className="text-[#9a6a00]">Pedida al arquitecto</b> · la está estudiando</> };

  // ---------------------------------------------------------------- la hoja de encargo
  const hojaLista = listas.length > 0;
  const puedeEnviar = hojaLista && viab.listo;
  const filaHoja = (x: VersionHe, que: ReactNode) => (
    <li key={x.id} className="flex flex-wrap items-baseline gap-x-2 py-0.5 text-[12.5px]">
      <b>{x.codigo ? `${x.codigo} v${x.numero}` : "sin código aún"}</b>
      <span className="text-carbon/75">{x.tipos.join(" + ") || "Hoja de encargo"}</span>
      <b>{EUR.format(x.importe)} €</b>
      <span className="text-carbon/65">· {que}</span>
    </li>
  );

  const MENU: { grupo: string; items: { v: VistaOferta; num: string; texto: string; chip?: { n: number; aviso?: boolean } }[] }[] = [
    {
      grupo: "1 · Oferta comercial",
      items: [
        { v: "preparar", num: "1.1", texto: "Preparar una oferta para la comunidad" },
        { v: "enviadas", num: "1.2", texto: "Revisar el estado de las ofertas enviadas", chip: { n: ofertas.length } },
        { v: "validar", num: "1.3", texto: "Validar ofertas aceptadas", chip: { n: porValidar.length, aviso: porValidar.length > 0 } },
      ],
    },
    {
      grupo: "2 · Soporte para ventas",
      items: [
        { v: "costes", num: "2.1", texto: "Estudio de costes" },
        { v: "ayudas", num: "2.2", texto: "Estudio de ayudas posibles" },
        { v: "proteccion", num: "2.3", texto: "Estado de protección" },
        { v: "inmueble", num: "2.4", texto: "Informe general del inmueble" },
      ],
    },
  ];

  const titulo = (t: string, sub?: ReactNode, extra?: ReactNode) => (
    <div className="mb-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-[18px] font-bold text-carbon">{t}</h3>
        {extra && <div className="ml-auto">{extra}</div>}
      </div>
      {sub && <p className="mt-0.5 text-[13px] text-carbon/70">{sub}</p>}
    </div>
  );
  const hueco = (t: ReactNode) => (
    <div className="rounded-[12px] border-[1.5px] border-dashed border-[#cfcfcf] bg-[#fafafa] p-8 text-center text-[13px] text-carbon/65">{t}</div>
  );

  return (
    <section className="grid min-h-[620px] overflow-hidden rounded-[10px] bg-white text-[13px] text-carbon xl:grid-cols-[250px_minmax(0,1fr)_300px]">
      {/* ============================== EL MENU ============================== */}
      <nav className="border-b border-[#e6e6e6] bg-[#fafbfc] py-3.5 xl:border-b-0 xl:border-r">
        {MENU.map((g, gi) => (
          <div key={g.grupo} className={gi ? "mt-4" : ""}>
            <div className="mb-1 px-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: AZUL }}>
              {g.grupo}
            </div>
            {g.items.map((it) => (
              <Link
                key={it.v}
                href={href(it.v)}
                scroll={false}
                replace
                className={
                  "flex items-center gap-2 border-l-[3px] px-3.5 py-2 transition " +
                  (vista === it.v ? "border-[#104269] bg-[#E3EAF0] font-bold" : "border-transparent hover:bg-[#eef2f6]")
                }
              >
                <span className="min-w-[22px] text-[11.5px] text-carbon/65">{it.num}</span>
                <span className="flex-1 leading-snug">{it.texto}</span>
                {it.chip && (
                  <span className={"rounded-[20px] px-2 py-px text-[11px] font-bold " + (it.chip.aviso ? "bg-[#fde3a0] text-[#6b4a00]" : "bg-[#dbe5ee] text-[#104269]")}>
                    {it.chip.n}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
        <div className="mt-4">
          {(
            [
              { v: "fotos", num: "3", texto: "Fotos" },
              { v: "documentos", num: "4", texto: "Documentos" },
            ] as const
          ).map((it) => (
            <Link
              key={it.v}
              href={href(it.v)}
              scroll={false}
              replace
              className={
                "flex items-center gap-2 border-l-[3px] px-3.5 py-2 text-[11.5px] font-bold uppercase tracking-[0.08em] transition " +
                (vista === it.v ? "border-[#104269] bg-[#E3EAF0] text-carbon" : "border-transparent text-[#104269] hover:bg-[#eef2f6]")
              }
            >
              <span className="min-w-[22px] text-carbon/65">{it.num}</span>
              <span>{it.texto}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ============================== EL CONTENIDO ============================== */}
      <div className="min-w-0 px-5 py-4">
        {vista === "preparar" && (
          <>
            {titulo("Preparar una oferta para la comunidad", "Lo que necesitas para enviarla. Cuando todo esté en verde, se envía.")}
            {necesita && <TipoOferta oppId={id} polycam={necesita.polycam} viabilidad={necesita.viabilidad} />}
            {necesita?.aviso && <p className="mt-1.5 text-[12px] text-carbon/65">{necesita.aviso}</p>}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {/* --- 1 · la hoja de encargo con ok --- */}
              <div className={CAJA_R + (hojaLista ? " border-[#a9d18a] bg-[#f6fbf1]" : " border-[#e0b04a] bg-[#fffaf0]")}>
                <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Necesitas · 1</div>
                <div className="mt-0.5 text-[16px] font-bold">Hoja de encargo con el ok de Daniel</div>
                <div className="mt-1.5">
                  {hojaLista ? (
                    <b className="text-lima-dark">✓ Lista para enviar</b>
                  ) : esperando.length ? (
                    <><b className="text-[#9a6a00]">Esperando el ok de Daniel</b> · desde el {dia(esperando[0].fechas.pendiente_ok_daniel ?? esperando[0].creadaEn)}</>
                  ) : aMedias.length ? (
                    <><b className="text-[#9a6a00]">A medias</b> · sin pedir el ok todavía</>
                  ) : (
                    <><b className="text-[#9a6a00]">Falta</b> · no hay ninguna hoja nueva preparada</>
                  )}
                </div>
                {(listas.length > 0 || esperando.length > 0 || aMedias.length > 0) && (
                  <ul className="mt-1.5">
                    {listas.map((x) => filaHoja(x, <>con ok · <a href={`/comercial/hoja-encargo/pdf/${x.id}`} target="_blank" rel="noreferrer" className={ENLACE}>ver</a></>))}
                    {esperando.map((x) => filaHoja(x, <>esperando el ok desde el {dia(x.fechas.pendiente_ok_daniel ?? x.creadaEn)}</>))}
                    {aMedias.map((x) => filaHoja(x, <Link href={`/comercial/hoja-encargo?opp=${id}&borrador=${x.id}`} className={ENLACE}>seguir</Link>))}
                  </ul>
                )}
                <div className="mt-3">
                  <Link href={`/comercial/hoja-encargo?opp=${id}`} className={hojaLista || esperando.length ? BOTON_S : BOTON_P}>
                    + Crear hoja de encargo
                  </Link>
                </div>
                <p className="mt-2.5 border-t border-dashed border-[#e2d3a8] pt-2 text-[12px] text-carbon/65">
                  Al generarla va sola al ok de Daniel, con su presupuesto.
                </p>
              </div>

              {/* --- 2 · la viabilidad --- */}
              <div className={CAJA_R + (viab.listo ? " border-[#a9d18a] bg-[#f6fbf1]" : " border-[#e0b04a] bg-[#fffaf0]")}>
                <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Necesitas · 2</div>
                <div className="mt-0.5 text-[16px] font-bold">Viabilidad del arquitecto</div>
                <div className="mt-1.5">{viab.estado}</div>
                {viab.accion && <div className="mt-3">{viab.accion}</div>}
                {necesitaViab && (
                  <p className="mt-2.5 border-t border-dashed border-[#cfe5bc] pt-2 text-[12px] text-carbon/65">
                    {conPolycam
                      ? "Con Polycam: la pide tu envío del escaneo al buzón."
                      : "Sin Polycam: la pides con el botón «Solicitar que el arquitecto estudie la viabilidad»."}
                  </p>
                )}
              </div>
            </div>

            {/* --- enviar --- */}
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[12px] border border-[#d5dee8] bg-[#f3f6f9] px-4 py-3.5">
              <div className="min-w-[280px] flex-1">
                <b className="text-[15px]">Enviar la oferta a la comunidad</b>
                <p className="text-[12.5px] text-carbon/70">
                  Se activa cuando tengas la hoja con ok{necesitaViab ? " y la viabilidad" : ""}. Con varias hojas te preguntará: ¿un presupuesto por hoja o uno para todas?
                </p>
                <div className="mt-2 text-[12.5px]">
                  <div className="text-carbon/70">Adjuntar también (opcional):</div>
                  <div className="mt-1 grid grid-cols-[repeat(2,max-content)] gap-x-7 gap-y-1">
                    <label className="whitespace-nowrap"><input type="checkbox" form="enviar-oferta" name="adjuntar" value="costes" disabled={!costes.length} /> Estudio de costes</label>
                    <label className="whitespace-nowrap"><input type="checkbox" form="enviar-oferta" name="adjuntar" value="ayudas" disabled={!estudios.length} /> Estudio de ayudas posibles</label>
                    <label className="whitespace-nowrap text-carbon/50"><input type="checkbox" disabled /> Estado de protección · próximamente</label>
                    <label className="whitespace-nowrap"><input type="checkbox" form="enviar-oferta" name="adjuntar" value="inmueble" disabled={!referencia} /> Informe general del inmueble</label>
                  </div>
                </div>
              </div>
              <form id="enviar-oferta" action={`/comercial/oportunidades/${id}/enviar`} method="get">
                <button
                  disabled={!puedeEnviar}
                  title={puedeEnviar ? undefined : `Falta ${!hojaLista ? "una hoja con el ok de Daniel" : "la viabilidad"}`}
                  className="rounded-[8px] bg-lima px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-lima-dark disabled:cursor-not-allowed disabled:bg-[#cfcfcf] disabled:text-[#666]"
                >
                  ✉ Enviar oferta por mail
                </button>
              </form>
            </div>
          </>
        )}

        {vista === "enviadas" && (
          <>
            {titulo(
              "Ofertas enviadas",
              "Cada envío, con lo que llevaba y cuánto tiempo lleva sin respuesta.",
              ofertas[0] && <span className="text-[12.5px] text-carbon/65">{ofertas.length} · la última {hace(ofertas[0].fecha)}</span>,
            )}
            {enviados.length > 0 && (
              <details className="mb-3 rounded-[10px] border border-[#d9d9d9] px-3.5 py-2" open>
                <summary className="cursor-pointer text-[12.5px] font-bold" style={{ color: AZUL }}>
                  Lo enviado desde la app · {enviados.length} {enviados.length === 1 ? "correo" : "correos"}
                </summary>
                <ul className="mt-1 divide-y divide-[#f0f0f0]">
                  {enviados.map((c) => (
                    <li key={c.id} className="grid gap-x-3 py-2 text-[12.5px] md:grid-cols-[130px_minmax(0,1fr)]">
                      <b>{HORA.format(new Date(c.creado_en))}</b>
                      <div>
                        <b>{c.asunto}</b>
                        {!c.ok && <span className="font-semibold text-alerta"> · no salió</span>}
                        <div className="text-carbon/70">a {c.para.join(", ")}{c.enviador && ` · desde ${c.enviador.nombre}`}</div>
                        {c.documentos.length > 0 && (
                          <div className="mt-0.5">
                            📎{" "}
                            {c.documentos.map((x, i) => (
                              <span key={x.id}>
                                {i > 0 && " · "}
                                <a href={x.enlace} target="_blank" rel="noreferrer" className={ENLACE}>{x.nombre}</a>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {ofertas.length === 0 && !enviados.length ? (
              hueco("Todavía no se ha enviado ninguna oferta a esta comunidad.")
            ) : (
              <div className="flex flex-col gap-2.5">
                {ofertas.map((o) => (
                  <div key={o.fecha} className={"rounded-[12px] border border-[#d9d9d9] px-4 py-3 " + (o.estado.texto === "sustituida" ? "bg-[#fafafa]" : "")}>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <b className="text-[15px]">{dia(o.fecha)}</b>
                      <span className="text-[12px] text-carbon/65">{hace(o.fecha)}</span>
                      <span className={"rounded-[20px] px-2 py-px text-[11px] font-bold " + o.estado.clase}>{o.estado.texto}</span>
                      <span className="text-[12px] text-carbon/65">
                        {o.hojas.length} {o.hojas.length === 1 ? "hoja" : "hojas"} · {EUR.format(o.hojas.reduce((t, x) => t + x.importe, 0))} €
                      </span>
                    </div>
                    <ul className="mt-1 divide-y divide-[#eee]">
                      {o.hojas.map((x) => (
                        <Fila key={x.id} oppId={id} v={x} anteriores={anterioresDe.get(x.id) ?? 0} fases={FASE_HE} firmadas={d.firmadas.enlace} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {vista === "validar" && (
          <>
            {titulo("Validar ofertas aceptadas", "Cuando la comunidad devuelve la hoja firmada, se comprueba antes de pasarla a facturación.")}
            {porValidar.length === 0 ? (
              hueco("Ahora no hay ninguna pendiente. Cuando llegue una hoja firmada (por el portal o al subirla en Documentos), sale aquí.")
            ) : (
              porValidar.map((doc) => <PorValidar key={doc.id} oppId={id} doc={doc} candidatas={candidatas} />)
            )}
            {(porValidar.length > 0 || todas.some((x) => x.fechas.firmada_recibida)) && enviadasSinFirmar.length > 0 && (
              <div className="mt-4 rounded-[12px] border border-[#ecc96a] bg-[#fdf3d7] px-4 py-3">
                <b className="text-[#5a3d00]">
                  Quedan {enviadasSinFirmar.length} {enviadasSinFirmar.length === 1 ? "hoja enviada" : "hojas enviadas"} sin firmar. ¿Qué hacemos con ellas?
                </b>
                <p className="text-[12px] text-[#6b4a00]">Si se mantienen, no hay que hacer nada. Si no las van a firmar: «no firmada», con el motivo.</p>
                <ul className="mt-1 divide-y divide-[#ecd9a0]">
                  {enviadasSinFirmar.map((x) => (
                    <Fila key={x.id} oppId={id} v={x} anteriores={anterioresDe.get(x.id) ?? 0} fases={FASE_HE} firmadas={d.firmadas.enlace} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {(vista === "costes" || vista === "ayudas") &&
          (() => {
            const lista = vista === "costes" ? costes : estudios;
            const ruta = vista === "costes" ? "/referencia/estimacion" : "/referencia/subvenciones";
            const informe = vista === "costes" ? "/referencia/estimacion/informe/" : "/referencia/subvenciones/estudio/";
            return (
              <>
                {titulo(
                  vista === "costes" ? "Estudio de costes" : "Estudio de ayudas posibles",
                  vista === "costes"
                    ? "Lo que costaría la obra, las ayudas y cuánto sube si se espera. Útil también para la junta."
                    : "Qué ayudas podría pedir, cuándo llegarían y lo que cubren de verdad si se espera.",
                  <Link href={ruta} className={BOTON_P}>+ Emitir</Link>,
                )}
                {lista.length === 0 ? (
                  hueco("Todavía no se ha emitido ninguno para esta opp.")
                ) : (
                  <ul className="divide-y divide-[#eee]">
                    {lista.map((x) => (
                      <li key={x.id} className="flex flex-wrap gap-x-2 py-2 text-[13px]">
                        <a href={informe + x.id} className={ENLACE}>{HORA.format(new Date(x.creado_en))}</a>
                        <span>· {x.datos.obra}</span>
                        {vista === "costes" && x.datos.precios && <span>· {EUR.format(Math.round(x.datos.precios.hoy))} € con IVA</span>}
                        {x.autor && <span className="text-carbon/65">· {x.autor.nombre}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            );
          })()}

        {vista === "proteccion" && (
          <>
            {titulo("Estado de protección", "Si el edificio está protegido, qué se puede hacer.")}
            {hueco("Próximamente.")}
          </>
        )}

        {vista === "inmueble" && (
          <>
            {titulo(
              "Informe general del inmueble",
              "Todo lo que se sabe del edificio con la dirección. El mismo informe del bloque 1, aquí a mano.",
              referencia && (
                <a href={`/comercial/oportunidades/${id}/anexo`} target="_blank" rel="noreferrer" className={BOTON_S}>
                  Abrir el PDF
                </a>
              ),
            )}
            {referencia ? (
              <iframe src={`/comercial/oportunidades/${id}/anexo#view=FitH`} title="Informe general del inmueble" className="h-[900px] w-full rounded-[10px] border border-carbon/20 bg-white" />
            ) : (
              hueco("Esta oportunidad no tiene referencia catastral: el informe sale cuando se fije la dirección.")
            )}
          </>
        )}

        {vista === "fotos" && (
          <>
            {titulo("Fotos", "Las de las notas del diario y las que se suban aquí.")}
            {fotos}
          </>
        )}

        {vista === "documentos" && (
          <>
            {titulo("Documentos", "Lo que haga falta: CIF, actas, planos, la orden de compra, el presupuesto de la contrata…")}
            {cajon}
          </>
        )}
      </div>

      {/* ============================== EL DIARIO, integrado ============================== */}
      <aside className="min-w-0 border-t border-[#e6e6e6] px-3 py-4 xl:border-l xl:border-t-0">
        <div className="mb-1.5 px-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em]" style={{ color: AZUL }}>
          Diario
        </div>
        {diario}
      </aside>
    </section>
  );
}
