import Link from "next/link";
import { redirect } from "next/navigation";
import { IndiceSubmenu, PaginaSubmenu, TarjetaIndice, type ColorVivo } from "../components/Submenu";
import type { Icono } from "../components/Iconos";
import { puedeEntrar, quienSoy } from "../../lib/sesion";

export const dynamic = "force-dynamic";

// EL HUB DEL AREA DE ADMINISTRACION (Monica, 25-sep-2026).
//
// "Como mínimo, en la ventana de botones inicial necesitaré uno que diga Área
// Administración. Y dentro, un botón que sea Administradores de fincas y otro
// que sea Comunidades de vecinos."
//
// Y avisa: "muy probablemente, casi seguro, habrá más en el futuro: hagámoslo
// flexible". Por eso las puertas son una LISTA: añadir una es añadir una linea,
// y la que no tiene pantalla todavia sale apagada, sin llevar a ningun sitio.

type Puerta = {
  nombre: string;
  color: ColorVivo;
  icono: Icono;
  desc: string;
  href: string | null;
  cuenta?: string; // lo que hay dentro, para que se vea sin entrar
};

const PUERTAS: Puerta[] = [
  {
    nombre: "Comunidades de vecinos",
    color: "verde",
    icono: "administracion",
    desc: "Buscar una comunidad, abrir su ficha y completarla. Y dar de alta una nueva.",
    href: "/administracion/comunidades",
    cuenta: "1.228 en la app",
  },
  {
    nombre: "Administraciones de fincas",
    color: "azul",
    icono: "maletin",
    // La lista, por administracion o por gestor (20-oct-2026). La ficha de cada
    // una, despues: su maqueta esta a medias.
    desc: "La lista de administraciones y sus gestores: quién las lleva, desde cuándo y cuántas firmadas. Y dar de alta uno nuevo.",
    href: "/administracion/administraciones",
    cuenta: "355 en la app",
  },
];

// LAS ALTAS (Monica, 25-sep-2026), y no se mezclan:
//   administrador -> gira alrededor de la PERSONA de contacto
//   oportunidad   -> gira alrededor de la ENTRADA DEL DIARIO
// La comunidad ya NO tiene alta propia (13-oct-2026): nace DESDE la opp, al
// vincularle los accesos de Catastro (lib/altaOportunidad, comunidadDesdeAccesos).

type Alta = { nombre: string; gira: string; href: string | null };

const ALTAS: Alta[] = [
  { nombre: "Un administrador", gira: "la persona de contacto", href: "/administracion/administraciones/nueva" },
  { nombre: "Una oportunidad", gira: "la entrada del diario", href: "/comercial/oportunidades/nueva" },
];

export default async function AreaAdministracion() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion");
  if (!puedeEntrar(yo, "administracion")) redirect("/menu");

  // Submenu con la estetica de los submenus (21-oct-2026, ../components/Submenu).
  // Las altas, arriba como siempre: en lima, que es el color de la accion.
  return (
    <PaginaSubmenu grupo="trabajo" titulo="Área Administración" subtitulo="Los datos que sostienen todo lo demás: quién es quién y dónde.">
      <div className="mt-6 flex flex-wrap gap-2.5">
        {ALTAS.map((a) =>
          a.href ? (
            <Link
              key={a.nombre}
              href={a.href}
              className="group inline-flex items-baseline gap-2 rounded-full bg-lima px-5 py-2.5 text-base font-bold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              + Dar de alta {a.nombre.toLowerCase()}
              <span className="text-sm font-medium text-carbon/65 group-hover:text-white/75">{a.gira}</span>
            </Link>
          ) : (
            <span
              key={a.nombre}
              className="inline-flex items-baseline gap-2 rounded-full border border-dashed border-white/25 px-5 py-2.5 text-base font-semibold text-[#f3f4f1]/55"
            >
              + Dar de alta {a.nombre.toLowerCase()}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">Próximamente</span>
            </span>
          ),
        )}
      </div>

      <IndiceSubmenu>
        {PUERTAS.map((p) => (
          <TarjetaIndice key={p.nombre} nombre={p.nombre} desc={p.desc} href={p.href} color={p.color} icono={p.icono} pie={p.cuenta} />
        ))}
      </IndiceSubmenu>
    </PaginaSubmenu>
  );
}
