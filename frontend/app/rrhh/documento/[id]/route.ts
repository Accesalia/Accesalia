// Abrir un documento de RRHH: se comprueba quien lo pide y, si puede verlo, se
// le manda a un enlace del almacen que caduca en un minuto. El enlace no se
// guarda en ningun sitio ni vale para otra persona pasado ese minuto.

import { NextResponse, type NextRequest } from "next/server";
import { quienSoy, puedeEntrar } from "../../../../lib/sesion";
import { documento, enlaceDeDescarga, puedeVer } from "../../../../lib/rrhhDocumentos";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) return NextResponse.redirect(new URL("/entrar?volver=/rrhh", req.url));
  const doc = await documento(id);
  if (!doc || !puedeVer(yo.id, puedeEntrar(yo, "rrhh", "trabajar"), doc)) {
    return new NextResponse("Ese documento no existe o no puedes verlo.", { status: 404 });
  }
  // ?bajar=1 lo descarga con su nombre; sin eso, se abre en el navegador.
  const bajar = req.nextUrl.searchParams.get("bajar") === "1";
  return NextResponse.redirect(await enlaceDeDescarga(doc.fichero, bajar ? doc.titulo : null));
}
