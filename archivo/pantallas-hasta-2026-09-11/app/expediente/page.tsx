import { BarraSuperior } from "../components/BarraSuperior";
import { contarComunidades } from "../../lib/comunidades";
import { SelectorComunidad } from "./SelectorComunidad";
import { FASES } from "./fases";

export const dynamic = "force-dynamic";

export default async function EntradaExpediente() {
  const total = await contarComunidades();

  return (
    <div className="min-h-screen bg-black/[0.02]">
      <BarraSuperior />
      <main className="mx-auto max-w-[760px] px-6 py-16">
        <div className="text-center">
          <span className="text-4xl text-lima-dark">◉</span>
          <h1 className="mt-3 text-2xl font-bold text-carbon sm:text-3xl">Expediente virtual</h1>
          <p className="mx-auto mt-2 max-w-md text-carbon/55">
            El tablero 360 de una comunidad. Busca el edificio y entra a ver todas sus fases de un vistazo.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-xl">
          <SelectorComunidad autoFocus />
          <p className="mt-2 text-center text-xs text-carbon/40">
            {total.toLocaleString("es-ES")} comunidades · escribe 2+ letras
          </p>
        </div>

        {/* Vista previa del esqueleto: lo que veras dentro */}
        <div className="mt-12">
          <p className="text-center text-xs uppercase tracking-wide text-carbon/35">Cada expediente reúne estas fases</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FASES.map((f) => (
              <div
                key={f.titulo}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                  f.activa ? "border-lima/40 bg-lima-soft/50 text-carbon" : "border-dashed border-black/10 text-carbon/40"
                }`}
              >
                <span className={f.activa ? "text-lima-dark" : "text-carbon/25"}>{f.icono}</span>
                <span className="truncate">{f.titulo}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
