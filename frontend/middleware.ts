// El guardian de la puerta. En cada visita renueva la sesion (si la hay) y, con
// el login encendido (LOGIN_OBLIGATORIO=1), manda a /entrar a quien no ha
// entrado. Apagado, la app sigue abierta como hasta ahora: asi se puede subir
// a produccion sin dejar a nadie fuera antes de que el login este listo.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Lo que se ve sin haber entrado: la propia puerta y la vuelta del correo o de Google.
const PUBLICO = ["/entrar", "/auth/"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Sin las claves del login (produccion, hasta que se configure), el guardian
  // se aparta y la app sigue abierta como siempre. Nunca deja a nadie fuera
  // por una configuracion a medias.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();

  const ruta = req.nextUrl.pathname;
  const esPublico = PUBLICO.some((p) => ruta === p || ruta.startsWith(p));
  if (process.env.LOGIN_OBLIGATORIO === "1" && !data.user && !esPublico) {
    const a = req.nextUrl.clone();
    a.pathname = "/entrar";
    a.search = ruta === "/" ? "" : `?volver=${encodeURIComponent(ruta + req.nextUrl.search)}`;
    return NextResponse.redirect(a);
  }
  return res;
}

export const config = {
  // Todo menos los ficheros estaticos y las imagenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
