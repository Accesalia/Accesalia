import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { listarComerciales } from "../../lib/comercial";
import { cuadroComercial } from "../../lib/cuadroComercial";
import { cuadroDemo, ID_FANTASMA } from "../../lib/cuadroDemo";
import { comercialDe, quienSoy, puedeEntrar } from "../../lib/sesion";
import { guardarEntrada } from "./acciones";
import { Grabar } from "./Grabar";
import { BuscarOportunidad } from "./BuscarOportunidad";
import { CANALES, opcionesEntrada } from "../../lib/entradaDiario";
import { cuantasPendientes } from "../../lib/pendientes";
import {
  Agenda,
  Pestana,
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

export default async function AreaComercial({ searchParams }: { searchParams: Promise<{ c?: string; ver?: string; vista?: string }> }) {
  const { c, ver, vista } = await searchParams;
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
  const hoyISO = new Date().toLocaleDateString("sv-SE");
  // Las listas de la ventana de grabar una entrada. En la demo no se ofrece
  // nada: lo que se ve ahi es inventado y no existe en la base.
  const [paraGrabar, pendientes] = esDemo
    ? [{ oportunidades: [], personas: [] }, 0]
    : await Promise.all([opcionesEntrada(), cuantasPendientes(yo).catch(() => 0)]);
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
  // Las dos vistas de la agenda: modo agenda y modo calendario (suyas).
  const enAgenda = (v: string) => {
    const q = new URLSearchParams();
    if (c) q.set("c", c);
    q.set("ver", "agenda");
    if (v === "calendario") q.set("vista", "calendario");
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
            <h1 className="text-[25px] font-bold leading-tight text-carbon">Área comercial</h1>
            <p className="mt-1.5 text-[13px] text-carbon/60">
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

            {/* Las dos cosas que se CREAN. Van aqui arriba, y no junto a la
                tira: pegadas a la linea azul pareceran una pestaña mas.
                Un administrador nuevo lo da de alta el comercial: es quien lo
                conoce. Una comunidad NO: sus datos —CIF, actas, presidente— son
                cosa de Administracion (Monica, 28-sep-2026). */}
            <div className="flex h-[62px] gap-2">
              <Link
                href="/comercial/oportunidades/nueva"
                className="flex w-[100px] flex-col items-center justify-center gap-0.5 rounded-[10px] bg-[#5E744C] px-1.5 text-center text-[11px] font-bold leading-[1.15] text-[#FCEDA1] transition hover:bg-[#516340]"
              >
                <IconoNuevaOportunidad />
                Abrir Nueva oportunidad
              </Link>
              <Link
                href="/administracion/administraciones/nueva"
                className="flex w-[100px] flex-col items-center justify-center gap-0.5 rounded-[10px] bg-[#B27252] px-1.5 text-center text-[11px] font-bold leading-[1.15] text-[#FCEDA1] transition hover:bg-[#9c6045]"
              >
                <IconoNuevoAdmin />
                + Alta nuevo Administrador
              </Link>
              {/* El cuadro de mando de la gestion: asignar comerciales, ver lo
                  que se abre... Solo Alejandra, Daniel y Monica (7-oct-2026). */}
              {direccion && (
                <Link
                  href="/comercial/gestion"
                  className="flex w-[100px] flex-col items-center justify-center gap-0.5 rounded-[10px] bg-[#104269] px-1.5 text-center text-[11px] font-bold leading-[1.15] text-[#FCEDA1] transition hover:bg-[#0c3352]"
                >
                  <IconoGestion />
                  Gestión Oportunidades
                </Link>
              )}
            </div>
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

        {/* ----------------------- la tira de pestañas -----------------------
            Buscar una comunidad NO esta aqui: vive en la barra de arriba, en el
            mismo sitio en todas las pantallas (Monica, 12-sep-2026). */}
        <div className="mt-6 flex flex-wrap gap-[8px] pl-[13px]">
            <Pestana
              texto="Mis administradores"
              cuantas={cuadro.cartera.mias.length}
              activo={seccion === "administradores"}
              donde={aqui("administradores")}
              clase="w-[185px]"
              icono={<IconoCartera />}
            />
            <Pestana
              texto="Oportunidades abiertas"
              cuantas={cuadro.oportunidades.length}
              activo={seccion === "oportunidades"}
              donde={aqui("oportunidades")}
              clase="w-[180px]"
              icono={<IconoOportunidad />}
            />
            <Pestana
              texto="Agenda"
              cuantas={null}
              activo={seccion === "agenda"}
              donde={aqui("agenda")}
              clase="w-[110px]"
              icono={<IconoAgenda />}
            />
            <Pestana
              texto="Ver firmadas pendientes de cobrar"
              cuantas={cuadro.firmadas.length}
              activo={seccion === "cobros"}
              donde={aqui("cobros")}
              clase="w-[185px]"
              icono={<IconoCobro />}
            />
            <Pestana
              texto="Cómo voy de lo mío"
              cuantas={null}
              activo={seccion === "comovoy"}
              donde={aqui("comovoy")}
              clase="w-[150px]"
              icono={<IconoBalanza />}
            />
        </div>

        {/* ------- las dos columnas: la izquierda cambia, la derecha no -------
            El azul pasa por DEBAJO de las dos: es lo que las une y lo que le da
            el contraste a la zona blanca del diario (su maqueta). */}
        <div className="grid items-start gap-[16px] rounded-[10px] bg-[#104269] p-[16px] xl:grid-cols-[minmax(0,1000fr)_minmax(0,390fr)]">
          {/* ================= columna izquierda ================= */}
          <div className="min-w-0">

            {/* ---- lo que tengo que hacer ---- */}
            {seccion === "agenda" && (
              <div>
                <Agenda
                  tareas={cuadro.agenda}
                  verAgenda={enAgenda("agenda")}
                  verCalendario={enAgenda("calendario")}
                  calendario={vista === "calendario"}
                />
              </div>
            )}

            {/* ---- oportunidades abiertas: el agregado y la lista ---- */}
            {seccion === "oportunidades" && (
              <>
                <div>
                  <PanelFases pasos={cuadro.pasos} agregado={cuadro.agregado} />
                </div>
                <section className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3.5">
                    <Titulo>Oportunidades abiertas · {cuadro.oportunidades.length}</Titulo>
                    {/* Ir a una concreta, entre TODAS las abiertas (8-oct-2026). */}
                    {!esDemo && <BuscarOportunidad oportunidades={paraGrabar.oportunidades} />}
                  </div>
                  <div className="overflow-x-auto">
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
                                verFicha={
                                  esDemo
                                    ? `/comercial/ficha/${o.id}?c=${ID_FANTASMA}`
                                    : // La ficha real, de momento por COMUNIDAD y solo para direccion,
                                      // habilitada para que Monica la vea y decida (5-oct-2026).
                                      direccion && o.comunidadId
                                      ? `/comercial/ficha/${o.comunidadId}`
                                      : null
                                }
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
              <div className="space-y-6">
                <Cartera cartera={cuadro.cartera} todos={todos} />
                <MapaCartera mapa={cuadro.mapa} titulo={todos || esDemo ? "Dónde estamos y dónde no" : "Dónde estoy y dónde no"} />
              </div>
            )}

            {/* ---- firmadas, pendientes de cobro ---- */}
            {/* Otra base juridica y otra urgencia: aqui la decision ya esta
                tomada y lo que falta es un pago comprometido. */}
            {seccion === "cobros" && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                <div className="px-4 pt-3.5">
                  <Titulo>Hojas firmadas pendientes de cobro · {cuadro.firmadas.length}</Titulo>
                </div>
                <div className="overflow-x-auto">
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

          {/* ================= columna derecha, siempre igual =================
              Va sobre el azul, no fuera de el, en su propia zona blanca. */}
          <div className="flex flex-col gap-3 rounded-[10px] border border-[#0B3253] bg-white p-3">
            <Grabar
              hoy={hoyISO}
              canales={CANALES}
              oportunidades={paraGrabar.oportunidades}
              personas={paraGrabar.personas}
              // Quien ve todas las carteras no tiene conflicto con nadie.
              miComercialId={direccion ? null : mio?.id ?? null}
              guardar={guardarEntrada}
            />
            {/* Las notas que esperan en la bandeja (8-oct-2026): solo se ve si
                hay alguna. */}
            {pendientes > 0 && (
              <Link
                href="/comercial/pendientes"
                className="flex items-center justify-between rounded-xl border border-[#8a6410] bg-form-nuevo px-3.5 py-2.5 text-[14px] font-semibold text-[#5c4208] transition hover:bg-[#ffeeb0]"
              >
                <span>📥 Notas pendientes de colocar</span>
                <span className="rounded-full bg-[#5c4208] px-2 py-0.5 text-[12px] font-bold text-white">{pendientes}</span>
              </Link>
            )}
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

// La balanza de "como voy de lo mio": esta pestaña no crea nada, mira.
function IconoBalanza() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <path d="M12 3v18" />
      <path d="M5 21h14" />
      <path d="M3 7h18" />
      <path d="m6 7-3 7h6Z" />
      <path d="m18 7-3 7h6Z" />
    </svg>
  );
}

// Los dos iconos de sus botones de crear, tal como los dibujo: de linea, encima
// del texto, y del mismo crema que el rotulo.
function IconoNuevaOportunidad() {
  return (
    <svg viewBox="0 0 24 24" className="size-[19px]" {...trazo}>
      <rect x="3" y="3" width="18" height="15" rx="2" />
      <path d="M12 18v3" />
      <path d="m7 14 3-4 2.5 2.5L17 7" />
    </svg>
  );
}
function IconoGestion() {
  return (
    <svg viewBox="0 0 24 24" className="size-[19px]" {...trazo}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 17.5h7M17.5 14v7" />
    </svg>
  );
}
function IconoNuevoAdmin() {
  return (
    <svg viewBox="0 0 24 24" className="size-[19px]" {...trazo}>
      <path d="M13 20H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
      <path d="M7 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M18 15v6M15 18h6" />
    </svg>
  );
}
