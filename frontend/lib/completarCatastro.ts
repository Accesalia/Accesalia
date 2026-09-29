import "server-only";
import { porDireccion } from "./catastro";

// ============================================================================
// COMPLETAR LAS COMUNIDADES CONTRA CATASTRO (Monica, 29-sep-2026)
//
// Rellena referencia_catastral, lat, lng y cp de las 1.228 comunidades entrando
// SOLO POR LA DIRECCION. Decision suya, y con su razon:
//
//   "Las que tienen coordenadas vamos a suponer que NO las tienen: las
//    coordenadas solo despistan. Entremos por direccion y partimos de cero y
//    BIEN. Las sobrescribiria, no me dan ninguna confianza."
//
// Y tenia razon: probando quince, TRES coordenadas guardadas caian en la parcela
// del vecino. Venian de otra fuente y estaban unos metros desplazadas.
//
// Tampoco se da por buena la referencia que ya hubiera: "puede estar mal porque
// lo este de origen o porque la hayamos traspasado mal al parsear. SOLO me
// fiaria de la direccion, que es la que revise personalmente".
//
// REGLAS QUE NO SE SALTAN:
//   * `comunidades.nombre` NO SE TOCA. Son 26 dias suyos a mano.
//   * Solo se escribe cuando sale UNA finca. Varias, ninguna o direccion que no
//     se puede partir van a `cotejo_catastro` y esa fila no se toca.
//   * La direccion OFICIAL de Catastro se guarda en `cotejo_catastro`, nunca en
//     `comunidades`: alli manda la suya. Las dos son verdad.
//
// ESTO CORRE EN LA APP Y NO EN UN PORTATIL, y no es un detalle: la primera
// version leyo `frontend/.env.local` creyendo que eran credenciales de
// produccion y resulta que apuntaba a 127.0.0.1. Escribio en una base local con
// datos de julio. Aqui las credenciales son las de Vercel y no hay duda posible.
//
// LO QUE COSTO ENCONTRAR, probado y no supuesto (probado sobre 40 comunidades
// que ya tenian referencia: saco la MISMA en 34 y no contradijo ninguna):
//
//   * LA SIGLA ES OBLIGATORIA. Con el campo vacio Catastro contesta SIEMPRE
//     "no existe ningun inmueble", hasta para direcciones que existen.
//   * NO SE PUEDE QUITAR LA EÑE. Castañeda y Cañada sin eñe "no existen".
//   * Al quitar la sigla, "PLAZA DE LA INMACULADA" se queda en "DE LA
//     INMACULADA", que no existe: hay que probar tambien sin el articulo.
//   * El numero puede llevar letra pegada ("32B") o ser un rango ("38-40").
// ============================================================================

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const cabJson = { ...cab, "Content-Type": "application/json" };

const COORDENADAS = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx";
const PAUSA = 250; // Catastro corta si se va deprisa. Ya paso esta mañana.

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Quita tildes PERO NO LA EÑE: Catastro escribe CASTAÑEDA y CAÑADA con eñe, y
 *  sin ella contesta que la via no existe. */
function sinTildes(t: string): string {
  return t
    .normalize("NFD")
    .replace(/ñ/g, "\u0001")
    .replace(/Ñ/g, "\u0002")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0001/g, "ñ")
    .replace(/\u0002/g, "Ñ")
    .toUpperCase();
}

const SIGLAS: Record<string, string> = {
  AV: "AV", AVDA: "AV", AVENIDA: "AV", CL: "CL", CALLE: "CL",
  PZ: "PZ", PLAZA: "PZ", PLZ: "PZ", PS: "PS", PASEO: "PS", PO: "PS",
  TR: "TR", TRAVESIA: "TR", CM: "CM", CAMINO: "CM",
  CR: "CR", CTRA: "CR", CARRETERA: "CR", RD: "RD", RONDA: "RD",
  GL: "GL", GTA: "GL", GLORIETA: "GL", UR: "UR", URBANIZACION: "UR",
};
// Cuando la direccion no trae sigla se prueban estas, y SOLO estas. Con las
// diez, una direccion que no existe costaba veinte consultas y once segundos:
// cuarenta de esas no caben en los cinco minutos que dura la funcion. Estas
// cinco cubren practicamente todo el callejero de sus barrios.
const TODAS = ["CL", "AV", "PZ", "CM", "PS"];

export type Partida = { sigla: string; calle: string; numero: string };

/** De "AV DR MENDIGUCHIA CARRICHE 27 LEGANES" saca sigla AV, calle y numero. */
export function partir(nombre: string, municipio: string | null): Partida | null {
  let t = sinTildes(nombre ?? "").trim().replace(/^[.,\-\s]+|[.,\-\s]+$/g, "");
  const m = sinTildes(municipio ?? "").trim();
  if (m && t.endsWith(m)) t = t.slice(0, -m.length).replace(/[.,\-\s]+$/g, "");

  // Lo que cuelga DETRAS del numero y sobra para buscar.
  t = t.split(/\b(?:PORTAL|PTAL|BLOQUE|BLQ|FASE|ESCALERA|ESC|LOCAL|BIS|PTA)\b/)[0]
    .replace(/[.,\-\s]+$/g, "");

  let sigla = "";
  const primera = t.split(" ")[0] ?? "";
  if (SIGLAS[primera]) {
    sigla = SIGLAS[primera];
    t = t.slice(primera.length).trim();
  }

  const mm = /\d+/.exec(t);
  if (!mm) return null;
  const calle = t.slice(0, mm.index).replace(/[.,\-\s]+$/g, "").trim();
  if (!calle) return null;
  return { sigla, calle, numero: mm[0] };
}

async function coordenadasDe(referencia: string): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const r = await fetch(
      `${COORDENADAS}/Consulta_CPMRC?Provincia=&Municipio=&SRS=EPSG:4326&RC=${referencia}`,
      { cache: "no-store" },
    );
    if (!r.ok) return { lat: null, lng: null };
    const xml = await r.text();
    const x = /<xcen>([^<]+)<\/xcen>/.exec(xml)?.[1];
    const y = /<ycen>([^<]+)<\/ycen>/.exec(xml)?.[1];
    return x && y ? { lat: Number(y), lng: Number(x) } : { lat: null, lng: null };
  } catch {
    return { lat: null, lng: null };
  }
}

export type Comunidad = { id: string; nombre: string; municipio: string | null; provincia: string | null };

export type Cotejo = {
  estado: "una" | "varias" | "no" | "rara" | "fallo";
  referencia?: string;
  lat?: number | null;
  lng?: number | null;
  cp?: string | null;
  direccionOficial?: string;
  dice?: string;
  candidatos?: unknown;
  buscado?: Partida | null;
};

/** Pregunta a Catastro por UNA comunidad. No escribe nada. */
export async function cotejarUna(c: Comunidad): Promise<Cotejo> {
  const p = partir(c.nombre, c.municipio);
  if (!p) return { estado: "rara", dice: "no se puede partir la dirección", buscado: null };

  const siglas = p.sigla ? [p.sigla] : TODAS;
  // Al quitar la sigla, "PLAZA DE LA INMACULADA" se queda en "DE LA INMACULADA",
  // que no existe. La via se llama "INMACULADA".
  const corta = p.calle.replace(/^(?:DE\s+)?(?:LA|LAS|LOS|EL)\s+|^DE\s+/, "").trim();
  const nombres = corta && corta !== p.calle ? [p.calle, corta] : [p.calle];

  let ultimo = "sin resultados";
  for (const sg of siglas) {
    for (const nom of nombres) {
      await esperar(PAUSA);
      let fincas;
      try {
        fincas = await porDireccion({
          provincia: c.provincia ?? "",
          municipio: c.municipio ?? "",
          sigla: sg,
          calle: nom,
          numero: p.numero,
        });
      } catch (e) {
        ultimo = e instanceof Error ? e.message : String(e);
        continue;
      }
      if (fincas.length === 0) continue;

      if (fincas.length > 1)
        return {
          estado: "varias",
          dice: `${fincas.length} fincas en ${sg} ${nom} ${p.numero}`,
          candidatos: fincas,
          buscado: { sigla: sg, calle: nom, numero: p.numero },
        };

      const f = fincas[0];
      await esperar(PAUSA);
      const { lat, lng } = await coordenadasDe(f.referencia);
      return {
        estado: "una",
        referencia: f.referencia,
        lat, lng,
        cp: f.cp,
        direccionOficial: f.direccion,
        buscado: { sigla: sg, calle: nom, numero: p.numero },
      };
    }
  }
  return { estado: "no", dice: ultimo.slice(0, 200), buscado: p };
}

export type ResultadoTanda = {
  hechas: number;
  escritas: number;
  quedan: number;
  cuenta: Record<string, number>;
  segundos: number;
};

/** Una tanda. Se llama tantas veces como haga falta: lo hecho no se repite,
 *  porque `cotejo_catastro` lleva la cuenta. Los 'fallo' SI se reintentan. */
export async function completarTanda(cuantas = 40): Promise<ResultadoTanda> {
  const t0 = Date.now();

  const lista = (await pendientes()).slice(0, cuantas);

  const cuenta: Record<string, number> = {};
  let escritas = 0;

  for (const c of lista) {
    let resultado: Cotejo;
    try {
      resultado = await cotejarUna(c);
    } catch (e) {
      resultado = { estado: "fallo", dice: e instanceof Error ? e.message : String(e) };
    }
    cuenta[resultado.estado] = (cuenta[resultado.estado] ?? 0) + 1;

    const rg = await fetch(`${URL_BASE}/rest/v1/cotejo_catastro?on_conflict=comunidad_id`, {
      method: "POST",
      headers: { ...cabJson, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        comunidad_id: c.id,
        estado: resultado.estado,
        referencia: resultado.referencia ?? null,
        lat: resultado.lat ?? null,
        lng: resultado.lng ?? null,
        cp: resultado.cp ?? null,
        direccion_oficial: resultado.direccionOficial ?? null,
        dice: resultado.dice ?? null,
        candidatos: resultado.candidatos ?? null,
        buscado: resultado.buscado ?? null,
        intentado_en: new Date().toISOString(),
      }),
    });
    // Si la anotacion falla, se para: seguir seria repasar las mismas una y otra
    // vez sin avanzar, que es exactamente lo que parecia estar pasando.
    if (!rg.ok) throw new Error(`cotejo_catastro: ${rg.status} ${(await rg.text()).slice(0, 200)}`);

    // SOLO cuando hay una y solo una. Y solo estos cuatro campos: `nombre` ni
    // se menciona en el cuerpo, asi no hay forma de tocarlo por accidente.
    if (resultado.estado === "una" && resultado.referencia) {
      await fetch(`${URL_BASE}/rest/v1/comunidades?id=eq.${c.id}`, {
        method: "PATCH",
        headers: { ...cabJson, Prefer: "return=minimal" },
        body: JSON.stringify({
          referencia_catastral: resultado.referencia,
          lat: resultado.lat,
          lng: resultado.lng,
          cp: resultado.cp,
        }),
      });
      escritas += 1;
    }
  }

  const quedan = await cuantasQuedan();
  return {
    hechas: lista.length,
    escritas,
    quedan,
    cuenta,
    segundos: Math.round((Date.now() - t0) / 100) / 10,
  };
}

/** Las que aun no tienen respuesta buena.
 *
 *  Se restan las dos listas en memoria en vez de pedirle a PostgREST que filtre
 *  por una tabla embebida: son mil y pico identificadores, cabe de sobra, y una
 *  consulta que uno cree que filtra y no filtra volveria a repasar las 1.228
 *  enteras cada vez sin avisar. */
/** PostgREST DEVUELVE COMO MUCHO 1.000 FILAS, y `limit=5000` no lo cambia: el
 *  tope lo pone el servidor, no la consulta. Pedir de mil en mil hasta que se
 *  acaben es la unica forma de verlas todas.
 *
 *  No es un detalle: con 1.228 comunidades, sin esto las 228 ultimas no existian
 *  para el trabajo, y encima el contador se quedaba clavado en 1.000 como si
 *  fuera una cuenta cuando era un techo. */
async function traerTodo<T>(consulta: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${consulta}`, {
      headers: { ...cab, Range: `${desde}-${desde + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`${consulta.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 160)}`);
    const trozo = (await r.json()) as T[];
    todo.push(...trozo);
    if (trozo.length < 1000) return todo;
  }
}

async function pendientes(): Promise<Comunidad[]> {
  const todas = await traerTodo<Comunidad>("comunidades?select=id,nombre,municipio,provincia&order=nombre");
  // Los 'fallo' NO cuentan como hechos: fue el servicio, no la direccion.
  const hechas = new Set(
    (await traerTodo<{ comunidad_id: string }>("cotejo_catastro?select=comunidad_id&estado=neq.fallo"))
      .map((f) => f.comunidad_id),
  );
  return todas.filter((c) => !hechas.has(c.id));
}

export async function cuantasQuedan(): Promise<number> {
  try {
    return (await pendientes()).length;
  } catch {
    return -1;
  }
}
