// La vuelta de Google o del enlace del correo. Trae un codigo de un solo uso:
// se cambia por la sesion y se comprueba que el correo es de alguien del
// equipo. Si no lo es, se cierra la sesion en el acto: haber entrado en Google
// no da derecho a entrar aqui.

import { NextResponse, type NextRequest } from "next/server";
import { clienteSesion } from "../../../lib/auth/servidor";
import { personaPorCorreo } from "../../../lib/sesion";

// La direccion por la que ha llegado de verdad (en local, Next cambia
// 127.0.0.1 por localhost, y la sesion se quedaria en el otro nombre).
function base(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const origen = base(req);
  const volver = url.searchParams.get("volver") ?? "/menu";
  const destino = volver.startsWith("/") && !volver.startsWith("//") ? volver : "/menu";

  const supabase = await clienteSesion();
  const codigo = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");

  // Dos formas de volver: con codigo (Google, y el enlace abierto en el mismo
  // navegador) o con token_hash (el enlace abierto en otro dispositivo, si la
  // plantilla del correo lo manda asi).
  const { data, error } = codigo
    ? await supabase.auth.exchangeCodeForSession(codigo)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
      : { data: { user: null }, error: new Error("sin codigo") };

  if (error || !data.user?.email) {
    return NextResponse.redirect(new URL("/entrar?error=caducado", origen));
  }
  if (!(await personaPorCorreo(data.user.email))) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/entrar?error=sin_acceso", origen));
  }
  return NextResponse.redirect(new URL(destino, origen));
}
