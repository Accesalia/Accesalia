import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { almacenDeFirmas, puedeGestionarFirmas } from "../../../lib/firmaDigital";
import { Firmas } from "./Firmas";

export const dynamic = "force-dynamic";

// FIRMAS DIGITALES (Monica, 15-oct-2026): el almacen de los certificados de
// cada titular (Accesalia, Daniel, Ecobalance) y, debajo, con que firma se
// firma cada uso. Direccion y quien tenga la funcion de firmas digitales.

export default async function PaginaFirmas() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/firmas");
  if (!puedeGestionarFirmas(yo)) redirect("/gestiones");
  const { titulares, usos } = await almacenDeFirmas();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <h1 className="mt-3 border-b border-black/10 pb-4 text-3xl font-bold text-carbon sm:text-4xl">Firmas digitales</h1>
        <Firmas titulares={titulares} usos={usos} />
      </main>
    </div>
  );
}
