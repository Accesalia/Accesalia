import Link from "next/link";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { listarComerciales, listarComunidadesSelector } from "../../../../lib/comercial";
import { crearOportunidadManual } from "../acciones";

export const dynamic = "force-dynamic";

const inp = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-carbon outline-none transition focus:border-lima";
const lab = "text-xs font-medium uppercase tracking-wide text-carbon/45";

export default async function NuevaOportunidad({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const [comerciales, comunidades] = await Promise.all([listarComerciales(), listarComunidadesSelector()]);
  const suf = c ? `?c=${c}` : "";

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[640px] px-6 py-8">
        <Link href={`/comercial/oportunidades${suf}`} className="text-sm text-carbon/50 hover:text-carbon">← Oportunidades en marcha</Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold text-carbon"><span className="text-lima-dark">◇</span> Crear oportunidad</h1>
        <p className="mt-1 text-sm text-carbon/55">A mano. Se le monta el pipeline solo; podrás avanzarlo desde aquí o dictando notas.</p>

        <form action={crearOportunidadManual} className="mt-6 space-y-5 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          {c ? <input type="hidden" name="comercial_id" value={c} /> : null}

          <div>
            <label className={lab}>Comunidad</label>
            <select name="comunidad_id" defaultValue="" className={inp}>
              <option value="">— elegir comunidad existente —</option>
              {comunidades.map((cm) => <option key={cm.id} value={cm.id}>{cm.nombre}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-carbon/40">¿No está en la lista? Déjala en blanco y escribe abajo un nombre provisional (o dala de alta antes).</p>
            <input name="comunidad_provisional" placeholder="…o nombre/dirección de una comunidad nueva (provisional)" className={`${inp} mt-2`} />
          </div>

          {!c && (
            <div>
              <label className={lab}>Comercial</label>
              <select name="comercial_id" defaultValue="" className={inp}>
                <option value="">— sin asignar —</option>
                {comerciales.map((m) => <option key={m.id} value={m.id}>{[m.nombre, m.apellidos].filter(Boolean).join(" ")}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lab}>Qué vendemos</label>
              <input name="que_vendemos" placeholder="Ascensor, SATE, accesibilidad…" className={inp} />
            </div>
            <div>
              <label className={lab}>Precio (€)</label>
              <input name="precio" placeholder="22000" className={inp} />
            </div>
          </div>
          <div>
            <label className={lab}>Alcance / notas</label>
            <input name="alcance" placeholder="qué se incluye, condiciones…" className={inp} />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button className="rounded-full bg-lima px-6 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">Crear oportunidad</button>
            <Link href={`/comercial/oportunidades${suf}`} className="text-sm text-carbon/50 hover:text-carbon">Cancelar</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
