// lib/bloquesDecisionCierre.ts
//
// LOS BLOQUES 3 Y 4 DE UNA OPORTUNIDAD, EN CRUDO (Monica, 15-oct-2026): "prefiero
// verlos ahi y cambiarlos desde ahi, no me importa que esten feos, o que no esten
// aun con la fontaneria conectada, pero quiero ver que campos tienen, para saber
// si existen".
//
// Solo lee. Junta lo que ya vive en su sitio: las revisiones de la oferta, las
// hojas firmadas con su version, los hitos de cobro de esas hojas, los cierres y
// los recordatorios. Las juntas ya vienen en gestionOportunidad.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const leer = async <T>(path: string): Promise<T> => {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
};

export type RevisionOferta = { numero: number; estado: string; enviada_en: string | null; nota: string | null; comentario: string | null };
export type HojaCierre = {
  id: string;
  numero_hoja: string | null;
  estado: string | null;
  fecha_firma: string | null;
  motivo_sin_firma: string | null;
  version: { numero_version: number; importe_total: number | null } | null;
};
export type HitoCobroCierre = {
  hito: string;
  orden: number | null;
  importe: number | null;
  estado: string | null;
  fecha_factura: string | null;
  fecha_cobro: string | null;
  numero_factura: string | null;
};
export type CierreOpp = { resultado_final: string | null; motivo_perdido: string | null; notas: string | null; fecha_cierre: string | null };
export type Recordatorio = { texto: string; fecha_limite: string | null; estado: string | null };

export type DecisionCierre = {
  revisiones: RevisionOferta[];
  hojas: HojaCierre[];
  cobros: HitoCobroCierre[];
  cierres: CierreOpp[];
  recordatorios: Recordatorio[];
};

export async function decisionCierreDe(id: string): Promise<DecisionCierre> {
  const vacio = <T>() => [] as T[];
  const [revisiones, hojas, cierres, recordatorios] = await Promise.all([
    leer<RevisionOferta[]>(
      `revisiones_oferta?select=numero,estado,enviada_en,nota,comentario&oportunidad_id=eq.${id}&order=numero.asc`,
    ).catch(vacio<RevisionOferta>),
    leer<HojaCierre[]>(
      `hojas_encargo?select=id,numero_hoja,estado,fecha_firma,motivo_sin_firma,version:version_firmada_id(numero_version,importe_total)` +
        `&oportunidad_id=eq.${id}&order=fecha_creacion.asc`,
    ).catch(vacio<HojaCierre>),
    leer<CierreOpp[]>(
      `motivo_cierre_oportunidad?select=resultado_final,motivo_perdido,notas,fecha_cierre&oportunidad_id=eq.${id}&order=creado_en.desc`,
    ).catch(vacio<CierreOpp>),
    leer<Recordatorio[]>(
      `tareas_seguimiento?select=texto,fecha_limite,estado&oportunidad_id=eq.${id}&order=fecha_limite.asc.nullslast`,
    ).catch(vacio<Recordatorio>),
  ]);
  const firmadas = hojas.filter((h) => h.fecha_firma).map((h) => h.id);
  const cobros = firmadas.length
    ? await leer<{ hitos: HitoCobroCierre[] }[]>(
        `lineas_facturacion?select=hitos:hitos_cobro(hito,orden,importe,estado,fecha_factura,fecha_cobro,numero_factura)` +
          `&hoja_encargo_id=in.(${firmadas.join(",")})&quitada_en=is.null`,
      )
        .then((ls) => ls.flatMap((l) => l.hitos).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)))
        .catch(vacio<HitoCobroCierre>)
    : [];
  return { revisiones, hojas, cobros, cierres, recordatorios };
}
