import { quienSoy } from "../../../../../lib/sesion";
import { filtrosDe, hojasFirmadas } from "../../../../../lib/hojasFirmadas";
import { puedeVerCobros } from "../../../../../lib/cobros";

export const dynamic = "force-dynamic";

// LA LISTA DE HOJAS FIRMADAS, POR GESTO (16-oct-2026, con e3): filtrar, buscar o
// cambiar de pagina pide solo esto -una llamada a la base, 50 hojas- y no
// vuelve a pintar la pagina entera en el servidor.
export async function GET(req: Request) {
  const yo = await quienSoy();
  if (!yo || !puedeVerCobros(yo)) return Response.json({ error: "No tienes acceso a la facturación." }, { status: 403 });
  try {
    return Response.json(await hojasFirmadas(filtrosDe(new URL(req.url).searchParams), yo), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
