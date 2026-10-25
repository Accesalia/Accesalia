import { quienSoy } from "../../../../../lib/sesion";
import { zipGuardado } from "../../../../../lib/proformasEmitidas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL ZIP PARA FACTUSOL de una proforma ya enviada (25-oct-2026): la carpeta con PCL, LPC (y CLI si el cliente es
// nuevo), tal como se genero al enviarla. Mientras la app no tenga acceso al Dropbox, es lo que se importa.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) return new Response("Entra en la app.", { status: 401 });
  try {
    const z = await zipGuardado(yo, id);
    if (!z) return new Response("Esta proforma aún no se ha enviado a Factusol.", { status: 404 });
    return new Response(z.contenido, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(z.nombre)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "No se puede.", { status: 403 });
  }
}
