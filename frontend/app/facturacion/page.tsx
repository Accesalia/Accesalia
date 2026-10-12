import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Salida } from "../components/Salida";
import { quienSoy } from "../../lib/sesion";
import { puedeVerCobros } from "../../lib/cobros";
import { Areas } from "./Areas";

export const dynamic = "force-dynamic";

// LA ENTRADA AL DINERO (Monica, 12-oct-2026): "hace dos tareas claras y
// separadas... esto ahora no se ve tan claro cuando entra". Cuatro botones
// grandes, uno por area. Lo que antes salia aqui (lo que queda por cobrar)
// vive ahora dentro de Cobrar; el cronograma, en Asignar.

export default async function PaginaFacturacion() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion");
  if (!puedeVerCobros(yo)) redirect("/menu");
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Salida href="/menu">← Menú</Salida>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-carbon">Facturación y asignación</h1>
        <Areas yo={yo} />
      </main>
    </div>
  );
}
