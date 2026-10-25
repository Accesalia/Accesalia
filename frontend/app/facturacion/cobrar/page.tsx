import { redirect } from "next/navigation";
import { quienSoy } from "../../../lib/sesion";
import { hojaAbierta, nuevasHojas, puedeValidar } from "../../../lib/nuevasHojas";
import { MarcoCobrar } from "./MarcoCobrar";
import { NuevasHojas } from "./NuevasHojas";

export const dynamic = "force-dynamic";

// COBRAR › NUEVAS HOJAS ENCARGO FIRMADAS (Monica, 12-oct-2026): donde aterriza
// Alexandra. Pantalla validada en la maqueta (docs/figma/area-dinero-v1.html).
// Lo que antes salia aqui (lo que queda por cobrar) esta en su propia entrada
// del menu de Cobrar.

export default async function PaginaNuevasHojas({ searchParams }: { searchParams: Promise<{ hoja?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/facturacion/cobrar");
  if (!puedeValidar(yo)) redirect("/menu");
  // ?hoja=… la abre (el enlace del correo de una duda).
  const { hoja } = await searchParams;
  const [filas, abierta] = await Promise.all([nuevasHojas(), hoja ? hojaAbierta(hoja) : Promise.resolve(null)]);
  return (
    <MarcoCobrar yo={yo} activo="nuevas" nuevas={filas.length}>
      <NuevasHojas key={hoja ?? ""} filas={filas} inicial={abierta && hoja ? { id: hoja, hoja: abierta } : undefined} />
    </MarcoCobrar>
  );
}
