import { NextResponse } from "next/server";
import { quienSoy } from "../../../../lib/sesion";
import { firmar } from "../../../../lib/documentosReferencia";

export const dynamic = "force-dynamic";

// VER UNA FICHA DEL CATALOGO EN SU PDF (Monica, 11-oct-2026). La ficha del
// edificio enlaza aqui -un enlace que no caduca- y aqui se firma el PDF del
// almacen privado y se abre por su pagina. Solo catalogos-proteccion/.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const yo = await quienSoy();
  if (!yo) return NextResponse.redirect(new URL(`/entrar?volver=${encodeURIComponent(u.pathname + u.search)}`, u));
  const ruta = u.searchParams.get("ruta") ?? "";
  if (!ruta.startsWith("catalogos-proteccion/") || ruta.includes("..")) return new NextResponse("Documento no válido", { status: 400 });
  const enlace = await firmar(ruta);
  if (!enlace) return new NextResponse("No se ha podido abrir el documento", { status: 404 });
  const pagina = Number(u.searchParams.get("pagina"));
  return NextResponse.redirect(Number.isInteger(pagina) && pagina > 0 ? `${enlace}#page=${pagina}` : enlace);
}
