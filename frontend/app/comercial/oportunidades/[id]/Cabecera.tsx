import { AnadirContacto, DatoEditable } from "./DatoEditable";
import Link from "next/link";
import { Fragment } from "react";
import { NombreEditable } from "./NombreEditable";
import { accionAnadirInteres, accionAnular, accionCerrar, accionPausar, accionQuitarInteres, accionReabrir, accionReabrirAnulada, accionReactivar } from "./acciones";
import { BOTON, CAJA, CAMPO, ROTULO, ROT_CAJA } from "./estilo";
import { CabeceraPlegable } from "./CabeceraPlegable";
import { IrAOtraOpp } from "./IrAOtraOpp";
import { Marcar } from "../../../components/Marcar";
import type { ContactoComunidad, Gestion } from "../../../../lib/gestionOportunidad";
import type { DatosCabecera, OtraOpp } from "../../../../lib/cabeceraOpp";

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
// PLEGADA (Monica, 16-oct-2026, "reducir espacios"): con tanta cabecera no se
// veia ningun dato del edificio sin bajar. Ahora arriba va una sola tira -el
// codigo y el nombre sobre el verde, y en su cajita de que estamos pendientes y
// el admin-; "Ver completa" abre lo de siempre (lo que nos han contado, Sali y
// los contactos). El estado, con pausar y cerrar, baja junto a las pestañas
// (Estado, aqui abajo), y la barra de fases lleva al lado los dias y el ultimo
// contacto (TiraFases).
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
  contactos,
  intereses,
  paraAnadir,
  gruposAnadir,
}: {
  id: string;
  g: Gestion;
  cab: DatosCabecera;
  contactos: ContactoComunidad[];
  /** Lo que dicen que quieren: los tipos marcados. */
  intereses: { id: string; nombre: string }[];
  /** Lo que se puede anadir: lo del alta que aun no esta marcado. */
  paraAnadir: { id: string; nombre: string }[];
  /** Lo que se puede anadir, en las cuatro columnas del alta (15-oct-2026). */
  gruposAnadir: { titulo: string; valores: string[] }[];
}) {
  const otrasAbiertas = cab.otras.filter((o) => !o.cerrada).length;
  const otrasCerradas = cab.otras.length - otrasAbiertas;

  // El admin de la comunidad, el de la cartera: si no hay, no se suple con nadie.
  const admin = g.adminComunidad?.persona || g.adminComunidad?.empresa;

  return (
    <>
      <CabeceraPlegable
        izquierda={
          <>
            {g.codigo && <span className="text-[11px] font-bold tabular-nums text-white/65">{g.codigo}</span>}
            {/* CUANDO SE ABRIO: ya no va aqui, sino en la caja de Administracion (29-oct-2026: «en direcciones largas se nos
                come todo el ancho»). */}
            {/* EL NOMBRE DE LA OPP, grande y sobre el verde, y detras lo que quieren. */}
            {/* EDITABLE COMO LO DEMAS (29-oct-2026): al guardar pregunta si toca la ficha de Catastro. */}
            <NombreEditable
              id={id}
              nombre={g.direccion}
              detras={cab.quieren && <span className="ml-2 align-middle text-[10.5px] font-bold uppercase text-[#9cc4ee] [text-shadow:none]">{cab.quieren}</span>}
            />
            {/* El aviso de la direccion (provisional...) no se esconde en el panel. */}
            {g.aviso && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">{g.aviso}</span>
            )}
          </>
        }
        // IR A OTRA OPP, pegado a la cajita de la derecha y no al nombre
        // (Monica, 16-oct-2026).
        ir={<IrAOtraOpp />}
        caja={
          <>
            <span className="text-[10px] font-bold uppercase tracking-[0.03em] text-carbon/50">Pendientes de</span>
            <span className="text-[11.5px] font-bold uppercase text-carbon" title={cab.falta.extra ?? undefined}>
              {cab.falta.texto}
            </span>
            <span className="h-4 border-l border-carbon/35" />
            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#76749D]">Admin</span>
            <span className="text-[11.5px] text-carbon">
              {admin ? (
                <>
                  <b>{admin}</b>
                  {g.adminComunidad?.telefono && <span className="tabular-nums text-carbon/70"> {g.adminComunidad.telefono}</span>}
                </>
              ) : (
                <span className="text-carbon/50">— no se apuntó</span>
              )}
            </span>
          </>
        }
        panel={
      <div className="grid items-stretch gap-[10px] xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* ---------------------------- la opp ---------------------------- */}
        {/* El hueco que sobra va ENTRE el nombre y el cuadrito gris, que se
            queda abajo (Monica, 15-oct-2026). */}
        {/* LA TARJETA ES EL GRIS (Monica, 29-oct-2026: «dejaria la gris, con borde crema, y quitaria la blanca de
            debajo»): sobre el grafito, gris claro con su borde crema; dentro, lo de la misma direccion y lo que nos han
            contado. */}
        <div className="flex min-w-0 flex-col rounded-[10px] border-[1.5px] border-[#efe4c8] bg-[#e8e8e4] px-3.5 py-2.5">
          {/* El chip «Direccion mal apuntada, la corrijo» se fue (29-oct-2026): el nombre se corrige pulsandolo arriba. */}

          {/* EN LA MISMA DIRECCION: las otras opps, con sus ACCESOS (esc 1, esc
              2...), lo que querian o contrataron y como acabaron. Cada una lleva
              a su ficha. */}
          {cab.otras.length > 0 && (
            <details className="mb-2 rounded-[6px] border border-carbon/25 bg-white/60">
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
          <div className="mt-auto">
            <p className="text-[12px] leading-[1.6]">
              <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.05em] text-[#76749D]">Administración</span>
              {/* SOLO EL ADMINISTRADOR DE LA COMUNIDAD, el de la cartera (Monica,
                  14-oct-2026): "si no hay, NO ENSENA NADA. No podemos identificar
                  como admin a quien no lo es". El contacto de la opp no lo suple. */}
              <DatoEditable oppId={id} campo="admin" hayDato={!!(g.adminComunidad?.empresa || g.adminComunidad?.persona)}>
              {g.adminComunidad?.empresa || g.adminComunidad?.persona ? (
                <span className="text-carbon">
                  {g.adminComunidad.persona && <b>{g.adminComunidad.persona}</b>}
                  {g.adminComunidad.persona && g.adminComunidad.empresa && " — "}
                  {g.adminComunidad.empresa}
                  {g.adminComunidad.municipio && <span className="text-carbon/50"> {g.adminComunidad.municipio}</span>}
                  {g.adminComunidad.telefono && <span className="tabular-nums text-carbon/60"> · {g.adminComunidad.telefono}</span>}
                  {g.adminComunidad.enEspera && <span className="text-carbon/50"> · en espera de la comunidad</span>}
                </span>
              ) : (
                <span className="text-carbon/50">— no se apuntó.</span>
              )}
              </DatoEditable>
            </p>
            <p className="text-[12px] font-bold leading-[1.6] text-[#76749D]">
              Nos llega a través de{" "}
              <DatoEditable oppId={id} campo="trajo" hayDato={!!g.trajo}>
                <span className="font-normal text-carbon/75">{g.trajo ?? "— no se apuntó."}</span>
              </DatoEditable>
            </p>
            <p className="text-[12px] font-bold leading-[1.6] text-[#76749D]">
              Mi contacto en la comunidad es{" "}
              <DatoEditable oppId={id} campo="contacto" hayDato={!!g.contactoComunidad}>
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
              </DatoEditable>
            </p>
            {g.creada && (
              <p className="text-[12px] font-bold leading-[1.6] text-[#76749D]">
                Abierta el{" "}
                <span className="font-normal tabular-nums text-carbon/75">
                  {g.creada.slice(8, 10)}/{g.creada.slice(5, 7)}/{g.creada.slice(0, 4)}
                </span>
              </p>
            )}
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
              {/* "+ añadir" con el selector de las cuatro columnas del alta
                  (Monica, 15-oct-2026): se marcan uno o varios y se anaden. */}
              {paraAnadir.length > 0 && (
                <details className="relative">
                  <summary className="cursor-pointer list-none px-1 text-[11.5px] font-semibold text-carbon/70 hover:text-carbon">+ añadir</summary>
                  <form action={accionAnadirInteres.bind(null, id)} className={CAJA + " absolute left-0 z-20 mt-1 flex w-[340px] flex-col gap-2 p-2.5 font-normal"}>
                    <Marcar
                      id="tipo"
                      opciones={paraAnadir.map((t) => ({ valor: t.id, texto: t.nombre }))}
                      vacio="Qué más quieren (selecciona)"
                      ancho="w-full"
                      debajo
                      grupos={gruposAnadir}
                    />
                    <button className={BOTON + " self-end"}>Añadir</button>
                  </form>
                </details>
              )}
            </div>
          </div>
        </div>

        {/* ------------------- la derecha: dos tarjetas y Sali ------------------- */}
        <div className="grid min-w-0 gap-[10px] xl:grid-cols-[minmax(0,1fr)_300px]">
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
            <AnadirContacto oppId={id} />
          </div>

          {/* SALI: el resumen y el estado de situacion, visible para todos los
              bloques. Unas seis lineas, y "Ver mas" despliega el resto. */}
          <section className={CAJA + " p-3.5 xl:col-start-1 xl:row-start-1"}>
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
        }
      />

      {/* LA BARRA DE FASES negra (fases, dias en esta fase, ultimo contacto) se quito
          entera el 27-oct-2026 (Monica, con el bloque 2 nuevo): las fases ya las dicen
          las pestañas. Sigue en la lista de opps abiertas (BarraFases.tsx). */}
    </>
  );
}

/** EL ESTADO, CON PAUSAR Y CERRAR, junto a las pestañas (Monica, 16-oct-2026):
 *  "crear un sitio para las tres, ver estado y cambiar estado, ahora juntas".
 *  Ganada y perdida se dicen aqui mismo, en su color. */
export function Estado({ id, g, cab }: { id: string; g: Gestion; cab: DatosCabecera }) {
  const e = cab.estado;
  // ANULADA POR DUPLICADA (16-oct-2026): no es nada, solo apunta a la buena.
  if (e.anulada)
    return (
      <div className="flex items-center gap-2.5 rounded-[8px] bg-white px-3 py-1.5">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-carbon/45">Estado</span>
        <span className="h-4 border-l border-carbon/35" />
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold uppercase text-carbon/60">
          {g.duplicadaDe ? "Anulada por duplicada" : "Anulada por error"}
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-carbon/25" />
        </span>
        {g.duplicadaDe ? (
          <Link href={`/comercial/oportunidades/${g.duplicadaDe.id}`} className="text-[12.5px] font-semibold text-accion-marco underline">
            Ir a la buena: {[g.duplicadaDe.codigo, g.duplicadaDe.nombre].filter(Boolean).join(" · ")}
          </Link>
        ) : (
          g.motivoAnulacion && <span className="min-w-0 truncate text-[12.5px] text-carbon/70" title={g.motivoAnulacion}>{g.motivoAnulacion}</span>
        )}
        <form action={accionReabrirAnulada.bind(null, id)} className="ml-auto">
          <button className="rounded-[5px] border border-carbon/25 bg-white px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-carbon/60 transition hover:border-carbon/50">
            Reabrir
          </button>
        </form>
      </div>
    );
  const [texto, punto, color] = e.ganada
    ? [`Ganada${e.fechaGanada ? " · " + e.fechaGanada.split("-").reverse().join("/") : ""}`, "bg-[#2D6609]", "text-[#2D6609]"]
    : e.perdida
      ? ["Perdida", "bg-[#B3261E]", "text-[#B3261E]"]
      : e.cerrada
        ? ["Cerrada", "bg-carbon/35", "text-carbon"]
        : g.estado === "pausada"
          ? ["Pausada", "bg-amber-400", "text-carbon"]
          : ["Abierta", "bg-[#3BB54A]", "text-carbon"];
  return (
    <div className="flex items-center gap-2.5 rounded-[8px] bg-white px-3 py-1.5">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-carbon/45">Estado</span>
      <span className="h-4 border-l border-carbon/35" />
      <span className={"flex items-center gap-1.5 whitespace-nowrap text-[13px] font-bold uppercase " + color}>
        {texto}
        <i className={"inline-block h-2.5 w-2.5 rounded-full " + punto} />
      </span>
      <span
        className="ml-auto flex items-center gap-1.5"
        title={e.porCobrar ? "Aún hay cosas por cobrar: no se puede cerrar ni pausar." : undefined}
      >
        <Botones id={id} g={g} porCobrar={e.porCobrar} cerrada={e.cerrada} otras={cab.otras} />
      </span>
    </div>
  );
}

/** Pausar y Cerrar (o Reactivar / Reabrir). Con hoja firmada y dinero
 *  pendiente no se puede ni lo uno ni lo otro. */
function Botones({ id, g, porCobrar, cerrada, otras }: { id: string; g: Gestion; porCobrar: boolean; cerrada: boolean; otras: OtraOpp[] }) {
  // Pequeños y discretos (Monica, 15-oct-2026): lo que destaca es lo pendiente.
  const PASTILLA = "rounded-[5px] border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide transition";
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
          <form action={accionPausar.bind(null, id)} className={CAJA + " absolute right-0 top-full z-30 mt-2 w-[320px] p-3"}>
            <span className={ROTULO}>Retomarla cuándo</span>
            <input name="nota" placeholder="cuando hagan hucha, si sale la subvención…" className={CAMPO + " mt-1"} />
            <button className={BOTON + " mt-2 w-full"}>Pausarla</button>
          </form>
        </details>
      )}
      {/* CERRARLA A MANO, con su razon (14-oct-2026). */}
      <details className="relative">
        <summary className={CERRAR + " cursor-pointer list-none hover:border-[#c99a94]"}>Cerrar</summary>
        <form action={accionCerrar.bind(null, id)} className={CAJA + " absolute right-0 top-full z-30 mt-2 w-[340px] p-3"}>
          <span className={ROTULO}>¿Cómo se cierra?</span>
          <label className="mt-1.5 flex items-center gap-2 text-[13px] text-carbon">
            <input type="radio" name="tipo" value="perdida" defaultChecked /> Perdida
          </label>
          <label className="mt-1 flex items-center gap-2 text-[13px] text-carbon">
            <input type="radio" name="tipo" value="otra" /> Otra razón (no localizable…)
          </label>
          <span className={ROTULO + " mt-2.5 block"}>¿Por qué?</span>
          <textarea name="motivo" required rows={3} placeholder="se han ido con otro arquitecto, no hay dinero…" className={CAMPO + " mt-1 resize-y"} />
          <button className={BOTON + " mt-2 w-full"}>Cerrarla</button>
        </form>
      </details>
      {/* ANULAR, Y LUEGO LA RAZON (16-oct-2026): ni perdida ni cerrada. No se
          borra, pero deja de salir en todas partes. */}
      <details className="relative">
        <summary className={PASTILLA + " cursor-pointer list-none border-carbon/25 bg-white text-carbon/60 hover:border-carbon/50"}>Anular</summary>
        <form action={accionAnular.bind(null, id)} className={CAJA + " absolute right-0 top-full z-30 mt-2 w-[360px] p-3"}>
          <span className={ROTULO}>¿Por qué se anula?</span>
          <label className="mt-1.5 flex items-center gap-2 text-[13px] text-carbon">
            <input type="radio" name="razon" value="error" defaultChecked /> Creada por error
          </label>
          <textarea name="motivo" rows={2} placeholder="dirección equivocada, era una prueba, no es nuestra…" className={CAMPO + " mt-1 resize-y"} />
          <label className="mt-2.5 flex items-center gap-2 text-[13px] text-carbon">
            <input type="radio" name="razon" value="duplicada" /> Duplicada de otra. ¿Cuál es la buena?
          </label>
          {otras.filter((o) => !o.cerrada).length > 0 && (
            <select name="buena" defaultValue="" className={CAMPO + " mt-1"}>
              <option value="">— de esta dirección —</option>
              {otras
                .filter((o) => !o.cerrada)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.accesos}
                    {o.quieren ? ` · ${o.quieren}` : ""}
                  </option>
                ))}
            </select>
          )}
          <input name="codigo" placeholder="o su código: ALV-2026-155" className={CAMPO + " mt-1.5"} />
          <p className="mt-2 text-[11.5px] leading-snug text-carbon/65">
            No se borra, pero deja de salir en listas, carteras y estadísticas, y se puede reabrir. Si es duplicada, sus notas,
            citas, viabilidades y documentos pasan a la buena. Con hoja, presupuesto o factura no se puede.
          </p>
          <button className={BOTON + " mt-2 w-full"}>Anularla</button>
        </form>
      </details>
    </>
  );
}
