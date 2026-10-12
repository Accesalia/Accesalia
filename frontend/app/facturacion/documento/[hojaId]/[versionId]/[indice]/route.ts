import { redirect } from "next/navigation";
import { quienSoy } from "../../../../../../lib/sesion";
import { puedeVerCobros, puedeVerEcobalance } from "../../../../../../lib/cobros";
import { enlaceFirmada } from "../../../../../../lib/hojaEncargo";

export const dynamic = "force-dynamic";

// EL DOCUMENTO FIRMADO guardado en el almacen: se firma el enlace al abrirlo
// (caduca en diez minutos) y se manda alli.
export async function GET(_req: Request, { params }: { params: Promise<{ hojaId: string; versionId: string; indice: string }> }) {
  const { hojaId, versionId, indice } = await params;
  const yo = await quienSoy();
  if (!yo || !(puedeVerCobros(yo) || puedeVerEcobalance(yo))) return new Response("No tienes acceso a la facturación.", { status: 403 });
  const url = await enlaceFirmada(hojaId, versionId, Number(indice));
  if (!url) return new Response("No se encuentra el documento.", { status: 404 });
  redirect(url);
}
