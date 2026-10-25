import { redirect } from "next/navigation";
import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros, puedeVerEcobalance } from "../../../../lib/cobros";
import { enlaceFirmadaVersion } from "../../../../lib/hojasNuevas";

export const dynamic = "force-dynamic";

// LA HOJA FIRMADA DE UNA VERSION (hojas nuevas, dia de la migracion): vive en el archivo de documentos de la opp
// (he_versiones_hoja.firmada_documento_id). Se firma el enlace al abrirla (diez minutos) y se manda alli.
export async function GET(_req: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const yo = await quienSoy();
  if (!yo || !(puedeVerCobros(yo) || puedeVerEcobalance(yo))) return new Response("No tienes acceso a la facturación.", { status: 403 });
  const url = await enlaceFirmadaVersion(versionId);
  if (!url) return new Response("Esta hoja no tiene la firmada archivada.", { status: 404 });
  redirect(url);
}
