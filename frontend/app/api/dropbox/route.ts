import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { urlPermisoDropbox } from "../../../lib/dropboxApi";
import { quienSoy } from "../../../lib/sesion";

// CONECTAR EL DROPBOX (Monica, 28-oct-2026). Manda a la pantalla de permiso de
// Dropbox, donde se entra con la cuenta de Daniel; la vuelta es ./vuelta. Solo
// direccion. El "estado" va en una cookie para que la vuelta sepa que viene de aqui.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const yo = await quienSoy();
  if (!yo?.veTodo) return NextResponse.json({ error: "Solo dirección." }, { status: 403 });
  const estado = crypto.randomUUID();
  (await cookies()).set("dropbox_estado", estado, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/dropbox" });
  return NextResponse.redirect(urlPermisoDropbox(estado));
}
