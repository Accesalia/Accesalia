import Link from "next/link";
import type { ReactNode } from "react";
import type { Documentacion } from "../../../../lib/bloqueDocumentacion";
import type { Gestion } from "../../../../lib/gestionOportunidad";
import { ESTADOS_3D, TIPOS_3D } from "../../../../lib/gestionOportunidad";
import { estadoDeHoja } from "../../../../lib/estadoHoja";
import { FASE_HE } from "../../../../lib/hojasOpp";
import { HojasNuevas } from "./HojasNuevas";
import { Miniaturas } from "../../../components/Miniaturas";
import type { InformeGuardado } from "../../../../lib/informeCostes";
import type { CorreoEnviado } from "../../../../lib/envioCorreo";

// BLOQUE 2 · DOCUMENTACION (Monica, 6-oct-2026). La ESTRUCTURA es la del
// esqueleto gris del 29-sep (docs/figma/gestion-oportunidad-gris.html): Sali
// arriba, viabilidad · 3D · presupuesto, las hojas, el trato y enviar. Los
// COLORES son los de su maqueta del bloque 1 (docs/figma/bloque1-toma-de-datos.html),
// no los de lo que esta montado: "se aleja mucho de la maqueta".
//
// "Se sale de aqui cuando esta lista Y enviada."

const AZUL = "#104269";
// Las piezas de su maqueta, con sus valores tal cual.
const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white px-[13px] py-[11px]";
const ROT = "text-[10px] font-bold uppercase tracking-[0.09em] text-[#8a8a8a]";
// "La banda del titulo": cada subtitulo con el color de SU familia, tinte flojo
// y borde a todo color. La documentacion es del azul.
const BANDA = "rounded-[5px] border border-[#104269] bg-[#E3EAF0] px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-[0.09em] text-[#1c1c1c]";
const ETI = "inline-block rounded-[20px] border border-[#c9c9c9] bg-[#D8ECC4] px-2 py-px text-[10.5px] text-[#4a4a4a]";
const HUECA = "flex items-center justify-center rounded-[10px] border border-dashed border-[#cfcfcf] bg-[#fafafa] px-2.5 py-2.5 text-center text-[11px] text-[#a0a0a0]";
const ENLACE = "font-semibold text-[#104269] underline-offset-2 hover:underline";
const BOT = "inline-flex items-center rounded-[5px] border border-[#2b2b2b] bg-white px-2.5 py-0.5 text-[11.5px] font-bold text-[#1c1c1c] hover:bg-[#f3f3f3]";
const PRONTO = "rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/50";

const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "");
const texto3D = <T extends readonly { valor: string; texto: string }[]>(lista: T, v: string | null) => lista.find((x) => x.valor === v)?.texto ?? null;

function Tarjeta({ titulo, sub, children }: { titulo: string; sub: ReactNode; children?: ReactNode }) {
  return (
    <div className={CAJA + " flex flex-col"}>
      <div className={BANDA}>{titulo}</div>
      <div className="mt-1.5 text-[12px] leading-snug text-[#4a4a4a]">{sub}</div>
      {children && <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">{children}</div>}
    </div>
  );
}

const HORA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const EUR0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });

export function Bloque2({
  id,
  g,
  d,
  trato,
  informes = [],
  enviados = [],
}: {
  id: string;
  g: Gestion;
  d: Documentacion;
  trato: ReactNode;
  /** Los informes emitidos para esta oportunidad (12-oct-2026). */
  informes?: InformeGuardado[];
  /** Lo enviado por correo desde aqui (12-oct-2026). */
  enviados?: CorreoEnviado[];
}) {
  const costes = informes.filter((x) => x.tipo === "estimacion_costes");
  const estudios = informes.filter((x) => x.tipo === "estudio_ayudas");
  const v = d.viabilidad;
  // La hoja es de la OPORTUNIDAD: el boton sale siempre, tenga o no CP (13-oct-2026).
  const hojaNueva = `/comercial/hoja-encargo?opp=${id}`;
  const conPresupuesto = d.hojas.filter((h) => h.presupuesto);
  const tipo3D = texto3D(TIPOS_3D, g.tresD?.tipo ?? null);
  const estado3D = texto3D(ESTADOS_3D, g.tresD?.estado ?? null);

  return (
    <section className={CAJA + " text-[13px] text-[#1c1c1c]"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.09em] underline" style={{ color: AZUL }}>
          Documentación
        </h2>
        <span className={ROT}>Se sale de aquí cuando está lista y enviada</span>
      </div>

      {/* ------------------------------ Sali */}
      <div className="mt-3 rounded-[8px] bg-[rgba(217,217,217,.5)] px-2.5 py-2">
        <div className="flex items-center gap-2">
          <span className={ROT}>Sali</span>
          <span className={PRONTO} title="Sali dirá en una línea lo que falta o lo que se está quedando atrás: «la viabilidad lleva 6 días lista y sin enviar; la junta es el 20».">
            Próximamente
          </span>
        </div>
      </div>

      {/* ------------------------------ viabilidad · 3D · presupuesto */}
      <div className="mt-3 grid gap-2.5 md:grid-cols-3">
        <Tarjeta
          titulo="Viabilidad"
          sub={
            !v ? (
              "Sin empezar · la empieza Alex en su mesa cuando llega el Polycam"
            ) : v.fase === "en_mesa" ? (
              <>En la mesa de Alex{v.redacta && ` · ${v.redacta}`}</>
            ) : v.fase === "rematar" ? (
              <>Alex ha terminado su parte · <b>falta rematarla</b></>
            ) : (
              <>
                Generada · {v.numero} v{v.version}
                {v.generadaEl && ` · ${fecha(v.generadaEl)}`}
                {v.redacta && ` · ${v.redacta}`}
                {v.superadaPor && (
                  <span className="mt-1 block rounded-[5px] border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-amber-900/80">
                    Modificada en hoja de encargo {v.superadaPor}
                  </span>
                )}
              </>
            )
          }
        >
          {v?.fase === "generada" && (
            <a href={`/comercial/viabilidad/${v.id}/pdf`} target="_blank" rel="noreferrer" className={ENLACE}>
              ver
            </a>
          )}
          {v && (
            <Link href={`/comercial/viabilidad/${v.id}`} className={ENLACE}>
              {v.fase === "generada" ? "abrir · generar de nuevo" : v.fase === "rematar" ? "rematar y generar" : "abrir"}
            </Link>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="3D"
          sub={
            v?.modelo ? (
              <>De catálogo · {v.modelo}</>
            ) : v?.especifico ? (
              "Específico: hace falta uno a medida"
            ) : tipo3D || estado3D ? (
              <>
                {[tipo3D, estado3D?.toLowerCase()].filter(Boolean).join(" · ")}
                {g.tresD?.fechaEntrega && ` · ${fecha(g.tresD.fechaEntrega)}`}
              </>
            ) : (
              "Sin pedir"
            )
          }
        >
          <a href="#el-3d" className={ENLACE}>
            cambiar
          </a>
        </Tarjeta>

        {/* EL PRESUPUESTO SE HACE EN LA APP (Monica, 10-oct-2026): PR-año-numero.
            Los anteriores siguen en Factusol, con su numero. */}
        <Tarjeta
          titulo="Presupuesto"
          sub={
            d.presupuestos.length
              ? d.presupuestos.map((p) => (p.generado ? `${p.codigo} · ${EUR.format(p.base)} €` : "Borrador")).join(" · ")
              : conPresupuesto.length
                ? conPresupuesto.map((h) => `Nº ${h.presupuesto!.numero ?? "sin número"} (Factusol)`).join(" · ")
                : "Sin generar"
          }
        >
          {d.presupuestos
            .filter((p) => p.generado)
            .slice(0, 2)
            .map((p) => (
              <a key={p.id} href={`/comercial/presupuesto/pdf/${p.id}`} target="_blank" rel="noreferrer" className={ENLACE}>
                ver {p.codigo}
              </a>
            ))}
          <Link href={`/comercial/presupuesto?opp=${id}`} className={ENLACE}>
            {d.presupuestos.length ? "abrir · hacer otro" : "hacer presupuesto"}
          </Link>
        </Tarjeta>
      </div>

      {/* ------------------------------ informes para la comunidad
          (Monica, 12-oct-2026). Opcionales, complementan el bloque 1. Cada uno
          queda tal cual se emitio: si la comunidad llama por "el papel que me
          diste", aqui esta. El de proteccion viene despues. */}
      <div className="mt-2.5 grid gap-2.5 md:grid-cols-3">
        <Tarjeta
          titulo="Estimación de costes"
          sub={
            costes.length ? (
              <ul className="space-y-0.5">
                {costes.slice(0, 4).map((x) => (
                  <li key={x.id}>
                    <a href={`/referencia/estimacion/informe/${x.id}`} className={ENLACE}>
                      {HORA.format(new Date(x.creado_en))}
                    </a>
                    {" · "}
                    {x.datos.obra}
                    {x.datos.precios && ` · ${EUR0.format(x.datos.precios.hoy)} € con IVA`}
                    {x.autor && ` · ${x.autor.nombre}`}
                  </li>
                ))}
                {costes.length > 4 && <li className="text-[#8a8a8a]">y {costes.length - 4} más antiguos</li>}
              </ul>
            ) : (
              "Opcional · lo que costaría la obra, las ayudas y cuánto sube si se espera"
            )
          }
        >
          <Link href="/referencia/estimacion" className={ENLACE}>
            {costes.length ? "emitir otro" : "emitir"}
          </Link>
        </Tarjeta>
        {/* EL ESTUDIO DE AYUDAS (12-oct-2026): ayudas, lo concedido cerca, el
            coste y lo que de verdad cubren si se espera. */}
        <Tarjeta
          titulo="Estudio de ayudas"
          sub={
            estudios.length ? (
              <ul className="space-y-0.5">
                {estudios.slice(0, 4).map((x) => (
                  <li key={x.id}>
                    <a href={`/referencia/subvenciones/estudio/${x.id}`} className={ENLACE}>
                      {HORA.format(new Date(x.creado_en))}
                    </a>
                    {" · "}
                    {x.datos.obra}
                    {x.autor && ` · ${x.autor.nombre}`}
                  </li>
                ))}
                {estudios.length > 4 && <li className="text-[#8a8a8a]">y {estudios.length - 4} más antiguos</li>}
              </ul>
            ) : (
              "Opcional · las ayudas que podría pedir, cuándo llegarían y lo que cubren de verdad si se espera"
            )
          }
        >
          <Link href="/referencia/subvenciones" className={ENLACE}>
            {estudios.length ? "emitir otro" : "emitir"}
          </Link>
        </Tarjeta>
        <Tarjeta titulo="Consulta de protección" sub="Opcional · si el edificio está protegido, qué se puede hacer">
          <span className={PRONTO}>Próximamente</span>
        </Tarjeta>
      </div>

      {/* ------------------------------ las hojas de encargo */}
      <div className={CAJA + " mt-2.5"}>
        <div className={BANDA}>Hoja de encargo</div>
        {/* Las del sistema nuevo, con lo que toca hacer en su fase (25-oct-2026). */}
        {(d.hojasNuevas.length > 0 || d.firmadas.porValidar.length > 0) && (
          <HojasNuevas oppId={id} hojas={d.hojasNuevas} fases={FASE_HE} porValidar={d.firmadas.porValidar} firmadas={d.firmadas.enlace} />
        )}
        {d.hojas.length === 0 ? (d.hojasNuevas.length > 0 || d.firmadas.porValidar.length > 0 ? null : (
          <p className="mt-2 text-[12px] text-amber-900/80">Todavía no hay ninguna hoja de esta oportunidad.</p>
        )) : (
          <ul className="mt-1.5 divide-y divide-[#eee]">
            {d.hojas.map((h) => {
              const e = estadoDeHoja(h.estado, h.enBorrador);
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-[12px]">
                  <span className="w-4 text-[#8a8a8a]">{h.numero}</span>
                  <span className="w-[74px]">{fecha(h.fecha)}</span>
                  <span className={`rounded-[20px] border px-2 py-px text-[10.5px] ${e.clase}`}>{e.texto}</span>
                  <span className="font-semibold">{EUR.format(h.importe)} €</span>
                  <span className="min-w-0 flex-1 truncate text-[#6e6e6e]">
                    {h.codigo && `${h.codigo} · `}
                    {h.titulo}
                  </span>
                  <span className="flex gap-3">
                    {h.ver?.enlace && (
                      <a href={h.ver.enlace} target="_blank" rel="noreferrer" className={ENLACE}>
                        ver
                      </a>
                    )}
                    <Link href={hojaNueva} className={ENLACE}>
                      abrir
                    </Link>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {/* Abre el generador directamente, con esta opp elegida (13-oct-2026). */}
        <Link href={`${hojaNueva}&nueva=1`} className={BOT + " mt-2.5 uppercase"}>
          + Generar hoja de encargo
        </Link>
      </div>

      {/* ------------------------------ las fotografias (8-oct-2026)
          Las de las notas del comercial: humedades, un escalon, una grieta.
          La nota es privada; las fotos, no: aqui las encuentran todos. */}
      <div className={CAJA + " mt-2.5"}>
        <div className={BANDA}>Fotografías</div>
        {d.fotos.length === 0 ? (
          <p className="mt-2 text-[12px] text-[#8a8a8a]">Todavía no hay fotos. Se añaden al grabar una nota del diario.</p>
        ) : (
          <>
            <p className="mt-1.5 text-[12px] text-[#4a4a4a]">
              {d.fotos.length} {d.fotos.length === 1 ? "foto" : "fotos"} · pincha para verla entera
            </p>
            <Miniaturas fotos={d.fotos} lado={72} />
          </>
        )}
      </div>

      {/* ------------------------------ el trato · enviar */}
      <div className="mt-2.5 grid items-stretch gap-2.5 md:grid-cols-[2fr_1fr]">
        <div className={CAJA}>
          <div className={BANDA}>El trato</div>
          <p className="mt-1.5 text-[12px]">
            {g.negociacion?.queVendemos || <span className="text-amber-900/80">Qué le vendemos: por completar</span>}
            {g.negociacion?.precio != null && (
              <>
                {" "}· <b>{EUR.format(g.negociacion.precio)} €</b>
              </>
            )}
          </p>
          {g.trajo && <p className="text-[11.5px] text-[#6e6e6e]">Quién lo trae: {g.trajo}</p>}
          <div className="mt-2.5">{trato}</div>
        </div>
        {/* ENVIAR (Monica, 12-oct-2026): documentos + plantilla, desde el buzon
            comercial a nombre del comercial; queda en el diario. */}
        <div className={CAJA + " flex flex-col"}>
          <div className={BANDA}>Enviar</div>
          {enviados.length === 0 ? (
            <p className="mt-1.5 text-[12px] text-[#4a4a4a]">Nada enviado desde la app todavía.</p>
          ) : (
            <ul className="mt-1.5 space-y-1 text-[12px] text-[#4a4a4a]">
              {enviados.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <b>{HORA.format(new Date(c.creado_en))}</b> · {c.asunto} · a {c.para.join(", ")}
                  {c.documentos.length > 0 && ` · ${c.documentos.length} doc.`}
                  {!c.ok && <span className="text-alerta"> · no salió</span>}
                </li>
              ))}
            </ul>
          )}
          <Link href={`/comercial/oportunidades/${id}/enviar`} className={BOT + " mt-2.5 self-start"}>
            Enviar documentos
          </Link>
        </div>
      </div>
    </section>
  );
}
