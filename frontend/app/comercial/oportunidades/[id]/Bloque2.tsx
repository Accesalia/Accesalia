import Link from "next/link";
import type { ReactNode } from "react";
import type { Documentacion } from "../../../../lib/bloqueDocumentacion";
import type { Gestion } from "../../../../lib/gestionOportunidad";
import { ESTADOS_3D, TIPOS_3D } from "../../../../lib/gestionOportunidad";
import { estadoDeHoja } from "../../../../lib/estadoHoja";

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

export function Bloque2({ id, g, d, trato }: { id: string; g: Gestion; d: Documentacion; trato: ReactNode }) {
  const v = d.viabilidad;
  const hojaNueva = g.comunidadId ? `/comercial/hoja-encargo?comunidad=${g.comunidadId}&opp=${id}` : null;
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

        <Tarjeta
          titulo="Presupuesto"
          sub={
            conPresupuesto.length
              ? conPresupuesto.map((h) => `Nº ${h.presupuesto!.numero ?? "sin número"}`).join(" · ")
              : "Sin generar · sale de Factusol"
          }
        >
          {conPresupuesto
            .filter((h) => h.presupuesto!.enlace)
            .map((h) => (
              <a key={h.id} href={h.presupuesto!.enlace!} target="_blank" rel="noreferrer" className={ENLACE}>
                ver
              </a>
            ))}
          <span className={PRONTO} title="Subir el PDF de Factusol y apuntar su número, junto a la hoja a la que acompaña.">
            Subir · próximamente
          </span>
        </Tarjeta>
      </div>

      {/* ------------------------------ las hojas de encargo */}
      <div className={CAJA + " mt-2.5"}>
        <div className={BANDA}>Hoja de encargo</div>
        {d.hojas.length === 0 ? (
          <p className="mt-2 text-[12px] text-amber-900/80">Todavía no hay ninguna hoja de esta oportunidad.</p>
        ) : (
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
                    {hojaNueva && (
                      <Link href={hojaNueva} className={ENLACE}>
                        abrir
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {hojaNueva ? (
          <Link href={hojaNueva} className={BOT + " mt-2.5 uppercase"}>
            + Nueva versión
          </Link>
        ) : (
          <p className="mt-2 text-[12px] text-amber-900/80">Sin comunidad no hay a quién hacerle la hoja: fija la dirección.</p>
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
        <div className={HUECA + " flex-col gap-1.5"}>
          <span className="font-bold uppercase tracking-[0.09em]">Enviar</span>
          <span>elegir documentos + plantilla de correo</span>
          <span className={PRONTO}>Próximamente</span>
        </div>
      </div>
    </section>
  );
}
