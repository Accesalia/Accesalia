"use server";

// Acciones de la PANTALLA DE REVISIÓN. El humano cierra lo que Ordelia dejó
// propuesto, con el mínimo de clics:
//   - confirmarComunidadNueva : "sí, es un lead nuevo" -> oportunidad con
//     comunidad_provisional (la ficha maestra de comunidad nace al firmar+cobrar).
//   - vincularAComunidad       : desambiguar -> enlaza a una comunidad existente.
//   - deshacerEvento           : botón del pánico "esa no era" -> revierte la
//     acción (borra lo creado) y la marca deshecha en la bitácora.
//   - validarRevision          : "todo correcto" -> cierra y vuelve al hub.
// Todo deja rastro en bitacora_ia (actor_tipo='humano').

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

const H = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

function txt(fd: FormData, k: string): string | null {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}

async function api(path: string, method: string, body?: unknown, prefer?: string): Promise<Response> {
  return fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: prefer ? { ...H, Prefer: prefer } : H,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
}

async function eventoDatos(eventoId: string): Promise<Record<string, unknown>> {
  const r = await api(`bitacora_ia?select=datos&id=eq.${eventoId}&limit=1`, "GET");
  const [row] = (await r.json()) as { datos: Record<string, unknown> }[];
  return row?.datos ?? {};
}

function notasDe(it: Record<string, unknown>): string | null {
  return [it.tipo_proyecto, it.importe, it.interes, it.notas].filter(Boolean).join(" · ") || null;
}

/** Da CASA a la parte técnica al resolver la comunidad (crear/vincular): promueve
 *  los deseo_tecnico de la nota al brief (condicionantes_comunidad). Cuando la nota
 *  era nueva/suelta, el deseo esperaba solo en el crudo; aquí salta al brief en
 *  cuanto hay comunidad donde colgarlo. Solo los del mismo sujeto (o sin sujeto)
 *  que se está resolviendo, para no mezclar deseos de otra finca de la misma nota. */
async function promoverDeseos(interaccionId: string, comunidadId: string, sujetoNombre: string | null) {
  const r = await api(`interacciones?select=extraccion&id=eq.${interaccionId}&limit=1`, "GET");
  const [row] = (await r.json()) as { extraccion: { items?: Record<string, unknown>[] } | null }[];
  const items = row?.extraccion?.items ?? [];
  const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();
  for (const it of items) {
    if (it.accion !== "deseo_tecnico") continue;
    if (sujetoNombre && it.sujeto_nombre && norm(it.sujeto_nombre) !== norm(sujetoNombre)) continue;
    const texto = (it.deseo_o_condicionante as string) || (it.notas as string) || (it.interes as string) || "";
    if (!texto.trim()) continue;
    const ins = await api("condicionantes_comunidad", "POST",
      { comunidad_id: comunidadId, interaccion_id: interaccionId, texto, categoria: "deseo", origen: "humano" },
      "return=representation");
    const [cc] = (await ins.json()) as { id: string }[];
    if (cc?.id) await registrar(interaccionId, "item_deseo_tecnico", "condicionantes_comunidad", cc.id, { ...it, promovido: true });
  }
}

async function registrar(interaccionId: string, tipo: string, tabla: string | null, targetId: string | null, datos: unknown) {
  await api("bitacora_ia", "POST", {
    actor_tipo: "humano",
    operacion: `comercial:${interaccionId}`,
    tipo,
    target_tabla: tabla,
    target_id: targetId,
    datos,
  });
}

// Marca un evento de la bitácora como consumido/deshecho (no vuelve a salir como pendiente).
async function cerrarEvento(eventoId: string) {
  await api(`bitacora_ia?id=eq.${eventoId}`, "PATCH", { deshecho: true, fecha_deshecho: new Date().toISOString() });
}

function volver(interaccionId: string, comercialId: string | null) {
  revalidatePath(`/comercial/interaccion/${interaccionId}`);
  revalidatePath("/comercial");
  redirect(comercialId ? `/comercial/interaccion/${interaccionId}?c=${comercialId}` : `/comercial/interaccion/${interaccionId}`);
}

/** "Sí, guárdala": crea la comunidad REAL en el histórico desde el primer contacto
 *  (una comunidad que pregunta hoy y vuelve en 18 meses no se puede perder), la
 *  enlaza a una oportunidad y deja el puntero en el puente. La comunidad puede ir
 *  con admin o SIN él (caso minoritario pero real: comunidad pequeña autogestionada). */
export async function confirmarComunidadNueva(fd: FormData) {
  const interaccionId = txt(fd, "interaccion_id")!;
  const comercialId = txt(fd, "comercial_id");
  // el sujeto es un PUESTO: la persona en su administracion
  const puestoId = txt(fd, "puesto_id");
  const empresaId = txt(fd, "empresa_id");
  const eventoId = txt(fd, "evento_id")!;

  const it = await eventoDatos(eventoId);
  const nombre = (it.sujeto_nombre as string) || (it.direccion as string) || "Comunidad nueva";

  // Crear la comunidad en el histórico (queda guardada desde la 1ª llamada, firme o no).
  // Quien la administra ya NO es una columna de aqui: va aparte, en su vinculo,
  // porque es una relacion con fecha e historia.
  const cr = await api("comunidades", "POST", {
    nombre,
    direccion: (it.direccion as string) || null,
  }, "return=representation");
  const [com] = (await cr.json()) as { id: string }[];
  if (!com?.id) { await cerrarEvento(eventoId); return volver(interaccionId, comercialId); }

  // El vinculo con su administracion, si se sabe. Puede no saberse: una
  // comunidad pequena autogestionada no tiene, y eso es correcto.
  if (puestoId || empresaId) {
    await api("comunidad_admin_responsable", "POST", {
      comunidad_id: com.id,
      puesto_id: puestoId,
      empresa_id: empresaId,
      vigente: true,
    });
  }

  const r = await api("oportunidades", "POST", {
    comercial_id: comercialId, puesto_id: puestoId, comunidad_id: com.id,
    tipo_origen: puestoId ? "administrador_conocido" : "otro", estado: "activa", origen_notas: notasDe(it),
  }, "return=representation");
  const [op] = (await r.json()) as { id: string }[];

  await api("interaccion_comunidad", "POST", { interaccion_id: interaccionId, comunidad_id: com.id, origen: "humano" }, "resolution=ignore-duplicates");
  // Un solo evento que ata comunidad + oportunidad (para deshacer ambas si "esa no era").
  await registrar(interaccionId, "comunidad_creada", "comunidades", com.id, { ...it, comunidad_id: com.id, oportunidad_id: op?.id ?? null, resolucion: "confirmada_humano" });
  await promoverDeseos(interaccionId, com.id, (it.sujeto_nombre as string) ?? null); // la parte técnica ya tiene casa
  await cerrarEvento(eventoId);
  volver(interaccionId, comercialId);
}

/** Desambiguar: enlaza el item a una comunidad EXISTENTE (o anota si ya tenía oportunidad activa). */
export async function vincularAComunidad(fd: FormData) {
  const interaccionId = txt(fd, "interaccion_id")!;
  const comercialId = txt(fd, "comercial_id");
  const puestoId = txt(fd, "puesto_id");
  const eventoId = txt(fd, "evento_id")!;
  const comunidadId = txt(fd, "comunidad_id");
  if (!comunidadId) return; // sin comunidad elegida no hay nada que enlazar

  const it = await eventoDatos(eventoId);

  // Dedup: si la comunidad ya tiene oportunidad activa, anotar; si no, crear enlazada.
  const yaR = await api(`oportunidades?select=id&comunidad_id=eq.${comunidadId}&estado=eq.activa&limit=1`, "GET");
  const [ya] = (await yaR.json()) as { id: string }[];

  if (ya?.id) {
    await registrar(interaccionId, "oportunidad_anotada", "oportunidades", ya.id, { ...it, resolucion: "vinculada_humano" });
  } else {
    const r = await api("oportunidades", "POST", {
      comercial_id: comercialId,
      puesto_id: puestoId,
      comunidad_id: comunidadId,
      tipo_origen: puestoId ? "administrador_conocido" : "otro",
      estado: "activa",
      origen_notas: notasDe(it),
    }, "return=representation");
    const [op] = (await r.json()) as { id: string }[];
    if (op?.id) await registrar(interaccionId, "oportunidad_creada", "oportunidades", op.id, { ...it, resolucion: "vinculada_humano" });
  }

  // Puente: esta nota menciona esta comunidad (para su expediente). Idempotente.
  await api("interaccion_comunidad", "POST", { interaccion_id: interaccionId, comunidad_id: comunidadId, origen: "humano" }, "resolution=ignore-duplicates");
  await promoverDeseos(interaccionId, comunidadId, (it.sujeto_nombre as string) ?? null); // la parte técnica ya tiene casa
  await cerrarEvento(eventoId);
  volver(interaccionId, comercialId);
}

/** Botón del pánico: "esa no era". Revierte la acción del evento y la marca deshecha. */
export async function deshacerEvento(fd: FormData) {
  const interaccionId = txt(fd, "interaccion_id")!;
  const comercialId = txt(fd, "comercial_id");
  const eventoId = txt(fd, "evento_id")!;
  const tipo = txt(fd, "evento_tipo") ?? "";
  const tabla = txt(fd, "target_tabla");
  const targetId = txt(fd, "target_id");

  // Revertir lo materializado. Las anotaciones (sin fila propia) solo se marcan.
  if (tipo === "comunidad_creada" && targetId) {
    // Comunidad recién creada por confirmación: deshacer TODO (comunidad + su oportunidad + puente).
    const d = await eventoDatos(eventoId);
    if (d.oportunidad_id) await api(`oportunidades?id=eq.${d.oportunidad_id}`, "DELETE");
    await api(`interaccion_comunidad?interaccion_id=eq.${interaccionId}&comunidad_id=eq.${targetId}`, "DELETE");
    await api(`comunidades?id=eq.${targetId}`, "DELETE");
  } else if (targetId && tabla === "oportunidades" && tipo === "oportunidad_creada") {
    await api(`interaccion_comunidad?interaccion_id=eq.${interaccionId}`, "DELETE"); // puente de esta nota (se rehará si se revincula)
    await api(`oportunidades?id=eq.${targetId}`, "DELETE");
  } else if (targetId && (tabla === "tareas_seguimiento" || tabla === "condicionantes_comunidad")) {
    // Filas auto-creadas por Sali (tarea, deseo/brief técnico): borrar la fila.
    // Ya no hay "contactos": Sali no crea personas por su cuenta, las propone.
    await api(`${tabla}?id=eq.${targetId}`, "DELETE");
  }

  await cerrarEvento(eventoId);
  await registrar(interaccionId, "deshecho_humano", tabla, targetId, { evento_deshecho: eventoId, tipo });
  volver(interaccionId, comercialId);
}

/** Revierte TODO lo que Sali materializó desde esta nota (efecto dominó) y borra su
 *  rastro (bitácora, puente, tareas). NO toca la interacción en sí. Respeta las
 *  anotaciones sobre cosas que YA existían (no borra lo pre-existente). Lo usan
 *  tanto "eliminar entrada" como "editar y reprocesar". */
async function revertirMaterializaciones(interaccionId: string) {
  const r = await api(`bitacora_ia?select=tipo,target_tabla,target_id,datos&operacion=eq.comercial:${interaccionId}`, "GET");
  const eventos = (await r.json()) as { tipo: string; target_tabla: string | null; target_id: string | null; datos: Record<string, unknown> }[];

  for (const e of eventos) {
    if (e.tipo === "comunidad_creada" && e.target_id) {
      if (e.datos?.oportunidad_id) await api(`oportunidades?id=eq.${e.datos.oportunidad_id}`, "DELETE");
      await api(`comunidades?id=eq.${e.target_id}`, "DELETE");
    } else if (e.target_id && (e.tipo.endsWith("_creada") || e.tipo.startsWith("item_")) &&
      (e.target_tabla === "oportunidades" || e.target_tabla === "tareas_seguimiento" || e.target_tabla === "condicionantes_comunidad")) {
      // Solo filas CREADAS por Sali; las anotaciones sobre algo existente no se borran.
      await api(`${e.target_tabla}?id=eq.${e.target_id}`, "DELETE");
    }
  }
  await api(`interaccion_comunidad?interaccion_id=eq.${interaccionId}`, "DELETE"); // puente
  await api(`bitacora_ia?operacion=eq.comercial:${interaccionId}`, "DELETE");
  await api(`tareas_seguimiento?interaccion_id=eq.${interaccionId}`, "DELETE");
}

/** "Eliminar la entrada": borra la nota Y todo lo que generó. Destructivo e
 *  irreversible -> el front confirma antes, listando lo que se deshará. */
export async function eliminarEntrada(fd: FormData) {
  const interaccionId = txt(fd, "interaccion_id")!;
  const comercialId = txt(fd, "comercial_id");

  await revertirMaterializaciones(interaccionId);
  await api(`interacciones?id=eq.${interaccionId}`, "DELETE");

  revalidatePath("/comercial");
  redirect(comercialId ? `/comercial?c=${comercialId}` : "/comercial");
}

/** "Editar la nota": guarda el texto corregido y DECIDE con criterio de Accesalia
 *  (edge transversal `revisar-edicion`, modelo barato) si el cambio es:
 *   - COSMETICO (tilde, ortografia, redaccion) -> solo guarda el texto, NO toca lo
 *     ya procesado (no molesta ni pierde validaciones humanas).
 *   - RELEVANTE (toca entidades, importes -¡un 0!-, tipos, hechos) -> revierte y
 *     Sali relee LIMPIA. */
export async function reprocesarEntrada(fd: FormData) {
  const interaccionId = txt(fd, "interaccion_id")!;
  const comercialId = txt(fd, "comercial_id");
  const nueva = txt(fd, "transcripcion");
  if (!nueva) return; // sin texto no hay nada que procesar

  const suf = comercialId ? `?c=${comercialId}` : "";
  const volverCon = (flag: string) =>
    `/comercial/interaccion/${interaccionId}${suf}${suf ? "&" : "?"}e=${flag}`;

  // Texto anterior (para comparar).
  const prevR = await api(`interacciones?select=transcripcion&id=eq.${interaccionId}&limit=1`, "GET");
  const antes = ((await prevR.json()) as { transcripcion: string | null }[])[0]?.transcripcion ?? "";
  if (nueva.trim() === antes.trim()) {
    redirect(`/comercial/interaccion/${interaccionId}${suf}`);
  }

  // ¿Relevante o cosmetico? (transversal, reutilizable). Ante fallo -> relevante.
  let relevante = true;
  try {
    const dr = await fetch(`${URL_BASE}/functions/v1/revisar-edicion`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" },
      body: JSON.stringify({ antes, despues: nueva }),
    });
    if (dr.ok) relevante = (await dr.json()).relevante !== false;
  } catch (e) {
    console.warn(`revisar-edicion no disparado: ${e}`);
  }

  if (!relevante) {
    // Cosmetico: solo el texto. No se toca nada de lo procesado.
    await api(`interacciones?id=eq.${interaccionId}`, "PATCH", { transcripcion: nueva });
    revalidatePath(`/comercial/interaccion/${interaccionId}`);
    redirect(volverCon("cosmetico"));
  }

  // Relevante: revertir lo anterior, guardar y reprocesar limpio con Sali.
  await revertirMaterializaciones(interaccionId);
  await api(`interacciones?id=eq.${interaccionId}`, "PATCH", {
    transcripcion: nueva,
    extraccion: null, extraccion_estado: "sin_procesar",
    requiere_humano: false, motivo_requiere_humano: null, pendiente_vincular: false,
  });
  try {
    await fetch(`${URL_BASE}/functions/v1/extraer-comercial`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" },
      body: JSON.stringify({ interaccion_id: interaccionId }),
    });
  } catch (e) {
    console.warn(`reprocesar no disparado: ${e}`);
  }
  revalidatePath(`/comercial/interaccion/${interaccionId}`);
  redirect(volverCon("reprocesado"));
}

/** "Todo correcto, hecho": cierra la revisión y vuelve al hub. */
export async function validarRevision(fd: FormData) {
  const interaccionId = txt(fd, "interaccion_id")!;
  const comercialId = txt(fd, "comercial_id");

  await api(`interacciones?id=eq.${interaccionId}`, "PATCH", {
    extraccion_estado: "validada",
    requiere_humano: false,
    pendiente_vincular: false,
  });
  await registrar(interaccionId, "revision_validada", "interacciones", interaccionId, {});

  revalidatePath("/comercial");
  redirect(comercialId ? `/comercial?c=${comercialId}` : "/comercial");
}
