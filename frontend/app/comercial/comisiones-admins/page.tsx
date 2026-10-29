import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { puedeGestionarComisiones } from "../../../lib/comisionesAdmin";
import { ListadoComisiones } from "../../ecobalance/comisiones/Listado";

export const dynamic = "force-dynamic";

// COMISIONES A ADMINS (Monica, 29-oct-2026): la tarjeta del menu, junto a «Modificar plantilla de Hoja de Encargo».
// La ven y la tocan la secretaria comercial, los comerciales y direccion. El mismo listado que Ecobalance, sin lo que
// va en B; los pagos siguen alli.

export default async function ComisionesAAdmins() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/comisiones-admins");
  if (!puedeGestionarComisiones(yo)) redirect("/menu");
  return <ListadoComisiones modo="gestion" />;
}
