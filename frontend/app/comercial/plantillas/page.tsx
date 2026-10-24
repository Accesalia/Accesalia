import { redirect } from "next/navigation";

// Las plantillas pasaron a un acceso general, /plantillas (Monica, 24-oct-2026). Esta direccion se queda para que
// los enlaces y marcadores de antes sigan llevando a su sitio.
export default function PlantillasAntes() {
  redirect("/plantillas");
}
