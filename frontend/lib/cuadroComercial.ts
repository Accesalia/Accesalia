// lib/cuadroComercial.ts
//
// Todo lo que pinta el cuadro de mando del area comercial (/comercial), ya
// masticado para la pantalla. La pantalla no sabe de tablas: recibe un
// CuadroComercial y lo dibuja. Asi el modo demostracion (lib/cuadroDemo.ts)
// puede darle uno inventado sin tocar la base, y la pantalla ni se entera.
//
// Repasado con Monica el 11-sep-2026 contra la version de julio. Lo que se quedo
// de cada una esta en app/comercial/page.tsx.

import "server-only";
import { datosMapa, type DatosMapa, type ComunidadEnMapa } from "./mapaComunidades";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

// La base devuelve como mucho 1.000 filas por consulta. Para lo que puede pasar
// de ahi (las comunidades ya son 1.228) se pide por paginas.
async function restTodo<T>(path: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const pagina = await rest<T[]>(`${path}&order=id&limit=1000&offset=${desde}`);
    todo.push(...pagina);
    if (pagina.length < 1000) return todo;
  }
}

// ---------------------------------------------------------------------------
// Tipos: lo que ve la pantalla
// ---------------------------------------------------------------------------

/** Un paso de la barra comercial, tal como sale en la leyenda. */
export type Paso = {
  clave: string;
  numero: string | null; // el 3D no lleva numero: es un desvio, no un paso
  corto: [string, string]; // el rotulo, en dos lineas, debajo de su tramo
  ajeno: boolean; // no depende del comercial (escaneo, arquitecto, 3D)
  quien: string | null;
  ramal: boolean;
};

export type EstadoTramo = "hecho" | "actual" | "pendiente" | "no_aplica";

export type OportunidadCuadro = {
  id: string;
  nombre: string;
  sinComunidad: boolean; // aun no tiene ficha de comunidad: solo un nombre o una pista
  empresa: string | null;
  persona: string | null;
  prestada: boolean;
  trajo: string | null;
  precio: number | null;
  que: string | null;
  tramos: Record<string, EstadoTramo>;
  actual: { numero: string | null; nombre: string; ajeno: boolean; quien: string | null } | null;
  diasAqui: number | null;
  esperando: string | null; // la pelota la tiene otro: "al arquitecto", "el 3D"
  proximo: string | null;
  ultimoContacto: string | null;
  href: string;
};

export type TareaCuadro = { id: string; texto: string; donde: string | null; fecha: string | null; hora: string | null };

export type EntradaCuadro = {
  id: string;
  fecha: string;
  tipo: string;
  con: string | null;
  texto: string;
  revisar: boolean;
  href: string | null;
};

/** Una cifra de "Cómo voy". Sin valor = el dato aun no existe, y el pie dice cual falta. */
export type CifraCuadro = { etiqueta: string; valor: string | null; pie: string; acento?: boolean };

export type FilaRanking = { nombre: string; dato: string; prestada?: boolean; href?: string };

export type CarteraCuadro = {
  cifras: { valor: string; etiqueta: string }[];
  mias: FilaRanking[];
  estrella: FilaRanking[] | null;
  marean: FilaRanking[] | null;
  faltaEstrella: string;
  faltaMarean: string;
};

export type CuadroComercial = {
  demo: boolean;
  pasos: Paso[];
  agenda: TareaCuadro[];
  diario: EntradaCuadro[];
  oportunidades: OportunidadCuadro[];
  cifras: CifraCuadro[];
  cartera: CarteraCuadro;
  mapa: DatosMapa;
  umbralParado: number;
  umbralSinContacto: number;
};

// ---------------------------------------------------------------------------
// Piezas comunes (tambien las usa la demostracion)
// ---------------------------------------------------------------------------

type HitoCatalogo = { clave: string; nombre: string; orden: number; es_ramal: boolean; responsable_rol: string | null };

// Rotulo corto de cada paso, en dos lineas, para que quepa debajo de su tramo.
// El largo vive en hitos_comerciales; esto es solo como se escribe en poco sitio.
// "VB + HE + PPTO" es de Monica.
const CORTO: Record<string, [string, string]> = {
  primer_contacto: ["Primer", "contacto"],
  visita: ["Visita", "inmueble"],
  polycam: ["Escaneo", "Polycam"],
  viabilidad_arquitecto: ["Viabilidad", "arquitecto"],
  preparacion_documentos: ["VB + HE", "+ PPTO"],
  envio_documentos: ["Envío a la", "comunidad"],
  tresd: ["3D para", "la junta"],
  junta: ["Junta de", "votación"],
  firma: ["Firma", ""],
  cobro: ["Cobro", ""],
};

const QUIEN: Record<string, string> = {
  tecnico_escaneo: "escaneo",
  arquitecto: "arquitecto",
  tecnico_3d: "técnico 3D",
};

export async function pasosComerciales(): Promise<Paso[]> {
  const cat = await rest<HitoCatalogo[]>(
    "hitos_comerciales?select=clave,nombre,orden,es_ramal,responsable_rol&order=orden.asc",
  );
  let n = 0;
  return cat.map((h) => {
    const ajeno = !!h.responsable_rol && h.responsable_rol !== "comercial";
    const [a, b] = h.nombre.split(/:\s*|\s+/, 2);
    return {
      clave: h.clave,
      numero: h.es_ramal ? null : String(++n),
      corto: CORTO[h.clave] ?? [a ?? h.nombre, b ?? ""],
      ajeno,
      quien: ajeno ? (QUIEN[h.responsable_rol!] ?? h.responsable_rol) : null,
      ramal: h.es_ramal,
    };
  });
}

/** Los umbrales de alerta que ya existen (parametros_alerta), para no fijarlos en el codigo. */
export async function umbrales(): Promise<{ parado: number; sinContacto: number }> {
  const filas = await rest<{ clave: string; valor: string }[]>(
    "parametros_alerta?select=clave,valor&activo=is.true&clave=in.(doc_atascado,sin_contacto)",
  );
  const v = (k: string, porDefecto: number) => Number(filas.find((f) => f.clave === k)?.valor ?? porDefecto);
  return { parado: v("doc_atascado", 15), sinContacto: v("sin_contacto", 30) };
}

/** Comunidades para el mapa: todas, o las de las administraciones de un comercial. */
export async function mapaDe(empresaIds: string[] | null): Promise<DatosMapa> {
  if (empresaIds === null) {
    return datosMapa(await restTodo<ComunidadEnMapa>("comunidades?select=municipio,lat,lng"));
  }
  if (!empresaIds.length) return datosMapa([]);
  const filas = await restTodo<{ comunidad_id: string; comunidad: ComunidadEnMapa | null }>(
    `comunidad_admin_responsable?select=comunidad_id,comunidad:comunidades(municipio,lat,lng)` +
      `&vigente=is.true&empresa_id=in.(${empresaIds.join(",")})`,
  );
  // Una comunidad puede tener varias personas responsables (Marcal): se cuenta una vez.
  const vistas = new Map<string, ComunidadEnMapa>();
  for (const f of filas) if (f.comunidad) vistas.set(f.comunidad_id, f.comunidad);
  return datosMapa([...vistas.values()]);
}

// ---------------------------------------------------------------------------
// El cuadro de verdad, desde la base
// ---------------------------------------------------------------------------

type HitoCrudo = { hito: string; aplicable: boolean; estado: string; fecha: string | null };

type OportunidadCruda = {
  id: string;
  creado_en: string;
  comunidad_provisional: string | null;
  origen_notas: string | null;
  comunidad: { id: string; nombre: string } | null;
  puesto: { persona: { nombre: string } | null; empresa: { nombre_accesalia: string } | null } | null;
  contrata: { nombre: string } | null;
  hitos_oportunidad: HitoCrudo[];
  negociacion_oportunidad: { que_vendemos: string | null; precio: number | null }[];
};

const SEL_OPORTUNIDAD =
  "id,creado_en,comunidad_provisional,origen_notas," +
  "comunidad:comunidad_id(id,nombre)," +
  "puesto:puesto_id(persona:persona_id(nombre),empresa:empresa_id(nombre_accesalia))," +
  "contrata:contrata_origen_id(nombre)," +
  "hitos_oportunidad(hito,aplicable,estado,fecha)," +
  "negociacion_oportunidad(que_vendemos,precio,creado_en)";

const hoyISO = () => new Date().toISOString().slice(0, 10);
const diasEntre = (desde: string, hasta = hoyISO()) =>
  Math.max(0, Math.round((new Date(hasta).getTime() - new Date(desde.slice(0, 10)).getTime()) / 86_400_000));

/** De los hitos de una oportunidad a los tramos de la barra, el punto actual y cuanto lleva ahi. */
export function leerBarra(pasos: Paso[], hitos: HitoCrudo[], creadoEn: string) {
  const por = new Map(hitos.map((h) => [h.hito, h]));
  const aplica = (clave: string) => {
    const h = por.get(clave);
    return !!h && h.aplicable && h.estado !== "no_aplica";
  };
  // El punto actual: el primer paso que aplica, no es desvio y no esta hecho.
  const lineales = pasos.filter((p) => !p.ramal && aplica(p.clave));
  const actual = lineales.find((p) => por.get(p.clave)!.estado !== "hecho") ?? null;

  const tramos: Record<string, EstadoTramo> = {};
  for (const p of pasos) {
    const h = por.get(p.clave);
    if (!aplica(p.clave)) tramos[p.clave] = "no_aplica";
    else if (h!.estado === "hecho") tramos[p.clave] = "hecho";
    else if (p.clave === actual?.clave || (p.ramal && h!.estado === "en_curso")) tramos[p.clave] = "actual";
    else tramos[p.clave] = "pendiente";
  }

  // Cuanto lleva en este paso: desde que se cerro el anterior. Si es el primero,
  // desde que se abrio la oportunidad. Si el anterior se cerro sin fecha, no se
  // sabe, y no se inventa.
  let diasAqui: number | null = null;
  if (actual) {
    const previos = lineales.slice(0, lineales.indexOf(actual));
    if (!previos.length) diasAqui = diasEntre(creadoEn);
    else {
      const fechas = previos.map((p) => por.get(p.clave)!.fecha).filter((f): f is string => !!f).sort();
      diasAqui = fechas.length ? diasEntre(fechas[fechas.length - 1]) : null;
    }
  }
  return { tramos, actual, diasAqui, junta: por.get("junta")?.fecha ?? null };
}

const DIA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric" });

async function oportunidadesPendientes(comercialId: string | null, pasos: Paso[]): Promise<OportunidadCuadro[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const filas = await rest<OportunidadCruda[]>(
    `oportunidades?select=${SEL_OPORTUNIDAD}&estado=eq.activa${f}&order=creado_en.desc&limit=200` +
      "&negociacion_oportunidad.order=creado_en.desc&negociacion_oportunidad.limit=1",
  );

  // Pendientes de firma: lo firmado ya no es comercial, es obra.
  const pendientes = filas.filter((o) => o.hitos_oportunidad.find((h) => h.hito === "firma")?.estado !== "hecho");

  const ids = pendientes.map((o) => o.comunidad?.id).filter((x): x is string => !!x);
  const ultimo: Record<string, string> = {};
  if (ids.length) {
    const puente = await rest<{ comunidad_id: string; interacciones: { fecha_evento: string | null; creado_en: string } | null }[]>(
      `interaccion_comunidad?select=comunidad_id,interacciones(fecha_evento,creado_en)&comunidad_id=in.(${ids.join(",")})`,
    );
    for (const r of puente) {
      const d = r.interacciones?.fecha_evento ?? r.interacciones?.creado_en?.slice(0, 10);
      if (d && (!ultimo[r.comunidad_id] || d > ultimo[r.comunidad_id])) ultimo[r.comunidad_id] = d;
    }
  }

  return pendientes.map((o) => {
    const b = leerBarra(pasos, o.hitos_oportunidad, o.creado_en);
    const neg = o.negociacion_oportunidad[0];
    const nombre = o.comunidad?.nombre ?? o.comunidad_provisional ?? "Sin dirección todavía";
    const juntaProxima = b.actual?.clave === "junta" && b.junta && b.junta >= hoyISO();
    return {
      id: o.id,
      nombre,
      sinComunidad: !o.comunidad,
      empresa: o.puesto?.empresa?.nombre_accesalia ?? null,
      persona: o.puesto?.persona?.nombre ?? null,
      prestada: false, // aun no esta modelado quien presta que (ver docs/cartera-alvaro-notas.md)
      trajo: o.contrata ? o.contrata.nombre : null,
      precio: neg?.precio ?? null,
      que: neg?.que_vendemos ?? null,
      tramos: b.tramos,
      actual: b.actual
        ? { numero: b.actual.numero, nombre: b.actual.corto.join(" ").trim(), ajeno: b.actual.ajeno, quien: b.actual.quien }
        : null,
      diasAqui: b.diasAqui,
      esperando: b.actual?.ajeno ? `al ${b.actual.quien}` : b.tramos.tresd === "actual" ? "el 3D" : null,
      proximo: juntaProxima ? `junta el ${DIA.format(new Date(b.junta!))}` : null,
      ultimoContacto: o.comunidad ? (ultimo[o.comunidad.id] ?? null) : null,
      href: o.comunidad ? `/expediente/${o.comunidad.id}` : "/comercial/oportunidades",
    };
  });
}

async function agenda(comercialId: string | null): Promise<TareaCuadro[]> {
  // Lo de hoy (y lo que se paso de fecha) y lo que queda de semana. Lo que no
  // tiene fecha va al final: tambien es tarea, aunque no apriete.
  const hoy = new Date();
  const domingo = new Date(hoy);
  domingo.setDate(hoy.getDate() + ((7 - hoy.getDay()) % 7));
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const filas = await rest<{
    id: string;
    texto: string;
    fecha_limite: string | null;
    oportunidad: { comunidad_provisional: string | null; comunidad: { nombre: string } | null } | null;
  }[]>(
    `tareas_seguimiento?select=id,texto,fecha_limite,oportunidad:oportunidad_id(comunidad_provisional,comunidad:comunidad_id(nombre))` +
      `&estado=eq.abierta${f}&or=(fecha_limite.is.null,fecha_limite.lte.${domingo.toISOString().slice(0, 10)})` +
      `&order=fecha_limite.asc.nullslast&limit=40`,
  );
  return filas.map((t) => ({
    id: t.id,
    texto: t.texto,
    donde: t.oportunidad?.comunidad?.nombre ?? t.oportunidad?.comunidad_provisional ?? null,
    fecha: t.fecha_limite,
    hora: null,
  }));
}

const TIPO: Record<string, string> = {
  nota_voz: "nota de voz", manual: "escrito", mail: "correo", llamada: "llamada", visita: "visita",
};

async function diario(comercialId: string | null): Promise<EntradaCuadro[]> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "";
  const filas = await rest<{
    id: string;
    fecha_evento: string | null;
    creado_en: string;
    origen: string;
    transcripcion: string | null;
    requiere_humano: boolean;
    puesto: { persona: { nombre: string } | null } | null;
  }[]>(
    `interacciones?select=id,fecha_evento,creado_en,origen,transcripcion,requiere_humano,puesto:puesto_id(persona:persona_id(nombre))` +
      `${f}&order=creado_en.desc&limit=12`,
  );
  return filas.map((i) => ({
    id: i.id,
    fecha: i.fecha_evento ?? i.creado_en.slice(0, 10),
    tipo: TIPO[i.origen] ?? i.origen,
    con: i.puesto?.persona?.nombre ?? null,
    texto: i.transcripcion ?? "",
    revisar: i.requiere_humano,
    href: `/comercial/interaccion/${i.id}`,
  }));
}

// Lo que "Cómo voy" necesita y todavia no existe. Cuando Alvaro devuelva su
// Excel (fecha de firma e importe de cada hoja) la mayoria se podra calcular.
const CIFRAS_SIN_DATO: CifraCuadro[] = [
  { etiqueta: "Administradores nuevos", valor: null, pie: "falta la fecha de alta de cada una" },
  { etiqueta: "Hojas enviadas", valor: null, pie: "falta la fecha de envío" },
  { etiqueta: "Hojas firmadas", valor: null, pie: "ninguna hoja tiene fecha de firma" },
  { etiqueta: "Contratado", valor: null, pie: "sale de lo firmado" },
  { etiqueta: "Comisión generada", valor: null, pie: "las comisiones están sin cargar" },
  { etiqueta: "Acaba en firma", valor: null, pie: "sale de enviadas y firmadas" },
  { etiqueta: "Hasta la firma", valor: null, pie: "sale de la fecha de firma" },
  { etiqueta: "Encargo medio", valor: null, pie: "sale de lo firmado" },
];

async function carteraDe(comercialId: string | null): Promise<{ cartera: CarteraCuadro; empresaIds: string[] | null }> {
  const f = comercialId ? `&comercial_id=eq.${comercialId}` : "&comercial_id=not.is.null";
  const empresas = await rest<{ id: string; nombre_accesalia: string; comunidades: { count: number }[] }[]>(
    `empresa?select=id,nombre_accesalia,comunidades:comunidad_admin_responsable(count)` +
      `&comunidades.vigente=is.true${f}&limit=2000`,
  );
  const conN = empresas
    .map((e) => ({ id: e.id, nombre: e.nombre_accesalia, n: e.comunidades?.[0]?.count ?? 0 }))
    .sort((a, b) => b.n - a.n);
  const direcciones = conN.reduce((a, e) => a + e.n, 0);
  return {
    empresaIds: comercialId ? conN.map((e) => e.id) : null,
    cartera: {
      cifras: [
        { valor: String(conN.length), etiqueta: "administraciones" },
        { valor: String(direcciones), etiqueta: "comunidades" },
      ],
      mias: conN.slice(0, 5).map((e) => ({ nombre: e.nombre, dato: String(e.n), href: `/administraciones/${e.id}` })),
      estrella: null,
      marean: null,
      faltaEstrella: "Sale de las hojas firmadas, y aún no hay ninguna con fecha de firma.",
      faltaMarean: "Sale de cruzar los contactos con las firmas: hacen falta las dos cosas.",
    },
  };
}

/** El cuadro de un comercial (o de todos, si no se dice cual). */
export async function cuadroComercial(comercialId: string | null): Promise<CuadroComercial> {
  const [pasos, u, { cartera, empresaIds }] = await Promise.all([
    pasosComerciales(),
    umbrales(),
    carteraDe(comercialId),
  ]);
  const [oportunidades, tareas, entradas, mapa] = await Promise.all([
    oportunidadesPendientes(comercialId, pasos),
    agenda(comercialId),
    diario(comercialId),
    mapaDe(empresaIds),
  ]);
  return {
    demo: false,
    pasos,
    agenda: tareas,
    diario: entradas,
    oportunidades,
    cifras: CIFRAS_SIN_DATO,
    cartera,
    mapa,
    umbralParado: u.parado,
    umbralSinContacto: u.sinContacto,
  };
}
