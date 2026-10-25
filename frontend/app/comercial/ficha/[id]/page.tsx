import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Salida } from "../../../components/Salida";
import { quienSoy } from "../../../../lib/sesion";

export const dynamic = "force-dynamic";

// LA FICHA COMERCIAL: FALTA MONTARLA (Monica, 25-oct-2026). La vieja (del 12-sep, por comunidad y sobre las tablas viejas
// de la hoja) se retiro a archivo/desactivadas-por-monica/ficha-comercial: «mas que tocar esta, me plantearia una nueva
// que de verdad de el servicio que queremos». Este aviso esta para que no se olvide. Lo mas relevante para la nueva: las
// notas y el diario.
export default async function FichaComercial({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/comercial/ficha/${id}`);
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[900px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/comercial">← Área comercial</Salida>
        <div className="mt-6 rounded-xl border-2 border-amber-400 bg-amber-50 px-6 py-5 text-amber-900">
          <p className="text-xl font-extrabold uppercase tracking-wide">Falta montarla</p>
          <p className="mt-2 text-base">
            La ficha comercial se retiró el 25 de octubre de 2026 para hacer una nueva desde cero, que dé de verdad el servicio que queremos.
            Lo más importante que tiene que tener: las notas y el diario.
          </p>
        </div>
      </main>
    </div>
  );
}
