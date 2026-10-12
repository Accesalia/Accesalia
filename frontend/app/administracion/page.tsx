import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { RejillaAccesos, TarjetaAcceso, type ColorAcceso } from "../components/Accesos";
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
  color: ColorAcceso;
  desc: string;
  href: string | null;
  cuenta?: string; // lo que hay dentro, para que se vea sin entrar
};

const PUERTAS: Puerta[] = [
  {
    nombre: "Comunidades de vecinos",
    color: "verde",
    desc: "Buscar una comunidad, abrir su ficha y completarla. Y dar de alta una nueva.",
    href: "/administracion/comunidades",
    cuenta: "1.228 en la app",
  },
  {
    nombre: "Administraciones de fincas",
    color: "azul",
    desc: "Las administraciones, su gente y las comunidades que llevan.",
    href: null,
    cuenta: "279 en la app",
  },
];

// LAS TRES ALTAS (Monica, 25-sep-2026). Son tres cosas distintas, con tres
// flujos y tres grupos de condiciones, y no se mezclan:
//   comunidad     -> gira alrededor de la DIRECCION
//   administrador -> gira alrededor de la PERSONA de contacto
//   oportunidad   -> gira alrededor de la ENTRADA DEL DIARIO
// Los tres botones viven aqui y tambien en comercial: una accion, dos puertas.

type Alta = { nombre: string; gira: string; href: string | null };

const ALTAS: Alta[] = [
  { nombre: "Una comunidad", gira: "su dirección", href: "/administracion/comunidades/nueva" },
  { nombre: "Un administrador", gira: "la persona de contacto", href: "/administracion/administraciones/nueva" },
  { nombre: "Una oportunidad", gira: "la entrada del diario", href: "/comercial/oportunidades/nueva" },
];

export default async function AreaAdministracion() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/administracion");
  if (!puedeEntrar(yo, "administracion")) redirect("/menu");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Link href="/menu" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">← Menú</Link>

        <h1 className="mt-3 text-3xl font-bold text-carbon sm:text-4xl">Área Administración</h1>
        <p className="mt-1.5 text-lg text-carbon/60">Los datos que sostienen todo lo demás: quién es quién y dónde.</p>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {ALTAS.map((a) =>
            a.href ? (
              <Link
                key={a.nombre}
                href={a.href}
                className="group inline-flex items-baseline gap-2 rounded-full bg-lima px-5 py-2.5 text-base font-bold text-carbon transition hover:bg-lima-dark hover:text-white"
              >
                + Dar de alta {a.nombre.toLowerCase()}
                <span className="text-sm font-medium text-carbon/55 group-hover:text-white/70">{a.gira}</span>
              </Link>
            ) : (
              <span
                key={a.nombre}
                className="inline-flex items-baseline gap-2 rounded-full border border-dashed border-black/15 bg-white px-5 py-2.5 text-base font-semibold text-carbon/40"
              >
                + Dar de alta {a.nombre.toLowerCase()}
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] uppercase tracking-wide">Próximamente</span>
              </span>
            ),
          )}
        </div>

        <RejillaAccesos className="mt-8">
          {PUERTAS.map((p) => (
            <TarjetaAcceso
              key={p.nombre}
              nombre={p.nombre}
              desc={p.desc}
              href={p.href}
              color={p.color}
              pie={p.cuenta ? <p className="text-sm font-semibold text-lima-dark">{p.cuenta}</p> : null}
            />
          ))}
        </RejillaAccesos>
      </main>
    </div>
  );
}
