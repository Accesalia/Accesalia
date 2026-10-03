import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Volver } from "../../components/Volver";
import { quienSoy } from "../../../lib/sesion";
import { catalogoBloques, puedeGestionarBloques } from "../../../lib/catalogoBloques";
import { Catalogo } from "./Catalogo";

export const dynamic = "force-dynamic";

// CATALOGO DE BLOQUES (Monica, 3-oct-2026). Montada sobre su maqueta, aprobada
// tal cual: docs/figma/catalogo-bloques.html. A la izquierda la lista en el
// orden en que salen en la hoja; a la derecha el bloque elegido, abierto.
// Solo direccion y secretaria comercial: el resto de la gente lo USA al hacer
// una hoja, pero no lo cambia.

export default async function PaginaBloques({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const { b } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/bloques");
  if (!puedeGestionarBloques(yo)) redirect("/comercial");

  const bloques = await catalogoBloques();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1500px] px-6 pb-16 pt-5 text-sm">
        {/* Se llega desde el menu y desde otros sitios: vuelve a la de antes. */}
        <Volver />
        <Catalogo bloques={bloques} inicial={b ?? null} />
      </main>
    </div>
  );
}
