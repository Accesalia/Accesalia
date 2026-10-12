import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { porCobrar, puedeVerCobros } from "../../../../lib/cobros";
import { nuevasHojas } from "../../../../lib/nuevasHojas";
import { MarcoCobrar } from "../MarcoCobrar";
import { PorCobrar } from "../../PorCobrar";

export const dynamic = "force-dynamic";

// LO QUE QUEDA POR COBRAR (11-oct-2026): la lista que antes salia al entrar en
// facturacion. Se queda en el menu de Cobrar mientras se montan las demas vistas.

export default async function PaginaPorCobrar() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/por-cobrar");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const [filas, nuevas] = await Promise.all([porCobrar(), nuevasHojas()]);
  return (
    <MarcoCobrar yo={yo} activo="por-cobrar" nuevas={nuevas.length}>
      <h1 className="text-[28px] font-bold leading-tight text-carbon">Lo que queda por cobrar</h1>
      <PorCobrar filas={filas} />
    </MarcoCobrar>
  );
}
