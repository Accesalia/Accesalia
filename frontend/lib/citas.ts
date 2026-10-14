// lib/citas.ts
//
// LA AGENDA DE LA APP: SUS CITAS (Monica, 14-oct-2026). Tabla `citas`, con su tipo
// (catalogo `tipos_cita`), su hora y su duracion. La agenda de la app manda; a
// Google se copiara solo la cita y un enlace (decidido el 9-oct).
//
// La primera: la VISITA DE ESCANEO con Polycam. La cierra el comercial, con
// fecha Y HORA. Una por opp: si se cambia, se sobrescribe, sin historial. Si nunca
// se apunta, no pasa nada: la fecha del escaneo sera la del Polycam que llegue al
// buzon.

import "server-only";
import { nombreDeOpp } from "./direccionOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (r.status === 204 || r.headers.get("content-length") === "0" ? null : await r.json()) as T;
}

export type Cita = { id: string; tipo: string; oportunidadId: string | null; inicio: string; minutos: number; asunto: string; deQuien: string | null };

/** "2026-10-20T10:30", la hora de Madrid que se elige en pantalla -> el instante
 *  exacto (con su desfase de verano o invierno). */
export function deHoraMadrid(local: string): string {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error("Fecha y hora no válidas.");
  const [, a, mes, d, h, min] = m.map(Number);
  const comoUtc = Date.UTC(a, mes - 1, d, h, min);
  // Cuanto adelanta Madrid a UTC en un instante.
  const desfase = (t: number) => {
    const partes = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date(t));
    const p = (x: string) => Number(partes.find((y) => y.type === x)?.value);
    return Date.UTC(p("year"), p("month") - 1, p("day"), p("hour") % 24, p("minute")) - t;
  };
  // Dos pasadas: el desfase se mira en el instante bueno, no en el de partida
  // (si no, la noche del cambio de hora sale una hora movida).
  const primera = comoUtc - desfase(comoUtc);
  return new Date(comoUtc - desfase(primera)).toISOString();
}

/** El instante -> "2026-10-20T10:30" en hora de Madrid, para la casilla. */
export function aHoraMadrid(iso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour") === "24" ? "00" : p("hour")}:${p("minute")}`;
}

type Fila = { id: string; tipo: string; oportunidad_id: string | null; inicio: string; minutos: number; asunto: string; de_quien: string | null };
const aCita = (f: Fila): Cita => ({ id: f.id, tipo: f.tipo, oportunidadId: f.oportunidad_id, inicio: f.inicio, minutos: f.minutos, asunto: f.asunto, deQuien: f.de_quien });
const SEL = "id,tipo,oportunidad_id,inicio,minutos,asunto,de_quien";

/** La visita de escaneo de una opp, si se apunto. */
export async function escaneoDe(oppId: string): Promise<Cita | null> {
  const [f] = await pedir<Fila[]>(`citas?select=${SEL}&tipo=eq.escaneo_polycam&oportunidad_id=eq.${oppId}`);
  return f ? aCita(f) : null;
}

/** Apunta (o mueve) la visita de escaneo de una opp. `local` es la fecha y hora
 *  de Madrid elegida en pantalla. Sale en la agenda de su comercial, o en la de
 *  quien la apunta si la opp no tiene. */
export async function guardarEscaneo(oppId: string, local: string, quien: string): Promise<Cita> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) throw new Error("Oportunidad no válida.");
  const inicio = deHoraMadrid(local);
  const [opp] = await pedir<{ codigo: string | null; nombre: string | null; comercial: { equipo_id: string | null } | null }[]>(
    `oportunidades?select=codigo,nombre,comercial:comercial_id(equipo_id)&id=eq.${oppId}`,
  );
  if (!opp) throw new Error("No existe esa oportunidad.");
  const ya = await escaneoDe(oppId);
  if (ya) {
    const [f] = await pedir<Fila[]>(`citas?id=eq.${ya.id}&select=${SEL}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ inicio, apuntada_por: quien, actualizado_en: new Date().toISOString() }),
    });
    return aCita(f);
  }
  const [tipo] = await pedir<{ minutos_defecto: number }[]>("tipos_cita?select=minutos_defecto&clave=eq.escaneo_polycam");
  const [f] = await pedir<Fila[]>(`citas?select=${SEL}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      tipo: "escaneo_polycam",
      oportunidad_id: oppId,
      inicio,
      minutos: tipo?.minutos_defecto ?? 90,
      asunto: `Escaneo Polycam · ${nombreDeOpp(opp)}`,
      de_quien: opp.comercial?.equipo_id ?? quien,
      apuntada_por: quien,
    }),
  });
  return aCita(f);
}
