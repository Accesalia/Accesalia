import { redirect } from "next/navigation";

// FACTURACION Y ASIGNACION (Monica, 12-oct-2026): se entra directo en Cobrar ›
// Nuevas Hojas Encargo Firmadas; las cuatro areas van siempre arriba, en la barra.
export default function PaginaFacturacion() {
  redirect("/facturacion/cobrar");
}
