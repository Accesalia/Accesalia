import { NextResponse } from "next/server";
import { permisosFotos } from "../../../../lib/fotos";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// Permisos de un solo uso para que el movil suba las fotos de una nota
// directamente al almacen (8-oct-2026).
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const yo = await quienSoy();
  if (!yo) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  if (!puedeEntrar(yo, "comercial", "trabajar")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const { n } = (await req.json().catch(() => ({}))) as { n?: number };
  try {
    return NextResponse.json(await permisosFotos(Number(n)));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
