import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { urlPermiso } from "../../../../lib/gmailBuzon";
import { quienSoy } from "../../../../lib/sesion";

// CONECTAR EL BUZON DEL POLYCAM CON GOOGLE (Monica, 28-oct-2026). Manda a la
// pantalla de permiso de Google; la vuelta es ./vuelta. Solo direccion: el
// permiso abre el buzon entero. El "estado" va en una cookie para que la vuelta
// sepa que viene de aqui y no de un enlace de fuera.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const yo = await quienSoy();
  if (!yo?.veTodo) return NextResponse.json({ error: "Solo dirección." }, { status: 403 });
  const estado = crypto.randomUUID();
  (await cookies()).set("buzon_google_estado", estado, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/buzon/google" });
  return NextResponse.redirect(urlPermiso(estado));
}
