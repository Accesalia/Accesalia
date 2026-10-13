// scripts/control_claves.mts
//
// CONTROL DE CLAVES (Monica, 13-oct-2026: "si quedan opps sin clave, es que algo falla").
// Toda opp con accesos vivos debe tener clave, y una sola. Con --arreglar, las que
// no la tienen se reenganchan con claveDesdeAccesos (la misma pieza que el alta).
// Las opps SIN accesos se cuentan aparte: las excepciones conocidas y las que faltan
// por buscar en Catastro (scripts/catastro_opps_sin_accesos_todas.mts).
//   cd frontend && NODE_PATH="$(pwd)/node_modules/next/dist/compiled" npx tsx --conditions=react-server ../scripts/control_claves.mts [--arreglar]
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.produccion", import.meta.url), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;
const { claveDesdeAccesos } = await import("../frontend/lib/claves.ts");
const H = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` };
async function todo<T>(ruta: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${ruta}&offset=${d}&limit=1000`, { headers: H });
    const t = (await r.json()) as T[];
    out.push(...t);
    if (t.length < 1000) return out;
  }
}
const opps = await todo<{ id: string; codigo: string; estado: string }>("oportunidades?select=id,codigo,estado&order=id");
const rel = await todo<{ opp_id: string; acceso: { clave_id: string | null } }>("relacion_oportunidad_accesos?select=opp_id,acceso:acceso_id(clave_id)&hasta=is.null&order=opp_id,acceso_id");
const porOpp = new Map<string, (string | null)[]>();
for (const r of rel) porOpp.set(r.opp_id, [...(porOpp.get(r.opp_id) ?? []), r.acceso?.clave_id ?? null]);
const sinClave = opps.filter((o) => porOpp.get(o.id)?.some((c) => !c));
const varias = opps.filter((o) => new Set(porOpp.get(o.id)?.filter(Boolean)).size > 1);
const sinAccesos = opps.filter((o) => !porOpp.has(o.id));
console.log(`opps: ${opps.length} | con accesos: ${porOpp.size} | SIN CLAVE: ${sinClave.length} ${sinClave.map((o) => o.codigo).join(" ")} | EN VARIAS: ${varias.length} ${varias.map((o) => o.codigo).join(" ")}`);
console.log(`sin accesos (fuera del control hasta buscarlas): ${sinAccesos.length} (abiertas ${sinAccesos.filter((o) => o.estado === "abierta").length})`);
if (process.argv.includes("--arreglar")) {
  for (const o of [...sinClave, ...varias]) console.log(`  ${o.codigo} -> ${await claveDesdeAccesos(o.id)}`);
}
