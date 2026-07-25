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
  const administradorId = txt(fd, "administrador_id");
  const transcripcion = txt(fd, "transcripcion");
  if (!transcripcion) return; // sin contenido no hay interaccion

  const res = await fetch(`${URL_BASE}/rest/v1/interacciones`, {
    method: "POST",
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      comercial_id: comercialId,
      administrador_id: administradorId,
      pendiente_vincular: !administradorId, // suelta si no se ancla a un admin
      transcripcion,
      origen: txt(fd, "origen") ?? "manual",
      tipo_evento: txt(fd, "tipo_evento") ?? "otro",
      fecha_evento: txt(fd, "fecha_evento"),
      requiere_humano: false,
    }),
  });
  if (!res.ok) throw new Error(`crearInteraccion: ${await res.text()}`);
  const [creada] = (await res.json()) as { id: string }[];

  // Procesado por IA AUTOMATICO (sin boton): lee, interpreta y actua. Best-effort:
  // si la edge falla (p.ej. en local sin functions serve), la nota queda guardada
  // igual; se podra reprocesar. Todo lo que hace queda en bitacora_ia (deshacer).
  try {
    await fetch(`${URL_BASE}/functions/v1/extraer-comercial`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" },
      body: JSON.stringify({ interaccion_id: creada.id }),
    });
  } catch (e) {
    console.warn(`extraer-comercial no disparado: ${e}`);
  }

  // A la PANTALLA DE REVISIÓN de esta nota: izquierda lo grabado, derecha lo que
  // Ordelia entendió/hizo. Para cuando el usuario llega, la edge ya la procesó
  // (se esperó arriba); si falló, la revisión lo dice y el texto queda guardado.
  revalidatePath("/comercial");
  redirect(comercialId ? `/comercial/interaccion/${creada.id}?c=${comercialId}` : `/comercial/interaccion/${creada.id}`);
}
