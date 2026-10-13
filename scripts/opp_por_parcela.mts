// scripts/opp_por_parcela.mts
//
// UNA OPP A SU PARCELA, por referencia catastral (Monica, 14-oct-2026: "te paso yo la ref catastral"). Para las
// que la busqueda por direccion no encuentra (municipio fuera del callejero, calle con otro nombre en Catastro...).
// Las mismas piezas que el alta: portales de la parcela -> ficha -> accesos -> nombre (si no tenia) -> comunidad ->
// clave. Por defecto, los portales con viviendas; --portales=NUM,NUM elige numeros concretos (como los da Catastro).
// Un acceso que ya es de OTRA comunidad no se vincula.
//   cd frontend && NODE_PATH="$(pwd)/node_modules/next/dist/compiled" npx tsx --conditions=react-server \
//     ../scripts/opp_por_parcela.mts --opp=DAN-2022-301 --parcela=3319407VL8031N --municipio=MARCHAMALO [--escribir]

import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env.produccion", import.meta.url), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
process.env.SUPABASE_URL = env.SUPABASE_URL;
process.env.SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;
const { portalesDe, guardarFicha } = await import("../frontend/lib/buscarDireccion.ts");
const { enlazarAccesos, comunidadDesdeAccesos } = await import("../frontend/lib/altaOportunidad.ts");
const { claveDesdeAccesos } = await import("../frontend/lib/claves.ts");
const { nombrePropuesto } = await import("../frontend/lib/direccionNombre.ts");

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ESCRIBIR = process.argv.includes("--escribir");
const OPP = arg("opp")!, PARCELA = arg("parcela")!, MUNICIPIO = arg("municipio")!;
const NUMEROS = arg("portales")?.split(",");
const CAB = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };
const leer = async <T,>(r: string): Promise<T> => { const x = await fetch(`${env.SUPABASE_URL}/rest/v1/${r}`, { headers: CAB }); if (!x.ok) throw new Error(`${r} ${x.status}: ${await x.text()}`); return (await x.json()) as T; };

const [o] = await leer<{ id: string; nombre: string | null; comunidad_id: string | null }[]>(`oportunidades?select=id,nombre,comunidad_id&codigo=eq.${OPP}`);
const portales = await portalesDe([PARCELA]);
console.log(`${OPP} · parcela ${PARCELA}:`);
for (const p of portales) console.log(`   ${p.tipo_via} ${p.nombre_via} ${p.numero}${p.escalera ? ` esc ${p.escalera}` : ""} · ${p.viviendas} viv`);
const conViv = portales.filter((p) => p.viviendas > 0);
const elegidos = NUMEROS ? portales.filter((p) => NUMEROS.includes(p.numero)) : conViv.length ? conViv : portales;
if (!elegidos.length) throw new Error("ningun portal elegido");
for (const p of elegidos) {
  const ya = await leer<{ figura_legal_propietaria_id: string | null }[]>(
    `accesos?select=figura_legal_propietaria_id&municipio=eq.${encodeURIComponent(MUNICIPIO)}&tipo_via=eq.${encodeURIComponent(p.tipo_via)}` +
      `&nombre_via=eq.${encodeURIComponent(p.nombre_via)}&numero=eq.${encodeURIComponent(p.numero)}&escalera=eq.${encodeURIComponent(p.escalera)}`,
  );
  if (ya.some((a) => a.figura_legal_propietaria_id && a.figura_legal_propietaria_id !== o.comunidad_id))
    throw new Error(`el acceso ${p.nombre_via} ${p.numero} ya es de OTRA comunidad: no se vincula`);
}
const nombre = nombrePropuesto(elegidos, portales, MUNICIPIO);
console.log(`marca: ${elegidos.map((p) => `${p.nombre_via} ${p.numero}${p.escalera ? ` esc ${p.escalera}` : ""}`).join(" · ")}\nnombre propuesto: ${nombre}${o.nombre ? ` (la opp ya se llama «${o.nombre}»: se queda)` : ""}`);
if (ESCRIBIR) {
  const claves = elegidos.map((p) => p.clave);
  const ficha = await guardarFicha(PARCELA);
  const ids = ficha.portales.filter((p) => claves.includes(`${PARCELA}|${p.numero}|${p.escalera}`)).map((p) => p.id);
  await enlazarAccesos(o.id, ids, `Por su referencia catastral ${PARCELA}, dada por Monica (14-oct-2026)`);
  if (!o.nombre) {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/oportunidades?id=eq.${o.id}&nombre=is.null`, { method: "PATCH", headers: CAB, body: JSON.stringify({ nombre }) });
    if (!r.ok) throw new Error(`nombre ${r.status}: ${await r.text()}`);
  }
  const cp = await comunidadDesdeAccesos(o.id);
  const clave = await claveDesdeAccesos(o.id);
  console.log(`ESCRITO: ${ids.length} accesos · comunidad ${cp} · clave ${clave}`);
}
