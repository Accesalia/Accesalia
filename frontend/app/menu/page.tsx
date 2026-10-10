import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { comercialDe, puedeEntrar, quienSoy, type Yo } from "../../lib/sesion";
import { cuantosPendientes } from "../../lib/revisionPolycam";

export const dynamic = "force-dynamic";

// Menu principal, montado de cero el 11-sep-2026. Monica archivo todas las
// pantallas y se vuelven a montar, una a una, solo las que ella dice. Aqui
// salen SOLO esas. Una area se abre (href) cuando su pantalla esta montada y
// revisada con ella; hasta entonces es una tarjeta que no lleva a ningun sitio.
//
// Cada uno ve las areas en las que puede entrar (el acceso va por funcion):
// RRHH, todos (cada uno su espacio); el area comercial, direccion y quien es
// comercial.

type Area = { nombre: string; desc: string; href: string | null; ve: (yo: Yo | null, comercial: boolean) => boolean };

const AREAS: Area[] = [
  {
    nombre: "Área comercial",
    desc: "Cuadro de mando del comercial: agenda, diario, oportunidades pendientes de firma, cartera y mapa",
    href: "/comercial",
    ve: (yo, comercial) => !yo || yo.veTodo || comercial || puedeEntrar(yo, "comercial"),
  },
  {
    // El area de los MAESTROS (Monica, 25-sep-2026): lo primero que necesita el
    // estudio para trabajar de verdad es poder dar de alta y mantener las
    // administraciones y las comunidades. Dentro habra mas puertas.
    nombre: "Área Administración",
    desc: "Las administraciones de fincas y las comunidades de vecinos: consultarlas, abrir su ficha y dar de alta",
    href: "/administracion",
    ve: (yo) => !yo || yo.veTodo || puedeEntrar(yo, "administracion"),
  },
  { nombre: "Contratas", desc: "Las empresas contratistas y su gente", href: null, ve: () => true },
  {
    // Transversal, como RRHH: cualquiera busca una comunidad o un administrador
    // y llega a su ficha (Monica, 7-oct-2026).
    nombre: "Buscar y consultar",
    desc: "Buscar una dirección o un administrador, y los listados de oportunidades y administradores de un vistazo",
    href: "/consulta",
    ve: () => true,
  },
  {
    // Para todo el mundo (Monica, 10-oct-2026): catalogos y tablas de consulta.
    // El primero, los modelos de ascensor en 3D para enseñarlos en una junta.
    nombre: "Documentación de referencia",
    desc: "Catálogos para consultar: los modelos de ascensor en 3D, y más que vendrán",
    href: "/referencia",
    ve: () => true,
  },
  {
    nombre: "RRHH",
    desc: "Tus días y tus solicitudes. Para RRHH y dirección, además: vacaciones del equipo y fichas",
    href: "/rrhh",
    ve: () => true,
  },
];

// ---------------------------------------------------------------------------
// LAS PUERTAS POR FUNCION (Monica, 2-oct-2026)
//
// Hasta hoy este cuadro repartia SOLO por area, y la mitad de las funciones no
// abren area ninguna: `viabilidades`, `iee`, `escaneo`, `proyecto`,
// `facturacion`... Alex entraba y veia dos tarjetas, una muerta. Sus palabras:
//
//   "cada persona que se loguea vera una serie de cosas, segun las funciones que
//    tenga asignadas. Ahora mismo Alex entra y tiene entre otras la funcion
//    viabilidad. Deberia verse ahi el boton que lleva a esta pantalla en su
//    cuadro de mando de entrada, no? Y yo y Daniel, tener todos los botones."
//
// Asi que esto es una puerta a UNA pantalla, no a un area: la llave es la clave
// de la funcion, y quien ve todo (direccion) las ve todas. Cuando una funcion
// junte tres o cuatro puertas, eso ya sera un area y se creara entonces.
//
// EL ROTULO DEL BLOQUE se quito el 3-oct-2026: se llamaba "Revision Polycam"
// porque era la unica puerta. Con la segunda ("Modificar plantilla de Hoja de
// Encargo") cada ventanita lleva su nombre y basta.
// ---------------------------------------------------------------------------


type Puerta = {
  nombre: string;
  desc: string;
  href: string;
  /** Las claves de las funciones que abren esta puerta (basta una). */
  funciones: string[];
  /** Lo que hay esperando, para no tener que entrar a mirar. */
  cuantos?: () => Promise<number>;
  comoSeCuenta?: (n: number) => string;
};

const PUERTAS: Puerta[] = [
  {
    nombre: "Mesa de viabilidades",
    desc: "Los escaneados del buzón: de qué portal es cada uno, y su viabilidad",
    href: "/viabilidades",
    funciones: ["viabilidades"],
    cuantos: cuantosPendientes,
    comoSeCuenta: (n) => (n === 1 ? "1 escaneado esperando" : `${n} escaneados esperando`),
  },
  {
    // El catalogo de bloques (Monica, 3-oct-2026): direccion y la secretaria
    // comercial. Direccion ya lo ve todo; la llave que hace falta es la otra.
    nombre: "Modificar plantilla de Hoja de Encargo",
    desc: "Los bloques que se marcan al generar una hoja: sus textos, su orden y sus importes por defecto",
    href: "/comercial/bloques",
    funciones: ["direccion", "secretaria"],
  },
];

export default async function Menu() {
  const yo = await quienSoy();
  const comercial = yo ? !!(await comercialDe(yo.id)) : false;
  const areas = AREAS.filter((a) => a.ve(yo, comercial));

  // Sin sesion se ven todas, como hacen ya las areas de arriba: asi se puede
  // ensenar la app sin entrar.
  const puertas = PUERTAS.filter(
    (p) => !yo || yo.veTodo || yo.funciones.some((f) => p.funciones.includes(f.clave)),
  );
  // Solo se cuenta lo que se va a pintar.
  const cuentas = await Promise.all(puertas.map((p) => (p.cuantos ? p.cuantos() : Promise.resolve(0))));

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Áreas de Accesalia</h1>
        <p className="mt-1 text-carbon/55">Elige con qué quieres trabajar.</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {areas.map((a) => {
            const contenido = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className={"text-lg font-semibold " + (a.href ? "text-carbon" : "text-carbon/55")}>{a.nombre}</h2>
                  {!a.href && (
                    <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className={"mt-1 text-sm " + (a.href ? "text-carbon/60" : "text-carbon/40")}>{a.desc}</p>
              </>
            );
            return a.href ? (
              <Link
                key={a.nombre}
                href={a.href}
                className="block rounded-2xl border border-lima/40 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {contenido}
              </Link>
            ) : (
              <div key={a.nombre} className="rounded-2xl border border-black/5 bg-hueso/60 p-5">
                {contenido}
              </div>
            );
          })}
        </div>

        {puertas.length > 0 && (
          <section className="mt-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {puertas.map((p, i) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="block rounded-2xl border border-ajeno/40 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-carbon">{p.nombre}</h3>
                    {p.comoSeCuenta && cuentas[i] > 0 && (
                      <span className="shrink-0 rounded-full border border-ajeno/40 bg-ajeno-soft px-2.5 py-0.5 text-[11px] font-bold text-[#3f5f80]">
                        {p.comoSeCuenta(cuentas[i])}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-carbon/60">{p.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
