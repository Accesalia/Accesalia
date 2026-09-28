import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { listarComerciales } from "../../lib/comercial";
import { cuadroComercial } from "../../lib/cuadroComercial";
import { cuadroDemo, ID_FANTASMA } from "../../lib/cuadroDemo";
import { comercialDe, quienSoy, puedeEntrar } from "../../lib/sesion";
import {
  Acciones,
  Agenda,
  BotonSeccion,
  Cartera,
  Cifras,
  Diario,
  PanelFases,
  TarjetaFirmada,
  TarjetaOportunidad,
  Titulo,
} from "./CuadroPiezas";
import { MapaCartera } from "./MapaCartera";

export const dynamic = "force-dynamic";

// Cuadro de mando del area comercial. Repasado con Monica el 11-sep-2026 contra
// la version de julio; de cada una se quedo lo mejor:
//   - de julio: los accesos a sus administradores y a sus proyectos, y las
//     acciones rapidas encima del diario;
//   - de la maqueta: el saludo con la fecha, la agenda de hoy y de la semana, el
//     diario a la derecha, las oportunidades con su barra, "Cómo voy", la
//     cartera y el mapa (ahora sobre cartografia de verdad, 12-sep).
// REHECHA EL 28-sep-2026 sobre su maqueta, y con dos decisiones suyas detras:
//   - APROVECHA LA PANTALLA. Estaba topada a 1200 mientras a ella le sobraba
//     media pantalla; ahora es elastica, con tope en 1900 para que en un monitor
//     grande no se estire hasta quedar ridicula. Ojo: su portatil tiene ~1470
//     pixeles CSS, no 1900, porque Windows escala.
//   - TRES ZONAS: cabecera, columna izquierda que CAMBIA, y columna derecha que
//     no cambia nunca —las cuatro acciones rapidas, "como voy de lo mio" y el
//     diario—. Lo de arriba elige que se ve a la izquierda.
//
// Montada de cero el 12-sep-2026: SOLO esta pantalla. Lo que llevaba a otras
// (acciones, administradores, proyectos, el buscador del expediente) esta
// archivado y sale como "Próximamente".
//
// QUIEN VE QUE, por funcion:
//   - direccion (Daniel, Monica) y la funcion "Supervision comercial" (hoy
//     Alejandra, que revisa y firma las hojas de encargo): todas las carteras,
//     con el selector, y la demostracion del comercial fantasma;
//   - un comercial (funcion comercial y su ficha en la lista de comerciales):
//     SU cartera y nada mas, sin selector;
//   - el resto no entra en el area.

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

function Proximamente({ texto }: { texto: string }) {
  return (
    <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-dashed border-black/15 bg-white px-4 py-2 text-base font-semibold text-carbon/45">
      {texto}
      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">Próximamente</span>
    </span>
  );
}

type Seccion = "agenda" | "oportunidades" | "administradores" | "cobros" | "comovoy";
const SECCIONES: Seccion[] = ["agenda", "oportunidades", "administradores", "cobros", "comovoy"];

export default async function AreaComercial({ searchParams }: { searchParams: Promise<{ c?: string; ver?: string }> }) {
  const { c, ver } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial");

  const comerciales = await listarComerciales();
  // Ven TODAS las carteras, con el selector: direccion y quien supervisa el
  // area (hoy Alejandra: revisa y firma las hojas antes de que salgan).
  const direccion = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const mio = await comercialDe(yo.id);

  // Un comercial ve lo suyo, diga lo que diga la direccion de la pagina.
  if (!direccion && !mio) {
    if (!puedeEntrar(yo, "comercial")) redirect("/menu");
  }
  const esDemo = direccion && c === ID_FANTASMA;
  const elegido = direccion ? comerciales.find((x) => x.id === c) ?? null : mio ? comerciales.find((x) => x.id === mio.id) ?? null : null;
  const todos = direccion && !elegido && !esDemo;
  const sinCartera = !direccion && !elegido;

  // Sin cartera propia no se enseña ninguna: cuadroComercial(null) seria la de
  // TODOS, y eso solo es para direccion.
  if (sinCartera) {
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-5 sm:px-6">
          <Link href="/menu" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">← Menú</Link>
          <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Área comercial</h1>
          <div className="mt-5 max-w-2xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            Tienes la función comercial, pero no hay una cartera a tu nombre en la lista de comerciales. Si deberías ver una,
            díselo a dirección.
          </div>
        </main>
      </div>
    );
  }

  const cuadro = esDemo ? await cuadroDemo() : await cuadroComercial(elegido?.id ?? null);
  const nombre = esDemo ? "Fantasma" : elegido && direccion ? elegido.nombre : yo.nombre;

  const hoy = FECHA_LARGA.format(new Date());
  const pill = (activo: boolean) =>
    "rounded-full border px-3.5 py-1.5 text-sm transition " +
    (activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/65 hover:border-lima");

  // Que se ve a la izquierda. Al entrar, lo que tengo que hacer.
  const seccion: Seccion = SECCIONES.includes(ver as Seccion) ? (ver as Seccion) : "agenda";
  const aqui = (v: Seccion) => {
    const q = new URLSearchParams();
    if (c) q.set("c", c);
    q.set("ver", v);
    return "/comercial?" + q.toString();
  };

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1900px] px-6 pb-16 pt-5">
        <Link href="/menu" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">← Menú</Link>

        {/* ---------------- cabecera ---------------- */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Área comercial</h1>
            <p className="mt-1.5 text-lg text-carbon/60">
              {todos ? "Todos los comerciales. " : <>Hola, <b className="text-carbon">{nombre}</b>. </>}
              {hoy.charAt(0).toUpperCase() + hoy.slice(1)}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {direccion && (
              <div className="flex flex-wrap gap-1.5">
                <Link href="/comercial" className={pill(todos)}>Todos</Link>
                {comerciales.map((m) => (
                  <Link key={m.id} href={`/comercial?c=${m.id}`} className={pill(elegido?.id === m.id)}>{m.nombre}</Link>
                ))}
                <Link
                  href={`/comercial?c=${ID_FANTASMA}`}
                  className={
                    "rounded-full border border-dashed px-3.5 py-1.5 text-sm transition " +
                    (esDemo ? "border-carbon bg-carbon font-semibold text-white" : "border-carbon/30 text-carbon/55 hover:border-carbon")
                  }
                >
                  Fantasma · demo
                </Link>
              </div>
            )}

            {/* Un administrador nuevo lo da de alta el comercial: es quien lo
                conoce. Una comunidad NO: sus datos —CIF, actas, presidente— son
                cosa de Administracion (Monica, 28-sep-2026). */}
            <Link
              href="/administracion/administraciones/nueva"
              className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-[#223A5D] bg-[#B45309] py-1 pl-1 pr-4 text-base font-bold text-[#FFD500] transition hover:bg-[#9a460a]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#223A5D] text-lg">＋</span>
              Alta nuevo Administrador
            </Link>
          </div>
        </div>

        {direccion && (
          <p className="mt-3 text-sm text-carbon/50">
            Este selector solo lo veis dirección y supervisión comercial. Cada comercial entra y ve su cartera, sin él.
          </p>
        )}
        {esDemo && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            <b>Demostración.</b> Así se verá la pantalla de un comercial con su cartera cargada. Todo lo que ves es
            inventado, salvo el mapa. No hay nada de esto en la base de datos.
          </div>
        )}

        {/* ------- las dos columnas: la izquierda cambia, la derecha no ------- */}
        <div className="mt-6 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_582px]">
          {/* ================= columna izquierda ================= */}
          <div className="min-w-0">
            {/* Buscar una comunidad NO esta aqui: vive en la barra de arriba, en
                el mismo sitio en todas las pantallas (Monica, 12-sep-2026). */}
            <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
              <BotonSeccion
                texto="Mis administradores"
                cuantas={cuadro.cartera.mias.length}
                activo={seccion === "administradores"}
                donde={aqui("administradores")}
                icono={<IconoCartera />}
              />
              <BotonSeccion
                texto="Oportunidades abiertas"
                cuantas={cuadro.oportunidades.length}
                activo={seccion === "oportunidades"}
                donde={aqui("oportunidades")}
                icono={<IconoOportunidad />}
              />
              <BotonSeccion
                texto="Agenda"
                cuantas={cuadro.agenda.length}
                activo={seccion === "agenda"}
                donde={aqui("agenda")}
                icono={<IconoAgenda />}
              />
              <BotonSeccion
                texto="Ver Firmadas pendientes de cobrar"
                cuantas={cuadro.firmadas.length}
                activo={seccion === "cobros"}
                donde={aqui("cobros")}
                aparte
                icono={<IconoCobro />}
              />
            </div>

            {/* ---- lo que tengo que hacer ---- */}
            {seccion === "agenda" && (
              <div className="mt-6">
                <Agenda tareas={cuadro.agenda} />
              </div>
            )}

            {/* ---- oportunidades abiertas: el agregado y la lista ---- */}
            {seccion === "oportunidades" && (
              <>
                <div className="mt-6">
                  <PanelFases pasos={cuadro.pasos} agregado={cuadro.agregado} />
                </div>
                <section className="mt-6">
                  <Titulo>Oportunidades abiertas · {cuadro.oportunidades.length}</Titulo>
                  <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
                    <div className="min-w-[760px]">
                      {cuadro.oportunidades.length === 0 ? (
                        <p className="px-5 py-10 text-center text-base text-carbon/50">
                          No hay ninguna oportunidad abierta en la app todavía.
                        </p>
                      ) : (
                        <ul className="divide-y divide-black/5">
                          {cuadro.oportunidades.map((o) => (
                            <li key={o.id}>
                              <TarjetaOportunidad
                                o={o}
                                pasos={cuadro.pasos}
                                umbralParado={cuadro.umbralParado}
                                umbralSinContacto={cuadro.umbralSinContacto}
                                verFicha={esDemo ? `/comercial/ficha/${o.id}?c=${ID_FANTASMA}` : null}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ---- mis administradores ---- */}
            {seccion === "administradores" && (
              <div className="mt-6">
                <Cartera cartera={cuadro.cartera} todos={todos} />
                <MapaCartera mapa={cuadro.mapa} titulo={todos || esDemo ? "Dónde estamos y dónde no" : "Dónde estoy y dónde no"} />
              </div>
            )}

            {/* ---- firmadas, pendientes de cobro ---- */}
            {/* Otra base juridica y otra urgencia: aqui la decision ya esta
                tomada y lo que falta es un pago comprometido. */}
            {seccion === "cobros" && (
              <section className="mt-6">
                <Titulo>Hojas firmadas pendientes de cobro · {cuadro.firmadas.length}</Titulo>
                <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
                  <div className="min-w-[760px]">
                    {cuadro.firmadas.length === 0 ? (
                      <p className="px-5 py-10 text-center text-base text-carbon/50">
                        Nada firmado pendiente de cobro en la app todavía.
                        <br />
                        <span className="text-sm">Los hitos de pago de una hoja aún no se guardan aquí.</span>
                      </p>
                    ) : (
                      <ul className="divide-y divide-black/5">
                        {cuadro.firmadas.map((f) => (
                          <li key={f.id}>
                            <TarjetaFirmada f={f} verFicha={esDemo ? `/comercial/ficha/${f.id}?c=${ID_FANTASMA}` : null} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ---- cómo voy de lo mío ---- */}
            {seccion === "comovoy" && <Cifras cifras={cuadro.cifras} periodo={esDemo ? "últimos 90 días" : null} />}
          </div>

          {/* ================= columna derecha, siempre igual ================= */}
          <div className="flex flex-col gap-6">
            <Acciones comoVoy={aqui("comovoy")} activo={seccion === "comovoy"} />
            <Diario entradas={cuadro.diario} />
          </div>
        </div>
      </main>
    </div>
  );
}

// Los iconos de los botones de seccion (linea, del estilo de Lucide).
const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function IconoCartera() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M2 13h20" />
    </svg>
  );
}
function IconoOportunidad() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <path d="M12 3v18" />
      <path d="M5 8h9a3 3 0 0 1 0 6H5" />
      <path d="M5 14h11" />
    </svg>
  );
}
function IconoAgenda() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
function IconoCobro() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9v6M18 9v6" />
    </svg>
  );
}
