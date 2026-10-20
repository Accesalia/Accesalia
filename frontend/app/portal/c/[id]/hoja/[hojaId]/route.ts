import { redirect } from "next/navigation";
import { puedeEntrarEn, quienEstaEnElPortal } from "../../../../../../lib/portal";
import { hojaFirmadaParaLaComunidad } from "../../../../../../lib/portalDocumentacion";
import { enlaceFirmada } from "../../../../../../lib/hojaEncargo";

export const dynamic = "force-dynamic";

// LA HOJA QUE LA COMUNIDAD FIRMO (Monica, 21-oct-2026: «la comunidad debe ver el
// documento que ha firmado»). Es la UNICA excepcion a «nadie de fuera abre un
// fichero»: solo su hoja firmada, y solo para quien entra en esa comunidad.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; hojaId: string }> }) {
  const { id, hojaId } = await params;
  const email = await quienEstaEnElPortal();
  if (!email) redirect("/portal");
  if (!(await puedeEntrarEn(email, id))) return new Response("No tienes acceso a esta comunidad.", { status: 403 });
  const h = await hojaFirmadaParaLaComunidad(id, hojaId);
  const url = h ? await enlaceFirmada(h.hojaId, h.versionId, 0) : null;
  if (!url) return new Response("No se encuentra la hoja firmada.", { status: 404 });
  redirect(url);
}
