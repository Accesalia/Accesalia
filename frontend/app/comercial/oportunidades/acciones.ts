"use server";

// Pipeline COMERCIAL por hitos: iniciar el pipeline de una oportunidad (instancia
// los hitos del catalogo), avanzar un hito (estado/fecha/responsable/enlace/aplicable)
// y registrar un cambio de NEGOCIACION (que vendemos + precio, con histórico).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const H = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}
function api(path: string, method: string, body?: unknown, prefer?: string) {
  return fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
}
function volver(comercialId: string | null) {
  revalidatePath("/comercial/oportunidades");
  redirect(comercialId ? `/comercial/oportunidades?c=${comercialId}` : "/comercial/oportunidades");
}

/** Iniciar el pipeline: instancia los hitos del catálogo con su aplicabilidad por defecto. */
export async function iniciarPipeline(fd: FormData) {
  const oportunidadId = txt(fd, "oportunidad_id")!;
  const comercialId = txt(fd, "comercial_id");

  const cat = (await (await api("hitos_comerciales?select=clave,aplicable_por_defecto", "GET")).json()) as
    { clave: string; aplicable_por_defecto: boolean }[];
  const rows = cat.map((h) => ({
    oportunidad_id: oportunidadId,
    hito: h.clave,
    aplicable: h.aplicable_por_defecto,
    estado: h.aplicable_por_defecto ? "pendiente" : "no_aplica",
  }));
  await api("hitos_oportunidad", "POST", rows, "resolution=ignore-duplicates");
  volver(comercialId);
}

/** Actualizar un hito (estado, fecha, responsable, enlace Dropbox, aplicabilidad). */
export async function actualizarHito(fd: FormData) {
  const hitoId = txt(fd, "hito_id")!;
  const comercialId = txt(fd, "comercial_id");
  const aplicable = fd.get("aplicable") != null; // checkbox
  const estado = txt(fd, "estado") ?? "pendiente";

  await api(`hitos_oportunidad?id=eq.${hitoId}`, "PATCH", {
    aplicable,
    estado: aplicable ? estado : "no_aplica",
    fecha: txt(fd, "fecha"),
    responsable_id: txt(fd, "responsable_id"),
    enlace_url: txt(fd, "enlace_url"),
  });
  volver(comercialId);
}

/** Crear una oportunidad A MANO (para el comercial que prefiere el botón a la voz).
 *  El trigger le monta el pipeline; si hay qué/precio, deja la primera oferta. */
export async function crearOportunidadManual(fd: FormData) {
  const comercialId = txt(fd, "comercial_id");
  const comunidadId = txt(fd, "comunidad_id");
  const provisional = txt(fd, "comunidad_provisional");
  const que = txt(fd, "que_vendemos");
  const precioRaw = txt(fd, "precio");
  const alcance = txt(fd, "alcance");
  if (!comunidadId && !provisional) return; // sin comunidad no hay oportunidad

  // Con quien se habla en esa comunidad. Ya no es una columna de comunidades:
  // se pregunta al vinculo vigente, que ademas sabe la PERSONA y no solo la
  // casa. Si la comunidad no tiene administracion asignada, se queda vacio.
  let puestoId: string | null = null;
  if (comunidadId) {
    const cr = await api(
      "comunidad_admin_responsable?select=puesto_id" +
        `&comunidad_id=eq.${comunidadId}&vigente=is.true&limit=1`,
      "GET",
    );
    puestoId = ((await cr.json()) as { puesto_id: string | null }[])[0]?.puesto_id ?? null;
  }

  const r = await api("oportunidades", "POST", {
    comunidad_id: comunidadId,
    comunidad_provisional: comunidadId ? null : provisional,
    puesto_id: puestoId,
    comercial_id: comercialId,
    tipo_origen: "otro",
    estado: "activa",
    origen_notas: [que, precioRaw ? `${precioRaw} €` : null].filter(Boolean).join(" · ") || null,
  }, "return=representation");
  const [op] = (await r.json()) as { id: string }[];

  if (op?.id && (que || precioRaw || alcance)) {
    await api("negociacion_oportunidad", "POST", {
      oportunidad_id: op.id, que_vendemos: que,
      precio: precioRaw ? Number(precioRaw.replace(",", ".")) : null,
      alcance, comercial_id: comercialId,
    });
  }
  volver(comercialId);
}

/** Registrar un cambio de negociación (qué vendemos + precio + alcance): nueva fila
 *  = nueva oferta vigente; el histórico queda. */
export async function registrarNegociacion(fd: FormData) {
  const oportunidadId = txt(fd, "oportunidad_id")!;
  const comercialId = txt(fd, "comercial_id");
  const precioRaw = txt(fd, "precio");

  await api("negociacion_oportunidad", "POST", {
    oportunidad_id: oportunidadId,
    que_vendemos: txt(fd, "que_vendemos"),
    precio: precioRaw ? Number(precioRaw.replace(",", ".")) : null,
    alcance: txt(fd, "alcance"),
    notas: txt(fd, "notas"),
    comercial_id: comercialId,
  });
  volver(comercialId);
}
