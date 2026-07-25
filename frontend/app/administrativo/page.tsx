import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";

// Hub de DATOS ADMINISTRATIVOS = los "maestros y marcos" del ERP: las entidades
// base y sus condiciones estables (el dato-marco). El dia a dia que los aplica
// (facturacion, obra, proyecto...) vive en sus areas operativas, no aqui.
const TAREAS: { nombre: string; desc: string; href: string; icono: string; activa: boolean }[] = [
  { nombre: "Comunidades", desc: "Ver y crear comunidades: la ficha base del edificio", href: "/comunidades", icono: "⌂", activa: true },
  { nombre: "Equipo de Accesalia", desc: "Directorio del personal y las funciones que cubre (RRHH)", href: "/equipo", icono: "❖", activa: true },
  { nombre: "Administradores de fincas", desc: "Alta y ficha de las administraciones de fincas", href: "/administraciones", icono: "◇", activa: true },
  { nombre: "Contratas", desc: "Empresas colaboradoras y su acuerdo marco comercial", href: "#", icono: "⬒", activa: false },
];

export default function DatosAdministrativos() {
  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-carbon sm:text-3xl">
          <span className="text-lima-dark">⌂</span> Datos administrativos
        </h1>
        <p className="mt-1 max-w-2xl text-carbon/55">
          El trabajo administrativo de base: aquí se mantienen los <strong className="font-semibold text-carbon">datos maestros
          y los marcos</strong> (el dato estable). El día a día —facturación, obra, proyecto— se aplica en sus áreas.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TAREAS.map((t) => {
            const inner = (
              <>
                <div className="flex items-start justify-between">
                  <span className="text-2xl text-lima-dark">{t.icono}</span>
                  {t.activa ? (
                    <span className="rounded-full bg-lima-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lima-dark">
                      Disponible
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/40">
                      Próximamente
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold text-carbon">{t.nombre}</h2>
                <p className="mt-1 text-sm text-carbon/55">{t.desc}</p>
              </>
            );
            const clase =
              "block rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition " +
              (t.activa ? "hover:-translate-y-0.5 hover:shadow-md" : "opacity-60 cursor-not-allowed");
            return t.activa ? (
              <Link key={t.nombre} href={t.href} className={clase}>
                {inner}
              </Link>
            ) : (
              <div key={t.nombre} className={clase}>
                {inner}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
