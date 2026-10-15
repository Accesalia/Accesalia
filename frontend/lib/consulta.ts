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
  // Las fases salen del ESTADO DE LA OPP (estado_oportunidad, 15-oct-2026); sin
  // fechas, que este listado no las enseña.
  const deEstado = await hitosDeEstado(vivas.map((o) => o.id), false);
  for (const [id, hs] of deEstado) hitos.set(id, new Map(hs.map((h) => [h.hito, h])));

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
      nombre: nombreDeOpp(o),
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
  | { tipo: "opp"; id: string; nombre: string; detalle: string }
  | { tipo: "comunidad"; id: string; nombre: string; detalle: string }
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
  const filas: { id: string; nombre: string | null; codigo: string | null; estado: string; puesto: { empresa: { nombre_accesalia: string } | null } | null }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(
      `${URL_BASE}/rest/v1/oportunidades?select=id,nombre,codigo,estado,puesto:puesto_id(empresa:empresa_id(nombre_accesalia))&order=id`,
      { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" },
    );
    if (!r.ok) throw new Error(`Supabase oportunidades ${r.status}: ${await r.text()}`);
    const lote = (await r.json()) as typeof filas;
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  const peso = (e: string) => (e === "abierta" ? 0 : e === "pausada" ? 1 : 2);
  return filas
    .sort((a, b) => peso(a.estado) - peso(b.estado) || nombreDeOpp(a).localeCompare(nombreDeOpp(b), "es"))
    .map((o) => ({
      id: o.id,
      nombre: nombreDeOpp(o),
      detalle: [ESTADO_OPP[o.estado] ?? o.estado, o.codigo, o.puesto?.empresa?.nombre_accesalia].filter(Boolean).join(" · "),
      href: `/comercial/oportunidades/${o.id}`,
    }));
}

/** UNA OPP CASA si estan todas las palabras. Un NUMERO tiene que ser un numero
 *  entero del nombre: "mostoles 3" no es "Carlos V 32" ni el codigo DAN-2023. */
function casaOpp(palabras: string[], s: { nombre: string; detalle: string }) {
  const nombre = limpio(s.nombre);
  const todo = `${nombre} ${limpio(s.detalle)}`;
  const numeros: string[] = nombre.match(/\d+/g) ?? [];
  return palabras.every((p) => (/^\d+$/.test(p) ? numeros.includes(p) : todo.includes(p)));
}

/** Para el buscador de la ficha de opp: las que casan, las abiertas primero. */
export async function buscarOpps(q: string, maximo = 12): Promise<Sugerencia[]> {
  const palabras = limpio(q).split(/[\s,.]+/).filter(Boolean);
  if (!palabras.length) return [];
  return (await oppsParaBuscar()).filter((s) => casaOpp(palabras, s)).slice(0, maximo);
}

/** Una opcion del desplegable del buscador: lo que se ve y a donde lleva
 *  (null: aun no tiene ficha, como las contratas). */
export type Sugerencia = { id: string; nombre: string; detalle: string; href: string | null };

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
  const [comunidades, admins, contratas, personas, opps] = await Promise.all([
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
    oppsParaBuscar(),
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
    // La direccion va en el detalle para que se encuentre tambien por ella.
    direccion: comunidades.map((c) => ({ id: c.id, nombre: c.nombre, detalle: [c.direccion && c.direccion !== c.nombre ? c.direccion : null, c.municipio].filter(Boolean).join(" · "), href: `/administracion/comunidades/${c.id}` })),
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
  if (que === "opp") {
    return (await oppsParaBuscar())
      .filter((s) => casaOpp(palabras, s))
      .slice(0, 60)
      .map((s) => ({ tipo: "opp" as const, id: s.id, nombre: s.nombre, detalle: s.detalle }));
  }
  if (que === "direccion") {
    const filas = await todo<{ id: string; nombre: string; municipio: string | null; direccion: string | null }>(
      "comunidades?select=id,nombre,municipio,direccion&order=nombre.asc",
    );
    return filas
      .filter((c) => casa(`${c.nombre} ${c.direccion ?? ""} ${c.municipio ?? ""}`))
      .slice(0, 60)
      .map((c) => ({ tipo: "comunidad" as const, id: c.id, nombre: c.nombre, detalle: c.municipio ?? "" }));
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
