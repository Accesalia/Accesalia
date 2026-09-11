"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const H = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function req(path: string, method: string, body?: unknown): Promise<unknown> {
  const headers: Record<string, string> = { ...H, Prefer: "return=representation" };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, init);
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: H, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** Nueva oportunidad (proceso comercial) en la comunidad, con su pipeline y oferta. */
export async function nuevaOportunidad(comunidadId: string, formData: FormData) {
  const que = String(formData.get("que_vendemos") ?? "").trim() || null;
  const precioRaw = String(formData.get("precio") ?? "").trim();
  const precio = precioRaw ? Number(precioRaw) : null;

  const ops = (await req("oportunidades", "POST", [
    { comunidad_id: comunidadId, estado: "activa" },
  ])) as { id: string }[];
  const opId = ops?.[0]?.id;
  if (opId) {
    // Sembrar el pipeline (hitos aplicables por defecto).
    const cat = await get<{ clave: string }[]>(
      "hitos_comerciales?select=clave&aplicable_por_defecto=eq.true",
    );
    if (cat.length) {
      await req(
        "hitos_oportunidad",
        "POST",
        cat.map((h) => ({ oportunidad_id: opId, hito: h.clave, aplicable: true, estado: "pendiente" })),
      );
    }
    if (que || precio != null) {
      await req("negociacion_oportunidad", "POST", [{ oportunidad_id: opId, que_vendemos: que, precio }]);
    }
  }
  revalidatePath(`/comunidades/${comunidadId}/comercial`);
}

/** Crea una viabilidad (borrador v1) bajo una oportunidad y abre el formulario. */
export async function crearViabilidad(comunidadId: string, oportunidadId: string) {
  const rows = (await req("viabilidades", "POST", [
    { oportunidad_id: oportunidadId, version: 1, vigente: true },
  ])) as { id: string }[];
  const viabId = rows?.[0]?.id;
  revalidatePath(`/comunidades/${comunidadId}/comercial`);
  if (viabId) redirect(`/comunidades/${comunidadId}/comercial/viabilidad/${viabId}`);
}

/** Aplaza una oportunidad (cierre temporal): pasa a latente, con condición de reactivación. */
export async function aplazarOportunidad(comunidadId: string, oportunidadId: string, formData: FormData) {
  const nota = String(formData.get("reactivar_nota") ?? "").trim() || null;
  const fechaRaw = String(formData.get("reactivar_fecha") ?? "").trim();
  await req(`oportunidades?id=eq.${oportunidadId}`, "PATCH", {
    estado: "latente",
    reactivar_nota: nota,
    reactivar_fecha: fechaRaw || null,
  });
  revalidatePath(`/comunidades/${comunidadId}/comercial`);
}

/** Reactiva una oportunidad latente (vuelve a "sobre la mesa"). */
export async function reactivarOportunidad(comunidadId: string, oportunidadId: string) {
  await req(`oportunidades?id=eq.${oportunidadId}`, "PATCH", { estado: "activa" });
  revalidatePath(`/comunidades/${comunidadId}/comercial`);
}

/** Guarda el formulario de viabilidad (cabecera + textos + obra + conceptos). */
export async function guardarViabilidad(viabId: string, comunidadId: string, formData: FormData) {
  const txt = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : null;
  };
  const vr = String(formData.get("viable") ?? "");
  const viable = vr === "si" ? true : vr === "no" ? false : null;

  await req(`viabilidades?id=eq.${viabId}`, "PATCH", {
    arquitecto_id: txt("arquitecto_id"),
    fecha_visita: txt("fecha_visita"),
    objeto: txt("objeto"),
    descripcion_intervenciones: txt("descripcion_intervenciones"),
    conclusion: txt("conclusion"),
    viable,
    coste_obra_base: num("coste_obra_base"),
    coste_obra_iva_porcentaje: num("coste_obra_iva_porcentaje"),
  });

  await req(`viabilidad_conceptos?viabilidad_id=eq.${viabId}`, "DELETE");
  const iva = num("iva_porcentaje");
  const filas: Record<string, unknown>[] = [];
  for (const [key, val] of formData.entries()) {
    if (key.startsWith("concepto_") && val === "on") {
      const bloqueId = key.slice("concepto_".length);
      filas.push({ viabilidad_id: viabId, bloque_id: bloqueId, seleccionado: true, importe: num(`importe_${bloqueId}`), iva_porcentaje: iva });
    }
  }
  if (filas.length) await req("viabilidad_conceptos", "POST", filas);

  revalidatePath(`/comunidades/${comunidadId}/comercial`);
  redirect(`/comunidades/${comunidadId}/comercial`);
}
