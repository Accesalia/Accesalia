import { Fragment } from "react";
import { CambiarDireccion } from "./CambiarDireccion";
import { accionComercial, accionPausar, accionReactivar } from "./acciones";
import { BOTON, CAJA, CAMPO, ROTULO } from "./estilo";
import type { EstadoBloque } from "./Carril";
import type { ContactoComunidad, Gestion, HitoGestion } from "../../../../lib/gestionOportunidad";

// LA CABECERA DEL PRIMER BLOQUE, Y LA FRANJA DE DEBAJO (Monica, 30-sep y 5-oct).
//
// Vive aparte de la pantalla por dos razones: la pantalla se estaba haciendo
// larga, y asi se puede MIRAR renderizada con datos de muestra sin entrar con
// usuario, que es la unica forma de ver la de verdad.

/** 2026-03-14 -> 14/03/26 */
function fechaCorta(v: string): string {
  const [a, m, d] = v.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

export function Cabecera({
  id,
  g,
  comerciales,
  eligeComercial,
  hechos,
  aplican,
  ahora,
  quieren,
  bloqueAhora,
  contactos,
  distrito,
}: {
  id: string;
  g: Gestion;
  comerciales: { id: string; nombre: string }[];
  eligeComercial: boolean;
  hechos: number;
  aplican: number;
  ahora: HitoGestion | undefined;
  quieren: string[];
  bloqueAhora: EstadoBloque | null;
  contactos: ContactoComunidad[];
  /** "Distrito 11 · Carabanchel". Solo en Madrid capital; el BARRIO que ella
   *  puso en su maqueta no lo tenemos en ninguna fuente y no se inventa. */
  distrito: string | null;
}) {
  const pausada = g.estado === "pausada";
  return (
    <>
        {/* SU CABECERA: tres columnas de anchos distintos segun lo que llevan
            -1.15fr · 1fr · 310-, del esqueleto del 30-sep. La direccion y lo que
            NOS HAN CONTADO a la izquierda; por donde vamos en medio; y los
            contactos de la comunidad a la derecha, con el telefono a la vista,
            que "invita a llamar, y eso es bueno". */}
        <div className="mt-3 grid items-start gap-[10px] xl:grid-cols-[1.15fr_1fr_310px]">
          <div className={CAJA + " min-w-0 p-4"}>
            <div className={ROTULO}>Dirección</div>
            <h1 className="mt-0.5 text-[25px] font-bold leading-tight text-carbon">{g.direccion}</h1>
            <div className="mt-1.5 flex flex-wrap items-center">
              {g.aviso && (
                <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                  {g.aviso}
                </span>
              )}
              <CambiarDireccion id={id} actual={g.direccion} pendiente={Boolean(g.aviso)} />
            </div>
            <p className="mt-1 text-[12px] text-carbon/55">
              {g.codigo && <b className="text-carbon/75">{g.codigo}</b>}
              {!eligeComercial && g.comercial && <> · {g.comercial}</>}
              {distrito && <> &nbsp;·&nbsp; {distrito}</>}
              {g.referenciaCatastral && <> &nbsp;·&nbsp; <span className="font-mono">{g.referenciaCatastral}</span></>}
            </p>

            {g.administracion && (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.05em] text-[#76749D]">Administración</span>
                <span className="text-[12px] text-carbon">
                  {g.contacto && <b>{g.contacto}</b>}
                  {g.contacto && " — "}
                  {g.administracion}
                </span>
              </div>
            )}

            {/* LO QUE NOS HAN CONTADO. No es un formulario: son los tres datos
                que escribio una persona al crearla, releidos de la base. Por eso
                van sobre su propio panel gris, separados de lo que calculamos
                nosotros (Monica los recoloco aqui el 30-sep). */}
            <div className="mt-2.5 rounded-[8px] bg-[#d9d9d9]/50 px-2.5 py-2">
              <p className="text-[12px] font-bold leading-[1.5] text-[#76749D]">
                Nos llega a través de{" "}
                <span className="font-normal text-carbon/75">{g.trajo ?? "— no se apuntó."}</span>
              </p>
              <p className="text-[12px] font-bold leading-[1.5] text-[#76749D]">
                Mi contacto en la comunidad para quedar a tomar datos es{" "}
                <span className="font-normal text-carbon/75">
                  {g.contacto ? (
                    <>
                      {g.contacto}
                      {g.contactoTelefono && <> · {g.contactoTelefono}</>}
                      {g.contactoDonde && <span className="text-carbon/45"> ({g.contactoDonde})</span>}
                    </>
                  ) : (
                    "— no se apuntó."
                  )}
                </span>
              </p>
              <p className="mt-1 text-[12px] font-bold leading-[1.5] text-[#76749D]">
                Dicen que están interesados en{" "}
                {quieren.length === 0 ? (
                  <span className="font-normal text-carbon/75">— todavía nada.</span>
                ) : (
                  quieren.map((q) => (
                    <span
                      key={q}
                      className="mr-1 inline-block rounded-full border border-[#c9c9c9] bg-[#D8ECC4] px-2 py-px text-[10.5px] font-normal text-[#4a4a4a]"
                    >
                      {q}
                    </span>
                  ))
                )}
              </p>
            </div>
            {eligeComercial && (
              <form action={accionComercial.bind(null, id)} className="mt-2 flex items-center gap-2">
                <span className={ROTULO}>Comercial que la lleva</span>
                <select
                  name="comercial"
                  defaultValue={g.comercialId ?? ""}
                  className={
                    "rounded-[8px] border px-2.5 py-1 text-[13px] " +
                    (g.comercialId ? "border-carbon/25 bg-white text-carbon" : "border-amber-300 bg-amber-50 text-amber-900")
                  }
                >
                  <option value="">sin asignar</option>
                  {comerciales.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <button className={BOTON + " !py-1"}>Guardar</button>
              </form>
            )}
          </div>
          {/* ---------------- por dónde vamos ---------------- */}
          <div className={CAJA + " p-4"}>
            <div className={ROTULO}>Por dónde vamos</div>
            <div className="mt-1.5 text-[12.5px] text-carbon">
              {bloqueAhora ? (
                <>
                  <b>
                    {bloqueAhora.n} · {bloqueAhora.titulo}
                  </b>{" "}
                  — en curso. {bloqueAhora.pie}.
                </>
              ) : (
                <b>Los cuatro bloques, hechos.</b>
              )}
            </div>
            <div className="mt-1 text-[11px] text-carbon/50">
              {hechos} de {aplican} fases
              {ahora && <> · ahora, {ahora.nombre.toLowerCase()}</>}
            </div>
            {/* Su hueco: "aqui se ira acumulando una linea por bloque quemado".
                Se ve y ocupa su sitio aunque todavia no haya nada que acumular. */}
            <div className="mt-2 grid h-[84px] place-items-center rounded-[10px] border border-dashed border-[#cfcfcf] bg-[#fafafa] px-3 text-center text-[11px] text-[#a0a0a0]">
              aquí se irá acumulando una línea por bloque quemado
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {pausada ? (
              <form action={accionReactivar.bind(null, id)}>
                <button className={BOTON + " !bg-[#5E744C] !border-[#3f5236] hover:!bg-[#516340]"}>Reactivar</button>
              </form>
            ) : (
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-[6px] border border-carbon/25 px-3 py-1.5 text-[12px] font-bold uppercase text-carbon/60 transition hover:border-carbon/50">
                  Pausar
                </summary>
                <form action={accionPausar.bind(null, id)} className={CAJA + " absolute right-0 z-20 mt-2 w-[320px] p-3"}>
                  <span className={ROTULO}>Retomarla cuándo</span>
                  <input name="nota" placeholder="cuando hagan hucha, si sale la subvención…" className={CAMPO + " mt-1"} />
                  <button className={BOTON + " mt-2 w-full"}>Pausarla</button>
                </form>
              </details>
            )}
            </div>
          </div>

          {/* ---------------- los contactos de la comunidad ----------------
              Son de la COMUNIDAD, no de este encargo: el mismo presidente vale
              para el del ascensor y para el de la subvencion. Con el telefono a
              la vista, que "invita a llamar, y eso es bueno". */}
          <div className={CAJA + " p-4"}>
            <div className={ROTULO}>Contactos de la comunidad</div>
            {contactos.length === 0 ? (
              <p className="mt-1.5 text-[12px] text-carbon/50">
                {g.comunidadId
                  ? "Todavía no hay ninguno apuntado."
                  : "La dirección aún es provisional, así que no hay comunidad de la que colgarlos."}
              </p>
            ) : (
              <div className="mt-1.5 grid grid-cols-[1fr_auto_auto] items-baseline gap-x-2.5 gap-y-px text-[12px]">
                {contactos.map((c, n) => (
                  <Fragment key={n}>
                    <span className="truncate font-bold text-carbon">{c.nombre}</span>
                    <span className="tabular-nums text-carbon/75">{c.telefono ?? "—"}</span>
                    <span className="text-[11px] text-carbon/55">{c.papel ?? ""}</span>
                  </Fragment>
                ))}
              </div>
            )}
            <p
              title="Añadir un contacto está por montar"
              className="mt-2 inline-block cursor-not-allowed text-[11.5px] text-carbon/40"
            >
              + añadir contacto
            </p>
          </div>
        </div>

        {/* ------------------- SALI Y LA FRANJA -------------------
            Ella, 5-oct-2026: "Sali aqui es critica, es el chivato comercial. Es
            justo lo que hace falta para digerir tanto dato: 'es un edificio pre
            aislamiento, seguro que puedes hablarles del SATE; sus vecinos han
            accedido a subvencion de tal y ellos solo a X; y ademas es zona lo que
            sea y en su IEE dicen que no tienen resuelta la accesibilidad'".
            "Transversal y previo, explicando lo que debajo tienes en crudo":
            dos tercios para ella, y el otro tercio para las casillas y el
            Polycam. El carril NO se ensancha. */}
        <div className="mt-2.5 grid items-start gap-[10px] xl:grid-cols-[2fr_1fr]">
          <section className="rounded-[10px] border border-[#dcdcdc] bg-[#f7f7f7] px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#7a7a7a]">Sali</span>
              <span
                title="Actualizar el estado — Sali todavía no está enchufada"
                className="cursor-not-allowed text-[11px] text-carbon/35"
              >
                actualizar
              </span>
            </div>
            {/* El relato espera A PROPOSITO: "eso lo montamos cuando acaben los 4
                bloques porque va a ser en serie, asi que esperamos". Hasta
                entonces la caja se ve, con su hueco dicho. */}
            <p className="mt-1.5 text-[13px] leading-[1.5] text-carbon/45">
              Aquí contará Sali en qué punto está esta oportunidad y qué se le puede vender:
              la edad del edificio y lo que eso permite, lo que han cobrado los vecinos, en qué
              zona cae y qué dice su IEE. Se monta cuando estén los cuatro bloques, porque lo
              escribe en serie.
            </p>
          </section>

          <div className="rounded-[10px] border border-[#d9d9d9] bg-white px-3.5 py-3">
            {/* Las cuatro casillas. Se MARCAN en "Qué contratan", ahí abajo: aquí
                se leen. Dos salen del hito -viabilidad y 3D son ramales del flujo-
                y dos de los tipos que quieren. */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {[
                { que: "Necesita viabilidad", si: g.hitos.find((h) => h.clave === "viabilidad_arquitecto")?.aplicable ?? false },
                { que: "Necesita 3D", si: g.hitos.find((h) => h.clave === "tresd")?.aplicable ?? false },
                { que: "Necesita 3 presupuestos", si: quieren.some((q) => /presupuesto/i.test(q)) },
                { que: "Necesita financiación", si: quieren.some((q) => /financiaci/i.test(q)) },
              ].map((c) => (
                <span key={c.que} className="flex items-center gap-2 text-[12.5px] text-carbon">
                  <i
                    className={
                      "inline-block h-3 w-3 shrink-0 rounded-[2px] border-[1.5px] " +
                      (c.si ? "border-[#2b2b2b] bg-[#2b2b2b]" : "border-[#6a6a6a]")
                    }
                  />
                  {c.que}
                </span>
              ))}
            </div>

            {/* El Polycam: lo unico de la franja que no es una casilla. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-black/5 pt-2.5">
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#8a8a8a]">Escaneo previsto</span>
                <span className="inline-block h-[20px] min-w-[62px] rounded-[5px] border border-[#cfcfcf] bg-[#fafafa]" />
                <span
                  title="Agendar el escaneo está por montar"
                  className="cursor-not-allowed rounded-[5px] border border-[#2b2b2b]/30 px-2.5 py-px text-[11.5px] font-bold text-carbon/40"
                >
                  Agendar
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#8a8a8a]">Recibido</span>
                <span className="text-[11px] text-[#8a8a8a]">
                  {g.hitos.find((h) => h.clave === "polycam")?.estado === "hecho" ? "sí" : "todavía no ha llegado"}
                </span>
              </span>
            </div>
          </div>
        </div>
    </>
  );
}
