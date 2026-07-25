// lib/facturacion.ts
//
// FACTURACION · bocado 1 (libro Accesalia). La app es TORRE DE CONTROL: Factusol
// emite la factura; aqui se planifica el plan de hitos, se registra la factura
// (nº + PDF) y el cobro, y se vigila lo pendiente.
//
// SEGREGACION por EMISOR: el ambito Accesalia (Alexandra) ve emisor accesalia +
// daniel_autonomo; el ambito Ecobalance (Ana) ve emisor ecobalance. Todo lo de
// Ecobalance queda FUERA de este libro. Los tipos y las lecturas por hoja/comunidad
// viven en lib/hojas.ts; aqui van el panel transversal y las etiquetas de emisor.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

// ---- Emisores / ambitos ----

export const EMISOR_LABEL: Record<string, string> = {
  accesalia: "Accesalia",
  daniel_autonomo: "Daniel (autónomo)",
  ecobalance: "Ecobalance",
};

/** Emisores del ambito Accesalia (Alexandra). Ecobalance queda fuera de este libro. */
export const EMISORES_ACCESALIA = ["accesalia", "daniel_autonomo"] as const;
const FILTRO_ACCESALIA = `emisor=in.(${EMISORES_ACCESALIA.join(",")})`;

// ---- Panel transversal ----

type HitoAgg = {
  estado: string;
  importe: number | null;
  hito: string;
  fecha_vencimiento: string | null;
};
type LineaPanel = {
  importe: number | null;
  es_porcentaje: boolean;
  verificado: boolean;
  hitos_cobro: HitoAgg[];
  hojas_encargo: { comunidad_id: string; comunidades: { nombre: string; municipio: string | null } | null };
};

export type FacturaComunidadFila = {
  comunidadId: string;
  comunidadNombre: string;
  municipio: string | null;
  contratado: number;
  pendiente: number; // ni facturado ni cobrado
  facturado: number; // facturado, sin cobrar
  cobrado: number;
  devuelto: number;
  nPendiente: number;
  nFacturado: number;
  vencido: boolean; // algun hito facturado y vencido sin cobrar
};

export type ResumenFacturacionPanel = {
  comunidades: number;
  contratado: number;
  pendiente: number;
  facturado: number;
  cobrado: number;
  devuelto: number;
  hayEstimado: boolean;
};

/** Panel de facturacion (ambito Accesalia): estado del dinero por comunidad. */
export async function facturacionPanel(hoy: string): Promise<{ filas: FacturaComunidadFila[]; resumen: ResumenFacturacionPanel }> {
  const rows = await rest<LineaPanel[]>(
    "lineas_facturacion?select=importe,es_porcentaje,verificado," +
      "hitos_cobro(estado,importe,hito,fecha_vencimiento)," +
      "hojas_encargo!inner(comunidad_id,comunidades(nombre,municipio))" +
      `&${FILTRO_ACCESALIA}&limit=5000`,
  );

  const porCom = new Map<string, FacturaComunidadFila>();
  let hayEstimado = false;
  for (const l of rows) {
    const h = l.hojas_encargo;
    if (!porCom.has(h.comunidad_id)) {
      porCom.set(h.comunidad_id, {
        comunidadId: h.comunidad_id,
        comunidadNombre: h.comunidades?.nombre ?? "—",
        municipio: h.comunidades?.municipio ?? null,
        contratado: 0, pendiente: 0, facturado: 0, cobrado: 0, devuelto: 0,
        nPendiente: 0, nFacturado: 0, vencido: false,
      });
    }
    const f = porCom.get(h.comunidad_id)!;
    if (!l.es_porcentaje && l.importe) f.contratado += l.importe;
    if (!l.verificado) hayEstimado = true;
    for (const hc of l.hitos_cobro ?? []) {
      const imp = hc.importe ?? 0;
      if (hc.estado === "cobrado") f.cobrado += imp;
      else if (hc.estado === "facturado") {
        f.facturado += imp; f.nFacturado++;
        if (hc.fecha_vencimiento && hc.fecha_vencimiento < hoy) f.vencido = true;
      } else if (hc.estado === "devuelto") f.devuelto += imp;
      else if (hc.estado === "pendiente") { f.pendiente += imp; f.nPendiente++; }
    }
  }

  const filas = [...porCom.values()].sort((a, b) => a.comunidadNombre.localeCompare(b.comunidadNombre, "es"));
  const resumen: ResumenFacturacionPanel = {
    comunidades: filas.length,
    contratado: filas.reduce((s, f) => s + f.contratado, 0),
    pendiente: filas.reduce((s, f) => s + f.pendiente, 0),
    facturado: filas.reduce((s, f) => s + f.facturado, 0),
    cobrado: filas.reduce((s, f) => s + f.cobrado, 0),
    devuelto: filas.reduce((s, f) => s + f.devuelto, 0),
    hayEstimado,
  };
  return { filas, resumen };
}

// ---- Avisos por hito facturable (bocado 2) ----
//
// El plan de hitos se arma en el ALTA del encargo; cada hito lleva su DISPARADOR.
// Un hito "pendiente" cuyo disparador YA ocurrio = FACTURABLE AHORA. La mayoria de
// disparadores ya son datos en la app -> aviso automatico:
//   firma/encargo -> a la firma de la hoja (facturable desde el alta)
//   entrega        -> proyecto entregado (revision de Daniel = ok)
//   licencia       -> licencia aprobada
//   cfo            -> obra finalizada / CFO visado
//   concesion      -> subvencion concedida (AUN sin fuente -> confirmacion manual)

// El disparador se resuelve contra el PROYECTO de cada linea (linea -> concepto_hoja
// -> proyecto), no contra la comunidad. Para el dato heredado esa FK esta vacia, asi
// que solo resuelven los futuros; los de 'firma' no necesitan proyecto (facturable
// desde el alta).
const DISPARADOR_INMEDIATO = new Set(["firma", "encargo"]);

type EstadoProyecto = { entrega: boolean; licencia: boolean; cfo: boolean };

/** Estado (entrega/licencia/cfo) de cada proyecto, por id. */
async function estadoProyectos(filtroComunidad?: string): Promise<Map<string, EstadoProyecto>> {
  const f = filtroComunidad ? `&comunidad_id=eq.${filtroComunidad}` : "";
  const proy = await rest<{ id: string; revision_estado: string | null; licencias: { estado: string }[]; obras: { estado: string; cfo_estado: string | null }[] }[]>(
    `proyectos?select=id,revision_estado,licencias(estado),obras(estado,cfo_estado)${f}&limit=5000`,
  );
  const m = new Map<string, EstadoProyecto>();
  for (const p of proy) {
    m.set(p.id, {
      entrega: p.revision_estado === "ok",
      licencia: (p.licencias ?? []).some((l) => l.estado === "aprobada"),
      cfo: (p.obras ?? []).some((o) => o.estado === "finalizada" || o.cfo_estado === "visado"),
    });
  }
  return m;
}

/** ¿El disparador de un hito ya se cumplio, dado el proyecto de su linea? */
function disparadorCumplido(disp: string, proyectoId: string | null, estados: Map<string, EstadoProyecto>): boolean {
  if (DISPARADOR_INMEDIATO.has(disp)) return true; // a la firma: facturable desde el alta
  if (!proyectoId) return false; // sin proyecto vinculado no se puede resolver
  const e = estados.get(proyectoId);
  if (!e) return false;
  if (disp === "entrega") return e.entrega;
  if (disp === "licencia") return e.licencia;
  if (disp === "cfo") return e.cfo;
  return false; // concesion / otro -> manual
}

type LineaAviso = {
  concepto_hoja_id: string | null;
  conceptos_hoja: { proyecto_id: string | null } | null;
  hitos_cobro: { id: string; hito: string; importe: number | null; estado: string }[];
  hojas_encargo: { comunidad_id: string; comunidades: { nombre: string; municipio: string | null } | null };
};

export type AvisoFacturable = {
  hitoId: string;
  disparador: string;
  importe: number | null;
  comunidadId: string;
  comunidadNombre: string;
  municipio: string | null;
};

/** Hitos pendientes cuyo disparador YA se cumplio -> facturables ahora (ambito Accesalia). */
export async function avisosFacturables(): Promise<{
  avisos: AvisoFacturable[];
  porDisparador: Record<string, number>;
  importeTotal: number;
}> {
  const [lineas, estados] = await Promise.all([
    rest<LineaAviso[]>(
      "lineas_facturacion?select=concepto_hoja_id,conceptos_hoja(proyecto_id)," +
        "hitos_cobro(id,hito,importe,estado)," +
        "hojas_encargo!inner(comunidad_id,comunidades(nombre,municipio))" +
        `&${FILTRO_ACCESALIA}&limit=5000`,
    ),
    estadoProyectos(),
  ]);

  const avisos: AvisoFacturable[] = [];
  const porDisparador: Record<string, number> = {};
  let importeTotal = 0;
  for (const l of lineas) {
    const proyectoId = l.conceptos_hoja?.proyecto_id ?? null;
    const h = l.hojas_encargo;
    for (const hc of l.hitos_cobro ?? []) {
      if (hc.estado !== "pendiente") continue;
      if (!disparadorCumplido(hc.hito, proyectoId, estados)) continue;
      avisos.push({
        hitoId: hc.id, disparador: hc.hito, importe: hc.importe,
        comunidadId: h.comunidad_id,
        comunidadNombre: h.comunidades?.nombre ?? "—",
        municipio: h.comunidades?.municipio ?? null,
      });
      porDisparador[hc.hito] = (porDisparador[hc.hito] ?? 0) + 1;
      importeTotal += hc.importe ?? 0;
    }
  }
  avisos.sort((a, b) => a.comunidadNombre.localeCompare(b.comunidadNombre, "es"));
  return { avisos, porDisparador, importeTotal };
}

/** Ids de hitos facturables ahora en una comunidad (para el badge de la pantalla), resuelto por proyecto. */
export async function hitosFacturablesDeComunidad(comunidadId: string): Promise<Set<string>> {
  const [lineas, estados] = await Promise.all([
    rest<LineaAviso[]>(
      "lineas_facturacion?select=concepto_hoja_id,conceptos_hoja(proyecto_id)," +
        "hitos_cobro(id,hito,importe,estado),hojas_encargo!inner(comunidad_id)" +
        `&${FILTRO_ACCESALIA}&hojas_encargo.comunidad_id=eq.${comunidadId}&limit=2000`,
    ),
    estadoProyectos(comunidadId),
  ]);
  const set = new Set<string>();
  for (const l of lineas) {
    const proyectoId = l.conceptos_hoja?.proyecto_id ?? null;
    for (const hc of l.hitos_cobro ?? []) {
      if (hc.estado === "pendiente" && disparadorCumplido(hc.hito, proyectoId, estados)) set.add(hc.id);
    }
  }
  return set;
}
