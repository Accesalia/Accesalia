import Link from "next/link";
import { Fragment } from "react";
import { CambiarDireccion } from "./CambiarDireccion";
import { accionAnadirInteres, accionCerrar, accionPausar, accionQuitarInteres, accionReabrir, accionReactivar } from "./acciones";
import { BOTON, CAJA, CAMPO, ROTULO, ROT_CAJA } from "./estilo";
import { BarraFases } from "./BarraFases";
import type { ContactoComunidad, Gestion } from "../../../../lib/gestionOportunidad";
import type { DatosCabecera, OtraOpp } from "../../../../lib/cabeceraOpp";
import type { BarraOportunidad } from "../../../../lib/cuadroComercial";

// LA CABECERA COMUN A TODOS LOS BLOQUES (Monica, 14-oct-2026, su maqueta
// "CABECERA COMUN PAGINA BLOQUES"). "La pagina de los bloques tal como esta es
// solo un monton de info que no ayuda a vender": arriba, lo que sirve para
// vender; los datos (referencia catastral, distrito, escaneo, casillas) bajan al
// bloque 1, "porque si estoy en fase de junta no tiene sentido ver la fecha de
// escaneado".
//
//   - a la izquierda, LA OPP: su nombre y lo que quieren (solo lo que se cobra),
//     las otras opps de la misma direccion, y lo que nos han contado;
//   - en medio, pausar/cerrar, el estado y DE QUE ESTAMOS PENDIENTES (lo pone la
//     app, nunca el comercial);
//   - a la derecha, los contactos de la comunidad, y debajo Sali;
//   - abajo, a lo ancho, la barra de fases de la lista de opps, en negro.
//
// Vive aparte de la pantalla para poder mirarla renderizada con datos de muestra.

/** Sus colores (los de la maqueta). */
const COLOR_OTRA: Record<OtraOpp["estado"], string> = {
  abierta: "text-[#1F4E99]",
  ganada: "text-[#2D6609]",
  perdida: "text-[#923428]",
  cerrada: "text-carbon/60",
};

const cuantas = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function Cabecera({
  id,
  g,
  cab,
  barra,
  contactos,
  intereses,
  paraAnadir,
}: {
  id: string;
  g: Gestion;
  cab: DatosCabecera;
  barra: BarraOportunidad;
  contactos: ContactoComunidad[];
  /** Lo que dicen que quieren: los tipos marcados. */
  intereses: { id: string; nombre: string }[];
  /** Lo que se puede anadir: lo del alta que aun no esta marcado. */
  paraAnadir: { id: string; nombre: string }[];
}) {
  const e = cab.estado;
  const otrasAbiertas = cab.otras.filter((o) => !o.cerrada).length;
  const otrasCerradas = cab.otras.length - otrasAbiertas;

  return (
    <>
      {/* GANADA / PERDIDA: el letrero, para saber en que punto estamos al
          abrir la ficha, venga de donde venga (de la lista de otras opps de la
          misma direccion, por ejemplo). No es un boton: se calcula. */}
      <div className="mt-3 flex min-h-[30px] justify-end">
        {e.ganada ? (
          <span className="rounded-[6px] bg-[#2D6609] px-4 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white">
            Ganada{e.fechaGanada && <span className="font-normal normal-case"> · {e.fechaGanada.split("-").reverse().join("/")}</span>}
          </span>
        ) : e.perdida ? (
          <span className="rounded-[6px] bg-[#B3261E] px-4 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white">Perdida</span>
        ) : null}
      </div>

      <div className="mt-2 grid items-stretch gap-[10px] xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* ---------------------------- la opp ---------------------------- */}
        <div className={CAJA + " min-w-0 p-4"}>
          {/* EL NOMBRE DE LA OPP, el que puso el comercial, y detras lo que
              quieren: "Mayor 25 Madrid SATE + SUBV". La direccion no se ve. */}
          <h1 className="text-[21px] font-bold uppercase leading-tight text-carbon">
            {g.direccion}
            {cab.quieren && <span className="ml-2 align-middle text-[11.5px] font-bold uppercase text-[#1F4E99]">{cab.quieren}</span>}
          </h1>
          <div className="mt-1 flex flex-wrap items-center">
            {g.aviso && (
              <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                {g.aviso}
              </span>
            )}
            <CambiarDireccion id={id} actual={g.direccion} pendiente={Boolean(g.aviso)} />
          </div>

          {/* EN LA MISMA DIRECCION: las otras opps, con sus ACCESOS (esc 1, esc
              2...), lo que querian o contrataron y como acabaron. Cada una lleva
              a su ficha. */}
          {cab.otras.length > 0 && (
            <details className="mt-2.5 rounded-[6px] border border-carbon/25">
              <summary className="flex cursor-pointer list-none items-center justify-between px-2.5 py-1 text-[12px] font-semibold uppercase text-carbon">
                <span>
                  En la misma dirección:{" "}
                  {[otrasAbiertas && cuantas(otrasAbiertas, "opp abierta", "opps abiertas"), otrasCerradas && cuantas(otrasCerradas, "opp cerrada", "opps cerradas")]
                    .filter(Boolean)
                    .join(" + ")}
                </span>
                <span aria-hidden className="text-carbon/60">▾</span>
              </summary>
              <ul className="border-t border-carbon/10 px-2.5 py-1.5">
                {cab.otras.map((o) => (
                  <li key={o.id} className="text-[12px] leading-[1.6]">
                    <Link href={`/comercial/oportunidades/${o.id}`} className={COLOR_OTRA[o.estado] + " hover:underline"}>
                      {o.cerrada ? "Cerrada" : "Abierta"} — {o.accesos}
                      {o.quieren && <> — {o.quieren}</>}
                      {" — "}
                      {o.resultado}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* LO QUE NOS HAN CONTADO, sobre su panel gris: la administracion, quien
              nos la trajo, el contacto en la comunidad y lo que dicen que quieren. */}
          <div className="mt-2.5 rounded-[8px] bg-[#d9d9d9]/50 px-2.5 py-2">
            <p className="text-[12px] leading-[1.6]">
              <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.05em] text-[#76749D]">Administración</span>
              {/* SOLO EL ADMINISTRADOR DE LA COMUNIDAD, el de la cartera (Monica,
                  14-oct-2026): "si no hay, NO ENSENA NADA. No podemos identificar
                  como admin a quien no lo es". El contacto de la opp no lo suple. */}
              {g.adminComunidad?.empresa || g.adminComunidad?.persona ? (
                <span className="text-carbon">
                  {g.adminComunidad.persona && <b>{g.adminComunidad.persona}</b>}
                  {g.adminComunidad.persona && g.adminComunidad.empresa && " — "}
                  {g.adminComunidad.empresa}
                  {g.adminComunidad.municipio && <span className="text-carbon/50"> {g.adminComunidad.municipio}</span>}
                  {g.adminComunidad.telefono && <span className="tabular-nums text-carbon/60"> · {g.adminComunidad.telefono}</span>}
                </span>
              ) : (
                <span className="text-carbon/50">— no se apuntó.</span>
              )}
            </p>
            <p className="text-[12px] font-bold leading-[1.6] text-[#76749D]">
              Nos llega a través de <span className="font-normal text-carbon/75">{g.trajo ?? "— no se apuntó."}</span>
            </p>
            <p className="text-[12px] font-bold leading-[1.6] text-[#76749D]">
              Mi contacto en la comunidad es{" "}
              <span className="font-normal text-carbon/75">
                {g.contactoComunidad ? (
                  <>
                    {g.contactoComunidad.nombre}
                    {g.contactoComunidad.telefono && <span className="tabular-nums"> · {g.contactoComunidad.telefono}</span>}
                    {g.contactoComunidad.papel && <span className="text-carbon/45"> ({g.contactoComunidad.papel})</span>}
                  </>
                ) : (
                  "— no se apuntó."
                )}
              </span>
            </p>
            {/* Se quitan con la x y se anaden: "asi luego la hoja de encargo sale
                prerrellenada bien". */}
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[12px] font-bold leading-[1.6] text-[#76749D]">
              <span className="mr-0.5">Dicen que están interesados en —</span>
              {intereses.length === 0 && <span className="font-normal text-carbon/60">todavía nada.</span>}
              {intereses.map((t) => (
                <form key={t.id} action={accionQuitarInteres.bind(null, id, t.id)} className="inline-flex">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#c9c9c9] bg-[#D8ECC4] py-px pl-2 pr-1 text-[10.5px] font-normal text-[#4a4a4a]">
                    {t.nombre}
                    <button title={`Quitar ${t.nombre}`} className="rounded-full px-1 leading-none text-carbon/50 transition hover:bg-black/10 hover:text-carbon">
                      ×
                    </button>
                  </span>
                </form>
              ))}
              {paraAnadir.length > 0 && (
                <details className="relative">
                  <summary className="cursor-pointer list-none px-1 text-[11.5px] font-semibold text-carbon/70 hover:text-carbon">+ añadir</summary>
                  <form action={accionAnadirInteres.bind(null, id)} className={CAJA + " absolute left-0 z-20 mt-1 flex w-[280px] gap-2 p-2.5"}>
                    <select name="tipo" required defaultValue="" className={CAMPO + " min-w-0 flex-1"}>
                      <option value="" disabled>
                        Elige…
                      </option>
                      {paraAnadir.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                    <button className={BOTON}>Añadir</button>
                  </form>
                </details>
              )}
            </div>
          </div>
        </div>

        {/* ------------------- la derecha: dos tarjetas y Sali ------------------- */}
        <div className="grid min-w-0 gap-[10px] xl:grid-cols-[minmax(0,1fr)_300px] xl:grid-rows-[auto_1fr]">
          {/* PAUSAR, CERRAR, EL ESTADO Y DE QUE ESTAMOS PENDIENTES */}
          <div className={CAJA + " min-w-0 p-3.5"}>
            <div className="flex items-start gap-2.5">
              <Botones id={id} g={g} porCobrar={e.porCobrar} cerrada={e.cerrada} />
              <span className="ml-auto flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-carbon/55">
                {e.cerrada ? "Cerrada" : g.estado === "pausada" ? "Pausada" : "Abierta"}
                <i
                  className={
                    "inline-block h-2.5 w-2.5 rounded-full " +
                    (e.cerrada ? "bg-carbon/35" : g.estado === "pausada" ? "bg-amber-400" : "bg-[#3BB54A]")
                  }
                />
              </span>
            </div>
            {e.porCobrar && (
              <p className="mt-1.5 text-[11px] text-carbon/55">Esto aún tiene cosas por cobrar: no se puede cerrar ni pausar.</p>
            )}
            <div className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-carbon/60">
              De qué estamos pendientes para avanzar
            </div>
            <ul className="mx-auto mt-1.5 w-fit list-disc pl-5 text-[11.5px] font-bold uppercase leading-[1.5] text-carbon">
              <li>{cab.falta.texto}</li>
              {cab.falta.extra && <li>{cab.falta.extra}</li>}
            </ul>
          </div>

          {/* LOS CONTACTOS DE LA COMUNIDAD, con el telefono a la vista: "invita
              a llamar, y eso es bueno". */}
          <div className={CAJA + " p-3.5"}>
            <div className={ROT_CAJA}>Contactos de la comunidad</div>
            {contactos.length === 0 ? (
              <p className="mt-1.5 text-[12px] text-carbon/50">
                {g.comunidadId ? "Todavía no hay ninguno apuntado." : "La dirección aún es provisional, así que no hay comunidad de la que colgarlos."}
              </p>
            ) : (
              <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-2.5 gap-y-px text-[12px]">
                {contactos.map((c, n) => (
                  <Fragment key={n}>
                    <span className="truncate font-bold text-carbon">{c.nombre}</span>
                    <span className="tabular-nums text-carbon/75">{c.telefono ?? "—"}</span>
                    <span className="text-[11px] text-carbon/55">{c.papel ?? ""}</span>
                  </Fragment>
                ))}
              </div>
            )}
            <p title="Añadir un contacto está por montar" className="mt-2 inline-block cursor-not-allowed text-[11.5px] text-carbon/40">
              + añadir contacto
            </p>
          </div>

          {/* SALI: el resumen y el estado de situacion, visible para todos los
              bloques. Unas seis lineas, y "Ver mas" despliega el resto. */}
          <section className={CAJA + " p-3.5 xl:col-span-2"}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={ROT_CAJA}>Sali</span>
              <span title="Actualizar el estado — Sali todavía no está enchufada" className="cursor-not-allowed text-[11px] text-carbon/35">
                actualizar
              </span>
            </div>
            <details className="group mt-1">
              <summary className="cursor-pointer list-none">
                <p className="line-clamp-6 text-[12.5px] leading-[1.5] text-carbon/50 group-open:line-clamp-none">
                  Aquí contará Sali el resumen último y el estado de situación de la oportunidad: en qué punto está y qué se le puede
                  vender, la edad del edificio y lo que eso permite, lo que han cobrado los vecinos, en qué zona cae y qué dice su IEE.
                  Se monta cuando estén los cuatro bloques, porque lo escribe en serie.
                </p>
                <span className="mt-0.5 inline-block text-[11px] font-semibold text-lima-dark group-open:hidden">Ver más</span>
              </summary>
            </details>
          </section>
        </div>
      </div>

      {/* LA BARRA DE FASES, la de la lista de opps abiertas, en negro. */}
      <BarraFases b={barra} />
    </>
  );
}

/** Pausar y Cerrar (o Reactivar / Reabrir). Con hoja firmada y dinero
 *  pendiente no se puede ni lo uno ni lo otro. */
function Botones({ id, g, porCobrar, cerrada }: { id: string; g: Gestion; porCobrar: boolean; cerrada: boolean }) {
  const PASTILLA = "rounded-[6px] border px-4 py-1.5 text-[11.5px] font-bold uppercase tracking-wide transition";
  const PAUSAR = PASTILLA + " border-[#E6DFA8] bg-[#FAF6D2] text-[#8A7A2A]";
  const CERRAR = PASTILLA + " border-[#E5C4C0] bg-[#F6E3E1] text-[#923428]";
  const NO = " cursor-not-allowed opacity-50";

  if (cerrada)
    return (
      <form action={accionReabrir.bind(null, id)}>
        <button className={PASTILLA + " border-carbon/25 bg-white text-carbon/60 hover:border-carbon/50"}>Reabrir</button>
      </form>
    );
  if (porCobrar)
    return (
      <>
        <span title="Esto aún tiene cosas por cobrar: no se puede pausar" className={PAUSAR + NO}>
          Pausar
        </span>
        <span title="Esto aún tiene cosas por cobrar: no se puede cerrar" className={CERRAR + NO}>
          Cerrar
        </span>
      </>
    );
  return (
    <>
      {g.estado === "pausada" ? (
        <form action={accionReactivar.bind(null, id)}>
          <button className={PAUSAR + " hover:border-[#c9bd6b]"}>Reactivar</button>
        </form>
      ) : (
        <details className="relative">
          <summary className={PAUSAR + " cursor-pointer list-none hover:border-[#c9bd6b]"}>Pausar</summary>
          <form action={accionPausar.bind(null, id)} className={CAJA + " absolute left-0 z-20 mt-2 w-[320px] p-3"}>
            <span className={ROTULO}>Retomarla cuándo</span>
            <input name="nota" placeholder="cuando hagan hucha, si sale la subvención…" className={CAMPO + " mt-1"} />
            <button className={BOTON + " mt-2 w-full"}>Pausarla</button>
          </form>
        </details>
      )}
      {/* CERRARLA A MANO, con su razon (14-oct-2026). */}
      <details className="relative">
        <summary className={CERRAR + " cursor-pointer list-none hover:border-[#c99a94]"}>Cerrar</summary>
        <form action={accionCerrar.bind(null, id)} className={CAJA + " absolute left-0 z-20 mt-2 w-[340px] p-3"}>
          <span className={ROTULO}>¿Cómo se cierra?</span>
          <label className="mt-1.5 flex items-center gap-2 text-[13px] text-carbon">
            <input type="radio" name="tipo" value="perdida" defaultChecked /> Perdida
          </label>
          <label className="mt-1 flex items-center gap-2 text-[13px] text-carbon">
            <input type="radio" name="tipo" value="otra" /> Otra razón (duplicada, error de alta, no localizable…)
          </label>
          <span className={ROTULO + " mt-2.5 block"}>¿Por qué?</span>
          <textarea name="motivo" required rows={3} placeholder="se han ido con otro arquitecto, no hay dinero…" className={CAMPO + " mt-1 resize-y"} />
          <button className={BOTON + " mt-2 w-full"}>Cerrarla</button>
        </form>
      </details>
    </>
  );
}
