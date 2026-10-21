import Link from "next/link";
import { redirect } from "next/navigation";
import { IndiceSubmenu, PaginaSubmenu, TarjetaIndice, type ColorVivo } from "../components/Submenu";
import type { Icono } from "../components/Iconos";
import { quienSoy } from "../../lib/sesion";

export const dynamic = "force-dynamic";

// DOCUMENTACION DE REFERENCIA (Monica, 10-oct-2026): en el menu de todo el
// mundo, "y dentro, accesos a distintos catalogos de cosas". Para consultar,
// no para trabajar: un comercial en una junta entra y enseña un modelo.
//
// CRECEDERA (Monica, 10-oct-2026: "habra mas tipos de documentacion"). UN
// ACCESO NUEVO = UNA LINEA EN `ACCESOS` + SU PAGINA en app/referencia/<algo>/.
// Nada mas. Mientras su pagina no este montada y revisada con ella, la linea va
// con href: null y sale como tarjeta "En preparacion", sin llevar a ningun sitio.

type Acceso = { nombre: string; desc: string; href: string | null; color: ColorVivo; icono: Icono };

const ACCESOS: Acceso[] = [
  {
    nombre: "Modelos de ascensor en 3D",
    color: "azul",
    icono: "ascensor",
    desc: "El catálogo AT1–AT16: cada modelo en 3D para girarlo, sus imágenes y su plano. Para enseñarlo en una junta",
    href: "/referencia/ascensores",
  },
  {
    nombre: "Documentación de marketing",
    color: "frambuesa",
    icono: "megafono",
    desc: "Dossieres en español e inglés, tríptico, dossier SATE y las presentaciones de la subvención",
    href: "/referencia/marketing",
  },
  {
    nombre: "Tasas de ayuntamiento",
    color: "ambar",
    icono: "administracion",
    desc: "Cuánto se paga en cada municipio y cómo se pide la licencia; calculadora y ficha para los vecinos",
    href: "/referencia/tasas",
  },
  {
    nombre: "Estimación de costes de obra",
    color: "verde",
    icono: "calculadora",
    desc: "Lo que cuesta hoy un ascensor, un SATE, una rampa… según nuestras obras; cómo sube y lo que se espera a 1 y 2 años",
    href: "/referencia/estimacion",
  },
  {
    nombre: "Subvenciones posibles",
    color: "turquesa",
    icono: "ayuda",
    desc: "Para una dirección y una obra: qué ayudas podría pedir, cuánto darían, cuándo llegarían y cuánto sube la obra mientras",
    href: "/referencia/subvenciones",
  },
  {
    nombre: "Manías detectadas",
    color: "teja",
    icono: "aviso",
    desc: "Lo que cada ayuntamiento, junta, ECU o técnico pide a su manera, con fecha. Por municipio, entidad o persona",
    href: "/referencia/manias",
  },
  {
    nombre: "Consultas de edificios protegidos",
    color: "lila",
    icono: "escudo",
    desc: "Catálogos, normas y planos de protección por municipio, con el enlace oficial y cuándo revisar si han cambiado",
    href: "/referencia/proteccion",
  },
  {
    nombre: "Tipos de proyecto y servicios",
    color: "bronce",
    icono: "capas",
    desc: "Lo que vendemos: los proyectos por un lado y los servicios por otro, como salen al dar de alta una oportunidad",
    href: "/referencia/tipos",
  },
];

export default async function Referencia() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia");

  // Submenu con la estetica de los submenus (21-oct-2026, ../components/Submenu).
  return (
    <PaginaSubmenu
      grupo="todos"
      titulo="Documentación de referencia"
      subtitulo="Catálogos y tablas para consultar."
      salida={{ href: "/menu", texto: "← Áreas de Accesalia" }}
    >
      <IndiceSubmenu>
        {ACCESOS.map((a) => (
          <TarjetaIndice key={a.nombre} nombre={a.nombre} desc={a.desc} href={a.href} color={a.color} icono={a.icono} etiqueta="En preparación" />
        ))}
      </IndiceSubmenu>
    </PaginaSubmenu>
  );
}
