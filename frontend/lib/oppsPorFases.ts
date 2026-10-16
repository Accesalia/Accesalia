// lib/oppsPorFases.ts
//
// "OPPS POR FASES" (Monica, 15-oct-2026): TODAS las opps abiertas, con o sin
// alerta, como un indice: fase > copy > opps. El paso de cada opp sale de
// estado_oportunidad (la escalera de copys, la unica verdad); aqui solo se le
// suma lo que se ve en cada linea:
//   nombre (con municipio) · dias en esta fase · ultimo contacto · administrador
// y la posicion, para el mapa de al lado.

import "server-only";
import { nombreDeOpp } from "./direccionOpp";
import type { Clave, Fase } from "./pasosEscalera";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${d}-${d + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const x = (await r.json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}
const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const aDia = (v: string) => (v.length <= 10 ? v : new Date(v).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));
const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export type FilaFase = {
  id: string;
  nombre: string;
  clave: Clave;
  fase: Fase;
  /** Dias en el paso actual (0 si la fecha es futura: una junta por celebrar). */
  dias: number;
  /** El ultimo contacto grabado (diario, llamadas). */
  contacto: string | null;
  /** "Persona · EMPRESA" y su telefono; null = falta completar. */
  admin: { quien: string; telefono: string | null } | null;
  lat: number | null;
  lng: number | null;
};

/** Una fila de la vista opps_por_fases (migracion 20261016100000): la opp ya
 *  cruzada en la base con su paso, su ultimo contacto, su administrador y su
 *  posicion (16-oct-2026: antes eran ~30 peticiones bajandose todo el diario). */
type Cruda = {
  id: string;
  nombre: string | null;
  codigo: string | null;
  clave: Clave;
  fase: Fase;
  desde: string;
  ultimo_contacto: string | null;
  admin_empresa: string | null;
  admin_persona: string | null;
  admin_telefono: string | null;
  municipio: string | null;
  lat: number | null;
  lng: number | null;
};

/** Las opps abiertas de un comercial (o de todos: null), con su paso guardado. */
export async function oppsPorFases(comercialId: string | null): Promise<FilaFase[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const ops = await leer<Cruda>(
    "opps_por_fases?select=id,nombre,codigo,clave,fase,desde,ultimo_contacto,admin_empresa,admin_persona,admin_telefono,municipio,lat,lng" +
      `${f}&order=id`,
  );
  const hoy = hoyISO();
  return ops.map((o) => {
    // EL NOMBRE, SIEMPRE CON MUNICIPIO.
    let nombre = nombreDeOpp(o);
    const muni = o.municipio;
    if (muni && !limpio(nombre).includes(limpio(muni))) nombre = `${nombre}, ${muni.charAt(0) + muni.slice(1).toLowerCase()}`;
    const quien = [o.admin_persona, o.admin_empresa].filter(Boolean).join(" · ");
    const desde = aDia(o.desde);
    return {
      id: o.id,
      nombre,
      clave: o.clave,
      fase: o.fase,
      dias: desde <= hoy ? Math.round((Date.parse(hoy) - Date.parse(desde)) / 86_400_000) : 0,
      contacto: o.ultimo_contacto,
      admin: quien ? { quien, telefono: o.admin_telefono } : null,
      lat: o.lat,
      lng: o.lng,
    };
  });
}
