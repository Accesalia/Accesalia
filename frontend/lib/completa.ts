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
import { comunidadesDeOpp, ponerAdministrador } from "./adminComunidad";

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
    leer<{ fecha_apertura: string | null; creado_en: string; puesto_id: string | null;
           contacto_provisional: string | null; siguiente_paso: string | null }[]>(
      `oportunidades?select=fecha_apertura,creado_en,puesto_id,contacto_provisional,siguiente_paso&id=eq.${oppId}&limit=1`,
    ),
    leer<{ opp_id: string }[]>(`relacion_oportunidad_accesos?select=opp_id&opp_id=eq.${oppId}&hasta=is.null&limit=1`),
    // Con una hoja ya enviada (o firmada) no se revisa: ya esta en marcha (sistema nuevo, 25-oct-2026).
    leer<{ id: string }[]>(`he_estados_hoja?select=id,v:version_id!inner(oportunidad_id)&v.oportunidad_id=eq.${oppId}&estado=in.(enviada,firmada_recibida)&limit=1`),
  ]);
  const o = ops[0];
  if (!o) return { aplica: false, falta: [] };
  const desde = o.fecha_apertura ?? o.creado_en.slice(0, 10);
  const aplica = desde >= DESDE && hojas.length === 0;
  if (!aplica) return { aplica: false, falta: [] };
  const falta: Falta[] = [];
  if (!accesos.length) falta.push("direccion");
  if (!o.puesto_id && !o.contacto_provisional) falta.push("contacto");
  if (!o.siguiente_paso) falta.push("paso");
  return { aplica, falta };
}

/** Para las acciones que mandan algo HACIA FUERA: si falta algo, no se hace. */
export async function exigirCompleta(oppId: string, que: string): Promise<void> {
  // SOLO LA DIRECCION (Monica, 28-oct-2026): sin contacto ni siguiente paso se
  // puede generar igual, «porque igual te dicen "traemela y te lo presento en
  // la oficina"; mejor tener mas libertad».
  const falta = (await completitud(oppId)).falta.filter((f) => f === "direccion");
  if (falta.length) {
    throw new Error(`Antes de ${que}, completa la oportunidad: falta ${falta.map((f) => TEXTO_FALTA[f]).join(", ")}.`);
  }
}

export type DatosCompletar = {
  /** "puesto:<id>" de la lista, o vacio si es un contacto escrito. */
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
  if (lista === "puesto") {
    Object.assign(cambio, {
      puesto_id: id,
      contacto_provisional: null,
      telefono_provisional: null,
      correo_provisional: null,
    });
  } else if (d.contactoNombre?.trim()) {
    Object.assign(cambio, {
      puesto_id: null,
      contacto_provisional: d.contactoNombre.trim(),
      telefono_provisional: d.contactoTelefono?.trim() || null,
    });
  }
  if (d.siguientePaso && ["primer_contacto", "visita", "envio_documentos"].includes(d.siguientePaso)) {
    cambio.siguiente_paso = d.siguientePaso;
  }
  if (Object.keys(cambio).length) {
    const r = await fetch(`${URL_BASE}/rest/v1/oportunidades?id=eq.${oppId}`, {
      method: "PATCH",
      headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(cambio),
    });
    if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  }

  const [la, ida] = (d.administrador ?? "").split(":");
  if (la === "puesto" && ida) {
    // Ya no se guarda en la opp: solo en sus comunidades (18-oct-2026).
    // EL ADMINISTRADOR ES DE LA COMUNIDAD (Monica, 18-oct-2026): va tambien a las
    // comunidades de la opp (por sus accesos) que no tienen administrador. Las que
    // ya tienen otro no se tocan: eso se decide en el alta, con su aviso. Va lo
    // ultimo, para que si no se puede, lo diga sin perder lo demas.
    await adminACadaComunidad(oppId, ida);
  }
}

/** EL ADMINISTRADOR DE LA OPP, A SU COMUNIDAD (Monica, 8-oct-2026): si la
 *  oportunidad tiene administrador y su comunidad no tiene administracion
 *  responsable, se PROPONE ponerle esa. No se pone sola: lo decide quien mira. */
export async function propuestaAdminComunidad(
  _oppId: string,
): Promise<{ comunidadId: string; puestoId: string; empresaId: string | null; quien: string } | null> {
  // RETIRADA (18-oct-2026): el administrador ya no se guarda en la opp, asi que no
  // hay nada que proponer pasar a la comunidad. El alta y «Completar» lo ponen
  // directamente en la comunidad (lib/adminComunidad.ts). Se deja la firma para
  // no tocar la ficha de la opp; la columna oportunidades.administrador_puesto_id
  // se retira (zz_muerta_).
  return null;
}

/** Aceptar la propuesta: la administracion de la comunidad pasa a ser esta. */
export async function ponerAdminEnComunidad(oppId: string): Promise<void> {
  const p = await propuestaAdminComunidad(oppId);
  if (!p) return;
  const r = await fetch(`${URL_BASE}/rest/v1/comunidad_admin_responsable`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      comunidad_id: p.comunidadId,
      puesto_id: p.puestoId,
      empresa_id: p.empresaId,
      vigente: true,
      desde: new Date().toISOString().slice(0, 10),
      notas: "Puesta desde la ficha de la oportunidad: era su administrador (8-oct-2026).",
    }),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
}


/** El administrador (por su puesto) a las comunidades de la opp que no tienen
 *  (18-oct-2026), o que solo tienen la administracion sin persona (28-oct-2026).
 *  Si no ha podido ponerlo en ninguna, lo DICE: antes callaba y parecia que no
 *  guardaba (Monica, 28-oct-2026, Calderon de la Barca 12). */
async function adminACadaComunidad(oppId: string, puestoId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(puestoId)) return;
  const [p] = await leer<{ persona_id: string | null }[]>(`puesto?select=persona_id&id=eq.${puestoId}&limit=1`);
  if (!p?.persona_id) throw new Error("Esa persona no tiene puesto vigente.");
  const comunidades = await comunidadesDeOpp(oppId);
  if (!comunidades.length) throw new Error("La opp no tiene comunidad (sus portales no son de ninguna): no hay dónde poner el administrador.");
  const otros: string[] = [];
  let puestos = 0;
  for (const c of comunidades) {
    if (c.admin?.personaId) {
      if (c.admin.personaId !== p.persona_id) otros.push(c.admin.nombre);
      continue;
    }
    const r = await ponerAdministrador(c.id, p.persona_id, { cambia: false, puestoId, nota: "Puesto desde «Completar» en la ficha de la oportunidad (18-oct-2026)." });
    if (r === "puesto" || r === "igual") puestos++;
    else if (r === "se_queda" && c.admin) otros.push(c.admin.nombre);
  }
  if (!puestos && otros.length)
    throw new Error(`Su comunidad ya tiene administrador (${otros.join(", ")}). Para cambiarlo, desde la cabecera de la opp, en «Administración».`);
}
