"use server";

// Escritura del mundo contrata. Por ahora solo el diario, que es la unica
// escritura que abrimos: una nota no pisa ningun dato, solo se apila.
//
// El autor va a mano mientras no haya inicio de sesion. Cuando lo haya, saldra
// de la sesion y este campo dejara de escribirse.

import { revalidatePath } from "next/cache";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

function cabeceras(extra: Record<string, string> = {}) {
  return {
    apikey: SECRETO,
    Authorization: `Bearer ${SECRETO}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/**
 * Una entrada nueva. Cuelga de la contrata, de una persona o de un puesto, y
 * solo de una de las tres: la tabla lo impide con un CHECK.
 */
export async function crearNotaContrata(formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;

  const contrataId = String(formData.get("contrata_id") ?? "");
  const personaId = String(formData.get("persona_id") ?? "");
  const puestoId = String(formData.get("puesto_id") ?? "");
  const autor = String(formData.get("autor") ?? "").trim() || null;
  const volver = String(formData.get("volver") ?? "/contratas");

  const fila = puestoId
    ? { puesto_id: puestoId, texto, autor, origen: "app" }
    : personaId
      ? { persona_id: personaId, texto, autor, origen: "app" }
      : { contrata_id: contrataId, texto, autor, origen: "app" };

  const r = await fetch(`${URL_BASE}/rest/v1/notas_contratas`, {
    method: "POST",
    headers: cabeceras({ Prefer: "return=minimal" }),
    body: JSON.stringify(fila),
  });
  if (!r.ok) throw new Error(`No se pudo guardar la nota: ${await r.text()}`);

  revalidatePath(volver);
}

/**
 * Corregir una entrada. Se cambia el texto en su sitio y `actualizado_en` deja
 * constancia de que se toco, que es lo unico que importa despues de una errata.
 */
export async function editarNotaContrata(formData: FormData) {
  const id = String(formData.get("nota_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  const volver = String(formData.get("volver") ?? "/contratas");
  if (!id || !texto) return;

  const r = await fetch(`${URL_BASE}/rest/v1/notas_contratas?id=eq.${id}`, {
    method: "PATCH",
    headers: cabeceras({ Prefer: "return=minimal" }),
    body: JSON.stringify({ texto }),
  });
  if (!r.ok) throw new Error(`No se pudo corregir la nota: ${await r.text()}`);

  revalidatePath(volver);
}
