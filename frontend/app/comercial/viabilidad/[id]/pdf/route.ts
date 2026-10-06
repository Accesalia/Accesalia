import { pdfGuardado } from "../../../../../lib/viabilidadComercial";
import { permisoViabilidad } from "../permiso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL PDF DE LA VIABILIDAD: el ultimo que se genero, tal cual salio.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await permisoViabilidad(id);
  } catch (e) {
    return new Response((e as Error).message, { status: 403 });
  }
  const v = await pdfGuardado(id);
  if (!v) return new Response("Esta viabilidad todavía no se ha generado.", { status: 404 });
  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  return new Response(v.pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(v.nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
