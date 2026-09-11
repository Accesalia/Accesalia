// lib/rrhhNominas.ts
//
// El reparto de las nominas del mes (Monica, 11-sep-2026). Solo de servidor.
//   1. Se sube el PDF de la gestoria (entero) a lotes/.
//   2. leerLote: se lee cada pagina (lib/lectorNominas) y se propone de quien
//      es: por el DNI de su ficha o, si la ficha aun no lo tiene, por el
//      nombre. Queda un LOTE en revision.
//   3. Se revisa y se corrige a mano lo que haga falta.
//   4. publicarLote: cada pagina se separa en su propio PDF, va a la carpeta de
//      su dueño como nomina de ese mes, y el DNI confirmado se guarda en la
//      ficha (solo si estaba vacio). Desde entonces, esa persona casa sola.
// Quien puede hacer cada cosa lo deciden las acciones (RRHH y direccion).

import "server-only";
import { PDFDocument } from "pdf-lib";
import { leerNominas } from "./lectorNominas";
import { apuntar, bajarBytes, subirBytes } from "./rrhhDocumentos";
import { datosPersonales, personas, type Persona } from "./rrhh";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}
const cambiar = (path: string, cuerpo: unknown) =>
  rest(path, { method: "PATCH", body: JSON.stringify(cuerpo), headers: { Prefer: "return=minimal" } });

// ---------------------------------------------------------------------------
// Casar por nombre (solo la primera vez: luego casa por DNI)
// ---------------------------------------------------------------------------

const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * "PEREZ FRANCO, MARIA PAZ" contra la ficha (nombre + apellidos). Casa si
 * todos los apellidos de la ficha estan en los apellidos de la nomina y el
 * primer nombre de la ficha empieza algun nombre de la nomina (Alex ->
 * ALEXANDER). Solo se propone si sale UNA persona; si no, se elige a mano.
 */
export function proponerPorNombre(nombreLeido: string | null, equipo: Persona[]): string | null {
  if (!nombreLeido || !nombreLeido.includes(",")) return null;
  const [apLeidos, nomLeidos] = nombreLeido.split(",").map((x) => norm(x).split(" ").filter(Boolean));
  const casan = equipo.filter((p) => {
    const nombre = norm(p.nombre).split(" ").filter(Boolean);
    let apellidos = norm(p.apellidos ?? "").split(" ").filter(Boolean);
    // Hay fichas con el apellido metido tambien en el nombre ("Carlos Daza").
    const primero = nombre[0];
    if (apellidos.length === 0) apellidos = nombre.slice(1);
    if (!primero || apellidos.length === 0) return false;
    return apellidos.every((a) => apLeidos.includes(a)) && nomLeidos.some((n) => n.startsWith(primero));
  });
  return casan.length === 1 ? casan[0].id : null;
}

// ---------------------------------------------------------------------------
// Lotes
// ---------------------------------------------------------------------------

export type Lote = {
  id: string;
  periodo: string; // YYYY-MM-01
  fichero: string;
  paginas: number;
  estado: "revision" | "publicado" | "descartado";
  creadoEn: string;
  publicadoEn: string | null;
};

export type Nomina = {
  id: string;
  loteId: string;
  pagina: number;
  personaId: string | null;
  casadoPor: "dni" | "nombre" | "manual" | null;
  dniLeido: string | null;
  nombreLeido: string | null;
  periodo: string;
  liquido: number | null;
  devengado: number | null;
  costeEmpresa: number | null;
  documentoId: string | null;
};

type FilaLote = { id: string; periodo: string; fichero: string; paginas: number; estado: Lote["estado"]; creado_en: string; publicado_en: string | null };
const comoLote = (f: FilaLote): Lote => ({
  id: f.id,
  periodo: f.periodo,
  fichero: f.fichero,
  paginas: f.paginas,
  estado: f.estado,
  creadoEn: f.creado_en,
  publicadoEn: f.publicado_en,
});

type FilaNomina = {
  id: string;
  lote_id: string;
  pagina: number;
  persona_id: string | null;
  casado_por: Nomina["casadoPor"];
  dni_leido: string | null;
  nombre_leido: string | null;
  periodo: string;
  liquido: number | null;
  devengado: number | null;
  coste_empresa: number | null;
  documento_id: string | null;
};
const num = (x: number | null) => (x == null ? null : Number(x));
const comoNomina = (f: FilaNomina): Nomina => ({
  id: f.id,
  loteId: f.lote_id,
  pagina: f.pagina,
  personaId: f.persona_id,
  casadoPor: f.casado_por,
  dniLeido: f.dni_leido,
  nombreLeido: f.nombre_leido,
  periodo: f.periodo,
  liquido: num(f.liquido),
  devengado: num(f.devengado),
  costeEmpresa: num(f.coste_empresa),
  documentoId: f.documento_id,
});
const SEL_LOTE = "id,periodo,fichero,paginas,estado,creado_en,publicado_en";
const SEL_NOM = "id,lote_id,pagina,persona_id,casado_por,dni_leido,nombre_leido,periodo,liquido,devengado,coste_empresa,documento_id";

export async function lote(id: string): Promise<{ lote: Lote; nominas: Nomina[] } | null> {
  const [l] = await rest<FilaLote[]>(`rrhh_nominas_lotes?select=${SEL_LOTE}&id=eq.${id}&limit=1`);
  if (!l) return null;
  const n = await rest<FilaNomina[]>(`rrhh_nominas?select=${SEL_NOM}&lote_id=eq.${id}&order=pagina.asc`);
  return { lote: comoLote(l), nominas: n.map(comoNomina) };
}

/** Los lotes en revision y los ultimos publicados. */
export async function lotesRecientes(): Promise<Lote[]> {
  const l = await rest<FilaLote[]>(`rrhh_nominas_lotes?select=${SEL_LOTE}&estado=neq.descartado&order=periodo.desc,creado_en.desc&limit=12`);
  return l.map(comoLote);
}

/** Las nominas publicadas del ultimo mes que tenga alguna: son las transferencias de ese mes. */
export async function ultimasPublicadas(): Promise<{ periodo: string; nominas: Nomina[] } | null> {
  const [l] = await rest<FilaLote[]>(`rrhh_nominas_lotes?select=${SEL_LOTE}&estado=eq.publicado&order=periodo.desc,publicado_en.desc&limit=1`);
  if (!l) return null;
  const n = await rest<FilaNomina[]>(
    `rrhh_nominas?select=${SEL_NOM}&periodo=eq.${l.periodo}&documento_id=not.is.null&persona_id=not.is.null&order=pagina.asc`,
  );
  return { periodo: l.periodo, nominas: n.map(comoNomina) };
}

/** Lee el PDF ya subido a lotes/ y deja un lote en revision con cada pagina casada o propuesta. */
export async function leerLote(ruta: string, subidoPor: string): Promise<{ id: string } | { error: string }> {
  const bytes = await bajarBytes(ruta);
  let paginas;
  try {
    paginas = await leerNominas(bytes);
  } catch {
    return { error: "No se ha podido leer el PDF. ¿Es el de la gestoría, sin escanear?" };
  }
  if (paginas.length === 0) return { error: "El PDF no tiene páginas." };

  // El mes: el que diga la mayoria de las paginas.
  const cuenta = new Map<string, number>();
  for (const p of paginas) if (p.periodo) cuenta.set(p.periodo, (cuenta.get(p.periodo) ?? 0) + 1);
  const periodo = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!periodo) return { error: "No se ha encontrado el mes en ninguna página. ¿Es un PDF de nóminas?" };

  const equipo = await personas(null);
  const activos = equipo.filter((p) => p.activo);
  const dnis = await datosPersonales(equipo.map((p) => p.id));
  const porDni = new Map<string, string>();
  for (const [id, d] of dnis) if (d.dni) porDni.set(d.dni.toUpperCase(), id);

  const [l] = await rest<{ id: string }[]>("rrhh_nominas_lotes?select=id", {
    method: "POST",
    body: JSON.stringify({ periodo: `${periodo}-01`, fichero: ruta, paginas: paginas.length, subido_por: subidoPor }),
    headers: { Prefer: "return=representation" },
  });

  await rest("rrhh_nominas", {
    method: "POST",
    body: JSON.stringify(
      paginas.map((p) => {
        const dni = p.dni ? porDni.get(p.dni) : undefined;
        const propuesta = dni ? null : proponerPorNombre(p.nombre, activos);
        return {
          lote_id: l.id,
          pagina: p.pagina,
          persona_id: dni ?? propuesta,
          casado_por: dni ? "dni" : propuesta ? "nombre" : null,
          dni_leido: p.dni,
          nombre_leido: p.nombre,
          periodo: `${p.periodo ?? periodo}-01`,
          liquido: p.liquido,
          devengado: p.devengado,
          coste_empresa: p.costeEmpresa,
        };
      }),
    ),
    headers: { Prefer: "return=minimal" },
  });
  return { id: l.id };
}

/** Corrige a mano de quien es una pagina (o la deja sin dueño: no se publica). */
export function asignar(nominaId: string, personaId: string | null) {
  return cambiar(`rrhh_nominas?id=eq.${nominaId}`, { persona_id: personaId, casado_por: personaId ? "manual" : null });
}

/** Da por buena una propuesta por nombre sin cambiarla. */
export function confirmar(nominaId: string) {
  return cambiar(`rrhh_nominas?id=eq.${nominaId}&casado_por=eq.nombre`, { casado_por: "manual" });
}

export function descartarLote(id: string) {
  return cambiar(`rrhh_nominas_lotes?id=eq.${id}&estado=eq.revision`, { estado: "descartado" });
}

/**
 * Publica: separa cada pagina con dueño en su propio PDF, lo deja como su
 * nomina de ese mes (sustituye a la que hubiera) y guarda en la ficha el DNI
 * leido si la ficha no tenia. Las paginas sin dueño no se publican.
 */
export async function publicarLote(id: string, porId: string): Promise<{ publicadas: number; sinDueño: number }> {
  const l = await lote(id);
  if (!l || l.lote.estado !== "revision") return { publicadas: 0, sinDueño: 0 };
  const original = await PDFDocument.load(await bajarBytes(l.lote.fichero));
  const conDueño = l.nominas.filter((n) => n.personaId);
  const dnis = await datosPersonales(conDueño.map((n) => n.personaId!));

  for (const n of conDueño) {
    const doc = await PDFDocument.create();
    const [pag] = await doc.copyPages(original, [n.pagina - 1]);
    doc.addPage(pag);
    const mes = n.periodo.slice(0, 7);
    const ruta = `personas/${n.personaId}/nomina/${mes}.pdf`;
    await subirBytes(ruta, await doc.save());
    const documentoId = await apuntar({
      personaId: n.personaId,
      tipo: "nomina",
      periodo: n.periodo,
      titulo: `Nómina ${mes}.pdf`,
      ruta,
      subidoPor: porId,
    });
    await cambiar(`rrhh_nominas?id=eq.${n.id}`, { documento_id: documentoId });

    // El DNI confirmado pasa a la ficha, si no lo tenia: el mes que viene casa solo.
    const d = dnis.get(n.personaId!);
    if (n.dniLeido && !d?.dni) {
      await rest("rrhh_datos_personales?on_conflict=persona_id", {
        method: "POST",
        body: JSON.stringify({ persona_id: n.personaId, dni: n.dniLeido }),
        headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
      });
    }
  }

  await cambiar(`rrhh_nominas_lotes?id=eq.${id}`, { estado: "publicado", publicado_por: porId, publicado_en: new Date().toISOString() });
  return { publicadas: conDueño.length, sinDueño: l.nominas.length - conDueño.length };
}
