"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cerrarSesion, pedirEntrada, permisoSubida, puedeEntrarEn, quienEstaEnElPortal, registrarSubida, usarEntrada, type ClavePortal } from "../../lib/portal";
import { personaPorCorreo } from "../../lib/sesion";
import { aceptarSiEsSuComercial } from "../../lib/recibidos";

// EL PORTAL DE LA COMUNIDAD: entrar por correo y subir documentos. En CADA
// accion se mira quien esta dentro y si esa comunidad es suya.

export async function accionPedirEntrada(fd: FormData) {
  try {
    await pedirEntrada(String(fd.get("email") ?? ""));
  } catch (e) {
    redirect(`/portal?error=${encodeURIComponent((e as Error).message)}`);
  }
  redirect("/portal?enviado=1");
}

export async function accionEntrar(token: string) {
  const email = await usarEntrada(token);
  redirect(email ? "/portal" : "/portal?caducado=1");
}

export async function accionSalir() {
  await cerrarSesion();
  redirect("/portal");
}

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function dentro(comunidadId: string): Promise<string> {
  const email = await quienEstaEnElPortal();
  if (!email) throw new Error("Tu sesión ha caducado: vuelve a entrar.");
  if (!(await puedeEntrarEn(email, comunidadId))) throw new Error("No tienes acceso a esta comunidad.");
  return email;
}

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];
const MAXIMO = 25 * 1024 * 1024;

export async function accionPermisoSubida(comunidadId: string, nombre: string, tipo: string, tamano: number): Promise<R<{ ruta: string; url: string }>> {
  try {
    await dentro(comunidadId);
    if (tipo && !TIPOS.includes(tipo)) throw new Error("Solo se pueden subir PDF o fotos (JPG, PNG, HEIC).");
    if (tamano > MAXIMO) throw new Error("El fichero pasa de 25 MB.");
    return { ok: true, ...(await permisoSubida(comunidadId, nombre)) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function accionRegistrar(d: {
  comunidadId: string;
  hojaId: string | null;
  versionId?: string | null;
  clave?: ClavePortal | null;
  oportunidadId?: string | null;
  descripcion: string | null;
  ruta: string;
  nombreFichero: string;
  nombre: string | null;
}): Promise<R<{ aceptada: boolean }>> {
  try {
    const email = await dentro(d.comunidadId);
    if (!d.hojaId && !d.versionId && !d.clave && !d.descripcion?.trim()) throw new Error("Dinos qué documento es.");
    const id = await registrarSubida({ ...d, email });
    // Si lo sube el comercial de esa hoja, queda aceptada al momento.
    const aceptada = d.hojaId ? await aceptarSiEsSuComercial(id, await personaPorCorreo(email)) : false;
    revalidatePath(`/portal/c/${d.comunidadId}`);
    revalidatePath("/comercial/recibidos");
    return { ok: true, aceptada };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
