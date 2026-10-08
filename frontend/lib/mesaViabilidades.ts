// lib/mesaViabilidades.ts
//
// LA MESA DE VIABILIDADES (Monica, 3-oct-2026). La pantalla de Alex, donde nace
// la viabilidad. Maqueta aprobada: docs/figma/mesa-alex.html.
//
// El recorrido, en sus palabras: el comercial escanea con Polycam y lo manda al
// buzon; a Alex le salta el aviso, "revisa el 3D y analiza: que entra, que cabe,
// como", guarda la captura, decide si un 3D del catalogo lo cubre o hace falta
// uno especifico, escribe el informe y pone el PEM estimado. Y se lo manda al
// comercial, que lo completa: "Alex llega hasta donde llegue y el comercial
// puede redactarlo a gusto de su cliente".
//
// DOS MONTONES:
//   1. escaneos sin vincular: "¿de que portal es?" (lib/revisionPolycam.ts);
//   2. viabilidades por hacer: los escaneos ya vinculados, con o sin borrador.
//
// UN ESCANEO, UNA VIABILIDAD... casi siempre: "a veces de DOS escaneos sale UNA
// viabilidad conjunta". Nunca al reves. Por eso el escaneo apunta a la
// viabilidad (`escaneados_polycam.viabilidad_id`) y no al contrario.
//
// EL ESTADO NO SE GUARDA: sin `enviada_en` es borrador de Alex; con ella, esta
// en manos del comercial.

import "server-only";

import { inflateRawSync } from "node:zlib";
import { bonito, NOMBRE_TIPO } from "./direccionNombre";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const cabJson = { ...cab, "Content-Type": "application/json" };
const ALMACEN = "almacen-polycam-y-fotos";

// ------------------------------------------------------------------ Supabase

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function escribir<T>(metodo: "POST" | "PATCH" | "DELETE", path: string, cuerpo?: unknown, prefer = "return=representation"): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...cabJson, Prefer: prefer },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${metodo} ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : null) as T;
}

/** Un enlace que caduca. El almacen es privado: se firma uno que vale una hora.
 *  Si el fichero no existe, Supabase no firma y se devuelve null. */
async function firmar(ruta: string, segundos = 3600): Promise<string | null> {
  try {
    const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN}/${ruta}`, {
      method: "POST",
      headers: cabJson,
      body: JSON.stringify({ expiresIn: segundos }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const { signedURL } = (await r.json()) as { signedURL?: string };
    return signedURL ? `${URL_BASE}/storage/v1${signedURL}` : null;
  } catch {
    return null;
  }
}

async function subir(ruta: string, datos: Buffer | Uint8Array, tipo: string): Promise<void> {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...cab, "Content-Type": tipo, "x-upsert": "true" },
    body: datos as BodyInit,
  });
  if (!r.ok) throw new Error(`almacen ${r.status}: ${await r.text()}`);
}

// ----------------------------------------------------------- el .glb del zip

/**
 * Saca el .glb de un .zip. Polycam lo manda casi siempre comprimido
 * (15_9_2026.zip -> 15_9_2026.glb), y el visor necesita el .glb suelto.
 *
 * Sin librerias: un zip es una lista de entradas con un indice al final. Se lee
 * el indice, se busca la primera que acabe en .glb y se descomprime con zlib,
 * que ya viene con Node. Si no hay .glb o el zip es raro, null: el visor lo dice
 * y Alex siempre puede descargar el original.
 */
export function glbDelZip(zip: Buffer): Buffer | null {
  let fin = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) return null;
  const entradas = zip.readUInt16LE(fin + 10);
  let p = zip.readUInt32LE(fin + 16);
  for (let k = 0; k < entradas; k++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) return null;
    const metodo = zip.readUInt16LE(p + 10);
    const comprimido = zip.readUInt32LE(p + 20);
    const largoNombre = zip.readUInt16LE(p + 28);
    const largoExtra = zip.readUInt16LE(p + 30);
    const largoComentario = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const nombre = zip.toString("utf8", p + 46, p + 46 + largoNombre);
    if (/\.glb$/i.test(nombre) && !nombre.startsWith("__MACOSX")) {
      const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const datos = zip.subarray(inicio, inicio + comprimido);
      if (metodo === 0) return Buffer.from(datos);
      if (metodo === 8) return inflateRawSync(datos);
      return null;
    }
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return null;
}

/**
 * El enlace al .glb que abre el visor. Vercel no deja que una respuesta pase de
 * 4,5 MB y los escaneos pesan de 3 a 36, asi que el fichero NO pasa por la app:
 * la primera vez se saca del zip y se deja en el almacen junto al original
 * (`<id>/modelo.glb`), y el navegador lo carga de ahi con un enlace firmado.
 */
export async function enlaceAlModelo(escaneo: { id: string; polycam: string | null }): Promise<string | null> {
  if (!escaneo.polycam) return null;
  if (/\.glb$/i.test(escaneo.polycam)) return firmar(escaneo.polycam);
  const ruta = `${escaneo.id}/modelo.glb`;
  const ya = await firmar(ruta);
  if (ya) return ya;
  try {
    const r = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${escaneo.polycam}`, { headers: cab, cache: "no-store" });
    if (!r.ok) return null;
    const glb = glbDelZip(Buffer.from(await r.arrayBuffer()));
    // Un .glb de verdad empieza por "glTF". Los que no (Puertomorcuera 11: un
    // glTF de texto con el nombre cambiado y sin sus piezas) no se pueden ver.
    if (!glb || glb.subarray(0, 4).toString() !== "glTF") return null;
    await subir(ruta, glb, "model/gltf-binary");
    return firmar(ruta);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ nombres

type AccesoFila = { id: string; municipio: string; tipo_via: string; nombre_via: string; numero: string; escalera: string };

const numeroBonito = (n: string) => n.replace(/\((\w+)\)/, " $1");

/** "Calle Año 1492 6, San Sebastian de los Reyes" */
function direccionDe(accesos: AccesoFila[]): string {
  if (!accesos.length) return "(sin dirección)";
  const porVia = new Map<string, Set<string>>();
  for (const a of accesos) {
    const via = `${NOMBRE_TIPO[a.tipo_via] ?? a.tipo_via} ${bonito(a.nombre_via)}`;
    porVia.set(via, (porVia.get(via) ?? new Set()).add(numeroBonito(a.numero)));
  }
  const trozos = Array.from(porVia, ([via, nums]) => `${via} ${Array.from(nums).join(" y ")}`);
  return `${trozos.join(" + ")}, ${bonito(accesos[0].municipio)}`;
}

/** "escaleras 1 y 2", "escalera B", o nada si es un portal sin escalera. */
function escalerasDe(accesos: AccesoFila[]): string {
  const es = accesos.map((a) => a.escalera).filter(Boolean);
  if (!es.length) return accesos.length > 1 ? `${accesos.length} portales` : "";
  if (es.length === 1) return `escalera ${es[0]}`;
  return `escaleras ${es.slice(0, -1).join(", ")} y ${es[es.length - 1]}`;
}

/** El nombre de cada caja de escalera en la mesa. */
export function nombreDeEscalera(a: AccesoFila, variosNumeros: boolean): string {
  const num = variosNumeros ? `Nº ${numeroBonito(a.numero)} · ` : "";
  return a.escalera ? `${num}Escalera ${a.escalera}` : `${num}Portal`;
}

// ------------------------------------------------------------- las opps

type OppFila = {
  id: string;
  codigo: string | null;
  nombre: string | null;
  estado: string;
  comercial: { nombre: string } | null;
  oportunidad_tipos: { tipos_proyecto: { nombre: string } | null }[];
};
const SEL_OPP = "id,codigo,nombre,estado,comercial:comercial_id(nombre),oportunidad_tipos(tipos_proyecto(nombre))";

const proyectoDe = (o: OppFila | null) =>
  o?.oportunidad_tipos.map((t) => t.tipos_proyecto?.nombre).filter(Boolean).join(" + ") || null;

/** Las opps ABIERTAS de esos accesos: enlace vivo y oportunidad activa. */
async function oppsDeAccesos(accesoIds: string[]): Promise<OppFila[]> {
  if (!accesoIds.length) return [];
  const rel = await leer<{ opp_id: string }[]>(
    `relacion_oportunidad_accesos?select=opp_id&hasta=is.null&acceso_id=in.(${accesoIds.join(",")})`,
  );
  const ids = Array.from(new Set(rel.map((r) => r.opp_id)));
  if (!ids.length) return [];
  return leer<OppFila[]>(`oportunidades?select=${SEL_OPP}&estado=eq.abierta&id=in.(${ids.join(",")})`);
}

// ------------------------------------------------------------- el montón 2

export type PorHacer = {
  /** Si ya hay borrador, la viabilidad; si no, el escaneo con el que se empieza. */
  viabilidadId: string | null;
  escaneoId: string | null;
  direccion: string;
  escaleras: string;
  proyecto: string | null;
  comercial: string | null;
  escaneos: number;
  fechaEscaneo: string | null;
  /** Desde cuando espera: el escaneo mas antiguo. */
  desde: string;
  borrador: boolean;
  danielAvisado: boolean;
  /** Para empezar: con que opp. Varias = elegir; ninguna = no se puede. */
  opps: { id: string; codigo: string | null; nombre: string | null; proyecto: string | null; comercial: string | null }[];
};

type EscaneoFila = {
  id: string;
  creado_en: string;
  asunto: string | null;
  nombre_original_fichero: string | null;
  fecha_escaneo: string | null;
  polycam: string | null;
  ruta_polycam: string | null;
  viabilidad_id: string | null;
  relacion_polycam_acceso: { accesos: AccesoFila | null }[];
};
const SEL_ESC =
  "id,creado_en,asunto,nombre_original_fichero,fecha_escaneo,polycam,ruta_polycam,viabilidad_id," +
  "relacion_polycam_acceso!inner(accesos(id,municipio,tipo_via,nombre_via,numero,escalera))";

const accesosDe = (e: EscaneoFila) => e.relacion_polycam_acceso.map((r) => r.accesos).filter((a): a is AccesoFila => !!a);

/** Lo que Alex tiene por hacer: escaneos vinculados sin viabilidad, y las
 *  viabilidades que aun no ha mandado al comercial. Las que mas esperan, arriba. */
export async function porHacer(): Promise<PorHacer[]> {
  const escaneos = await leer<EscaneoFila[]>(`escaneados_polycam?select=${SEL_ESC}&order=creado_en.asc`);
  type ViabFila = { id: string; enviada_en: string | null; daniel_avisado_en: string | null; fecha_visita: string | null; oportunidades: OppFila | null };
  const ids = Array.from(new Set(escaneos.map((e) => e.viabilidad_id).filter((x): x is string => !!x)));
  const viabs = ids.length
    ? await leer<ViabFila[]>(`viabilidades?select=id,enviada_en,daniel_avisado_en,fecha_visita,oportunidades(${SEL_OPP})&id=in.(${ids.join(",")})`)
    : [];
  const viab = new Map(viabs.map((v) => [v.id, v]));

  const salida: PorHacer[] = [];

  // Los borradores: una fila por viabilidad, junte los escaneos que junte.
  const porViab = new Map<string, EscaneoFila[]>();
  for (const e of escaneos) if (e.viabilidad_id) porViab.set(e.viabilidad_id, [...(porViab.get(e.viabilidad_id) ?? []), e]);
  for (const [id, es] of porViab) {
    const v = viab.get(id);
    if (!v || v.enviada_en) continue;
    const accesos = es.flatMap(accesosDe);
    salida.push({
      viabilidadId: id,
      escaneoId: null,
      direccion: direccionDe(accesos),
      escaleras: escalerasDe(accesos),
      proyecto: proyectoDe(v.oportunidades),
      comercial: v.oportunidades?.comercial?.nombre ?? null,
      escaneos: es.length,
      fechaEscaneo: v.fecha_visita ?? es[0].fecha_escaneo,
      desde: es[0].creado_en,
      borrador: true,
      danielAvisado: !!v.daniel_avisado_en,
      opps: [],
    });
  }

  // Los que aun no se han empezado: uno por escaneo.
  for (const e of escaneos.filter((x) => !x.viabilidad_id)) {
    const accesos = accesosDe(e);
    const opps = await oppsDeAccesos(accesos.map((a) => a.id));
    salida.push({
      viabilidadId: null,
      escaneoId: e.id,
      direccion: direccionDe(accesos),
      escaleras: escalerasDe(accesos),
      proyecto: opps.length === 1 ? proyectoDe(opps[0]) : null,
      comercial: opps.length === 1 ? opps[0].comercial?.nombre ?? null : null,
      escaneos: 1,
      fechaEscaneo: e.fecha_escaneo,
      desde: e.creado_en,
      borrador: false,
      danielAvisado: false,
      opps: opps.map((o) => ({ id: o.id, codigo: o.codigo, nombre: o.nombre, proyecto: proyectoDe(o), comercial: o.comercial?.nombre ?? null })),
    });
  }

  return salida.sort((a, b) => a.desde.localeCompare(b.desde));
}

/** Empezar la viabilidad de un escaneo, para esa opp. La fecha de visita sale
 *  del escaneo: "la fecha que se hizo el escaneo". */
export async function empezar(escaneoId: string, oppId: string, redactaId: string): Promise<string> {
  const [e] = await leer<{ fecha_escaneo: string | null; viabilidad_id: string | null }[]>(
    `escaneados_polycam?select=fecha_escaneo,viabilidad_id&id=eq.${escaneoId}&limit=1`,
  );
  if (!e) throw new Error("Ese escaneo no existe");
  if (e.viabilidad_id) return e.viabilidad_id;
  const [v] = await escribir<{ id: string }[]>("POST", "viabilidades", {
    oportunidad_id: oppId,
    fecha_visita: e.fecha_escaneo,
    redacta_id: redactaId,
  });
  await escribir("PATCH", `escaneados_polycam?id=eq.${escaneoId}`, { viabilidad_id: v.id }, "return=minimal");
  return v.id;
}

// ------------------------------------------------------------- la mesa

export type Mesa = {
  id: string;
  enviada: boolean;
  danielAvisado: boolean;
  /** Por que se atasco, escrito por Alex al avisar a Daniel. */
  motivoAtasco: string | null;
  actualizada: string;
  opp: { id: string; codigo: string | null; nombre: string | null; comercial: string | null; proyecto: string | null } | null;
  direccion: string;
  escalerasTexto: string;
  fechaVisita: string | null;
  objeto: string;
  descripcion: string;
  conclusion: string;
  pem: number | null;
  biPct: number;
  ivaPct: number;
  modeloId: string | null;
  especifico: boolean;
  capturaUrl: string | null;
  escaneos: { id: string; fecha: string | null; nombre: string | null; escaleras: string; rutaPolycam: string | null; descargar: string | null }[];
  escaleras: { accesoId: string; nombre: string; texto: string }[];
  catalogo: { id: string; codigo: string; nombre: string }[];
  /** Escaneos vinculados que aun no estan en ninguna viabilidad: los que se pueden juntar. */
  paraJuntar: { id: string; texto: string }[];
  /** LOS CUATRO PAPELES (Monica, 6-oct-2026): "trazabilidad de intervinientes:
   *  quien hizo la visita y el polycam, quien ve la viabilidad, quien la remato
   *  con los precios y el texto, y quien la firma". Ninguno se elige a mano. */
  /** EL DINERO QUE PONE ALEX: una linea por cosa que se va a ejecutar.
   *
   *  Antes era UNA cifra de PEM. Ella, 6-oct-2026: "imagina que incluimos
   *  aerotermia: eso es un precio como el PEM, que estimamos. Las lineas de Alex
   *  pueden ser UNA O VARIAS". Y el beneficio industrial y el IVA van POR LINEA
   *  "para poder comparar presupuesto de contrata con estimado de viabilidad".
   *
   *  Los HONORARIOS no estan aqui: salen de la hoja de encargo y los pone el
   *  comercial despues, porque "Alex no deberia ver que precios cobramos". */
  lineas: Linea[];
  papeles: {
    /** Quien fue a tomar los datos. Puede ser mas de uno: una viabilidad junta
     *  varios escaneos, y entonces fueron varias personas. */
    visitaron: string[];
    redacta: string | null;
    remata: string | null;
    firma: string | null;
  };
};

export async function mesa(id: string): Promise<Mesa | null> {
  type V = {
    id: string;
    actualizado_en: string;
    enviada_en: string | null;
    daniel_avisado_en: string | null;
    motivo_atasco: string | null;
    fecha_visita: string | null;
    objeto: string | null;
    descripcion_intervenciones: string | null;
    conclusion: string | null;
    pem_estimado: number | null;
    beneficio_industrial_pct: number;
    iva_obra_pct: number;
    modelo_escalera_id: string | null;
    necesita_3d_especifico: boolean;
    captura: string | null;
    viabilidad_conceptos: { grupo: string | null; concepto: string | null; importe: number | null;
                            bi_porcentaje: number | null; iva_porcentaje: number | null; orden: number | null }[];
    oportunidades: OppFila | null;
    relacion_viabilidad_accesos: { acceso_id: string; descripcion: string | null }[];
    redacta: { nombre: string } | null;
    remata: { nombre: string } | null;
    firma: { nombre: string } | null;
  };
  const [v] = await leer<V[]>(
    `viabilidades?select=id,actualizado_en,enviada_en,daniel_avisado_en,motivo_atasco,fecha_visita,objeto,descripcion_intervenciones,conclusion,` +
      `pem_estimado,beneficio_industrial_pct,iva_obra_pct,modelo_escalera_id,necesita_3d_especifico,captura,` +
      `viabilidad_conceptos(grupo,concepto,importe,bi_porcentaje,iva_porcentaje,orden),` +
      `oportunidades(${SEL_OPP}),relacion_viabilidad_accesos(acceso_id,descripcion),` +
      `redacta:redacta_id(nombre),remata:remata_id(nombre),firma:arquitecto_id(nombre)` +
      `&id=eq.${id}&limit=1`,
  );
  if (!v) return null;

  const [escaneos, catalogo, sueltos] = await Promise.all([
    leer<(EscaneoFila & { visito: { nombre: string } | null })[]>(
      `escaneados_polycam?select=${SEL_ESC},visito:visito_id(nombre)&viabilidad_id=eq.${id}&order=fecha_escaneo.asc.nullslast`,
    ),
    leer<{ id: string; codigo: string; nombre: string }[]>("modelos_escalera?select=id,codigo,nombre&activo=is.true&order=orden.asc.nullslast,codigo.asc"),
    leer<EscaneoFila[]>(`escaneados_polycam?select=${SEL_ESC}&viabilidad_id=is.null&order=creado_en.asc`),
  ]);

  // Las escaleras de la viabilidad: las de sus escaneos, sin repetir.
  const accesos = new Map<string, AccesoFila>();
  for (const e of escaneos) for (const a of accesosDe(e)) accesos.set(a.id, a);
  const lista = Array.from(accesos.values()).sort(
    (a, b) => parseInt(a.numero) - parseInt(b.numero) || a.numero.localeCompare(b.numero) || a.escalera.localeCompare(b.escalera, "es", { numeric: true }),
  );
  const variosNumeros = new Set(lista.map((a) => a.numero)).size > 1;
  const texto = new Map(v.relacion_viabilidad_accesos.map((r) => [r.acceso_id, r.descripcion ?? ""]));

  return {
    id: v.id,
    enviada: !!v.enviada_en,
    danielAvisado: !!v.daniel_avisado_en,
    motivoAtasco: v.motivo_atasco,
    actualizada: v.actualizado_en,
    opp: v.oportunidades
      ? {
          id: v.oportunidades.id,
          codigo: v.oportunidades.codigo,
          nombre: v.oportunidades.nombre,
          comercial: v.oportunidades.comercial?.nombre ?? null,
          proyecto: proyectoDe(v.oportunidades),
        }
      : null,
    direccion: direccionDe(lista),
    escalerasTexto: escalerasDe(lista),
    fechaVisita: v.fecha_visita,
    objeto: v.objeto ?? "",
    descripcion: v.descripcion_intervenciones ?? "",
    conclusion: v.conclusion ?? "",
    pem: v.pem_estimado,
    biPct: Number(v.beneficio_industrial_pct),
    ivaPct: Number(v.iva_obra_pct),
    modeloId: v.modelo_escalera_id,
    especifico: v.necesita_3d_especifico,
    capturaUrl: v.captura ? await firmar(v.captura) : null,
    escaneos: await Promise.all(
      escaneos.map(async (e) => ({
        id: e.id,
        fecha: e.fecha_escaneo,
        nombre: e.nombre_original_fichero,
        escaleras: escalerasDe(accesosDe(e)),
        rutaPolycam: e.ruta_polycam,
        descargar: e.polycam ? await firmar(e.polycam) : null,
      })),
    ),
    // Con varias escaleras, una caja por escalera. Con una sola, basta la general.
    escaleras: lista.length > 1 ? lista.map((a) => ({ accesoId: a.id, nombre: nombreDeEscalera(a, variosNumeros), texto: texto.get(a.id) ?? "" })) : [],
    catalogo,
    // Solo las dos que pone Alex. Las de honorarios y subvencion vienen de la
    // hoja de encargo y las mete el comercial despues.
    lineas: (v.viabilidad_conceptos ?? [])
      .filter((c) => c.grupo === "obra" || c.grupo === "tasas")
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((c) => ({
        grupo: c.grupo as "obra" | "tasas",
        concepto: c.concepto ?? "",
        importe: c.importe === null ? null : Number(c.importe),
        biPct: c.bi_porcentaje === null ? 19 : Number(c.bi_porcentaje),
        ivaPct: c.iva_porcentaje === null ? 10 : Number(c.iva_porcentaje),
      })),
    papeles: {
      // De los escaneos que cuelgan de esta viabilidad, sin repetir. Vacio si
      // el correo venia del propio Polycam y no de una persona.
      visitaron: [...new Set(escaneos.map((e) => e.visito?.nombre).filter((x): x is string => Boolean(x)))],
      redacta: v.redacta?.nombre ?? null,
      remata: v.remata?.nombre ?? null,
      firma: v.firma?.nombre ?? null,
    },
    paraJuntar: sueltos.map((e) => ({
      id: e.id,
      texto: `${direccionDe(accesosDe(e))}${escalerasDe(accesosDe(e)) ? " · " + escalerasDe(accesosDe(e)) : ""}${e.fecha_escaneo ? " · " + e.fecha_escaneo.split("-").reverse().join("/") : ""}`,
    })),
  };
}

/** Lo que escribe Alex. Se guarda entero cada vez: es un borrador. */
/** Una linea de dinero de la viabilidad. `grupo` dice de cual de los cuatro
 *  bloques es; aqui solo se tocan los dos que pone Alex. */
export type Linea = {
  grupo: "obra" | "tasas";
  concepto: string;
  importe: number | null;
  /** Beneficio industrial, 19% de serie. Solo tiene sentido en la obra. */
  biPct: number;
  /** Obra 10%, tasas 0: las del ayuntamiento no llevan IVA. */
  ivaPct: number;
};

export type DatosMesa = {
  fechaVisita: string | null;
  objeto: string;
  descripcion: string;
  conclusion: string;
  pem: number | null;
  biPct: number;
  ivaPct: number;
  modeloId: string | null;
  especifico: boolean;
  escaleras: { accesoId: string; texto: string }[];
  lineas: Linea[];
};

export async function guardar(id: string, d: DatosMesa): Promise<void> {
  await escribir(
    "PATCH",
    `viabilidades?id=eq.${id}`,
    {
      fecha_visita: d.fechaVisita || null,
      objeto: d.objeto.trim() || null,
      descripcion_intervenciones: d.descripcion.trim() || null,
      conclusion: d.conclusion.trim() || null,
      pem_estimado: d.pem,
      beneficio_industrial_pct: d.biPct,
      iva_obra_pct: d.ivaPct,
      modelo_escalera_id: d.especifico ? null : d.modeloId,
      necesita_3d_especifico: d.especifico,
      actualizado_en: new Date().toISOString(),
    },
    "return=minimal",
  );
  // LAS LINEAS SE REEMPLAZAN, no se actualizan una a una: son pocas y asi
  // quitar una es quitarla de verdad, sin restos. Solo se tocan las de Alex;
  // las de honorarios y subvencion las pone el comercial y no se pisan.
  await escribir(
    "DELETE",
    `viabilidad_conceptos?viabilidad_id=eq.${id}&grupo=in.(obra,tasas)`,
    undefined,
    "return=minimal",
  );
  const utiles = d.lineas.filter((l) => l.concepto.trim() || l.importe !== null);
  if (utiles.length) {
    await escribir(
      "POST",
      "viabilidad_conceptos",
      utiles.map((l, n) => ({
        viabilidad_id: id,
        grupo: l.grupo,
        concepto: l.concepto.trim() || null,
        importe: l.importe,
        bi_porcentaje: l.grupo === "obra" ? l.biPct : null,
        iva_porcentaje: l.ivaPct,
        seleccionado: true,
        orden: n,
      })),
      "return=minimal",
    );
  }

  if (d.escaleras.length) {
    await escribir(
      "POST",
      "relacion_viabilidad_accesos?on_conflict=viabilidad_id,acceso_id",
      d.escaleras.map((e) => ({ viabilidad_id: id, acceso_id: e.accesoId, descripcion: e.texto.trim() || null })),
      "resolution=merge-duplicates,return=minimal",
    );
  }
}

/** La captura del 3D: una por viabilidad, la ultima que guarda Alex. */
export async function guardarCaptura(id: string, jpeg: Buffer): Promise<string | null> {
  const ruta = `viabilidades/${id}/captura.jpg`;
  await subir(ruta, jpeg, "image/jpeg");
  await escribir("PATCH", `viabilidades?id=eq.${id}`, { captura: ruta, actualizado_en: new Date().toISOString() }, "return=minimal");
  return firmar(ruta);
}

/** Juntar otro escaneo a esta viabilidad. Solo si no esta ya en otra. */
export async function juntar(id: string, escaneoId: string): Promise<void> {
  await escribir("PATCH", `escaneados_polycam?id=eq.${escaneoId}&viabilidad_id=is.null`, { viabilidad_id: id }, "return=minimal");
}

export async function marcar(id: string, que: "enviada_en"): Promise<void> {
  await escribir("PATCH", `viabilidades?id=eq.${id}`, { [que]: new Date().toISOString() }, "return=minimal");
}

/** "Me he atascado": la hora y EL PORQUE, juntos (la base no deja una sin el
 *  otro). La nota de Sali en el diario de la opp la escribe la base sola.
 *  Devuelve la direccion del escaneo: es el asunto del correo a Daniel. */
export async function avisarDaniel(id: string, motivo: string): Promise<string> {
  await escribir(
    "PATCH",
    `viabilidades?id=eq.${id}`,
    { daniel_avisado_en: new Date().toISOString(), motivo_atasco: motivo },
    "return=minimal",
  );
  const escaneos = await leer<EscaneoFila[]>(`escaneados_polycam?select=${SEL_ESC}&viabilidad_id=eq.${id}`);
  return direccionDe(escaneos.flatMap(accesosDe));
}
