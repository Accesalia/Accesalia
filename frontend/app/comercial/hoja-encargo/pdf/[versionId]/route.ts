import { quienSoy } from "../../../../../lib/sesion";
import { pdfDeHojaVersion } from "../../../../../lib/hojaEmitir";
import { pdfPresupuestoDeVersion } from "../../../../../lib/presupuesto";
import { puedeRevisar } from "../../../../../lib/revisionOferta";
import { puedeHacerHojas, puedeVerOpp } from "../../../../../lib/hojaGenerador";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL PDF DE UNA HOJA (o de su presupuesto, con ?que=presupuesto), 25-oct-2026: el emitido (el firmado si lo hay) o,
// mientras espera el ok de Daniel, la vista previa sin codigo. Lo abre quien hace hojas, de su cartera, y quien revisa
// ofertas.
export async function GET(req: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const yo = await quienSoy();
  if (!yo || !(puedeRevisar(yo) || puedeHacerHojas(yo))) return new Response("No tienes acceso.", { status: 403 });
  const presupuesto = new URL(req.url).searchParams.get("que") === "presupuesto";
  try {
    const h = await pdfDeHojaVersion(versionId);
    if (!h) return new Response("Esta hoja aún no tiene papel.", { status: 404 });
    if (!puedeRevisar(yo) && !(await puedeVerOpp(yo, h.oppId))) return new Response("No tienes acceso a esta oportunidad.", { status: 403 });
    if ("enlace" in h) {
      if (presupuesto) return new Response("Esta hoja no tiene presupuesto.", { status: 404 });
      return Response.redirect(h.enlace, 302);
    }
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
