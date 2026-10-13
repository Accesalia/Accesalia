import "server-only";
import { nombreDeOpp } from "./direccionOpp";
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

export type LineaContratada = { descripcion: string; importe: number | null; porcentaje: number | null; faro: boolean; tecnico: boolean; emisor: string | null };
export type DireccionContratada = {
  oppId: string;
  codigo: string | null;
  direccion: string;
  comercial: string;
  hojas: { codigo: string | null; firmada: string | null; importe: number }[];
  lineas: LineaContratada[];
  /** Lo unico del "punto" que ya tiene dato propio: su nube de puntos. */
  nube: { prevista: string | null; escaneado: string | null; lista: string | null } | null;
};

export type TrabajoContratado = {
  desde: string;
  hasta: string;
  total: PorComercial;
  porComercial: PorComercial[];
  porMes: { mes: string; importe: number; firmadas: number }[];
  direcciones: DireccionContratada[];
  adminsSinFecha: number;
};

const vacio = (id: string | null, nombre: string): PorComercial => ({
  id, nombre, abiertasAhora: 0, abiertasEnPeriodo: 0, ganadas: 0, perdidas: 0, importe: 0, exitoCerradas: null, exitoAbiertas: null, adminsNuevos: 0, adminsConFirma: 0,
});

export async function trabajoContratado(desde: string, hasta: string): Promise<TrabajoContratado> {
  const dentro = (f: string | null | undefined) => !!f && f.slice(0, 10) >= desde && f.slice(0, 10) <= hasta;

  const [comerciales, opps, hojas, perdidas, admins, nubes] = await Promise.all([
    todo<{ id: string; nombre: string }>("comerciales?select=id,nombre&order=nombre.asc"),
    todo<{ id: string; codigo: string | null; comercial_id: string | null; estado: string; fecha_apertura: string | null; creado_en: string; nombre: string | null; comunidad_provisional: string | null;
      comunidad: { nombre: string } | null; admin: { empresa_id: string | null } | null }>(
      "oportunidades?select=id,codigo,comercial_id,estado,fecha_apertura,creado_en,nombre,comunidad_provisional,comunidad:comunidad_id(nombre),admin:administrador_puesto_id(empresa_id)",
    ),
    todo<{ id: string; numero_hoja: string | null; oportunidad_id: string | null; fecha_firma: string | null; version_firmada_id: string | null; versiones: { id: string; numero_version: number; importe_base: number | null }[] }>(
      "hojas_encargo?select=id,numero_hoja,oportunidad_id,fecha_firma,version_firmada_id,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,importe_base)&estado=eq.devuelta_firmada",
    ),
    todo<{ oportunidad_id: string; fecha_cierre: string | null }>("motivo_cierre_oportunidad?select=oportunidad_id,fecha_cierre&resultado_final=eq.perdido"),
    todo<{ id: string; comercial_id: string | null; fecha_alta_cartera: string | null }>("empresa?select=id,comercial_id,fecha_alta_cartera&tipo=eq.administracion_fincas"),
    todo<{ oportunidad_id: string; fecha_prevista_escaneo: string | null; escaneado_en: string | null; nube_lista_en: string | null }>(
      "nubes_puntos?select=oportunidad_id,fecha_prevista_escaneo,escaneado_en,nube_lista_en",
    ),
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
  const importeDe = (h: (typeof hojas)[number]) =>
    Number((h.versiones.find((v) => v.id === h.version_firmada_id) ?? [...h.versiones].sort((a, b) => b.numero_version - a.numero_version)[0])?.importe_base) || 0;
  const ganadas = new Set<string>();
  const meses = new Map<string, { importe: number; firmadas: number }>();
  for (const h of hojas.filter((x) => dentro(x.fecha_firma) && x.oportunidad_id)) {
    const o = oppDe.get(h.oportunidad_id!);
    const imp = importeDe(h);
    sumar(o?.comercial_id ?? null, (x) => (x.importe += imp));
    if (!ganadas.has(h.oportunidad_id!)) {
      ganadas.add(h.oportunidad_id!);
      sumar(o?.comercial_id ?? null, (x) => x.ganadas++);
    }
    const m = h.fecha_firma!.slice(0, 7);
    const mm = meses.get(m) ?? { importe: 0, firmadas: 0 };
    mm.importe += imp;
    mm.firmadas++;
    meses.set(m, mm);
  }
  for (const p of perdidas.filter((x) => dentro(x.fecha_cierre))) sumar(oppDe.get(p.oportunidad_id)?.comercial_id ?? null, (x) => x.perdidas++);

  // Administradores nuevos y cuantos han firmado alguna hoja
  const empresasConFirma = new Set(
    hojas.map((h) => (h.oportunidad_id ? oppDe.get(h.oportunidad_id)?.admin?.empresa_id : null)).filter((x): x is string => !!x),
  );
  for (const a of admins.filter((x) => dentro(x.fecha_alta_cartera))) {
    sumar(a.comercial_id, (x) => x.adminsNuevos++);
    if (empresasConFirma.has(a.id)) sumar(a.comercial_id, (x) => x.adminsConFirma++);
  }

  const cierra = (x: PorComercial) => {
    x.exitoCerradas = x.ganadas + x.perdidas ? x.ganadas / (x.ganadas + x.perdidas) : null;
    x.exitoAbiertas = x.abiertasEnPeriodo ? x.ganadas / x.abiertasEnPeriodo : null;
    x.importe = Math.round(x.importe * 100) / 100;
    return x;
  };

  // El esquema por direccion: las opps ABIERTAS con hoja firmada en el periodo.
  const conFirma = hojas.filter((h) => dentro(h.fecha_firma) && h.oportunidad_id && oppDe.get(h.oportunidad_id)?.estado === "abierta");
  const hojaIds = conFirma.map((h) => h.id);
  const lineas = hojaIds.length
    ? (
        await Promise.all(
          Array.from({ length: Math.ceil(hojaIds.length / 150) }, (_, i) => hojaIds.slice(i * 150, i * 150 + 150)).map((trozo) =>
            todo<{ hoja_encargo_id: string; descripcion: string | null; importe: number | null; porcentaje: number | null; emisor: string | null; bloque: { nombre: string; va_a_faro: boolean; va_a_tecnico: boolean } | null }>(
              `lineas_facturacion?select=hoja_encargo_id,descripcion,importe,porcentaje,emisor,bloque:bloque_id(nombre,va_a_faro,va_a_tecnico)&hoja_encargo_id=in.(${trozo.join(",")})`,
            ),
          ),
        )
      ).flat()
    : [];
  const nubeDe = new Map(nubes.map((n) => [n.oportunidad_id, { prevista: n.fecha_prevista_escaneo, escaneado: n.escaneado_en, lista: n.nube_lista_en }]));
  const porOpp = new Map<string, DireccionContratada>();
  for (const h of conFirma) {
    const o = oppDe.get(h.oportunidad_id!)!;
    const d = porOpp.get(o.id) ?? {
      oppId: o.id,
      codigo: o.codigo,
      direccion: nombreDeOpp(o),
      comercial: o.comercial_id ? (nombreCom.get(o.comercial_id) ?? "—") : "Sin comercial",
      hojas: [],
      lineas: [],
      nube: nubeDe.get(o.id) ?? null,
    };
    d.hojas.push({ codigo: h.numero_hoja, firmada: h.fecha_firma, importe: importeDe(h) });
    for (const l of lineas.filter((x) => x.hoja_encargo_id === h.id))
      d.lineas.push({
        descripcion: (l.bloque?.nombre ?? l.descripcion ?? "Línea").trim(),
        importe: l.importe == null ? null : Number(l.importe),
        porcentaje: l.porcentaje == null ? null : Number(l.porcentaje),
        faro: !!l.bloque?.va_a_faro,
        tecnico: !!l.bloque?.va_a_tecnico,
        emisor: l.emisor,
      });
    porOpp.set(o.id, d);
  }

  return {
    desde,
    hasta,
    total: cierra(total),
    porComercial: [...filas.values()].map(cierra).filter((x) => x.abiertasAhora || x.abiertasEnPeriodo || x.ganadas || x.perdidas || x.adminsNuevos).sort((a, b) => b.importe - a.importe),
    porMes: [...meses.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v })),
    direcciones: [...porOpp.values()].sort((a, b) => (b.hojas[0]?.firmada ?? "").localeCompare(a.hojas[0]?.firmada ?? "")),
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
