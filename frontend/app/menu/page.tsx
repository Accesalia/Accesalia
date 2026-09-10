import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";

// Navegador principal del ERP.
//
// Tres estados, no dos. Antes solo se distinguia "tiene pantalla" de
// "proximamente", y eso no dice lo que de verdad importa hoy: que hay pantallas
// de julio que nadie ha vuelto a mirar y que puede que no cuadren. Monica:
// "yo marcaria en gris las antiguas de esta pantalla e iria poniendo en su
// color blanco actual las que vayamos abriendo".
//
//   al_dia     -> revisada con ella y rehecha. Blanca, con su color.
//   sin_ver    -> existe y funciona, pero no la hemos repasado. En gris.
//   por_hacer  -> no hay nada todavia.
//
// El area se pasa a `al_dia` SOLO cuando la hayamos mirado juntas, no cuando yo
// crea que esta bien.
type Estado = "al_dia" | "sin_ver" | "por_hacer";

const AREAS: { nombre: string; desc: string; href: string; icono: string; estado: Estado }[] = [
  { nombre: "Administración", desc: "Los maestros: comunidades, administraciones de fincas, contratas, organismos y equipo", href: "/administrativo", icono: "⌂", estado: "al_dia" },
  { nombre: "Área comercial", desc: "Hub del comercial: alta de leads, grabar contactos por voz, cartera y proyectos", href: "/comercial", icono: "◇", estado: "sin_ver" },
  { nombre: "Expediente virtual", desc: "Tablero 360 de una comunidad: todas las áreas de un vistazo", href: "/expediente", icono: "◉", estado: "sin_ver" },
  { nombre: "Proyecto técnico", desc: "Producción del proyecto: escaneo, nube, estado actual, solución, revisión", href: "/proyecto", icono: "▤", estado: "sin_ver" },
  { nombre: "Catálogo 3D", desc: "Soluciones genéricas de venta: vídeo, renders y plano acotado de cada tipo", href: "/catalogo", icono: "◼", estado: "sin_ver" },
  { nombre: "Visado", desc: "Visado COAM: código TL, tasas, PDF maestro y requerimientos del colegio", href: "/visado", icono: "✎", estado: "sin_ver" },
  { nombre: "Licencia / DR", desc: "Ayto o ECU, licencia o DR, tasas y requerimientos del ayuntamiento", href: "/licencia", icono: "✓", estado: "sin_ver" },
  { nombre: "Obra", desc: "Inicio, seguimiento y fin de obra; constructora, CSS, CFO y visitas", href: "/obra", icono: "⬒", estado: "sin_ver" },
  { nombre: "Tres Presupuestos", desc: "Los tres presupuestos de contrata, comparación y adjudicación", href: "/tres-presupuestos", icono: "⚑", estado: "sin_ver" },
  { nombre: "Facturación", desc: "Libro de Accesalia: hitos de cobro, facturas, cobros y pendientes", href: "/facturacion", icono: "€", estado: "sin_ver" },
  { nombre: "Subvenciones", desc: "Convocatorias, requisitos y documentación", href: "/", icono: "★", estado: "sin_ver" },
  { nombre: "CAES", desc: "Coordinación de actividades empresariales", href: "#", icono: "⛑", estado: "por_hacer" },
];

const SELLO: Record<Estado, { texto: string; clase: string }> = {
  al_dia: { texto: "Al día", clase: "bg-lima-soft text-lima-dark" },
  sin_ver: { texto: "Sin revisar", clase: "bg-black/5 text-carbon/40" },
  por_hacer: { texto: "Próximamente", clase: "bg-black/5 text-carbon/40" },
};

export default function Menu() {
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Áreas de Accesalia</h1>
        <p className="mt-1 text-carbon/50">
          Elige el módulo con el que quieres trabajar. Las que están{" "}
          <span className="font-semibold text-lima-dark">al día</span> ya se han revisado; las{" "}
          <span className="text-carbon/60">grises</span> funcionan, pero están pendientes de repasar.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((a) => {
            const alDia = a.estado === "al_dia";
            const sello = SELLO[a.estado];
            const inner = (
              <>
                <div className="flex items-start justify-between">
                  <span className={"text-2xl " + (alDia ? "text-lima-dark" : "text-carbon/30")}>{a.icono}</span>
                  <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + sello.clase}>
                    {sello.texto}
                  </span>
                </div>
                <h2 className={"mt-4 text-lg font-semibold " + (alDia ? "text-carbon" : "text-carbon/60")}>{a.nombre}</h2>
                <p className={"mt-1 text-sm " + (alDia ? "text-carbon/55" : "text-carbon/40")}>{a.desc}</p>
              </>
            );
            // Las que estan al dia van en blanco y con relieve. Las que no se han
            // revisado, sobre gris: se entra igual, pero se ve que estan pendientes.
            const clase =
              "block rounded-2xl border p-5 transition " +
              (alDia
                ? "border-lima/40 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                : "border-black/5 bg-hueso/60 hover:bg-white hover:shadow-sm");
            return a.estado !== "por_hacer" ? (
              <Link key={a.nombre} href={a.href} className={clase}>
                {inner}
              </Link>
            ) : (
              <div key={a.nombre} className={clase + " cursor-not-allowed opacity-60"}>
                {inner}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
