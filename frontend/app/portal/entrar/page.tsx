import { accionEntrar } from "../acciones";
import { MarcoPortal } from "../Marco";

export const dynamic = "force-dynamic";

// EL ENLACE MAGICO. No entra solo al abrirse: hay que pulsar el boton. Algunos
// correos (Outlook) abren los enlaces por su cuenta para revisarlos, y si se
// entrara al abrir, ese repaso gastaria el enlace antes de que llegue la persona.

export default async function Entrar({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <MarcoPortal email={null}>
      <div className="mx-auto max-w-[460px] rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-carbon">Entrar</h1>
        {t ? (
          <form action={accionEntrar.bind(null, t)} className="mt-4">
            <button type="submit" className="w-full rounded-lg bg-lima px-4 py-3 text-[16px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white">
              Entrar en la documentación
            </button>
          </form>
        ) : (
          <p className="mt-3 text-carbon/70">Falta el enlace. Pide uno nuevo desde la página de entrada.</p>
        )}
      </div>
    </MarcoPortal>
  );
}
