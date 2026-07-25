import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { administradorPorId } from "../../../../lib/comercial";
import { actualizarPersona } from "../../../administraciones/acciones";
import { FormularioPersona } from "../../../administraciones/FormularioPersona";

export const dynamic = "force-dynamic";

export default async function EditarPersona({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await administradorPorId(id);
  if (!res) notFound();
  const { admin, administracion } = res;

  const volver = administracion ? `/administraciones/${administracion.id}` : "/administraciones";
  const accion = actualizarPersona.bind(null, id, administracion?.id ?? "");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[720px] px-6 py-10">
        <Link href={`/administradores/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← {admin.nombre}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Editar persona</h1>
        <div className="mt-8">
          <FormularioPersona
            accion={accion}
            persona={admin}
            textoBoton="Guardar cambios"
            hrefCancelar={volver}
          />
        </div>
      </main>
    </div>
  );
}
