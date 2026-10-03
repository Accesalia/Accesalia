import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import {
  catalogoTipos,
  equipoOpciones,
  gestionOportunidad,
  ESTADOS_HITO,
  ESTADOS_3D,
  RESULTADOS_JUNTA,
  TIPOS_3D,
} from "../../../../lib/gestionOportunidad";
import { COMO_FUE } from "../../../../lib/entradaDiario";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import { accionAplazar, accionEntrada, accionHito, accionJunta, accionNegociacion, accionReactivar, accionTipos, accionTresD } from "./acciones";
import { Fases, QueContratan, Serie, Titulo } from "./Piezas";
import { BOTON, CAJA, CAMPO, ROTULO } from "./estilo";

export const dynamic = "force-dynamic";

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

export default async function GestionOportunidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/oportunidades/" + id);
  if (!puedeEntrar(yo, "comercial")) redirect("/menu");

  const [g, tipos, equipo] = await Promise.all([gestionOportunidad(id), catalogoTipos(), equipoOpciones()]);
  if (!g) notFound();

  const latente = g.estado === "latente";
  const hechos = g.hitos.filter((h) => h.estado === "hecho").length;
  const aplican = g.hitos.filter((h) => h.estado !== "no_aplica").length;
  const ahora = g.hitos.find((h) => h.estado === "en_curso") ?? g.hitos.find((h) => h.estado === "pendiente" && h.aplicable);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-6 pb-16 pt-5">
        <Link href="/comercial?ver=oportunidades" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Oportunidades abiertas
        </Link>

        {/* ------------------------- 1 · cabecera ------------------------- */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[25px] font-bold leading-tight text-carbon">{g.direccion}</h1>
            {g.aviso && (
              <span className="mt-1.5 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                {g.aviso}
              </span>
            )}
            <p className="mt-1.5 text-[13px] text-carbon/60">
              {g.codigo && <b className="text-carbon/80">{g.codigo}</b>}
              {g.comercial && <> · {g.comercial}</>}
              {g.administracion && <> · {g.administracion}</>}
              {g.contacto && <> · {g.contacto}{g.contactoDonde && <span className="text-carbon/45"> ({g.contactoDonde})</span>}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Va por</div>
              <div className="text-[15px] font-bold text-carbon">
                {hechos} de {aplican} fases
                {ahora && <span className="font-normal text-carbon/55"> · ahora, {ahora.nombre.toLowerCase()}</span>}
              </div>
            </div>
            {latente ? (
              <form action={accionReactivar.bind(null, id)}>
                <button className={BOTON + " !bg-[#5E744C] !border-[#3f5236] hover:!bg-[#516340]"}>Reactivar</button>
              </form>
            ) : (
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-[6px] border border-carbon/25 px-3 py-1.5 text-[12px] font-bold uppercase text-carbon/60 transition hover:border-carbon/50">
                  Aplazar
                </summary>
                <form action={accionAplazar.bind(null, id)} className={CAJA + " absolute right-0 z-20 mt-2 w-[320px] p-3"}>
                  <span className={ROTULO}>Retomarla cuándo</span>
                  <input name="nota" placeholder="cuando hagan hucha, si sale la subvención…" className={CAMPO + " mt-1"} />
                  <button className={BOTON + " mt-2 w-full"}>Dejarla latente</button>
                </form>
              </details>
            )}
          </div>
        </div>

        {latente && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
            <b>Latente.</b> No está perdida: está esperando.
            {g.reactivarNota && <> Se retoma {g.reactivarNota}.</>}
          </div>
        )}

        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1000fr)_minmax(0,430fr)]">
          {/* ================== columna izquierda: el trabajo ================== */}
          <div className="flex min-w-0 flex-col gap-5">
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

          {/* ============ columna derecha: 7 · el diario de esta opp ============ */}
          <div className="flex flex-col gap-5">
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
                  {g.diario.map((e) => (
                    <li key={e.id}>
                      <Link href={`/comercial/interaccion/${e.id}`} className="block px-4 py-3 transition hover:bg-black/[0.02]">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-carbon/55">
                          <span className="font-bold text-carbon/80">{e.fecha.split("-").reverse().join("/")}</span>
                          <span className="rounded-full border border-black/5 bg-hueso px-2 py-px text-[11px] font-semibold">{e.comoFue}</span>
                          {e.con && <span className="text-lima-dark">{e.con}</span>}
                        </div>
                        <p className="mt-1 line-clamp-3 text-[14px] leading-snug text-carbon/80">{e.texto}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
