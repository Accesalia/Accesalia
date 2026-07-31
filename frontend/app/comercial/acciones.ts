"use server";

// Escritura del area comercial. De momento: crear una interaccion (registro de
// contacto) desde voz o texto. La IA de extraccion (fan-out a oportunidades/leads/
// tareas) llega en el siguiente bocado; aqui solo se guarda el crudo + el sujeto.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}

export async function crearInteraccion(fd: FormData) {
  const comercialId = txt(fd, "comercial_id");
  // El sujeto de la nota es un PUESTO: la persona EN su administracion. Antes
  // era administrador_id, que mezclaba a la persona con su casa; si cambiaba de
  // empresa se perdia el hilo de lo hablado con ella.
  const puestoId = txt(fd, "puesto_id");
  const transcripcion = txt(fd, "transcripcion");
  if (!transcripcion) return; // sin contenido no hay interaccion

  const res = await fetch(`${URL_BASE}/rest/v1/interacciones`, {
    method: "POST",
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      comercial_id: comercialId,
      puesto_id: puestoId,
      pendiente_vincular: !puestoId, // suelta si no se ancla a nadie
      transcripcion,
      origen: txt(fd, "origen") ?? "manual",
      tipo_evento: txt(fd, "tipo_evento") ?? "otro",
      fecha_evento: txt(fd, "fecha_evento"),
      requiere_humano: false,
    }),
  });
  if (!res.ok) throw new Error(`crearInteraccion: ${await res.text()}`);
  const [creada] = (await res.json()) as { id: string }[];

  // Procesado por IA AUTOMATICO (sin boton): lee, interpreta y actua.
  //
  // NO se espera a que termine. Sali tarda entre veinte segundos y un minuto en
  // pensar, y Vercel corta las funciones mucho antes: la accion moria a medias y
  // el usuario se quedaba mirando el boton sin que pasara nada, aunque la nota
  // ya estuviera guardada. Se le da el aviso a la edge y se sigue; Supabase ya
  // tiene la peticion y la procesa por su cuenta aunque aqui dejemos de esperar.
  //
  // Si el aviso ni siquiera sale (local sin functions serve, red caida), la nota
  // queda guardada como "sin procesar" y se puede reprocesar desde la revision.
  try {
    await fetch(`${URL_BASE}/functions/v1/extraer-comercial`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" },
      body: JSON.stringify({ interaccion_id: creada.id }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // lo normal es acabar aqui por el corte de los 2,5 s: no es un fallo
  }

  // A la PANTALLA DE REVISIÓN de esta nota: izquierda lo grabado, derecha lo que
  // Ordelia entendió/hizo. Puede que llegue antes que ella: la pantalla lo dice
  // y basta con recargar en unos segundos.
  revalidatePath("/comercial");
  redirect(comercialId ? `/comercial/interaccion/${creada.id}?c=${comercialId}` : `/comercial/interaccion/${creada.id}`);
}
