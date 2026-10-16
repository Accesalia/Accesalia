import { quienSoy } from "../../../../lib/sesion";
import { pdfDeCobro } from "../../../../lib/hojasFirmadas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL JUSTIFICANTE DE UN COBRO (almacen privado `facturas`, subido desde Drive el
// 16-oct-2026). Se abre en el visor de la pantalla o en el navegador.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) return new Response("Hay que entrar.", { status: 401 });
  const j = await pdfDeCobro(id, yo);
  if (!j) return new Response("No se encuentra el justificante.", { status: 404 });
  return new Response(j.pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(j.nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
