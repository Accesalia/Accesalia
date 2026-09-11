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
  if (process.env.LOGIN_OBLIGATORIO !== "1" || esPublico) return res;

  if (!data.user) {
    const a = req.nextUrl.clone();
    a.pathname = "/entrar";
    a.search = ruta === "/" ? "" : `?volver=${encodeURIComponent(ruta + req.nextUrl.search)}`;
    return NextResponse.redirect(a);
  }

  // Tener sesion no basta: el correo tiene que ser de alguien del equipo EN
  // ACTIVO, y se mira en cada visita. Asi, quien deja la empresa se queda
  // fuera el mismo dia que se le da de baja, aunque su sesion siga viva.
  if (!(await esDelEquipo(data.user.email))) {
    await supabase.auth.signOut();
    const a = req.nextUrl.clone();
    a.pathname = "/entrar";
    a.search = "?error=sin_acceso";
    const fuera = NextResponse.redirect(a);
    res.cookies.getAll().forEach((c) => fuera.cookies.set(c));
    return fuera;
  }
  return res;
}

async function esDelEquipo(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  const secreto = process.env.SUPABASE_SECRET_KEY ?? "";
  // En activo = activo y sin fecha de baja pasada (la baja puede ser futura).
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const r = await fetch(
    `${url}/rest/v1/equipo?select=id&activo=is.true&or=(fecha_baja.is.null,fecha_baja.gte.${hoy})` +
      `&email=ilike.${encodeURIComponent(email.trim())}&limit=1`,
    { headers: { apikey: secreto, Authorization: `Bearer ${secreto}` }, cache: "no-store" },
  );
  if (!r.ok) return false;
  return ((await r.json()) as unknown[]).length > 0;
}

export const config = {
  // Todo menos los ficheros estaticos y las imagenes.
  // (el worker del mapa, /maplibre/*.mjs, tampoco necesita pasar por aqui).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|maplibre/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
