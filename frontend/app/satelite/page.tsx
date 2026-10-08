import { redirect } from "next/navigation";
import { puedeEntrar, quienSoy } from "../../lib/sesion";
import { Satelite } from "./Satelite";

export const dynamic = "force-dynamic";

// LA NOTA RAPIDA DEL MOVIL (Monica, 8-oct-2026). La pagina solo comprueba la
// puerta: todo lo demas vive en el movil (listas y notas por enviar), para que
// funcione sin cobertura.
export default async function PaginaSatelite() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/satelite");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");
  return <Satelite />;
}
