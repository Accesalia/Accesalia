import { BarraSuperior } from "../components/BarraSuperior";
import { crearConvocatoriaYExtraer } from "../acciones";
import { BotonEnviar } from "../components/BotonEnviar";

export const dynamic = "force-dynamic";

export default function NuevaConvocatoria() {
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold text-carbon sm:text-3xl">Nueva convocatoria</h1>
        <p className="mt-1 text-carbon/55">
          Solo sube el PDF de las bases. La IA identifica la convocatoria (entidad, plan,
          año), extrae requisitos, documentación y fechas, y monta el tablero — todo solo.
        </p>

        <form action={crearConvocatoriaYExtraer} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-carbon">PDF de las bases de la convocatoria</span>
            <input
              name="pdf"
              type="file"
              accept="application/pdf"
              required
              className="mt-1.5 w-full rounded-xl border border-dashed border-black/15 bg-white px-3.5 py-10 text-sm text-carbon/70 outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-lima file:px-4 file:py-2 file:font-semibold file:text-carbon hover:border-lima"
            />
          </label>

          <div className="rounded-xl bg-lima-soft px-4 py-3 text-sm text-carbon/70">
            <p className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              De ese PDF, la IA sacará <strong className="font-semibold text-carbon">entidad, plan y año</strong> como
              datos limpios (para filtrar), más las fechas del plazo, los requisitos y toda la documentación.
            </p>
            <p className="mt-2 flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              Tarda 1–2 minutos. Al enviar, verás el progreso en vivo.
            </p>
          </div>

          <BotonEnviar />
        </form>
      </main>
    </div>
  );
}
