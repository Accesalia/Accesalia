import { quienSoy } from "../../../../../lib/sesion";
import { puedeHacerHojas, puedeVerComunidad } from "../../../../../lib/hojaEncargo";
import { comunidadDeOportunidad, pdfGuardado } from "../../../../../lib/presupuesto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL PDF DE UN PRESUPUESTO GENERADO: el que se guardo en el almacen al
// generarlo. Se abre en el navegador; de ahi se descarga o se manda.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo || !puedeHacerHojas(yo)) return new Response("No tienes acceso a los presupuestos.", { status: 403 });
  const p = await pdfGuardado(id);
  if (!p) return new Response("Este presupuesto no existe o todavía no está generado.", { status: 404 });
  const comunidad = await comunidadDeOportunidad(p.oportunidadId);
  if (!comunidad || !(await puedeVerComunidad(yo, comunidad))) return new Response("No tienes acceso a esta oportunidad.", { status: 403 });
  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  return new Response(p.pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(p.nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
