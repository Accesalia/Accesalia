import { redirect } from "next/navigation";
import { puedeEntrarEn, quienEstaEnElPortal } from "../../../../../../lib/portal";
import { hojaFirmadaParaLaComunidad } from "../../../../../../lib/portalDocumentacion";
import { enlaceFirmadaDeVersion } from "../../../../../../lib/hojasOpp";

export const dynamic = "force-dynamic";

// LA HOJA QUE LA COMUNIDAD FIRMO (Monica, 21-oct-2026: «la comunidad debe ver el
// documento que ha firmado»). Es la UNICA excepcion a «nadie de fuera abre un
// fichero»: solo su hoja firmada, y solo para quien entra en esa comunidad. Desde el
// 25-oct-2026, la firmada archivada en su opp (he_versiones_hoja.firmada_documento_id).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const email = await quienEstaEnElPortal();
  if (!email) redirect("/portal");
  if (!(await puedeEntrarEn(email, id))) return new Response("No tienes acceso a esta comunidad.", { status: 403 });
  const v = await hojaFirmadaParaLaComunidad(id, versionId);
  const f = v ? await enlaceFirmadaDeVersion(v) : null;
  if (!f) return new Response("No se encuentra la hoja firmada.", { status: 404 });
  redirect(f.url);
}
