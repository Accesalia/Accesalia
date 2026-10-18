import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { puedeGestionarBloques } from "../../../lib/catalogoBloques";
import { datosTarifas } from "../../../lib/tarifas";
import { Tarifas } from "./Tarifas";

export const dynamic = "force-dynamic";

// TARIFAS (Monica, 17-oct-2026): los precios habituales por tipo de cliente,
// cargados de sus Word de tarifas 2026. Las cambian los mismos que el catalogo
// de bloques (direccion y secretaria); el resto las usa al hacer una hoja.

export default async function PaginaTarifas() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/tarifas");
  if (!puedeGestionarBloques(yo)) redirect("/comercial");

  const datos = await datosTarifas();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-6 pb-16 pt-5 text-sm">
        <Volver />
        <Tarifas datos={datos} />
      </main>
    </div>
  );
}
