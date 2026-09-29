import { NextResponse } from "next/server";
import { porReferencia } from "../../../../lib/catastro";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";

// RELLENAR CON CATASTRO lo que ya se puede (Monica dio el OK, 29-sep-2026).
//
// 518 comunidades tienen ya referencia catastral, y `anio_construccion` y
// `num_viviendas` estan VACIAS en las 1.228. Una llamada por comunidad y se
// llenan solas con datos que hoy no existen en ningun sitio.
//
// TRES REGLAS, porque esto escribe en produccion:
//
//  1. SOLO RELLENA HUECOS. Nunca pisa un dato que ya este puesto, y NO TOCA
//     `nombre` ni `direccion`: esa lista de direcciones son 26 dias de trabajo
//     suyo hecho a mano y no se toca por nada del mundo.
//  2. La direccion oficial de Catastro NO sobrescribe la suya. Son dos y las dos
//     son verdad: la suya es como se dice, la de Catastro es la que hace falta
//     para visado y subvenciones. Aqui solo se INFORMA de las que no cuadran,
//     para que las mire una persona.
//  3. Va por tandas y despacio: es un servicio publico y gratuito, no se le
//     lanzan quinientas peticiones de golpe.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

const aplanar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

// Las abreviaturas de siempre. Sin esto, "AV DR FLEMING" y "AV DOCTOR FLEMING"
// parecen direcciones distintas y el aviso se llena de ruido.
const IGUALES: Record<string, string> = {
  DR: "DOCTOR", DRA: "DOCTORA", FCO: "FRANCISCO", FCA: "FRANCISCA", GRAL: "GENERAL",
  STA: "SANTA", STO: "SANTO", STGO: "SANTIAGO", NTRA: "NUESTRA", SRA: "SEÑORA",
  AV: "AVENIDA", AVDA: "AVENIDA", CL: "CALLE", C: "CALLE", PZ: "PLAZA", PZA: "PLAZA",
  PSO: "PASEO", PS: "PASEO", CTRA: "CARRETERA", GTA: "GLORIETA", URB: "URBANIZACION",
  MARQ: "MARQUES", PTE: "PUENTE", PROF: "PROFESOR",
};
const VIAS = new Set(["AVENIDA", "CALLE", "PLAZA", "PASEO", "CARRETERA", "GLORIETA", "CAMINO", "RONDA", "TRAVESIA", "URBANIZACION"]);
const MUNICIPIOS = new Set(["MADRID","LEGANES","GETAFE","FUENLABRADA","MOSTOLES","ALCORCON","PARLA","PINTO","ALCALA","HENARES","TORREJON","ARDOZ","ALCOBENDAS","SAN","SEBASTIAN","REYES","ARANJUEZ","VALDEMORO","BOADILLA","MONTE","POZUELO","ALARCON","MEJORADA","CAMPO","FERNANDO","AZUQUECA","GRIÑON","ALGETE","AJALVIR","MARTIN","VALDEIGLESIAS"]);

/** Las palabras que de verdad nombran la calle, y el numero. */
function trozos(s: string) {
  const p = aplanar(s).split(" ").map((w) => IGUALES[w] ?? w);
  const numeros = p.filter((w) => /^\d+$/.test(w));
  const nombre = p.filter((w) => !/^\d+$/.test(w) && !VIAS.has(w) && !MUNICIPIOS.has(w) && w.length > 1);
  return { nombre: new Set(nombre), numero: numeros[0] ?? null };
}

/** ¿Es la misma direccion escrita distinto, u OTRA? */
function comparar(suya: string, oficial: string): "igual" | "forma" | "otra" {
  const a = trozos(suya);
  const b = trozos(oficial);
  const comunes = [...b.nombre].filter((w) => a.nombre.has(w)).length;
  const bastantes = comunes > 0 && comunes >= Math.min(a.nombre.size, b.nombre.size) * 0.6;
  if (!bastantes) return "otra";
  if (a.numero && b.numero && a.numero !== b.numero) return "otra";
  return aplanar(suya).includes(aplanar(oficial)) ? "igual" : "forma";
}

export async function GET(req: Request) {
  const yo = await quienSoy();
  if (!yo || !(yo.veTodo || puedeEntrar(yo, "administracion", "trabajar")))
    return NextResponse.json({ error: "Esto solo lo puede lanzar dirección." }, { status: 403 });

  const url = new URL(req.url);
  const cuantas = Math.min(Math.max(Number(url.searchParams.get("n") ?? 140), 1), 200);
  const empezado = Date.now();

  // La ficha cuelga de la REFERENCIA, no de la comunidad: una finca puede servir
  // a varios portales. Asi que se mira que referencias hay ya guardadas y se
  // piden las que faltan. Son textos cortos: traerlos todos es barato.
  const [rFichas, rComus] = await Promise.all([
    fetch(`${URL_BASE}/rest/v1/catastro_finca?select=referencia&limit=5000`, { headers: cab, cache: "no-store" }),
    fetch(
      `${URL_BASE}/rest/v1/comunidades?select=id,nombre,referencia_catastral,cp,municipio,anio_construccion,num_viviendas` +
        `&referencia_catastral=not.is.null&order=nombre.asc&limit=5000`,
      { headers: cab, cache: "no-store" },
    ),
  ]);
  if (!rComus.ok) return NextResponse.json({ ok: false, dice: await rComus.text() }, { status: 200 });

  const yaEstan = new Set(((await rFichas.json()) as { referencia: string }[]).map((f) => f.referencia));
  const todas = (await rComus.json()) as {
    id: string; nombre: string; referencia_catastral: string; cp: string | null;
    municipio: string | null; anio_construccion: number | null; num_viviendas: number | null;
  }[];
  const rc14 = (s: string) => s.replace(/\s/g, "").toUpperCase().slice(0, 14);
  const pendientes = todas.filter((c) => rc14(c.referencia_catastral).length === 14 && !yaEstan.has(rc14(c.referencia_catastral)));
  const filas = pendientes.slice(0, cuantas);

  const hecho: string[] = [];
  const sinFicha: { nombre: string; rc: string }[] = [];
  const otraDireccion: { nombre: string; catastro: string }[] = [];
  const soloLaForma: { nombre: string; catastro: string }[] = [];
  const fallos: string[] = [];

  for (const c of filas) {
    // Antes de que Vercel corte la funcion, se para y devuelve lo hecho.
    if (Date.now() - empezado > 265000) break;
    try {
      // Un fallo de red no es un "no existe": se reintenta una vez.
      let f = null;
      try {
        f = await porReferencia(c.referencia_catastral);
      } catch {
        await new Promise((x) => setTimeout(x, 1800));
        f = await porReferencia(c.referencia_catastral);
      }
      if (!f || (f.anio === null && f.viviendas === 0)) {
        sinFicha.push({ nombre: c.nombre, rc: c.referencia_catastral });
        continue;
      }

      // LA FICHA ENTERA, con la respuesta en bruto: ya que se llama, se
      // exprime. Lo que hoy no sepamos aprovechar, mañana estara guardado.
      const g = await fetch(`${URL_BASE}/rest/v1/catastro_finca?on_conflict=referencia`, {
        method: "POST",
        headers: { ...cab, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          referencia: f.referencia,
          direccion: f.direccion || null,
          municipio: f.municipio,
          provincia: f.provincia,
          cp: f.cp,
          anio: f.anio,
          inmuebles: f.inmuebles,
          viviendas: f.viviendas,
          superficie: f.superficie,
          plantas: f.plantas,
          usos: f.usos,
          bruto: f.bruto,
          consultado_en: new Date().toISOString(),
        }),
      });
      if (!g.ok) {
        fallos.push(`${c.nombre}: ficha ${await g.text()}`);
        continue;
      }

      // Y en la tabla de ella, SOLO LOS HUECOS. Nunca se pisa nada puesto.
      const cambio: Record<string, unknown> = {};
      if (c.anio_construccion === null && f.anio !== null) cambio.anio_construccion = f.anio;
      if (c.num_viviendas === null && f.viviendas > 0) cambio.num_viviendas = f.viviendas;
      if (!c.cp && f.cp) cambio.cp = f.cp;

      if (Object.keys(cambio).length > 0) {
        const p = await fetch(`${URL_BASE}/rest/v1/comunidades?id=eq.${c.id}`, {
          method: "PATCH",
          headers: { ...cab, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify(cambio),
        });
        if (!p.ok) {
          fallos.push(`${c.nombre}: ${await p.text()}`);
          continue;
        }
      }
      hecho.push(`${c.nombre} · ${f.anio} · ${f.viviendas} viviendas · ${f.superficie ?? "?"} m² · ${f.plantas.length} plantas`);

      // EL CANARIO, en dos niveles. No es lo mismo "AV DR FLEMING" contra
      // "AV DOCTOR FLEMING" -la misma, escrita distinto- que "AV ESPAÑA 27"
      // contra "CL HOSPITALET DE LLOBREGAT 8", que es OTRA CALLE. Lo segundo es
      // el problema de las subvenciones; lo primero no es problema.
      // Aqui no se corrige nada: solo se informa.
      if (f.direccion) {
        const oficial = `${f.direccion}${f.municipio ? ", " + f.municipio : ""}`;
        const q = comparar(c.nombre, f.direccion);
        if (q === "otra") otraDireccion.push({ nombre: c.nombre, catastro: oficial });
        else if (q === "forma") soloLaForma.push({ nombre: c.nombre, catastro: oficial });
      }
    } catch (e) {
      fallos.push(`${c.nombre}: ${e instanceof Error ? e.message : String(e)}`);
    }
    // Despacio. Yendo mas rapido, Catastro corta la conexion: la mitad de la
    // primera tanda fallo asi.
    await new Promise((x) => setTimeout(x, 1200));
  }

  const quedan = pendientes.length - hecho.length;

  return NextResponse.json({
    ok: true,
    rellenadas: hecho.length,
    quedan,
    segundos: Math.round((Date.now() - empezado) / 100) / 10,
    ejemplos: hecho.slice(0, 8),
    sinFichaEnCatastro: sinFicha,
    OJO_OTRA_DIRECCION: otraDireccion,
    soloEscritaDistinto: soloLaForma,
    fallos,
  });
}
