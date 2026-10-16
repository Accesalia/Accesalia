import { quienSoy } from "../../../../lib/sesion";
import { puedeVerCobros } from "../../../../lib/cobros";
import { filtrosPanoramicaDe, panoramica } from "../../../../lib/panoramica";

export const dynamic = "force-dynamic";

// VISTA PANORAMICA, POR GESTO: cada filtro o pagina pide solo esto (una llamada a
// la base, 40 opps), sin volver a pintar la pagina entera en el servidor.
export async function GET(req: Request) {
  const yo = await quienSoy();
  if (!yo || !puedeVerCobros(yo)) return Response.json({ error: "No tienes acceso a la facturación." }, { status: 403 });
  try {
    return Response.json(await panoramica(filtrosPanoramicaDe(new URL(req.url).searchParams), yo), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
