import "server-only";
// lib/portalDocumentacion.ts
//
// LA DOCUMENTACION DEL PORTAL, UNA VENTANITA POR PAPEL (Monica, 21-oct-2026).
// Calcada del area de hipotecas del Sabadell (docs/figma/portal-comunidad.html).
//
// Lo que manda:
//   - Las ventanitas son DE LA COMUNIDAD, no de cada persona: todos sus
//     autorizados ven el ESTADO de cada papel, el nombre del fichero, quien lo
//     subio y cuando. NADIE de fuera de Accesalia puede abrirlo ni descargarlo.
//   - Los cuatro estados (suyos): pendiente / recibido · en revision /
//     revisado · todo ok / revisado · rechazado (con el motivo).
//   - Solo los papeles que YA usamos; la pantalla crece cuando haga falta otro:
//       la comunidad: tarjeta del CIF, DNI y acta de nombramiento del
//       presidente, certificado de titularidad de la cuenta;
//       cada expediente (opp): hoja de encargo firmada y acta de votacion.

import { fichaComunidad, type Ficha, type Papel } from "./fichaComunidad";
import type { ClavePortal } from "./portal";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

export type Estado = "pendiente" | "revision" | "ok" | "rechazado";

export type Caja = {
  /** Lo que se sube: un papel, una hoja firmada o «otro». */
  clave: ClavePortal | "hoja_firmada" | "otro";
  titulo: string;
  explicacion: string | null;
  estado: Estado;
  /** El fichero, sin abrirlo: nombre, quien y cuando. */
  fichero: string | null;
  quien: string | null;
  cuando: string | null;
  motivo: string | null;
  hojaId: string | null;
  oportunidadId: string | null;
};

/** LO QUE HABEIS CONTRATADO (Monica, 21-oct-2026): la semilla de «Mi
 *  expediente». Cada hoja firmada que paga la comunidad, con su fecha y lo que
 *  incluye; sin el PDF, que no se abre desde fuera. */
export type Contratado = {
  hojaId: string; numero: string | null; firma: string | null; lineas: { que: string; importe: number | null }[]; total: number;
  /** La version con su PDF firmado: LA COMUNIDAD SI PUEDE VERLA (21-oct-2026),
   *  es el papel que ella misma firmo. Es la unica excepcion. */
  versionId: string | null;
};

/** LAS ETAPAS DEL EXPEDIENTE (Monica, 21-oct-2026), como en el Sabadell: salen de
 *  lo firmado (los hitos de sus lineas). Hecha = su hito esta «completado», que
 *  hoy quiere decir facturado o cobrado. */
export type Etapa = { clave: string; nombre: string; hecha: boolean };

export type Expediente = { id: string; nombre: string; codigo: string | null; cajas: Caja[]; contratado: Contratado[]; etapas: Etapa[] };

// El orden de las etapas y como se dicen a la comunidad.
const ETAPAS: { hitos: string[]; nombre: string }[] = [
  { hitos: ["firma", "encargo"], nombre: "Hoja de encargo firmada" },
  { hitos: ["entrega"], nombre: "Entrega del proyecto" },
  { hitos: ["presentacion"], nombre: "Subvención presentada" },
  { hitos: ["licencia"], nombre: "Licencia concedida" },
  { hitos: ["concesion"], nombre: "Subvención concedida" },
  { hitos: ["adjudicacion"], nombre: "Obra adjudicada" },
  { hitos: ["pss"], nombre: "Plan de seguridad firmado" },
  { hitos: ["inicio_obra"], nombre: "Inicio de obra" },
  { hitos: ["cfo"], nombre: "Certificado final de obra" },
];

async function hitosDe(hojaIds: string[]): Promise<{ hoja: string; hito: string; estado: string }[]> {
  if (!hojaIds.length) return [];
  // Hojas nuevas (dia de la migracion): la hoja es la version; sus fichas de facturacion, de la vista, y sus hitos.
  const cab = { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" as const };
  const rf = await fetch(`${URL_BASE}/rest/v1/facturacion_lineas?select=id,hoja_id&hoja_id=in.(${hojaIds.join(",")})&quitada_en=is.null`, cab);
  if (!rf.ok) throw new Error(`facturacion_lineas ${rf.status}`);
  const fichas = (await rf.json()) as { id: string; hoja_id: string }[];
  if (!fichas.length) return [];
  const hojaDe = new Map(fichas.map((f) => [f.id, f.hoja_id]));
  const r = await fetch(`${URL_BASE}/rest/v1/hitos_cobro?select=hito,estado,linea_facturacion_id&linea_facturacion_id=in.(${fichas.map((f) => f.id).join(",")})&estado=neq.anulado`, cab);
  if (!r.ok) throw new Error(`hitos_cobro ${r.status}`);
  return ((await r.json()) as { hito: string; estado: string; linea_facturacion_id: string }[]).map((x) => ({ hoja: hojaDe.get(x.linea_facturacion_id)!, hito: x.hito, estado: x.estado }));
}

export type Documentacion = {
  ficha: Ficha;
  comunidad: Caja[];
  expedientes: Expediente[];
  pendientes: number;
};

type Recibido = {
  id: string; tipo: string; hoja_encargo_id: string | null; oportunidad_id: string | null; nombre_fichero: string | null;
  subido_por_nombre: string | null; estado: "por_revisar" | "aceptado" | "rechazado"; motivo_rechazo: string | null; creado_en: string;
};

async function recibidosDe(comunidadId: string): Promise<Recibido[]> {
  const r = await fetch(
    `${URL_BASE}/rest/v1/portal_recibidos?select=id,tipo,hoja_encargo_id,oportunidad_id,nombre_fichero,subido_por_nombre,estado,motivo_rechazo,creado_en` +
      `&comunidad_id=eq.${comunidadId}&order=creado_en.desc`,
    { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`portal_recibidos ${r.status}`);
  return (await r.json()) as Recibido[];
}

/** El estado de una ventanita: lo ultimo que paso con ella. Si lo ultimo subido
 *  esta por revisar, en revision; si se rechazo despues del ultimo bueno,
 *  rechazado; si hay uno bueno en el archivo, todo ok; si no, pendiente. */
function estadoDe(bueno: { creado: string } | null, recs: Recibido[]): Pick<Caja, "estado" | "fichero" | "quien" | "cuando" | "motivo"> {
  const ultimo = recs[0] ?? null;
  const base = { fichero: ultimo?.nombre_fichero ?? null, quien: ultimo ? (ultimo.subido_por_nombre ?? "la comunidad") : null, cuando: ultimo?.creado_en ?? null, motivo: null };
  if (ultimo?.estado === "por_revisar") return { estado: "revision", ...base };
  if (ultimo?.estado === "rechazado" && (!bueno || ultimo.creado_en > bueno.creado)) return { estado: "rechazado", ...base, motivo: ultimo.motivo_rechazo };
  if (bueno) {
    const suyo = recs.find((r) => r.estado === "aceptado");
    return suyo
      ? { estado: "ok", fichero: suyo.nombre_fichero, quien: suyo.subido_por_nombre ?? "la comunidad", cuando: suyo.creado_en, motivo: null }
      : { estado: "ok", fichero: "en nuestro archivo", quien: null, cuando: null, motivo: null };
  }
  return { estado: "pendiente", fichero: null, quien: null, cuando: null, motivo: null };
}

const PAPELES_COMUNIDAD: { clave: ClavePortal; titulo: string; explicacion: string }[] = [
  { clave: "tarjeta", titulo: "Tarjeta del CIF", explicacion: "la de la comunidad" },
  { clave: "dni", titulo: "DNI del presidente", explicacion: "por las dos caras" },
  { clave: "acta", titulo: "Acta de nombramiento del presidente", explicacion: "la de la última junta" },
  { clave: "certificado", titulo: "Certificado de titularidad de la cuenta", explicacion: "del banco, reciente" },
];

export async function documentacionDe(comunidadId: string): Promise<Documentacion | null> {
  const [ficha, recs] = await Promise.all([fichaComunidad(comunidadId), recibidosDe(comunidadId).catch(() => [] as Recibido[])]);
  if (!ficha) return null;
  const firmadas = ficha.opps.flatMap((o) => o.hojas.filter((h) => h.estado === "devuelta_firmada").map((h) => h.id));
  const hitos = await hitosDe(firmadas).catch(() => []);

  const pres = ficha.presidentes[0] ?? null;
  const bueno: Record<ClavePortal, Papel> = {
    tarjeta: ficha.tarjeta,
    dni: pres?.dni ?? ficha.dniSuelto,
    acta: pres?.acta ?? ficha.actaSuelta,
    certificado: ficha.certificado,
    votacion: null,
  };
  const vacia = { hojaId: null, oportunidadId: null };

  const comunidad: Caja[] = PAPELES_COMUNIDAD.map((p) => ({
    ...p,
    ...vacia,
    ...estadoDe(bueno[p.clave], recs.filter((r) => r.tipo === p.clave)),
  }));

  // Los expedientes vivos: los abiertos o en pausa.
  const expedientes: Expediente[] = ficha.opps
    .filter((o) => o.estado === "abierta" || o.estado === "pausada")
    .map((o) => {
      const hojas: Caja[] = o.hojas
        .filter((h) => h.pagador === "comunidad" && (h.estado === "enviada_comunidad" || h.estado === "devuelta_firmada"))
        .map((h) => ({
          clave: "hoja_firmada" as const,
          titulo: `Hoja de encargo ${h.numero ?? ""}`.trim(),
          explicacion: "firmada, la que os enviamos",
          hojaId: h.id,
          oportunidadId: o.id,
          ...estadoDe(h.estado === "devuelta_firmada" ? { creado: "0000" } : null, recs.filter((r) => r.tipo === "hoja_firmada" && r.hoja_encargo_id === h.id)),
        }));
      const votacion: Caja = {
        clave: "votacion",
        titulo: "Acta de votación",
        explicacion: "la de la junta que aprueba la obra",
        hojaId: null,
        oportunidadId: o.id,
        ...estadoDe(o.votacion, recs.filter((r) => r.tipo === "votacion" && r.oportunidad_id === o.id)),
      };
      const contratado: Contratado[] = o.hojas
        .filter((h) => h.pagador === "comunidad" && h.estado === "devuelta_firmada")
        .map((h) => ({
          hojaId: h.id,
          numero: h.numero,
          firma: h.firma,
          lineas: h.lineas,
          total: h.total,
          // LA NOTA DE RESPONSABILIDAD funciona EXACTAMENTE igual que cualquier hoja
          // de encargo, con UNA unica excepcion: no hay enlace para verla (Monica,
          // 21-oct-2026). Es lo unico que cambia.
          versionId: h.tipoDocumento === "nota_responsabilidad" ? null : (h.firmada?.versionId ?? null),
        }));
      // las etapas: las de los hitos de lo firmado (de cualquier pagador), en su orden
      const suyas = new Set(o.hojas.filter((h) => h.estado === "devuelta_firmada").map((h) => h.id));
      const mios = hitos.filter((x) => suyas.has(x.hoja));
      const etapas: Etapa[] = suyas.size
        ? ETAPAS.filter((e, i) => i === 0 || mios.some((x) => e.hitos.includes(x.hito))).map((e, i) => ({
            clave: e.hitos[0],
            nombre: e.nombre,
            hecha: i === 0 || mios.some((x) => e.hitos.includes(x.hito) && x.estado === "completado"),
          }))
        : [];
      return { id: o.id, nombre: o.nombre, codigo: o.codigo, cajas: [...hojas, votacion], contratado, etapas };
    });

  const todas = [...comunidad, ...expedientes.flatMap((e) => e.cajas)];
  return { ficha, comunidad, expedientes, pendientes: todas.filter((c) => c.estado === "pendiente" || c.estado === "rechazado").length };
}

/** El PDF firmado de una hoja de ESTA comunidad, para enseñarselo a ella: solo
 *  si es una hoja firmada que paga la comunidad, de uno de sus expedientes. */
export async function hojaFirmadaParaLaComunidad(comunidadId: string, hojaId: string): Promise<{ hojaId: string; versionId: string } | null> {
  const doc = await documentacionDe(comunidadId);
  const h = doc?.expedientes.flatMap((e) => e.contratado).find((x) => x.hojaId === hojaId);
  return h?.versionId ? { hojaId: h.hojaId, versionId: h.versionId } : null;
}
