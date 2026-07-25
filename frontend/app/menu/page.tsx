import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";

// Navegador principal del ERP. Cada area ya esta modelada en la BD (54 tablas).
// Por ahora solo "Subvenciones" tiene pantalla; el resto llegaran por bocados.
const AREAS: { nombre: string; desc: string; href: string; icono: string; activa: boolean }[] = [
  { nombre: "Expediente virtual", desc: "Tablero 360 de una comunidad: todas las áreas de un vistazo", href: "/expediente", icono: "◉", activa: true },
  { nombre: "Datos administrativos", desc: "Trabajo administrativo de base: comunidades, equipo, administradores y contratas", href: "/administrativo", icono: "⌂", activa: true },
  { nombre: "Área comercial", desc: "Hub del comercial: alta de leads, grabar contactos por voz, cartera y proyectos", href: "/comercial", icono: "◇", activa: true },
  { nombre: "Proyecto técnico", desc: "Producción del proyecto: escaneo, nube, estado actual, solución, revisión", href: "/proyecto", icono: "▤", activa: true },
  { nombre: "Catálogo 3D", desc: "Soluciones genéricas de venta: vídeo, renders y plano acotado de cada tipo", href: "/catalogo", icono: "◼", activa: true },
  { nombre: "Visado", desc: "Visado COAM: código TL, tasas, PDF maestro y requerimientos del colegio", href: "/visado", icono: "✎", activa: true },
  { nombre: "Obra", desc: "Inicio, seguimiento y fin de obra; constructora, CSS, CFO y visitas", href: "/obra", icono: "⬒", activa: true },
  { nombre: "Facturación", desc: "Libro de Accesalia: hitos de cobro, facturas, cobros y pendientes", href: "/facturacion", icono: "€", activa: true },
  { nombre: "Subvenciones", desc: "Convocatorias, requisitos y documentación", href: "/", icono: "★", activa: true },
  { nombre: "Tres Presupuestos", desc: "Los tres presupuestos de contrata, comparación y adjudicación", href: "/tres-presupuestos", icono: "⚑", activa: true },
  { nombre: "CAES", desc: "Coordinación de actividades empresariales", href: "#", icono: "⛑", activa: false },
  { nombre: "Licencia / DR", desc: "Ayto o ECU, licencia o DR, tasas y requerimientos del ayuntamiento", href: "/licencia", icono: "✓", activa: true },
];

export default function Menu() {
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <h1 className="text-2xl font-bold text-carbon sm:text-3xl">Áreas de Accesalia</h1>
        <p className="mt-1 text-carbon/50">Elige el módulo con el que quieres trabajar.</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((a) => {
            const inner = (
              <>
                <div className="flex items-start justify-between">
                  <span className="text-2xl text-lima-dark">{a.icono}</span>
                  {a.activa ? (
                    <span className="rounded-full bg-lima-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lima-dark">
                      Disponible
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">
                      Próximamente
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-carbon">{a.nombre}</h2>
                <p className="mt-1 text-sm text-carbon/55">{a.desc}</p>
              </>
            );
            const clase =
              "block rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition " +
              (a.activa ? "hover:-translate-y-0.5 hover:shadow-md" : "opacity-60");
            return a.activa ? (
              <Link key={a.nombre} href={a.href} className={clase}>
                {inner}
              </Link>
            ) : (
              <div key={a.nombre} className={clase + " cursor-not-allowed"}>
                {inner}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
