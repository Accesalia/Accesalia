import { quienSoy } from "../../../../../lib/sesion";
import { puedeVerLibro } from "../../../../../lib/cobros";
import { leerProforma, libroDeEmpresa } from "../../../../../lib/proformas";
import { pdfDeProforma } from "../../../../../lib/pdf/ProformaDoc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL PDF DE UNA PROFORMA (12-oct-2026). Sale de la proforma guardada, siempre
// igual. Solo quien lleva ese libro. Con ?descargar=1, se descarga.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) return new Response("Entra en la app para verla.", { status: 401 });
  const p = await leerProforma(id);
  if (!p) return new Response("Esta proforma no existe.", { status: 404 });
  if (!puedeVerLibro(yo, libroDeEmpresa(p.empresa))) return new Response("Es del otro libro de facturación.", { status: 403 });
  const { nombre, contenido } = await pdfDeProforma(p);
  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  return new Response(contenido as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
