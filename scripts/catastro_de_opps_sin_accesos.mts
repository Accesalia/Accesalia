// scripts/catastro_de_opps_sin_accesos.mts
//
// LAS OPPS SIN ACCESOS (Monica, 13-oct-2026): "bajate a mano la ficha de
// Catastro de esas 23, me gustaria dejarlas correctas, sobre todo con sus
// nombres". Son cerradas con hojas de encargo que nunca tuvieron accesos.
// Se hace con LAS MISMAS PIEZAS que la ventana "Buscar la direccion" del alta
// (lib/buscarDireccion.ts) y lo mismo que hace al confirmar: guardar la ficha,
// vincular los accesos (lib/altaOportunidad.ts, enlazarAccesos), su comunidad
// (comunidadDesdeAccesos) y el nombre que propone (nombrePropuesto).
//
//   npx tsx --conditions=react-server scripts/catastro_de_opps_sin_accesos.mts            -> solo ensena
//   ... --escribir                                                                          -> ademas lo guarda
//   ... --solo=DAN-2022-104 --portales=clave1,clave2                                       -> una, a mano

import { readFileSync } from "node:fs";

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
const { nombrePropuesto } = await import("../frontend/lib/direccionNombre.ts");

const ESCRIBIR = process.argv.includes("--escribir");
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const SOLO = arg("solo");
const A_MANO = arg("portales")?.split(",");
const CAB = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };
async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${ruta}`, { headers: CAB });
  if (!r.ok) throw new Error(`${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}

type Opp = { id: string; codigo: string; comunidad: { nombre: string } | null; hojas: { id: string }[]; accesos: { opp_id: string }[] };
const todas = await leer<Opp[]>(
  "oportunidades?select=id,codigo,comunidad:comunidad_id(nombre),hojas:hojas_encargo!inner(id),accesos:relacion_oportunidad_accesos(opp_id)" +
    "&estado=eq.cerrada&nombre=is.null&order=codigo",
);
const opps = todas.filter((o) => !o.accesos.length && (!SOLO || o.codigo === SOLO));
console.log(`${opps.length} opps cerradas con hojas y sin accesos\n`);

// Lo que el nombre de la CP no dice y su texto provisional si (mirado a mano).
const CORREGIDO: Record<string, string> = {
  "DAN-2020-071": "AV DOS DE MAYO 73 MOSTOLES", // provisional "avdosdemayo73": la avenida
  "DAN-2021-041": "AV DOCTOR MARTIN VEGUE 22 LEGANES", // escrito todo junto; en Catastro, sin "Jaudenes"
};
// Dos calles OVIEDO en Mostoles (codigos 429 y 435): por nombre Catastro no da
// el 9; por codigo (429), si. Su parcela, directa.
const PARCELA: Record<string, { parcela: string; numero: string; municipio: string }> = {
  "DAN-2022-134": { parcela: "5940101VK2654S", numero: "9", municipio: "MOSTOLES" },
};
// El edificio entero: "etruria26-28lucano65 (SATE)" son los tres portales de la parcela.
const TODA_LA_PARCELA = new Set(["DAN-2022-104"]);

for (const o of opps) {
  const escrito = CORREGIDO[o.codigo] ?? (o.comunidad?.nombre ?? "").replace(/^CP\s+/i, "");
  const linea = `${o.codigo}  «${escrito}»`;
  try {
    const e = await partirLinea(escrito);
    const directa = PARCELA[o.codigo];
    const c = directa
      ? { paso: "vias" as const, municipio: directa.municipio, parecidas: false, vias: [{ tipo: "", nombre: "", municipio: directa.municipio, provincia: "" }] }
      : await buscarCalle(e.calle, e.municipio, e.tipo);
    if (c.paso !== "vias") { console.log(`${linea}\n   ✗ calle: ${c.paso === "nada" ? c.motivo || "no la encuentro" : "en varios municipios"}\n`); continue; }
    // La misma via dos veces en el callejero es una sola.
    c.vias = c.vias.filter((v, i) => c.vias.findIndex((w) => w.tipo === v.tipo && w.nombre === v.nombre) === i);
    if (c.vias.length !== 1) { console.log(`${linea}\n   ? varias vias: ${c.vias.map((v) => `${v.tipo} ${v.nombre}`).join(" / ")}\n`); continue; }
    const via = c.vias[0];
    const n = directa
      ? { paso: "edificios" as const, edificios: [{ parcela: directa.parcela, numero: directa.numero, etiqueta: "" }] }
      : await buscarNumero(via, e.numero);
    if (n.paso !== "edificios") { console.log(`${linea}\n   ✗ numero ${e.numero} en ${via.tipo} ${via.nombre}: ${n.paso}${n.paso === "sin_numero" ? ` (hay ${n.sugeridos.join(", ")})` : ""}\n`); continue; }
    const parcelas = [...new Set(n.edificios.map((x) => x.parcela))];
    const portales = await portalesDe(parcelas);
    // Lo que marcaria el alta: los portales con viviendas del numero escrito
    // (todas sus escaleras); si la parcela tiene un solo portal, ese.
    const delNumero = portales.filter((p) => p.viviendas > 0 && parseInt(p.numero) === parseInt(e.numero));
    const elegidos = A_MANO
      ? portales.filter((p) => A_MANO.includes(p.clave))
      : TODA_LA_PARCELA.has(o.codigo)
        ? portales.filter((p) => p.viviendas > 0)
        : portales.length === 1 ? portales : delNumero;
    const nombre = elegidos.length ? nombrePropuesto(elegidos, portales, via.municipio) : "";
    const resto = portales.filter((p) => !elegidos.includes(p));
    console.log(`${linea}\n   ${via.tipo} ${via.nombre} ${e.numero}, ${via.municipio} · parcela ${parcelas.join(", ")}`);
    console.log(`   marca: ${elegidos.map((p) => `${p.nombre_via} ${p.numero}${p.escalera ? ` esc ${p.escalera}` : ""} (${p.viviendas} viv)`).join(" · ") || "NADA"}`);
    if (resto.length) console.log(`   no marca: ${resto.map((p) => `${p.nombre_via} ${p.numero}${p.escalera ? ` esc ${p.escalera}` : ""} (${p.viviendas} viv)`).join(" · ")}`);
    console.log(`   nombre: ${nombre || "—"}\n`);

    if (ESCRIBIR && elegidos.length) {
      const claves = elegidos.map((p) => p.clave);
      const ids: string[] = [];
      for (const parcela of parcelas) {
        const ficha = await guardarFicha(parcela);
        for (const p of ficha.portales) if (claves.includes(`${parcela}|${p.numero}|${p.escalera}`)) ids.push(p.id);
      }
      await enlazarAccesos(o.id, ids, "Buscada a mano en Catastro para dejarla correcta (Monica, 13-oct-2026): opp cerrada con hojas y sin accesos");
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/oportunidades?id=eq.${o.id}&nombre=is.null`, {
        method: "PATCH", headers: CAB, body: JSON.stringify({ nombre, referencia_catastral: parcelas[0] }),
      });
      if (!r.ok) throw new Error(`nombre ${r.status}: ${await r.text()}`);
      await comunidadDesdeAccesos(o.id);
      console.log(`   ✓ guardada: ${ids.length} accesos\n`);
    }
  } catch (err) {
    console.log(`${linea}\n   ✗ error: ${(err as Error).message}\n`);
  }
}
