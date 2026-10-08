// lib/viabilidadComercial.ts
//
// LA VIABILIDAD, PARTE DEL COMERCIAL (Monica, 6-oct-2026): la plantilla del
// 3-oct (docs/figma/viabilidad.html) hecha pantalla, con la tabla de costes del
// 6-oct.
//
// "Uno hace la viabilidad y otro la remata." Alex escribe el texto y estima la
// obra en la mesa (lib/mesaViabilidades.ts); el comercial la recibe, retoca el
// texto si quiere, pone las tasas y la genera. Los HONORARIOS no se teclean:
// salen de las hojas de encargo de la oportunidad, "para que CUADRE siempre".
// La hoja desglosa; la viabilidad agrupa: del proyecto conjunto solo sale su
// linea, con la suma.
//
// Y todo el dinero acaba en UN total con IVA: "que un vecino pueda decir: son
// 789.000, somos 20, tocamos a 39.450".

import "server-only";
import { exigirCompleta } from "./completa";
import { mesa } from "./mesaViabilidades";
import { anexoDeOportunidad } from "./anexoEdificio";
import { pdfDeViabilidad } from "./pdf/ViabilidadDoc";
import type { Yo } from "./sesion";
import { loQueFalta } from "./viabilidadReglas";

export { loQueFalta };

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "documentos-comerciales";

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
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const redondeo = (n: number) => Math.round(n * 100) / 100;

// ------------------------------------------------------------------ tipos

export type LineaHonorario = { rotulo: string; detalle: string; base: number; ivaPct: number; total: number };
export type LineaObra = { concepto: string; pem: number; biPct: number; ivaPct: number; sinIva: number; total: number };
export type LineaTasa = { concepto: string; importe: number | null };
export type HojaUsada = { versionId: string; codigo: string | null; version: number; fecha: string | null; borrador: boolean };

export type DocViabilidad = {
  id: string;
  oppId: string;
  comunidadId: string | null;
  numero: string | null;
  version: number;
  /** Ya se genero alguna vez: hay PDF. */
  generada: boolean;
  /** "Modificada en hoja de encargo HE-2026-0142 v2": la dejo atras una hoja. */
  superadaPor: string | null;
  rematada: { quien: string | null; cuando: string } | null;
  /** Alex le dio a "enviar al comercial": su parte esta hecha. */
  alexTermino: boolean;
  redacta: string | null;
  proyecto: string;
  ubicacion: string;
  arquitecto: string;
  /** Quien firma: el nombre solo, para el pie. */
  firmante: string;
  fechaVisita: string | null;
  capturaUrl: string | null;
  objeto: string;
  descripcion: string;
  conclusion: string;
  escaleras: { accesoId: string; nombre: string; texto: string }[];
  obra: LineaObra[];
  pem: number;
  tasas: LineaTasa[];
  conHonorarios: boolean;
  honorarios: LineaHonorario[];
  hojas: HojaUsada[];
  total: number;
  clausulas: { titulo: string | null; texto: string }[];
};

// ------------------------------------------------------- los honorarios

const ES_SUBVENCION = /^TRAMITACION SUBVENCIONES/;

/** Las lineas de honorarios, de las hojas vivas de la oportunidad: de cada una,
 *  su ultima version, y de ella lo que se cobra. El proyecto conjunto va como
 *  UNA linea; lo que va dentro de el no se repite. */
async function honorariosDe(oppId: string): Promise<{ lineas: LineaHonorario[]; hojas: HojaUsada[] }> {
  const hojas = await leer<{
    id: string;
    numero_hoja: string | null;
    versiones: { id: string; numero_version: number; fecha_generada: string | null; url_pdf_hoja: string | null; iva_porcentaje: number | null }[];
    conceptos: { version_hoja_id: string | null; importe: number | null; incluido: boolean; desglose: string | null; descripcion: string | null;
                 incluido_en_concepto_id: string | null; id: string; bloque: { codigo: string; nombre_corto: string | null; nombre: string } | null }[];
  }[]>(
    `hojas_encargo?select=id,numero_hoja,` +
      `versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,fecha_generada,url_pdf_hoja,iva_porcentaje),` +
      `conceptos:conceptos_hoja(id,version_hoja_id,importe,incluido,desglose,descripcion,incluido_en_concepto_id,bloque:bloque_id(codigo,nombre_corto,nombre))` +
      `&oportunidad_id=eq.${oppId}&estado=neq.anulada&order=fecha_creacion.asc,creado_en.asc`,
  );
  const lineas: LineaHonorario[] = [];
  const usadas: HojaUsada[] = [];
  for (const h of hojas) {
    const ultima = [...h.versiones].sort((a, b) => a.numero_version - b.numero_version).at(-1);
    if (!ultima) continue;
    const suyos = h.conceptos.filter((k) => k.version_hoja_id === ultima.id && k.incluido);
    const cobra = suyos.filter((k) => !k.incluido_en_concepto_id && (k.desglose ?? "se_cobra") === "se_cobra" && Number(k.importe) > 0);
    if (!cobra.length) continue;
    const iva = ultima.iva_porcentaje == null ? 21 : Number(ultima.iva_porcentaje);
    for (const k of cobra) {
      const conjunto = !k.bloque;
      const subvencion = !!k.bloque && ES_SUBVENCION.test(k.bloque.codigo);
      const base = Number(k.importe);
      lineas.push({
        // A dia de hoy la de subvenciones se rotula "documentacion tecnica"
        // (Monica, 6-oct-2026): es lo que de verdad se factura.
        rotulo: conjunto ? "Proyecto conjunto" : subvencion ? "Documentación técnica" : k.bloque!.nombre_corto ?? k.bloque!.nombre,
        detalle:
          (k.descripcion ?? "").trim() ||
          (subvencion ? "Documentación técnica asociada a la tramitación de subvenciones" : ""),
        base,
        ivaPct: iva,
        total: redondeo(base * (1 + iva / 100)),
      });
    }
    usadas.push({ versionId: ultima.id, codigo: h.numero_hoja, version: ultima.numero_version, fecha: ultima.fecha_generada, borrador: !ultima.url_pdf_hoja });
  }
  return { lineas, hojas: usadas };
}

// ------------------------------------------------------------ el documento

export async function docViabilidad(id: string): Promise<DocViabilidad | null> {
  const m = await mesa(id);
  if (!m?.opp) return null;
  const [v] = await leer<{
    numero: string | null; version: number; url_pdf: string | null; con_honorarios: boolean; enviada_en: string | null;
    rematada_en: string | null; remata: { nombre: string } | null;
    arquitecto: { nombre: string; numero_colegiado: string | null } | null;
    oportunidad: { comunidad_id: string | null } | null;
    superada: { numero_version: number; hoja: { numero_hoja: string | null } | null } | null;
  }[]>(
    `viabilidades?select=numero,version,url_pdf,con_honorarios,enviada_en,rematada_en,remata:remata_id(nombre),` +
      `arquitecto:arquitecto_id(nombre,numero_colegiado),oportunidad:oportunidad_id(comunidad_id),` +
      `superada:superada_por_version_id(numero_version,hoja:hoja_encargo_id(numero_hoja))&id=eq.${id}`,
  );
  if (!v) return null;
  const firma = v.arquitecto ?? (await titular());

  const [{ lineas: honorarios, hojas }, clausulas] = await Promise.all([
    honorariosDe(m.opp.id),
    leer<{ titulo: string | null; texto: string }[]>("clausulas_documento?select=titulo,texto&documento=eq.viabilidad&activo=is.true&order=orden.asc"),
  ]);

  const obra: LineaObra[] = m.lineas
    .filter((l) => l.grupo === "obra" && l.importe)
    .map((l) => {
      const sinIva = redondeo(l.importe! * (1 + l.biPct / 100));
      return { concepto: l.concepto, pem: l.importe!, biPct: l.biPct, ivaPct: l.ivaPct, sinIva, total: redondeo(sinIva * (1 + l.ivaPct / 100)) };
    });
  const tasas = m.lineas.filter((l) => l.grupo === "tasas").map((l) => ({ concepto: l.concepto, importe: l.importe }));
  const con = v.con_honorarios;
  const total = redondeo(
    obra.reduce((s, l) => s + l.total, 0) +
      tasas.reduce((s, l) => s + (l.importe ?? 0), 0) +
      (con ? honorarios.reduce((s, l) => s + l.total, 0) : 0),
  );

  return {
    id,
    oppId: m.opp.id,
    comunidadId: v.oportunidad?.comunidad_id ?? null,
    numero: v.numero,
    version: v.version,
    generada: !!v.url_pdf,
    superadaPor: v.superada ? `${v.superada.hoja?.numero_hoja ?? "una hoja posterior"} v${v.superada.numero_version}` : null,
    rematada: v.rematada_en ? { quien: v.remata?.nombre ?? null, cuando: v.rematada_en } : null,
    alexTermino: !!v.enviada_en,
    redacta: m.papeles.redacta,
    proyecto: m.opp.proyecto ?? "",
    ubicacion: m.direccion,
    // "24.103 (COAM)" en la base; en el documento, "(24.103 COAM)".
    arquitecto: firma ? `${firma.nombre}${firma.numero_colegiado ? ` (${firma.numero_colegiado.replace(/[()]/g, "").trim()})` : ""}` : "",
    firmante: firma?.nombre ?? "",
    fechaVisita: m.fechaVisita,
    capturaUrl: m.capturaUrl,
    objeto: m.objeto,
    descripcion: m.descripcion,
    conclusion: m.conclusion,
    escaleras: m.escaleras,
    obra,
    pem: obra.reduce((s, l) => s + l.pem, 0),
    tasas,
    conHonorarios: con,
    honorarios,
    hojas,
    total,
    clausulas,
  };
}

/** Quien firma si la viabilidad aun no lo dice: el titular del estudio. */
async function titular(): Promise<{ id?: string; nombre: string; numero_colegiado: string | null } | null> {
  const [t] = await leer<{ id: string; nombre: string; numero_colegiado: string | null }[]>(
    "tecnicos?select=id,nombre,numero_colegiado&email=eq.daniel@accesalia.com&activo=is.true&limit=1",
  );
  return t ?? null;
}

// ------------------------------------------------------------- guardar

export type DatosComercial = {
  objeto: string;
  descripcion: string;
  conclusion: string;
  escaleras: { accesoId: string; texto: string }[];
  tasas: LineaTasa[];
  conHonorarios: boolean;
};

/** Lo que toca el comercial: el texto, las tasas y si lleva honorarios. Las
 *  lineas de obra son de Alex y no se tocan aqui. */
export async function guardarComercial(id: string, d: DatosComercial): Promise<void> {
  await pedir(`viabilidades?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      objeto: d.objeto.trim() || null,
      descripcion_intervenciones: d.descripcion.trim() || null,
      conclusion: d.conclusion.trim() || null,
      con_honorarios: d.conHonorarios,
      actualizado_en: new Date().toISOString(),
    }),
  });
  await pedir(`viabilidad_conceptos?viabilidad_id=eq.${id}&grupo=eq.tasas`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  const utiles = d.tasas.filter((t) => t.concepto.trim() || t.importe !== null);
  if (utiles.length)
    await pedir("viabilidad_conceptos", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(
        utiles.map((t, n) => ({
          viabilidad_id: id,
          grupo: "tasas",
          concepto: t.concepto.trim() || null,
          importe: t.importe,
          iva_porcentaje: 0,
          seleccionado: true,
          // Detras de las de obra: el orden solo cuenta dentro de su grupo.
          orden: 100 + n,
        })),
      ),
    });
  if (d.escaleras.length)
    await pedir("relacion_viabilidad_accesos?on_conflict=viabilidad_id,acceso_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(d.escaleras.map((e) => ({ viabilidad_id: id, acceso_id: e.accesoId, descripcion: e.texto.trim() || null }))),
    });
}

// ------------------------------------------------------------- generar

/** Genera el documento: le da su codigo VB la primera vez, sube de version si
 *  ya tenia PDF, lo guarda con el anexo detras y apunta de que hojas bebio. */
export async function generarViabilidad(id: string, yo: Yo): Promise<string> {
  const d = await docViabilidad(id);
  if (!d) throw new Error("Esta viabilidad no existe o no tiene oportunidad.");
  const falta = loQueFalta(d);
  if (falta.length) throw new Error(`Falta ${falta.join(", ")}.`);
  // Lo que va HACIA FUERA no sale de una oportunidad a medias (8-oct-2026).
  if (d.oppId) await exigirCompleta(d.oppId, "generar la viabilidad");

  const numero =
    d.numero ??
    ((await (await pedir("rpc/siguiente_codigo", { method: "POST", body: JSON.stringify({ p_tipo: "VB", p_anio: Number(hoy().slice(0, 4)) }) })).json()) as string);
  const version = d.generada ? d.version + 1 : d.version;
  const fecha = hoy();

  const [anexo, captura, firma] = await Promise.all([
    anexoDeOportunidad(d.oppId, { pem: d.pem || null }).catch(() => null),
    d.capturaUrl ? fetch(d.capturaUrl, { cache: "no-store" }).then(async (r) => (r.ok ? Buffer.from(await r.arrayBuffer()) : null)).catch(() => null) : null,
    titular(),
  ]);
  const pdf = await pdfDeViabilidad({ ...d, numero, version }, { fecha, captura, anexo });

  const ruta = `viabilidades/${id}/${numero}-v${version}.pdf`;
  const sube = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: pdf as unknown as BodyInit,
  });
  if (!sube.ok) throw new Error(`No se pudo guardar el PDF: ${sube.status} ${await sube.text()}`);

  await pedir(`viabilidades?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      numero,
      version,
      url_pdf: `almacen:${ALMACEN}/${ruta}`,
      // Lo que cuenta es el ultimo que la genero (Monica, 6-oct): "quien la
      // remato con los precios y el texto". Se pone solo.
      remata_id: yo.id,
      rematada_en: new Date().toISOString(),
      arquitecto_id: firma?.id ?? undefined,
      pem_estimado: d.pem || null,
      vigente: true,
      superada_por_version_id: null,
      superada_en: null,
      actualizado_en: new Date().toISOString(),
    }),
  });

  // De que hojas bebio ESTA version: si mañana sale una hoja nueva de alguna de
  // ellas, la viabilidad se marca sola como superada.
  await pedir(`relacion_viabilidad_hojas?viabilidad_id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (d.conHonorarios && d.hojas.length)
    await pedir("relacion_viabilidad_hojas", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(d.hojas.map((h) => ({ viabilidad_id: id, version_hoja_id: h.versionId }))),
    });
  return numero;
}

/** El PDF guardado, para abrirlo. */
export async function pdfGuardado(id: string): Promise<{ pdf: ArrayBuffer; nombre: string; oppId: string | null } | null> {
  const [v] = await leer<{ url_pdf: string | null; numero: string | null; version: number; oportunidad_id: string | null }[]>(
    `viabilidades?select=url_pdf,numero,version,oportunidad_id&id=eq.${id}`,
  );
  if (!v?.url_pdf?.startsWith("almacen:")) return null;
  const f = await fetch(`${URL_BASE}/storage/v1/object/${v.url_pdf.slice("almacen:".length)}`, { headers: CAB, cache: "no-store" });
  if (!f.ok) return null;
  return { pdf: await f.arrayBuffer(), nombre: `Viabilidad ${v.numero ?? ""} v${v.version}.pdf`, oppId: v.oportunidad_id };
}

/** La viabilidad viva de una oportunidad (la ultima), para el boton de su ficha. */
export async function viabilidadDeOpp(oppId: string): Promise<{ id: string; numero: string | null; version: number; generada: boolean } | null> {
  const [v] = await leer<{ id: string; numero: string | null; version: number; url_pdf: string | null }[]>(
    `viabilidades?select=id,numero,version,url_pdf&oportunidad_id=eq.${oppId}&order=creado_en.desc&limit=1`,
  );
  return v ? { id: v.id, numero: v.numero, version: v.version, generada: !!v.url_pdf } : null;
}

/** De que comunidad es, para el permiso. */
export async function comunidadDeViabilidad(id: string): Promise<string | null> {
  const [v] = await leer<{ oportunidad: { comunidad_id: string | null } | null }[]>(
    `viabilidades?select=oportunidad:oportunidad_id(comunidad_id)&id=eq.${id}`,
  );
  return v?.oportunidad?.comunidad_id ?? null;
}
