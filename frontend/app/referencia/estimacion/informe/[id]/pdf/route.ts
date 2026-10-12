import { quienSoy } from "../../../../../../lib/sesion";
import { leerInforme } from "../../../../../../lib/informeCostes";
import { pdfDeInformeCostes } from "../../../../../../lib/pdf/InformeCostesDoc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// EL PDF DE UN INFORME DE COSTES EMITIDO (12-oct-2026). Sale de su foto, asi que
// es siempre el mismo. Se abre en el navegador; con ?descargar=1, se descarga.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) return new Response("Entra en la app para verlo.", { status: 401 });
  const inf = await leerInforme(id);
  if (!inf || inf.tipo !== "estimacion_costes") return new Response("Este informe no existe.", { status: 404 });
  const pdf = await pdfDeInformeCostes(inf.datos);
  const nombre = `Estimacion de costes - ${inf.direccion}.pdf`.replace(/[\/:*?"<>|]/g, "");
  const descargar = new URL(req.url).searchParams.get("descargar") === "1";
  return new Response(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
