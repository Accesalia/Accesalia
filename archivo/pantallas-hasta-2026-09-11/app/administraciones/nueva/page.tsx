import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { PestanasMaestros } from "../../components/PestanasMaestros";
import { listarComerciales } from "../../../lib/comercial";
import { crearAdministracion } from "../acciones";
import { FormularioAdministracion } from "../FormularioAdministracion";

export const dynamic = "force-dynamic";

export default async function NuevaAdministracion() {
  const comerciales = await listarComerciales();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <PestanasMaestros activa="administraciones" />
      <main className="mx-auto max-w-[860px] px-6 py-10">
        <Link href="/administraciones" className="text-sm text-carbon/50 hover:text-carbon">
          ← Cartera de administraciones
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">Nueva administración de fincas</h1>
        <p className="mt-1 text-carbon/50">Después podrás añadirle personas y contactos.</p>
        <div className="mt-8">
          <FormularioAdministracion
            accion={crearAdministracion}
            comerciales={comerciales}
            textoBoton="Crear administración"
            hrefCancelar="/administraciones"
          />
        </div>
      </main>
    </div>
  );
}
