import { quienSoy } from "../../../../../lib/sesion";
import { pdfDeVersion, puedeHacerHojas, puedeVerComunidad } from "../../../../../lib/hojaEncargo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL PDF DE UNA VERSION DE LA HOJA. Lo saca la app (Monica, 6-oct-2026): es el
// que se guardo al generar, o se hace al momento si la version es anterior a
// que se guardaran. Se abre en el navegador; de ahi se descarga o se manda.
export async function GET(req: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const yo = await quienSoy();
  if (!yo || !puedeHacerHojas(yo)) return new Response("No tienes acceso a las hojas de encargo.", { status: 403 });
  const v = await pdfDeVersion(versionId);
  if (!v) return new Response("Esta versión no existe o no tiene hoja.", { status: 404 });
  if (!(await puedeVerComunidad(yo, v.comunidadId))) return new Response("No tienes acceso a esta comunidad.", { status: 403 });
  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  return new Response(v.pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(v.nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
