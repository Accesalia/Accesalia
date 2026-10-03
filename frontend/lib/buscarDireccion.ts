// lib/buscarDireccion.ts
//
// LA VENTANA "BUSCAR LA DIRECCION" DEL ALTA DE OPORTUNIDAD (Monica, 3-oct-2026).
//
// El comercial escribe UNA linea como la diria ("carretas 15 madrid"), casi
// nunca con el tipo de via y muchas veces sin municipio. De ahi, paso a paso y
// preguntando solo lo que haga falta:
//
//   1. se parte la linea en calle, numero y municipio, y se ENSEÑA antes de
//      buscar -no se adivina en silencio-;
//   2. sin municipio: en que municipios existe esa calle;
//   3. varias vias en el municipio (calle / travesia): cual es;
//   4. Catastro por la direccion: si hay bis, cual (o los dos);
//   5. Catastro por la PARCELA entera, que es la unica forma de ver las demas
//      escaleras y los demas numeros: preguntando solo por la direccion,
//      Etruria 26 no enseña a Etruria 28 ni a Lucano 65;
//   6. al CONFIRMAR, se guarda la ficha en ficha_catastro / _portal /
//      _inmueble. Este es el disparador de la ficha: una direccion concreta,
//      cuando el comercial dice que es esa, nunca en barridos.
//
// Las reglas de cotejo son las del callejero (lib/callejero.ts): conjuntos de
// palabras, no cadenas. La ficha se guarda igual que la guardaba el barrido del
// 1-oct (lib/fichaCatastro.ts, retirado el 3-oct), que es de donde sale.
//
// CORRE EN LA APP Y NO EN UN PORTATIL: las credenciales son las de Vercel.

import "server-only";

import { buscarVia, claveDeVia, sinTildes, textoDeVia } from "./callejero";
import { bonito, NOMBRE_TIPO, type Portal } from "./direccionNombre";

export type { Portal };

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const cabJson = { ...cab, "Content-Type": "application/json" };

const OVC = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json";
const COORDENADAS =
  "https://ovc.catastro.meh.es/ovcservweb/ovcswlocalizacionrc/ovccoordenadas.asmx/Consulta_CPMRC";

// ------------------------------------------------------------------ Supabase

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function meter<T>(tabla: string, filas: unknown[], conflicto: string): Promise<T[]> {
  if (!filas.length) return [];
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?on_conflict=${conflicto}`, {
    method: "POST",
    headers: { ...cabJson, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(filas),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T[]>;
}

// -------------------------------------------------------------------- Catastro

function comoLista<T>(x: T | T[] | undefined | null): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

async function pedir(url: string): Promise<string> {
  let ultimo = "";
  for (let i = 0; i < 3; i += 1) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Accesalia CRM" }, cache: "no-store" });
      if (!r.ok) throw new Error(`Catastro ${r.status}`);
      return await r.text();
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
      await new Promise((s) => setTimeout(s, 1000 * (i + 1)));
    }
  }
  throw new Error(`Catastro no contesta: ${ultimo}`);
}

type Finca = {
  rc?: { pc1?: string; pc2?: string; car?: string; cc1?: string; cc2?: string };
  dt?: {
    np?: string;
    nm?: string;
    loine?: { cp?: string; cm?: string };
    locs?: {
      lous?: {
        lourb?: {
          dir?: { tv?: string; nv?: string; pnp?: string; snp?: string; plp?: string; cv?: string };
          loint?: { es?: string; pt?: string; pu?: string };
          dp?: string;
          dm?: string;
        };
      };
    };
  };
  debi?: { luso?: string; sfc?: string; cpt?: string; ant?: string };
};

const parcelaDe = (f: Finca) => `${f.rc?.pc1 ?? ""}${f.rc?.pc2 ?? ""}`;
const referenciaDe = (f: Finca) =>
  `${f.rc?.pc1 ?? ""}${f.rc?.pc2 ?? ""}${f.rc?.car ?? ""}${f.rc?.cc1 ?? ""}${f.rc?.cc2 ?? ""}`;

function sitio(f: Finca) {
  const lo = f.dt?.locs?.lous?.lourb ?? {};
  const pnp = String(lo.dir?.pnp ?? "");
  // EL BIS. Catastro no escribe "6 bis": escribe el 6 con la letra en `plp`
  // (Los Lilos 6 y Los Lilos 6 "B", Alcorcon, son dos parcelas). En la base ya
  // va como "36(B)", tanto en `accesos` como en los portales: se sigue igual.
  const plp = String(lo.dir?.plp ?? "").trim();
  return {
    tipo_via: lo.dir?.tv ?? "",
    nombre_via: lo.dir?.nv ?? "",
    numero: plp ? `${pnp}(${plp})` : pnp,
    numero2: String(lo.dir?.snp ?? "") === "0" ? "" : String(lo.dir?.snp ?? ""),
    codigo_via: lo.dir?.cv ?? "",
    // "escalera" es lo que Catastro llama `es`. Se guarda como cadena vacia
    // cuando no hay, para que los unicos de las tablas funcionen.
    escalera: (lo.loint?.es ?? "").trim(),
    planta: (lo.loint?.pt ?? "").trim(),
    puerta: (lo.loint?.pu ?? "").trim(),
    cp: lo.dp ?? "",
    distrito: lo.dm ?? "",
  };
}

function numero(x: string | undefined): number | null {
  if (!x) return null;
  const n = Number(String(x).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ============================================================ 1 · partir la linea

/** Los tipos de via como se escriben, y su sigla de Catastro. */
const TIPOS: Record<string, string> = {
  C: "CL", CL: "CL", CALLE: "CL",
  AV: "AV", AVD: "AV", AVDA: "AV", AVENIDA: "AV",
  PZ: "PZ", PL: "PZ", PZA: "PZ", PLAZA: "PZ",
  PS: "PS", PO: "PS", PASEO: "PS",
  TR: "TR", TRAV: "TR", TRAVESIA: "TR",
  CM: "CM", CAMINO: "CM",
  CR: "CR", CTRA: "CR", CARRETERA: "CR",
  RD: "RD", RONDA: "RD",
  GL: "GL", GTA: "GL", GLORIETA: "GL",
  PJ: "PJ", PASAJE: "PJ",
  CJ: "CJ", CALLEJON: "CJ",
  UR: "UR", URBANIZACION: "UR",
  BO: "BO", BARRIO: "BO",
  CO: "CO", COLONIA: "CO",
  PQ: "PQ", PARQUE: "PQ",
  VR: "VR", VEREDA: "VR",
  SD: "SD", SENDA: "SD",
  CA: "CA", CAÑADA: "CA",
};

export type Municipio = { nombre: string; clave: string; provincia: string };

let municipiosEnMemoria: Municipio[] | null = null;
async function municipios(): Promise<Municipio[]> {
  if (!municipiosEnMemoria) {
    municipiosEnMemoria = await leer<Municipio[]>(
      "municipios_catastro?select=nombre,clave,provincia&order=nombre",
    );
  }
  return municipiosEnMemoria;
}

export type Entendido = {
  /** Lo que escribio, tal cual: es el nombre provisional si se cierra. */
  escrito: string;
  /** Sigla de Catastro si la escribio delante (calle, avda...), o "". */
  tipo: string;
  calle: string;
  numero: string;
  /** Nombre oficial del municipio, o "" si no lo escribio o no lo conozco. */
  municipio: string;
};

/**
 * Parte "carretas 15 madrid" en calle / numero / municipio. Las reglas son las
 * del cotejo del buzon (lib/buzonPolycam.ts), que ya se equivocaron una vez
 * cada una contra las 1.228 direcciones de Monica:
 *
 *   · el numero parte la linea: lo de delante es la calle, lo de detras el
 *     municipio (y la escalera, el bis... que aqui no se usan);
 *   · el tipo de via se quita SOLO si va delante, que es donde hace de tipo;
 *   · el municipio se descuenta SOLO si no es la calle: en "torrejon 12
 *     torrejon de ardoz" la calle es Torrejon;
 *   · empate de municipios: gana el que tiene mas palabras, para que "humanes
 *     de madrid" no se quede en Madrid.
 */
export async function partirLinea(escrito: string): Promise<Entendido> {
  const llano = sinTildes(escrito)
    // "nº 15", "n° 15": el signo fuera. Solo con el signo: "NO" a secas es el
    // principio de NOVICIADO.
    .replace(/\bN\s*[º°]\s*/g, " ")
    .replace(/[^A-Z0-9Ñ\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const palabras = llano.split(" ").filter(Boolean);

  // El primer numero que tenga calle delante.
  let i = palabras.findIndex((p, k) => k > 0 && /^\d/.test(p));
  let calle = i >= 0 ? palabras.slice(0, i) : palabras.slice();
  const num = i >= 0 ? palabras[i].replace(/^(\d+).*$/, "$1") : "";
  const resto = i >= 0 ? palabras.slice(i + 1) : [];

  let tipo = "";
  if (calle.length > 1 && TIPOS[calle[0]]) {
    tipo = TIPOS[calle[0]];
    calle = calle.slice(1);
  }

  // El municipio: el de mas palabras cuyas palabras esten TODAS en lo que va
  // detras del numero. Sin numero, se busca al final de la propia linea, y solo
  // si deja calle delante.
  const lista = await municipios();
  const elegir = (bolsa: string[]) => {
    const hay = new Set(bolsa);
    let mejor: Municipio | null = null;
    for (const m of lista) {
      const ps = m.clave.split(" ").filter(Boolean);
      if (ps.length && ps.every((p) => hay.has(p)) && (!mejor || ps.length > mejor.clave.split(" ").length)) mejor = m;
    }
    return mejor;
  };
  let muni = elegir(resto);
  if (!muni && i < 0) {
    for (let corte = 1; corte < calle.length && !muni; corte += 1) {
      const cola = calle.slice(-corte);
      const m = elegir(cola);
      if (m && m.clave.split(" ").length === claveDeVia(cola.join(" ")).split(" ").length) {
        muni = m;
        calle = calle.slice(0, -corte);
      }
    }
  }

  return {
    escrito: escrito.trim(),
    tipo,
    calle: calle.join(" ").toLowerCase(),
    numero: num,
    municipio: muni?.nombre ?? "",
  };
}

// ======================================================= 2 · 3 · buscar la calle

export type Via = { tipo: string; nombre: string; municipio: string; provincia: string };

export type BuscarCalle =
  | { paso: "municipios"; municipios: { nombre: string; vias: number }[]; parecidas: boolean }
  | { paso: "vias"; municipio: string; vias: Via[]; parecidas: boolean }
  | { paso: "nada"; motivo: string };

/** El municipio escrito, con su nombre oficial. */
export async function municipioOficial(texto: string): Promise<Municipio | null> {
  const clave = claveDeVia(texto);
  if (!clave) return null;
  return (await municipios()).find((m) => m.clave === clave) ?? null;
}

/**
 * Busca la calle. Con municipio, en ese municipio (lib/callejero.ts, cuatro
 * pasadas de la mas fiable a la menos). Sin el, en TODOS los del callejero, y
 * devuelve la lista de municipios para que el comercial elija: nunca se elige
 * por el.
 */
export async function buscarCalle(calle: string, municipio: string, tipo: string): Promise<BuscarCalle> {
  if (!claveDeVia(calle)) return { paso: "nada", motivo: "Falta el nombre de la calle." };

  if (municipio) {
    const m = await municipioOficial(municipio);
    if (!m) return { paso: "nada", motivo: `No conozco el municipio «${municipio}».` };
    const halladas = await buscarVia(m.nombre, calle);
    if (!halladas.length) return { paso: "nada", motivo: "" };
    let vias: Via[] = halladas.map((v) => ({ tipo: v.tipo_via, nombre: v.nombre, municipio: v.municipio, provincia: v.provincia }));
    // EL CANDADO DEL TIPO: si escribio "plaza" y hay una plaza, las demas no
    // son esa calle. Si no hay ninguna de ese tipo, se enseñan todas: el que
    // se equivoca de tipo es el comercial mas a menudo que Catastro.
    if (tipo) {
      const delTipo = vias.filter((v) => v.tipo === tipo || (tipo === "PZ" && v.tipo === "PL"));
      if (delTipo.length) vias = delTipo;
    }
    return { paso: "vias", municipio: m.nombre, vias, parecidas: halladas[0].como === "parecida" };
  }

  // Sin municipio. Primero por la clave de palabras (la misma calle escrita
  // igual en todos los pueblos); si no sale nada, por las seis primeras letras
  // de la palabra mas larga, que es lo que pilla las erratas (ALBUFERRA ->
  // ALBUFE -> ALBUFERA), igual que buscarVia con municipio.
  const campos = "tipo_via,municipios_catastro!inner(nombre)";
  type Fila = { tipo_via: string; municipios_catastro: { nombre: string } };
  let filas = await leer<Fila[]>(`vias_catastro?select=${campos}&clave=eq.${encodeURIComponent(claveDeVia(calle))}&limit=500`);
  const parecidas = !filas.length;
  if (!filas.length) {
    const larga = textoDeVia(calle).split(" ").sort((a, b) => b.length - a.length)[0] ?? "";
    if (larga.length >= 4) {
      filas = await leer<Fila[]>(
        `vias_catastro?select=${campos}&busqueda=ilike.*${encodeURIComponent(larga.slice(0, 6).replace(/[NÑ]/g, "_"))}*&limit=500`,
      );
    }
  }
  const cuenta = new Map<string, number>();
  for (const f of filas) cuenta.set(f.municipios_catastro.nombre, (cuenta.get(f.municipios_catastro.nombre) ?? 0) + 1);
  const lista = Array.from(cuenta, ([nombre, vias]) => ({ nombre, vias })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  if (!lista.length) return { paso: "nada", motivo: "" };
  if (lista.length === 1) return buscarCalle(calle, lista[0].nombre, tipo);
  return { paso: "municipios", municipios: lista, parecidas };
}

// ======================================================= 4 · Catastro por numero

export type Edificio = { parcela: string; numero: string; etiqueta: string };

export type BuscarNumero =
  | { paso: "edificios"; edificios: Edificio[] }
  | { paso: "sin_numero"; sugeridos: string[] }
  | { paso: "sin_via" };

/**
 * Pregunta a Catastro por la direccion. Contesta de tres formas y hay que leer
 * las tres (docs/catastro-y-urbanismo-madrid.md): lista, uno solo, o error. Y
 * el error no es uno: «la via no existe» (33) y «el numero no existe» (43) son
 * dos pasos distintos de la ventana.
 */
export async function buscarNumero(via: Via, num: string): Promise<BuscarNumero> {
  const q = new URLSearchParams({
    Provincia: via.provincia,
    Municipio: via.municipio,
    Sigla: via.tipo,
    Calle: via.nombre,
    Numero: num,
    Bloque: "",
    Escalera: "",
    Planta: "",
    Puerta: "",
  });
  const d = JSON.parse(await pedir(`${OVC}/Consulta_DNPLOC?${q}`)) as {
    consulta_dnplocResult?: {
      lrcdnp?: { rcdnp?: Finca | Finca[] };
      bico?: { bi?: Finca };
      numerero?: { nump?: { num?: { pnp?: string } } | { num?: { pnp?: string } }[] };
      lerr?: { cod?: string; des?: string } | { cod?: string; des?: string }[];
    };
  };
  const r = d.consulta_dnplocResult ?? {};
  let fincas = comoLista(r.lrcdnp?.rcdnp);
  if (!fincas.length && r.bico?.bi) fincas = [r.bico.bi];

  if (fincas.length) {
    // Un edificio por parcela. Dos parcelas en el mismo numero son el bis.
    const porParcela = new Map<string, Edificio>();
    for (const f of fincas) {
      const p = parcelaDe(f);
      if (!p || porParcela.has(p)) continue;
      const s = sitio(f);
      porParcela.set(p, {
        parcela: p,
        numero: s.numero,
        etiqueta: `${NOMBRE_TIPO[s.tipo_via] ?? s.tipo_via} ${bonito(s.nombre_via)} ${s.numero.replace(/\((\w+)\)/, " $1")}`,
      });
    }
    return { paso: "edificios", edificios: Array.from(porParcela.values()) };
  }

  // La lista de numeros que SI hay viene a veces y a veces no (Carretas 41 de
  // Madrid: solo "el numero no existe"). Y cuando viene no es completa: en CL
  // PARLA de Getafe dijo que solo estaba el 25, y el 20 existe. Vale de pista.
  const sugeridos = comoLista(r.numerero?.nump)
    .map((n) => n.num?.pnp ?? "")
    .filter(Boolean);
  if (sugeridos.length) return { paso: "sin_numero", sugeridos };
  const errores = comoLista(r.lerr);
  if (errores.some((e) => e.cod === "33" || /VIA NO EXISTE/i.test(e.des ?? ""))) return { paso: "sin_via" };
  return { paso: "sin_numero", sugeridos: [] };
}

// ================================================= 5 · la parcela entera

async function fincasDeParcela(parcela: string): Promise<{ fincas: Finca[]; crudo: string; finca?: { ldt?: string; ltp?: string; dff?: { ss?: string } } }> {
  const crudo = await pedir(`${OVC}/Consulta_DNPRC?RefCat=${parcela}&Provincia=&Municipio=`);
  const d = JSON.parse(crudo) as {
    consulta_dnprcResult?: {
      control?: { cuerr?: number };
      lerr?: { des?: string } | { des?: string }[];
      bico?: { bi?: Finca; finca?: { ldt?: string; ltp?: string; dff?: { ss?: string } } };
      lrcdnp?: { rcdnp?: Finca | Finca[] };
    };
  };
  const res = d.consulta_dnprcResult ?? {};
  if (res.control?.cuerr) throw new Error(comoLista(res.lerr)[0]?.des ?? "Catastro devuelve error");
  let fincas = comoLista(res.lrcdnp?.rcdnp);
  if (!fincas.length && res.bico?.bi) fincas = [res.bico.bi];
  return { fincas, crudo, finca: res.bico?.finca };
}

/** Los portales (numero + escalera) de una o varias parcelas, sin guardar nada. */
export async function portalesDe(parcelas: string[]): Promise<Portal[]> {
  const salida = new Map<string, Portal>();
  for (const parcela of parcelas) {
    const { fincas } = await fincasDeParcela(parcela);
    for (const f of fincas) {
      const s = sitio(f);
      const clave = `${parcela}|${s.numero}|${s.escalera}`;
      const p = salida.get(clave) ?? {
        clave, parcela, tipo_via: s.tipo_via, nombre_via: s.nombre_via, numero: s.numero, escalera: s.escalera, viviendas: 0,
      };
      if (f.debi?.luso === "Residencial") p.viviendas += 1;
      salida.set(clave, p);
    }
  }
  return Array.from(salida.values()).sort(
    (a, b) =>
      a.nombre_via.localeCompare(b.nombre_via) ||
      parseInt(a.numero) - parseInt(b.numero) ||
      a.numero.localeCompare(b.numero) ||
      a.escalera.localeCompare(b.escalera, "es", { numeric: true }),
  );
}

// ======================================================= 6 · guardar la ficha

/**
 * Baja la ficha de una parcela y la guarda entera: parcela, portales e
 * inmuebles. Es la de lib/fichaCatastro.ts (1-oct) sin el barrido. Se puede
 * repetir: todo va con "si ya esta, se actualiza".
 */
export async function guardarFicha(parcela: string): Promise<{ id: string; portales: { id: string; numero: string; escalera: string }[] }> {
  const { fincas, crudo, finca } = await fincasDeParcela(parcela);
  if (!fincas.length) throw new Error("la referencia no devuelve ni una finca");

  const primera = fincas[0];
  const s = sitio(primera);

  const usos: Record<string, number> = {};
  const plantas = new Set<string>();
  let superficie = 0;
  let viviendas = 0;
  for (const f of fincas) {
    const uso = f.debi?.luso ?? "?";
    usos[uso] = (usos[uso] ?? 0) + 1;
    if (uso === "Residencial") viviendas += 1;
    superficie += numero(f.debi?.sfc) ?? 0;
    const p = sitio(f).planta;
    if (p) plantas.add(p);
  }
  const { lat, lng } = await coordenadas(parcela);

  const [fila] = await meter<{ id: string }>(
    "ficha_catastro",
    [
      {
        referencia: parcela,
        direccion: finca?.ldt ?? null,
        tipo_parcela: finca?.ltp ?? null,
        municipio: primera.dt?.nm ?? null,
        provincia: primera.dt?.np ?? null,
        cp: s.cp || null,
        anio: numero(primera.debi?.ant),
        inmuebles: fincas.length,
        viviendas,
        superficie: Math.round(superficie) || null,
        superficie_suelo: numero(finca?.dff?.ss),
        plantas: [...plantas].sort(),
        usos,
        tipo_via: s.tipo_via || null,
        nombre_via: s.nombre_via || null,
        numero: s.numero || null,
        numero2: s.numero2 || null,
        codigo_via: s.codigo_via || null,
        distrito_municipal: s.distrito || null,
        ine_provincia: primera.dt?.loine?.cp ?? null,
        ine_municipio: primera.dt?.loine?.cm ?? null,
        lat,
        lng,
        bruto: JSON.parse(crudo),
        consultado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      },
    ],
    "referencia",
  );
  const fichaId = fila.id;

  const porPortal = new Map<
    string,
    { numero: string; escalera: string; inmuebles: number; viviendas: number; superficie: number;
      plantas: Set<string>; usos: Record<string, number>; tipo_via: string; nombre_via: string }
  >();
  for (const f of fincas) {
    const t = sitio(f);
    const clave = `${t.numero}|${t.escalera}`;
    let p = porPortal.get(clave);
    if (!p) {
      p = { numero: t.numero, escalera: t.escalera, inmuebles: 0, viviendas: 0, superficie: 0,
            plantas: new Set(), usos: {}, tipo_via: t.tipo_via, nombre_via: t.nombre_via };
      porPortal.set(clave, p);
    }
    p.inmuebles += 1;
    const uso = f.debi?.luso ?? "?";
    p.usos[uso] = (p.usos[uso] ?? 0) + 1;
    if (uso === "Residencial") p.viviendas += 1;
    p.superficie += numero(f.debi?.sfc) ?? 0;
    if (t.planta) p.plantas.add(t.planta);
  }

  const portales = await meter<{ id: string; numero: string; escalera: string }>(
    "ficha_catastro_portal",
    [...porPortal.values()].map((p) => ({
      ficha_id: fichaId,
      tipo_via: p.tipo_via || null,
      nombre_via: p.nombre_via || null,
      numero: p.numero,
      escalera: p.escalera,
      inmuebles: p.inmuebles,
      viviendas: p.viviendas,
      superficie: Math.round(p.superficie) || null,
      plantas: [...p.plantas].sort(),
      usos: p.usos,
    })),
    "ficha_id,numero,escalera",
  );
  const idPortal = new Map(portales.map((p) => [`${p.numero}|${p.escalera ?? ""}`, p.id]));

  // De doscientos en doscientos: hay parcelas con miles de inmuebles.
  const inmuebles = fincas
    .map((f) => {
      const t = sitio(f);
      const ref = referenciaDe(f);
      if (!ref) return null;
      return {
        ficha_id: fichaId,
        portal_id: idPortal.get(`${t.numero}|${t.escalera}`) ?? null,
        referencia: ref,
        numero: t.numero || null,
        escalera: t.escalera || null,
        planta: t.planta || null,
        puerta: t.puerta || null,
        uso: f.debi?.luso ?? null,
        superficie: numero(f.debi?.sfc),
        coeficiente: numero(f.debi?.cpt),
      };
    })
    .filter((x) => x !== null);
  for (let k = 0; k < inmuebles.length; k += 200) {
    await meter("ficha_catastro_inmueble", inmuebles.slice(k, k + 200), "referencia");
  }

  return { id: fichaId, portales: portales.map((p) => ({ id: p.id, numero: p.numero, escalera: p.escalera ?? "" })) };
}

/** Las coordenadas de la parcela. Si fallan no se para: es un dato menos. */
async function coordenadas(parcela: string): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const x = await pedir(`${COORDENADAS}?Provincia=&Municipio=&SRS=EPSG:4326&RC=${parcela}`);
    const saca = (etiqueta: string) => {
      const m = new RegExp(`<${etiqueta}>([-\\d.,]+)</${etiqueta}>`).exec(x);
      return m ? Number(m[1].replace(",", ".")) : null;
    };
    return { lat: saca("ycen"), lng: saca("xcen") };
  } catch {
    return { lat: null, lng: null };
  }
}
