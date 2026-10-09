// lib/consulta.ts
//
// CONSULTAR: BUSCAR Y LISTADOS DE UN VISTAZO (Monica, 7-oct-2026).
//
// "Ahora mismo cuesta entrar y buscar una direccion y ver que tiene." Tres
// pantallas TRANSVERSALES -como RRHH: cualquiera de la casa entra- para buscar
// una comunidad o un administrador y llegar a su ficha:
//   · el listado de oportunidades: nombre, en que punto esta, quien es el admin;
//   · el listado de administradores: empresa, cuantas oportunidades han
//     generado y cuando fue el ultimo contacto;
//   · el buscador: una direccion o un administrador.
// Los dos listados se filtran por comercial o todos. Es un avance del
// expediente 360, no el 360.
//
// SOLO LEE. Nada de esto guarda nada.
//
// DE DONDE SALE CADA COSA:
//   · el administrador de una oportunidad es el de SU COMUNIDAD (el vigente en
//     comunidad_admin_responsable); si la comunidad no lo tiene, el de la
//     persona con quien se habla (puesto). Por la comunidad lo tienen 737 de
//     1.181 vivas; por la persona, solo 310.
//   · "en que punto esta": el bloque por el que va, con el mismo calculo que el
//     carril de la oportunidad (bloquesDe).
//   · el ultimo contacto de un administrador: la fecha mas reciente del diario
//     de sus oportunidades.

import "server-only";
import { bloquesDe } from "../app/comercial/oportunidades/[id]/Carril";
import type { HitoGestion } from "./gestionOportunidad";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

// Los listados se leen enteros (miles de filas); se guardan cinco minutos para
// que pasar de un comercial a otro no los vuelva a leer.
const CINCO_MIN = { next: { revalidate: 300 } } as const;

async function leer<T>(path: string, guardar = true): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, ...(guardar ? CINCO_MIN : { cache: "no-store" as const }) });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** Todo, de mil en mil: la API no da mas de golpe. */
async function todo<T>(path: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, ...CINCO_MIN });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const lote = (await r.json()) as T[];
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  return filas;
}

const pedazos = <T>(l: T[], n: number) => Array.from({ length: Math.ceil(l.length / n) }, (_, i) => l.slice(i * n, i * n + n));

// ------------------------------------------------------------ comunes

type OppFila = {
  id: string;
  codigo: string | null;
  nombre: string | null;
  estado: string;
  comunidad_id: string | null;
  comunidad_provisional: string | null;
  comercial_id: string | null;
  puesto: { empresa: { id: string; nombre_accesalia: string; tipo: string } | null } | null;
};

async function oportunidades(): Promise<OppFila[]> {
  return todo<OppFila>(
    "oportunidades?select=id,codigo,nombre,estado,comunidad_id,comunidad_provisional,comercial_id," +
      "puesto:puesto_id(empresa:empresa_id(id,nombre_accesalia,tipo))&order=nombre.asc.nullslast",
  );
}

/** El administrador vigente de cada comunidad. */
async function adminDeComunidad(): Promise<Map<string, { id: string; nombre: string }>> {
  const filas = await todo<{ comunidad_id: string; empresa: { id: string; nombre_accesalia: string } | null }>(
    "comunidad_admin_responsable?select=comunidad_id,empresa:empresa_id(id,nombre_accesalia)&vigente=is.true",
  );
  const m = new Map<string, { id: string; nombre: string }>();
  for (const f of filas) if (f.empresa && !m.has(f.comunidad_id)) m.set(f.comunidad_id, { id: f.empresa.id, nombre: f.empresa.nombre_accesalia });
  return m;
}

function adminDe(o: OppFila, porComunidad: Map<string, { id: string; nombre: string }>) {
  const c = o.comunidad_id ? porComunidad.get(o.comunidad_id) : undefined;
  if (c) return c;
  const e = o.puesto?.empresa;
  return e && e.tipo === "administracion_fincas" ? { id: e.id, nombre: e.nombre_accesalia } : null;
}

export async function comercialesConsulta(): Promise<{ id: string; nombre: string }[]> {
  return leer("comerciales?select=id,nombre&activo=is.true&order=nombre.asc");
}

// --------------------------------------------- el listado de oportunidades

export type FilaOpp = {
  id: string;
  nombre: string;
  codigo: string | null;
  comunidadId: string | null;
  comercialId: string | null;
  punto: string;
  /** El numero del bloque (1-4), para el color; 0 = pausada. */
  bloque: number;
  admin: { id: string; nombre: string } | null;
};

export async function listadoOportunidades(): Promise<FilaOpp[]> {
  const [opps, porComunidad, catalogo] = await Promise.all([
    oportunidades(),
    adminDeComunidad(),
    leer<{ clave: string; nombre: string; orden: number }[]>("hitos_comerciales?select=clave,nombre,orden&order=orden.asc"),
  ]);
  const vivas = opps.filter((o) => o.estado === "abierta" || o.estado === "pausada");

  // Los hitos de las vivas, por tandas de ids (la URL no admite miles).
  const hitos = new Map<string, Map<string, { estado: string; fecha: string | null }>>();
  const lotes = await Promise.all(
    pedazos(vivas.map((o) => o.id), 150).map((ids) =>
      // Las fases se DEDUCEN de los datos (vista fases_oportunidad, 9-oct-2026).
      todo<{ oportunidad_id: string; hito: string; estado: string; fecha: string | null }>(
        `fases_oportunidad?select=oportunidad_id,hito,estado,fecha&oportunidad_id=in.(${ids.join(",")})`,
      ),
    ),
  );
  for (const h of lotes.flat()) {
    if (!hitos.has(h.oportunidad_id)) hitos.set(h.oportunidad_id, new Map());
    hitos.get(h.oportunidad_id)!.set(h.hito, h);
  }

  return vivas.map((o) => {
    const suyos = hitos.get(o.id) ?? new Map();
    const lista = catalogo.map((c) => {
      const h = suyos.get(c.clave);
      return { clave: c.clave, nombre: c.nombre, estado: h?.estado ?? "pendiente", aplicable: h?.estado !== "saltado", fecha: h?.fecha ?? null } as HitoGestion;
    });
    const bloques = bloquesDe(lista);
    const ahora = bloques.find((b) => b.activo) ?? [...bloques].reverse().find((b) => b.pie.startsWith("Hecho")) ?? bloques[0];
    return {
      id: o.id,
      nombre: o.nombre ?? o.comunidad_provisional ?? o.codigo ?? "(sin nombre)",
      codigo: o.codigo,
      comunidadId: o.comunidad_id,
      comercialId: o.comercial_id,
      punto: o.estado === "pausada" ? "Pausada" : `${ahora.n} · ${ahora.titulo} — ${ahora.pie}`,
      bloque: o.estado === "pausada" ? 0 : ahora.n,
      admin: adminDe(o, porComunidad),
    };
  });
}

// ------------------------------------------- el listado de administradores

export type FilaAdmin = {
  id: string;
  nombre: string;
  /** Todas las que han generado, vivas o cerradas. */
  opps: number;
  vivas: number;
  ultimoContacto: string | null;
  /** Los comerciales que llevan alguna de sus oportunidades, y el de su cartera. */
  comerciales: string[];
};

export async function listadoAdministradores(): Promise<FilaAdmin[]> {
  const [empresas, opps, porComunidad, notas, inter] = await Promise.all([
    todo<{ id: string; nombre_accesalia: string; comercial_id: string | null; fecha_ultimo_contacto: string | null }>(
      "empresa?select=id,nombre_accesalia,comercial_id,fecha_ultimo_contacto&tipo=eq.administracion_fincas&activa=is.true&order=nombre_accesalia.asc",
    ),
    oportunidades(),
    adminDeComunidad(),
    todo<{ oportunidad_id: string; fecha: string | null }>("notas_oportunidad?select=oportunidad_id,fecha&fecha=not.is.null"),
    todo<{ oportunidad_id: string | null; fecha_evento: string | null }>("interacciones?select=oportunidad_id,fecha_evento&oportunidad_id=not.is.null"),
  ]);

  const ultima = new Map<string, string>();
  const apunta = (opp: string | null, f: string | null) => {
    if (!opp || !f) return;
    const d = f.slice(0, 10);
    if ((ultima.get(opp) ?? "") < d) ultima.set(opp, d);
  };
  notas.forEach((n) => apunta(n.oportunidad_id, n.fecha));
  inter.forEach((i) => apunta(i.oportunidad_id, i.fecha_evento));

  const por = new Map<string, FilaAdmin>(
    empresas.map((e) => [
      e.id,
      { id: e.id, nombre: e.nombre_accesalia, opps: 0, vivas: 0, ultimoContacto: e.fecha_ultimo_contacto, comerciales: e.comercial_id ? [e.comercial_id] : [] },
    ]),
  );
  for (const o of opps) {
    const a = adminDe(o, porComunidad);
    const f = a && por.get(a.id);
    if (!f) continue;
    f.opps++;
    if (o.estado === "abierta" || o.estado === "pausada") f.vivas++;
    if (o.comercial_id && !f.comerciales.includes(o.comercial_id)) f.comerciales.push(o.comercial_id);
    const u = ultima.get(o.id);
    if (u && (f.ultimoContacto ?? "") < u) f.ultimoContacto = u;
  }
  return [...por.values()];
}

// -------------------------------------------------------------- buscar

export type Encontrado =
  | { tipo: "comunidad"; id: string; nombre: string; detalle: string }
  | { tipo: "admin"; id: string; nombre: string; detalle: string };

const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca por trozos de palabra, sin tildes ni mayusculas: "ronda segovia 5"
 *  encuentra "RONDA DE SEGOVIA 5". */
export async function buscar(q: string, que: "direccion" | "admin"): Promise<Encontrado[]> {
  const palabras = limpio(q).split(/[\s,.]+/).filter((p) => p.length > 0);
  if (!palabras.length) return [];
  const casa = (texto: string) => {
    const t = limpio(texto);
    return palabras.every((p) => t.includes(p));
  };
  if (que === "direccion") {
    const filas = await todo<{ id: string; nombre: string; municipio: string | null; direccion: string | null }>(
      "comunidades?select=id,nombre,municipio,direccion&order=nombre.asc",
    );
    return filas
      .filter((c) => casa(`${c.nombre} ${c.direccion ?? ""} ${c.municipio ?? ""}`))
      .slice(0, 60)
      .map((c) => ({ tipo: "comunidad" as const, id: c.id, nombre: c.nombre, detalle: c.municipio ?? "" }));
  }
  const admins = await listadoAdministradores();
  return admins
    .filter((a) => casa(a.nombre))
    .slice(0, 60)
    .map((a) => ({
      tipo: "admin" as const,
      id: a.id,
      nombre: a.nombre,
      detalle: `${a.vivas} vivas · ${a.opps} en total${a.ultimoContacto ? ` · último contacto ${a.ultimoContacto.split("-").reverse().join("/")}` : ""}`,
    }));
}
