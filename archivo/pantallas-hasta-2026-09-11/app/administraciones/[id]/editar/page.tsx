import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { PestanasMaestros } from "../../../components/PestanasMaestros";
import { administracionCruda, listarComerciales, administracionPorId } from "../../../../lib/comercial";
import { actualizarAdministracion } from "../../acciones";
import { FormularioAdministracion } from "../../FormularioAdministracion";

export const dynamic = "force-dynamic";

export default async function EditarAdministracion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [administracion, comerciales, ficha] = await Promise.all([
    administracionCruda(id),
    listarComerciales(),
    administracionPorId(id),
  ]);
  if (!administracion || !ficha) notFound();

  const accion = actualizarAdministracion.bind(null, id);
  const titulares = ficha.personas.map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <PestanasMaestros activa="administraciones" />
      <main className="mx-auto max-w-[860px] px-6 py-10">
        <Link href={`/administraciones/${id}`} className="text-sm text-carbon/50 hover:text-carbon">
          ← {administracion.nombre}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Editar administración</h1>
        <div className="mt-8">
          <FormularioAdministracion
            accion={accion}
            administracion={administracion}
            comerciales={comerciales}
            titulares={titulares}
            textoBoton="Guardar cambios"
            hrefCancelar={`/administraciones/${id}`}
          />
        </div>
      </main>
    </div>
  );
}
