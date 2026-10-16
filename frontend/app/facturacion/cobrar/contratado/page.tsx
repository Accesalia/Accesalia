import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { nuevasHojas } from "../../../../lib/nuevasHojas";
import { hojasFirmadas } from "../../../../lib/hojasFirmadas";
import { MarcoCobrar } from "../MarcoCobrar";
import { HojasFirmadas } from "./HojasFirmadas";

export const dynamic = "force-dynamic";

// COBRAR › TODO LO CONTRATADO (Monica, 16-oct-2026): todas las hojas firmadas,
// sin entrar en la opp. La pagina se pinta una vez; despues, cada filtro,
// busqueda o pagina es una llamada a /facturacion/cobrar/contratado/datos.

export default async function PaginaContratado() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar/contratado");
  if (!puedeVerCobros(yo)) redirect("/menu");
  const [inicial, nuevas] = await Promise.all([hojasFirmadas({}, yo), nuevasHojas()]);
  return (
    <MarcoCobrar yo={yo} activo="contratado" nuevas={nuevas.length}>
      <HojasFirmadas inicial={inicial} />
    </MarcoCobrar>
  );
}
