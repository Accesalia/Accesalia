import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CambiarDireccion } from "./CambiarDireccion";
import { BarraSuperior } from "../../../components/BarraSuperior";
import {
  catalogoTipos,
  comercialesActivos,
  equipoOpciones,
  gestionOportunidad,
  ESTADOS_HITO,
  ESTADOS_3D,
  RESULTADOS_JUNTA,
  TIPOS_3D,
} from "../../../../lib/gestionOportunidad";
import { COMO_FUE } from "../../../../lib/entradaDiario";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { accionComercial, accionPausar, accionEntrada, accionHito, accionJunta, accionNegociacion, accionReactivar, accionTipos, accionTresD } from "./acciones";
import { Fases, QueContratan, Serie, Titulo } from "./Piezas";
import { AZUL, Carril } from "./Carril";
import { Edificio } from "./Edificio";
import { BOTON, CAJA, CAMPO, ROTULO } from "./estilo";

export const dynamic = "force-dynamic";
// El informe del edificio sale a Catastro y al geoportal de Madrid: tarda.
export const maxDuration = 60;

// GESTIONAR UNA OPORTUNIDAD (Monica, 28-sep-2026).
//
// "Tenemos una pagina de crear opp, pero no una de seguimiento". Esta es. La
// ficha que se despliega en el listado es un RESUMEN y se queda como esta; aqui
// se trabaja.
//
// Siete bloques, y el orden no es casual: primero donde esta (las fases), luego
// que se le vende, y al final lo que se ha ido contando. Lo que se toca a
// diario, arriba.
//
// Cada bloque se guarda solo: un unico "guardar" al final obliga a repasar la
// pantalla entera para cambiar una fecha.

const EUR = new Intl.NumberFormat("es-ES");

/** 2026-03-14 -> 14/03/26 */
function fechaCorta(v: string): string {
  const [a, m, d] = v.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

export default async function GestionOportunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial")) redirect("/menu");

  const [g, tipos, equipo, comerciales] = await Promise.all([gestionOportunidad(id), catalogoTipos(), equipoOpciones(), comercialesActivos()]);
  // Elegir el comercial: quien supervisa el area comercial. Los demas lo leen.
  const eligeComercial = puedeEntrar(yo, "comercial", "supervisar");
  if (!g) notFound();

  const pausada = g.estado === "pausada";
  const hechos = g.hitos.filter((h) => h.estado === "hecho").length;
  const aplican = g.hitos.filter((h) => h.estado !== "no_aplica").length;
  const ahora = g.hitos.find((h) => h.estado === "en_curso") ?? g.hitos.find((h) => h.estado === "pendiente" && h.aplicable);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      {/* El lienzo es el suyo: 1300, el ancho real de su pantalla. Lo que se
          dibuje aqui mide lo que va a medir de verdad (esqueleto del 30-sep). */}
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Link href="/comercial?ver=oportunidades" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Oportunidades abiertas
        </Link>

        {/* ------------------------- 1 · cabecera ------------------------- */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[25px] font-bold leading-tight text-carbon">{g.direccion}</h1>
            <div className="mt-1.5 flex flex-wrap items-center">
              {g.aviso && (
                <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                  {g.aviso}
                </span>
              )}
              <CambiarDireccion id={id} actual={g.direccion} pendiente={Boolean(g.aviso)} />
            </div>
            <p className="mt-1.5 text-[13px] text-carbon/60">
              {g.codigo && <b className="text-carbon/80">{g.codigo}</b>}
              {!eligeComercial && g.comercial && <> · {g.comercial}</>}
              {g.administracion && <> · {g.administracion}</>}
              {g.contacto && <> · {g.contacto}{g.contactoDonde && <span className="text-carbon/45"> ({g.contactoDonde})</span>}</>}
              {g.trajo && <> · <span className="text-carbon/45">lo trajo</span> {g.trajo}</>}
            </p>
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Va por</div>
              <div className="text-[15px] font-bold text-carbon">
                {hechos} de {aplican} fases
                {ahora && <span className="font-normal text-carbon/55"> · ahora, {ahora.nombre.toLowerCase()}</span>}
              </div>
            </div>
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

        {pausada && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
            <b>Pausada{g.pausa && <> desde el {fechaCorta(g.pausa.desde)}</>}.</b> No está perdida: está esperando.
            {g.pausa?.condicion && <> Se retoma {g.pausa.condicion}.</>}
            {g.pausa?.motivo && <> Motivo: {g.pausa.motivo}.</>}
          </div>
        )}

        {/* ------------------- el carril y el panel -------------------
            La columna de bloques es menu e indicador de avance a la vez, y el
            activo cruza el hueco para fundirse con el panel: "sin linea entre
            ellos, el ojo lee una pieza" (Monica, 30-sep-2026). */}
        <div className="mt-6 flex items-stretch gap-[14px]">
          <Carril hitos={g.hitos} />
          <div
            style={{ borderColor: AZUL, borderRadius: "0 10px 10px 10px" }}
            className="min-w-0 flex-1 border bg-white/40 p-4"
          >
        {/* SUS CUATRO ANCHOS FIJOS, del esqueleto del 30-sep: 262 · 330 · 190 ·
            282. "Sus anchos son el diseno": no se redondean ni se reparten en
            fracciones. Las tres primeras las llena el informe del edificio; la
            cuarta, el diario. Y el trabajo que todavia no tiene bloque asignado
            va en una segunda fila, a lo ancho.

            Se colocan por rejilla y no por orden en el fichero, para no mover de
            sitio codigo que ya funciona. */}
        <div className="grid items-start gap-[10px] xl:grid-cols-[262px_330px_190px_minmax(0,282px)]">
          {g.referenciaCatastral ? (
            <Edificio referencia={g.referenciaCatastral} />
          ) : (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-snug text-amber-900/80 xl:col-span-3">
              <b>Todavía no hay edificio que mirar.</b> Esta oportunidad no tiene referencia
              catastral, así que no se puede traer ni el Catastro, ni la zona, ni las
              subvenciones. Se arregla fijando la dirección.
            </div>
          )}

          {/* ================== el trabajo (segunda fila, a lo ancho) ================== */}
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-4 xl:row-start-2">
            {/* --------------------- 2 · las diez fases ---------------------
                Una barra, y abierta solo la que toca. Antes eran diez filas con
                cuatro botones cada una: dos pantallas de cosas que hoy no
                aplican (Monica, 29-sep-2026). */}
            <Fases hitos={g.hitos} estados={ESTADOS_HITO} equipo={equipo} guardar={accionHito.bind(null, id)} />

            {/* --------------------- 3 · qué contratan --------------------- */}
            <QueContratan tipos={tipos} elegidos={g.tiposElegidos} guardar={accionTipos.bind(null, id)} />

            {/* ----------------- 4 · qué vendemos y por cuánto ----------------- */}
            <form action={accionNegociacion.bind(null, id)} className={CAJA + " p-4"}>
              <Titulo
                extra={
                  <span className="text-[11px] text-carbon/50">Cada cambio queda guardado: un precio que baja cuenta algo</span>
                }
              >
                Qué le vendemos
              </Titulo>
              <div className="flex flex-wrap gap-3">
                <label className="block min-w-[260px] flex-1">
                  <span className={ROTULO}>Qué le vendemos</span>
                  <input
                    name="que_vendemos"
                    defaultValue={g.negociacion?.queVendemos ?? ""}
                    placeholder="Ascensor + licencia"
                    className={CAMPO + " mt-1"}
                  />
                </label>
                <label className="block w-[150px]">
                  <span className={ROTULO}>Precio (€)</span>
                  <input
                    name="precio"
                    defaultValue={g.negociacion?.precio != null ? EUR.format(g.negociacion.precio) : ""}
                    inputMode="decimal"
                    className={CAMPO + " mt-1"}
                  />
                </label>
                <label className="block min-w-[260px] flex-1">
                  <span className={ROTULO}>Alcance</span>
                  <input name="alcance" defaultValue={g.negociacion?.alcance ?? ""} className={CAMPO + " mt-1"} />
                </label>
              </div>
              <label className="mt-3 block">
                <span className={ROTULO}>Notas de la negociación</span>
                <input name="notas" defaultValue={g.negociacion?.notas ?? ""} className={CAMPO + " mt-1"} />
              </label>
              <div className="mt-3 flex justify-end">
                <button className={BOTON}>Guardar</button>
              </div>
            </form>

            <div className="flex flex-col gap-5">
              {/* ------------------------- 5 · el 3D ------------------------- */}
              <form action={accionTresD.bind(null, id)} className={CAJA + " p-4"}>
                <Titulo>El 3D</Titulo>
                <div className="flex flex-col gap-3">
                  <label className="block">
                    <span className={ROTULO}>De qué tipo</span>
                    <select name="tipo" defaultValue={g.tresD?.tipo ?? "generico_escalera"} className={CAMPO + " mt-1"}>
                      {TIPOS_3D.map((t) => (
                        <option key={t.valor} value={t.valor}>{t.texto}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Cómo va</span>
                    <select name="estado" defaultValue={g.tresD?.estado ?? "pedido"} className={CAMPO + " mt-1"}>
                      {ESTADOS_3D.map((e) => (
                        <option key={e.valor} value={e.valor}>{e.texto}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-3">
                    <label className="block flex-1">
                      <span className={ROTULO}>Para cuándo hace falta</span>
                      <input type="date" name="fecha_necesaria" defaultValue={g.tresD?.fechaNecesaria ?? ""} className={CAMPO + " mt-1"} />
                    </label>
                    <label className="block flex-1">
                      <span className={ROTULO}>Entregado el</span>
                      <input type="date" name="fecha_entrega" defaultValue={g.tresD?.fechaEntrega ?? ""} className={CAMPO + " mt-1"} />
                    </label>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-snug text-carbon/50">
                  Quién lo monta se apunta en el responsable de la fase «3D para junta», ahí arriba. Y el enlace al modelo,
                  en esa misma fase.
                </p>
                <div className="mt-3 flex justify-end">
                  <button className={BOTON}>Guardar</button>
                </div>
              </form>

              {/* ------------------------ 6 · las juntas ------------------------
                  SERIE, no ficha: una junta se aplaza, piden mas presupuestos y
                  se vuelve a votar. "Ya nos han dado planton dos veces" es
                  informacion de venta, y guardando solo la ultima se pierde. */}
              <Serie
                titulo="Las juntas"
                pie="Una línea por junta: se aplazan, se repiten"
                vacio="Todavía no hay ninguna junta apuntada."
                estados={RESULTADOS_JUNTA}
                guardar={accionJunta.bind(null, id)}
                intentos={g.juntas.map((x) => ({
                  id: x.id,
                  fecha: x.fecha,
                  estado: x.resultado,
                  detalle: x.detalle,
                  marca: x.seguimiento,
                  marcaTexto: "perseguir",
                }))}
              />
            </div>
          </div>

          {/* ============ cuarta columna: 7 · el diario de esta opp ============ */}
          <div className="flex min-w-0 flex-col gap-5 xl:col-start-4 xl:row-start-1">
            <form action={accionEntrada.bind(null, id)} className={CAJA + " p-4"}>
              <Titulo>Grabar aquí</Titulo>
              <textarea
                name="texto"
                rows={4}
                required
                placeholder="Cuéntalo como se lo contarías a un compañero. Puedes dictarlo con el micro de tu teclado."
                className={CAMPO + " resize-y leading-relaxed"}
              />
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="block w-[135px]">
                  <span className={ROTULO}>Cuándo</span>
                  <input type="date" name="fecha" className={CAMPO + " mt-1"} />
                </label>
                <label className="block min-w-0 flex-1">
                  <span className={ROTULO}>Cómo fue</span>
                  <select name="como_fue" defaultValue="visita" className={CAMPO + " mt-1"}>
                    {COMO_FUE.map((c) => (
                      <option key={c.valor} value={c.valor}>{c.texto}</option>
                    ))}
                  </select>
                </label>
                <button className={BOTON}>Guardar</button>
              </div>
            </form>

            <section className={CAJA + " overflow-hidden"}>
              <div className="px-4 pt-4">
                <Titulo>Lo que va pasando</Titulo>
              </div>
              {g.diario.length === 0 ? (
                <p className="px-4 pb-6 text-[13px] text-carbon/50">Todavía no hay nada grabado en esta oportunidad.</p>
              ) : (
                <ul className="max-h-[36rem] divide-y divide-black/5 overflow-y-auto">
                  {g.diario.map((e) => {
                    // La cabecera es igual venga de donde venga la entrada. Lo que
                    // cambia es como se lee el texto largo:
                    //   - una INTERACCION se abre: se pincha y va a su ficha.
                    //   - una NOTA rescatada de Dropbox no tiene ficha propia, asi
                    //     que se DESPLIEGA aqui mismo. Sin esto, el recorte a tres
                    //     lineas dejaria ilegible la mitad del diario: muchas son
                    //     correos enteros de doce o veinte lineas.
                    const cabecera = (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-carbon/55">
                        <span className="font-bold text-carbon/80">
                          {e.fecha ? e.fecha.split("-").reverse().join("/") : "sin fecha"}
                        </span>
                        <span className="rounded-full border border-black/5 bg-hueso px-2 py-px text-[11px] font-semibold">{e.comoFue}</span>
                        {e.con && <span className="text-lima-dark">{e.con}</span>}
                      </div>
                    );
                    const TEXTO = "mt-1 whitespace-pre-line text-[14px] leading-snug text-carbon/80";
                    const largo = e.texto.length > 150 || e.texto.includes("\n");

                    if (e.enlazable) {
                      return (
                        <li key={e.id}>
                          <Link href={`/comercial/interaccion/${e.id}`} className="block px-4 py-3 transition hover:bg-black/[0.02]">
                            {cabecera}
                            <p className={TEXTO + " line-clamp-3"}>{e.texto}</p>
                          </Link>
                        </li>
                      );
                    }
                    if (!largo) {
                      return (
                        <li key={e.id} className="px-4 py-3">
                          {cabecera}
                          <p className={TEXTO}>{e.texto}</p>
                        </li>
                      );
                    }
                    return (
                      <li key={e.id}>
                        <details className="group px-4 py-3 transition hover:bg-black/[0.02]">
                          <summary className="cursor-pointer list-none">
                            {cabecera}
                            <p className={TEXTO + " line-clamp-3 group-open:hidden"}>{e.texto}</p>
                            <span className="mt-0.5 inline-block text-[11px] font-semibold text-lima-dark group-open:hidden">
                              leer entera
                            </span>
                          </summary>
                          <p className={TEXTO}>{e.texto}</p>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
          </div>
        </div>
      </main>
    </div>
  );
}
