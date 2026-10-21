import { redirect } from "next/navigation";
import { IndiceSubmenu, PaginaSubmenu, TarjetaIndice, type ColorVivo } from "../components/Submenu";
import type { Icono } from "../components/Iconos";
import { quienSoy } from "../../lib/sesion";
import { puedeAsignarFunciones } from "../../lib/gestionFunciones";

export const dynamic = "force-dynamic";

// GESTIONES DE LA APP (Monica, 14-oct-2026): lo que se puede tocar de la app,
// reunido en un sitio para no buscarlo pantalla a pantalla. Los botones pueden
// repetir accesos que ya estan en otros sitios. Es de direccion.
//
// CRECEDERA: UN ACCESO NUEVO = UNA LINEA EN `ACCESOS`.

type Acceso = { nombre: string; desc: string; href: string; color: ColorVivo; icono: Icono; soloDireccion?: boolean };

const ACCESOS: Acceso[] = [
  // TODAS LAS OPPS (Monica, 20-oct-2026): el listado entero con filtros y
  // buscador; desde ahi se cambia el comercial o el estado. De direccion.
  {
    nombre: "Todas las oportunidades",
    color: "verde",
    icono: "lista",
    desc: "El listado de todas las opps, con filtros y buscador: cambiar su comercial o su estado desde la misma lista",
    href: "/gestiones/oportunidades",
    soloDireccion: true,
  },
  {
    nombre: "Asignar funciones a personas",
    color: "lila",
    icono: "persona",
    desc: "Quién tiene cada función: dar una función a una persona o quitársela",
    href: "/gestiones/funciones",
  },
  {
    nombre: "Firmas digitales",
    color: "azul",
    icono: "firma",
    desc: "Los certificados de Accesalia, Daniel y Ecobalance, y con cuál firma la app cada cosa",
    href: "/gestiones/firmas",
  },
  {
    nombre: "Catálogo de bloques",
    color: "bronce",
    icono: "bloques",
    desc: "Los bloques que se marcan al generar una hoja de encargo: sus textos, su orden y sus importes",
    href: "/comercial/bloques",
  },
  {
    nombre: "Tarifas",
    color: "ambar",
    icono: "euro",
    desc: "Los precios habituales por tipo de cliente (comunidades, ascensoristas, rehabilitadores), que el generador de hojas propone",
    href: "/comercial/tarifas",
  },
  {
    nombre: "Plantillas",
    color: "turquesa",
    icono: "plantilla",
    desc: "Las plantillas de correo, generales y personales: verlas, crearlas y retocarlas",
    href: "/comercial/plantillas",
  },
  {
    nombre: "Alta de persona en RRHH",
    color: "frambuesa",
    icono: "personaMas",
    desc: "Dar de alta a alguien nuevo en el equipo, con sus datos y sus funciones",
    href: "/rrhh?alta=1#alta",
  },
  {
    nombre: "Subir convenio",
    color: "teja",
    icono: "subir",
    desc: "Los documentos para toda la plantilla: el convenio, el calendario laboral y la normativa interna",
    href: "/rrhh#documentos",
  },
  // LOS RELOJES (Monica, 15-oct-2026): las tareas que la app hace sola de
  // madrugada y si han ido bien. Solo para mirar. Es la sala de maquinas: la ve
  // direccion (ve_todo), como la propia pantalla.
  {
    nombre: "Relojes",
    color: "azul",
    icono: "reloj",
    desc: "Las tareas que la app hace sola (buzón del Polycam, edificios al día, censo de subvenciones…): cuándo pasaron y si fueron bien",
    href: "/relojes",
    soloDireccion: true,
  },
  {
    nombre: "Calendario",
    color: "verde",
    icono: "calendario",
    desc: "El calendario de la empresa: festivos, cierres de oficina y la jornada del convenio",
    href: "/rrhh#calendario",
  },
];

export default async function Gestiones() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones");
  if (!yo.veTodo && !puedeAsignarFunciones(yo)) redirect("/menu");

  // Submenu con la estetica de los submenus (21-oct-2026, ../components/Submenu).
  return (
    <PaginaSubmenu
      grupo="direccion"
      titulo="Gestiones de la app"
      subtitulo="Lo que se puede tocar de la app, en un solo sitio."
      salida={{ href: "/menu", texto: "← Áreas de Accesalia" }}
    >
      <IndiceSubmenu>
        {ACCESOS.filter((a) => !a.soloDireccion || yo.veTodo).map((a) => (
          <TarjetaIndice key={a.nombre} nombre={a.nombre} desc={a.desc} href={a.href} color={a.color} icono={a.icono} />
        ))}
      </IndiceSubmenu>
    </PaginaSubmenu>
  );
}
