import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { Volver } from "../../../components/Volver";
import { docViabilidad } from "../../../../lib/viabilidadComercial";
import { permisoViabilidad } from "./permiso";
import { Documento } from "./Documento";

export const dynamic = "force-dynamic";
// Generar pasa por Catastro (el anexo) y por el PDF: tarda.
export const maxDuration = 60;

// LA VIABILIDAD, PARTE DEL COMERCIAL (Monica, 6-oct-2026). Su plantilla del
// 3-oct (docs/figma/viabilidad.html) hecha pantalla: el documento tal cual
// saldra, con lo que toca el comercial escrito encima, y al lado lo que hay que
// saber para generarlo.

export default async function PaginaViabilidad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await permisoViabilidad(id);
  const d = await docViabilidad(id);
  if (!d) notFound();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Volver siNoHay={`/comercial/oportunidades/${d.oppId}`} />
        <Documento key={`${d.numero}-${d.version}-${d.generada}`} d={d} />
      </main>
    </div>
  );
}
