// lib/auth/servidor.ts
//
// El cliente de Supabase que sabe QUIEN ha entrado. Solo sirve para la sesion:
// entrar, salir y leer el usuario. Los datos se siguen leyendo como hasta
// ahora (lib/datos.ts y compañia, con la clave secreta y solo en el servidor).
//
// Usa la clave PUBLICA: por si sola no abre nada, porque las tablas tienen RLS
// y sin politicas no dejan leer a nadie que no sea el servidor.

import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function clienteSesion() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (lista) => {
          // Desde una pagina (Server Component) no se pueden escribir cookies;
          // da igual, porque el middleware ya renueva la sesion en cada visita.
          try {
            lista.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}

/** ¿Esta configurado el login? (las claves publicas estan puestas) */
export const loginConfigurado = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** ¿Esta encendido el login? Mientras no, la app sigue abierta como siempre. */
export const loginObligatorio = () => loginConfigurado() && process.env.LOGIN_OBLIGATORIO === "1";
