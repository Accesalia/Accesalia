import { quienSoy } from "../../../../../lib/sesion";
import { pdfDePrueba, puedeGestionarFirmas } from "../../../../../lib/firmaDigital";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// UN PDF DE PRUEBA FIRMADO con la firma de un titular (Monica, 15-oct-2026),
// para abrirlo en Adobe y ver que la firma sale bien antes de usarla. No se guarda.
export async function GET(_req: Request, { params }: { params: Promise<{ empresa: string }> }) {
  const { empresa } = await params;
  const yo = await quienSoy();
  if (!yo || !puedeGestionarFirmas(yo)) return new Response("No puedes gestionar las firmas digitales.", { status: 403 });
  try {
    const pdf = await pdfDePrueba(empresa, yo);
    return new Response(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`Prueba de firma - ${empresa}.pdf`)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return new Response((e as Error).message, { status: 400 });
  }
}
