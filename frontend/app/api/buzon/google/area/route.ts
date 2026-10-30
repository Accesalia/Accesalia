import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AREAS_CONECTABLES, urlPermisoArea } from "../../../../../lib/buzonArea";
import type { Area } from "../../../../../lib/correo";
import { quienSoy } from "../../../../../lib/sesion";

// CONECTAR UN BUZON DE AREA CON LA APP (Monica, 30-oct-2026), el primero
// tecnicos@. Mismo proyecto de Google y misma vuelta que el buzon del Polycam
// (../vuelta), que distingue por la cookie. Solo lectura. Solo direccion.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const yo = await quienSoy();
  if (!yo?.veTodo) return NextResponse.json({ error: "Solo dirección." }, { status: 403 });
  const area = new URL(req.url).searchParams.get("area") ?? "";
  if (!AREAS_CONECTABLES.includes(area as Area)) return NextResponse.json({ error: "Ese buzón no se puede conectar." }, { status: 400 });
  const estado = crypto.randomUUID();
  (await cookies()).set("buzon_area_estado", `${estado}:${area}`, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/buzon/google" });
  return NextResponse.redirect(urlPermisoArea(estado, area as Area));
}
