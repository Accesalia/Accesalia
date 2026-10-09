// LA IEE DE LAS OPPS ABIERTAS, POR MESES (Monica, 9-oct-2026).
//
//   "Las opps abiertas deberian bajarla. Yo lo haria por grupos, de mas
//    reciente a mas antiguo, por meses: las que se abrieron en octubre primero,
//    luego septiembre, luego agosto... para no saturar el servicio."
//
// Pregunta al registro de IEE de la Comunidad (rieecm.es) por las direcciones
// de las opps ABIERTAS, agrupadas por el mes en que se abrieron (fecha_apertura;
// si no se sabe, cuando entro la fila). Usa EXACTAMENTE el mismo codigo que la
// busqueda por direccion de la app (lib/ieePorDireccion.ts) y guarda en la
// misma tabla (iee_registrado): repetir no duplica.
//
// Solo escribe en PRODUCCION: lee las llaves de ../.env.produccion y aborta si
// no apuntan al proyecto de produccion (la misma norma que scripts/produccion.py).
//
//   cd frontend && npx tsx --conditions=react-server scripts/iee_por_meses.ts            -> todos los meses
//   cd frontend && npx tsx --conditions=react-server scripts/iee_por_meses.ts 2026-09    -> desde ese mes hacia atras
//   cd frontend && npx tsx --conditions=react-server scripts/iee_por_meses.ts 2026-10 1  -> solo ese mes

import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROYECTO = "kbsucauoubqglkypwulv";
const PAUSA_ENTRE_MESES_MS = 30_000;

function llaves() {
  // Se lanza desde frontend/: las llaves estan un nivel por encima.
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
  if (!url.startsWith("https://") || !url.includes(PROYECTO) || /localhost|127\.0\.0\.1/.test(url) || clave.length < 30) {
    throw new Error(`*** ALTO *** .env.produccion no apunta a produccion (${url}). No se escribe.`);
  }
  return { url, clave };
}

type Fila = {
  id: string;
  fecha_apertura: string | null;
  creado_en: string;
  accesos: { hasta: string | null; acceso: { municipio: string; tipo_via: string; nombre_via: string; numero: string } | null }[];
};

async function main() {
  const { url, clave } = llaves();
  // La app lee las llaves de aqui al cargar sus modulos: se ponen ANTES de importarlos.
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SECRET_KEY = clave;
  const { barrerNuestrasDirecciones, direccionDeAcceso } = await import("../lib/ieePorDireccion");
  console.log(`[produccion] ${url}`);

  const cab = { apikey: clave, Authorization: `Bearer ${clave}` };
  const opps: Fila[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(
      `${url}/rest/v1/oportunidades?select=id,fecha_apertura,creado_en,` +
        `accesos:relacion_oportunidad_accesos(hasta,acceso:acceso_id(municipio,tipo_via,nombre_via,numero))` +
        `&estado=eq.abierta&order=id`,
      { headers: { ...cab, Range: `${desde}-${desde + 999}` } },
    );
    if (!r.ok) throw new Error(`oportunidades: ${r.status} ${await r.text()}`);
    const trozo = (await r.json()) as Fila[];
    opps.push(...trozo);
    if (trozo.length < 1000) break;
  }

  const porMes = new Map<string, Fila[]>();
  for (const o of opps) {
    const mes = (o.fecha_apertura ?? o.creado_en).slice(0, 7);
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes)!.push(o);
  }
  const desdeMes = process.argv[2] ?? "9999-99";
  const cuantos = Number(process.argv[3] ?? Infinity);
  const meses = [...porMes.keys()].sort().reverse().filter((m) => m <= desdeMes).slice(0, cuantos);
  console.log(`${opps.length} opps abiertas en ${meses.length} meses`);

  let total = 0;
  for (const [n, mes] of meses.entries()) {
    const grupo = porMes.get(mes)!;
    const direcciones = grupo.flatMap((o) =>
      o.accesos.filter((a) => a.hasta === null && a.acceso).map((a) => direccionDeAcceso(a.acceso!)),
    );
    const sinDireccion = grupo.filter((o) => !o.accesos.some((a) => a.hasta === null && a.acceso)).length;
    const r = await barrerNuestrasDirecciones({ soloEstas: direcciones, segundosMaximos: 3600 });
    total += r.guardadas;
    console.log(
      `${mes}: ${grupo.length} opps (${sinDireccion} sin direccion), ${direcciones.length} direcciones · ` +
        `calles con IEE ${r.callesQueEncajan} · IEE guardadas ${r.guardadas} · ${r.segundos}s` +
        (r.municipiosFuera.length ? ` · fuera del registro: ${r.municipiosFuera.join(", ")}` : "") +
        (r.errores.length ? ` · ERRORES: ${r.errores.join(" | ")}` : ""),
    );
    if (n < meses.length - 1) await new Promise((res) => setTimeout(res, PAUSA_ENTRE_MESES_MS));
  }
  console.log(`Hecho: ${total} IEE guardadas`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
