import "server-only";
// lib/lineasDeHoja.ts
//
// AL FIRMARSE UNA HOJA, NACEN SUS LINEAS DE COBRO (Monica, 12-oct-2026). Hasta
// hoy ninguna hoja nueva las tenia: las que hay salieron de volcados (8-12 oct).
// Salen de la VERSION FIRMADA, que guarda sus conceptos:
//   - cada concepto que SE COBRA y no va dentro de un conjunto -> una linea,
//     con su importe y su forma de pago; el proyecto conjunto es una linea y sus
//     piezas no se cobran aparte;
//   - la forma de pago (texto) -> sus hitos. Las del generador se reconocen; lo
//     que no, queda en un hito "otro" con aviso para revisarlo a mano;
//   - un concepto A EXITO (Subvenciones: 3% de lo concedido, 14-oct-2026) -> una
//     linea a porcentaje, sin importe, con el hito que dice su bloque;
//   - los 3 PRESUPUESTOS (vayan como vayan, tambien en "no aparece") -> su linea de
//     Ecobalance: el % del PEM de parametros_economicos, a exito, hito
//     "adjudicacion" (si gana nuestra contrata).
// Si la hoja ya tiene lineas, no hace nada: no duplica.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (r.status === 204 ? null : await r.json()) as T;
}

type HitoNuevo = { hito: string; porcentaje: number | null; importe: number | null; notas: string | null };

// El momento de cobro, por su texto. El orden importa: "firma del Plan de
// Seguridad" es el PSS, no la firma.
const MOMENTOS: [RegExp, string][] = [
  [/seguridad y salud|\bpss\b/i, "pss"],
  [/contrataci[oó]n|encargo|provisi[oó]n de fondos|a la aceptaci[oó]n/i, "encargo"],
  [/entrega/i, "entrega"],
  [/licencia|declaraci[oó]n responsable/i, "licencia"],
  [/inicio de (la )?obra|inicio de las obras/i, "inicio_obra"],
  [/\bcfo\b|fin(al)? de (la )?obra/i, "cfo"],
  [/presentaci[oó]n/i, "presentacion"],
  [/concesi[oó]n|concedido/i, "concesion"],
  [/adjudicaci[oó]n/i, "adjudicacion"],
  [/firma/i, "firma"],
];
const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

/** "50% a la contratación · 50% a la entrega del Proyecto" -> sus hitos. */
export function hitosDeFormaDePago(texto: string | null, importe: number | null): HitoNuevo[] {
  const t = (texto ?? "").trim();
  const sinReconocer = (): HitoNuevo[] => [
    { hito: "otro", porcentaje: 100, importe, notas: t ? `Forma de pago sin reconocer: «${t}». Revisar el hito.` : "La hoja no dice la forma de pago. Revisar el hito." },
  ];
  if (!t) return sinReconocer();
  const partes = t.split(/\s*[·;+]\s*|\s+y\s+(?=\d)/).filter(Boolean);
  const hitos: HitoNuevo[] = [];
  for (const p of partes) {
    const momento = MOMENTOS.find(([re]) => re.test(p))?.[1];
    const pct = p.match(/(\d+(?:[.,]\d+)?)\s*%/);
    const eur = p.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)\s*(?:€|euros?)/i);
    if (!momento || (!pct && !eur)) return sinReconocer();
    if (/conced/i.test(p) && pct) {
      // "3% de lo concedido a la concesion": a exito, sin importe fijo.
      hitos.push({ hito: "concesion", porcentaje: num(pct[1]), importe: null, notas: "A éxito: sobre lo concedido." });
    } else if (eur) {
      const e = num(eur[1]);
      hitos.push({ hito: momento, porcentaje: importe ? Math.round((e / importe) * 10000) / 100 : null, importe: e, notas: null });
    } else {
      const q = num(pct![1]);
      hitos.push({ hito: momento, porcentaje: q, importe: importe != null ? Math.round(importe * q) / 100 : null, notas: null });
    }
  }
  return hitos.length ? hitos : sinReconocer();
}

/** Crea las lineas e hitos de una hoja a partir de su version firmada. Devuelve cuantas lineas creo. */
export async function crearLineasDeHoja(hojaId: string): Promise<number> {
  const [h] = await pedir<{ id: string; emisor: string | null; version_firmada_id: string | null }[]>(
    `hojas_encargo?select=id,emisor,version_firmada_id&id=eq.${hojaId}`,
  );
  if (!h?.version_firmada_id) return 0;
  const ya = await pedir<{ id: string }[]>(`lineas_facturacion?select=id&hoja_encargo_id=eq.${hojaId}&limit=1`);
  if (ya.length) return 0;

  const [conceptos, [tres], [pct]] = await Promise.all([
    pedir<{
      id: string; bloque_id: string | null; descripcion: string | null; importe: number | null; porcentaje: number | null; desglose: string | null;
      forma_pago: string | null; incluido_en_concepto_id: string | null; bloque: { base_exito: string | null; hito_exito: string | null } | null;
    }[]>(
      `conceptos_hoja?select=id,bloque_id,descripcion,importe,porcentaje,desglose,forma_pago,incluido_en_concepto_id,bloque:bloque_id(base_exito,hito_exito)` +
        `&version_hoja_id=eq.${h.version_firmada_id}&order=creado_en.asc`,
    ),
    pedir<{ id: string }[]>(`bloques?select=id&nombre=eq.${encodeURIComponent("SOLICITUD Y ANÁLISIS DE PRESUPUESTOS")}`),
    pedir<{ valor: number }[]>("parametros_economicos?select=valor&clave=eq.tres_presupuestos_pct"),
  ]);
  const emisor = h.emisor === "daniel_autonomo" ? "daniel_autonomo" : "accesalia";
  let n = 0;

  const crearLinea = async (linea: Record<string, unknown>, hitos: HitoNuevo[]) => {
    const [l] = await pedir<{ id: string }[]>("lineas_facturacion", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ hoja_encargo_id: hojaId, origen: "app", verificado: false, ...linea }),
    });
    await pedir("hitos_cobro", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(hitos.map((x, i) => ({ linea_facturacion_id: l.id, orden: i + 1, estado: "pendiente", ...x }))),
    });
    n++;
  };

  // Lo que se cobra: cada concepto suelto que se cobra (el conjunto incluido).
  for (const c of conceptos.filter((k) => k.desglose === "se_cobra" && !k.incluido_en_concepto_id)) {
    // A exito: el % y el hito los dice su bloque, no el texto de la forma de pago.
    if (c.porcentaje != null && c.bloque?.hito_exito) {
      const pct = Number(c.porcentaje);
      const sobre = c.bloque.base_exito ?? "la base";
      await crearLinea(
        { concepto_hoja_id: c.id, bloque_id: c.bloque_id, descripcion: c.descripcion, importe: null, es_porcentaje: true, porcentaje: pct, base_porcentaje: sobre, emisor },
        [{ hito: c.bloque.hito_exito, porcentaje: 100, importe: null, notas: `A éxito: ${pct.toLocaleString("es-ES")} % sobre ${sobre}.` }],
      );
      continue;
    }
    const importe = c.importe == null ? null : Number(c.importe);
    await crearLinea(
      { concepto_hoja_id: c.id, bloque_id: c.bloque_id, descripcion: c.descripcion, importe, es_porcentaje: false, emisor },
      hitosDeFormaDePago(c.forma_pago, importe),
    );
  }

  // Los 3 presupuestos, vayan como vayan: Ecobalance, a exito. Tambien en "no
  // aparece", que es su posicion por defecto (hasta el 14-oct-2026 se saltaba).
  // El comercial no ve este cobro: no esta en el bloque sino en los parametros.
  const tresPp = tres ? conceptos.find((k) => k.bloque_id === tres.id) : undefined;
  if (tresPp && pct) {
    await crearLinea(
      {
        concepto_hoja_id: tresPp.id,
        bloque_id: tres.id,
        descripcion: `3 presupuestos: ${Number(pct.valor).toLocaleString("es-ES")} % del PEM del presupuesto firmado con la contrata que presentamos, a éxito (si gana)`,
        importe: null,
        es_porcentaje: true,
        porcentaje: pct.valor,
        base_porcentaje: "PEM (presupuesto firmado con nuestra contrata)",
        emisor: "ecobalance",
      },
      [{ hito: "adjudicacion", porcentaje: 100, importe: null, notas: "A éxito: cuando la obra se adjudique a la contrata que presentamos." }],
    );
  }
  return n;
}
