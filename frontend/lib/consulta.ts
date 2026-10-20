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
import { nombreDeOpp } from "./direccionOpp";
import { bloquesDe } from "../app/comercial/oportunidades/[id]/Carril";
import type { HitoGestion } from "./gestionOportunidad";
import { hitosDeEstado } from "./fasesDeEstado";
import { bonito } from "./direccionNombre";
import { casa as casaBusqueda, palabrasDe } from "./casarBusqueda";

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
      "puesto:puesto_id(empresa:empresa_id(id,nombre_accesalia,tipo))&estado=neq.anulada&order=nombre.asc.nullslast",
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
  const [opps, porComunidad] = await Promise.all([oportunidades(), adminDeComunidad()]);
  const vivas = opps.filter((o) => o.estado === "abierta" || o.estado === "pausada");
  const puntos = await puntosDeOpps(vivas);
  return vivas.map((o) => ({
    id: o.id,
    nombre: nombreDeOpp(o),
    codigo: o.codigo,
    comunidadId: o.comunidad_id,
    comercialId: o.comercial_id,
    ...puntos.get(o.id)!,
    admin: adminDe(o, porComunidad),
  }));
}

/** "En que punto esta" cada una: el bloque por el que va, con el mismo calculo
 *  que el carril de la oportunidad. Lo usan este listado y la ficha de una
 *  administracion (sus opps abiertas). */
export async function puntosDeOpps(opps: { id: string; estado: string }[]): Promise<Map<string, { punto: string; bloque: number }>> {
  const catalogo = await leer<{ clave: string; nombre: string; orden: number }[]>("hitos_comerciales?select=clave,nombre,orden&order=orden.asc");

  // Los hitos de las vivas, por tandas de ids (la URL no admite miles).
  const hitos = new Map<string, Map<string, { estado: string; fecha: string | null }>>();
  // Las fases salen del ESTADO DE LA OPP (estado_oportunidad, 15-oct-2026); sin
  // fechas, que este listado no las enseña.
  const deEstado = await hitosDeEstado(opps.map((o) => o.id), false);
  for (const [id, hs] of deEstado) hitos.set(id, new Map(hs.map((h) => [h.hito, h])));

  const out = new Map<string, { punto: string; bloque: number }>();
  for (const o of opps) {
    const suyos = hitos.get(o.id) ?? new Map();
    const lista = catalogo.map((c) => {
      const h = suyos.get(c.clave);
      return { clave: c.clave, nombre: c.nombre, estado: h?.estado ?? "pendiente", aplicable: h?.estado !== "saltado" && h?.estado !== "no_aplica", fecha: h?.fecha ?? null } as HitoGestion;
    });
    const bloques = bloquesDe(lista);
    const ahora = bloques.find((b) => b.activo) ?? [...bloques].reverse().find((b) => b.pie.startsWith("Hecho")) ?? bloques[0];
    out.set(o.id, {
      punto: o.estado === "pausada" ? "Pausada" : `${ahora.n} · ${ahora.titulo} — ${ahora.pie}`,
      bloque: o.estado === "pausada" ? 0 : ahora.n,
    });
  }
  return out;
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
  | { tipo: "opp"; id: string; nombre: string; detalle: string }
  | { tipo: "comunidad"; id: string; nombre: string; detalle: string; opps: Sugerencia[] }
  | { tipo: "admin"; id: string; nombre: string; detalle: string }
  | { tipo: "contrata"; id: string; nombre: string; detalle: string }
  | { tipo: "persona"; id: string; nombre: string; detalle: string; href: string | null };

export type QueBuscar = "opp" | "direccion" | "admin" | "contrata" | "persona";

// LAS OPORTUNIDADES, POR SU NOMBRE (Monica, 14-oct-2026: "la lupa no encuentra
// opps que veo abiertas"). Buscaba solo comunidades. Los buscadores de trabajo
// van por el NOMBRE DE LA OPP (13-oct). Se leen al momento, sin guardar: una opp
// recien creada o renombrada tiene que salir ya. Las abiertas, primero.
const ESTADO_OPP: Record<string, string> = { abierta: "abierta", pausada: "pausada", cerrada: "cerrada" };

export async function oppsParaBuscar(): Promise<Sugerencia[]> {
  const [filas, portales] = await Promise.all([
    alDia<{ id: string; nombre: string | null; codigo: string | null; estado: string; puesto: { empresa: { nombre_accesalia: string } | null } | null }>(
      "oportunidades?select=id,nombre,codigo,estado,puesto:puesto_id(empresa:empresa_id(nombre_accesalia))&estado=neq.anulada&order=id",
    ),
    portalesDeTodo(),
  ]);
  const peso = (e: string) => (e === "abierta" ? 0 : e === "pausada" ? 1 : 2);
  return filas
    .sort((a, b) => peso(a.estado) - peso(b.estado) || nombreDeOpp(a).localeCompare(nombreDeOpp(b), "es"))
    .map((o) => ({
      id: o.id,
      nombre: nombreDeOpp(o),
      detalle: [ESTADO_OPP[o.estado] ?? o.estado, o.codigo, o.puesto?.empresa?.nombre_accesalia].filter(Boolean).join(" · "),
      href: `/comercial/oportunidades/${o.id}`,
      portales: portales.deOpp.get(o.id),
    }));
}

/** Todo, de mil en mil y AL DIA (sin guardar): una opp recien dada de alta tiene
 *  que salir ya, tambien por su direccion. */
async function alDia<T>(path: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const lote = (await r.json()) as T[];
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  return filas;
}

/** LOS PORTALES DE CADA OPP Y DE CADA COMUNIDAD (Monica, 15-oct-2026: "hay alguna
 *  pantalla donde meta una direccion y me salga la opp?"). De una opp: sus
 *  accesos, los demas de su clave DIR (otros portales del mismo edificio) y el
 *  codigo DIR. De una comunidad: sus accesos. Cada portal entero, "Etruria 58
 *  esc 2, Madrid". Son pocas filas (unos 4.500 accesos): se leen todas. */
async function portalesDeTodo(): Promise<{ deOpp: Map<string, string[]>; deComunidad: Map<string, string[]>; oppsDeComunidad: Map<string, Set<string>> }> {
  type Acc = { id: string; municipio: string | null; nombre_via: string | null; numero: string | null; escalera: string | null; clave_id: string | null; figura_legal_propietaria_id: string | null };
  const [accesos, rels, claves] = await Promise.all([
    alDia<Acc>("accesos?select=id,municipio,nombre_via,numero,escalera,clave_id,figura_legal_propietaria_id&order=id"),
    alDia<{ opp_id: string; acceso_id: string }>("relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id"),
    alDia<{ id: string; codigo: string | null }>("claves?select=id,codigo&codigo=not.is.null&order=id"),
  ]);
  const texto = (a: Acc) =>
    [
      [a.nombre_via ? bonito(a.nombre_via) : null, a.numero?.replace(/\((\w+)\)/, " $1")].filter(Boolean).join(" "),
      a.escalera?.trim() ? ` esc ${a.escalera.trim()}` : "",
      a.municipio ? `, ${bonito(a.municipio)}` : "",
    ].join("");
  const porId = new Map(accesos.map((a) => [a.id, a]));
  const deClave = new Map<string, Acc[]>();
  for (const a of accesos) if (a.clave_id) deClave.set(a.clave_id, [...(deClave.get(a.clave_id) ?? []), a]);
  const codigo = new Map(claves.map((c) => [c.id, c.codigo!]));

  const suyos = new Map<string, Acc[]>();
  for (const r of rels) {
    const a = porId.get(r.acceso_id);
    if (a) suyos.set(r.opp_id, [...(suyos.get(r.opp_id) ?? []), a]);
  }
  const deOpp = new Map<string, string[]>();
  const oppsDeComunidad = new Map<string, Set<string>>();
  for (const [opp, accs] of suyos) {
    const claveIds = [...new Set(accs.map((a) => a.clave_id).filter((x): x is string => !!x))];
    const todos = [...accs, ...claveIds.flatMap((k) => deClave.get(k) ?? [])];
    deOpp.set(opp, [...new Set(todos.map(texto).filter(Boolean)), ...claveIds.map((k) => codigo.get(k)).filter((x): x is string => !!x)]);
    for (const a of accs) {
      const f = a.figura_legal_propietaria_id;
      if (f) oppsDeComunidad.set(f, (oppsDeComunidad.get(f) ?? new Set<string>()).add(opp));
    }
  }
  const deComunidad = new Map<string, string[]>();
  for (const a of accesos) {
    const f = a.figura_legal_propietaria_id;
    if (!f) continue;
    const l = deComunidad.get(f) ?? [];
    const t = texto(a);
    if (t && !l.includes(t)) l.push(t);
    deComunidad.set(f, l);
  }
  return { deOpp, deComunidad, oppsDeComunidad };
}

/** Las comunidades, con sus portales y SUS OPPS debajo (Monica, 15-oct-2026: la
 *  ficha de la comunidad no lleva a sus opps; el buscador, si). Sus opps: las que
 *  apuntan a ella y las de sus accesos, en el orden de siempre (abiertas primero). */
async function comunidadesParaBuscar(opps: Sugerencia[]): Promise<Sugerencia[]> {
  const [comunidades, portales, enlaces] = await Promise.all([
    todo<{ id: string; nombre: string; municipio: string | null; direccion: string | null }>("comunidades?select=id,nombre,municipio,direccion&order=nombre.asc"),
    portalesDeTodo(),
    alDia<{ id: string; comunidad_id: string }>("oportunidades?select=id,comunidad_id&comunidad_id=not.is.null&order=id"),
  ]);
  const suyas = portales.oppsDeComunidad;
  for (const e of enlaces) suyas.set(e.comunidad_id, (suyas.get(e.comunidad_id) ?? new Set<string>()).add(e.id));
  return comunidades.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    // La direccion va en el detalle para que se encuentre tambien por ella.
    detalle: [c.direccion && c.direccion !== c.nombre ? c.direccion : null, c.municipio].filter(Boolean).join(" · "),
    href: `/administracion/comunidades/${c.id}`,
    portales: portales.deComunidad.get(c.id),
    hijos: opps.filter((o) => suyas.get(c.id)?.has(o.id)).map((o) => ({ ...o, portales: undefined })),
  }));
}

/** Para el buscador de la ficha de opp: las que casan, las abiertas primero. */
export async function buscarOpps(q: string, maximo = 12): Promise<Sugerencia[]> {
  const palabras = palabrasDe(q);
  if (!palabras.length) return [];
  const out: Sugerencia[] = [];
  for (const s of await oppsParaBuscar()) {
    const c = casaBusqueda(palabras, s);
    if (c) out.push({ ...s, portales: undefined, detalle: c.por ? `por ${c.por} · ${s.detalle}` : s.detalle });
    if (out.length >= maximo) break;
  }
  return out;
}

/** Una opcion del desplegable del buscador: lo que se ve y a donde lleva
 *  (null: aun no tiene ficha, como las contratas). */
export type Sugerencia = {
  id: string;
  nombre: string;
  detalle: string;
  href: string | null;
  /** Sus portales, para encontrarla tambien por ellos (lib/casarBusqueda.ts). */
  portales?: string[];
  /** De una comunidad: sus opps, debajo. */
  hijos?: Sugerencia[];
};

/** LAS LISTAS DEL DESPLEGABLE (Monica, 12-oct-2026): "segun escribes se filtre
 *  a las que tienen eso, y las muestre, hasta que eliges una". Se cargan una vez
 *  y se filtran en la pantalla: son pocas (unas 2.800 comunidades). */
export async function listasBuscador(): Promise<Record<QueBuscar, Sugerencia[]>> {
  type PersonaAgenda = {
    id: string;
    nombre: string;
    apellidos: string | null;
    telefono_personal: string | null;
    equipo_id: string | null;
    correos: { email: string }[];
    puestos: {
      cargo: string | null;
      hasta: string | null;
      telefono_empresa: string | null;
      figura_legal_propietaria_id: string | null;
      empresa_id: string | null;
      empresa: { nombre_accesalia: string | null } | null;
      contrata: { nombre: string } | null;
      organismo: { nombre: string } | null;
      correos: { email: string }[];
    }[];
  };
  const opps = await oppsParaBuscar();
  const [comunidades, admins, contratas, personas, direccion] = await Promise.all([
    todo<{ id: string; nombre: string; municipio: string | null; direccion: string | null }>("comunidades?select=id,nombre,municipio,direccion&order=nombre.asc"),
    todo<{ id: string; nombre_accesalia: string }>("empresa?select=id,nombre_accesalia&tipo=eq.administracion_fincas&activa=is.true&order=nombre_accesalia.asc"),
    todo<{ id: string; nombre: string; tipo: string | null; cif: string | null }>("contratas?select=id,nombre,tipo,cif&order=nombre.asc"),
    // LA AGENDA (12-oct-2026): "un cuarto buscador, por persona, sea de donde
    // sea". Con sus cargos vigentes, que dicen quien es y a donde llevar.
    todo<PersonaAgenda>(
      "persona?select=id,nombre,apellidos,telefono_personal,equipo_id,correos:correo(email)," +
        "puestos:puesto(cargo,hasta,telefono_empresa,figura_legal_propietaria_id,empresa_id,empresa:empresa_id(nombre_accesalia),contrata:contrata_id(nombre),organismo:organismo_id(nombre),correos:correo(email))" +
        "&activa=is.true&order=nombre.asc",
    ),
    comunidadesParaBuscar(opps),
  ]);
  const nombreComunidad = new Map(comunidades.map((c) => [c.id, c.nombre]));
  const agenda: Sugerencia[] = personas.map((p) => {
    const vivos = p.puestos.filter((x) => !x.hasta);
    const cargos = vivos.map((x) => {
      const donde = x.figura_legal_propietaria_id
        ? nombreComunidad.get(x.figura_legal_propietaria_id)
        : (x.empresa?.nombre_accesalia ?? x.contrata?.nombre ?? x.organismo?.nombre);
      return [x.cargo ? x.cargo.charAt(0).toUpperCase() + x.cargo.slice(1) : null, donde].filter(Boolean).join(" · ");
    });
    const contacto = [
      p.telefono_personal,
      ...vivos.map((x) => x.telefono_empresa),
      ...p.correos.map((c) => c.email),
      ...vivos.flatMap((x) => x.correos.map((c) => c.email)),
    ].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
    const href = `/consulta/personas/${p.id}`;
    return {
      id: p.id,
      nombre: [p.nombre, p.apellidos].filter(Boolean).join(" "),
      detalle: [[p.equipo_id ? "De Accesalia" : null, ...cargos].filter(Boolean).join(" / "), contacto.slice(0, 2).join(" · ")].filter(Boolean).join(" — "),
      href,
    };
  });
  return {
    opp: opps,
    persona: agenda,
    direccion,
    admin: admins.map((a) => ({ id: a.id, nombre: a.nombre_accesalia, detalle: "", href: `/consulta/oportunidades?admin=${a.id}` })),
    contrata: contratas.map((c) => ({ id: c.id, nombre: c.nombre, detalle: [c.tipo, c.cif].filter(Boolean).join(" · "), href: `/consulta/contratas/${c.id}` })),
  };
}

const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca por trozos de palabra, sin tildes ni mayusculas: "ronda segovia 5"
 *  encuentra "RONDA DE SEGOVIA 5". */
export async function buscar(q: string, que: QueBuscar): Promise<Encontrado[]> {
  const palabras = limpio(q).split(/[\s,.]+/).filter((p) => p.length > 0);
  if (!palabras.length) return [];
  const casa = (texto: string) => {
    const t = limpio(texto);
    return palabras.every((p) => t.includes(p));
  };
  // La opp y la comunidad, tambien por sus portales (lib/casarBusqueda.ts).
  if (que === "opp" || que === "direccion") {
    const opps = await oppsParaBuscar();
    const lista = que === "opp" ? opps : await comunidadesParaBuscar(opps);
    const out: Encontrado[] = [];
    for (const s of lista) {
      const c = casaBusqueda(palabras, s);
      if (!c) continue;
      const detalle = c.por ? `por ${c.por} · ${s.detalle}` : s.detalle;
      out.push(que === "opp" ? { tipo: "opp", id: s.id, nombre: s.nombre, detalle } : { tipo: "comunidad", id: s.id, nombre: s.nombre, detalle, opps: s.hijos ?? [] });
      if (out.length >= 60) break;
    }
    return out;
  }
  if (que === "persona") {
    const { persona } = await listasBuscador();
    return persona
      .filter((p) => casa(`${p.nombre} ${p.detalle}`))
      .slice(0, 60)
      .map((p) => ({ tipo: "persona" as const, id: p.id, nombre: p.nombre, detalle: p.detalle, href: p.href }));
  }
  if (que === "contrata") {
    const filas = await todo<{ id: string; nombre: string; tipo: string | null; cif: string | null }>("contratas?select=id,nombre,tipo,cif&order=nombre.asc");
    return filas
      .filter((c) => casa(`${c.nombre} ${c.cif ?? ""}`))
      .slice(0, 60)
      .map((c) => ({ tipo: "contrata" as const, id: c.id, nombre: c.nombre, detalle: [c.tipo, c.cif].filter(Boolean).join(" · ") }));
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
