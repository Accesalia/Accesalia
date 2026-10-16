// El guardian de la puerta. En cada visita renueva la sesion (si la hay) y, con
// el login encendido (LOGIN_OBLIGATORIO=1), manda a /entrar a quien no ha
// entrado. Apagado, la app sigue abierta como hasta ahora: asi se puede subir
// a produccion sin dejar a nadie fuera antes de que el login este listo.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { esElReloj } from "./lib/reloj";

// Lo que se ve sin haber entrado: la propia puerta y la vuelta del correo o de Google.
// /portal: la pagina de la comunidad, con su propio acceso por correo (12-oct-2026).
const PUBLICO = ["/entrar", "/auth/", "/portal"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // EL RELOJ PASA. No tiene cookie de sesion porque no tiene navegador, y sin
  // esta linea el guardian lo mandaba al login: los relojes se lanzaban
  // puntuales y no ejecutaban nada. Se identifica por su cuenta -ver
  // lib/reloj.ts- y cada ruta vuelve a comprobarlo por dentro.
  if (esElReloj(req)) return res;

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

  // EL PASE SE COMPRUEBA AQUI MISMO, sin viajes (16-oct-2026): va firmado con
  // la clave publica del proyecto y trae dentro quien eres (gancho
  // hook_quien_soy). Si esta a punto de caducar, getClaims lo renueva, y al
  // renovarlo la base vuelve a mirar si sigue en el equipo: quien se da de baja
  // se queda fuera como mucho en una hora. Para echar a alguien YA, RRHH
  // (equipo.sesion_cerrada_en, abajo).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { email?: string; iat?: number; yo?: { id: string } } | undefined;

  const ruta = req.nextUrl.pathname;
  const esPublico = PUBLICO.some((p) => ruta === p || ruta.startsWith(p));
  if (process.env.LOGIN_OBLIGATORIO !== "1" || esPublico) return res;

  if (!claims?.email) {
    const a = req.nextUrl.clone();
    a.pathname = "/entrar";
    a.search = ruta === "/" ? "" : `?volver=${encodeURIComponent(ruta + req.nextUrl.search)}`;
    return NextResponse.redirect(a);
  }

  // Tener sesion no basta: el correo tiene que ser de alguien del equipo EN
  // ACTIVO. Con el pase nuevo (trae `yo`) eso ya lo miro la base al emitirlo, y
  // aqui solo queda ver si le han echado despues. Sin el (gancho aun apagado),
  // se pregunta a equipo en cada visita, como antes.
  const dentro = claims.yo?.id ? !(await echadoDespues(claims.yo.id, claims.iat ?? 0)) : await esDelEquipo(claims.email);
  if (!dentro) {
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

/** LOS ECHADOS, guardados un minuto en esta maquina: una sola consulta por
 *  minuto, no una por toque. Solo los de las ultimas dos horas (un pase dura
 *  una hora: los de antes ya no tienen pase vivo). */
let echados: { hasta: number; lista: Map<string, number> } = { hasta: 0, lista: new Map() };
async function echadoDespues(equipoId: string, emitidoEn: number): Promise<boolean> {
  if (Date.now() > echados.hasta) {
    const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
    const secreto = process.env.SUPABASE_SECRET_KEY ?? "";
    const desde = new Date(Date.now() - 2 * 3600_000).toISOString();
    const r = await fetch(`${url}/rest/v1/equipo?select=id,sesion_cerrada_en&sesion_cerrada_en=gte.${desde}`, {
      headers: { apikey: secreto, Authorization: `Bearer ${secreto}` },
      cache: "no-store",
    }).catch(() => null);
    if (r?.ok) {
      const filas = (await r.json()) as { id: string; sesion_cerrada_en: string }[];
      echados = { hasta: Date.now() + 60_000, lista: new Map(filas.map((f) => [f.id, Date.parse(f.sesion_cerrada_en)])) };
    }
  }
  const cuando = echados.lista.get(equipoId);
  return cuando !== undefined && emitidoEn * 1000 <= cuando;
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
  // El manifest tampoco: el navegador lo pide antes del login para ofrecer "Instalar".
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|satelite.webmanifest|sw-satelite.js|maplibre/|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
