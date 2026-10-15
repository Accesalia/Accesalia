// lib/catalogoProteccion.ts
//
// ¿ESTA ESTE EDIFICIO EN EL CATALOGO DE SU MUNICIPIO? (Monica, 11-oct-2026)
//
// Fuera de Madrid capital no hay geoportal que preguntar: lo que hay son los
// catalogos de proteccion que bajamos y leimos ficha a ficha (tabla
// catalogo_proteccion, SIN REVISAR). Al abrir la ficha se cruza en el momento,
// sin guardar nada, igual que scripts/cruzar_catalogo_proteccion.py:
//   1. referencia  - la referencia catastral entera coincide.
//   2. parcela     - manzana + parcela (las 7 primeras cifras): la ficha la da
//                    cortada, o en notas ("manzana 91177 ... parcelas 20 a 15").
//   3. direccion   - misma calle (por conjunto de palabras) y mismo numero; solo
//                    para elementos sueltos, no para zonas.
// Lo que sale es "posible": hasta que alguien mire la ficha, no se da por bueno.
// Por eso no entra en el anexo del cliente ni en el aviso de "edificio protegido".

import "server-only";
import { unstable_cache } from "next/cache";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

export type FilaCatalogo = {
  id: string;
  tipo: "edificio" | "zona";
  denominacion: string;
  direccion: string | null;
  referencia_catastral: string | null;
  grado: string | null;
  pagina: number | null;
  documento_ruta: string | null;
  notas: string | null;
};

/** "calle": la ficha nombra la calle pero SIN numero (una manzana descrita por
 *  sus calles, un conjunto "s/n"): el portal puede estar dentro o no. Es el
 *  aviso mas flojo y solo va a la ficha, nunca al informe del cliente. */
export type Casado = { fila: FilaCatalogo; como: "referencia" | "parcela" | "direccion" | "calle" };

export type EnElCatalogo = {
  /** Null si de ese municipio no tenemos catalogo: entonces no se sabe. */
  bajadoEl: string | null;
  casados: Casado[];
};

/** Mayusculas y sin tildes, como comunidades.municipio. */
export const sinTildes = (t: string | null | undefined) =>
  (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

/** Como se escribe el municipio para leerlo (en la base, y en Catastro, va sin tildes). */
const NOMBRE: Record<string, string> = {
  "ALCALA DE HENARES": "Alcalá de Henares",
  LEGANES: "Leganés",
  MOSTOLES: "Móstoles",
  "SAN SEBASTIAN DE LOS REYES": "San Sebastián de los Reyes",
};
export const nombreBonito = (m: string | null | undefined) =>
  NOMBRE[sinTildes(m)] ?? (m ?? "").toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

const VACIAS = new Set([
  "C", "CL", "CALLE", "PZA", "PLAZA", "PZ", "AVDA", "AV", "AVENIDA", "PO", "PASEO", "P",
  "DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "E", "N", "NO", "CV", "SN",
  "CTRA", "CARRETERA", "RONDA", "RD", "TRAVESIA", "TR", "GLORIETA", "CUESTA", "CU",
]);

function palabras(t: string | null | undefined): Set<string> {
  const todas = (sinTildes(t).match(/[A-Z]+/g) ?? []).filter((w) => w.length > 1);
  const utiles = todas.filter((w) => !VACIAS.has(w));
  // "C/ de la Plaza" (Fuenlabrada): la calle se llama Plaza; si no queda nada, vale el tipo.
  return new Set(utiles.length ? utiles : todas.filter((w) => ["PLAZA", "RONDA", "PASEO", "CUESTA"].includes(w)));
}

/** Manzana+parcela (7 cifras) que da la fila, venga de donde venga. */
function claves7(f: FilaCatalogo): Set<string> {
  const k = new Set<string>();
  if (f.referencia_catastral) k.add(f.referencia_catastral.slice(0, 7));
  const n = f.notas ?? "";
  for (const m of n.matchAll(/(?:catastral(?: actual)?|visible:?)\s*(\d{7})/gi)) k.add(m[1]);
  for (const m of n.matchAll(/manzana\s+(\d{2}\.?\d{3}),?\s+parcela\s+(\d{2})/gi)) k.add(m[1].replace(".", "") + m[2]);
  for (const m of n.matchAll(/Parcelas?(?:\(s\))?\s+([\d ,ay]+?)\s*;\s*manzana(?: catastral)?\s+(\d{5})/gi)) {
    const nums: number[] = [];
    for (const r of m[1].matchAll(/(\d{1,2})\s*a\s*(\d{1,2})/g)) {
      const [a, z] = [Number(r[1]), Number(r[2])].sort((x, y) => x - y); // tambien "20 a 15"
      for (let i = a; i <= z; i++) nums.push(i);
    }
    for (const s of m[1].replace(/\d{1,2}\s*a\s*\d{1,2}/g, "").match(/\d{1,2}/g) ?? []) nums.push(Number(s));
    for (const x of nums) k.add(m[2] + String(x).padStart(2, "0"));
  }
  return k;
}

function numeros(direccion: string | null): Set<string> {
  const d = sinTildes(direccion);
  if (/\b(PARES|IMPARES)\b/.test(d)) return new Set(); // tramos de calle: por parcela
  return new Set([...d.matchAll(/(?:N[Oº]?\s*|,\s*|\s)(\d{1,3})(?=[A-Z]?\b)/g)].map((m) => m[1]));
}

const leerCatalogo = unstable_cache(
  async (municipio: string) => {
    const [c, d] = await Promise.all([
      fetch(
        `${URL_BASE}/rest/v1/catalogo_proteccion?select=id,tipo,denominacion,direccion,referencia_catastral,grado,pagina,documento_ruta,notas` +
          `&municipio=eq.${encodeURIComponent(municipio)}`,
        { headers: cab, cache: "no-store" },
      ),
      fetch(
        `${URL_BASE}/rest/v1/documentos_referencia?select=descargado_en&seccion=eq.proteccion&municipio=eq.${encodeURIComponent(municipio)}` +
          `&order=descargado_en.asc&limit=1`,
        { headers: cab, cache: "no-store" },
      ),
    ]);
    if (!c.ok) throw new Error(`Supabase REST ${c.status}`);
    const filas = (await c.json()) as FilaCatalogo[];
    const bajado = d.ok ? ((await d.json()) as { descargado_en: string | null }[])[0]?.descargado_en ?? null : null;
    return { filas, bajado };
  },
  ["catalogo-proteccion-v1"],
  { revalidate: 300 },
);

/** Cruza un edificio (su referencia y sus portales) con el catalogo de su
 *  municipio. Si falla la consulta, se dice que no hay catalogo: mejor "no se
 *  puede consultar" que un "no sale" que no es verdad. */
export async function enElCatalogo(
  referencia: string,
  municipio: string | null,
  portales: { via: string; numero: string }[],
): Promise<EnElCatalogo> {
  const m = sinTildes(municipio);
  if (!m || !URL_BASE) return { bajadoEl: null, casados: [] };
  let filas: FilaCatalogo[], bajado: string | null;
  try {
    ({ filas, bajado } = await leerCatalogo(m));
  } catch {
    return { bajadoEl: null, casados: [] };
  }
  if (filas.length === 0) return { bajadoEl: null, casados: [] };

  const ref = referencia.slice(0, 14);
  const casados: Casado[] = [];
  for (const f of filas) {
    if (f.referencia_catastral && f.referencia_catastral.slice(0, 14) === ref) casados.push({ fila: f, como: "referencia" });
    else if (claves7(f).has(ref.slice(0, 7))) casados.push({ fila: f, como: "parcela" });
    else if (f.tipo === "edificio") {
      const calle = palabras(sinTildes(f.direccion).split(/\bC\/?V\b|,/)[0]);
      const nums = numeros(f.direccion);
      if (!calle.size || !nums.size) continue;
      const sale = portales.some((p) => {
        const pa = palabras(p.via);
        const n = p.numero.match(/\d+/)?.[0];
        const dentro = (a: Set<string>, b: Set<string>) => [...a].every((w) => b.has(w));
        return pa.size > 0 && (dentro(pa, calle) || dentro(calle, pa)) && !!n && nums.has(n);
      });
      if (sale) casados.push({ fila: f, como: "direccion" });
    }
  }
  // LA CALLE SIN NUMERO (15-oct-2026): en Aranjuez casi todo el inventario de
  // rehabilitacion son manzanas descritas por las calles que las rodean, con la
  // parcela en una numeracion antigua que ya no casa; en Getafe, conjuntos "s/n"
  // como la Colonia Juan de la Cierva. Sin esto, un edificio en esas calles no
  // daba ningun aviso. Solo si no ha casado nada mejor, y nunca las areas
  // arqueologicas (van aparte).
  if (!casados.length) {
    for (const f of filas) {
      // La arqueologia va en su linea aparte: un area delimitada por calles (el
      // casco de Mostoles) no es "el edificio esta protegido".
      if (!f.direccion || numeros(f.direccion).size || /arqueol/i.test(`${f.grado ?? ""} ${f.denominacion}`)) continue;
      const calles = sinTildes(f.direccion)
        .split(/,|\/|\bY\b|\bC\s*\/?\s*V\b|\bESQ\.?\b|\bCON VUELTA\b/)
        .map((c) => palabras(c))
        .filter((c) => c.size);
      const sale = portales.some((p) => {
        const pa = palabras(p.via);
        return pa.size > 0 && calles.some((c) => [...pa].every((w) => c.has(w)) && [...c].every((w) => pa.has(w)));
      });
      if (sale) casados.push({ fila: f, como: "calle" });
    }
  }
  return { bajadoEl: bajado ?? "", casados };
}

/** El enlace estable a la ficha en su PDF (la ruta firma y redirige al abrirlo). */
export const enlaceFicha = (f: Pick<FilaCatalogo, "documento_ruta" | "pagina">) =>
  f.documento_ruta
    ? `/referencia/proteccion/ver?ruta=${encodeURIComponent(f.documento_ruta)}${f.pagina ? `&pagina=${f.pagina}` : ""}`
    : "/referencia/proteccion";
