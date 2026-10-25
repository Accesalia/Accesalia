import { quienSoy } from "../../../../../lib/sesion";
import { pdfDeHojaVersion } from "../../../../../lib/hojaEmitir";
import { pdfPresupuestoDeVersion } from "../../../../../lib/presupuesto";
import { puedeRevisar } from "../../../../../lib/revisionOferta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL PDF DE UNA HOJA DEL SISTEMA NUEVO (o de su presupuesto, con ?que=presupuesto), 25-oct-2026: el emitido (el firmado
// si lo hay) o, mientras espera el ok de Daniel, la vista previa sin codigo. De momento, como la prueba: direccion y
// quien revisa ofertas.
export async function GET(req: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const yo = await quienSoy();
  if (!yo || !(yo.veTodo || puedeRevisar(yo))) return new Response("No tienes acceso.", { status: 403 });
  const presupuesto = new URL(req.url).searchParams.get("que") === "presupuesto";
  try {
    const h = await pdfDeHojaVersion(versionId);
    if (!h) return new Response("Esta hoja aún no tiene papel.", { status: 404 });
    const pdf = presupuesto ? await pdfPresupuestoDeVersion(versionId) : h.pdf;
    if (!pdf) return new Response("Esta hoja no tiene presupuesto.", { status: 404 });
    const nombre = presupuesto ? h.nombre.replace(/^Hoja de encargo/, "Presupuesto") : h.nombre;
    return new Response(pdf as unknown as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return new Response((e as Error).message, { status: 404 });
  }
}
