import { redirect } from "next/navigation";
import { quienSoy } from "../../../../../../../lib/sesion";
import { enlaceFirmada } from "../../../../../../../lib/hojaEncargo";

export const dynamic = "force-dynamic";

// LA HOJA FIRMADA de una opp de la comunidad: la primera firmada de su version.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; hojaId: string; versionId: string }> }) {
  const { id, hojaId, versionId } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/comunidades/${id}`);
  const url = await enlaceFirmada(hojaId, versionId, 0);
  if (!url) return new Response("No se encuentra la hoja firmada.", { status: 404 });
  redirect(url);
}
