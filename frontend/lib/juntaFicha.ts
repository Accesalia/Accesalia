// lib/juntaFicha.ts
//
// LA JUNTA DESDE LA FICHA COMERCIAL (Monica, 27-oct-2026): agendar su fecha en una ventanita, sin abrir la agenda
// («dia, hora, lugar y opp, al menos; te avise si hay conflicto de horas y si das a ok lo guarde en agenda, SIN
// ENSEÑARTE LA AGENDA, todo aqui»), y marcar si nos piden ir. La cita va a la agenda del comercial de la opp, de tipo
// «junta»; la fecha se apunta tambien en la junta de la opp (la ultima sin celebrar, o una nueva).

import "server-only";
import { citasEntre, crearCita } from "./citas";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
async function pedir<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...CAB, ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 ? null : await r.json()) as T;
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);
const MINUTOS_JUNTA = 90;

/** Las citas de esa agenda que se pisan con la junta (dia y hora en Madrid, 90 minutos). */
export async function choquesJunta(agenda: string, dia: string, hora: string): Promise<{ asunto: string; desde: string; hasta: string }[]> {
  if (!uuid(agenda) || !/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) return [];
  const aMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const ini = aMin(hora);
  const fin = ini + MINUTOS_JUNTA;
  const hhmm = (iso: string) => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid" }).format(new Date(iso));
  return (await citasEntre(dia, dia, agenda))
    .filter((c) => c.estado !== "anulada")
    .map((c) => ({ asunto: c.asunto, desde: hhmm(c.inicio), hasta: hhmm(c.fin) }))
    .filter((c) => aMin(c.desde) < fin && aMin(c.hasta) > ini);
}

/** La junta de la opp que se toca: la ultima sin celebrar; si no hay, se crea. */
async function juntaAbierta(oppId: string): Promise<string> {
  const [j] = await pedir<{ id: string }[]>(`juntas?select=id&oportunidad_id=eq.${oppId}&or=(celebrada.is.null,celebrada.is.false)&order=creado_en.desc&limit=1`);
  if (j) return j.id;
  const [n] = await pedir<{ id: string }[]>("juntas?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ oportunidad_id: oppId, celebrada: false, resultado: "pendiente" }),
  });
  return n.id;
}

export async function agendarJunta(
  oppId: string,
  d: { agenda: string; dia: string; hora: string; lugar: string; nombreOpp: string },
  quien: string,
): Promise<void> {
  if (!uuid(oppId) || !uuid(d.agenda)) throw new Error("Falta de quién es la agenda.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dia)) throw new Error("Falta el día.");
  if (!/^\d{2}:\d{2}$/.test(d.hora)) throw new Error("Falta la hora.");
  if (!d.lugar.trim()) throw new Error("Falta el lugar.");
  await crearCita(
    {
      local: `${d.dia}T${d.hora}`,
      minutos: MINUTOS_JUNTA,
      tipo: "junta",
      asunto: `Junta: ${d.nombreOpp}`,
      paraQue: "Junta de la comunidad",
      direccion: d.lugar.trim(),
      conQuien: [{ tipo: "a_mano", nombre: "La comunidad", papel: "junta" }],
      deQuien: d.agenda,
      oportunidadId: oppId,
    },
    quien,
  );
  const id = await juntaAbierta(oppId);
  await pedir(`juntas?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ fecha_junta: d.dia }) });
}

export async function marcarNosPidenIr(oppId: string, valor: boolean | null): Promise<void> {
  if (!uuid(oppId)) throw new Error("Oportunidad no válida.");
  const id = await juntaAbierta(oppId);
  await pedir(`juntas?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ nos_piden_ir: valor }) }).catch((e: Error) => {
    if (/nos_piden_ir/.test(e.message)) throw new Error("Falta pasar la migración de «¿nos piden ir?» (20261027120000).");
    throw e;
  });
}
