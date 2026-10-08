// lib/completa.ts
//
// ¿ESTA COMPLETA LA OPORTUNIDAD? (Monica, 8-oct-2026)
//
// Completa = DIRECCION (sus portales confirmados; "una cosa es direccion y
// otra es comunidad") + CONTACTO + SIGUIENTE PASO. "Si no sabes donde, ni que
// hacer, ni a quien llamar, no puedes hacer nada." El administrador es dato de
// la opp pero NO cuenta: a veces el comercial de Schindler pide precio de una
// direccion y no se sabe mas.
//
// A QUIEN SE LE MIRA: "avanzar de hito exige tener el dato". La que ya esta por
// delante en el camino -tiene una hoja enviada o firmada- no se revisa. Y solo
// las abiertas en 2025 o despues: las de 2022-24 tienen sus hojas en Drive sin
// volcar, y darian pendientes falsos.
//
// QUE SE BLOQUEA mientras falte algo: lo que va HACIA FUERA (viabilidad, hoja,
// presupuesto). Nunca lo que llega desde fuera -notas, Polycam-: "son fuentes
// de datos, no las vamos a limitar".

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** Desde cuando se mira (Monica: "consideremos solo 25 y 26"). */
export const DESDE = "2025-01-01";

export type Falta = "direccion" | "contacto" | "paso";
export const TEXTO_FALTA: Record<Falta, string> = {
  direccion: "confirmar la dirección",
  contacto: "el contacto",
  paso: "el siguiente paso",
};

export type Completitud = { aplica: boolean; falta: Falta[] };

export async function completitud(oppId: string): Promise<Completitud> {
  const [ops, accesos, hojas] = await Promise.all([
    leer<{ fecha_apertura: string | null; creado_en: string; puesto_id: string | null; persona_comunidad_id: string | null;
           contacto_provisional: string | null; siguiente_paso: string | null }[]>(
      `oportunidades?select=fecha_apertura,creado_en,puesto_id,persona_comunidad_id,contacto_provisional,siguiente_paso&id=eq.${oppId}&limit=1`,
    ),
    leer<{ opp_id: string }[]>(`relacion_oportunidad_accesos?select=opp_id&opp_id=eq.${oppId}&hasta=is.null&limit=1`),
    leer<{ id: string }[]>(`hojas_encargo?select=id&oportunidad_id=eq.${oppId}&estado=in.(enviada_comunidad,devuelta_firmada)&limit=1`),
  ]);
  const o = ops[0];
  if (!o) return { aplica: false, falta: [] };
  const desde = o.fecha_apertura ?? o.creado_en.slice(0, 10);
  const aplica = desde >= DESDE && hojas.length === 0;
  if (!aplica) return { aplica: false, falta: [] };
  const falta: Falta[] = [];
  if (!accesos.length) falta.push("direccion");
  if (!o.puesto_id && !o.persona_comunidad_id && !o.contacto_provisional) falta.push("contacto");
  if (!o.siguiente_paso) falta.push("paso");
  return { aplica, falta };
}

/** Para las acciones que mandan algo HACIA FUERA: si falta algo, no se hace. */
export async function exigirCompleta(oppId: string, que: string): Promise<void> {
  const c = await completitud(oppId);
  if (c.falta.length) {
    throw new Error(`Antes de ${que}, completa la oportunidad: falta ${c.falta.map((f) => TEXTO_FALTA[f]).join(", ")}.`);
  }
}

export type DatosCompletar = {
  /** "puesto:<id>" o "pc:<id>" de la lista, o vacio si es un contacto escrito. */
  contacto: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  siguientePaso: string | null;
  /** "puesto:<id>" del administrador, o vacio. */
  administrador: string | null;
};

/** Guardar lo que se completa desde la ficha. Solo se escribe lo que viene: lo
 *  que se deja en blanco no borra lo que ya habia. El contacto es de verdad (de
 *  la lista) O provisional (escrito), nunca los dos: lo exige la base. */
export async function guardarCompletar(oppId: string, d: DatosCompletar): Promise<void> {
  const cambio: Record<string, unknown> = {};
  const [lista, id] = (d.contacto ?? "").split(":");
  if (lista === "puesto" || lista === "pc") {
    Object.assign(cambio, {
      puesto_id: lista === "puesto" ? id : null,
      persona_comunidad_id: lista === "pc" ? id : null,
      contacto_provisional: null,
      telefono_provisional: null,
      correo_provisional: null,
    });
  } else if (d.contactoNombre?.trim()) {
    Object.assign(cambio, {
      puesto_id: null,
      persona_comunidad_id: null,
      contacto_provisional: d.contactoNombre.trim(),
      telefono_provisional: d.contactoTelefono?.trim() || null,
    });
  }
  if (d.siguientePaso && ["primer_contacto", "visita", "envio_documentos"].includes(d.siguientePaso)) {
    cambio.siguiente_paso = d.siguientePaso;
  }
  const [la, ida] = (d.administrador ?? "").split(":");
  if (la === "puesto" && ida) cambio.administrador_puesto_id = ida;
  if (!Object.keys(cambio).length) return;

  const r = await fetch(`${URL_BASE}/rest/v1/oportunidades?id=eq.${oppId}`, {
    method: "PATCH",
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(cambio),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
}
