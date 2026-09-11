import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { SelectorComunidad } from "../expediente/SelectorComunidad";
import { listarComerciales } from "../../lib/comercial";
import { cuadroComercial } from "../../lib/cuadroComercial";
import { cuadroDemo, ID_FANTASMA } from "../../lib/cuadroDemo";
import { Acciones, Agenda, Cartera, Cifras, Diario, Leyenda, TarjetaOportunidad, Titulo } from "./CuadroPiezas";
import { MapaCartera } from "./MapaCartera";

export const dynamic = "force-dynamic";

// Cuadro de mando del area comercial. Repasado con Monica el 11-sep-2026 contra
// la version de julio; de cada una se quedo lo mejor:
//
//   - de julio: el buscador del expediente 360 arriba del todo (el comercial no
//     se desentiende al firmar: es quien apaga los fuegos con la comunidad), los
//     accesos a sus administradores y a sus proyectos, y las acciones rapidas
//     encima del diario;
//   - de la maqueta: el saludo con la fecha, la agenda de hoy y de la semana, el
//     diario a la derecha, las oportunidades con su barra, "Cómo voy", la
//     cartera y el mapa.
//
// Las oportunidades van a lo ancho, porque la barra de 9 pasos necesita sitio, y
// se llaman "pendientes de firma": abiertas lo estan hasta el fin de obra, pero
// lo comercial acaba al firmar.
//
// El selector de comercial es para quien supervisa (Daniel, Monica). Cuando un
// comercial entre con su perfil, vera solo lo suyo y no lo vera. Hoy aun no hay
// inicio de sesion, asi que se ve siempre.

const FECHA_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

export default async function AreaComercial({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const comerciales = await listarComerciales();
  const esDemo = c === ID_FANTASMA;
  const yo = comerciales.find((x) => x.id === c) ?? null;
  const cuadro = esDemo ? await cuadroDemo() : await cuadroComercial(yo?.id ?? null);
  const todos = !yo && !esDemo;
  const sufijo = yo ? `?c=${yo.id}` : "";
  const nombre = esDemo ? "Fantasma" : yo?.nombre ?? null;

  const hoy = FECHA_LARGA.format(new Date());
  const pill = (activo: boolean) =>
    "rounded-full border px-3.5 py-1.5 text-sm transition " +
    (activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/65 hover:border-lima");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-7 sm:px-6">
        {/* ---------------- cabecera ---------------- */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Área comercial</h1>
            <p className="mt-1.5 text-lg text-carbon/60">
              {nombre ? <>Hola, <b className="text-carbon">{nombre}</b>. </> : "Todos los comerciales. "}
              {hoy.charAt(0).toUpperCase() + hoy.slice(1)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Link href="/comercial" className={pill(todos)}>Todos</Link>
            {comerciales.map((m) => (
              <Link key={m.id} href={`/comercial?c=${m.id}`} className={pill(yo?.id === m.id)}>{m.nombre}</Link>
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
        </div>

        {esDemo && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
            <b>Demostración.</b> Así se verá la pantalla de un comercial con su cartera cargada. Todo lo que ves es
            inventado, salvo el mapa. No hay nada de esto en la base de datos, y por eso las acciones rápidas y las
            tarjetas no llevan a ningún sitio.
          </div>
        )}

        {/* ---------------- buscador del expediente 360 ---------------- */}
        <div className="mt-6">
          <SelectorComunidad hrefBase="/expediente/" />
          <p className="mt-1.5 text-sm text-carbon/55">Busca una comunidad y abre su expediente completo.</p>
        </div>

        {/* ---------------- accesos ---------------- */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/administraciones"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-base font-semibold text-carbon/80 transition hover:border-lima hover:text-carbon"
          >
            🗂 Mis administradores
          </Link>
          <a
            href="#pendientes"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-base font-semibold text-carbon/80 transition hover:border-lima hover:text-carbon"
          >
            ↓ Pendientes de firma
            <span className="rounded-full bg-lima-soft px-2 text-sm text-lima-dark">{cuadro.oportunidades.length}</span>
          </a>
          <Link
            href={`/comercial/proyectos${sufijo}`}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-base font-semibold text-carbon/80 transition hover:border-lima hover:text-carbon"
          >
            📊 Mis proyectos contratados
          </Link>
        </div>

        {/* ---------------- agenda | acciones + diario ---------------- */}
        <div className="mt-7 grid items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Agenda tareas={cuadro.agenda} />
          </div>
          <div className="flex flex-col gap-6">
            <Acciones sufijo={sufijo} demo={esDemo} />
            <Diario entradas={cuadro.diario} verMas={`/comercial/diario${sufijo}`} />
          </div>
        </div>

        {/* ---------------- pendientes de firma, a lo ancho ---------------- */}
        <section id="pendientes" className="mt-10 scroll-mt-24">
          <Titulo
            extra={
              <Link href={`/comercial/oportunidades${sufijo}`} className="text-sm font-semibold text-lima-dark hover:underline">
                Ver la lista completa →
              </Link>
            }
          >
            Oportunidades pendientes de firma · {cuadro.oportunidades.length}
          </Titulo>
          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
            <div className="min-w-[760px]">
              <Leyenda pasos={cuadro.pasos} />
              {cuadro.oportunidades.length === 0 ? (
                <p className="px-5 py-10 text-center text-base text-carbon/50">
                  No hay nada pendiente de firma.{" "}
                  <Link href={`/comercial/oportunidades/nueva${sufijo}`} className="font-semibold text-lima-dark hover:underline">
                    Abrir una oportunidad →
                  </Link>
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
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <Cifras cifras={cuadro.cifras} periodo={esDemo ? "últimos 90 días" : null} />
        <Cartera cartera={cuadro.cartera} todos={todos} />
        <MapaCartera mapa={cuadro.mapa} titulo={todos || esDemo ? "Dónde estamos y dónde no" : "Dónde estoy y dónde no"} />
      </main>
    </div>
  );
}
