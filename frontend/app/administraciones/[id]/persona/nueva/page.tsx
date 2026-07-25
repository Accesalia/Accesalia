import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../../components/BarraSuperior";
import { administracionCruda } from "../../../../../lib/comercial";
import { crearPersona } from "../../../acciones";
import { FormularioPersona } from "../../../FormularioPersona";

export const dynamic = "force-dynamic";

export default async function NuevaPersona({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const administracion = await administracionCruda(id);
  if (!administracion) notFound();

  const accion = crearPersona.bind(null, id);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[720px] px-6 py-10">
        <Link href={`/administraciones/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← {administracion.nombre}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Nueva persona</h1>
        <p className="mt-1 text-carbon/50">En {administracion.nombre}.</p>
        <div className="mt-8">
          <FormularioPersona
            accion={accion}
            textoBoton="Añadir persona"
            hrefCancelar={`/administraciones/${id}`}
          />
        </div>
      </main>
    </div>
  );
}
