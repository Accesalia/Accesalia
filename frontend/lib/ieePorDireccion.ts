import "server-only";
import { leerNotaDeUrl, guardarNota, type NotaIEE } from "./registroIEE";

// ============================================================================
// PREGUNTARLE AL REGISTRO POR NUESTRAS DIRECCIONES (Monica, 1-oct-2026)
//
// El radar va por NUMERO DE REGISTRO y solo hacia delante: entera de lo que se
// inscribe cada dia. Esto es la otra puerta del mismo registro, la de buscar por
// direccion, que estaba ahi y no usabamos. Su encargo:
//
//   "Conseguir los datos de la IEE de las 1200 direcciones seria genial."
//
// Y por que van a la MISMA tabla que las del radar, que lo pregunte yo:
//
//   "No deberian ir separadas. El radar nos da info comercial; IEE registrada de
//    nuestro trabajo hecho/cobrable."
//
// Son dos usos del mismo hecho, no dos hechos. Y no hace falta marcar cual es
// cual: si la direccion es una de las nuestras, ya se sabe, y eso lo calcula
// `cotejar()` de alertasIEE.ts contra la referencia catastral.
//
// LA CADENA, descubierta sondeando el portal (no hay documentacion):
//
//   get_direcciones/<codMunicipio>.json     -> [[idCalle, "CL VELARDE"], ...]
//   get_numeros_direccion/<idCalle>.json    -> <option value="416617">3</option>
//   nota_informativa_numero/<idEdificio>    -> la nota entera, igual que por codigo
//
// LO BUENO DE LA PRIMERA LLAMADA: esa lista NO es el callejero del municipio,
// son SOLO las calles que tienen algun IEE. Alcobendas tiene 143. Asi que una
// llamada por municipio descarta de golpe casi todas nuestras calles sin
// preguntar por ellas una a una.
//
// COBERTURA: el registro cubre 49 municipios, no toda la Comunidad. De nuestras
// 2.037 direcciones, unas 1.946 (95,5%) caen dentro. Las que no, no es que
// fallen: es que su municipio no esta, y algunas (Talavera, Guadalajara,
// Valencia) ni siquiera son de Madrid.
// ============================================================================

const PORTAL = "https://www.rieecm.es/portal/home";
const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

/** Ir despacio es obligatorio: es un registro publico y pequeño, y si lo
 *  aporreamos nos corta, como nos paso con Catastro. */
const PAUSA_MS = 250;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ nombres

/** Sin tildes, sin signos, en mayusculas. El mismo criterio que en el resto de
 *  la casa: no inventa equivalencias, solo quita adorno. */
function aplanar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** El registro escribe los municipios con el articulo detras y con coma, como
 *  los callejeros oficiales: "Rozas de Madrid, Las". Nosotros los escribimos al
 *  derecho: "LAS ROZAS". Y hay un "de El Escorial" contra nuestro "DEL ESCORIAL".
 *  Esto no adivina nada: solo pone las dos formas en el mismo orden. */
function comoMunicipio(s: string): string {
  let t = aplanar(s);
  const m = t.match(/^(.*) (EL|LA|LOS|LAS)$/);
  if (m) t = `${m[2]} ${m[1]}`;
  return t.replace(/\bDE EL\b/g, "DEL").replace(/\s+/g, " ").trim();
}

// ------------------------------------------------------------------- portal

type Calle = { id: number; nombre: string };

/** Las calles CON IEE de un municipio. Una sola llamada, y pequeña. */
async function callesDe(codMunicipio: string): Promise<Calle[]> {
  const r = await fetch(`${PORTAL}/get_direcciones/${codMunicipio}.json`, {
    headers: { "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const crudo = (await r.json()) as [number, string][];
  return crudo.map(([id, nombre]) => ({ id, nombre }));
}

/** Los numeros de una calle. Contesta un <select> de HTML, no JSON: el value es
 *  el id del edificio y el texto es el numero tal y como lo escribe el registro. */
async function numerosDe(idCalle: number): Promise<{ idEdificio: string; numero: string }[]> {
  const r = await fetch(`${PORTAL}/get_numeros_direccion/${idCalle}.json`, {
    headers: { "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  if (!r.ok) return [];
  const html = await r.text();
  const salida: { idEdificio: string; numero: string }[] = [];
  for (const m of html.matchAll(/<option value="(\d+)">([^<]*)<\/option>/g)) {
    if (m[2].trim()) salida.push({ idEdificio: m[1], numero: m[2].trim() });
  }
  return salida;
}

// ------------------------------------------------------------- lo nuestro

type Direccion = { municipio: string; via: string; numero: string };

async function nuestrasDirecciones(): Promise<Direccion[]> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/accesos?select=municipio,tipo_via,nombre_via,numero`,
    { headers: { ...cab, Range: "0-9999" }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`accesos: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const filas = (await r.json()) as {
    municipio: string; tipo_via: string; nombre_via: string; numero: string;
  }[];
  // Varias escaleras comparten portal y edificio: al registro se le pregunta por
  // la DIRECCION, asi que se preguntan las distintas y no los 2.530 accesos.
  const vistas = new Set<string>();
  const salida: Direccion[] = [];
  for (const f of filas) {
    const d = {
      municipio: f.municipio,
      via: aplanar(`${f.tipo_via} ${f.nombre_via}`),
      numero: aplanar(f.numero),
    };
    const clave = `${comoMunicipio(d.municipio)}|${d.via}|${d.numero}`;
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push(d);
  }
  return salida;
}

/** Los 49 municipios que cubre el registro, con su codigo. Se leen de la propia
 *  pagina para no tener aqui una lista que caduque el dia que admitan otro. */
async function municipiosDelRegistro(): Promise<Map<string, string>> {
  const r = await fetch(PORTAL, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!r.ok) throw new Error(`portal: ${r.status}`);
  // Esta pagina viene en ISO-8859-1 aunque la cabecera diga otra cosa.
  const html = new TextDecoder("iso-8859-1").decode(await r.arrayBuffer());
  const i = html.indexOf("municipio-input");
  if (i < 0) throw new Error("el portal ya no trae el desplegable de municipios");
  const trozo = html.slice(i, html.indexOf("</select>", i));
  const mapa = new Map<string, string>();
  for (const m of trozo.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)) {
    mapa.set(comoMunicipio(m[2]), m[1]);
  }
  return mapa;
}

// --------------------------------------------------------------- el barrido

export type ResultadoPorDireccion = {
  municipiosMirados: number;
  municipiosFuera: string[];
  direcciones: number;
  callesQueEncajan: number;
  notasLeidas: number;
  guardadas: number;
  segundos: number;
  errores: string[];
  /** Se corto por tiempo: queda trabajo y hay que volver a llamar. */
  incompleto: boolean;
  /** Por donde seguir la proxima vez. null = no queda nada. */
  siguiente: string | null;
};

/** Pregunta por nuestras direcciones, municipio a municipio.
 *
 *  `desdeMunicipio` deja seguir donde se quedo la tanda anterior, porque una
 *  funcion de Vercel no puede durar eternamente. El orden es siempre el mismo
 *  (alfabetico) para que "seguir" signifique algo. */
export async function barrerNuestrasDirecciones({
  desdeMunicipio = "",
  segundosMaximos = 240,
}: { desdeMunicipio?: string; segundosMaximos?: number } = {}): Promise<ResultadoPorDireccion> {
  const t0 = Date.now();
  const r: ResultadoPorDireccion = {
    municipiosMirados: 0, municipiosFuera: [], direcciones: 0, callesQueEncajan: 0,
    notasLeidas: 0, guardadas: 0, segundos: 0, errores: [], incompleto: false, siguiente: null,
  };

  const [direcciones, codigos] = await Promise.all([
    nuestrasDirecciones(),
    municipiosDelRegistro(),
  ]);
  r.direcciones = direcciones.length;

  // Agrupadas por municipio, en orden fijo.
  const porMunicipio = new Map<string, Direccion[]>();
  for (const d of direcciones) {
    const k = comoMunicipio(d.municipio);
    if (!porMunicipio.has(k)) porMunicipio.set(k, []);
    porMunicipio.get(k)!.push(d);
  }
  const municipios = [...porMunicipio.keys()].sort();

  for (const mun of municipios) {
    if (mun < desdeMunicipio) continue;
    if ((Date.now() - t0) / 1000 > segundosMaximos) {
      // Se corta ANTES de empezar un municipio, nunca a la mitad: asi `siguiente`
      // es exacto y la tanda que venga no repite ni se salta nada.
      r.incompleto = true;
      r.siguiente = mun;
      break;
    }

    const cod = codigos.get(mun);
    if (!cod) { r.municipiosFuera.push(mun); continue; }
    r.municipiosMirados += 1;

    try {
      const calles = await callesDe(cod);
      await dormir(PAUSA_MS);
      // Las suyas, aplanadas, para cotejar contra las nuestras sin adornos.
      const suyas = new Map(calles.map((c) => [aplanar(c.nombre), c]));

      // Nuestras calles de este municipio, cada una con sus numeros.
      const nuestras = new Map<string, Set<string>>();
      for (const d of porMunicipio.get(mun)!) {
        if (!nuestras.has(d.via)) nuestras.set(d.via, new Set());
        nuestras.get(d.via)!.add(d.numero);
      }

      for (const [via, numeros] of nuestras) {
        if ((Date.now() - t0) / 1000 > segundosMaximos) {
          // Cortado a media calle: se repite este municipio entero la proxima
          // vez. Repetir es gratis -las notas se guardan por codigo, asi que
          // volver a leerlas no duplica nada- y saltarselo no lo seria.
          r.incompleto = true;
          r.siguiente = mun;
          break;
        }
        const calle = suyas.get(via);
        // Si la calle no esta en su lista, es que NINGUN portal de esa calle
        // tiene IEE. Eso ya es una respuesta, y gratis.
        if (!calle) continue;
        r.callesQueEncajan += 1;

        const delRegistro = await numerosDe(calle.id);
        await dormir(PAUSA_MS);

        for (const { idEdificio, numero } of delRegistro) {
          if (!numeros.has(aplanar(numero))) continue;
          try {
            const nota = await leerNotaDeUrl(`${PORTAL}/nota_informativa_numero/${idEdificio}`);
            await dormir(PAUSA_MS);
            if (!nota) continue;
            r.notasLeidas += 1;
            // La fecha que se guarda es la de EMISION, no la de hoy. Monica:
            // "la a, sin duda, y ademas es una fecha que queremos tener".
            // Asi no inunda el parte de hoy y ademas dice la verdad.
            await guardarNota(nota, undefined, nota.fechaEmision);
            r.guardadas += 1;
          } catch (e) {
            r.errores.push(`${via} ${numero}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    } catch (e) {
      r.errores.push(`${mun}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  r.segundos = Number(((Date.now() - t0) / 1000).toFixed(1));
  return r;
}
