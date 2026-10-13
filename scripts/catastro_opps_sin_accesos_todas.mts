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
};
const FUERA = new Set(Object.keys(CONOCIDAS));
const CAB = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };
async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${ruta}`, { headers: CAB });
  if (!r.ok) throw new Error(`${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

type Opp = {
  id: string; codigo: string; nombre: string | null; estado: string; comunidad_provisional: string | null;
  comunidad: { nombre: string } | null; hojas: { id: string }[]; accesos: { opp_id: string; hasta: string | null }[];
};
const todas: Opp[] = [];
for (let desde = 0; ; desde += 1000) {
  const tanda = await leer<Opp[]>(
    "oportunidades?select=id,codigo,nombre,estado,comunidad_provisional,comunidad:comunidad_id(nombre),hojas:hojas_encargo(id)," +
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
const opps = sinAccesos.filter((o) => (SOLO ? o.codigo === SOLO : GRUPO === "prioritarias" ? prioritaria(o) : !prioritaria(o)) && (!DUDOSAS || DUDOSAS.has(o.codigo)));
console.log(`${sinAccesos.length} opps sin accesos; grupo ${SOLO ?? GRUPO}: ${opps.length}${ESCRIBIR ? "" : " (en seco)"}\n`);

const salida: Record<string, unknown>[] = [];
let bien = 0;
for (const o of opps) {
  const escrito = (o.nombre ?? o.comunidad?.nombre ?? o.comunidad_provisional ?? "").replace(/^CP\s+/i, "").trim();
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
    const n = await buscarNumero(via, e.numero);
    if (n.paso !== "edificios") throw new Error(`numero ${e.numero} en ${via.tipo} ${via.nombre}: ${n.paso}${n.paso === "sin_numero" ? ` (hay ${n.sugeridos.join(", ")})` : ""}`);
    const parcelas = [...new Set(n.edificios.map((x) => x.parcela))];
    const portales = await portalesDe(parcelas);
    const delNumero = portales.filter((p) => p.viviendas > 0 && parseInt(p.numero) === parseInt(e.numero));
    const elegidos = portales.length === 1 ? portales : delNumero;
    if (!elegidos.length) throw new Error(`sin portales con viviendas en el ${e.numero} (parcela ${parcelas.join(", ")})`);
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
const fichero = new URL(`../docs/opps_sin_accesos_${SOLO ?? GRUPO}${DUDOSAS ? "_dudosas" : ""}.json`, import.meta.url);
writeFileSync(fichero, JSON.stringify(salida, null, 1));
console.log(`\nclaras: ${bien} | dudosas: ${opps.length - bien} -> ${fichero.pathname}`);
