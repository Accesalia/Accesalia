// lib/listaAbiertas.ts
//
// OPORTUNIDADES ABIERTAS, LA LISTA (Monica, 26-oct-2026; maqueta validada docs/figma/oportunidades-abiertas-clara.html).
// Una fila por opp, «como un Excel»: direccion (y sus avisos), administrador (persona · empresa), en que punto esta
// (el texto de la ESCALERA, estado_oportunidad), dias en ese punto, ultimo contacto, que quieren e importe. Todo de
// una vez para toda la cartera (o todas): el buscador, el orden y los filtros van en la pantalla, sin volver a pedir.
//
// De donde sale cada dato:
//   - el punto y sus dias: estado_oportunidad (clave, texto, extra, desde);
//   - el administrador: la vista administradores_de_oportunidad (la unica forma de saberlo, 18-oct-2026);
//   - el aviso de direccion: avisoDireccion (accesos vivos y parcela), igual que la lista de siempre;
//   - «sin dar de alta»: la opp no tiene comunidad;
//   - el ultimo contacto: la ultima nota del diario escrita por una persona (no las de Sali);
//   - que quieren: sus intereses (oportunidad_tipos), en corto;
//   - el importe: lo que se cobra en su hoja viva mas cara (he_lineas_compromisos). La negociacion, de donde lo leia la
//     lista de siempre, esta vacia.

import "server-only";
import { avisoDireccion } from "./direccionNombre";
import { nombreDeOpp } from "./direccionOpp";
import { cortoInteres } from "./cabeceraOpp";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leerTodo<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const t = (await r.json()) as T[];
    out.push(...t);
    if (t.length < 1000) return out;
  }
}
async function porTramos<T>(ids: string[], hacer: (tramo: string) => string): Promise<T[]> {
  const tramos: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) tramos.push(ids.slice(i, i + 150));
  return (await Promise.all(tramos.map((t) => leerTodo<T>(hacer(t.join(",")))))).flat();
}

export type FilaAbierta = {
  id: string;
  codigo: string | null;
  nombre: string;
  /** «Pendiente de confirmar direccion / alcance», o null. */
  aviso: string | null;
  sinComunidad: boolean;
  persona: string | null;
  empresa: string | null;
  /** El paso de la escalera (su clave) y su texto. */
  clave: string | null;
  texto: string | null;
  /** Cuantas hojas van por detras de la que manda (la escalera, 26-oct-2026). */
  masHojas: number;
  dias: number | null;
  ultimoContacto: string | null;
  quieren: string | null;
  importe: number | null;
  /** Cuando se abrio (Monica, 28-oct-2026: «no se cuales son recientes y cuales antiguas»). */
  abierta: string | null;
};

const VIVA = "estado=not.in.(anulada,no_firmada,sustituida)";
const hoy = () => new Date();

/** Las opps abiertas (y pausadas) de un comercial, o de todos (null). */
export async function listaAbiertas(comercialId: string | null): Promise<FilaAbierta[]> {
  type Opp = {
    id: string; nombre: string | null; codigo: string | null; comunidad_id: string | null; referencia_catastral: string | null;
    fecha_apertura: string | null; creado_en: string;
    tipos: { tipo: { nombre: string } | null }[];
  };
  const ops = await leerTodo<Opp>(
    "oportunidades?select=id,nombre,codigo,comunidad_id,referencia_catastral,fecha_apertura,creado_en,tipos:oportunidad_tipos(tipo:tipo_id(nombre))" +
      `&estado=in.(abierta,pausada)${comercialId ? `&comercial_id=eq.${comercialId}` : ""}&order=nombre.asc,id.asc`,
  );
  const ids = ops.map((o) => o.id);
  if (!ids.length) return [];

  const [estados, admins, vivos, notas, versiones] = await Promise.all([
    porTramos<{ oportunidad_id: string; clave: string; texto: string; extra: string | null; desde: string | null }>(
      ids, (t) => `estado_oportunidad?select=oportunidad_id,clave,texto,extra,desde&oportunidad_id=in.(${t})`),
    porTramos<{ oportunidad_id: string; puesto: { persona: { nombre: string | null; apellidos: string | null } | null; empresa: { nombre_accesalia: string | null } | null } | null; empresa: { nombre_accesalia: string | null } | null }>(
      ids, (t) => `administradores_de_oportunidad?select=oportunidad_id,puesto:puesto_id(persona:persona_id(nombre,apellidos),empresa:empresa_id(nombre_accesalia)),empresa:empresa_id(nombre_accesalia)&oportunidad_id=in.(${t})`),
    porTramos<{ opp_id: string }>(ids, (t) => `relacion_oportunidad_accesos?select=opp_id&hasta=is.null&opp_id=in.(${t})`),
    porTramos<{ oportunidad_id: string; fecha: string | null }>(ids, (t) => `notas_oportunidad?select=oportunidad_id,fecha&autor_id=not.is.null&oportunidad_id=in.(${t})`),
    porTramos<{ id: string; oportunidad_id: string }>(ids, (t) => `he_versiones_hoja?select=id,oportunidad_id&${VIVA}&oportunidad_id=in.(${t})`),
  ]);
  const lineas = versiones.length
    ? await porTramos<{ version_id: string; importe: number | null }>(versiones.map((v) => v.id), (t) => `he_lineas_compromisos?select=version_id,importe&se_cobra=is.true&version_id=in.(${t})`)
    : [];

  const estadoDe = new Map(estados.map((e) => [e.oportunidad_id, e]));
  const adminDe = new Map<string, (typeof admins)[number]>();
  // Una opp puede tener varios administradores (uno por comunidad) y alguna fila vacia: la primera con datos.
  for (const a of admins) {
    const ya = adminDe.get(a.oportunidad_id);
    if (!ya || (!ya.puesto && !ya.empresa && (a.puesto || a.empresa))) adminDe.set(a.oportunidad_id, a);
  }
  const accesos = new Map<string, number>();
  for (const v of vivos) accesos.set(v.opp_id, (accesos.get(v.opp_id) ?? 0) + 1);
  const ultima = new Map<string, string>();
  for (const n of notas) if (n.fecha && n.fecha > (ultima.get(n.oportunidad_id) ?? "")) ultima.set(n.oportunidad_id, n.fecha.slice(0, 10));
  const porVersion = new Map<string, number>();
  for (const l of lineas) porVersion.set(l.version_id, (porVersion.get(l.version_id) ?? 0) + (Number(l.importe) || 0));
  const importe = new Map<string, number>();
  for (const v of versiones) {
    const x = porVersion.get(v.id) ?? 0;
    if (x > (importe.get(v.oportunidad_id) ?? 0)) importe.set(v.oportunidad_id, x);
  }

  const ahora = hoy().getTime();
  return ops.map((o) => {
    const e = estadoDe.get(o.id);
    const a = adminDe.get(o.id);
    const p = a?.puesto?.persona;
    // «Hay más por detrás: 1 hoja cobrada · 2 hojas enviada sin firmar»: cuantas en total.
    const mas = e?.extra?.startsWith("Hay más por detrás") ? [...e.extra.matchAll(/(\d+) hojas?/g)].reduce((s, m) => s + Number(m[1]), 0) : 0;
    const intereses = o.tipos.map((t) => t.tipo?.nombre).filter((n): n is string => !!n);
    return {
      id: o.id,
      codigo: o.codigo,
      nombre: nombreDeOpp(o),
      aviso: avisoDireccion(accesos.get(o.id) ?? 0, o.referencia_catastral),
      sinComunidad: !o.comunidad_id,
      persona: p ? [p.nombre, p.apellidos].filter(Boolean).join(" ") || null : null,
      empresa: a?.empresa?.nombre_accesalia ?? a?.puesto?.empresa?.nombre_accesalia ?? null,
      clave: e?.clave ?? null,
      texto: e?.texto ?? null,
      masHojas: mas,
      dias: e?.desde ? Math.max(0, Math.floor((ahora - new Date(e.desde).getTime()) / 86_400_000)) : null,
      ultimoContacto: ultima.get(o.id) ?? null,
      quieren: intereses.length ? [...new Set(intereses.map(cortoInteres))].join(" + ") : null,
      importe: importe.get(o.id) ? Math.round(importe.get(o.id)!) : null,
      abierta: o.fecha_apertura ?? o.creado_en.slice(0, 10),
    };
  });
}
