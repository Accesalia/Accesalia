// scripts/catastro_opps_sin_accesos_todas.mts
//
// LAS 777 OPPS SIN ACCESOS (Monica, 13-oct-2026): "toda opp debe tener clave; si
// queda una opp sin clave, es que algo falla". No tienen accesos porque nunca se
// buscaron en Catastro (las busquedas en lote fueron de abiertas y de 2025-26).
// Casi todas son carpetas antiguas del Dropbox, cerradas y sin nombre; lo que si
// tienen es su comunidad, cuyo nombre es la direccion de la carpeta.
//
// Las mismas piezas que la ventana "Buscar la direccion" del alta y que
// scripts/catastro_de_opps_sin_accesos.mts (las 23 de esta mañana):
//   buscar la calle y el numero -> portales del numero -> guardar la ficha ->
//   enlazar los accesos -> nombre de la opp (solo si no tenia) -> su comunidad
//   (comunidadDesdeAccesos) -> SU CLAVE (claveDesdeAccesos).
// Lo que no sale claro (calle que no se encuentra, varias vias, numero que no
// existe, sin portales con viviendas) NO se escribe: va a la lista de dudosas.
// Fuera: Mirador del Pardo 7 (DAN-2025-291), "es imposible".
//
//   cd frontend && NODE_PATH="$(pwd)/node_modules/next/dist/compiled" \
//     npx tsx --conditions=react-server ../scripts/catastro_opps_sin_accesos_todas.mts --grupo=prioritarias [--escribir]
//   --grupo=prioritarias  las abiertas y las que tienen alguna hoja
//   --grupo=antiguas      el resto (cerradas sin hojas)
//   --solo=DAN-2016-162   una

import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.produccion", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;

const { partirLinea, buscarCalle, buscarNumero, portalesDe, guardarFicha } = await import("../frontend/lib/buscarDireccion.ts");
const { enlazarAccesos, comunidadDesdeAccesos } = await import("../frontend/lib/altaOportunidad.ts");
const { claveDesdeAccesos } = await import("../frontend/lib/claves.ts");
const { nombrePropuesto } = await import("../frontend/lib/direccionNombre.ts");

const ESCRIBIR = process.argv.includes("--escribir");
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const GRUPO = arg("grupo") ?? "prioritarias";
const SOLO = arg("solo");
// EXCEPCIONES CONOCIDAS (memoria catastro-opps-abiertas-9-oct): ya revisadas con Monica varias veces; no se
// buscan ni salen como dudosas. El control de opps sin clave las enseña aparte, como conocidas.
export const CONOCIDAS: Record<string, string> = {
  "DAN-2025-291": "Mirador del Pardo 7, Las Rozas: imposible de encontrar (Monica, 13-oct)",
  "ALV-2026-168": "Modesto Lafuente 24: ni 24 ni 42 existen en Catastro; pendiente del comercial",
  "ALV-2026-046": "Lopez de Hoyos 163: calle o glorieta; pendiente del comercial",
  "DAN-2026-164": "Antonio Grilo 7: no existe el 7; pendiente del comercial",
  "ALV-2026-137": "Polvoranca 6 (¿Alcorcon?): pendiente del comercial",
  "DAN-2025-415": "San Pablo II, Avila: pendiente del comercial",
  "ALV-2026-134": "Alfonso XII sin numero: pendiente del comercial",
  "DAN-2025-424": "CEIP Tierno Galvan, Alcala: sin Catastro a proposito",
  "DAN-2025-436": "Garaje Mejico s/n, Fuenlabrada: sin Catastro a proposito",
  // Nombres pegados sin arreglo (Monica, 14-oct: "todas las que sean anteriores a 2022, las obviamos: no interesan
  // y no tienen datos"), y las que no son una direccion o no tienen numero.
  "DAN-2016-159": "Prado San Juan 46, Guadarrama: Catastro no da numeros; anterior a 2022, se obvia",
  "DAN-2016-187": "Plaza Fuensanta 4, Mostoles: PL o PZ; anterior a 2022, se obvia",
  "DAN-2016-188": "Plaza Fuensanta 7, Mostoles: PL o PZ; anterior a 2022, se obvia",
  "DAN-2020-068": "Carrefour Market, San Martin de Valdeiglesias: un local; anterior a 2022, se obvia",
  "DAN-2015-010": "Calle de la Estacion, Fuenlabrada: sin numero; anterior a 2022, se obvia",
  "DAN-2021-096": "Carretera de Galapagar, Torrelodones: sin numero; anterior a 2022, se obvia",
  "DAN-2017-071": "Hospital de la Fuenfria (Cercedilla): no es una direccion; anterior a 2022, se obvia",
  "DAN-2019-029": "Corregidor Juan de Boadilla 37: no esta en el callejero; anterior a 2022, se obvia",
  "DAN-2017-129": "Jeronimo Historias Rehabilitacion: no es una direccion; anterior a 2022, se obvia",
  "DAN-2022-159": "Direccion pendiente de concretar (Arroyomolinos): no es una direccion",
  "DAN-2023-168": "Urb. Jardin de Villarejo, Villarejo de Salvanes: sin numero",
  // De 2022 en adelante que no se encuentran (Monica, 14-oct: "no soy capaz, no existen").
  "DAN-2022-282": "Inmaculada 13: no existe el 13",
  "DAN-2022-019": "Empecinado 13, Mostoles: sin numeros en Catastro",
  "DAN-2023-138": "Ferrovial 9: calle dudosa (¿Ferroviarios?)",
  "DAN-2023-109": "Oriente 9, Fuenlabrada: no existe el 9",
  "DAN-2022-106": "Pico de Cotos 63, Collado Villalba: no existe el 63",
  "DAN-2022-284": "Recalde 9: no existe el 9",
  "DAN-2023-245": "Apostol Santiago 25: no existe el 25",
  "DAN-2022-234": "Ntra Sra de la Merced 11, Leganes: no existe; la parcela 4543501VK3645S tiene Merced 1 y 3 y Los Angeles 6 y 8",
  "DAN-2022-250": "Portugal 44, Fuenlabrada: sin viviendas en Catastro",
  "DAN-2022-113": "Rio Miño 4: calle no encontrada",
  "DAN-2022-227": "Ntra Sra de las Angustias 14, MADRID: no existe en Madrid; ¿duplicada de DAN-2022-179 (Leganes)?",
  "DAN-2022-193": "Av Carlos V 51-65, Mostoles: sin viviendas en Catastro",
  "DAN-2024-229": "Aragon-Cerrolaza, Pozuelo: sin numero",
  "DAN-2022-119": "Cerro Prieto 7, Mostoles: sin numeros en Catastro",
  "DAN-2022-293": "Soria 1: no existe el 1",
};
const FUERA = new Set(Object.keys(CONOCIDAS));
// NOMBRES PEGADOS de las carpetas antiguas (Monica, 13-oct: "solo las de nombre pegado, es muy facil resolverlas"),
// separados contra el callejero oficial de su municipio (vias_catastro). Con --corregidas se procesan solo estas.
const CORREGIDO: Record<string, string> = {
  "CAR-2025-069": "CALLE CAMINO VIEJO DE LEGANES 237 MADRID", // en Leganes no existe; la calle es de Madrid
  "DAN-2015-015": "CALLE NTRA SRA ESPERANZA 5 LEGANES",
  "DAN-2015-018": "CALLE NTRA SRA D L ANGUSTIAS 18 LEGANES",
  "DAN-2016-001": "CALLE ALFEREZ LUIS MARTIN VIDAL 2 VILLAVICIOSA DE ODON",
  "DAN-2016-103": "CALLE DR BARRAQUER 14 GETAFE",
  "DAN-2016-136": "CALLE NTRA SRA DEL PILAR 2 LEGANES",
  "DAN-2016-148": "PASEO EXTREMADURA 244 MADRID", // la carpeta dice DUPLICADO
  "DAN-2016-151": "CALLE NAZARIO CALONGE 5 SAN FERNANDO DE HENARES", // "solo el 5" (Monica, 14-oct)
  "DAN-2016-206": "COLONIA ALMENDROS 9 ARGANDA DEL REY",
  "DAN-2017-063": "URBANIZACION RESIDENCIALES LOS 10 COLMENAR VIEJO",
  "DAN-2018-034": "AVENIDA FCO JAVIER SAUQUILLO 30 FUENLABRADA",
  "DAN-2022-288": "AVENIDA FCO JAVIER SAUQUILLO 2 FUENLABRADA",
  "DAN-2019-001": "AVENIDA GENERAL PALACIO 6 GETAFE", // hay avenida y plaza
  "DAN-2019-035": "CALLE NTRA SRA MACARENA 11 LEGANES",
  "DAN-2022-029": "CALLE NTRA SRA MACARENA 5 LEGANES",
  "DAN-2020-073": "CALLE NTRA SRA DE BEGOÑA 1 LEGANES",
  "DAN-2021-003": "AVENIDA DOCTOR MARTIN VEGUE 33-35-37 LEGANES",
  "DAN-2021-010": "CALLE ISLA DE CORCEGA 20 ALCOBENDAS", // la carpeta dice CORDEGA
  "DAN-2022-261": "CALLE GENERAL MILLAN ASTRAY 21-37 MADRID", // "MILLANASTRAY21A37": "toda la comunidad, todos los portales" (Monica, 14-oct)
  "DAN-2022-030": "CALLE OLIMPICO AURELIO GARCIA 2-18 ALCORCON", // "del 2 al 18, la manzana entera (es un recinto)" (Monica, 14-oct)
  "DAN-2022-179": "CALLE NTRA SRA D L ANGUSTIAS 14 LEGANES",
  "DAN-2022-195": "CALLE CAMINO DE HUMANES 27 MOSTOLES",
  "DAN-2022-248": "CALLE NTRA SRA DE LA MERCED 1 LEGANES",
};
const CAB = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };
async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${ruta}`, { headers: CAB });
  if (!r.ok) throw new Error(`${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

type Opp = {
  id: string; codigo: string; nombre: string | null; estado: string; comunidad_id: string | null; comunidad_provisional: string | null;
  comunidad: { nombre: string } | null; hojas: { id: string }[]; accesos: { opp_id: string; hasta: string | null }[];
};
const todas: Opp[] = [];
for (let desde = 0; ; desde += 1000) {
  const tanda = await leer<Opp[]>(
    "oportunidades?select=id,codigo,nombre,estado,comunidad_id,comunidad_provisional,comunidad:comunidad_id(nombre),hojas:hojas_encargo(id)," +
      `accesos:relacion_oportunidad_accesos(opp_id,hasta)&order=codigo,id&offset=${desde}&limit=1000`,
  );
  todas.push(...tanda);
  if (tanda.length < 1000) break;
}
const sinAccesos = todas.filter((o) => !o.accesos.some((a) => !a.hasta) && !FUERA.has(o.codigo));
const prioritaria = (o: Opp) => o.estado === "abierta" || o.hojas.length > 0;
// --dudosas: solo las que salieron dudosas en la ultima pasada de ese grupo (docs/opps_sin_accesos_<grupo>.json)
const DUDOSAS = process.argv.includes("--dudosas")
  ? new Set((JSON.parse(readFileSync(new URL(`../docs/opps_sin_accesos_${GRUPO}.json`, import.meta.url), "utf8")) as { codigo: string; resultado: string }[])
      .filter((x) => x.resultado === "dudosa").map((x) => x.codigo))
  : null;
// --claras: solo las que salieron claras en las pasadas en seco (la del grupo y la de sus dudosas)
const CLARAS = process.argv.includes("--claras")
  ? new Set([`../docs/opps_sin_accesos_${GRUPO}.json`, `../docs/opps_sin_accesos_${GRUPO}_dudosas.json`].flatMap((f) => {
      try { return (JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8")) as { codigo: string; resultado: string }[]).filter((x) => x.resultado === "ok").map((x) => x.codigo); } catch { return []; }
    }))
  : null;
const CORREGIDAS = process.argv.includes("--corregidas");
const opps = sinAccesos.filter((o) => !CORREGIDAS || o.codigo in CORREGIDO).filter((o) => !CLARAS || CLARAS.has(o.codigo)).filter((o) => (SOLO ? o.codigo === SOLO : GRUPO === "prioritarias" ? prioritaria(o) : !prioritaria(o)) && (!DUDOSAS || DUDOSAS.has(o.codigo)));
console.log(`${sinAccesos.length} opps sin accesos; grupo ${SOLO ?? GRUPO}: ${opps.length}${ESCRIBIR ? "" : " (en seco)"}\n`);

const salida: Record<string, unknown>[] = [];
let bien = 0;
for (const o of opps) {
  const escrito = CORREGIDO[o.codigo] ?? (o.nombre ?? o.comunidad?.nombre ?? o.comunidad_provisional ?? "").replace(/^CP\s+/i, "").trim();
  const fila: Record<string, unknown> = { codigo: o.codigo, estado: o.estado, hojas: o.hojas.length, buscado: escrito };
  try {
    if (!escrito) throw new Error("no hay direccion que buscar");
    const e = await partirLinea(escrito);
    const c = await buscarCalle(e.calle, e.municipio, e.tipo);
    if (c.paso !== "vias") throw new Error(c.paso === "nada" ? `calle: ${c.motivo || "no la encuentro"}` : "calle en varios municipios");
    c.vias = c.vias.filter((v, i) => c.vias.findIndex((w) => w.tipo === v.tipo && w.nombre === v.nombre) === i);
    // Regla de Monica (9-oct): CARPETA SIN TIPO DE VIA = CALLE. Si lo escrito no dice el tipo y entre las vias
    // hay una calle (CL), es esa: "Guzman el Bueno 56" es la calle, no la glorieta.
    if (c.vias.length > 1 && !e.tipo) {
      const calles = c.vias.filter((v) => v.tipo === "CL");
      if (calles.length === 1) c.vias = calles;
    }
    if (c.vias.length !== 1) throw new Error(`varias vias: ${c.vias.map((v) => `${v.tipo} ${v.nombre}`).join(" / ")}`);
    const via = c.vias[0];
    if (!e.numero) throw new Error(`sin numero (${via.tipo} ${via.nombre})`);
    // EL GUION Y LA LETRA (13-oct, fallo de la primera pasada): "35-1" en Majadahonda es el PORTAL 1 del 35
    // (Catastro: 35(1)); "129-131" o "19-21-23" son VARIOS NUMEROS; "17 A" es el portal 17(A). Antes se cogia
    // el primer numero con todos sus portales.
    const tras = escrito.match(new RegExp(String.raw`\b${e.numero}((?:\s*-\s*\d+)+)`))?.[1];
    const guion = tras ? tras.split("-").map((x) => x.trim()).filter(Boolean) : [];
    const letra = escrito.match(new RegExp(String.raw`\b${e.numero}\s+([A-Z])\b(?!\s*Y\b)`))?.[1];
    const parcelas: string[] = [];
    const portales: Awaited<ReturnType<typeof portalesDe>> = [];
    const sumaNumero = async (num: string) => {
      const n = await buscarNumero(via, num);
      if (n.paso !== "edificios") throw new Error(`numero ${num} en ${via.tipo} ${via.nombre}: ${n.paso}${n.paso === "sin_numero" ? ` (hay ${n.sugeridos.join(", ")})` : ""}`);
      const nuevas = [...new Set(n.edificios.map((x) => x.parcela))].filter((x) => !parcelas.includes(x));
      parcelas.push(...nuevas);
      if (nuevas.length) portales.push(...(await portalesDe(nuevas)));
    };
    await sumaNumero(e.numero);
    const subportal = (sub: string) => portales.filter((p) => p.numero === `${e.numero}(${sub})`);
    let elegidos: typeof portales;
    if (guion.length === 1 && subportal(guion[0]).length) {
      elegidos = subportal(guion[0]);                                   // 35-1 -> 35(1)
    } else if (letra && subportal(letra).length) {
      elegidos = subportal(letra);                                      // 17 A -> 17(A)
    } else {
      let numeros = [e.numero, ...guion];
      // "28-38": un rango -> los de su misma acera (de 2 en 2). "19-21-23": los escritos.
      if (guion.length === 1 && parseInt(guion[0]) > parseInt(e.numero) + 2) {
        numeros = [];
        for (let k = parseInt(e.numero); k <= parseInt(guion[0]); k += 2) numeros.push(String(k));
      }
      for (const num of numeros.slice(1)) await sumaNumero(num);
      const conViv = (num: string) => portales.filter((p) => p.viviendas > 0 && parseInt(p.numero) === parseInt(num));
      elegidos = portales.length === 1 ? portales : numeros.flatMap(conViv);
    }
    if (!elegidos.length) throw new Error(`sin portales con viviendas en el ${e.numero} (parcela ${parcelas.join(", ")})`);
    // Un acceso que YA es de OTRA comunidad no se vincula: se aparta para mirarlo (13-oct; caso Virgen de Iciar 15 esc 4).
    for (const p of elegidos) {
      const ya = await leer<{ figura_legal_propietaria_id: string | null }[]>(
        `accesos?select=figura_legal_propietaria_id&municipio=eq.${encodeURIComponent(via.municipio)}&tipo_via=eq.${encodeURIComponent(p.tipo_via)}` +
          `&nombre_via=eq.${encodeURIComponent(p.nombre_via)}&numero=eq.${encodeURIComponent(p.numero)}&escalera=eq.${encodeURIComponent(p.escalera)}`,
      );
      const otra = ya.find((a) => a.figura_legal_propietaria_id && a.figura_legal_propietaria_id !== o.comunidad_id);
      if (otra) throw new Error(`el acceso ${p.nombre_via} ${p.numero}${p.escalera ? ` esc ${p.escalera}` : ""} ya es de OTRA comunidad`);
    }
    const nombre = nombrePropuesto(elegidos, portales, via.municipio);
    Object.assign(fila, { resultado: "ok", via: `${via.tipo} ${via.nombre}`, municipio: via.municipio, parcela: parcelas.join(" "), nombre,
      accesos: elegidos.map((p) => `${p.numero}${p.escalera ? ` esc ${p.escalera}` : ""}`).join(" · ") });
    console.log(`✓ ${o.codigo}  «${escrito}» → ${nombre}  [${fila.accesos}]`);
    bien++;
    if (ESCRIBIR) {
      const claves = elegidos.map((p) => p.clave);
      const ids: string[] = [];
      for (const parcela of parcelas) {
        const ficha = await guardarFicha(parcela);
        for (const p of ficha.portales) if (claves.includes(`${parcela}|${p.numero}|${p.escalera}`)) ids.push(p.id);
      }
      await enlazarAccesos(o.id, ids, "Buscada en Catastro por la direccion de su comunidad (Monica, 13-oct-2026): opp sin accesos");
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/oportunidades?id=eq.${o.id}&nombre=is.null`, {
        method: "PATCH", headers: CAB, body: JSON.stringify({ nombre }),
      });
      if (!r.ok) throw new Error(`nombre ${r.status}: ${await r.text()}`);
      await comunidadDesdeAccesos(o.id);
      const clave = await claveDesdeAccesos(o.id);
      fila.clave = clave;
      if (!clave) throw new Error("guardada pero SIN CLAVE");
    }
  } catch (err) {
    Object.assign(fila, { resultado: "dudosa", motivo: (err as Error).message });
    console.log(`? ${o.codigo}  «${escrito}»  ${(err as Error).message}`);
  }
  salida.push(fila);
}
const fichero = new URL(`../docs/opps_sin_accesos_${SOLO ?? GRUPO}${DUDOSAS ? "_dudosas" : ""}${CLARAS ? "_escritas" : ""}${CORREGIDAS ? "_pegadas" : ""}.json`, import.meta.url);
writeFileSync(fichero, JSON.stringify(salida, null, 1));
console.log(`\nclaras: ${bien} | dudosas: ${opps.length - bien} -> ${fichero.pathname}`);
