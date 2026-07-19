import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Visor } from "../../components/Visor";
import { Procesando, ModelandoCasillas } from "../../components/EstadoProceso";
import { listarConvocatorias, visorDeConvocatoria } from "@/lib/datos";

export const dynamic = "force-dynamic";

export default async function ConvocatoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [datos, convocatorias] = await Promise.all([
    visorDeConvocatoria(id),
    listarConvocatorias(),
  ]);

  if (!datos) {
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-carbon">Convocatoria no encontrada</h1>
          <Link href="/" className="mt-6 inline-block rounded-full bg-lima px-5 py-2.5 font-semibold text-carbon hover:bg-lima-dark hover:text-white">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  const { estado, borrador_prompt2 } = datos.extraccion;

  // Ciclo de vida de la extraccion.
  if (estado === "procesando") {
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <Procesando />
      </div>
    );
  }
  if (estado === "error") {
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-carbon">Hubo un error al extraer</h1>
          <p className="mt-3 text-carbon/60">{datos.extraccion.borrador_prompt1 ? "" : "La IA no pudo completar la lectura."}</p>
        </div>
      </div>
    );
  }
  // Ya hay prompt 1 pero faltan las casillas (prompt 2): las modelamos.
  const sinCasillas = !borrador_prompt2 || (borrador_prompt2.casillas ?? []).length === 0;
  if (sinCasillas) {
    return (
      <div className="min-h-screen">
        <BarraSuperior />
        <ModelandoCasillas convocatoriaId={id} />
      </div>
    );
  }

  return <Visor datos={datos} convocatorias={convocatorias} />;
}
