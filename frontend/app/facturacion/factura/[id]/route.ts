import { quienSoy } from "../../../../lib/sesion";
import { pdfDeFactura, puedeVerCobros } from "../../../../lib/cobros";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL PDF DE UNA FACTURA (almacen privado `facturas`, emparejado por numero con
// su PDF de Drive). Se abre en el navegador o en el visor de la pantalla.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo || !puedeVerCobros(yo)) return new Response("No tienes acceso a la facturación.", { status: 403 });
  const f = await pdfDeFactura(id);
  if (!f) return new Response("Esta factura no tiene PDF.", { status: 404 });
  return new Response(f.pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(f.nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
