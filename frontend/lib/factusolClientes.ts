import "server-only";
// lib/factusolClientes.ts
//
// CLIENTES DE FACTUSOL EN LA APP (Monica, 25-oct-2026): para CONSULTAR («que no sea un punto ciego») y para que, al
// generar un pedido, la app sepa si la comunidad o la contrata ya tiene codigo de cliente EN ESA EMPRESA. Se relee de
// Factusol cada noche (reloj de Vercel) y con «Revisar ahora»: baja del Dropbox el fichero del año de cada empresa y lo
// guarda con el mismo nucleo que la primera carga (lib/factusol/clientes.ts). Nunca se toca a mano.

import { bajarFichero } from "./dropboxApi";
import { guardarClientes, leerClientes, rutaFichero, type Empresa, type Resumen } from "./factusol/clientes";
import { puedeVerCobros } from "./cobros";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const BASE = { url: URL_BASE, llave: SECRETO };
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

export const EMPRESAS: { clave: Empresa; nombre: string }[] = [
  { clave: "accesalia", nombre: "Accesalia" },
  { clave: "daniel", nombre: "Daniel autónomo" },
  { clave: "ecobalance", nombre: "Ecobalance" },
];
/** Quien los consulta y quien pide releerlos: lo de cobrar. */
export const puedeVerClientesFactusol = (yo: Yo) => puedeVerCobros(yo) || yo.funciones.some((f) => f.clave === "facturacion_ecobalance");

/** Relee los clientes de las tres empresas. El fichero es el del año en curso; si aun no existe (enero, antes de abrir
 *  el año en Factusol), el del año anterior. */
export async function revisarClientes(): Promise<Resumen[]> {
  const anio = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric" }).format(new Date()));
  const out: Resumen[] = [];
  for (const { clave } of EMPRESAS) {
    const fichero = (await bajarFichero(rutaFichero(clave, anio))) ?? (await bajarFichero(rutaFichero(clave, anio - 1)));
    if (!fichero) throw new Error(`No encuentro en el Dropbox el fichero de Factusol de ${clave} (${rutaFichero(clave, anio)}).`);
    out.push(await guardarClientes(BASE, clave, leerClientes(fichero)));
  }
  return out;
}

export type FilaCliente = {
  id: string; empresa: Empresa; codigo: number; nif: string | null; nombre: string; poblacion: string | null; email: string | null; fechaAlta: string | null;
  casa: { tipo: "comunidad" | "contrata" | "persona"; id: string; nombre: string } | null; leidoEn: string;
};

export async function clientesFactusol(): Promise<FilaCliente[]> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/factusol_clientes?select=id,empresa,codigo,nif,nombre_fiscal,nombre_comercial,poblacion,email,fecha_alta,leido_en,` +
      `comunidad:comunidad_id(id,nombre),contrata:contrata_id(id,nombre),persona:persona_id(id,nombre,apellidos)&order=empresa.asc,codigo.asc&limit=20000`,
    { headers: CAB, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const filas = (await r.json()) as {
    id: string; empresa: Empresa; codigo: number; nif: string | null; nombre_fiscal: string | null; nombre_comercial: string | null; poblacion: string | null;
    email: string | null; fecha_alta: string | null; leido_en: string;
    comunidad: { id: string; nombre: string } | null; contrata: { id: string; nombre: string } | null; persona: { id: string; nombre: string; apellidos: string | null } | null;
  }[];
  return filas.map((f) => ({
    id: f.id, empresa: f.empresa, codigo: f.codigo, nif: f.nif, nombre: f.nombre_fiscal ?? f.nombre_comercial ?? "(sin nombre)", poblacion: f.poblacion, email: f.email,
    fechaAlta: f.fecha_alta, leidoEn: f.leido_en,
    casa: f.comunidad ? { tipo: "comunidad", id: f.comunidad.id, nombre: f.comunidad.nombre }
      : f.contrata ? { tipo: "contrata", id: f.contrata.id, nombre: f.contrata.nombre }
      : f.persona ? { tipo: "persona", id: f.persona.id, nombre: [f.persona.nombre, f.persona.apellidos].filter(Boolean).join(" ") } : null,
  }));
}
