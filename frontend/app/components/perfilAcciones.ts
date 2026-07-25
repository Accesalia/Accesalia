"use server";

// LOGIN-FAKE: fija la identidad "con la que entro" en una cookie legible por el
// servidor, para poder ver "que ve Alexandra / que ve Alvaro" sin login real.
// Cuando entre el login de verdad, esto se sustituye por la sesion; el resto de
// la app ya podra leer el perfil actual de la misma forma.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_PERFIL } from "./perfilConstantes";

export async function elegirPerfil(fd: FormData) {
  const id = String(fd.get("perfil_id") ?? "").trim();
  const jar = await cookies();
  if (id) {
    jar.set(COOKIE_PERFIL, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    jar.delete(COOKIE_PERFIL);
  }
  revalidatePath("/", "layout");
}
