// lib/altaSatelite.ts
//
// EL SATELITE CREA DE VERDAD (Monica, 28-oct-2026: «que si se crea una opp desde
// app o satelite, se cree de verdad, no se mande a pendientes para gestionar
// despues. A pendientes para completar, si hace falta, pero que exista.
// Administrador lo mismo: que se genere de verdad, para que se le puedan colgar
// cosas». Y los contactos: «si, todo se crea de verdad»).
//
// Hasta hoy el satelite dejaba un apunte (apuntes_satelite) y se completaba en la
// oficina. Ahora:
//   · la OPORTUNIDAD nace con su codigo, su comercial (quien la crea), el nombre
//     de la direccion escrita, la nota en su diario y el contacto en la agenda.
//     Si se eligio una direccion que ya tenemos, nace con sus portales; si no,
//     queda en «Opps que necesitan confirmar la dirección del Catastro».
//   · el ADMINISTRADOR nace captado y llevado por quien lo crea, sin consolidar.
//   · el CONTACTO (vecino, contratista, otro) nace en la agenda; el vecino de una
//     opp con comunidad, colgado de su comunidad.
//
// EL MOVIL REENVIA si se corta la cobertura: todo nace con ids sacados del id de
// la nota, y lo que ya existe no se vuelve a crear.

import "server-only";
import { createHash } from "node:crypto";
import { comercialDe, type Yo } from "./sesion";
import { crearOportunidadDesdeMovil } from "./oportunidadMovil";
import { crearAdminDesdeMovil } from "./adminMovil";
import { enlazarClaveExistente } from "./altaOportunidad";
import { crearEntrada } from "./entradaDiario";
import { recalcularLuego } from "./estadoOportunidad";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}
async function escribir(metodo: "POST" | "PATCH", path: string, cuerpo: unknown): Promise<void> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...CAB, Prefer: "return=minimal" },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
}

/** Un id fijo para cada cosa que nace de una nota: el mismo en cada reenvio. */
export function idDe(notaId: string, que: string): string {
  const h = createHash("sha1").update(`${notaId}:${que}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** Quien la escribe: en el satelite, la sesion; al pasar apuntes viejos, su autor. */
export type Autor = { id: string; nombre: string };

type Nota = { notaId: string; texto: string; canal: string; fecha: string; fotos: string[] };

// ------------------------------------------------------------------ personas

/** Una persona nueva con su puesto, con ids fijos. Si ya existe, es esa. */
async function personaConPuesto(
  notaId: string,
  d: {
    nombre: string;
    telefono: string | null;
    correo: string | null;
    cargo: string | null;
    comunidadId: string | null;
    comercialId: string | null;
  },
): Promise<string> {
  const personaId = idDe(notaId, "persona");
  const puestoId = idDe(notaId, "puesto");
  const [ya] = await leer<{ id: string }[]>(`puesto?select=id&id=eq.${puestoId}&limit=1`);
  if (ya) return puestoId;
  const [p] = await leer<{ id: string }[]>(`persona?select=id&id=eq.${personaId}&limit=1`);
  if (!p) await escribir("POST", "persona", { id: personaId, nombre: d.nombre.trim(), activa: true });
  if (d.comunidadId) {
    // De la comunidad (vecino, presidente...): cuelga de su figura legal.
    const [fig] = await leer<{ id_comodin: string }[]>(`figura_legal_propietaria?select=id_comodin&id_comodin=eq.${d.comunidadId}`);
    if (!fig) await escribir("POST", "figura_legal_propietaria", { id_comodin: d.comunidadId, figura: "Comunidad de Propietarios" });
  }
  await escribir("POST", "puesto", {
    id: puestoId,
    persona_id: personaId,
    figura_legal_propietaria_id: d.comunidadId,
    cargo: d.cargo,
    telefono_empresa: d.telefono?.trim() || null,
    comercial_captador_id: d.comunidadId ? null : d.comercialId,
    desde: hoy(),
  });
  if (d.correo?.trim()) await escribir("POST", "correo", { puesto_id: puestoId, email: d.correo.trim(), etiqueta: "general", principal: true });
  return puestoId;
}

async function nota(autor: Autor, n: Nota, oportunidadId: string | null, persona: string | null) {
  if (!n.texto.trim()) return;
  await crearEntrada({
    id: n.notaId,
    texto: n.texto,
    canal: n.canal,
    fecha: n.fecha,
    oportunidadId,
    persona,
    dondeTexto: null,
    autorId: autor.id,
    autorNombre: autor.nombre,
    fotos: n.fotos,
  });
}

// ------------------------------------------------------------- oportunidad

export type OppSatelite = Nota & {
  direccion: string;
  claveId: string | null;
  /** "puesto:<id>" si se eligio de la agenda. */
  contacto: string | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  contactoCorreo: string | null;
  tipos: string[];
  paso: string | null;
};

export async function oppDesdeSatelite(autor: Autor, d: OppSatelite): Promise<string> {
  const oppId = idDe(d.notaId, "opp");
  const deLaAgenda = d.contacto?.startsWith("puesto:") ? d.contacto : null;
  await crearOportunidadDesdeMovil({ id: autor.id } as Yo, {
    id: oppId,
    direccion: d.direccion,
    fecha: d.fecha,
    administrador: null,
    contacto: deLaAgenda,
    contactoNombre: null,
    contactoTelefono: null,
    tipos: d.tipos,
    // Todo nace en el primer contacto, como en el alta (paso obligatorio alli).
    paso: d.paso || "primer_contacto",
  });

  // El contacto escrito, a la agenda de verdad, y como contacto de la opp.
  let persona = deLaAgenda;
  if (!deLaAgenda && d.contactoNombre?.trim()) {
    const mio = await comercialDe(autor.id);
    const puestoId = await personaConPuesto(d.notaId, {
      nombre: d.contactoNombre,
      telefono: d.contactoTelefono,
      correo: d.contactoCorreo,
      cargo: null,
      comunidadId: null,
      comercialId: mio?.id ?? null,
    });
    await escribir("PATCH", `oportunidades?id=eq.${oppId}`, { puesto_id: puestoId });
    persona = "puesto:" + puestoId;
  }

  // Una direccion que ya tenemos: nace con sus portales, sin pasar por Catastro.
  if (d.claveId) await enlazarClaveExistente(oppId, d.claveId, autor.id);

  await nota(autor, d, oppId, persona);
  recalcularLuego(oppId);
  return oppId;
}

// ----------------------------------------------------------- administrador

export type AdminSatelite = Nota & { nombre: string; telefono: string | null; correo: string | null; oportunidadId: string | null };

export async function adminDesdeSatelite(autor: Autor, d: AdminSatelite): Promise<string> {
  const puestoId = await crearAdminDesdeMovil({ id: autor.id } as Yo, {
    personaId: idDe(d.notaId, "persona"),
    puestoId: idDe(d.notaId, "puesto"),
    nombre: d.nombre,
    telefono: d.telefono,
    correo: d.correo,
  });
  await nota(autor, d, d.oportunidadId, "puesto:" + puestoId);
  return puestoId;
}

// ---------------------------------------------------------------- contacto

export type ContactoSatelite = Nota & {
  nombre: string;
  telefono: string | null;
  correo: string | null;
  /** Lo que es, en palabras: «Vecino», «Contratista» o lo que se escribio. */
  cargo: string;
  esVecino: boolean;
  oportunidadId: string | null;
};

export async function contactoDesdeSatelite(autor: Autor, d: ContactoSatelite): Promise<string> {
  // El vecino de una opp con comunidad cuelga de esa comunidad; si no, suelto.
  let comunidadId: string | null = null;
  if (d.esVecino && d.oportunidadId) {
    const [o] = await leer<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${d.oportunidadId}&limit=1`);
    comunidadId = o?.comunidad_id ?? null;
  }
  const mio = await comercialDe(autor.id);
  const puestoId = await personaConPuesto(d.notaId, {
    nombre: d.nombre,
    telefono: d.telefono,
    correo: d.correo,
    cargo: d.cargo,
    comunidadId,
    comercialId: mio?.id ?? null,
  });
  await nota(autor, d, d.oportunidadId, "puesto:" + puestoId);
  return puestoId;
}
