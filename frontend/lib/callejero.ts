import "server-only";

// ============================================================================
// EL CALLEJERO OFICIAL DE CATASTRO (Monica, 30-sep-2026)
//
//   "¿tenemos el callejero oficial de Madrid disponible? guardemos eso, por
//    favor. Estamos creando oportunidades con direcciones constantemente, va a
//    ser una herramienta MUY util."
//
// POR QUE HACE FALTA, y no es un capricho: Catastro no escribe las calles como
// las escribimos nosotras, asi que buscar por nuestro nombre no encuentra nada.
//
//   invierte el articulo    CL ARBOLEDA LA        = la Arboleda
//                           CL PALMAS DE LAS      = las Palmas
//   abrevia quitando letras CL CGDOR ALONSO DE TOBAR      = Corregidor
//                           CL RAIMUNDO FDEZ VILLAVERDE   = Fernandez
//                           CL NTRA SRA DE LOS ANGELES    = Nuestra Señora
//   junta el apostrofo      CL ODONNELL           = O'Donnell
//   y tiene sus erratas     CL GUTEMBERG          = Gutenberg, con M
//
// De 1.228 direcciones de la cartera, 226 quedaron dudosas por esto. Con la
// lista oficial delante se resolvieron 60 en una tarde.
//
// EL COTEJO QUE FUNCIONA no es comparar cadenas, es comparar CONJUNTOS DE
// PALABRAS: se quitan tildes, articulos y numeros, se ordenan alfabeticamente y
// se compara. Asi "ARBOLEDA LA" y "LA ARBOLEDA" dan la misma clave. Esa regla
// vive en la base de datos (clave_de_via), no aqui, para que la busqueda use
// exactamente la misma con la que se guardo el dato.
//
// ESTO CORRE EN LA APP Y NO EN UN PORTATIL: las credenciales son las de Vercel.
// La carga son 71.802 vias y no cabe en una pasada, asi que va por municipios y
// lleva la cuenta en municipios_catastro.descargado_en. Lo hecho no se repite.
// ============================================================================

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const cabJson = { ...cab, "Content-Type": "application/json" };

const OVC = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json";
const PAUSA = 400; // Catastro corta si se va deprisa
const POR_TANDA = 1000; // filas por insert

// Las provincias donde Accesalia tiene obra. Madrid entera porque las
// oportunidades nuevas pueden caer en cualquier pueblo; de las demas, solo los
// municipios donde ya hay algo, que se piden uno a uno.
export const PROVINCIA_COMPLETA = "MADRID";

export type Municipio = {
  id: string;
  provincia: string;
  nombre: string;
  codigo_provincia: string;
  codigo_municipio: string;
  vias: number;
  descargado_en: string | null;
};

// ------------------------------------------------------------------ Supabase

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function meter(tabla: string, filas: unknown[], conflicto: string): Promise<void> {
  // De mil en mil: un insert de 9.629 vias (Madrid capital) de una vez se cae.
  for (let i = 0; i < filas.length; i += POR_TANDA) {
    const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?on_conflict=${conflicto}`, {
      method: "POST",
      headers: { ...cabJson, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(filas.slice(i, i + POR_TANDA)),
    });
    if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  }
}

// -------------------------------------------------------------------- Catastro

async function pedir(op: string, parametros: Record<string, string>): Promise<unknown> {
  const url = `${OVC}/${op}?${new URLSearchParams(parametros)}`;
  let ultimo = "";
  for (let intento = 0; intento < 3; intento += 1) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Accesalia CRM" }, cache: "no-store" });
      if (!r.ok) throw new Error(`Catastro ${r.status}`);
      return await r.json();
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
      await new Promise((s) => setTimeout(s, 1500 * (intento + 1)));
    }
  }
  throw new Error(`Catastro no contesta (${op}): ${ultimo}`);
}

function comoLista<T>(x: T | T[] | undefined | null): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

type MuniOVC = { nm: string; loine?: { cp: string; cm: string } };
type ViaOVC = { dir?: { tv?: string; nv?: string; cv?: string } };

/** Los municipios que Catastro reconoce en una provincia, con su nombre OFICIAL. */
export async function municipiosDeCatastro(
  provincia: string,
  filtro = "",
): Promise<{ nombre: string; cp: string; cm: string }[]> {
  const d = (await pedir("ObtenerMunicipios", { Provincia: provincia, Municipio: filtro })) as {
    consulta_municipieroResult?: { municipiero?: { muni?: MuniOVC | MuniOVC[] } };
  };
  return comoLista(d.consulta_municipieroResult?.municipiero?.muni)
    .filter((m) => m.loine)
    .map((m) => ({ nombre: m.nm, cp: m.loine!.cp, cm: m.loine!.cm }));
}

/** Todas las vias de un municipio. Catastro las da todas de golpe, sin filtrar. */
async function viasDeCatastro(
  provincia: string,
  municipio: string,
): Promise<{ tv: string; nv: string; cv: string }[]> {
  const d = (await pedir("ObtenerCallejero", {
    Provincia: provincia,
    Municipio: municipio,
    TipoVia: "",
    NombreVia: "",
  })) as { consulta_callejeroResult?: { callejero?: { calle?: ViaOVC | ViaOVC[] } } };
  return comoLista(d.consulta_callejeroResult?.callejero?.calle)
    .map((c) => ({ tv: c.dir?.tv ?? "", nv: (c.dir?.nv ?? "").trim(), cv: c.dir?.cv ?? "" }))
    .filter((v) => v.nv && v.cv);
}

// ------------------------------------------------------- normalizar, igual que la base

const ARTICULOS = new Set(["DE", "DEL", "LA", "LAS", "EL", "LOS", "Y", "DO", "DA"]);

/** Mayusculas sin tildes. La Ñ se respeta: Cañada sin eñe "no existe" en Catastro. */
export function sinTildes(t: string): string {
  return t
    .toUpperCase()
    .replace(/Ñ/g, "\u0001")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\u0001/g, "Ñ");
}

/**
 * CIEGA A LA EÑE, solo para BUSCAR.
 *
 * `sinTildes` respeta la Ñ a proposito, porque es como Catastro escribe el
 * nombre y es lo que se guarda y se muestra: CAÑADA, BAÑEZA. Pero al BUSCAR eso
 * se vuelve en contra, porque nadie escribe la eñe con prisa: quien teclea
 * "baneza" no encontraba CL BAÑEZA y la app le decia que esa calle no existe.
 * Paso de verdad el 1-oct-2026, buscando los linderos de Ganapanes.
 *
 * Asi que la posicion de la eñe se convierte en `_`, el comodin de una sola
 * letra de SQL: "BANEZA" -> "BA_EZA", que casa con BAÑEZA sin aflojar el resto
 * del nombre. Y vale en los dos sentidos, porque tambien se ciega la Ñ de quien
 * la escribe bien.
 */
function comodinDeEne(t: string): string {
  return t.replace(/[NÑ]/g, "_");
}

/** El nombre limpio: solo letras, numeros, Ñ y un espacio entre palabras. */
export function textoDeVia(nombre: string): string {
  return sinTildes(nombre).replace(/[^A-Z0-9Ñ]+/g, " ").trim();
}

/**
 * La clave de cotejo: palabras significativas ordenadas alfabeticamente.
 * Tiene que dar LO MISMO que clave_de_via() en la base. Si se cambia una, la otra.
 */
export function claveDeVia(nombre: string): string {
  return textoDeVia(nombre)
    .split(" ")
    .filter((p) => p && !ARTICULOS.has(p) && !/^[0-9]+$/.test(p))
    .sort()
    .join(" ");
}

// -------------------------------------------------------------------- la carga

export async function municipiosPendientes(): Promise<Municipio[]> {
  return leer<Municipio[]>(
    "municipios_catastro?select=*&descargado_en=is.null&order=vias.desc.nullslast",
  );
}

export async function comoVaLaCarga(): Promise<{
  municipios: number;
  descargados: number;
  vias_guardadas: number;
  vias_esperadas: number;
}> {
  const [muni, hechos, vias] = await Promise.all([
    leer<{ count: string }[]>("municipios_catastro?select=count"),
    leer<{ count: string }[]>("municipios_catastro?select=count&descargado_en=not.is.null"),
    leer<{ count: string }[]>("vias_catastro?select=count"),
  ]);
  const suma = await leer<{ vias: number }[]>("municipios_catastro?select=vias");
  return {
    municipios: Number(muni[0]?.count ?? 0),
    descargados: Number(hechos[0]?.count ?? 0),
    vias_guardadas: Number(vias[0]?.count ?? 0),
    vias_esperadas: suma.reduce((t, m) => t + (m.vias ?? 0), 0),
  };
}

/**
 * Da de alta en la tabla los municipios de una provincia, tal y como los nombra
 * Catastro. Hace falta porque nosotras decimos LAS ROZAS y el dice LAS ROZAS DE
 * MADRID, y SAN LORENZO DEL ESCORIAL es SAN LORENZO DE EL ESCORIAL: sin esta
 * traduccion no se le puede preguntar nada.
 */
export async function apuntarMunicipios(provincia: string, filtro = ""): Promise<number> {
  const lista = await municipiosDeCatastro(provincia, filtro);
  if (!lista.length) return 0;
  await meter(
    "municipios_catastro",
    lista.map((m) => ({
      provincia,
      nombre: m.nombre,
      clave: claveDeVia(m.nombre),
      codigo_provincia: m.cp,
      codigo_municipio: m.cm,
    })),
    "provincia,nombre",
  );
  return lista.length;
}

/** Baja y guarda el callejero de un municipio. Devuelve cuantas vias ha metido. */
export async function descargarMunicipio(m: Municipio): Promise<number> {
  const vias = await viasDeCatastro(m.provincia, m.nombre);
  if (vias.length) {
    await meter(
      "vias_catastro",
      vias.map((v) => ({
        municipio_id: m.id,
        tipo_via: v.tv,
        nombre: v.nv,
        codigo_via: v.cv,
        busqueda: textoDeVia(v.nv),
        clave: claveDeVia(v.nv),
      })),
      "municipio_id,codigo_via,tipo_via",
    );
  }
  // Se marca al final y con el numero real: si se corta a medias, se repite.
  const r = await fetch(`${URL_BASE}/rest/v1/municipios_catastro?id=eq.${m.id}`, {
    method: "PATCH",
    headers: { ...cabJson, Prefer: "return=minimal" },
    body: JSON.stringify({ vias: vias.length, descargado_en: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return vias.length;
}

/** Una tanda de municipios. Los mas grandes primero, que son los que se usan. */
export async function cargarTanda(cuantos = 4): Promise<{
  hechos: { municipio: string; vias: number }[];
  fallos: { municipio: string; dice: string }[];
  quedan: number;
}> {
  const pendientes = await municipiosPendientes();
  const hechos: { municipio: string; vias: number }[] = [];
  const fallos: { municipio: string; dice: string }[] = [];
  for (const m of pendientes.slice(0, cuantos)) {
    try {
      hechos.push({ municipio: m.nombre, vias: await descargarMunicipio(m) });
    } catch (e) {
      fallos.push({ municipio: m.nombre, dice: e instanceof Error ? e.message : String(e) });
    }
    await new Promise((s) => setTimeout(s, PAUSA));
  }
  return { hechos, fallos, quedan: Math.max(0, pendientes.length - hechos.length) };
}

// ----------------------------------------------------------------- lo que se usa

export type ViaEncontrada = {
  tipo_via: string;
  nombre: string;
  codigo_via: string;
  municipio: string;
  provincia: string;
  como: "igual" | "mismas palabras" | "parecida";
};

/**
 * Busca un nombre de calle en el callejero oficial de un municipio.
 *
 * Cuatro pasadas, de la mas fiable a la menos: el nombre tal cual, la clave de
 * palabras (que perdona el articulo del reves), el nombre con la eñe en duda
 * (BANEZA -> BAÑEZA) y por ultimo parecido de texto, que es lo que pilla las
 * erratas de una letra (COLLANATES -> COLLANTES).
 */
export async function buscarVia(municipio: string, calle: string): Promise<ViaEncontrada[]> {
  const clave = claveDeVia(calle);
  const texto = textoDeVia(calle);
  if (!clave) return [];

  const muni = encodeURIComponent(claveDeVia(municipio));
  const campos = "tipo_via,nombre,codigo_via,municipios_catastro!inner(nombre,provincia)";
  const base = `vias_catastro?select=${campos}&municipios_catastro.clave=eq.${muni}`;

  type Fila = {
    tipo_via: string;
    nombre: string;
    codigo_via: string;
    municipios_catastro: { nombre: string; provincia: string };
  };
  const salida = (filas: Fila[], como: ViaEncontrada["como"]): ViaEncontrada[] =>
    filas.map((f) => ({
      tipo_via: f.tipo_via,
      nombre: f.nombre,
      codigo_via: f.codigo_via,
      municipio: f.municipios_catastro.nombre,
      provincia: f.municipios_catastro.provincia,
      como,
    }));

  const iguales = await leer<Fila[]>(`${base}&busqueda=eq.${encodeURIComponent(texto)}`);
  if (iguales.length) return salida(iguales, "igual");

  const porClave = await leer<Fila[]>(`${base}&clave=eq.${encodeURIComponent(clave)}`);
  if (porClave.length) return salida(porClave, "mismas palabras");

  // La eñe. Va aqui, antes del parecido, porque NO es una aproximacion: es el
  // nombre completo con la misma longitud y solo la eñe en duda, asi que el
  // resultado es tan fiable como el de "igual". Ver comodinDeEne.
  if (/[NÑ]/.test(texto)) {
    const conEne = await leer<Fila[]>(
      `${base}&busqueda=ilike.${encodeURIComponent(comodinDeEne(texto))}`,
    );
    if (conEne.length) return salida(conEne, "igual");
  }

  // Ultimo recurso: calles que CONTENGAN la palabra mas larga de la nuestra. La
  // mas larga y no la ultima, porque es la que distingue: de "GENERAL RICADOS",
  // "GENERAL" sale en veinte calles y "RICADOS" en ninguna, pero trae RICARDOS
  // al lado para que se vea la errata. Esta pasada SI puede devolver ruido, y por
  // eso va marcada: quien la use tiene que mirar lo que sale.
  const larga = texto.split(" ").sort((a, b) => b.length - a.length)[0] ?? texto;
  const parecidas = await leer<Fila[]>(
    `${base}&busqueda=ilike.*${encodeURIComponent(comodinDeEne(larga.slice(0, 6)))}*&limit=12`,
  );
  return salida(parecidas, "parecida");
}
