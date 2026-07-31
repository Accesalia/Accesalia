import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { listarComerciales, listarAdministradoresPersonas, TIPO_EVENTO_LABEL, ORIGEN_LABEL } from "../../../lib/comercial";
import { crearInteraccion } from "../acciones";
import { DictadoVoz } from "./DictadoVoz";

export const dynamic = "force-dynamic";

const inp = "rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-lima";

export default async function GrabarContacto({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const [comerciales, admins] = await Promise.all([listarComerciales(), listarAdministradoresPersonas()]);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[720px] px-6 py-8">
        <Link href={c ? `/comercial?c=${c}` : "/comercial"} className="text-sm text-carbon/50 hover:text-carbon">← Área comercial</Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">◇</span> Grabar registro de contacto</h1>
        <p className="mt-1 text-sm text-carbon/55">Dicta por voz o escribe. La IA lo estructurará (admin, oportunidades, deseos técnicos, tareas) en el siguiente paso; por ahora se guarda tal cual.</p>

        <form action={crearInteraccion} className="mt-6 space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-carbon/40 sm:col-span-2">Comercial
              <select name="comercial_id" defaultValue={c ?? ""} className={`${inp} mt-1 block w-full`}>
                <option value="">— sin asignar —</option>
                {comerciales.map((m) => <option key={m.id} value={m.id}>{[m.nombre, m.apellidos].filter(Boolean).join(" ")}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-carbon/40">Fecha
              <input type="date" name="fecha_evento" defaultValue={hoy} className={`${inp} mt-1 block w-full`} />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-carbon/40">Tipo
              <select name="tipo_evento" defaultValue="seguimiento" className={`${inp} mt-1 block w-full`}>
                {Object.entries(TIPO_EVENTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-carbon/40">Canal
              <select name="origen" defaultValue="nota_voz" className={`${inp} mt-1 block w-full`}>
                {Object.entries(ORIGEN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-carbon/40">Administrador (si aplica)
              {/* el valor es el id del PUESTO: la persona en su administracion */}
              <select name="puesto_id" defaultValue="" className={`${inp} mt-1 block w-full`}>
                <option value="">— suelto / lo vinculo luego —</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.empresa ? `${a.nombre} · ${a.empresa}` : `${a.nombre} · (falta la administración)`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-carbon/40">La nota</label>
            <DictadoVoz name="transcripcion" placeholder="Ej.: Café con Gómez. Arenal 12 cabreada por retrasos. Albufera quiere revisar contratar rampas. Dos comunidades que no recuerda quieren ver si les cabe ascensor, me pasa direcciones…" />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button className="rounded-lg bg-lima px-4 py-2 text-sm font-semibold text-carbon hover:bg-lima-dark hover:text-white">Guardar contacto</button>
            <Link href={c ? `/comercial?c=${c}` : "/comercial"} className="text-sm text-carbon/50 hover:text-carbon">Cancelar</Link>
          </div>
          <p className="text-[11px] text-carbon/40">No hace falta anclarlo a una comunidad: puede ser de un administrador o quedar suelto (se vincula después). Nada se pierde.</p>
        </form>
      </main>
    </div>
  );
}
