import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerComisiones } from "../../../../lib/comisionesAdmin";
import { FichaComisionContenido } from "./Ficha";

export const dynamic = "force-dynamic";

// COMISIONES › LA FICHA DE UN ADMINISTRADOR (Monica, 17-oct-2026): ver Ficha.tsx.
// Solo Ana y direccion.

export default async function FichaComision({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/ecobalance/comisiones/${id}`);
  if (!puedeVerComisiones(yo)) redirect("/menu");
  return <FichaComisionContenido id={id} />;
}

