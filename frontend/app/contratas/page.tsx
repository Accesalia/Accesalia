import { BarraSuperior } from "../components/BarraSuperior";
import { PestanasMaestros } from "../components/PestanasMaestros";
import { listarContratas, listarPersonasContrata, tipoDe, esOjo, sinOjo, nombreCompleto } from "../../lib/contratas";
import { ListadoCliente, type FilaContrata, type FilaPersonaContrata } from "./ListadoCliente";

export const dynamic = "force-dynamic";

export default async function Contratas() {
  const [contratas, personas] = await Promise.all([listarContratas(), listarPersonasContrata()]);

  const vigentes = personas.filter((p) => !p.hasta);
  const enObra = contratas.filter((c) => c.enCurso > 0).length;

  const filas: FilaContrata[] = contratas.map((c) => {
    const t = tipoDe(c.tipo);
    return {
      id: c.id,
      nombre: sinOjo(c.nombre),
      ojo: esOjo(c.nombre),
      tipoLabel: t.label,
      tipoClase: t.clase,
      especialidad: c.especialidad,
      cif: c.cif !== null,
      personas: c.personas,
      enCurso: c.enCurso,
      sinEmpezar: c.sinEmpezar,
      terminadas: c.terminadas,
      presupuestos: c.presupuestos,
      pendiente: c.pendiente !== null,
    };
  });

  const filasPersonas: FilaPersonaContrata[] = vigentes.map((p) => ({
    puestoId: p.puestoId,
    nombre: nombreCompleto(p),
    contrata: sinOjo(p.contrata),
    cargo: p.cargo,
    contacto: p.emailPuesto ?? p.emailPropio ?? p.telefonoPuesto ?? p.telefonoPropio,
    etapas: p.etapas,
    pendiente: p.pendientePuesto !== null || p.pendientePersona !== null,
  }));

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <PestanasMaestros activa="contratas" />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-carbon sm:text-4xl">Contratas</h1>
            <p className="mt-1.5 text-carbon/60">
              {contratas.length} empresas · {enObra} con obra en marcha · {vigentes.length} personas
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap gap-2">
              <span className="cursor-not-allowed rounded-full bg-lima px-5 py-2.5 text-base font-semibold text-carbon opacity-60">
                + Nueva contrata
              </span>
              <span className="cursor-not-allowed rounded-full border border-black/10 bg-white px-5 py-2.5 text-base font-medium text-carbon opacity-60">
                + Nueva persona
              </span>
            </div>
            {/* Los botones estan a la vista pero no hacen nada todavia: las altas
                son escritura, y de momento solo hemos abierto el diario. Se ven
                para que se sepa que estan previstas, no para enganar. */}
            <p className="text-sm text-carbon/50">Las altas, cuando abramos la escritura.</p>
          </div>
        </div>

        <ListadoCliente contratas={filas} personas={filasPersonas} />

        <p className="mt-4 text-sm leading-relaxed text-carbon/55">
          <span className="rounded bg-lima-soft px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-lima-dark">
            Ya está
          </span>{" "}
          <code className="rounded border border-black/5 bg-black/[0.03] px-1 py-px text-sm">contratas</code>,{" "}
          <code className="rounded border border-black/5 bg-black/[0.03] px-1 py-px text-sm">contrata_personas</code> y{" "}
          <code className="rounded border border-black/5 bg-black/[0.03] px-1 py-px text-sm">contrata_puestos_persona</code>,
          revisadas una a una el 10 de septiembre.
          <br />
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700">
            Falta
          </span>{" "}
          el estado de la relación: los ⛔ del nombre son un estado escrito a la fuerza donde se pudo, porque{" "}
          <code className="rounded border border-black/5 bg-black/[0.03] px-1 py-px text-sm">relacion_estado</code>{" "}
          existe y está vacía en las 154.
        </p>
      </main>
    </div>
  );
}
