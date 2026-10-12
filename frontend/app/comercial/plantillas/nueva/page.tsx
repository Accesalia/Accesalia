import { redirect } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { quienSoy } from "../../../../lib/sesion";
import { gobiernaPlantillas, puedeVerPlantillas } from "../../../../lib/plantillasCorreo";
import { accionCrear } from "../acciones";
import { FormPlantilla } from "../FormPlantilla";

export const dynamic = "force-dynamic";

// CREAR UNA PLANTILLA: solo nombre (para que es), asunto y texto (Monica,
// 12-oct-2026). Quien puede hacer generales elige si es general o suya.

export default async function NuevaPlantilla({ searchParams }: { searchParams: Promise<{ falta?: string }> }) {
  const { falta } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/plantillas/nueva");
  if (!puedeVerPlantillas(yo)) redirect("/menu");

  return (
    <div className="min-h-screen bg-form">
      <BarraSuperior />
      <main className="mx-auto max-w-[1000px] px-4 pb-16 pt-5 sm:px-6">
        <FormPlantilla
          titulo="Nueva plantilla de mail"
          accion={accionCrear}
          cancelar="/comercial/plantillas"
          elegirClase={gobiernaPlantillas(yo)}
          falta={!!falta}
        />
      </main>
    </div>
  );
}
