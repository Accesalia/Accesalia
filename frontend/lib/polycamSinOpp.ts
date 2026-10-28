// lib/polycamSinOpp.ts
//
// ESCANEOS QUE NO PERTENECEN A NINGUNA OPORTUNIDAD (Monica, 28-oct-2026: «los
// comerciales envian muchos Polycam en los que no esta abierta todavia la opp.
// Si tenemos un Polycam es porque la direccion se ha visto y estudiado: deberia
// haber una opp abierta»). Se le dice al que lo mando, de dos maneras: una
// tarjeta en sus Pendientes y un correo, con el boton para abrirla («de momento
// las dos; si vemos que aprenden, quitare el correo»).
//
// Sin opp = el escaneo no tiene viabilidad, no esta descartado y, o bien esta
// vinculado a portales sin ninguna opp abierta, o bien la app no lo ha podido
// colocar (no hay opp en esa direccion, o el asunto no dice cual es). No hay
// tabla de avisos: se calcula, y desaparece solo en cuanto se abre la opp y el
// buzon lo vincula en su siguiente pasada.

import "server-only";
import { esDeGoogle } from "./revisionPolycam";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

export type SinOpp = {
  id: string;
  asunto: string | null;
  remitente: string | null;
  identificadorCorreo: string | null;
  creadoEn: string;
  visitoId: string | null;
  /** Vinculado a portales sin opp (true) o sin colocar (false). */
  vinculado: boolean;
};

/** Los del ultimo mes; de una persona (su tarjeta) o unos concretos (el correo). */
export async function escaneosSinOpp(f: { visitoId?: string; ids?: string[] }): Promise<SinOpp[]> {
  if (f.ids && !f.ids.length) return [];
  const desde = new Date(Date.now() - 30 * 864e5).toISOString();
  const filtro = f.ids ? `&id=in.(${f.ids.join(",")})` : f.visitoId ? `&visito_id=eq.${f.visitoId}` : "";
  const r = await fetch(
    `${URL_BASE}/rest/v1/escaneados_polycam?select=id,asunto,remitente,identificador_correo,creado_en,visito_id,relacion_polycam_acceso(acceso_id)` +
      `&viabilidad_id=is.null&descartado_en=is.null&ruta_dropbox=is.null&creado_en=gte.${desde}${filtro}&order=creado_en.desc`,
    { headers: cab, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`escaneados_polycam ${r.status}: ${await r.text()}`);
  type F = { id: string; asunto: string | null; remitente: string | null; identificador_correo: string | null; creado_en: string; visito_id: string | null; relacion_polycam_acceso: { acceso_id: string }[] };
  const filas = ((await r.json()) as F[]).filter((e) => !esDeGoogle(e.remitente));

  // Los portales que tienen alguna opp abierta, de una sola vez para todos.
  const todos = [...new Set(filas.flatMap((e) => e.relacion_polycam_acceso.map((x) => x.acceso_id)))];
  const conOpp = new Set<string>();
  for (let i = 0; i < todos.length; i += 150) {
    const trozo = todos.slice(i, i + 150);
    const rel = await leer<{ acceso_id: string; oportunidades: { estado: string } | null }[]>(
      `relacion_oportunidad_accesos?select=acceso_id,oportunidades:opp_id(estado)&hasta=is.null&acceso_id=in.(${trozo.join(",")})`,
    );
    for (const x of rel) if (x.oportunidades?.estado === "abierta") conOpp.add(x.acceso_id);
  }

  const fuera: SinOpp[] = [];
  for (const e of filas) {
    const accesos = e.relacion_polycam_acceso.map((x) => x.acceso_id);
    if (accesos.some((a) => conOpp.has(a))) continue;
    fuera.push({
      id: e.id,
      asunto: e.asunto,
      remitente: e.remitente,
      identificadorCorreo: e.identificador_correo,
      creadoEn: e.creado_en,
      visitoId: e.visito_id,
      vinculado: accesos.length > 0,
    });
  }
  return fuera;
}

/** La direccion, del asunto: sin «Re:», «Fwd:» y demas. */
export const direccionDelAsunto = (asunto: string | null) => (asunto ?? "").replace(/^\s*((re|fwd?|rv|reenviar)\s*:\s*)+/i, "").trim();

/** El alta de la opp, ya con la direccion escrita. */
export const enlaceAbrirOpp = (asunto: string | null, base = "") =>
  `${base}/comercial/oportunidades/nueva?${new URLSearchParams({ direccion: direccionDelAsunto(asunto) })}`;
