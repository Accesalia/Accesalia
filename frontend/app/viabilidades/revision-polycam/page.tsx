import { redirect } from "next/navigation";

// La "Revision Polycam" (2-oct-2026) crecio y es ahora la Mesa de
// viabilidades (3-oct-2026): su lista sigue arriba, tal cual. Esta direccion
// se queda para que no se rompa ningun enlace guardado o ningun aviso viejo.
export default function RevisionPolycam() {
  redirect("/viabilidades");
}
