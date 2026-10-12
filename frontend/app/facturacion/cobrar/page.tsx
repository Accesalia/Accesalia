import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { nuevasHojas, puedeValidar } from "../../../lib/nuevasHojas";
import { MarcoCobrar } from "./MarcoCobrar";
import { NuevasHojas } from "./NuevasHojas";

export const dynamic = "force-dynamic";

// COBRAR › NUEVAS HOJAS ENCARGO FIRMADAS (Monica, 12-oct-2026): donde aterriza
// Alexandra. Pantalla validada en la maqueta (docs/figma/area-dinero-v1.html).
// Lo que antes salia aqui (lo que queda por cobrar) esta en su propia entrada
// del menu de Cobrar.

export default async function PaginaNuevasHojas() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar");
  if (!puedeValidar(yo)) redirect("/menu");
  const filas = await nuevasHojas();
  return (
    <MarcoCobrar yo={yo} activo="nuevas" nuevas={filas.length}>
      <NuevasHojas filas={filas} />
    </MarcoCobrar>
  );
}
