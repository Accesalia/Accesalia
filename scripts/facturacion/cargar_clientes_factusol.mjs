// LA PRIMERA CARGA DE LOS CLIENTES (Y, DESDE EL 25-OCT, DE LOS PEDIDOS Y FACTURAS) DE FACTUSOL (Monica, 25-oct-2026), desde el Dropbox sincronizado de este PC,
// mientras la app no tiene acceso propio al Dropbox. Usa EL MISMO nucleo que la app (frontend/lib/factusol/clientes.ts):
// leer el fichero de cada empresa y guardarlo. Solo lee Factusol, y sobre una copia en memoria.
//   node scripts/facturacion/cargar_clientes_factusol.mjs [anio]
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { guardarClientes, leerClientes, FICHERO_EMPRESA } from "../../frontend/lib/factusol/clientes.ts";
import { guardarDocumentos, leerFacturas, leerPedidos } from "../../frontend/lib/factusol/documentos.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATOS = "C:\\accesalia Dropbox\\D SM\\factusol\\FACTUSOL\\Datos\\FS";
const PROYECTO = "kbsucauoubqglkypwulv";

// Las llaves, de .env.produccion (como scripts/produccion.py). Si no apunta a produccion, no se sigue.
const env = Object.fromEntries(
  readFileSync(join(RAIZ, ".env.produccion"), "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
if (!env.SUPABASE_URL?.includes(PROYECTO)) throw new Error("La base no es la de produccion: no sigo.");
const base = { url: env.SUPABASE_URL, llave: env.SUPABASE_SECRET_KEY };

const anio = Number(process.argv[2] ?? new Date().getFullYear());
for (const [empresa, pre] of Object.entries(FICHERO_EMPRESA)) {
  const f = join(DATOS, `${pre}${anio}.accdb`);
  if (!existsSync(f)) { console.log(`${empresa}: no existe ${f}`); continue; }
  const buf = readFileSync(f);
  const r = await guardarClientes(base, empresa, leerClientes(buf));
  console.log(JSON.stringify(r));
  // Y, desde el 25-oct-2026, sus pedidos y facturas (y los del año anterior), como la pasada de cada noche.
  console.log(JSON.stringify(await guardarDocumentos(base, empresa, anio, leerPedidos(buf), leerFacturas(buf))));
  const ant = join(DATOS, `${pre}${anio - 1}.accdb`);
  if (existsSync(ant)) { const b2 = readFileSync(ant); console.log(JSON.stringify(await guardarDocumentos(base, empresa, anio - 1, leerPedidos(b2), leerFacturas(b2)))); }
}
