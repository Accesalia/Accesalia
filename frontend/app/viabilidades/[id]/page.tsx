import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { mesa } from "../../../lib/mesaViabilidades";
import { haceViabilidades } from "../revision-polycam/acciones";
import { MesaDeTrabajo } from "./MesaDeTrabajo";
import { Salida } from "../../components/Salida";

export const dynamic = "force-dynamic";

// LA MESA DE TRABAJO DE UNA VIABILIDAD (Monica, 3-oct-2026). Maqueta aprobada:
// docs/figma/mesa-alex.html, estado 2. A la izquierda el edificio (el 3D, la
// captura, el .glb para SketchUp); a la derecha lo que escribe Alex.

export default async function Viabilidad({ params }: { params: Promise<{ id: string }> }) {
  await haceViabilidades();
  const { id } = await params;
  const m = await mesa(id);
  if (!m) notFound();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1240px] px-6 pb-16 pt-5">
        <Salida href="/viabilidades">
          ← Mesa de viabilidades
        </Salida>
        <MesaDeTrabajo m={m} />
      </main>
    </div>
  );
}
