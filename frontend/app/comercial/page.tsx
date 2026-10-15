import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { equipoDeComercial, listarComerciales } from "../../lib/comercial";
import { cuadroComercial, POR_PAGINA } from "../../lib/cuadroComercial";
import { cuadroDemo, ID_FANTASMA } from "../../lib/cuadroDemo";
import { comercialDe, quienSoy, puedeEntrar } from "../../lib/sesion";
import { guardarEntrada } from "./acciones";
import { Grabar } from "./Grabar";
import { CarteraConsolidados, CarteraLateral } from "./CarteraGestores";
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
import { resumenComercial } from "../../lib/resumenComercial";
import { ListaResumen } from "./resumen/ListaResumen";
import { oppsPorFases } from "../../lib/oppsPorFases";
import { FasesConMapa } from "./FasesConMapa";
import { HojaDelDia, diaPedido, hoyEnMadrid, vistaPedida, type Vista } from "../agenda/HojaDelDia";
import { Salida } from "../components/Salida";

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

type Seccion = "agenda" | "oportunidades" | "fases" | "alertas" | "administradores" | "cobros" | "comovoy";
const SECCIONES: Seccion[] = ["agenda", "oportunidades", "fases", "alertas", "administradores", "cobros", "comovoy"];

export default async function AreaComercial({ searchParams }: { searchParams: Promise<{ c?: string; ver?: string; vista?: string; pag?: string; fase?: string; dia?: string; hoja?: string }> }) {
  const { c, ver, vista, pag, fase, dia, hoja } = await searchParams;
  const pagina = Math.max(1, parseInt(pag ?? "1", 10) || 1);
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
          <Salida href="/menu">← Menú</Salida>
          <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Área comercial</h1>
          <div className="mt-5 max-w-2xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            Tienes la función comercial, pero no hay una cartera a tu nombre en la lista de comerciales. Si deberías ver una,
            díselo a dirección.
          </div>
        </main>
      </div>
    );
  }

  // Que se ve. SIN `ver`, la pantalla de accesos: un boton por cosa (los
  // comerciales, 12-oct-2026: "en vez de pestañas, botones"). Las pestañas
  // siguen ahi, como "Navegacion rapida".
  const accesos = !ver;
  const seccion: Seccion = SECCIONES.includes(ver as Seccion) ? (ver as Seccion) : "agenda";
  const faseElegida = seccion === "fases" && fase ? fase : null;
  const cuadro = esDemo ? await cuadroDemo() : await cuadroComercial(elegido?.id ?? null, pagina, faseElegida, seccion === "administradores");
  // La cartera POR GESTOR, conectada a la base (13-oct-2026). La demo sigue con la suya.
  const carteraNueva = seccion === "administradores" && !esDemo && !!cuadro.gestores;
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

  const aqui = (v: Seccion) => {
    const q = new URLSearchParams();
    if (c) q.set("c", c);
    q.set("ver", v);
    return "/comercial?" + q.toString();
  };
  // Las paginas de la lista de oportunidades: 50 cada una (Monica, 9-oct-2026).
  const paginas = Math.max(1, Math.ceil(cuadro.totalOportunidades / POR_PAGINA));
  const enPagina = (n: number) => {
    const q = new URLSearchParams();
    if (c) q.set("c", c);
    q.set("ver", seccion === "fases" ? "fases" : "oportunidades");
    if (faseElegida) q.set("fase", faseElegida);
    if (n > 1) q.set("pag", String(n));
    return "/comercial?" + q.toString();
  };
  const desde = (pagina - 1) * POR_PAGINA + 1;
  const hasta = desde + cuadro.oportunidades.length - 1;
  // Las dos vistas de la agenda: modo agenda y modo calendario (suyas).
  const enAgenda = (v: string) => {
    const q = new URLSearchParams();
    if (c) q.set("c", c);
    q.set("ver", "agenda");
    if (v === "calendario") q.set("vista", "calendario");
    return "/comercial?" + q.toString();
  };

  // LA AGENDA DE ESE COMERCIAL (Monica, 14-oct-2026): su hoja del dia, con sus
  // citas. Solo cuando hay un comercial elegido: cada persona tiene la suya, y
  // "todas las carteras" no es la agenda de nadie.
  const equipoAgenda = seccion === "agenda" && elegido && !esDemo ? await equipoDeComercial(elegido.id) : null;
  // LAS ALERTAS (Monica, 15-oct-2026): pestaña de aqui, no pagina aparte. En la
  // demo no hay: lo de la demo es inventado.
  const alertas = seccion === "alertas" && !esDemo ? (await resumenComercial(elegido?.id ?? null)).filas : [];
  // OPPS POR FASES (Monica, 15-oct-2026): todas las abiertas, fase > copy > opps,
  // con el mapa al lado. Sin la columna del diario: la lista necesita el ancho.
  const porFases = seccion === "fases" && !esDemo ? await oppsPorFases(elegido?.id ?? null) : [];
  const sinDiario = seccion === "fases";
  // El "vista" de la direccion ya era el cambio agenda / calendario; el de dia o
  // semana va en "hoja".
  const enDia = (d: string, vi: Vista) => {
    const q = new URLSearchParams();
    if (c) q.set("c", c);
    q.set("ver", "agenda");
    if (vista) q.set("vista", vista);
    if (d !== hoyEnMadrid()) q.set("dia", d);
    if (vi === "semana") q.set("hoja", "semana");
    return "/comercial?" + q.toString();
  };
  const hojaAgenda =
    seccion !== "agenda" || esDemo ? undefined : equipoAgenda ? (
      <HojaDelDia
        dia={diaPedido(dia)}
        vista={vistaPedida(hoja)}
        deQuien={equipoAgenda}
        enlace={enDia}
        // Crea citas el propio comercial, y en la de otro quien ve todo (el
        // servidor lo vuelve a comprobar).
        personas={equipoAgenda === yo.id || yo.veTodo ? paraGrabar.personas : undefined}
      />
    ) : (
      <p className="px-1 py-10 text-center text-[14px] text-carbon/65">
        {todos ? "Elige un comercial para ver su agenda." : "Este comercial no tiene ficha en el equipo: no hay agenda que enseñar."}
      </p>
    );

  // EL SELECTOR DE COMERCIAL NO SACA DE DONDE SE ESTA (Monica, 12-oct-2026):
  // al elegir uno en "Oportunidades abiertas" la devolvia a los botones. Se
  // queda en la misma pestaña, con su fase o su vista.
  const conComercial = (id: string | null) => {
    const q = new URLSearchParams();
    if (id) q.set("c", id);
    if (ver) q.set("ver", ver);
    if (ver === "fases" && fase) q.set("fase", fase);
    if (ver === "agenda" && vista) q.set("vista", vista);
    const t = q.toString();
    return "/comercial" + (t ? "?" + t : "");
  };

  const nombreFase = cuadro.pasos.find((p) => p.clave === faseElegida)?.corto.join(" ").trim() ?? faseElegida;
  const conC = c ? `?c=${c}` : "";
  // Con una fase elegida, la lista trae solo esa: el total sale de las fases.
  const totalAbiertas = faseElegida ? cuadro.agregado.reduce((t, a) => t + a.cuantas, 0) : cuadro.totalOportunidades;

  // La lista de oportunidades: la de "Oportunidades abiertas" y, filtrada, la de una fase.
  const lista = (
    <section className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3.5">
        <Titulo>
          {faseElegida ? <>En «{nombreFase}» · {cuadro.totalOportunidades}</> : <>Oportunidades abiertas · {cuadro.totalOportunidades}</>}
        </Titulo>
        {/* Ir a una concreta, entre TODAS las abiertas (8-oct-2026). */}
        {!esDemo && <BuscarOportunidad oportunidades={paraGrabar.oportunidades} />}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {cuadro.oportunidades.length === 0 ? (
            <p className="px-5 py-10 text-center text-base text-carbon/50">
              {faseElegida ? "Ninguna oportunidad está ahora en esta fase." : "No hay ninguna oportunidad abierta en la app todavía."}
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
      {paginas > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-black/5 px-4 py-3 text-sm">
          {pagina > 1 ? (
            <Link href={enPagina(pagina - 1)} className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 font-semibold text-carbon/70 transition hover:border-lima">
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-carbon/55">
            {cuadro.oportunidades.length ? <>{desde}–{hasta} de {cuadro.totalOportunidades}</> : <>No hay tantas: son {cuadro.totalOportunidades}</>}
          </span>
          {pagina < paginas ? (
            <Link href={enPagina(pagina + 1)} className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 font-semibold text-carbon/70 transition hover:border-lima">
              Siguientes →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </section>
  );

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1900px] px-6 pb-16 pt-5">
        {accesos ? (
          <Salida href="/menu">← Menú</Salida>
        ) : (
          <Salida href={`/comercial${conC}`}>← Accesos del área comercial</Salida>
        )}

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
                <Link href={conComercial(null)} className={pill(todos)}>Todos</Link>
                {comerciales.map((m) => (
                  <Link key={m.id} href={conComercial(m.id)} className={pill(elegido?.id === m.id)}>{m.nombre}</Link>
                ))}
                <Link
                  href={conComercial(ID_FANTASMA)}
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

        {accesos ? (
          <Accesos
            botones={[
              { texto: "Cartera de administradores", detalle: "Tus administradores y el mapa de dónde estás", cuantas: cuadro.cartera.gestores, donde: aqui("administradores"), icono: <IconoCartera /> },
              { texto: "Oportunidades abiertas", detalle: "Todas las abiertas, con su barra de fases", cuantas: totalAbiertas, donde: aqui("oportunidades"), icono: <IconoOportunidad /> },
              { texto: "Opps por fases", detalle: "Cuántas hay en cada fase; pincha una y ves cuáles son", cuantas: null, donde: aqui("fases"), icono: <IconoFases /> },
              { texto: "Alertas", detalle: "Lo que se ha pasado de plazo, por cómo se desbloquea", cuantas: null, donde: aqui("alertas"), icono: <IconoAlerta /> },
              { texto: "Agenda", detalle: "Lo de hoy y la semana, en agenda o calendario", cuantas: null, donde: aqui("agenda"), icono: <IconoAgenda /> },
              { texto: "¿Qué hay de lo mío?", detalle: "Cómo voy: firmas, cobros y comisión", cuantas: null, donde: aqui("comovoy"), icono: <IconoBalanza /> },
              { texto: "Plantillas de mail", detalle: "Ver, crear y retocar: las generales y las tuyas", cuantas: null, donde: "/comercial/plantillas", icono: <IconoSobre /> },
              { texto: "Correos enviados", detalle: "Lo mandado a las comunidades: cuándo, a quién y qué llevaba", cuantas: null, donde: "/comercial/correos-enviados", icono: <IconoSobre /> },
              { texto: "Direcciones vistas que no llegaron a mayores", detalle: "Los informes emitidos sin oportunidad, con día y hora", cuantas: null, donde: "/comercial/direcciones-vistas", icono: <IconoOjo /> },
            ]}
            rapida={aqui("agenda")}
          />
        ) : (
          <>
          {/* ----------------------- la tira de pestañas -----------------------
              Buscar una comunidad NO esta aqui: vive en la barra de arriba, en el
              mismo sitio en todas las pantallas (Monica, 12-sep-2026). */}
          <div className="mt-6 flex flex-wrap gap-[8px] pl-[13px]">
              <Pestana
                texto="Mis administradores"
                cuantas={cuadro.cartera.gestores}
                activo={seccion === "administradores"}
                donde={aqui("administradores")}
                clase="w-[185px]"
                icono={<IconoCartera />}
              />
              <Pestana
                texto="Oportunidades abiertas"
                cuantas={totalAbiertas}
                activo={seccion === "oportunidades"}
                donde={aqui("oportunidades")}
                clase="w-[180px]"
                icono={<IconoOportunidad />}
              />
              <Pestana
                texto="Opps por fases"
                cuantas={null}
                activo={seccion === "fases"}
                donde={aqui("fases")}
                clase="w-[150px]"
                icono={<IconoFases />}
              />
              <Pestana
                texto="Alertas"
                cuantas={null}
                activo={seccion === "alertas"}
                donde={aqui("alertas")}
                clase="w-[120px]"
                icono={<IconoAlerta />}
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
          <div
            className={
              "grid items-start gap-[16px] rounded-[10px] bg-[#104269] p-[16px] " +
              // En la cartera, 70 / 30: la lista de administradores es la
              // herramienta y necesita sitio; al lado, las opps sin administrador
              // (Monica, 15-oct-2026).
              (sinDiario ? "" : carteraNueva ? "xl:grid-cols-[minmax(0,70fr)_minmax(0,30fr)]" : "xl:grid-cols-[minmax(0,1000fr)_minmax(0,390fr)]")
            }
          >
            {/* ================= columna izquierda ================= */}
            <div className="min-w-0">

              {/* ---- lo que tengo que hacer ---- */}
              {seccion === "agenda" && (
                <div>
                  <Agenda
                    tareas={cuadro.agenda}
                    hoja={hojaAgenda}
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
                  {lista}
                </>
              )}

              {/* ---- opps por fases: arriba las fases, abajo las de la elegida ----
                  (los comerciales, 12-oct-2026) */}
              {seccion === "fases" &&
                (esDemo ? (
                  <p className="rounded-2xl bg-white px-5 py-8 text-center text-base text-carbon/65">En la demostración no hay opps por fases.</p>
                ) : (
                  <FasesConMapa filas={porFases} />
                ))}

              {/* ---- alertas: solo lo que se ha pasado de plazo, por como se desbloquea ---- */}
              {seccion === "alertas" && (
                <div className="rounded-2xl bg-white px-4 pb-5 pt-1">
                  {esDemo ? (
                    <p className="py-8 text-center text-base text-carbon/65">En la demostración no hay alertas.</p>
                  ) : (
                    <ListaResumen filas={alertas} />
                  )}
                </div>
              )}

              {/* ---- mis administradores ---- */}
              {seccion === "administradores" && (
                <div className="space-y-6">
                  {carteraNueva && cuadro.gestores ? (
                    <CarteraConsolidados
                      c={cuadro.gestores}
                      todos={todos}
                      grabar={{
                        hoy: hoyISO,
                        canales: CANALES,
                        oportunidades: paraGrabar.oportunidades,
                        personas: paraGrabar.personas,
                        miComercialId: direccion ? null : mio?.id ?? null,
                        guardar: guardarEntrada,
                      }}
                    />
                  ) : (
                    <Cartera cartera={cuadro.cartera} todos={todos} />
                  )}
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
                Va sobre el azul, no fuera de el, en su propia zona blanca. En
                Opps por fases no: ahi la lista y el mapa necesitan el ancho. */}
            {!sinDiario && (
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
              {/* En la cartera, en lugar del diario: las opps sin administrador,
                  para completar (15-oct-2026). El diario pinta dentro de una opp. */}
              {carteraNueva && cuadro.gestores ? <CarteraLateral c={cuadro.gestores} /> : <Diario entradas={cuadro.diario} />}
            </div>
            )}
          </div>
          </>
        )}
      </main>
    </div>
  );
}

// LA PANTALLA DE ACCESOS (los comerciales, 12-oct-2026): al entrar en el area,
// un boton por cosa en vez de la tira de pestañas. Es lo mismo que las
// pestañas: cada boton abre la pantalla de siempre con la suya elegida. Las
// pestañas no se quitan: son el ultimo boton, "Navegacion rapida", porque
// Monica sospecha que en cuanto se hagan a la app las preferiran.
// Mismos colores que la tira: el azul de debajo y el gris azulado de las
// pestañas sin elegir.
type Boton = { texto: string; detalle: string; cuantas: number | null; donde: string; icono: React.ReactNode };

function Accesos({ botones, rapida }: { botones: Boton[]; rapida: string }) {
  return (
    <nav className="mt-6 grid gap-4 rounded-[10px] bg-[#104269] p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
      {botones.map((b) => (
        <Link
          key={b.texto}
          href={b.donde}
          className="flex min-h-[170px] flex-col justify-between gap-3 rounded-[10px] bg-[#D8DEE5] p-4 text-[#104269] transition hover:bg-[#E4E9EE] hover:ring-2 hover:ring-[#FFCD00]"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="[&>svg]:size-[30px]">{b.icono}</span>
            {b.cuantas !== null && (
              <span className="rounded-full bg-[#104269] px-2.5 py-0.5 text-[15px] font-bold tabular-nums text-[#FFCD00]">{b.cuantas}</span>
            )}
          </div>
          <div>
            <div className="text-[20px] font-bold leading-tight">{b.texto}</div>
            <div className="mt-1 text-[13px] leading-snug text-[#104269]/85">{b.detalle}</div>
          </div>
        </Link>
      ))}
      <Link
        href={rapida}
        className="flex min-h-[170px] flex-col justify-between gap-3 rounded-[10px] border-2 border-dashed border-[#D8DEE5]/70 p-4 text-[#FFCD00] transition hover:border-[#FFCD00] hover:bg-white/5"
      >
        <span className="[&>svg]:size-[30px]"><IconoPestanas /></span>
        <div>
          <div className="text-[20px] font-bold leading-tight">Navegación rápida</div>
          <div className="mt-1 text-[13px] leading-snug text-[#F9EDEC]">La pantalla de pestañas de siempre, con todo a mano</div>
        </div>
      </Link>
    </nav>
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

// Las plantillas de mail: un sobre.
function IconoSobre() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}
// Lo visto: un ojo.
function IconoOjo() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
// Las fases: una escalera de pasos.
function IconoFases() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <path d="M3 20h4v-4h4v-4h4V8h4V4" />
      <path d="M3 20h18" />
    </svg>
  );
}
// Las alertas: un triangulo de aviso.
function IconoAlerta() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
// La navegacion rapida: la tira de pestañas.
function IconoPestanas() {
  return (
    <svg viewBox="0 0 24 24" {...trazo}>
      <rect x="2" y="9" width="20" height="12" rx="2" />
      <path d="M2 9V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v4" />
      <path d="M9 9V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
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
