import { quienSoy } from "../../../../../lib/sesion";
import { puedeHacerHojas, puedeVerComunidad, versionParaVer } from "../../../../../lib/hojaEncargo";
import { paginaHoja } from "../../../../../lib/hojaPapel";

export const dynamic = "force-dynamic";

// UNA VERSION DE LA HOJA, COMO PAGINA. La usa el visor de la pantalla y, con
// ?imprimir=1, es la que saca el PDF: se abre y lanza el "Imprimir" del
// navegador, donde se elige "Guardar como PDF". Es la foto que se guardo al
// generar, tal cual, con lo que se edito a mano.
export async function GET(req: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const yo = await quienSoy();
  if (!yo || !puedeHacerHojas(yo)) return new Response("No tienes acceso a las hojas de encargo.", { status: 403 });
  const v = await versionParaVer(versionId);
  if (!v) return new Response("Esta versión no existe.", { status: 404 });
  if (!(await puedeVerComunidad(yo, v.comunidadId))) return new Response("No tienes acceso a esta comunidad.", { status: 403 });
  const imprimir = new URL(req.url).searchParams.get("imprimir") === "1";
  return new Response(paginaHoja(v.html, v.titulo, imprimir), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
