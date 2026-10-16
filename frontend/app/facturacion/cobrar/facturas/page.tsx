import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { facturasEmitidas } from "../../../../lib/facturasEmitidas";
import { MarcoDinero } from "../../MarcoDinero";
import { FacturasEmitidas } from "./FacturasEmitidas";

export const dynamic = "force-dynamic";

// COBRAR › FACTURAS EMITIDAS (Monica, 16-oct-2026): en el menu de la maqueta,
// sin pantalla dibujada; con el estilo de «Todo lo contratado».

export default async function Pagina({ searchParams }: { searchParams: Promise<{ anio?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/facturas");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const { anio: a } = await searchParams;
  const hoy = Number(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }).slice(0, 4));
  const anio = a === "todos" ? null : Number(a) || hoy;
  const facturas = await facturasEmitidas(anio);
  return (
    <MarcoDinero yo={yo} area="cobrar" activo="facturas">
      <FacturasEmitidas facturas={facturas} anio={anio} anios={[hoy, hoy - 1]} />
    </MarcoDinero>
  );
}
