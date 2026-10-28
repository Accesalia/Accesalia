import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { comercialesConCorreo, urlPermisoComercial } from "../../../../../lib/parteDeAyer";
import { quienSoy } from "../../../../../lib/sesion";

// CONECTAR EL CORREO DE UN COMERCIAL CON SALI, para el parte de ayer (Monica,
// 28-oct-2026: «el boton en gestiones de la app, un boton para cada correo»).
// Mismo proyecto de Google y misma vuelta que el buzon del Polycam (../vuelta),
// que distingue por la cookie. Solo lectura. Solo direccion.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const yo = await quienSoy();
  if (!yo?.veTodo) return NextResponse.json({ error: "Solo dirección." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const c = (await comercialesConCorreo()).find((x) => x.id === id);
  if (!c?.correo) return NextResponse.json({ error: "Ese comercial no tiene correo en su ficha." }, { status: 400 });
  const estado = crypto.randomUUID();
  (await cookies()).set("correo_comercial_estado", `${estado}:${c.id}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/buzon/google",
  });
  return NextResponse.redirect(urlPermisoComercial(estado, c.correo));
}
