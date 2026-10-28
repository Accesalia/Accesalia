import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import type { Documentacion } from "../../../../lib/bloqueDocumentacion";
import type { VersionHe } from "../../../../lib/hojasOpp";
import type { Negociacion } from "../../../../lib/negociacion";
import type { CorreoEnviado } from "../../../../lib/envioCorreo";
import { RESULTADOS_JUNTA } from "../../../../lib/gestionOportunidad";
import { informeEdificio } from "../../../../lib/informeEdificio";
import { ofertasDeHojas } from "./OfertasComunidad";
import { AgendarReunion } from "./AgendarReunion";

// BLOQUE 3 · SEGUIMIENTO Y NEGOCIACION (Monica, 28-oct-2026; maqueta docs/figma/bloque3-seguimiento.html, «TODO OK, la
// montamos»). «La cabeza del comercial, su verdadero dia a dia»: aqui no se ven informes ni se crean hojas; se tiene
// delante lo que sirve para negociar y se apunta que se habla, cuando y con quien. Une el bloque 3 y el 4 de antes:
// sale con un SI (hoja firmada) o un NO (motivo). Mismo marco que el bloque 2 (menu, contenido), sin diario a la
// derecha: el diario esta en «Contactos con la comunidad».
//
// TODO CERRADO (regla suya, 28-oct): cuando cada hoja enviada ha llegado a su final -firmada, o no firmada / anulada /
// sustituida-. Mientras quede alguna en el aire, la negociacion sigue abierta: «y asi no hay ofertas en el limbo dos
// años despues». Lo que no este cerrado ira a la pantalla «Despeja la mesa» (pendiente).

const AZUL = "#104269";
const ENLACE = "font-semibold text-[#104269] underline-offset-2 hover:underline";
const CAJA = "rounded-[12px] border border-[#d9d9d9] px-4 py-3";
const H4 = "mb-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-[#104269]";
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const dia = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const HORA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export type VistaNegociacion = "quien" | "quieren" | "ayudas" | "ofertas" | "contactos" | "juntas" | "cambios" | "resultado";
export const VISTAS_NEGOCIACION: VistaNegociacion[] = ["quien", "quieren", "ayudas", "ofertas", "contactos", "juntas", "cambios", "resultado"];

const FIRMADAS = ["firmada_recibida", "ok_comercial", "hitos_validados", "primer_cobro", "ok_administracion"];
const CERRADAS = ["no_firmada", "anulada", "sustituida"];

/** El resultado de la negociacion, de las hojas enviadas (regla «todo cerrado»). */
function resultadoDe(versiones: VersionHe[]) {
  const enviadas = versiones.filter((v) => v.fechas.enviada);
  const firmadas = enviadas.filter((v) => FIRMADAS.includes(v.estado));
  const pendientes = enviadas.filter((v) => !FIRMADAS.includes(v.estado) && !CERRADAS.includes(v.estado));
  const cerrado = enviadas.length > 0 && pendientes.length === 0;
  const texto = !enviadas.length
    ? { t: "Sin oferta enviada todavía", c: "gris" as const }
    : firmadas.length && pendientes.length
      ? { t: "SÍ A UNA PARTE", c: "parte" as const }
      : firmadas.length
        ? { t: "SÍ", c: "si" as const }
        : cerrado
          ? { t: "NO", c: "no" as const }
          : { t: "Esperando respuesta", c: "espera" as const };
  return { enviadas, firmadas, pendientes, cerrado, texto };
}

/** Las ayudas del bloque 1, resumidas: lo que podria pedir y lo concedido cerca. Se pinta cuando llega (Catastro). */
async function AyudasDelEdificio({ referencia, oppId }: { referencia: string; oppId: string }) {
  const i = await informeEdificio(referencia).catch(() => null);
  if (!i) return <p className="text-[13px] text-carbon/65">No se ha podido traer el informe del edificio ahora mismo.</p>;
  const pedir = (i.secciones.find((s) => s.titulo === "Dinero: a qué ayudas entra")?.datos ?? []).filter((d) => !/concedi|CO₂/i.test(d.que));
  const total = i.subvencionesCerca.reduce((t, s) => t + (s.importe ?? 0), 0);
  return (
    <>
      <div className={CAJA}>
        <div className={H4}>Las que podría pedir</div>
        {pedir.length === 0 ? (
          <p className="text-[13px] text-carbon/65">El informe no da ayudas para este edificio.</p>
        ) : (
          <ul className="divide-y divide-[#f0f0f0]">
            {pedir.map((x, n) => (
              <li key={n} className="grid gap-x-3 py-1.5 text-[12.5px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <b>{x.que}</b>
                <span className={"falta" in x && x.falta ? "text-carbon/55" : ""}>{x.valor}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={CAJA + " mt-3"}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className={H4}>{i.ambitoSubvenciones === "entorno" ? "Concedidas en el entorno" : "Concedidas a menos de 800 m"}</div>
          {i.subvencionesCerca.length > 0 && (
            <span className="text-[12.5px]"><b>{EUR.format(Math.round(total))} €</b> en {i.subvencionesCerca.length} obras</span>
          )}
        </div>
        {i.subvencionesCerca.length === 0 ? (
          <p className="text-[13px] text-carbon/65">No hay concedidas cerca registradas.</p>
        ) : (
          <ul className="divide-y divide-[#f0f0f0]">
            {i.subvencionesCerca.slice(0, 8).map((s, n) => (
              <li key={n} className="grid gap-x-3 py-1.5 text-[12.5px] md:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)_60px]">
                <b>{s.direccion}</b>
                <span className="text-right tabular-nums">{s.importe == null ? "—" : `${EUR.format(Math.round(s.importe))} €`}</span>
                <span className="text-carbon/70">{s.convocatoria ?? "—"}</span>
                <span className="text-right tabular-nums text-carbon/70">{s.anio ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-[12px] text-carbon/65">
        Es lo mismo que el informe del bloque 1, resumido para tenerlo delante al negociar ·{" "}
        <Link href={`/comercial/oportunidades/${oppId}?bloque=1`} className={ENLACE}>ver el bloque 1</Link>
      </p>
    </>
  );
}

export function SeguimientoNegociacion({
  id,
  ver,
  nombreOpp,
  d,
  neg,
  contactos,
  trajo,
  quieren,
  referencia,
  polycam,
  tresD,
  enviados,
  diario,
  cierres,
  formulario3D,
  editorJuntas,
}: {
  id: string;
  ver: VistaNegociacion | null;
  nombreOpp: string;
  d: Documentacion;
  neg: Negociacion;
  contactos: { nombre: string; telefono: string | null; papel: string | null }[];
  trajo: string | null;
  quieren: string[];
  referencia: string | null;
  polycam: string | null;
  tresD: { tipo: string | null; estado: string | null } | null;
  enviados: CorreoEnviado[];
  diario: ReactNode;
  cierres: { resultado_final: string | null; motivo_perdido: string | null; fecha_cierre: string | null }[];
  /** El formulario del 3D (tipo, como va, fechas), que estaba en el bloque 3 de antes. */
  formulario3D: ReactNode;
  /** Apuntar y corregir las juntas (fecha, resultado, que paso, seguimiento). */
  editorJuntas: ReactNode;
}) {
  const vista: VistaNegociacion = ver ?? "quien";
  const href = (v: VistaNegociacion) => `/comercial/oportunidades/${id}?bloque=3&ver=${v}`;
  const todas = d.hojasNuevas.flatMap((h) => [h.actual, ...h.anteriores]);
  const ofertas = ofertasDeHojas(todas);
  const r = resultadoDe(todas);
  const juntaCelebrada = neg.juntas.find((j) => j.celebrada);
  const ahora = Date.now();
  const resultadoJunta = (v: string | null) => RESULTADOS_JUNTA.find((x) => x.valor === v)?.texto ?? v ?? "—";
  const queEs = (x: VersionHe) => `${x.codigo ? `${x.codigo} v${x.numero}` : "sin código"} · ${x.tipos.join(" + ") || "hoja de encargo"} · ${EUR.format(x.importe)} €`;

  const MENU: { v: VistaNegociacion; num: string; texto: string; chip?: string }[] = [
    { v: "quien", num: "1", texto: "Quién es quién", chip: neg.admins.length ? `${neg.admins.length} ${neg.admins.length === 1 ? "admin" : "admins"}` : undefined },
    { v: "quieren", num: "2", texto: "Lo que quieren" },
    { v: "ayudas", num: "3", texto: "Ayudas" },
    { v: "ofertas", num: "4", texto: "Ofertas presentadas", chip: ofertas.length ? String(ofertas.length) : undefined },
    { v: "contactos", num: "5", texto: "Contactos con la comunidad", chip: enviados.length ? `${enviados.length} correos` : undefined },
    { v: "juntas", num: "6", texto: "Juntas y reuniones", chip: juntaCelebrada ? `junta ${dia(juntaCelebrada.fecha).slice(0, 5)}` : neg.juntas[0]?.fecha ? `junta ${dia(neg.juntas[0].fecha).slice(0, 5)}` : undefined },
    { v: "cambios", num: "7", texto: "Cambios a la oferta", chip: neg.cambios.length ? String(neg.cambios.length) : undefined },
  ];
  const colorRes = { si: "border-[#a9d18a] bg-[#eef7e4]", parte: "border-[#a9d18a] bg-[#eef7e4]", no: "border-[#e0b0ae] bg-[#fbeeee]", espera: "border-[#e0c070] bg-[#fdf6e3]", gris: "border-[#d9d9d9] bg-[#fafafa]" }[r.texto.c];
  const titulo = (t: string, sub?: ReactNode) => (
    <div className="mb-3">
      <h3 className="text-[18px] font-bold text-carbon">{t}</h3>
      {sub && <p className="mt-0.5 text-[13px] text-carbon/70">{sub}</p>}
    </div>
  );
  const hueco = (t: ReactNode) => <div className="rounded-[12px] border-[1.5px] border-dashed border-[#cfcfcf] bg-[#fafafa] p-6 text-center text-[13px] text-carbon/65">{t}</div>;
  const porMontar = (titulo: string, pista: string) => (
    <div className="rounded-[12px] border border-dashed border-[#cfcfcf] bg-[#fcfcfa] px-4 py-3">
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">{titulo}</div>
      <div className="mt-1 rounded-[6px] border border-dashed border-[#cfcfcf] bg-white px-2 py-1 text-[12px] text-carbon/60">✎ {pista}</div>
      <div className="mt-1 text-[11px] text-carbon/50">Falta su sitio en la base: pendiente de tu ok.</div>
    </div>
  );

  return (
    <section className="grid min-h-[620px] overflow-hidden rounded-[10px] bg-white text-[13px] text-carbon xl:grid-cols-[250px_minmax(0,1fr)]">
      {/* ============================== EL MENU ============================== */}
      <nav className="border-b border-[#e6e6e6] bg-[#fafbfc] py-3.5 xl:border-b-0 xl:border-r">
        <div className="mb-1 px-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: AZUL }}>La negociación</div>
        {MENU.map((it) => (
          <Link
            key={it.v}
            href={href(it.v)}
            scroll={false}
            replace
            className={"flex items-center gap-2 border-l-[3px] px-3.5 py-2 transition " + (vista === it.v ? "border-[#104269] bg-[#E3EAF0] font-bold" : "border-transparent hover:bg-[#eef2f6]")}
          >
            <span className="min-w-[18px] text-[11.5px] text-carbon/65">{it.num}</span>
            <span className="flex-1 leading-snug">{it.texto}</span>
            {it.chip && <span className="rounded-[20px] bg-[#dbe5ee] px-2 py-px text-[11px] font-bold text-[#104269]">{it.chip}</span>}
          </Link>
        ))}
        {/* EL RESULTADO, fijo bajo el menu: a que dijeron que si y lo pendiente. */}
        <Link href={href("resultado")} scroll={false} replace className={"mx-3 mt-4 block rounded-[10px] border px-3 py-2.5 text-[12px] " + colorRes + (vista === "resultado" ? " outline outline-2 outline-[#104269]" : "")}>
          <span className="text-carbon/65">Resultado</span>
          <b className="block text-[13.5px]" style={{ color: r.texto.c === "no" ? "#9f3a38" : r.texto.c === "si" || r.texto.c === "parte" ? "#3f7a1c" : "#6b4a00" }}>{r.texto.t}</b>
          {r.firmadas.length > 0 && <span className="block">a {r.firmadas.map((x) => x.tipos.join(" + ") || x.codigo).join(" · ")}</span>}
          {juntaCelebrada && <span className="block text-carbon/70">junta del {dia(juntaCelebrada.fecha)}</span>}
          {r.pendientes.length > 0 && r.firmadas.length > 0 && (
            <span className="mt-1 block text-[#7a5a00]"><b>Pendiente:</b> {r.pendientes.map((x) => `${x.tipos.join(" + ") || x.codigo} (${EUR.format(x.importe)} €)`).join(" · ")}</span>
          )}
        </Link>
      </nav>

      {/* ============================== EL CONTENIDO ============================== */}
      <div className="min-w-0 px-5 py-4">
        {d.firmadas.porValidar.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[10px] border-[1.5px] border-[#ecc96a] bg-[#fdf3d7] px-3 py-2 text-[#5a3d00]">
            <b>Hoja firmada, pendiente de que la valides para poder cobrarla.</b>
            <Link href={`/comercial/oportunidades/${id}?bloque=2&ver=validar`} className={ENLACE + " ml-auto"}>Validarla en Ofertas a la comunidad →</Link>
          </div>
        )}

        {vista === "quien" && (
          <>
            {titulo("Quién es quién", "Las personas de esta negociación, con lo que sabemos de cada una.")}
            <div className="grid gap-3 lg:grid-cols-2">
              {neg.admins.length === 0 && hueco("Esta comunidad no tiene administrador apuntado. Se pone en la cabecera, en «Administración».")}
              {neg.admins.map((a) => (
                <div key={(a.personaId ?? "") + (a.empresaId ?? "")} className={CAJA}>
                  <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Administrador</div>
                  <div className="text-[15.5px] font-bold">{a.persona}</div>
                  <div className="text-carbon/70">
                    {[a.empresa, a.telefono].filter(Boolean).join(" · ")}
                    {a.empresaId && <> · <Link href={`/administracion/administraciones/${a.empresaId}`} className={ENLACE}>su ficha</Link></>}
                  </div>
                  <div className="mt-1.5 text-[12.5px]">
                    <b>Comisión:</b> {a.comision ?? <span className="text-carbon/65">sin acuerdo apuntado</span>}
                    {a.cobraOtro && <div className="mt-1 rounded-[8px] border border-[#d5dee8] bg-[#f3f6f9] px-2 py-1">{a.cobraOtro}</div>}
                  </div>
                  <div className="mt-1.5 text-[12.5px]">
                    <b>Con nosotros, últimos 12 meses:</b> nos ha traído {a.traidas12} {a.traidas12 === 1 ? "opp" : "opps"} · {a.firmadas12} {a.firmadas12 === 1 ? "firmada" : "firmadas"}
                  </div>
                </div>
              ))}
              {contactos.length > 0 && (
                <div className={CAJA}>
                  <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">La comunidad</div>
                  <ul className="mt-1 divide-y divide-[#f0f0f0]">
                    {contactos.map((c, n) => (
                      <li key={n} className="flex flex-wrap gap-x-2 py-1 text-[12.5px]">
                        <b>{c.nombre}</b>
                        {c.papel && <span className="text-carbon/70">{c.papel}</span>}
                        {c.telefono && <span className="tabular-nums text-carbon/70">· {c.telefono}</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-1 text-[11.5px] text-carbon/60">Se añaden en la cabecera, en «+ añadir contacto».</div>
                </div>
              )}
              <div className={CAJA}>
                <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Nos llegó a través de</div>
                <div className="text-[14px] font-bold">{trajo ?? <span className="font-normal text-carbon/65">no se apuntó (se pone en la cabecera)</span>}</div>
              </div>
              {porMontar("Presidente y sus notas", "«es mayor», «era ingeniero», «trabaja en Schindler», «está en contra del ascensor»…")}
              {porMontar("Comisión de obras", "¿Hay? ¿Quién la forma?")}
              {porMontar("Vecinos que empujan la decisión", "a favor o en contra, y por qué: «el del bajo va a denunciar», «la del 4º va en silla de ruedas»")}
              {porMontar("Contrata", "¿La tienen elegida? ¿Hay presupuesto previo? ¿De quién?")}
              {porMontar("Competencia", "¿Han pedido oferta a otro arquitecto? ¿A quién y por cuánto?")}
            </div>
          </>
        )}

        {vista === "quieren" && (
          <>
            {titulo("Lo que quieren", "Qué piden, lo que les dijimos que cuesta y lo que condiciona el proyecto.")}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className={CAJA}>
                <div className={H4}>Qué quieren</div>
                {quieren.length ? <ul className="text-[13px]">{quieren.map((q) => <li key={q}>· {q}</li>)}</ul> : <p className="text-carbon/65">No se apuntó (se pone en la cabecera).</p>}
              </div>
              <div className={CAJA}>
                <div className={H4}>La viabilidad</div>
                {d.viabilidad ? (
                  <p className="text-[13px]">
                    {d.viabilidad.historica ? "Informe" : `${d.viabilidad.numero ?? ""} v${d.viabilidad.version}`}
                    {d.viabilidad.generadaEl && ` del ${dia(d.viabilidad.generadaEl)}`} ·{" "}
                    {d.viabilidad.fase === "generada" ? (
                      <a href={`/comercial/viabilidad/${d.viabilidad.id}/pdf`} target="_blank" rel="noreferrer" className={ENLACE}>ver</a>
                    ) : (
                      <span className="text-carbon/65">sin generar todavía</span>
                    )}
                  </p>
                ) : (
                  <p className="text-carbon/65">Sin viabilidad.</p>
                )}
              </div>
              <div className={CAJA}>
                <div className={H4}>Condicionantes</div>
                <p className="text-[13px] text-carbon/75">
                  Protección, modelos homogéneos, restricciones del edificio: están en el bloque 1 ·{" "}
                  <Link href={`/comercial/oportunidades/${id}?bloque=1`} className={ENLACE}>ver el bloque 1</Link>
                </p>
              </div>
              <div className={CAJA}>
                <div className={H4}>Polycam y 3D</div>
                <p className="text-[13px]">Polycam: {polycam !== null ? <b>recibido{polycam && ` el ${dia(polycam)}`}</b> : <span className="text-carbon/65">no ha llegado</span>}</p>
                <p className="text-[13px]">3D: {tresD?.estado ? <b>{tresD.estado}</b> : <span className="text-carbon/65">sin pedir</span>}</p>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-[12.5px] font-bold text-[#104269]">El 3D para la junta: pedirlo o apuntar cómo va</summary>
              <div className="mt-2 max-w-[560px]">{formulario3D}</div>
            </details>
          </>
        )}

        {vista === "ayudas" && (
          <>
            {titulo("Ayudas", "Sale todo del bloque 1: lo que podría pedir y lo que se ha concedido cerca.")}
            {referencia ? (
              <Suspense fallback={<p className="animate-pulse text-[12.5px] text-carbon/60">Trayendo las ayudas del informe del edificio…</p>}>
                <AyudasDelEdificio referencia={referencia} oppId={id} />
              </Suspense>
            ) : (
              hueco("Esta oportunidad no tiene referencia catastral: las ayudas salen cuando se fije la dirección.")
            )}
          </>
        )}

        {vista === "ofertas" && (
          <>
            {titulo("Ofertas presentadas", "Qué se envió, cuándo, qué contenía y qué pasó. Es el mismo historial del bloque 2.")}
            {ofertas.length === 0 ? (
              hueco("Todavía no se ha enviado ninguna oferta.")
            ) : (
              <div className="flex flex-col gap-2.5">
                {ofertas.map((o) => (
                  <div key={o.fecha} className={CAJA}>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <b className="text-[15px]">{dia(o.fecha)}</b>
                      <span className={"rounded-[20px] px-2 py-px text-[11px] font-bold " + o.estado.clase}>{o.estado.texto}</span>
                    </div>
                    <ul className="mt-1">
                      {o.hojas.map((x) => (
                        <li key={x.id} className="py-0.5 text-[12.5px]">
                          <b>{queEs(x)}</b>
                          <span className={FIRMADAS.includes(x.estado) ? " font-bold text-lima-dark" : CERRADAS.includes(x.estado) ? " text-carbon/60" : " font-bold text-[#9a6a00]"}>
                            {" · "}
                            {FIRMADAS.includes(x.estado) ? "firmada" : x.estado === "no_firmada" ? "no firmada" : x.estado === "anulada" ? "anulada" : x.estado === "sustituida" ? "sustituida" : "sin firmar: pendiente de que decidan"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[12px] text-carbon/65">
              Para enviar otra o cambiar una: <Link href={`/comercial/oportunidades/${id}?bloque=2`} className={ENLACE}>Ofertas a la comunidad</Link>
            </p>
          </>
        )}

        {vista === "contactos" && (
          <>
            {titulo("Contactos con la comunidad", "Todo lo hablado: las notas del diario y los correos.")}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className={CAJA}>
                <div className={H4}>El diario</div>
                {diario}
              </div>
              <div className={CAJA}>
                <div className={H4}>Correos</div>
                {enviados.length === 0 ? (
                  <p className="text-[12.5px] text-carbon/65">Enviados desde la app: ninguno todavía.</p>
                ) : (
                  <ul className="divide-y divide-[#f0f0f0]">
                    {enviados.map((c) => (
                      <li key={c.id} className="py-1.5 text-[12.5px]">
                        <div className="text-[11px] text-carbon/65">
                          <b>{dia(c.creado_en)}</b> · enviado a {c.para.join(", ")}
                        </div>
                        <b>{c.asunto}</b>
                        {c.documentos.length > 0 && <div className="text-carbon/70">📎 {c.documentos.map((x) => x.nombre).join(" · ")}</div>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[12px] text-carbon/55">Recibidos: próximamente, cuando se guarden los correos de la comunidad.</p>
              </div>
            </div>
          </>
        )}

        {vista === "juntas" && (
          <>
            {titulo("Juntas y reuniones", "Agenda desde aquí, sin abrir la agenda: se guarda en la agenda, y lo de la agenda con esta comunidad sale aquí.")}
            <AgendarReunion oppId={id} nombreOpp={nombreOpp} />
            <div className={CAJA + " mt-3"}>
              <div className={H4}>En la agenda con esta comunidad</div>
              {neg.citas.length === 0 ? (
                <p className="text-[12.5px] text-carbon/65">Nada en la agenda todavía.</p>
              ) : (
                <ul className="divide-y divide-[#f0f0f0]">
                  {neg.citas.map((c) => {
                    const futura = Date.parse(c.inicio) > ahora;
                    return (
                      <li key={c.id} className={"grid gap-x-3 px-1 py-1.5 text-[12.5px] md:grid-cols-[200px_minmax(0,1fr)_auto] " + (futura ? "bg-[#f6f9fb]" : "text-carbon/55")}>
                        <b className={futura ? "text-[#104269]" : ""}>{HORA.format(new Date(c.inicio))}</b>
                        <span>{c.asunto}{c.direccion && <span className="text-carbon/60"> · {c.direccion}</span>}</span>
                        <span>{c.estado === "anulada" ? "anulada" : futura ? <b className="rounded-[20px] bg-[#dbe5ee] px-2 py-px text-[11px] text-[#104269]">próxima</b> : "pasada"}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {neg.juntas.map((j) => (
              <div key={j.id} className={"mt-3 rounded-[12px] border-[1.5px] px-4 py-3 " + (j.celebrada ? "border-[#a9d18a] bg-[#f6fbf1]" : "border-[#d9d9d9]")}>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <b className="text-[16px]">Junta{j.fecha ? ` del ${dia(j.fecha)}` : " sin fecha"}</b>
                  <span className="rounded-[20px] bg-white px-2 py-px text-[11px] font-bold text-lima-dark">{j.celebrada ? "celebrada" : "sin celebrar"} · {resultadoJunta(j.resultado)}</span>
                  {j.seguimiento && <span className="text-[12px] font-semibold text-[#9a6a00]">requiere seguimiento</span>}
                </div>
                {j.detalle && <p className="mt-1.5 text-[12.5px]"><b>Lo que pasó:</b> {j.detalle}</p>}
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  {["Documentación llevada", "Quórum", "Votos a favor / en contra", "Sí a una parte: ¿a qué?"].map((t) => (
                    <div key={t} className="rounded-[8px] border border-dashed border-[#cfcfcf] bg-white px-2 py-1.5 text-[12px]">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/60">{t}</div>
                      <div className="italic text-carbon/50">pendiente de tu ok</div>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11.5px] text-carbon/55">Si votan no, no se pide el acta: se apunta el motivo.</p>
              </div>
            ))}
            <details className="mt-3" open={neg.juntas.length === 0}>
              <summary className="cursor-pointer text-[12.5px] font-bold text-[#104269]">Apuntar o corregir una junta: fecha, resultado, qué pasó</summary>
              <div className="mt-2">{editorJuntas}</div>
            </details>
          </>
        )}

        {vista === "cambios" && (
          <>
            {titulo("Cambios a la oferta", "Lo que han pedido cambiar, quién y cuándo. Se piden desde «modificar» en Ofertas a la comunidad.")}
            {neg.cambios.length === 0 ? (
              hueco("No han pedido cambios.")
            ) : (
              <ul className="divide-y divide-[#eee]">
                {neg.cambios.map((c, n) => (
                  <li key={n} className="py-2 text-[12.5px]">
                    <div className="text-[11px] text-carbon/65">
                      <b>{dia(c.fecha)}</b> · {c.estado === "cambios_comunidad" ? "lo pide la comunidad" : "lo pide el comercial"}
                      {c.quien && ` · apuntado por ${c.quien}`} · {c.version}
                    </div>
                    {c.nota ?? <span className="text-carbon/60">sin nota</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {vista === "resultado" && (
          <>
            {titulo("Resultado de la negociación", "De aquí se sale con un sí y la hoja firmada, o con un no y su motivo.")}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className={"rounded-[12px] border-[1.5px] px-4 py-3 " + colorRes}>
                <b className="text-[16px]">{r.texto.t}</b>
                {juntaCelebrada && <span className="text-carbon/70"> · junta del {dia(juntaCelebrada.fecha)}</span>}
                {r.firmadas.map((x) => <div key={x.id} className="mt-1.5 text-[12.5px]">{queEs(x)} · <b className="text-lima-dark">firmada ✓</b></div>)}
                {r.pendientes.map((x) => (
                  <div key={x.id} className="mt-1.5 text-[12.5px] text-[#7a5a00]">
                    <b>Pendiente:</b> {queEs(x)} · enviada el {dia(x.fechas.enviada)}
                  </div>
                ))}
                {r.pendientes.length > 0 && (
                  <div className="mt-2 border-t border-dashed border-[#c9dfb2] pt-2 text-[12.5px] text-[#5a3d00]">
                    <b>La negociación sigue abierta</b> hasta que lo pendiente se cierre: o la firman, o se marca «no firmada» con su motivo (en{" "}
                    <Link href={`/comercial/oportunidades/${id}?bloque=2&ver=enviadas`} className={ENLACE}>Ofertas enviadas</Link>).
                  </div>
                )}
                {r.cerrado && <div className="mt-2 text-[12.5px] font-bold text-lima-dark">Todo cerrado: cada hoja enviada ha llegado a su final.</div>}
              </div>
              <div className="rounded-[12px] border border-dashed border-[#cfcfcf] bg-[#fafafa] px-4 py-3 text-[12.5px]">
                <b>Si dicen que no</b>
                {cierres[0] ? (
                  <div className="mt-1.5">
                    {cierres[0].resultado_final && <div><b>Resultado:</b> {cierres[0].resultado_final}</div>}
                    {cierres[0].motivo_perdido && <div><b>Por qué:</b> {cierres[0].motivo_perdido}</div>}
                    {cierres[0].fecha_cierre && <div><b>Cerrada el</b> {dia(cierres[0].fecha_cierre)}</div>}
                  </div>
                ) : (
                  <p className="mt-1.5 text-carbon/65">Se cierra con «Cerrar» en el estado de la opp (arriba a la derecha), con su motivo.</p>
                )}
                {r.enviadas.filter((x) => x.estado === "no_firmada").map((x) => (
                  <div key={x.id} className="mt-1">{queEs(x)} · no firmada{x.ultimo?.nota && `: ${x.ultimo.nota}`}</div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
