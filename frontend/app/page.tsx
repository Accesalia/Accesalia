import { redirect } from "next/navigation";

// La portada es el menu. (Antes saltaba a la ultima convocatoria de
// subvenciones, que ya no existe.)
export default function Portada() {
  redirect("/menu");
}
