import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../../../components/BarraSuperior";
import { comunidadPorId } from "../../../../../../lib/comunidades";
import { listarEquipo } from "../../../../../../lib/equipo";
import { obrasDeProyecto, constructoraDe } from "../../../../../../lib/obra";
import { proyectosDeComunidad, tiposDe } from "../../../../../../lib/proyecto";
import { crearActa } from "../acciones";

export const dynamic = "force-dynamic";

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";
const btn = "rounded-lg bg-lima px-4 py-2 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white";

export default async function NuevaActa({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ obra?: string }>;
}) {
  const { id } = await params;
  const { obra: obraId } = await searchParams;
  const [ficha, equipo, proyectos] = await Promise.all([comunidadPorId(id), listarEquipo(false), proyectosDeComunidad(id)]);
  if (!ficha || !obraId) notFound();

  // localizar la obra (para la cabecera) entre los proyectos de la comunidad
  const todas = (await Promise.all(proyectos.map((p) => obrasDeProyecto(p.id)))).flat();
  const obra = todas.find((o) => o.id === obraId);
  if (!obra) notFound();
  const proyecto = proyectos.find((p) => p.id === obra.proyecto_id);
  const hoy = new Date().toISOString().slice(0, 10);
  const arquitectos = equipo.filter((m) => m.es_arquitecto || m.activo);

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[760px] px-6 py-8">
        <Link href={`/comunidades/${id}/obra`} className="text-sm text-carbon/50 hover:text-carbon">← Obra</Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">⬒</span> Generar acta de visita</h1>
        <p className="mt-1 text-sm text-carbon/55">
          {ficha.comunidad.nombre}
          {proyecto && tiposDe(proyecto).length > 0 && <> · {tiposDe(proyecto).map((t) => t.nombre).join(" + ")}</>}
          {constructoraDe(obra) && <> · {constructoraDe(obra)}</>}
        </p>

        <form action={crearActa.bind(null, id, obraId)} className="mt-6 space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-carbon/40">Fecha de la visita
              <input type="date" name="fecha_visita" defaultValue={hoy} className={`${inp} mt-1 block w-full`} />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-carbon/40">Técnico (DF)
              <select name="autor_tecnico_id" className={`${inp} mt-1 block w-full`}>
                <option value="">— sin asignar —</option>
                {arquitectos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wide text-carbon/40">Informe de la visita
            <textarea name="texto_acta" rows={7} placeholder="A la fecha de la visita, se observa…" className={`${inp} mt-1 block w-full`} />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide text-carbon/40">Fotos
            <input type="file" name="fotos" multiple accept="image/*" className="mt-1 block w-full text-sm text-carbon/70 file:mr-3 file:rounded-lg file:border-0 file:bg-lima-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-lima-dark" />
            <span className="mt-1 block text-[11px] text-carbon/40">Puedes seleccionar varias. Se añaden a la galería del acta.</span>
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button className={btn}>Generar acta</button>
            <Link href={`/comunidades/${id}/obra`} className="text-sm text-carbon/50 hover:text-carbon">Cancelar</Link>
          </div>
          <p className="text-[11px] text-carbon/40">La cabecera (comunidad, contrata, DF, tipo de obra, jefe de obra) se rellena sola en el acta.</p>
        </form>
      </main>
    </div>
  );
}
