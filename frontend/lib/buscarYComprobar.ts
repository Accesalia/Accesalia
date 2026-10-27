// lib/buscarYComprobar.ts
//
// BUSCAR Y COMPROBAR (Monica, 27-oct-2026; maqueta validada docs/figma/buscar-y-comprobar.html). La pagina del menu
// principal, solo buscador, separada por INTENCION:
//   - «Quiero buscar» algo que sabes que esta y quieres abrir: una LISTA, y cada fila a su ficha. Una direccion (las
//     opps, tambien por sus portales) o una persona o empresa (personas de la agenda, administraciones y contratas,
//     «para que puedas buscar Sonia Gomez o Fincas Soler sin pensar primero que es»). Una administracion lleva debajo
//     a todas sus personas y quien las lleva.
//   - «Quiero comprobar si ya existe» antes de empezar algo nuevo: una RESPUESTA. Esta direccion: si la conocemos,
//     desde cuando, de quien, como esta y el ultimo contacto. Este administrador: sus personas y quien lleva a cada
//     una (la cartera es por persona, 8-oct-2026), con sus opps y cuanto hace del ultimo contacto. Si no existe, el
//     boton de darla de alta.

import "server-only";
import { listasBuscador, oppsParaBuscar, type Sugerencia } from "./consulta";
import { casa, palabrasDe, palabrasDeDireccion } from "./casarBusqueda";

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
const enTramos = async <T,>(ids: string[], hacer: (t: string) => string): Promise<T[]> => {
  const tramos: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) tramos.push(ids.slice(i, i + 150));
  return (await Promise.all(tramos.map((t) => leerTodo<T>(hacer(t.join(",")))))).flat();
};

// ------------------------------------------------------------------ las carteras

type Gestor = {
  puesto_id: string; persona_id: string; comercial_id: string | null; consolidado: boolean;
  nombre: string | null; administracion: string | null; en_curso: number; ganadas: number; perdidas: number;
};

async function carteras() {
  const [gestores, comerciales] = await Promise.all([
    leerTodo<Gestor>("cartera_gestores?select=puesto_id,persona_id,comercial_id,consolidado,nombre,administracion,en_curso,ganadas,perdidas&order=puesto_id"),
    leerTodo<{ id: string; nombre: string }>("comerciales?select=id,nombre"),
  ]);
  const nombreComercial = new Map(comerciales.map((c) => [c.id, c.nombre]));
  // Quien lleva a cada persona: solo las consolidadas tienen dueño.
  const llevaA = new Map<string, string>();
  for (const g of gestores) if (g.consolidado && g.comercial_id && nombreComercial.has(g.comercial_id)) llevaA.set(g.persona_id, nombreComercial.get(g.comercial_id)!);
  return { gestores, nombreComercial, llevaA };
}

// ------------------------------------------------------------------ buscar

export type Etiqueta = "direccion" | "administracion" | "persona" | "contrata";
export type Opcion = Omit<Sugerencia, "hijos"> & { etq: Etiqueta; hijos?: Opcion[] };
export type ListasBuscar = { direcciones: Opcion[]; gente: Opcion[] };

/** Lo que filtra la pantalla al escribir: se carga una vez (como el buscador de antes). */
export async function listasBuscar(): Promise<ListasBuscar> {
  const [l, { llevaA }, puestos] = await Promise.all([
    listasBuscador(),
    carteras(),
    leerTodo<{ persona_id: string; empresa_id: string }>("puesto?select=persona_id,empresa_id&hasta=is.null&empresa_id=not.is.null&order=id"),
  ]);
  const personas: Opcion[] = l.persona.map(({ hijos: _h, ...p }) => ({
    ...p,
    etq: "persona",
    detalle: [p.detalle, llevaA.has(p.id) ? `la lleva ${llevaA.get(p.id)}` : null].filter(Boolean).join(" · "),
  }));
  const porId = new Map(personas.map((p) => [p.id, p]));
  const deEmpresa = new Map<string, Opcion[]>();
  for (const x of puestos) {
    const p = porId.get(x.persona_id);
    if (!p) continue;
    const lista = deEmpresa.get(x.empresa_id) ?? [];
    if (!lista.some((y) => y.id === p.id)) lista.push(p);
    deEmpresa.set(x.empresa_id, lista);
  }
  const admins: Opcion[] = l.admin.map(({ hijos: _h, ...a }) => {
    const hijos = deEmpresa.get(a.id) ?? [];
    return {
      ...a,
      etq: "administracion",
      href: `/administracion/administraciones/${a.id}`,
      detalle: hijos.length ? `${hijos.length} ${hijos.length === 1 ? "persona" : "personas"}` : "sin personas apuntadas",
      hijos,
    };
  });
  return {
    direcciones: l.opp.map(({ hijos: _h, ...o }): Opcion => ({ ...o, etq: "direccion" })),
    gente: [...admins, ...l.contrata.map(({ hijos: _h, ...c }): Opcion => ({ ...c, etq: "contrata" })), ...personas],
  };
}

// ------------------------------------------------------------------ comprobar una direccion

export type OppConocida = {
  id: string;
  codigo: string | null;
  nombre: string;
  /** Por donde casa, si no es por su nombre (otro portal suyo). */
  por: string | null;
  estado: string;
  apertura: string | null;
  comercial: string | null;
  paso: string | null;
  diasEnElPaso: number | null;
  ultimoContacto: string | null;
};

export async function comprobarDireccion(q: string): Promise<OppConocida[]> {
  const palabras = palabrasDeDireccion(q);
  if (!palabras.length) return [];
  const casan: { id: string; por: string | null }[] = [];
  for (const s of await oppsParaBuscar()) {
    const c = casa(palabras, s);
    if (c) casan.push({ id: s.id, por: c.por });
    if (casan.length >= 8) break;
  }
  if (!casan.length) return [];
  const ids = casan.map((c) => c.id);
  const [ops, estados, notas, comerciales] = await Promise.all([
    enTramos<{ id: string; codigo: string | null; nombre: string | null; estado: string; fecha_apertura: string | null; creado_en: string; comercial_id: string | null }>(
      ids, (t) => `oportunidades?select=id,codigo,nombre,estado,fecha_apertura,creado_en,comercial_id&id=in.(${t})`),
    enTramos<{ oportunidad_id: string; texto: string | null; desde: string | null }>(ids, (t) => `estado_oportunidad?select=oportunidad_id,texto,desde&oportunidad_id=in.(${t})`),
    enTramos<{ oportunidad_id: string; fecha: string | null }>(ids, (t) => `notas_oportunidad?select=oportunidad_id,fecha&autor_id=not.is.null&oportunidad_id=in.(${t})`),
    leerTodo<{ id: string; nombre: string }>("comerciales?select=id,nombre"),
  ]);
  const nombreComercial = new Map(comerciales.map((c) => [c.id, c.nombre]));
  const estadoDe = new Map(estados.map((e) => [e.oportunidad_id, e]));
  const ultima = new Map<string, string>();
  for (const n of notas) if (n.fecha && n.fecha > (ultima.get(n.oportunidad_id) ?? "")) ultima.set(n.oportunidad_id, n.fecha.slice(0, 10));
  const ahora = Date.now();
  const peso = (e: string) => (e === "abierta" ? 0 : e === "pausada" ? 1 : 2);
  return casan
    .map(({ id, por }): OppConocida | null => {
      const o = ops.find((x) => x.id === id);
      if (!o) return null;
      const e = estadoDe.get(id);
      return {
        id,
        codigo: o.codigo,
        nombre: o.nombre ?? "",
        por,
        estado: o.estado,
        apertura: (o.fecha_apertura ?? o.creado_en)?.slice(0, 10) ?? null,
        comercial: o.comercial_id ? (nombreComercial.get(o.comercial_id) ?? null) : null,
        paso: e?.texto ?? null,
        diasEnElPaso: e?.desde ? Math.max(0, Math.floor((ahora - new Date(e.desde).getTime()) / 86_400_000)) : null,
        ultimoContacto: ultima.get(id) ?? null,
      };
    })
    .filter((x): x is OppConocida => !!x)
    .sort((a, b) => peso(a.estado) - peso(b.estado) || (b.apertura ?? "").localeCompare(a.apertura ?? ""));
}

// ------------------------------------------------------------------ comprobar un administrador

export type PersonaDeCartera = {
  personaId: string;
  nombre: string;
  lleva: string | null;
  enCurso: number;
  ganadas: number;
  perdidas: number;
  ultimoContacto: string | null;
};
export type AdminConocido = { empresaId: string | null; nombre: string; personas: PersonaDeCartera[] };

export async function comprobarAdministrador(q: string): Promise<AdminConocido[]> {
  const palabras = palabrasDe(q);
  if (!palabras.length) return [];
  const [{ gestores, nombreComercial }, empresas] = await Promise.all([
    carteras(),
    leerTodo<{ id: string; nombre_accesalia: string }>("empresa?select=id,nombre_accesalia&tipo=eq.administracion_fincas&activa=is.true&order=id"),
  ]);
  const casaTexto = (t: string | null) => !!t && !!casa(palabras, { nombre: t, detalle: "" });
  // Por la administracion: todas sus personas. Por la persona: solo esa, dentro de su administracion.
  const porAdmin = new Map<string, { empresaId: string | null; personas: Gestor[] }>();
  for (const e of empresas) if (casaTexto(e.nombre_accesalia)) porAdmin.set(e.nombre_accesalia, { empresaId: e.id, personas: [] });
  for (const g of gestores) {
    const adm = g.administracion ?? "Sin administración";
    if (casaTexto(g.administracion) || casaTexto(g.nombre)) {
      const ya = porAdmin.get(adm) ?? { empresaId: empresas.find((e) => e.nombre_accesalia === g.administracion)?.id ?? null, personas: [] };
      if (!ya.personas.some((p) => p.persona_id === g.persona_id)) ya.personas.push(g);
      porAdmin.set(adm, ya);
    }
  }
  const puestos = [...porAdmin.values()].flatMap((a) => a.personas.map((p) => p.puesto_id));
  const resumen = puestos.length
    ? await enTramos<{ puesto_id: string; ultimo_contacto: string | null }>(puestos, (t) => `cartera_gestor_resumen?select=puesto_id,ultimo_contacto&puesto_id=in.(${t})`)
    : [];
  const contacto = new Map(resumen.map((r) => [r.puesto_id, r.ultimo_contacto?.slice(0, 10) ?? null]));
  return [...porAdmin.entries()]
    .slice(0, 8)
    .map(([nombre, a]) => ({
      empresaId: a.empresaId,
      nombre,
      personas: a.personas
        .map((g) => ({
          personaId: g.persona_id,
          nombre: g.nombre ?? "Sin nombre",
          lleva: g.consolidado && g.comercial_id ? (nombreComercial.get(g.comercial_id) ?? null) : null,
          enCurso: g.en_curso,
          ganadas: g.ganadas,
          perdidas: g.perdidas,
          ultimoContacto: contacto.get(g.puesto_id) ?? null,
        }))
        .sort((x, y) => (y.ultimoContacto ?? "").localeCompare(x.ultimoContacto ?? "")),
    }));
}
