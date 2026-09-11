import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";

// Menu principal, montado de cero el 11-sep-2026. Monica archivo todas las
// pantallas y se vuelven a montar, una a una, solo las que ella dice. Aqui
// salen SOLO esas. Una area se abre (href) cuando su pantalla esta montada y
// revisada con ella; hasta entonces es una tarjeta que no lleva a ningun sitio.

type Area = { nombre: string; desc: string; href: string | null };

const AREAS: Area[] = [
  {
    nombre: "Área comercial",
    desc: "Cuadro de mando del comercial: agenda, diario, oportunidades pendientes de firma, cartera y mapa",
    href: null,
  },
  { nombre: "Administraciones de fincas", desc: "Las administraciones, su gente y las comunidades que llevan", href: null },
  { nombre: "Contratas", desc: "Las empresas contratistas y su gente", href: null },
  { nombre: "RRHH", desc: "Empleados, vacaciones, nóminas y documentos", href: null },
];

export default function Menu() {
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Áreas de Accesalia</h1>
        <p className="mt-1 text-carbon/55">Elige con qué quieres trabajar.</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {AREAS.map((a) => {
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
      </main>
    </div>
  );
}
