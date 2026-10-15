// lib/carteraGestores.ts
//
// LA PESTAÑA "MIS ADMINISTRADORES", CONECTADA (Monica, 13-oct-2026).
//
// La cartera va por GESTOR (la persona de la administracion), no por empresa:
// "lo que pertenece a un comercial son las personas, una a una" (8-oct). Los
// calculos viven en vistas de la base (admin_de_oportunidad,
// resultado_oportunidad, cartera_gestores, oportunidades_de_gestor): "conectar
// bien la fontaneria; luego completare el dato y se deberia actualizar solo".
//
//   · ganada = hoja firmada; perdida = cerrada sin hoja; en curso = abierta sin
//     hoja. % = ganadas / (ganadas + perdidas).
//   · ESTRELLA: mayor PORCENTAJE de firmadas ("3 opps y firmo las 3 es mejor que
//     30 y firmo 4").
//   · QUE MAREAN: peor proporcion, solo los que tienen al menos 5 perdidas.
//   · NO CONSOLIDADOS: los que trajo y aun no tienen hoja firmada; no son de su
//     cartera (ver la regla de "administrador consolidado").

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

/** La base corta en 1.000 filas: se pide por paginas. */
async function restTodo<T>(path: string, orden: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const pagina = await rest<T[]>(`${path}&order=${orden}&limit=1000&offset=${desde}`);
    todo.push(...pagina);
    if (pagina.length < 1000) return todo;
  }
}

export type Resultado = "en_curso" | "ganada" | "perdida";
export type OppDeGestor = {
  id: string;
  codigo: string | null;
  direccion: string | null;
  resultado: Resultado;
  apertura: string | null;
  firma: string | null;
};
export type GestorCartera = {
  id: string;
  personaId: string;
  nombre: string;
  administracion: string | null;
  telefono: string | null;
  enCurso: number;
  ganadas: number;
  perdidas: number;
  total: number;
  /** ganadas / (ganadas + perdidas), en %; null si aun no hay ni una decidida. */
  pct: number | null;
  dias: number | null;
  opps: OppDeGestor[];
  /** LA HERRAMIENTA (Monica, 15-oct-2026), de la vista cartera_gestor_resumen. */
  importe: number;
  ultimaOpp: string | null;
  ultimoContacto: string | null;
  fuenteContacto: "diario" | "correo" | "fases" | null;
  cita: { inicio: string; asunto: string | null; tipo: string | null; con: string[] } | null;
  consolidadoEn: string | null;
  /** Las etiquetas: estrella, dormido, marea, nuevo. */
  etiquetas: Etiqueta[];
};
export type Etiqueta = "estrella" | "dormido" | "marea" | "nuevo";
/** Una opp abierta sin administrador apuntado: para completar. */
export type OppSinGestor = { id: string; codigo: string | null; nombre: string | null; apertura: string | null; quieren: string[] };
export type GestorPosible = { id: string; personaId: string; nombre: string; administracion: string | null; telefono: string | null; creado: string };

export type CarteraGestores = {
  gestores: GestorCartera[];
  noConsolidados: GestorPosible[];
  resumen: { gestores: number; opps: number; ganadas: number; perdidas: number; pct: number | null; dias: number | null; importe: number };
  /** Las opps abiertas del comercial sin administrador (15-oct-2026). */
  sinGestor: OppSinGestor[];
  estrella: GestorCartera[];
  marean: GestorCartera[];
  /** Los gestores de la cartera, para el mapa. */
  puestoIds: string[];
};

type Fila = {
  puesto_id: string;
  persona_id: string;
  nombre: string | null;
  administracion: string | null;
  telefono: string | null;
  en_curso: number;
  ganadas: number;
  perdidas: number;
  total: number;
  dias_medios: number | null;
  creado_en: string;
  desde: string | null;
};

/** Desde cuando cuentan la estrella y los que marean (13-oct-2026). */
export const DESDE_RANKINGS = "2025-01-01";

const pct = (g: number, p: number) => (g + p > 0 ? Math.round((100 * g) / (g + p)) : null);

/** La cartera de un comercial, o la de todos (null). */
export async function carteraGestores(comercialId: string | null): Promise<CarteraGestores> {
  const SEL = "puesto_id,persona_id,nombre,administracion,telefono,en_curso,ganadas,perdidas,total,dias_medios,creado_en,desde";
  const [consolidados, posibles] = await Promise.all([
    restTodo<Fila>(
      `cartera_gestores?select=${SEL}&consolidado=is.true${comercialId ? `&comercial_id=eq.${comercialId}` : "&comercial_id=not.is.null"}`,
      "nombre.asc,puesto_id.asc",
    ),
    restTodo<Fila>(
      `cartera_gestores?select=${SEL}&consolidado=is.false` +
        (comercialId ? `&comercial_captador_id=eq.${comercialId}` : "&comercial_captador_id=not.is.null"),
      "creado_en.desc,puesto_id.asc",
    ),
  ]);

  // Sus oportunidades, para desplegarlas: por tramos de gestores (la lista de
  // ids no cabe entera en una direccion).
  const ids = consolidados.filter((c) => c.total > 0).map((c) => c.puesto_id);
  const opps: (OppDeGestor & { puesto: string })[] = [];
  for (let i = 0; i < ids.length; i += 120) {
    const trozo = await restTodo<{ puesto_id: string; oportunidad_id: string; codigo: string | null; direccion: string | null; resultado: Resultado;
                                    fecha_apertura: string | null; primera_firma: string | null }>(
      `oportunidades_de_gestor?select=puesto_id,oportunidad_id,codigo,direccion,resultado,fecha_apertura,primera_firma&puesto_id=in.(${ids.slice(i, i + 120).join(",")})`,
      "fecha_apertura.desc.nullslast,oportunidad_id.asc",
    );
    opps.push(
      ...trozo.map((o) => ({
        puesto: o.puesto_id,
        id: o.oportunidad_id,
        codigo: o.codigo,
        direccion: o.direccion,
        resultado: o.resultado,
        apertura: o.fecha_apertura,
        firma: o.primera_firma,
      })),
    );
  }
  // LA HERRAMIENTA (Monica, 15-oct-2026): dinero, ultima opp nueva, ultimo
  // contacto y proxima cita de cada gestor, ya calculados en la base.
  type Resumen = {
    puesto_id: string; consolidado_en: string | null; importe_firmado: number | string | null; ultima_opp_nueva: string | null;
    ultimo_contacto: string | null; ultimo_contacto_fuente: GestorCartera["fuenteContacto"];
    proxima_cita_inicio: string | null; proxima_cita_asunto: string | null; proxima_cita_tipo: string | null; proxima_cita_con: string[] | null;
  };
  const todosIds = consolidados.map((c) => c.puesto_id);
  const [resumenes, sinGestor] = await Promise.all([
    Promise.all(
      Array.from({ length: Math.ceil(todosIds.length / 120) }, (_, k) =>
        restTodo<Resumen>(`cartera_gestor_resumen?select=*&puesto_id=in.(${todosIds.slice(k * 120, k * 120 + 120).join(",")})`, "puesto_id.asc"),
      ),
    ).then((x) => x.flat()),
    restTodo<{ oportunidad_id: string; codigo: string | null; nombre: string | null; fecha_apertura: string | null; quieren: string[] | null }>(
      `opps_abiertas_sin_gestor?select=oportunidad_id,codigo,nombre,fecha_apertura,quieren${comercialId ? `&comercial_id=eq.${comercialId}` : ""}`,
      "fecha_apertura.desc.nullslast,oportunidad_id.asc",
    ),
  ]);
  const resumenDe = new Map(resumenes.map((r) => [r.puesto_id, r]));

  const oppsDe = new Map<string, OppDeGestor[]>();
  for (const o of opps) oppsDe.set(o.puesto, [...(oppsDe.get(o.puesto) ?? []), o]);

  const gestores: GestorCartera[] = consolidados.map((c) => ({
    id: c.puesto_id,
    personaId: c.persona_id,
    nombre: c.nombre?.trim() || "(sin nombre)",
    administracion: c.administracion,
    telefono: c.telefono,
    enCurso: Number(c.en_curso),
    ganadas: Number(c.ganadas),
    perdidas: Number(c.perdidas),
    total: Number(c.total),
    pct: pct(Number(c.ganadas), Number(c.perdidas)),
    dias: c.dias_medios === null ? null : Number(c.dias_medios),
    opps: oppsDe.get(c.puesto_id) ?? [],
    importe: Number(resumenDe.get(c.puesto_id)?.importe_firmado ?? 0),
    ultimaOpp: resumenDe.get(c.puesto_id)?.ultima_opp_nueva ?? null,
    ultimoContacto: resumenDe.get(c.puesto_id)?.ultimo_contacto ?? null,
    fuenteContacto: resumenDe.get(c.puesto_id)?.ultimo_contacto_fuente ?? null,
    cita: resumenDe.get(c.puesto_id)?.proxima_cita_inicio
      ? {
          inicio: resumenDe.get(c.puesto_id)!.proxima_cita_inicio!,
          asunto: resumenDe.get(c.puesto_id)!.proxima_cita_asunto,
          tipo: resumenDe.get(c.puesto_id)!.proxima_cita_tipo,
          con: resumenDe.get(c.puesto_id)!.proxima_cita_con ?? [],
        }
      : null,
    consolidadoEn: resumenDe.get(c.puesto_id)?.consolidado_en ?? null,
    etiquetas: [],
  }));

  // Lo de arriba: los dias medios, sobre todas sus oportunidades firmadas.
  const conFirma = opps.filter((o) => o.firma && o.apertura);
  const diasTodas = conFirma
    .map((o) => (new Date(o.firma!).getTime() - new Date(o.apertura!).getTime()) / 86400000)
    .filter((d) => d >= 0);
  // ESTRELLA Y QUE MAREAN, SOLO DESDE ENERO DE 2025 (Monica, 13-oct-2026):
  // "las hojas y las facturas de antes aun no estan cuadradas". Las mismas
  // cuentas, con las oportunidades abiertas desde entonces hasta hoy.
  const desde2025: GestorCartera[] = gestores.map((g) => {
    const de = g.opps.filter((o) => (o.apertura ?? "") >= DESDE_RANKINGS);
    const ga = de.filter((o) => o.resultado === "ganada").length;
    const pe = de.filter((o) => o.resultado === "perdida").length;
    return { ...g, ganadas: ga, perdidas: pe, enCurso: de.filter((o) => o.resultado === "en_curso").length, total: de.length, pct: pct(ga, pe) };
  });
  const ganadas = gestores.reduce((s, g) => s + g.ganadas, 0);
  const perdidas = gestores.reduce((s, g) => s + g.perdidas, 0);

  // ESTRELLA: mayor porcentaje; a igualdad, el que mas ha firmado.
  const estrella = desde2025
    .filter((g) => g.pct !== null && g.ganadas > 0)
    .sort((a, b) => b.pct! - a.pct! || b.ganadas - a.ganadas)
    .slice(0, 5);
  // QUE MAREAN: peor porcentaje, solo con al menos 5 perdidas.
  const marean = desde2025
    .filter((g) => g.perdidas >= 5)
    .sort((a, b) => a.pct! - b.pct! || b.perdidas - a.perdidas)
    .slice(0, 5);

  // LAS ETIQUETAS (Monica, 15-oct-2026): que la pantalla diga que hacer.
  //   dormido = ha firmado alguna vez y lleva 3 meses sin darnos una opp nueva;
  //   nuevo   = consolidado hace menos de 3 meses.
  const hace3Meses = new Date(Date.now() - 91 * 86400000).toISOString().slice(0, 10);
  const deEstrella = new Set(estrella.map((g) => g.id));
  const deMarea = new Set(marean.map((g) => g.id));
  for (const g of gestores) {
    if (deEstrella.has(g.id)) g.etiquetas.push("estrella");
    if (g.ganadas > 0 && (g.ultimaOpp ?? "") < hace3Meses) g.etiquetas.push("dormido");
    if (deMarea.has(g.id)) g.etiquetas.push("marea");
    if (g.consolidadoEn && g.consolidadoEn >= hace3Meses) g.etiquetas.push("nuevo");
  }

  return {
    gestores,
    sinGestor: sinGestor.map((o) => ({ id: o.oportunidad_id, codigo: o.codigo, nombre: o.nombre, apertura: o.fecha_apertura, quieren: o.quieren ?? [] })),
    noConsolidados: posibles.map((p) => ({
      id: p.puesto_id,
      personaId: p.persona_id,
      nombre: p.nombre?.trim() || "(sin nombre)",
      administracion: p.administracion,
      telefono: p.telefono,
      creado: (p.desde ?? p.creado_en).slice(0, 10),
    })),
    resumen: {
      gestores: gestores.length,
      opps: gestores.reduce((s, g) => s + g.total, 0),
      ganadas,
      perdidas,
      pct: pct(ganadas, perdidas),
      dias: diasTodas.length ? Math.round(diasTodas.reduce((s, d) => s + d, 0) / diasTodas.length) : null,
      importe: gestores.reduce((s, g) => s + g.importe, 0),
    },
    estrella,
    marean,
    puestoIds: consolidados.map((c) => c.puesto_id),
  };
}
