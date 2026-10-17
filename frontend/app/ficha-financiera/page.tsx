import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Volver } from "../components/Volver";
import { quienSoy } from "../../lib/sesion";
import { opcionesFicha, vistaDe } from "../../lib/fichaFinanciera";
import { Buscador } from "./Buscador";

export const dynamic = "force-dynamic";

// FICHA FINANCIERA · la entrada: un desplegable con todas las direcciones con
// hoja firmada, que se acorta segun se escribe (Monica, 17-oct-2026).
// Se llega desde Negocio (direccion) y desde Facturacion.

export default async function PaginaBuscarFicha() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/ficha-financiera");
  if (!vistaDe(yo)) redirect("/menu");
  const opciones = await opcionesFicha();
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-5 text-sm sm:px-6">
        <Volver siNoHay="/menu" />
        <h1 className="mb-1 mt-3 text-[30px] font-[750] leading-[1.1] tracking-[-.5px] text-carbon">Ficha financiera</h1>
        <p className="mb-5 text-[14.5px] text-carbon/65">Lo contratado, lo facturado y lo cobrado de una dirección, en una hoja.</p>
        <Buscador opciones={opciones} />
      </main>
    </div>
  );
}
