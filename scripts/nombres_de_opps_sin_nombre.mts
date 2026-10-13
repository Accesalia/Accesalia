// scripts/nombres_de_opps_sin_nombre.mts
//
// LAS OPPS ABIERTAS SIN NOMBRE (Monica, 13-oct-2026): "creamos los 830 nombres
// de opp". Toda la app lee la direccion como el NOMBRE DE LA OPP, asi que las
// que no lo tienen reciben el que les habria propuesto el alta de opp con sus
// accesos vivos (lib/direccionNombre.ts, nombrePropuesto). Sin acentos: los de
// Catastro. Solo toca las que no tienen nombre; las que ya lo tenian se revisan
// despues, aparte.
//
//   npx tsx scripts/nombres_de_opps_sin_nombre.mts            -> solo calcula y deja el CSV
//   npx tsx scripts/nombres_de_opps_sin_nombre.mts --escribir -> ademas los escribe

import { readFileSync, writeFileSync } from "node:fs";
import { nombrePropuesto, type Portal } from "../frontend/lib/direccionNombre.ts";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.produccion", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_BASE = env.SUPABASE_URL;
const CAB = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json" };
const ESCRIBIR = process.argv.includes("--escribir");

async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { headers: CAB });
  if (!r.ok) throw new Error(`${ruta.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T;
}
const enLista = (xs: string[]) => `(${xs.join(",")})`;

type Opp = { id: string; codigo: string | null };
type Rel = { opp_id: string; acceso: { nombre_via: string | null; numero: string | null; escalera: string | null; municipio: string | null; portal: { ficha_id: string; viviendas: number | null } | null } | null };
type Fila = { ficha_id: string; nombre_via: string | null; numero: string | null; escalera: string | null; viviendas: number | null };

const portal = (via: string | null, num: string | null, esc: string | null, viv: number | null, ficha: string): Portal => ({
  clave: `${ficha}|${num ?? ""}|${esc ?? ""}`, parcela: ficha, tipo_via: "", nombre_via: via ?? "", numero: num ?? "", escalera: esc ?? "", viviendas: viv ?? 0,
});

const opps = await leer<Opp[]>("oportunidades?select=id,codigo&estado=eq.abierta&nombre=is.null&order=codigo&limit=5000");
console.log(`${opps.length} opps abiertas sin nombre`);

const salida: { id: string; codigo: string; nombre: string | null; motivo: string }[] = [];
for (let i = 0; i < opps.length; i += 100) {
  const trozo = opps.slice(i, i + 100);
  const rels = await leer<Rel[]>(
    "relacion_oportunidad_accesos?select=opp_id,acceso:acceso_id(nombre_via,numero,escalera,municipio,portal:ficha_catastro_portal_id(ficha_id,viviendas))" +
      `&hasta=is.null&opp_id=in.${enLista(trozo.map((o) => o.id))}&limit=10000`,
  );
  const fichas = [...new Set(rels.map((r) => r.acceso?.portal?.ficha_id).filter((x): x is string => !!x))];
  const todos = fichas.length
    ? await leer<Fila[]>(`ficha_catastro_portal?select=ficha_id,nombre_via,numero,escalera,viviendas&ficha_id=in.${enLista(fichas)}&limit=20000`)
    : [];
  for (const o of trozo) {
    const mias = rels.filter((r) => r.opp_id === o.id && r.acceso);
    if (!mias.length) {
      salida.push({ id: o.id, codigo: o.codigo ?? "", nombre: null, motivo: "sin accesos" });
      continue;
    }
    // Sin ficha de Catastro el portal no sabe sus viviendas: cuenta como vivienda.
    const elegidos = mias.map((r) => portal(r.acceso!.nombre_via, r.acceso!.numero, r.acceso!.escalera, r.acceso!.portal?.viviendas ?? 1, r.acceso!.portal?.ficha_id ?? "sin-ficha"));
    const susFichas = new Set(mias.map((r) => r.acceso!.portal?.ficha_id).filter(Boolean));
    const delEdificio = todos.filter((t) => susFichas.has(t.ficha_id)).map((t) => portal(t.nombre_via, t.numero, t.escalera, t.viviendas, t.ficha_id));
    const municipio = mias.find((r) => r.acceso!.municipio)?.acceso!.municipio ?? "";
    salida.push({ id: o.id, codigo: o.codigo ?? "", nombre: nombrePropuesto(elegidos, delEdificio.length ? delEdificio : elegidos, municipio), motivo: "" });
  }
}

const csv = ["codigo;nombre;motivo;id", ...salida.map((s) => [s.codigo, s.nombre ?? "", s.motivo, s.id].join(";"))].join("\n");
const fichero = new URL("../docs/nombres_opps_sin_nombre.csv", import.meta.url);
writeFileSync(fichero, "﻿" + csv, "utf8");
console.log(`CSV: docs/nombres_opps_sin_nombre.csv · ${salida.filter((s) => s.nombre).length} con nombre, ${salida.filter((s) => !s.nombre).length} sin poder calcularlo`);

if (ESCRIBIR) {
  let n = 0;
  for (const s of salida.filter((x) => x.nombre)) {
    // Solo si sigue sin nombre: nunca se pisa uno puesto.
    const r = await fetch(`${URL_BASE}/rest/v1/oportunidades?id=eq.${s.id}&nombre=is.null`, {
      method: "PATCH", headers: { ...CAB, Prefer: "return=representation" }, body: JSON.stringify({ nombre: s.nombre }),
    });
    if (!r.ok) throw new Error(`${s.codigo} ${r.status}: ${await r.text()}`);
    n += ((await r.json()) as unknown[]).length;
  }
  console.log(`Escritos: ${n}`);
}
