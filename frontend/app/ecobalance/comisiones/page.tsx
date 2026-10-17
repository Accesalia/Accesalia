import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { puedeVerComisiones } from "../../../lib/comisionesAdmin";
import { ListadoComisiones } from "./Listado";

export const dynamic = "force-dynamic";

// COMISIONES DE ADMINISTRADORES › EL LISTADO (Monica, 17-oct-2026): ver Listado.tsx.
// Solo Ana y direccion.

export default async function Comisiones() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/ecobalance/comisiones");
  if (!puedeVerComisiones(yo)) redirect("/menu");
  return <ListadoComisiones />;
}

