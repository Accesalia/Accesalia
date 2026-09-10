import { BarraSuperior } from "../components/BarraSuperior";
import { PestanasMaestros } from "../components/PestanasMaestros";
import { listarEquipo, listarFunciones } from "../../lib/equipo";

export const dynamic = "force-dynamic";

function Persona({
  nombre,
  esArquitecto,
  titulacion,
  funciones,
  notas,
}: {
  nombre: string;
  esArquitecto: boolean | null;
  titulacion: string | null;
  funciones: { clave: string; nombre: string }[];
  notas: string | null;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-carbon">{nombre}</h2>
        {esArquitecto === true ? (
          <span className="shrink-0 rounded-full bg-lima-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lima-dark">
            Arquitecto
          </span>
        ) : titulacion ? (
          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/45">
            {titulacion}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
        {funciones.length === 0 && <span className="text-xs text-carbon/30">Sin funciones asignadas</span>}
        {funciones.map((f) => (
          <span key={f.clave} className="rounded-md bg-black/[0.04] px-2 py-1 text-[11px] font-medium text-carbon/70">
            {f.nombre}
          </span>
        ))}
      </div>

      {notas && <p className="mt-3 border-t border-black/5 pt-2 text-[11px] leading-snug text-carbon/45">{notas}</p>}
    </section>
  );
}

export default async function EquipoPage() {
  const [equipo, funciones] = await Promise.all([listarEquipo(), listarFunciones()]);
  const arquitectos = equipo.filter((m) => m.es_arquitecto === true).length;

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <PestanasMaestros activa="equipo" />
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-carbon">
          <span className="text-lima-dark">❖</span> Equipo
        </h1>
        <p className="mt-1 text-sm text-carbon/55">
          {equipo.length} personas · {arquitectos} arquitectos · {funciones.length} funciones en el catálogo
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {equipo.map((m) => (
            <Persona
              key={m.id}
              nombre={m.nombre}
              esArquitecto={m.es_arquitecto}
              titulacion={m.titulacion}
              funciones={m.funciones}
              notas={m.notas}
            />
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-carbon/35">
          Directorio de funciones (no RRHH). Las funciones son un catálogo vivo: se editan según evoluciona el flujo.
        </p>
      </main>
    </div>
  );
}
