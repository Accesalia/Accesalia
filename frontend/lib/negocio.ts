import "server-only";
import { columnasDeInteres } from "./columnasInteres";
import { datosProyectos, diasDeObras, leerTiempos } from "./trabajosTecnico";
// lib/negocio.ts
//
// NEGOCIO · TRABAJO CONTRATADO (Monica, 12-oct-2026). Indicadores de seguimiento
// para direccion (Monica y Daniel), entre las fechas que se elijan. Lo que tiene
// dato se calcula; lo que no, la pantalla lo deja apuntado como hueco ("que me
// sirva de apunte para despues saber que necesito calcular"). NADA DE MONDAY.
//
// Criterios suyos:
//   - OPP GANADA = hoja de encargo firmada, por la fecha en que se RECIBIO firmada
//     (no la de la hoja). Las que entran por la app guardan ese dia; en las
//     historicas es la fecha de firma cargada.
//   - EXITO, los dos: ganadas / (ganadas + perdidas) y ganadas / abiertas.
//   - EXITO DE ADMINISTRADORES: los nuevos que han firmado al menos una hoja.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function todo<T>(ruta: string): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const t = (await r.json()) as T[];
    out.push(...t);
    if (t.length < 1000) return out;
  }
}

export type PorComercial = {
  id: string | null;
  nombre: string;
  abiertasAhora: number;
  abiertasEnPeriodo: number;
  ganadas: number;
  perdidas: number;
  importe: number;
  exitoCerradas: number | null; // ganadas / (ganadas + perdidas)
  exitoAbiertas: number | null; // ganadas / abiertas en el periodo
  adminsNuevos: number;
  adminsConFirma: number;
};

/** Un tipo de lo contratado: cuantas lineas y cuanto suman (las «a exito», aparte). */
export type TipoContratado = { nombre: string; lineas: number; importe: number; aExito: number };
export type ColumnaContratada = { titulo: string; lineas: number; importe: number; tipos: TipoContratado[] };

/** EL COLCHON DE PROYECTOS (Monica, 21-oct-2026): la cola frente a lo que el equipo
 *  puede sacar por semana. Los umbrales y la capacidad viven en parametros_alerta
 *  (claves colchon_*) y se cambian desde la propia tarjeta; estos son los de partida. */
export const COLCHON_DE_PARTIDA = {
  minimo: 3, // semanas: por debajo, no da tiempo a reaccionar
  idealDesde: 4,
  idealHasta: 5,
  maximo: 6, // semanas: por encima, colapso
  tecnicos: 6,
  horasTecnico: 30, // horas de proyecto por semana: no todo es proyecto (RQ, repasos, revisiones)
  horasParcial: 15, // el tecnico a media jornada
  horasDia: 8, // para pasar a horas los dias de los tiempos estandar
};
export type UmbralesColchon = typeof COLCHON_DE_PARTIDA;
export const CLAVE_COLCHON: Record<keyof UmbralesColchon, string> = {
  minimo: "colchon_minimo",
  idealDesde: "colchon_ideal_desde",
  idealHasta: "colchon_ideal_hasta",
  maximo: "colchon_maximo",
  tecnicos: "colchon_tecnicos",
  horasTecnico: "colchon_horas_tecnico",
  horasParcial: "colchon_horas_parcial",
  horasDia: "colchon_horas_dia",
};
export const horasSemana = (u: UmbralesColchon) => u.tecnicos * u.horasTecnico + u.horasParcial;

export async function umbralesColchon(): Promise<UmbralesColchon> {
  const filas = await todo<{ clave: string; valor: number }>("parametros_alerta?select=clave,valor&activo=is.true&clave=like.colchon_*").catch(() => []);
  const u = { ...COLCHON_DE_PARTIDA };
  for (const k of Object.keys(CLAVE_COLCHON) as (keyof UmbralesColchon)[]) {
    const f = filas.find((x) => x.clave === CLAVE_COLCHON[k]);
    if (f && Number.isFinite(Number(f.valor))) u[k] = Number(f.valor);
  }
  return u;
}

/** Guardar los umbrales (solo direccion: la pantalla ya lo exige). */
export async function guardarUmbralesColchon(u: UmbralesColchon) {
  for (const k of Object.keys(CLAVE_COLCHON) as (keyof UmbralesColchon)[]) {
    const r = await fetch(`${URL_BASE}/rest/v1/parametros_alerta?clave=eq.${CLAVE_COLCHON[k]}`, {
      method: "PATCH",
      headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ valor: u[k], actualizado_en: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  }
}
export type Colchon = { proyectos: number; sinHoras: number; horas: number; semanas: number | null };

export type TrabajoContratado = {
  desde: string;
  hasta: string;
  total: PorComercial;
  porComercial: PorComercial[];
  /** El mismo periodo, un año antes. */
  anterior: { importe: number; ganadas: number };
  hojas: number;
  /** Lo que piden los proyectos contratados, en horas estandar. */
  horasTecnico: number;
  colchon: Colchon;
  umbrales: UmbralesColchon;
  columnas: ColumnaContratada[];
  sinTipo: { lineas: number; importe: number; porBloque: { bloque: string; lineas: number; importe: number }[] };
  /** Lo que suman las lineas, para ver si cuadra con el total de las hojas. */
  importeLineas: number;
  administraciones: { nombre: string; opps: number; importe: number }[];
  ganadasSinAdministracion: number;
  porMes: { mes: string; importe: number; firmadas: number; importeAnterior: number }[];
  adminsSinFecha: number;
};

const vacio = (id: string | null, nombre: string): PorComercial => ({
  id, nombre, abiertasAhora: 0, abiertasEnPeriodo: 0, ganadas: 0, perdidas: 0, importe: 0, exitoCerradas: null, exitoAbiertas: null, adminsNuevos: 0, adminsConFirma: 0,
});

const unAnoAntes = (f: string) => `${Number(f.slice(0, 4)) - 1}${f.slice(4)}`;
function trozos<T>(xs: T[], n = 150): T[][] {
  return Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
}

/** El colchon de hoy: los proyectos que esperan tecnico o lo tienen y no han terminado,
 *  con las mismas listas y los mismos dias que Asignar (lib/trabajosTecnico). */
async function colchonDeHoy(u: UmbralesColchon): Promise<Colchon> {
  const [d, tiempos, actuaciones] = await Promise.all([
    datosProyectos(),
    leerTiempos(),
    todo<{ hoja: { oportunidad_id: string | null } | null; tipo: { clave: string } | null }>(
      "actuaciones_hoja?select=hoja:hoja_encargo_id!inner(oportunidad_id),tipo:tipo_proyecto_id(clave)&hoja.estado=eq.devuelta_firmada",
    ),
  ]);
  const obras = new Map<string, Set<string>>();
  for (const a of actuaciones)
    if (a.hoja?.oportunidad_id && a.tipo) obras.set(a.hoja.oportunidad_id, (obras.get(a.hoja.oportunidad_id) ?? new Set<string>()).add(a.tipo.clave));
  const enCola = new Map<string, number | null>();
  // Antes de la nube (pendientes de decidir y en nube): los dias de sus obras.
  for (const t of [...d.asignar.pendientes, ...d.asignar.enNube]) enCola.set(t.oppId, diasDeObras([...(obras.get(t.oppId) ?? [])], tiempos));
  // Ya listos: los dias que puso Alex, o los calculados. Solo proyectos: los RQ ya van descontados de las horas.
  for (const t of [...d.porEstimar, ...d.porAsignar, ...d.asignados]) if (t.tipo === "proyecto") enCola.set(t.oppId, t.dias ?? t.diasCalculados);
  const dias = [...enCola.values()];
  const horas = dias.reduce<number>((s, x) => s + (x ?? 0), 0) * u.horasDia;
  return {
    proyectos: enCola.size,
    sinHoras: dias.filter((x) => x == null).length,
    horas,
    semanas: enCola.size && horasSemana(u) > 0 ? Math.round((horas / horasSemana(u)) * 10) / 10 : null,
  };
}

export async function trabajoContratado(desde: string, hasta: string): Promise<TrabajoContratado> {
  const dentro = (f: string | null | undefined, d = desde, h = hasta) => !!f && f.slice(0, 10) >= d && f.slice(0, 10) <= h;
  const antes = (f: string | null | undefined) => dentro(f, unAnoAntes(desde), unAnoAntes(hasta));

  // De que administraciones es cada opp: las de sus comunidades, por sus accesos (18-oct-2026).
  const empresasDeOpp = new Map<string, string[]>();
  for (const f of await todo<{ oportunidad_id: string; empresa_id: string | null }>("administradores_de_oportunidad?select=oportunidad_id,empresa_id&empresa_id=not.is.null").catch(() => [])) {
    const ya = empresasDeOpp.get(f.oportunidad_id) ?? [];
    if (!ya.includes(f.empresa_id as string)) empresasDeOpp.set(f.oportunidad_id, [...ya, f.empresa_id as string]);
  }
  const umbrales = await umbralesColchon();
  const [comerciales, opps, hojas, perdidas, admins, tipos, tiempos, colchon] = await Promise.all([
    todo<{ id: string; nombre: string }>("comerciales?select=id,nombre&order=nombre.asc"),
    todo<{ id: string; comercial_id: string | null; estado: string; fecha_apertura: string | null; creado_en: string }>(
      "oportunidades?select=id,comercial_id,estado,fecha_apertura,creado_en&estado=neq.anulada",
    ),
    todo<{ id: string; oportunidad_id: string | null; fecha_firma: string | null; version_firmada_id: string | null; versiones: { id: string; numero_version: number; importe_base: number | null }[] }>(
      "hojas_encargo?select=id,oportunidad_id,fecha_firma,version_firmada_id,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,importe_base)&estado=eq.devuelta_firmada",
    ),
    todo<{ oportunidad_id: string; fecha_cierre: string | null }>("motivo_cierre_oportunidad?select=oportunidad_id,fecha_cierre&resultado_final=eq.perdido"),
    todo<{ id: string; comercial_id: string | null; fecha_alta_cartera: string | null; nombre_accesalia: string | null; nombre_legal: string | null }>(
      "empresa?select=id,comercial_id,fecha_alta_cartera,nombre_accesalia,nombre_legal&tipo=eq.administracion_fincas",
    ),
    todo<{ id: string; nombre: string }>("tipos_proyecto?select=id,nombre&activo=eq.true&elegible=eq.true&order=orden.asc"),
    leerTiempos(),
    colchonDeHoy(umbrales),
  ]);

  const oppDe = new Map(opps.map((o) => [o.id, o]));
  const nombreCom = new Map(comerciales.map((c) => [c.id, c.nombre]));
  const filas = new Map<string, PorComercial>();
  const fila = (id: string | null) => {
    const k = id ?? "-";
    if (!filas.has(k)) filas.set(k, vacio(id, id ? (nombreCom.get(id) ?? "—") : "Sin comercial"));
    return filas.get(k)!;
  };
  const total = vacio(null, "Total");
  const sumar = (id: string | null, f: (x: PorComercial) => void) => {
    f(fila(id));
    f(total);
  };

  // Abiertas
  for (const o of opps) {
    if (o.estado === "abierta") sumar(o.comercial_id, (x) => x.abiertasAhora++);
    if (dentro(o.fecha_apertura ?? o.creado_en)) sumar(o.comercial_id, (x) => x.abiertasEnPeriodo++);
  }

  // Ganadas = hojas firmadas recibidas en el periodo (una opp cuenta una vez)
  type Hoja = (typeof hojas)[number];
  const versionDe = (h: Hoja) => h.versiones.find((v) => v.id === h.version_firmada_id) ?? [...h.versiones].sort((a, b) => b.numero_version - a.numero_version)[0];
  const importeDe = (h: Hoja) => Number(versionDe(h)?.importe_base) || 0;
  const delPeriodo = hojas.filter((x) => dentro(x.fecha_firma) && x.oportunidad_id && oppDe.has(x.oportunidad_id));
  const ganadas = new Set<string>();
  const meses = new Map<string, { importe: number; firmadas: number; importeAnterior: number }>();
  const mes = (m: string) => meses.get(m) ?? { importe: 0, firmadas: 0, importeAnterior: 0 };
  for (const h of delPeriodo) {
    const o = oppDe.get(h.oportunidad_id!);
    const imp = importeDe(h);
    sumar(o?.comercial_id ?? null, (x) => (x.importe += imp));
    if (!ganadas.has(h.oportunidad_id!)) {
      ganadas.add(h.oportunidad_id!);
      sumar(o?.comercial_id ?? null, (x) => x.ganadas++);
    }
    const m = h.fecha_firma!.slice(0, 7);
    const mm = mes(m);
    mm.importe += imp;
    mm.firmadas++;
    meses.set(m, mm);
  }
  for (const p of perdidas.filter((x) => dentro(x.fecha_cierre))) sumar(oppDe.get(p.oportunidad_id)?.comercial_id ?? null, (x) => x.perdidas++);

  // El mismo periodo, un año antes, y cada mes al lado del suyo.
  const anterior = { importe: 0, ganadas: 0 };
  const ganadasAntes = new Set<string>();
  for (const h of hojas.filter((x) => antes(x.fecha_firma) && x.oportunidad_id && oppDe.has(x.oportunidad_id))) {
    anterior.importe += importeDe(h);
    ganadasAntes.add(h.oportunidad_id!);
    const m = `${Number(h.fecha_firma!.slice(0, 4)) + 1}${h.fecha_firma!.slice(4, 7)}`;
    const mm = mes(m);
    mm.importeAnterior += importeDe(h);
    meses.set(m, mm);
  }
  anterior.ganadas = ganadasAntes.size;

  // Administradores nuevos y cuantos han firmado alguna hoja
  const empresasConFirma = new Set(hojas.flatMap((h) => (h.oportunidad_id ? empresasDeOpp.get(h.oportunidad_id) ?? [] : [])));
  for (const a of admins.filter((x) => dentro(x.fecha_alta_cartera))) {
    sumar(a.comercial_id, (x) => x.adminsNuevos++);
    if (empresasConFirma.has(a.id)) sumar(a.comercial_id, (x) => x.adminsConFirma++);
  }

  // De que administraciones vino lo firmado en el periodo.
  const nombreAdm = new Map(admins.map((a) => [a.id, a.nombre_accesalia || a.nombre_legal || "—"]));
  const porAdm = new Map<string, { opps: Set<string>; importe: number }>();
  const sinAdm = new Set<string>();
  for (const h of delPeriodo) {
    const es = empresasDeOpp.get(h.oportunidad_id!) ?? [];
    if (!es.length) sinAdm.add(h.oportunidad_id!);
    for (const e of es) {
      const x = porAdm.get(e) ?? { opps: new Set<string>(), importe: 0 };
      x.opps.add(h.oportunidad_id!);
      x.importe += importeDe(h);
      porAdm.set(e, x);
    }
  }

  // LO CONTRATADO POR TIPO (Monica, 21-oct-2026): las lineas de la version firmada
  // con lo que son (tipos_proyecto) y su importe. Cuenta una linea si tiene tipo o
  // lleva dinero (importe o %); la que va dentro de otra no cuenta aparte. Las de
  // 0 € sin tipo son lo incluido (fin de obra, toma de datos...) y no cuentan.
  const oppDeVersion = new Map<string, string>();
  for (const h of delPeriodo) {
    const v = versionDe(h)?.id;
    if (v) oppDeVersion.set(v, h.oportunidad_id!);
  }
  const lineas = (
    await Promise.all(
      trozos([...oppDeVersion.keys()]).map((t) =>
        todo<{ version_hoja_id: string; importe: number | null; porcentaje: number | null; tipo: { id: string; clave: string | null } | null; bloque: { nombre: string } | null }>(
          `conceptos_hoja?select=version_hoja_id,importe,porcentaje,tipo:tipo_proyecto_id(id,clave),bloque:bloque_id(nombre)&incluido_en_concepto_id=is.null&version_hoja_id=in.(${t.join(",")})`,
        ),
      ),
    )
  ).flat();
  const porTipo = new Map<string, TipoContratado>(tipos.map((t) => [t.id, { nombre: t.nombre, lineas: 0, importe: 0, aExito: 0 }]));
  const sinTipo = new Map<string, { bloque: string; lineas: number; importe: number }>();
  const clavesDeOpp = new Map<string, Set<string>>();
  let importeLineas = 0;
  for (const l of lineas) {
    const imp = Number(l.importe) || 0;
    const dinero = imp > 0 || (Number(l.porcentaje) || 0) > 0;
    if (!l.tipo && !dinero) continue;
    importeLineas += imp;
    const t = l.tipo ? porTipo.get(l.tipo.id) : undefined;
    if (t && l.tipo) {
      t.lineas++;
      t.importe += imp;
      if (!(imp > 0)) t.aExito++;
      const opp = oppDeVersion.get(l.version_hoja_id);
      if (opp && l.tipo.clave) clavesDeOpp.set(opp, (clavesDeOpp.get(opp) ?? new Set<string>()).add(l.tipo.clave));
    } else {
      const b = l.bloque?.nombre ?? "Sin bloque";
      const x = sinTipo.get(b) ?? { bloque: b, lineas: 0, importe: 0 };
      x.lineas++;
      x.importe += imp;
      sinTipo.set(b, x);
    }
  }
  // Las cuatro columnas del selector de «que quieren» (lib/columnasInteres); arriba, lo de mas importe.
  const columnas = columnasDeInteres(tipos.map((t) => ({ id: t.id, nombre: t.nombre, usos: porTipo.get(t.id)!.importe + porTipo.get(t.id)!.lineas / 1000 }))).map((c) => {
    const ts = c.valores.map((id) => porTipo.get(id)!);
    return { titulo: c.titulo, lineas: ts.reduce((s, t) => s + t.lineas, 0), importe: ts.reduce((s, t) => s + t.importe, 0), tipos: ts };
  });
  // Las horas de lo contratado: cada opp con sus obras, como en Asignar.
  const horasTecnico = [...clavesDeOpp.values()].reduce((s, c) => s + (diasDeObras([...c], tiempos) ?? 0), 0) * umbrales.horasDia;

  const cierra = (x: PorComercial) => {
    x.exitoCerradas = x.ganadas + x.perdidas ? x.ganadas / (x.ganadas + x.perdidas) : null;
    x.exitoAbiertas = x.abiertasEnPeriodo ? x.ganadas / x.abiertasEnPeriodo : null;
    x.importe = Math.round(x.importe * 100) / 100;
    return x;
  };
  const listaSinTipo = [...sinTipo.values()].sort((a, b) => b.importe - a.importe);

  return {
    desde,
    hasta,
    total: cierra(total),
    porComercial: [...filas.values()].map(cierra).filter((x) => x.abiertasAhora || x.abiertasEnPeriodo || x.ganadas || x.perdidas || x.adminsNuevos).sort((a, b) => b.importe - a.importe),
    anterior,
    hojas: delPeriodo.length,
    horasTecnico,
    colchon,
    umbrales,
    columnas,
    sinTipo: { lineas: listaSinTipo.reduce((s, x) => s + x.lineas, 0), importe: listaSinTipo.reduce((s, x) => s + x.importe, 0), porBloque: listaSinTipo },
    importeLineas,
    administraciones: [...porAdm.entries()].map(([id, x]) => ({ nombre: nombreAdm.get(id) ?? "—", opps: x.opps.size, importe: x.importe })).sort((a, b) => b.importe - a.importe),
    ganadasSinAdministracion: sinAdm.size,
    porMes: [...meses.entries()].filter(([m]) => m >= desde.slice(0, 7) && m <= hasta.slice(0, 7)).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v })),
    adminsSinFecha: admins.filter((a) => !a.fecha_alta_cartera).length,
  };
}

// ── CONTROL INTERNO: los tecnicos (los de la funcion "proyecto", como el cronograma).
export async function tecnicos(): Promise<{ id: string; nombre: string }[]> {
  const filas = await todo<{ equipo: { id: string; nombre: string; apellidos: string | null; activo: boolean | null } | null }>(
    "equipo_funciones?select=equipo:equipo_id(id,nombre,apellidos,activo),funcion:funcion_id!inner(clave)&funcion.clave=eq.proyecto",
  );
  const vistos = new Map<string, string>();
  for (const f of filas)
    if (f.equipo && f.equipo.activo !== false) vistos.set(f.equipo.id, [f.equipo.nombre, f.equipo.apellidos].filter(Boolean).join(" "));
  return [...vistos.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// ── RESULTADOS ECONOMICOS: lo unico con dato hoy son las FACTURAS (base sin IVA,
// abonos restando, anuladas fuera), por quien emite. No hay fecha de cobro.
export type Facturado = { emisor: string; facturado: number; pendiente: number; facturas: number };
export async function facturadoEntre(desde: string, hasta: string): Promise<Facturado[]> {
  const filas = await todo<{ empresa_emisora: string; estado: string | null; base: number | null }>(
    `facturas?select=empresa_emisora,estado,base&fecha=gte.${desde}&fecha=lte.${hasta}&estado=neq.anulada`,
  );
  const por = new Map<string, Facturado>();
  for (const f of filas) {
    const x = por.get(f.empresa_emisora) ?? { emisor: f.empresa_emisora, facturado: 0, pendiente: 0, facturas: 0 };
    const b = Number(f.base) || 0;
    x.facturado += b;
    if (f.estado === "pendiente" || f.estado === "cobrada_en_parte") x.pendiente += b;
    x.facturas++;
    por.set(f.empresa_emisora, x);
  }
  return [...por.values()];
}

/** Las fechas de las pantallas de direccion: por defecto, de 1 de enero a hoy. */
export function periodo(sp: { desde?: string; hasta?: string }): { desde: string; hasta: string } {
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const ok = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  return { desde: ok(sp.desde) ?? `${hoy.slice(0, 4)}-01-01`, hasta: ok(sp.hasta) ?? hoy };
}
