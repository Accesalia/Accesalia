import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { RejillaAccesos, TarjetaAcceso, type ColorAcceso } from "../components/Accesos";
import { comercialDe, puedeEntrar, quienSoy, type Yo } from "../../lib/sesion";
import { FUNCION_REVISION } from "../../lib/revisionOferta";
import { misAvisos, type Avisos } from "../../lib/misPendientes";

export const dynamic = "force-dynamic";

// Menu principal, montado de cero el 11-sep-2026. Monica archivo todas las
// pantallas y se vuelven a montar, una a una, solo las que ella dice. Aqui
// salen SOLO esas. Una area se abre (href) cuando su pantalla esta montada y
// revisada con ella; hasta entonces es una tarjeta que no lleva a ningun sitio.
//
// Cada uno ve las areas en las que puede entrar (el acceso va por funcion):
// RRHH, todos (cada uno su espacio); el area comercial, direccion y quien es
// comercial.

type Area = { nombre: string; desc: string; href: string | null; color: ColorAcceso; ve: (yo: Yo | null, comercial: boolean) => boolean };

const AREAS: Area[] = [
  {
    nombre: "Área comercial",
    color: "azul",
    desc: "Cuadro de mando del comercial: agenda, diario, oportunidades pendientes de firma, cartera y mapa",
    href: "/comercial",
    ve: (yo, comercial) => !yo || yo.veTodo || comercial || puedeEntrar(yo, "comercial"),
  },
  {
    // El area de los MAESTROS (Monica, 25-sep-2026): lo primero que necesita el
    // estudio para trabajar de verdad es poder dar de alta y mantener las
    // administraciones y las comunidades. Dentro habra mas puertas.
    nombre: "Área Administración",
    color: "verde",
    desc: "Las administraciones de fincas y las comunidades de vecinos: consultarlas, abrir su ficha y dar de alta",
    href: "/administracion",
    ve: (yo) => !yo || yo.veTodo || puedeEntrar(yo, "administracion"),
  },
  {
    // FACTURACION Y ASIGNACION (Monica, 11-oct-2026): su propia ventanita del
    // menu. Lo que queda por cobrar, cada oportunidad con sus documentos
    // firmados, hitos y facturas, y el cronograma donde se asigna el trabajo de
    // los tecnicos y se ve la caja. Direccion, facturacion (Alexandra, Ana) y
    // control de produccion.
    nombre: "Facturación y asignación",
    color: "ambar",
    desc: "Cobrar, pagar, prever y asignar: las hojas firmadas, los impuestos, la caja del mes y el trabajo de los técnicos",
    href: "/facturacion",
    ve: (yo) => !yo || yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion" || f.clave === "control_produccion"),
  },
  {
    // ECOBALANCE (Monica, 12-oct-2026): solo Ana, Daniel y Monica. Sus listas:
    // las hojas firmadas con 3 presupuestos y las que llevan CAES.
    nombre: "Ecobalance",
    color: "verde",
    desc: "3 presupuestos, CAES, impuestos y comisiones de administradores. Solo Ecobalance y dirección",
    href: "/ecobalance",
    ve: (yo) => !!yo && (yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion_ecobalance")),
  },
  // LOS TRES CUADROS DE DIRECCION (Monica, 12-oct-2026): solo Daniel y Monica.
  // Montados con lo que hay; lo que aun no tiene dato sale como hueco con su nota.
  {
    nombre: "Negocio",
    color: "lila",
    desc: "Trabajo contratado entre fechas: opps abiertas y ganadas, importes, % de éxito y administradores nuevos, por comercial",
    href: "/negocio",
    ve: (yo) => !!yo && yo.veTodo,
  },
  {
    nombre: "Control interno",
    color: "rosa",
    desc: "Los técnicos entre fechas: proyectos hechos, requerimientos, tiempos y desviaciones; informes de Sali",
    href: "/control-interno",
    ve: (yo) => !!yo && yo.veTodo,
  },
  {
    nombre: "Resultados económicos",
    color: "melocoton",
    desc: "Facturado, gastos, horas, beneficio, morosidad, retrasos de cobro, administradores y zonas",
    href: "/resultados-economicos",
    ve: (yo) => !!yo && yo.veTodo,
  },
  { nombre: "Contratas", desc: "Las empresas contratistas y su gente", href: null, color: "arena", ve: () => true },
  {
    // Transversal, como RRHH: cualquiera busca una comunidad o un administrador
    // y llega a su ficha (Monica, 7-oct-2026).
    nombre: "Buscar y consultar",
    color: "turquesa",
    desc: "Buscar una dirección o un administrador, y los listados de oportunidades y administradores de un vistazo",
    href: "/consulta",
    ve: () => true,
  },
  {
    // Para todo el mundo (Monica, 10-oct-2026): catalogos y tablas de consulta.
    // El primero, los modelos de ascensor en 3D para enseñarlos en una junta.
    nombre: "Documentación de referencia",
    color: "lila",
    desc: "Catálogos para consultar: los modelos de ascensor en 3D, y más que vendrán",
    href: "/referencia",
    ve: () => true,
  },
  {
    nombre: "RRHH",
    color: "rosa",
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
  color: ColorAcceso;
  desc: string;
  href: string;
  /** Las claves de las funciones que abren esta puerta (basta una). */
  funciones: string[];
  /** Lo que hay esperando, para no tener que entrar a mirar. */
  cuantos?: (a: Avisos) => number;
  comoSeCuenta?: (n: number) => string;
};

const PUERTAS: Puerta[] = [
  {
    // REVISION DE OFERTAS (Monica, 14-oct-2026): el ok al paquete antes de que
    // el comercial lo mande a la comunidad. Por su funcion (hoy Daniel y Monica).
    nombre: "Revisión de ofertas",
    color: "rosa",
    desc: "Las ofertas que esperan tu ok antes de salir a la comunidad: sus hojas, la viabilidad y el presupuesto",
    href: "/comercial/revision",
    funciones: [FUNCION_REVISION],
    cuantos: (a) => a.ofertas,
    comoSeCuenta: (n) => (n === 1 ? "1 esperando tu ok" : `${n} esperando tu ok`),
  },
  {
    // GESTIONES DE LA APP (Monica, 14-oct-2026): lo que se puede tocar de la app,
    // en un sitio: funciones de cada persona, bloques, plantillas, RRHH...
    nombre: "Gestiones de la app",
    color: "lila",
    desc: "Lo que se puede tocar de la app en un solo sitio: funciones de cada persona, bloques, plantillas y RRHH",
    href: "/gestiones",
    funciones: ["direccion"],
  },
  {
    // EL RADAR DE IEE (Monica, 12-oct-2026): "un boton de ir al radar para las
    // personas que tienen funciones con ese acceso: secretaria comercial, Daniel
    // y yo". La llave es la misma que pide el radar: supervisar el area
    // comercial (Alejandra) o direccion.
    nombre: "Ir al radar",
    color: "turquesa",
    desc: "El radar de IEE: las direcciones de cada día, a quién se dieron y si salió oportunidad",
    href: "/comercial/alertas-iee",
    funciones: ["direccion", "supervision_comercial"],
  },
  {
    nombre: "Mesa de viabilidades",
    color: "melocoton",
    desc: "Los escaneados del buzón: de qué portal es cada uno, y su viabilidad",
    href: "/viabilidades",
    funciones: ["viabilidades"],
    cuantos: (a) => a.polycam,
    comoSeCuenta: (n) => (n === 1 ? "1 escaneado esperando" : `${n} escaneados esperando`),
  },
  {
    // PROYECTOS POR ESTIMAR (Monica, 16-oct-2026): la bandeja de Alex antes de
    // asignar: dificultad y dias de cada proyecto con la nube lista o sin nube.
    nombre: "Proyectos por estimar",
    color: "melocoton",
    desc: "Los proyectos con la nube lista o sin nube: su dificultad y sus días, antes de asignarlos",
    href: "/proyectos/estimar",
    funciones: ["estimacion_proyectos"],
  },
  {
    // PROCESO DE NUBES (Monica, 13-oct-2026): la lista de Abraham; Alexandra la
    // ve igual desde Asignar.
    nombre: "Proceso de nubes",
    color: "turquesa",
    desc: "Lo que necesita nube de puntos: escaneo previsto, notas, escaneado y nube lista",
    href: "/facturacion/nubes",
    funciones: ["escaneo"],
  },
  {
    // El catalogo de bloques (Monica, 3-oct-2026): direccion y la secretaria
    // comercial. Direccion ya lo ve todo; la llave que hace falta es la otra.
    nombre: "Modificar plantilla de Hoja de Encargo",
    color: "arena",
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
  // Las cuentas salen de la misma llamada que la barra (misAvisos, 16-oct-2026).
  const avisos = yo ? await misAvisos(yo) : null;
  const cuentas = puertas.map((p) => (p.cuantos && avisos ? p.cuantos(avisos) : 0));

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Áreas de Accesalia</h1>
        <p className="mt-1 text-carbon/55">Elige con qué quieres trabajar.</p>

        <RejillaAccesos className="mt-8">
          {areas.map((a) => (
            <TarjetaAcceso key={a.nombre} nombre={a.nombre} desc={a.desc} href={a.href} color={a.color} />
          ))}
        </RejillaAccesos>

        {puertas.length > 0 && (
          <section className="mt-10">
            <RejillaAccesos>
              {puertas.map((p, i) => (
                <TarjetaAcceso
                  key={p.href}
                  nombre={p.nombre}
                  desc={p.desc}
                  href={p.href}
                  color={p.color}
                  insignia={
                    p.comoSeCuenta && cuentas[i] > 0 ? (
                      <span className="shrink-0 rounded-full border border-ajeno/40 bg-ajeno-soft px-2.5 py-0.5 text-[11px] font-bold text-[#3f5f80]">
                        {p.comoSeCuenta(cuentas[i])}
                      </span>
                    ) : null
                  }
                />
              ))}
            </RejillaAccesos>
          </section>
        )}
      </main>
    </div>
  );
}
