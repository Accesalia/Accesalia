// scripts/arreglo_guiones_opps.mts
//
// ARREGLO DEL GUION Y LA LETRA (Monica, 13-oct-2026: "todo ok, adelante con todo"). En la primera pasada de
// catastro_opps_sin_accesos_todas.mts se cogio el primer numero con todos sus portales:
//   TIPO 1, sobran accesos: "35-1" (Majadahonda) es el PORTAL 35(1), no los 8 del 35; "17 A" es 17(A).
//     -> se CIERRAN los enlaces que sobran (hasta = hoy; no se borran), sus accesos dejan de ser de esa
//        comunidad si se les puso en esta pasada, y se rehacen el nombre de la opp y el de la clave.
//   TIPO 2, faltan numeros: "129-131", "19-21-23" -> se buscan en Catastro y se enlazan los que faltan.
//   Mar Menor 28-38 (DAN-2022-115): todos los pares (Monica, 13-oct: SATE de manzana completa).
//   cd frontend && NODE_PATH="$(pwd)/node_modules/next/dist/compiled" npx tsx --conditions=react-server ../scripts/arreglo_guiones_opps.mts [--escribir]

import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.produccion", import.meta.url), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;
const { partirLinea, buscarCalle, buscarNumero, portalesDe, guardarFicha } = await import("../frontend/lib/buscarDireccion.ts");
const { enlazarAccesos, comunidadDesdeAccesos } = await import("../frontend/lib/altaOportunidad.ts");
const { claveDesdeAccesos, nombreDeClave } = await import("../frontend/lib/claves.ts");

const ESCRIBIR = process.argv.includes("--escribir");
const HOY = new Date().toISOString().slice(0, 10);
const CAB = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };
const leer = async <T,>(r: string): Promise<T> => { const x = await fetch(`${env.SUPABASE_URL}/rest/v1/${r}`, { headers: CAB }); if (!x.ok) throw new Error(`${r} ${x.status}: ${await x.text()}`); return (await x.json()) as T; };
const patch = async (r: string, b: unknown) => { const x = await fetch(`${env.SUPABASE_URL}/rest/v1/${r}`, { method: "PATCH", headers: CAB, body: JSON.stringify(b) }); if (!x.ok) throw new Error(`${r} ${x.status}: ${await x.text()}`); };

const SOBRAN: Record<string, string[]> = {   // opp -> numeros (de Catastro) que SE QUEDAN
  "DAN-2017-156": ["35(1)"],
  "DAN-2017-166": ["1(2)"],
  "DAN-2016-130": ["14(2)"],
  "DAN-2017-025": ["17(A)"],
  "DAN-2017-034": ["6(A)"],
};
const FALTAN: Record<string, string[]> = {   // opp -> direcciones que faltan
  "DAN-2015-032": ["PASEO SANTA MARIA DE LA CABEZA 131 MADRID"],
  "DAN-2016-059": ["NAZARET 11 FUENLABRADA"],
  "DAN-2021-005": ["MIRAFLORES 8 ALCOBENDAS"],
  "DAN-2021-088": ["SANGENJO 21 MADRID", "SANGENJO 23 MADRID"],
  "DAN-2023-185": ["AV ESPAÑA 39 MAJADAHONDA", "AV ESPAÑA 41 MAJADAHONDA"],
  // Monica, 13-oct: "eran todos los pares, un SATE de manzana completa"
  "DAN-2022-115": ["MAR MENOR 30 MADRID", "MAR MENOR 32 MADRID", "MAR MENOR 34 MADRID", "MAR MENOR 36 MADRID", "MAR MENOR 38 MADRID"],
};
// --solo=CODIGO: solo esa opp (las demas ya estan arregladas)
const SOLO = process.argv.find((a) => a.startsWith("--solo="))?.slice(7);
for (const k of Object.keys(SOBRAN)) if (SOLO && k !== SOLO) delete SOBRAN[k];
for (const k of Object.keys(FALTAN)) if (SOLO && k !== SOLO) delete FALTAN[k];
type Acc = { id: string; municipio: string; nombre_via: string; numero: string; escalera: string; figura_legal_propietaria_id: string | null };
const vivos = async (oppId: string) =>
  (await leer<{ acceso_id: string; acceso: Acc }[]>(`relacion_oportunidad_accesos?select=acceso_id,acceso:acceso_id(id,municipio,nombre_via,numero,escalera,figura_legal_propietaria_id)&opp_id=eq.${oppId}&hasta=is.null`)).map((r) => r.acceso);
const opp = async (codigo: string) => (await leer<{ id: string; comunidad_id: string | null; nombre: string | null }[]>(`oportunidades?select=id,comunidad_id,nombre&codigo=eq.${codigo}`))[0];
const rehacer = async (o: { id: string }) => {
  const acc = await vivos(o.id);
  const nombre = nombreDeClave(acc);
  if (ESCRIBIR) { await patch(`oportunidades?id=eq.${o.id}`, { nombre }); await comunidadDesdeAccesos(o.id); await claveDesdeAccesos(o.id); }
  return nombre;
};

for (const [codigo, quedan] of Object.entries(SOBRAN)) {
  const o = await opp(codigo);
  const acc = await vivos(o.id);
  const fuera = acc.filter((a) => !quedan.includes(a.numero));
  console.log(`TIPO 1 ${codigo}: quedan ${acc.filter((a) => quedan.includes(a.numero)).map((a) => a.numero).join(", ")} | se cierran ${fuera.map((a) => `${a.numero}${a.escalera ? ` esc ${a.escalera}` : ""}`).join(", ")}`);
  if (!fuera.length) continue;
  if (ESCRIBIR) {
    await patch(`relacion_oportunidad_accesos?opp_id=eq.${o.id}&acceso_id=in.(${fuera.map((a) => a.id).join(",")})&hasta=is.null`, { hasta: HOY });
    const deSuCp = fuera.filter((a) => a.figura_legal_propietaria_id === o.comunidad_id).map((a) => a.id);
    if (deSuCp.length) await patch(`accesos?id=in.(${deSuCp.join(",")})`, { figura_legal_propietaria_id: null });
  }
  console.log(`   nombre: ${await rehacer(o)}`);
}

for (const [codigo, dirs] of Object.entries(FALTAN)) {
  const o = await opp(codigo);
  for (const d of dirs) {
    try {
      const e = await partirLinea(d);
      const c = await buscarCalle(e.calle, e.municipio, e.tipo);
      if (c.paso !== "vias") throw new Error("calle no encontrada");
      let vias = c.vias.filter((v, i) => c.vias.findIndex((w) => w.tipo === v.tipo && w.nombre === v.nombre) === i);
      if (vias.length > 1 && !e.tipo) { const cl = vias.filter((v) => v.tipo === "CL"); if (cl.length === 1) vias = cl; }
      if (vias.length !== 1) throw new Error(`varias vias: ${vias.map((v) => `${v.tipo} ${v.nombre}`).join(" / ")}`);
      const n = await buscarNumero(vias[0], e.numero);
      if (n.paso !== "edificios") throw new Error(`el ${e.numero} no existe en Catastro`);
      const parcelas = [...new Set(n.edificios.map((x) => x.parcela))];
      const portales = await portalesDe(parcelas);
      const elegidos = portales.filter((p) => p.viviendas > 0 && parseInt(p.numero) === parseInt(e.numero));
      if (!elegidos.length) throw new Error("sin portales con viviendas");
      console.log(`TIPO 2 ${codigo}: + ${d} -> ${elegidos.map((p) => `${p.numero}${p.escalera ? ` esc ${p.escalera}` : ""}`).join(", ")}`);
      if (ESCRIBIR) {
        const claves = elegidos.map((p) => p.clave);
        const ids: string[] = [];
        for (const parcela of parcelas) { const f = await guardarFicha(parcela); for (const p of f.portales) if (claves.includes(`${parcela}|${p.numero}|${p.escalera}`)) ids.push(p.id); }
        await enlazarAccesos(o.id, ids, `Numero que faltaba por el guion de la carpeta (Monica, 13-oct-2026): ${d}`);
      }
    } catch (err) { console.log(`TIPO 2 ${codigo}: ✗ ${d}: ${(err as Error).message}`); }
  }
  console.log(`   nombre: ${await rehacer(o)}`);
}
console.log(ESCRIBIR ? "ESCRITO" : "(en seco)");
