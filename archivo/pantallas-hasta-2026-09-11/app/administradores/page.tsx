import { redirect } from "next/navigation";

// La cartera pivoto al eje administracion de fincas. Esta ruta queda como
// redireccion; las personas siguen teniendo ficha en /administradores/[id].
export default function AdministradoresIndex() {
  redirect("/administraciones");
}
