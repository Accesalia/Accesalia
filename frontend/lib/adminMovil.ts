// lib/adminMovil.ts
//
// UN ADMINISTRADOR NUEVO DESDE EL MOVIL (Monica, 13-oct-2026): "a veces no
// quieren crear una opp sino un nuevo admin: puerta fria, crean contacto, pero
// aun no administracion". En el satelite, "+ Crear nuevo adm" pide solo nombre,
// telefono, correo y la nota. Obligatorios: la nota, el nombre y al menos uno de
// telefono o correo.
//
// Se crea igual que en el alta de oportunidad: una PERSONA con su PUESTO de
// administrador, todavia SIN administracion (empresa): "puede existir un admin
// del que todavia no sepamos de que administracion es". El telefono y el correo
// van al PUESTO, no a la persona: son de su trabajo. La nota va a las notas de
// ese administrador.
//
// NO ES DE NADIE TODAVIA (13-oct-2026): "un admin solo ES de un comercial tras
// la primera hoja firmada". Queda como POSIBLE de quien lo crea.
//
// Aqui si se crea la persona, porque lo ha pedido quien la conoce, a proposito.
// Lo que no se hace nunca es crearla sola cuando un nombre no aparece.
//
// El movil le da los ids: si reenvia porque se corto la cobertura, no se crea
// dos veces.

import "server-only";
import type { Yo } from "./sesion";
import { comercialDe } from "./sesion";
import { CARGO_DE } from "./oportunidadVocabulario";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function pedir(metodo: "GET" | "POST", path: string, cuerpo?: unknown) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return metodo === "GET" ? r.json() : null;
}

export type AdminDesdeMovil = {
  personaId: string;
  puestoId: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
};

const uuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

/** Crea la persona y su puesto de administrador (si no existen ya con esos
 *  ids) y devuelve el id del puesto, que es de donde cuelga la nota. */
export async function crearAdminDesdeMovil(yo: Yo, d: AdminDesdeMovil): Promise<string> {
  if (!uuid(d.personaId) || !uuid(d.puestoId)) throw new Error("El administrador nuevo llega sin ids válidos.");
  const nombre = d.nombre.trim();
  const telefono = d.telefono?.trim() || null;
  const correo = d.correo?.trim() || null;
  if (!nombre) throw new Error("Falta el nombre del administrador.");
  if (!telefono && !correo) throw new Error("Falta el teléfono o el correo del administrador: al menos uno.");

  // ¿Ya se creo en un envio anterior que se corto? Entonces es ese.
  const ya = (await pedir("GET", `puesto?select=id&id=eq.${d.puestoId}&limit=1`)) as { id: string }[];
  if (ya.length) return d.puestoId;

  const mio = await comercialDe(yo.id);
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

  const persona = (await pedir("GET", `persona?select=id&id=eq.${d.personaId}&limit=1`)) as { id: string }[];
  if (!persona.length) await pedir("POST", "persona", { id: d.personaId, nombre, activa: true });

  await pedir("POST", "puesto", {
    id: d.puestoId,
    persona_id: d.personaId,
    empresa_id: null,
    contrata_id: null,
    cargo: CARGO_DE.administrador ?? "Administrador",
    telefono_empresa: telefono,
    // NO entra en su cartera: es un POSIBLE suyo hasta la primera hoja firmada
    // (Monica, 13-oct-2026). La base lo consolida al firmar.
    comercial_id: null,
    comercial_captador_id: mio?.id ?? null,
    desde: hoy,
  });
  if (correo) await pedir("POST", "correo", { puesto_id: d.puestoId, email: correo, etiqueta: "general", principal: true });
  return d.puestoId;
}
