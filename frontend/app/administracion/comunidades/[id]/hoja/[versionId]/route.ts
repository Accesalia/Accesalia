import { redirect } from "next/navigation";
import { quienSoy } from "../../../../../../lib/sesion";
import { enlaceFirmadaDeVersion } from "../../../../../../lib/hojasOpp";

export const dynamic = "force-dynamic";

// LA HOJA FIRMADA de una opp de la comunidad (sistema nuevo, 25-oct-2026): la firmada archivada en su opp
// (he_versiones_hoja.firmada_documento_id).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/administracion/comunidades/${id}`);
  const f = await enlaceFirmadaDeVersion(versionId);
  if (!f) return new Response("No se encuentra la hoja firmada.", { status: 404 });
  redirect(f.url);
}
