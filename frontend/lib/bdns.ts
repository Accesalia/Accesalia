// lib/bdns.ts
//
// LA VIGILANCIA DE LA BDNS (Monica, 6-oct-2026): "para que esto no quede
// obsoleto en 4 semanas, montar algo que lo actualice cada 15 dias, que busque
// las convocatorias nuevas y las baje".
//
// La Base de Datos Nacional de Subvenciones (infosubvenciones.es, API publica y
// sin claves) es de donde salen las subvenciones concedidas a comunidades fuera
// de Madrid capital para el anexo de la viabilidad. Cada pasada hace dos cosas:
//
//   1. BUSCA CONVOCATORIAS NUEVAS desde la ultima pasada: de la Comunidad de
//      Madrid y de los municipios donde tenemos edificios, y solo de lo nuestro
//      (rehabilitacion, accesibilidad, eficiencia...). Las apunta en
//      `bdns_convocatorias` como vigiladas. El Ayuntamiento de Madrid no: sus
//      ayudas salen del geoportal, con coordenadas.
//   2. REPASA TODAS LAS VIGILADAS y baja las concesiones nuevas. Hace falta
//      porque la BDNS publica las concesiones MESES despues de abrir la
//      convocatoria: una que hoy tiene 0 puede tener 200 en primavera. Si el
//      total no ha cambiado desde la ultima vez, no se vuelve a bajar.
//
// Solo se guardan concesiones a COMUNIDADES (CIF que empieza por H o E): asi no
// entran datos de particulares. Del beneficiario se guarda el texto tal cual y
// lo leido de el (calle, numero, municipio). Repetir no duplica.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const BDNS = "https://www.infosubvenciones.es/bdnstrans/api";

async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
const leer = async <T>(path: string): Promise<T> => (await pedir(path)).json() as Promise<T>;

async function deLaBdns<T>(path: string, q: Record<string, string | number>): Promise<T> {
  const url = `${BDNS}/${path}?${new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]))}`;
  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (r.ok) return (await r.json()) as T;
    } catch {
      /* reintenta */
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error(`La BDNS no responde (${path})`);
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

// ----------------------------------------------------- 1 · las nuevas

// Que buscar, y que descartar. Lo de descartar sale de la primera busqueda a
// mano (6-oct): sin ello entran premios de colegios, alquileres, pymes,
// alojamientos turisticos y convenios de oficinas.
const BUSCAR = ["accesibilidad", "ascensor", "rehabilitación", "eficiencia energética", "edificios", "residencial", "fotovoltaica", "regeneración", "NGEU-MRR"];
const ES_LO_NUESTRO = /ACCESIB|ASCENSOR|REHABILIT|EFIC(IENCIA)? ?ENERG|EDIFIC|RESIDENCIAL|FOTOVOLT|SOLAR|REGENERA|ERRP|ARRU|ENTORNO/;
const NO_ES = /ALQUILER|EMPRESA|PYME|TURIS|AGRO|AGRAR|INDUSTRIAL|PREMIO|TEATRO|CENTROS? DE D[IÍ]A|CONVENIO|OFICINA|ASOCIACI|COMERCI|DEPORT|CULTURA|MI PRIMERA VIVIENDA|ADQUISICI|CONSTRUCCI[OÓ]N VIVIENDAS/;

type Convocatoria = { numeroConvocatoria: string; descripcion: string; fechaRecepcion: string; nivel1: string | null; nivel2: string | null; nivel3: string | null };

async function municipiosNuestros(): Promise<Set<string>> {
  const filas = await leer<{ municipio: string | null }[]>("accesos?select=municipio&municipio=not.is.null&limit=5000");
  return new Set(filas.map((f) => sinTildes(f.municipio!)).filter((m) => m !== "MADRID"));
}

/** ¿Es de quien nos interesa? La Comunidad de Madrid (su consejeria de
 *  vivienda) o el ayuntamiento de un municipio donde tenemos edificios. */
function esDeAqui(c: Convocatoria, municipios: Set<string>): boolean {
  const n2 = sinTildes(c.nivel2 ?? "");
  const n3 = sinTildes(c.nivel3 ?? "");
  if (n2 === "COMUNIDAD DE MADRID") return n3.includes("VIVIENDA");
  if (c.nivel1 === "LOCAL") {
    // "ROZAS DE MADRID, LAS" -> "LAS ROZAS DE MADRID"
    const m = n2.includes(", ") ? `${n2.split(", ")[1]} ${n2.split(", ")[0]}` : n2;
    return municipios.has(m) || municipios.has(n2);
  }
  return false;
}

async function buscarNuevas(desde: Date): Promise<Convocatoria[]> {
  const municipios = await municipiosNuestros();
  const ya = new Set((await leer<{ numero: string }[]>("bdns_convocatorias?select=numero")).map((x) => x.numero));
  const fecha = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const nuevas = new Map<string, Convocatoria>();
  for (const t of BUSCAR) {
    for (let page = 0; page < 10; page++) {
      const d = await deLaBdns<{ content: Convocatoria[]; last: boolean }>("convocatorias/busqueda", {
        page, pageSize: 50, descripcion: t, fechaDesde: fecha(desde), fechaHasta: fecha(new Date()),
      });
      for (const c of d.content ?? []) {
        const desc = sinTildes(c.descripcion ?? "");
        if (ya.has(c.numeroConvocatoria) || !esDeAqui(c, municipios)) continue;
        if (!ES_LO_NUESTRO.test(desc) || NO_ES.test(desc)) continue;
        nuevas.set(c.numeroConvocatoria, c);
      }
      if (d.last) break;
    }
  }
  return [...nuevas.values()];
}

// ----------------------------------------------- 2 · bajar concesiones

const VIA = "(CL|AV|PZ|PS|CM|CR|GL|RD|TR|PJ|UR|CALLE|AVDA)";
const RE_DIR = new RegExp(
  `^\\w\\d{7}\\w?\\s+C(?:DAD|OMUNIDAD)\\.?\\s*(?:DE\\s+)?PROP\\w*\\.?\\s+(?:${VIA}\\s+)?(.+?)\\s+(?:N\\s+)?(\\d+[A-Z]?)\\b\\s*(.*)$`,
);
function leerBeneficiario(b: string) {
  const m = RE_DIR.exec(b.trim());
  if (!m) return { tipo_via: null, nombre_via: null, numero: null, municipio_leido: null };
  const cola = (m[4] ?? "").replace(/^DE\s+/, "").trim();
  return { tipo_via: m[1] ?? null, nombre_via: m[2], numero: m[3], municipio_leido: cola || null };
}

type Concesion = { codConcesion: string; fechaConcesion: string | null; beneficiario: string; importe: number | null; convocatoria: string | null; nivel2: string | null; nivel3: string | null; urlBR: string | null };

/** Baja las concesiones de una convocatoria si su total ha cambiado. */
async function repasar(v: { numero: string; total_concesiones: number | null; catalogo_convocatoria_id: string | null }) {
  const primera = await deLaBdns<{ totalElements: number }>("concesiones/busqueda", { page: 0, pageSize: 1, numeroConvocatoria: v.numero });
  const total = primera.totalElements ?? 0;
  if (total === v.total_concesiones) return { numero: v.numero, total, nuevas: 0, sinCambios: true };
  let nuevas = 0;
  let deComunidades = 0;
  for (let page = 0; ; page++) {
    const p = await deLaBdns<{ content: Concesion[]; last: boolean }>("concesiones/busqueda", { page, pageSize: 100, numeroConvocatoria: v.numero });
    const filas = (p.content ?? [])
      .filter((k) => /^[HE]\d{7}/.test(k.beneficiario.trim()))
      .map((k) => ({
        cod_concesion: k.codConcesion,
        numero_convocatoria: v.numero,
        convocatoria: k.convocatoria,
        organo: [k.nivel2, k.nivel3].filter(Boolean).join(" · ") || null,
        catalogo_convocatoria_id: v.catalogo_convocatoria_id,
        fecha_concesion: k.fechaConcesion,
        beneficiario: k.beneficiario.trim(),
        cif: k.beneficiario.trim().split(/\s+/)[0],
        importe: k.importe,
        url_bases: k.urlBR?.trim() || null,
        ...leerBeneficiario(k.beneficiario),
      }));
    deComunidades += filas.length;
    if (filas.length) {
      const r = await pedir("concesiones_bdns?on_conflict=cod_concesion", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify(filas),
      });
      nuevas += ((await r.json()) as unknown[]).length;
    }
    if (p.last || !p.content?.length) break;
  }
  await pedir(`bdns_convocatorias?numero=eq.${v.numero}`, {
    method: "PATCH",
    body: JSON.stringify({ total_concesiones: total, de_comunidades: deComunidades, ultima_revision: new Date().toISOString() }),
  });
  return { numero: v.numero, total, nuevas, sinCambios: false };
}

// ------------------------------------------------------------ la pasada

export type PasadaBdns = { convocatoriasNuevas: { numero: string; descripcion: string }[]; repasadas: number; conCambios: number; concesionesNuevas: number; fallos: string[] };

export async function vigilarBdns(): Promise<PasadaBdns> {
  const fallos: string[] = [];

  // 1 · las nuevas, desde la ultima revision (con un mes de margen: la BDNS a
  //     veces registra tarde convocatorias con fecha de antes).
  const [ultima] = await leer<{ ultima_revision: string | null }[]>(
    "bdns_convocatorias?select=ultima_revision&ultima_revision=not.is.null&order=ultima_revision.desc&limit=1",
  );
  const desde = new Date(ultima?.ultima_revision ?? "2022-01-01");
  desde.setDate(desde.getDate() - 30);
  let nuevas: Convocatoria[] = [];
  try {
    nuevas = await buscarNuevas(desde);
    if (nuevas.length)
      await pedir("bdns_convocatorias?on_conflict=numero", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(
          nuevas.map((c) => ({
            numero: c.numeroConvocatoria,
            descripcion: c.descripcion,
            organo: [c.nivel2, c.nivel3].filter(Boolean).join(" · "),
            fecha_recepcion: c.fechaRecepcion,
            origen: "reloj",
          })),
        ),
      });
  } catch (e) {
    fallos.push("buscar nuevas: " + (e as Error).message);
  }

  // 2 · repasar todas las vigiladas
  const vigiladas = await leer<{ numero: string; total_concesiones: number | null; catalogo_convocatoria_id: string | null }[]>(
    "bdns_convocatorias?select=numero,total_concesiones,catalogo_convocatoria_id&vigilada=is.true",
  );
  let conCambios = 0;
  let concesionesNuevas = 0;
  for (const v of vigiladas) {
    try {
      const r = await repasar(v);
      if (!r.sinCambios) conCambios++;
      concesionesNuevas += r.nuevas;
    } catch (e) {
      fallos.push(`${v.numero}: ${(e as Error).message}`);
    }
  }

  return {
    convocatoriasNuevas: nuevas.map((c) => ({ numero: c.numeroConvocatoria, descripcion: c.descripcion })),
    repasadas: vigiladas.length,
    conCambios,
    concesionesNuevas,
    fallos,
  };
}
