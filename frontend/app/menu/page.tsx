import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";

// Navegador principal del ERP. Cada area ya esta modelada en la BD (54 tablas).
// Por ahora solo "Subvenciones" tiene pantalla; el resto llegaran por bocados.
const AREAS: { nombre: string; desc: string; href: string; icono: string; activa: boolean }[] = [
  { nombre: "Comercial", desc: "Cartera de administradores, oportunidades y comisiones", href: "/administradores", icono: "◇", activa: true },
  { nombre: "Proyecto técnico", desc: "Tramitación y documentación técnica", href: "#", icono: "▤", activa: false },
  { nombre: "Obra", desc: "Ejecución, hitos y certificaciones", href: "#", icono: "⬒", activa: false },
  { nombre: "Facturación", desc: "Facturas, cobros y pagos", href: "#", icono: "€", activa: false },
  { nombre: "Subvenciones", desc: "Convocatorias, requisitos y documentación", href: "/", icono: "★", activa: true },
  { nombre: "Licitación", desc: "Concursos y ofertas públicas", href: "#", icono: "⚑", activa: false },
  { nombre: "CAES", desc: "Coordinación de actividades empresariales", href: "#", icono: "⛑", activa: false },
  { nombre: "Licencias", desc: "Permisos y autorizaciones", href: "#", icono: "✓", activa: false },
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
