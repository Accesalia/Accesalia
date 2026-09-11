"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clienteSesion } from "../../lib/auth/servidor";
import { personaPorCorreo } from "../../lib/sesion";

// Las dos puertas de la app (Monica, 11-sep-2026):
//   - Google, para el equipo: todos tienen un Gmail nominativo de Accesalia;
//   - un enlace al correo, sin contraseña, para cualquier otro correo. Hace
//     falta desde el principio: administradores, comunidades y contratas no
//     tendran Gmail.

async function origen(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

// Solo se vuelve a rutas de la propia app: nunca a una direccion de fuera.
const destinoSeguro = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/menu";
};

export async function entrarConGoogle(fd: FormData) {
  const volver = destinoSeguro(fd.get("volver"));
  const supabase = await clienteSesion();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origen()}/auth/callback?volver=${encodeURIComponent(volver)}` },
  });
  if (error || !data.url) redirect("/entrar?error=google");
  redirect(data.url);
}

export async function enviarEnlace(fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const volver = destinoSeguro(fd.get("volver"));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/entrar?error=correo&volver=${encodeURIComponent(volver)}`);

  // Solo se manda el enlace a quien tiene acceso. A quien no, se le dice lo
  // mismo, para no revelar que correos estan dados de alta.
  if (await personaPorCorreo(email)) {
    const supabase = await clienteSesion();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${await origen()}/auth/callback?volver=${encodeURIComponent(volver)}` },
    });
    if (error) redirect(`/entrar?error=enlace&volver=${encodeURIComponent(volver)}`);
  }
  redirect(`/entrar?enviado=${encodeURIComponent(email)}`);
}

export async function salir() {
  const supabase = await clienteSesion();
  await supabase.auth.signOut();
  redirect("/entrar?salido=1");
}
