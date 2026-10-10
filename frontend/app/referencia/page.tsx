import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
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

type Acceso = { nombre: string; desc: string; href: string | null };

const ACCESOS: Acceso[] = [
  {
    nombre: "Modelos de ascensor en 3D",
    desc: "El catálogo AT1–AT16: cada modelo en 3D para girarlo, sus imágenes y su plano. Para enseñarlo en una junta",
    href: "/referencia/ascensores",
  },
  { nombre: "Documentación de marketing", desc: "Folletos, tarifas de precios…", href: null },
  { nombre: "Tasas de ayuntamiento", desc: "Lo que sabemos calcular, por ayuntamiento y por tipo de tasa", href: null },
  {
    nombre: "Manías detectadas",
    desc: "Lo que cada ayuntamiento, junta, ECU o técnico pide a su manera, con fecha. Por municipio, entidad o persona",
    href: "/referencia/manias",
  },
];

export default async function Referencia() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Link href="/menu" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Áreas de Accesalia
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Documentación de referencia</h1>
        <p className="mt-1 text-carbon/55">Catálogos y tablas para consultar.</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ACCESOS.map((a) => {
            const contenido = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className={"text-lg font-semibold " + (a.href ? "text-carbon" : "text-carbon/55")}>{a.nombre}</h2>
                  {!a.href && (
                    <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">
                      En preparación
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
