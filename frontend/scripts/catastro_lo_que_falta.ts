// EL CATASTRO QUE LES FALTA A LAS OPPS ABIERTAS (Monica, 27-oct-2026: «ok a rellenarlas»).
//
// Las opps abiertas o pausadas con referencia catastral cuyo edificio no esta guardado, o esta sin coordenadas. Sin
// coordenadas la ficha salia a Catastro y al geoportal al abrirla, y tardaba hasta dos minutos. Usa EXACTAMENTE el
// mismo codigo que la ficha (lib/informeEdificio.ts, refrescando) y guarda donde ella: la copia de Catastro
// (ficha_catastro y lo suyo, dato_urbanistico, consulta_externa). No toca la opp.
//
//   cd frontend && npx tsx --conditions=react-server scripts/catastro_lo_que_falta.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROYECTO = "kbsucauoubqglkypwulv";
const PAUSA_MS = 3_000;

function llaves() {
  const fichero = join(process.cwd(), "..", ".env.produccion");
  const v: Record<string, string> = {};
  for (const linea of readFileSync(fichero, "utf-8").split(/\r?\n/)) {
    const l = linea.trim();
    if (!l || l.startsWith("#") || !l.includes("=")) continue;
    const i = l.indexOf("=");
    v[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  const url = (v.SUPABASE_URL ?? "").replace(/\/$/, "");
  const clave = v.SUPABASE_SECRET_KEY ?? "";
  if (!url.startsWith("https://") || !url.includes(PROYECTO) || clave.length < 30) throw new Error(`*** ALTO *** .env.produccion no apunta a produccion (${url}).`);
  return { url, clave };
}

async function main() {
  const { url, clave } = llaves();
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SECRET_KEY = clave;
  const { informeEdificio } = await import("../lib/informeEdificio");
  const cab = { apikey: clave, Authorization: `Bearer ${clave}` };
  const leer = async <T,>(p: string): Promise<T[]> => {
    const out: T[] = [];
    for (let d = 0; ; d += 1000) {
      const r = await fetch(`${url}/rest/v1/${p}`, { headers: { ...cab, Range: `${d}-${d + 999}` } });
      if (!r.ok) throw new Error(`${p}: ${r.status} ${await r.text()}`);
      const t = (await r.json()) as T[];
      out.push(...t);
      if (t.length < 1000) return out;
    }
  };
  const ops = await leer<{ nombre: string; referencia_catastral: string }>("oportunidades?select=nombre,referencia_catastral&estado=in.(abierta,pausada)&referencia_catastral=not.is.null&order=id");
  const fichas = await leer<{ referencia: string; lat: number | null }>("ficha_catastro?select=referencia,lat");
  const conLat = new Set(fichas.filter((f) => f.lat !== null).map((f) => f.referencia));
  const vistas = new Set<string>();
  const faltan = ops
    .map((o) => ({ nombre: o.nombre, ref: o.referencia_catastral.replace(/\s/g, "").toUpperCase().slice(0, 14) }))
    .filter((o) => o.ref.length === 14 && !conLat.has(o.ref) && !vistas.has(o.ref) && vistas.add(o.ref));
  console.log(`[produccion] ${url} · ${faltan.length} edificios por traer`);
  let bien = 0;
  const mal: string[] = [];
  for (const [n, o] of faltan.entries()) {
    const t0 = Date.now();
    const i = await informeEdificio(o.ref, { refrescar: true }).catch((e: Error) => (mal.push(`${o.nombre} (${o.ref}): ${e.message}`), null));
    const s = ((Date.now() - t0) / 1000).toFixed(0);
    if (i && i.fallos.length === 0) bien++;
    else if (i) mal.push(`${o.nombre} (${o.ref}): a medias, ${i.fallos.join(" · ")}`);
    else if (!mal.some((m) => m.includes(o.ref))) mal.push(`${o.nombre} (${o.ref}): Catastro no lo da`);
    console.log(`${n + 1}/${faltan.length} ${o.ref} ${s}s ${i ? (i.fallos.length ? "a medias" : "ok") : "sin traer"} · ${o.nombre}`);
    await new Promise((r) => setTimeout(r, PAUSA_MS));
  }
  console.log(`\nTraidos enteros: ${bien} de ${faltan.length}`);
  for (const m of mal) console.log("  - " + m);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
