import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { PestanasMaestros } from "../components/PestanasMaestros";

// Hub de ADMINISTRACION = los maestros del ERP: las entidades base y sus
// condiciones estables. El dia a dia que las aplica (facturacion, obra,
// proyecto...) vive en sus areas operativas, no aqui.
//
// Se llamaba "Datos administrativos" y Monica lo renombro a "Administracion".
// Lo cambie en el menu y se me quedo el rotulo viejo aqui dentro: "dice areas
// de accesalia - administracion, pero si entras pone datos administrativos".
//
// Los tres estados son los mismos del menu y de las pestañas, para que la app
// diga siempre lo mismo sobre lo mismo.
type Estado = "al_dia" | "sin_ver" | "por_hacer";

const TAREAS: { nombre: string; desc: string; href: string; icono: string; estado: Estado }[] = [
  { nombre: "Administraciones de fincas", desc: "Las empresas que administran las comunidades, su gente y lo pactado con ellas", href: "/administraciones", icono: "◇", estado: "al_dia" },
  { nombre: "Contratas", desc: "Empresas que hacen la obra, su gente y su historia laboral", href: "/contratas", icono: "⬒", estado: "al_dia" },
  { nombre: "Organismos", desc: "Ayuntamientos, juntas de distrito, COAM y ECUs", href: "/organismos", icono: "⚖", estado: "por_hacer" },
  { nombre: "Comunidades", desc: "Ver y crear comunidades: la ficha base del edificio", href: "/comunidades", icono: "⌂", estado: "sin_ver" },
  { nombre: "Equipo de Accesalia", desc: "Directorio del personal y las funciones que cubre", href: "/equipo", icono: "❖", estado: "sin_ver" },
];

const SELLO: Record<Estado, { texto: string; clase: string }> = {
  al_dia: { texto: "Al día", clase: "bg-lima-soft text-lima-dark" },
  sin_ver: { texto: "Sin revisar", clase: "bg-black/5 text-carbon/50" },
  por_hacer: { texto: "Sin pantalla", clase: "bg-amber-50 text-amber-700" },
};

export default function Administracion() {
  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <PestanasMaestros activa="administraciones" />
      <main className="mx-auto max-w-[1100px] px-6 pb-16 pt-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-carbon sm:text-4xl">
          <span className="text-lima-dark">⌂</span> Administración
        </h1>
        <p className="mt-1.5 max-w-2xl text-carbon/60">
          Aquí se mantienen los <strong className="font-semibold text-carbon">maestros</strong>: quién es
          quién y qué hay pactado con cada uno. El día a día —facturación, obra, proyecto— se aplica en sus
          áreas.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TAREAS.map((t) => {
            const alDia = t.estado === "al_dia";
            const sello = SELLO[t.estado];
            return (
              <Link
                key={t.nombre}
                href={t.href}
                className={
                  "block rounded-2xl border p-5 transition " +
                  (alDia
                    ? "border-lima/40 bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                    : "border-black/5 bg-white/60 hover:bg-white hover:shadow-sm")
                }
              >
                <div className="flex items-start justify-between">
                  <span className={"text-2xl " + (alDia ? "text-lima-dark" : "text-carbon/30")}>{t.icono}</span>
                  <span className={"rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " + sello.clase}>
                    {sello.texto}
                  </span>
                </div>
                <h2 className={"mt-4 text-lg font-semibold " + (alDia ? "text-carbon" : "text-carbon/70")}>
                  {t.nombre}
                </h2>
                <p className={"mt-1 text-base " + (alDia ? "text-carbon/60" : "text-carbon/50")}>{t.desc}</p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
