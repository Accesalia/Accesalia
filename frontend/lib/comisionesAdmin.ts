// lib/comisionesAdmin.ts
//
// COMISIONES DE ADMINISTRADORES (Monica, 17-oct-2026). Solo Ana (Ecobalance) y
// direccion. Dos pantallas: el LISTADO (cuadro resumen: quien, empresa, que se
// lleva de proyecto, de subvenciones y de contrata, vigente) y la FICHA de cada
// uno (su acuerdo y sus opps firmadas: lo que se le debe y si esta pagado,
// separando lo nuestro de lo de la contrata).
// Reglas: la comision es del JEFE y sus empleados no deben saber que existe; el
// administrador factura siempre a Ecobalance; los acuerdos los verifica Monica.

import "server-only";
import type { Yo } from "./sesion";
import { nombreDeOpp } from "./direccionOpp";
import { puedeVerEcobalance } from "./cobros";
import { JUSTIFICANTES_DESDE } from "./facturasEmitidas";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
/** Sus facturas y justificantes, en el almacen privado de las facturas. */
const ALMACEN = "facturas";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${d}-${d + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const x = (await r.json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}
async function porTramos<T>(ids: string[], hacer: (t: string) => string): Promise<T[]> {
  const tramos: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) tramos.push(ids.slice(i, i + 150));
  return (await Promise.all(tramos.map((t) => leer<T>(hacer(t.join(",")))))).flat();
}
async function pedir(ruta: string, init: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

/** Solo Ana (facturacion de Ecobalance) y direccion. */
export const puedeVerComisiones = (yo: Yo) => puedeVerEcobalance(yo);

export type Sobre = "proyecto" | "subvenciones" | "contrata";
export const SOBRES: Sobre[] = ["proyecto", "subvenciones", "contrata"];
export type Condicion = { id: string; sobre: Sobre; forma: "eur" | "pct"; valor: number | null; estado: "pactada" | "pendiente"; enB: boolean; via: "nosotros" | "directo" | null; notas: string | null };
export type Acuerdo = {
  id: string;
  personaId: string | null;
  persona: string | null;
  alcance: "empresas" | "lo_suyo";
  /** Las administraciones que cubre; en «lo suyo», donde trabaja la persona. */
  empresas: { id: string; nombre: string }[];
  condiciones: Partial<Record<Sobre, Condicion>>;
  vigente: boolean;
  desde: string | null;
  hasta: string | null;
  noCobra: boolean;
  revision: "verificado" | "por_revisar";
  notas: string | null;
};

type AcuerdoCrudo = {
  id: string; persona_id: string | null; alcance: "empresas" | "lo_suyo"; vigente: boolean; desde: string | null; hasta: string | null; no_cobra: boolean;
  revision: "verificado" | "por_revisar"; notas: string | null;
  persona: { nombre: string | null; apellidos: string | null } | null;
  empresas: { empresa: { id: string; nombre_accesalia: string } | null }[];
  condiciones: { id: string; sobre: Sobre; forma: "eur" | "pct"; valor: number | null; estado: "pactada" | "pendiente"; en_b: boolean; via: "nosotros" | "directo" | null; notas: string | null }[];
};
const SEL =
  "id,persona_id,alcance,vigente,desde,hasta,no_cobra,revision,notas,persona:persona_id(nombre,apellidos)," +
  "empresas:comision_acuerdo_empresas(empresa:empresa_id(id,nombre_accesalia)),condiciones:comision_condiciones(id,sobre,forma,valor,estado,en_b,via,notas)";

const nombre = (p: { nombre: string | null; apellidos: string | null } | null) => (p ? [p.nombre, p.apellidos].filter(Boolean).join(" ").trim() : null);

async function deCrudos(cs: AcuerdoCrudo[]): Promise<Acuerdo[]> {
  // En «lo suyo», la empresa es donde trabaja la persona (su puesto vivo).
  const suyos = cs.filter((c) => c.alcance === "lo_suyo" && c.persona_id).map((c) => c.persona_id!);
  const puestos = suyos.length
    ? await leer<{ persona_id: string; empresa: { id: string; nombre_accesalia: string } | null }>(
        `puesto?select=persona_id,empresa:empresa_id(id,nombre_accesalia)&hasta=is.null&persona_id=in.(${suyos.join(",")})`,
      )
    : [];
  return cs.map((c) => ({
    id: c.id,
    personaId: c.persona_id,
    persona: nombre(c.persona),
    alcance: c.alcance,
    empresas:
      c.alcance === "empresas"
        ? c.empresas.map((e) => e.empresa).filter((e): e is NonNullable<typeof e> => !!e).map((e) => ({ id: e.id, nombre: e.nombre_accesalia }))
        : puestos.filter((p) => p.persona_id === c.persona_id && p.empresa).map((p) => ({ id: p.empresa!.id, nombre: p.empresa!.nombre_accesalia })),
    condiciones: Object.fromEntries(
      c.condiciones.map((x) => [x.sobre, { id: x.id, sobre: x.sobre, forma: x.forma, valor: x.valor == null ? null : Number(x.valor), estado: x.estado, enB: x.en_b, via: x.via, notas: x.notas }]),
    ),
    vigente: c.vigente,
    desde: c.desde,
    hasta: c.hasta,
    noCobra: c.no_cobra,
    revision: c.revision,
    notas: c.notas,
  }));
}

/** EL LISTADO: todos los acuerdos, verificados arriba. */
export async function listaAcuerdos(): Promise<Acuerdo[]> {
  const a = await deCrudos(await leer<AcuerdoCrudo>(`comision_acuerdos?select=${SEL}&order=creado_en`));
  return a.sort(
    (x, y) =>
      Number(x.revision !== "verificado") - Number(y.revision !== "verificado") ||
      Number(!x.vigente) - Number(!y.vigente) ||
      (x.persona ?? x.empresas[0]?.nombre ?? "").localeCompare(y.persona ?? y.empresas[0]?.nombre ?? "", "es"),
  );
}

export async function leerAcuerdo(id: string): Promise<Acuerdo | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [c] = await leer<AcuerdoCrudo>(`comision_acuerdos?select=${SEL}&id=eq.${id}`);
  return c ? (await deCrudos([c]))[0] : null;
}

// ------------------------------------------------------------ sus opps

export type Deuda = {
  sobre: Sobre;
  /** Lo facturado (proyecto, subvenciones) o el importe de la obra (contrata). */
  base: number | null;
  /** Su comision: calculada con el acuerdo, o puesta a mano. */
  importe: number | null;
  aMano: boolean;
  pagada: boolean;
  fechaPago: string | null;
  /** Por que no hay comision o no se puede calcular. */
  aviso: string | null;
  /** EL PASO (Monica): firmada = le debemos → primera parte cobrada = pedirle
   *  factura → su factura → pagada (justificante). «la_paga_la_contrata»: la de
   *  contrata que va directa de la contrata a el; no la pagamos nosotros. */
  paso: Paso | null;
  /** En B: sin factura; de «le debemos» pasa a «pagada». */
  enB: boolean;
  /** Su factura y el justificante del pago, con enlace firmado (una hora). */
  factura: string | null;
  justificante: string | null;
};
export type Paso = "le_debemos" | "pedir_factura" | "su_factura" | "pagada" | "la_paga_la_contrata";
export type OppComision = {
  id: string;
  nombre: string;
  codigo: string | null;
  enCurso: boolean;
  firmada: string | null;
  nuestras: Deuda[];
  contrata: Deuda | null;
  nota: string | null;
  /** Hemos cobrado ya algo de esta opp (la primera parte): toca pedirle factura. */
  cobradaAlgo: boolean;
  /** Lo que queda por pagarle en esta opp. */
  pendiente: number;
};

const esSubvencion = (bloque: { area: string | null; codigo: string | null } | null, desc: string | null) =>
  bloque?.area === "SUBV" || /^TRAMITACION SUBVENCIONES/.test(bloque?.codigo ?? "") || (!bloque && /subvenci/i.test(desc ?? ""));
const r2 = (n: number) => Math.round(n * 100) / 100;

/** LAS OPPS FIRMADAS CON EL, con lo que se le debe en cada una. */
export async function oppsDelAcuerdo(a: Acuerdo): Promise<OppComision[]> {
  // 1. Sus comunidades: las de sus administraciones, o las de su cartera.
  let comunidades: string[] = [];
  let traidas: string[] = [];
  if (a.alcance === "empresas" && a.empresas.length) {
    comunidades = (await leer<{ comunidad_id: string }>(
      `comunidad_admin_responsable?select=comunidad_id&vigente=is.true&empresa_id=in.(${a.empresas.map((e) => e.id).join(",")})`,
    )).map((x) => x.comunidad_id);
  } else if (a.alcance === "lo_suyo" && a.personaId) {
    const pts = (await leer<{ id: string }>(`puesto?select=id&persona_id=eq.${a.personaId}`)).map((p) => p.id);
    if (pts.length)
      comunidades = (await leer<{ comunidad_id: string }>(`comunidad_admin_responsable?select=comunidad_id&vigente=is.true&puesto_id=in.(${pts.join(",")})`)).map((x) => x.comunidad_id);
    // y las opps que trae el (un comercial externo, una persona de contrata)
    traidas = (await leer<{ id: string }>(`oportunidades?select=id&quien_lo_trae=eq.${a.personaId}`)).map((o) => o.id);
  }
  comunidades = [...new Set(comunidades)];
  type O = { id: string; nombre: string | null; codigo: string | null; estado: string; hojas: { estado: string; fecha_firma: string | null }[] };
  const SELO = "id,nombre,codigo,estado,hojas:hojas_encargo(estado,fecha_firma)";
  const ops = [
    ...(await porTramos<O>(comunidades, (t) => `oportunidades?select=${SELO}&comunidad_id=in.(${t})`)),
    ...(await porTramos<O>(traidas, (t) => `oportunidades?select=${SELO}&id=in.(${t})`)),
  ];
  const firmadas = [...new Map(ops.filter((o) => o.hojas.some((h) => h.estado === "devuelta_firmada")).map((o) => [o.id, o])).values()];
  const ids = firmadas.map((o) => o.id);
  if (!ids.length) return [];

  // 2. Lo facturado de cada una (por los hitos casados), proyecto y subvenciones aparte; la obra adjudicada; lo ya apuntado.
  const [lineas, licit, apuntes, notas] = await Promise.all([
    porTramos<{
      descripcion: string | null; bloque: { area: string | null; codigo: string | null } | null; hoja: { oportunidad_id: string } | null;
      hitos: { fl: { importe: number | null; linea: { factura: { estado: string; anio: number; cobros: { id: string }[] } | null } | null }[] }[];
    }>(ids, (t) =>
      `lineas_facturacion?select=descripcion,bloque:bloque_id(area,codigo),hoja:hoja_encargo_id!inner(oportunidad_id),` +
      `hitos:hitos_cobro(fl:factura_linea_hitos(importe,linea:factura_linea_id(factura:factura_id(estado,anio,cobros(id)))))&hoja.oportunidad_id=in.(${t})&quitada_en=is.null&emisor=in.(accesalia,daniel_autonomo)`),
    porTramos<{ oportunidad_id: string; p: { importe_pem: number | null; estado: string }[] }>(ids,
      (t) => `licitaciones?select=oportunidad_id,p:presupuestos_licitacion(importe_pem,estado)&oportunidad_id=in.(${t})`).catch(() => []),
    leer<{
      oportunidad_id: string; sobre: Sobre; base: number | null; importe: number | null; importe_a_mano: boolean; pagada: boolean; fecha_pago: string | null;
      factura_url: string | null; justificante_url: string | null;
    }>(`comisiones_opp?select=oportunidad_id,sobre,base,importe,importe_a_mano,pagada,fecha_pago,factura_url,justificante_url&acuerdo_id=eq.${a.id}`),
    leer<{ oportunidad_id: string; texto: string }>(`comision_notas_opp?select=oportunidad_id,texto&acuerdo_id=eq.${a.id}`),
  ]);
  const fact = new Map<string, { proyecto: number; subvenciones: number; tieneSubv: boolean }>();
  // Cobrada la primera parte: alguna factura suya cobrada, con la regla de siempre
  // (hasta 2023 la factura garantiza el cobro; desde 2024, con justificante).
  const cobradas = new Set<string>();
  for (const l of lineas) {
    const o = l.hoja?.oportunidad_id;
    if (!o) continue;
    const f = fact.get(o) ?? { proyecto: 0, subvenciones: 0, tieneSubv: false };
    const subv = esSubvencion(l.bloque, l.descripcion);
    if (subv) f.tieneSubv = true;
    if (l.hitos.some((h) => h.fl.some((x) => x.linea?.factura && x.linea.factura.estado !== "anulada" && (x.linea.factura.anio < JUSTIFICANTES_DESDE || x.linea.factura.cobros.length > 0))))
      cobradas.add(o);
    const suma = l.hitos.flatMap((h) => h.fl).filter((x) => x.linea?.factura?.estado !== "anulada").reduce((s, x) => s + (Number(x.importe) || 0), 0);
    if (subv) f.subvenciones += suma;
    else f.proyecto += suma;
    fact.set(o, f);
  }
  const obra = new Map<string, number>();
  for (const l of licit) {
    const ad = l.p.find((p) => p.estado === "adjudicada" && p.importe_pem);
    if (ad) obra.set(l.oportunidad_id, Number(ad.importe_pem));
  }
  const apunteDe = new Map(apuntes.map((x) => [`${x.oportunidad_id}|${x.sobre}`, x]));
  const notaDe = new Map(notas.map((x) => [x.oportunidad_id, x.texto]));

  // Los PDF de sus facturas y justificantes, con su enlace firmado.
  const rutas = apuntes.flatMap((x) => [x.factura_url, x.justificante_url]).filter((x): x is string => !!x);
  const enlace = new Map<string, string>();
  if (rutas.length) {
    const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN}`, {
      method: "POST", headers: CAB, body: JSON.stringify({ expiresIn: 3600, paths: rutas }), cache: "no-store",
    });
    if (r.ok)
      for (const x of (await r.json()) as { path: string; signedURL: string | null }[]) if (x.signedURL) enlace.set(x.path, `${URL_BASE}/storage/v1${x.signedURL}`);
  }

  const deuda = (oppId: string, sobre: Sobre, base: number | null, aplica: boolean): Deuda | null => {
    const c = a.condiciones[sobre];
    if (!c) return null;
    const ap = apunteDe.get(`${oppId}|${sobre}`);
    let importe: number | null = null;
    let aviso: string | null = null;
    if (c.estado === "pendiente") aviso = "pendiente de negociar";
    else if (!aplica) aviso = sobre === "contrata" ? "sin obra adjudicada todavía" : "no hay nada de esto en la hoja";
    else if (c.valor == null) aviso = "el acuerdo no dice cuánto";
    else importe = c.forma === "eur" ? c.valor : base != null ? r2((base * c.valor) / 100) : null;
    if (ap?.importe_a_mano && ap.importe != null) importe = Number(ap.importe);
    const pagada = !!ap?.pagada;
    const paso: Paso | null =
      pagada ? "pagada"
      : ap?.factura_url ? "su_factura"
      : !importe ? null
      : sobre === "contrata" && c.via === "directo" ? "la_paga_la_contrata"
      // Lo nuestro: se le pide factura cuando hemos cobrado la primera parte. Lo de
      // la contrata (via nosotros): no sabemos cuando paga la contrata; se queda en
      // «le debemos» hasta que llegue su factura.
      : sobre !== "contrata" && cobradas.has(oppId) && !c.enB ? "pedir_factura"
      : "le_debemos";
    return {
      sobre, base, importe, aMano: !!ap?.importe_a_mano, pagada, fechaPago: ap?.fecha_pago ?? null, aviso: ap?.importe_a_mano ? null : aviso, paso, enB: c.enB,
      factura: ap?.factura_url ? (enlace.get(ap.factura_url) ?? null) : null,
      justificante: ap?.justificante_url ? (enlace.get(ap.justificante_url) ?? null) : null,
    };
  };

  return firmadas
    .map((o) => {
      const f = fact.get(o.id) ?? { proyecto: 0, subvenciones: 0, tieneSubv: false };
      const nuestras = [deuda(o.id, "proyecto", r2(f.proyecto), true), deuda(o.id, "subvenciones", r2(f.subvenciones), f.tieneSubv)].filter((d): d is Deuda => !!d);
      const contrata = deuda(o.id, "contrata", obra.get(o.id) ?? null, obra.has(o.id));
      const todas = [...nuestras, ...(contrata ? [contrata] : [])];
      return {
        id: o.id,
        nombre: nombreDeOpp(o),
        codigo: o.codigo,
        enCurso: o.estado !== "cerrada",
        firmada: o.hojas.filter((h) => h.estado === "devuelta_firmada").map((h) => h.fecha_firma).filter((x): x is string => !!x).sort()[0] ?? null,
        nuestras,
        contrata,
        nota: notaDe.get(o.id) ?? null,
        cobradaAlgo: cobradas.has(o.id),
        pendiente: r2(todas.filter((d) => !d.pagada && d.importe && d.paso !== "la_paga_la_contrata").reduce((s, d) => s + (d.importe ?? 0), 0)),
      };
    })
    .sort((x, y) => (y.firmada ?? "").localeCompare(x.firmada ?? ""));
}

// ------------------------------------------------------------ lo que se apunta

/** Pagada o no, con su fecha; o su importe a mano. */
export async function apuntarDeuda(yo: Yo, acuerdoId: string, oppId: string, sobre: Sobre, d: { pagada?: boolean; fecha?: string | null; importe?: number | null }) {
  const fila: Record<string, unknown> = { oportunidad_id: oppId, acuerdo_id: acuerdoId, sobre, editado_por: yo.id };
  if (d.pagada !== undefined) {
    fila.pagada = d.pagada;
    fila.fecha_pago = d.pagada ? (d.fecha ?? new Date().toISOString().slice(0, 10)) : null;
  }
  if (d.importe !== undefined) {
    fila.importe = d.importe;
    fila.importe_a_mano = d.importe != null;
  }
  await pedir("comisiones_opp?on_conflict=oportunidad_id,acuerdo_id,sobre", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(fila),
  });
}

/** SU FACTURA o EL JUSTIFICANTE del pago: el PDF al almacen, y su ruta en la fila.
 *  Subir el justificante da la comision por pagada (con la fecha que se diga). */
export async function subirDocumento(yo: Yo, acuerdoId: string, oppId: string, sobre: Sobre, que: "factura" | "justificante", nombre: string, pdf: Uint8Array, fecha: string | null) {
  if (!/^[0-9a-f-]{36}$/.test(acuerdoId) || !/^[0-9a-f-]{36}$/.test(oppId) || !SOBRES.includes(sobre)) throw new Error("Datos raros.");
  const limpio = nombre.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const ruta = `comisiones/${acuerdoId}/${oppId}/${sobre}-${que}-${Date.now()}-${limpio}`;
  const r = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: pdf as unknown as BodyInit,
  });
  if (!r.ok) throw new Error(`No se ha podido guardar el PDF: ${r.status} ${await r.text()}`);
  const fila: Record<string, unknown> = { oportunidad_id: oppId, acuerdo_id: acuerdoId, sobre, editado_por: yo.id };
  if (que === "factura") fila.factura_url = ruta;
  else Object.assign(fila, { justificante_url: ruta, pagada: true, fecha_pago: fecha ?? new Date().toISOString().slice(0, 10) });
  await pedir("comisiones_opp?on_conflict=oportunidad_id,acuerdo_id,sobre", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(fila),
  });
}

export async function apuntarNotaOpp(yo: Yo, acuerdoId: string, oppId: string, texto: string) {
  if (!texto.trim()) {
    await pedir(`comision_notas_opp?acuerdo_id=eq.${acuerdoId}&oportunidad_id=eq.${oppId}`, { method: "DELETE" });
    return;
  }
  await pedir("comision_notas_opp?on_conflict=oportunidad_id,acuerdo_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ oportunidad_id: oppId, acuerdo_id: acuerdoId, texto: texto.trim(), editado_por: yo.id, actualizado_en: new Date().toISOString() }),
  });
}

/** Guardar el acuerdo (nuevo o cambiado): sus datos, sus administraciones y sus tres condiciones. */
export async function guardarAcuerdo(
  yo: Yo,
  id: string | null,
  d: {
    personaId: string | null; alcance: "empresas" | "lo_suyo"; empresas: string[]; vigente: boolean; desde: string | null; hasta: string | null;
    noCobra: boolean; verificado: boolean; notas: string | null;
    condiciones: Partial<Record<Sobre, { forma: "eur" | "pct"; valor: number | null; estado: "pactada" | "pendiente"; enB: boolean; via: "nosotros" | "directo" | null } | null>>;
  },
): Promise<string> {
  if (d.alcance === "lo_suyo" && !d.personaId) throw new Error("«Solo lo suyo» necesita la persona.");
  if (d.alcance === "empresas" && !d.empresas.length) throw new Error("Marca al menos una administración.");
  const fila = {
    persona_id: d.personaId, alcance: d.alcance, vigente: d.vigente, desde: d.desde, hasta: d.hasta, no_cobra: d.noCobra,
    revision: d.verificado ? "verificado" : "por_revisar", notas: d.notas?.trim() || null,
    ...(d.verificado ? { verificado_por: yo.id, verificado_en: new Date().toISOString() } : { verificado_por: null, verificado_en: null }),
  };
  let acuerdoId = id;
  if (acuerdoId) await pedir(`comision_acuerdos?id=eq.${acuerdoId}`, { method: "PATCH", body: JSON.stringify(fila), headers: { Prefer: "return=minimal" } });
  else {
    const [n] = (await pedir("comision_acuerdos", { method: "POST", body: JSON.stringify({ ...fila, creado_por: yo.id, origen: "app" }), headers: { Prefer: "return=representation" } })) as { id: string }[];
    acuerdoId = n.id;
  }
  await pedir(`comision_acuerdo_empresas?acuerdo_id=eq.${acuerdoId}`, { method: "DELETE" });
  if (d.alcance === "empresas")
    await pedir("comision_acuerdo_empresas", { method: "POST", body: JSON.stringify(d.empresas.map((e) => ({ acuerdo_id: acuerdoId, empresa_id: e }))), headers: { Prefer: "return=minimal" } });
  for (const s of SOBRES) {
    const c = d.condiciones[s];
    if (!c) await pedir(`comision_condiciones?acuerdo_id=eq.${acuerdoId}&sobre=eq.${s}`, { method: "DELETE" });
    else
      await pedir("comision_condiciones?on_conflict=acuerdo_id,sobre", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ acuerdo_id: acuerdoId, sobre: s, forma: c.forma, valor: c.valor, estado: c.estado, en_b: c.enB, via: s === "contrata" ? c.via : null }),
      });
  }
  return acuerdoId!;
}

/** Buscadores para el alta: personas de la agenda (con su empresa) y administraciones. */
export async function buscarPersonas(q: string) {
  const t = q.trim().replace(/[,()*]/g, " ");
  if (t.length < 3) return [];
  const ps = await leer<{ id: string; nombre: string | null; apellidos: string | null; puestos: { hasta: string | null; empresa: { nombre_accesalia: string } | null }[] }>(
    `persona?select=id,nombre,apellidos,puestos:puesto(hasta,empresa:empresa_id(nombre_accesalia))&or=(nombre.ilike.*${encodeURIComponent(t)}*,apellidos.ilike.*${encodeURIComponent(t)}*)&limit=12`,
  );
  return ps.map((p) => ({ id: p.id, nombre: nombre(p) ?? "", empresa: p.puestos.filter((x) => !x.hasta && x.empresa).map((x) => x.empresa!.nombre_accesalia).join(", ") }));
}
export async function buscarEmpresas(q: string) {
  const t = q.trim().replace(/[,()*]/g, " ");
  if (t.length < 2) return [];
  return (await leer<{ id: string; nombre_accesalia: string }>(`empresa?select=id,nombre_accesalia&nombre_accesalia=ilike.*${encodeURIComponent(t)}*&limit=12`)).map((e) => ({ id: e.id, nombre: e.nombre_accesalia }));
}
