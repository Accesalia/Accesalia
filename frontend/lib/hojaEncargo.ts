// lib/hojaEncargo.ts
//
// GENERAR HOJAS DE ENCARGO (Monica, 6-oct-2026), sobre su maqueta aprobada tal
// cual: docs/figma/hoja-de-encargo.html.
//
// Lo que guarda cada cosa (decidido con ella el 2-oct, ver la migracion
// 20261002203454_hoja_de_encargo_generador):
//   hojas_encargo        la hoja: de que oportunidad, a quien va, su estado
//   actuaciones_hoja     el "que + donde" de la cabecera: tipo de proyecto...
//   actuacion_accesos    ...y los accesos concretos donde se hace
//   versiones_hoja       cada vez que se pulsa Generar: la hoja TAL CUAL quedo,
//                        con lo editado a mano. Es la foto: no cambia aunque
//                        mañana se corrija el nombre o el CIF de la comunidad
//   conceptos_hoja       los bloques de ESA version, con la posicion del
//                        interruptor, su importe y su forma de pago
//
// Las hojas antiguas (1.539, importadas) se enseñan igual en la lista: no
// tienen actuaciones ni foto, pero si sus conceptos y sus enlaces de Drive.
//
// "A quien" sale de la comunidad de la oportunidad (nombre y CIF). El CIF no es
// obligatorio: si falta, la casilla sale en blanco y se puede escribir en la
// propia hoja (Monica, 2-oct).

import "server-only";
import { comercialDe, type Yo } from "./sesion";
import type { Desglose } from "./catalogoBloques";
import { limpiarTexto } from "./catalogoBloques";
import { pdfDeHoja } from "./pdf/HojaDoc";

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
async function crear<T>(tabla: string, filas: unknown): Promise<T[]> {
  const r = await pedir(tabla, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(filas) });
  return r.json() as Promise<T[]>;
}
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

// ------------------------------------------------------------------ quien

/** Quien hace hojas: comercial, secretaria comercial y direccion. */
export function puedeHacerHojas(yo: Yo): boolean {
  return yo.veTodo || yo.funciones.some((f) => f.clave === "comercial" || f.clave === "secretaria");
}

/** Direccion y la secretaria comercial ven todas las comunidades; un
 *  comercial, las de su cartera (la propia o la que comparte). */
async function carteraDe(yo: Yo): Promise<string | "todas" | null> {
  if (yo.veTodo || yo.funciones.some((f) => f.clave === "secretaria")) return "todas";
  return (await comercialDe(yo.id))?.id ?? null;
}

// ----------------------------------------------------------- el selector

export type OpcionComunidad = { valor: string; texto: string; pista?: string };

export async function comunidadesParaHoja(yo: Yo): Promise<OpcionComunidad[]> {
  const cartera = await carteraDe(yo);
  if (!cartera) return [];
  const filtro = cartera === "todas" ? "" : `&comercial_id=eq.${cartera}`;
  const opps = await leer<{ comunidad: { id: string; nombre: string; municipio: string | null } | null }[]>(
    `oportunidades?select=comunidad:comunidad_id(id,nombre,municipio)&comunidad_id=not.is.null${filtro}&limit=5000`,
  );
  const vistas = new Map<string, OpcionComunidad>();
  for (const o of opps)
    if (o.comunidad && !vistas.has(o.comunidad.id))
      vistas.set(o.comunidad.id, { valor: o.comunidad.id, texto: o.comunidad.nombre, pista: o.comunidad.municipio ?? undefined });
  return [...vistas.values()].sort((a, b) => a.texto.localeCompare(b.texto, "es"));
}

// --------------------------------------------------------- lo que se pinta

export type Acceso = { id: string; texto: string };
export type Oportunidad = {
  id: string;
  codigo: string | null;
  nombre: string | null;
  estado: string;
  comercial: string | null;
  accesos: Acceso[];
};
export type ConceptoHoja = {
  bloqueId: string | null;
  codigo: string | null;
  nombreCorto: string;
  desglose: Desglose | null;
  importe: number | null;
  formaPago: string | null;
  /** El texto de la linea, escrito una vez por el comercial. */
  descripcion: string | null;
};
/** Un documento de la fila: la generada (foto de la app o PDF de Drive) o la
 *  firmada. `enlace` vacio = esta en el almacen y se firma al abrirla. */
export type Documento = { tipo: "generada" | "firmada"; etiqueta: string; enlace: string | null; versionId: string; indice: number };
export type Hoja = {
  id: string;
  numero: number;
  oportunidadId: string | null;
  estado: string;
  /** Que se hace, para el titulo de la fila: "Ascensor", "Subvenciones". */
  titulo: string;
  fecha: string | null;
  aQuien: string;
  pagadorTipo: "comunidad" | "contrata";
  contrataId: string | null;
  version: { id: string; numero: number; html: string | null } | null;
  conceptos: ConceptoHoja[];
  actuaciones: { tipoId: string; accesoIds: string[] }[];
  importe: number;
  documentos: Documento[];
};
export type BloqueHoja = {
  id: string;
  codigo: string;
  nombreCorto: string;
  titulo: string;
  puntos: string[];
  desglose: Desglose;
  importe: number | null;
  /** proyecto · servicio · documento_tecnico. Solo lo de naturaleza `proyecto`
   *  puede entrar en un PROYECTO CONJUNTO. */
  naturaleza: string | null;
};
export type DatosHoja = {
  comunidad: { id: string; nombre: string; cif: string | null; municipio: string | null };
  oportunidades: Oportunidad[];
  hojas: Hoja[];
  bloques: BloqueHoja[];
  tipos: { id: string; nombre: string }[];
  contratas: { id: string; nombre: string; cif: string | null }[];
};

const textoAcceso = (a: { tipo_via: string | null; nombre_via: string | null; numero: string | null; escalera: string | null }) =>
  [a.tipo_via, a.nombre_via, a.numero].filter(Boolean).join(" ") + (a.escalera ? `, esc. ${a.escalera}` : "");

/** Un enlace de Drive se enseña con su visor (/preview); uno del almacen se
 *  firma en el momento de abrirlo. */
const enlaceDoc = (u: string): string | null =>
  u.startsWith("almacen:") ? null : u.replace(/\/view(\?.*)?$/, "/preview");

/** ¿Puede este usuario abrir la hoja de esta comunidad? */
export async function puedeVerComunidad(yo: Yo, comunidadId: string): Promise<boolean> {
  const cartera = await carteraDe(yo);
  if (cartera === "todas") return true;
  if (!cartera) return false;
  const o = await leer<{ id: string }[]>(`oportunidades?select=id&comunidad_id=eq.${comunidadId}&comercial_id=eq.${cartera}&limit=1`);
  return o.length > 0;
}

export async function datosHoja(comunidadId: string): Promise<DatosHoja | null> {
  const [comunidades, opps, hojas, bloques, tipos, contratas] = await Promise.all([
    leer<{ id: string; nombre: string; cif_comunidad: string | null; municipio: string | null }[]>(
      `comunidades?select=id,nombre,cif_comunidad,municipio&id=eq.${comunidadId}`,
    ),
    leer<{
      id: string;
      codigo: string | null;
      nombre: string | null;
      estado: string;
      comercial: { nombre: string } | null;
      accesos: { hasta: string | null; acceso: { id: string; tipo_via: string | null; nombre_via: string | null; numero: string | null; escalera: string | null } | null }[];
    }[]>(
      `oportunidades?select=id,codigo,nombre,estado,comercial:comercial_id(nombre),` +
        `accesos:relacion_oportunidad_accesos(hasta,acceso:acceso_id(id,tipo_via,nombre_via,numero,escalera))` +
        `&comunidad_id=eq.${comunidadId}&order=estado.asc,fecha_apertura.desc.nullslast`,
    ),
    leer<{
      id: string;
      oportunidad_id: string | null;
      estado: string;
      descripcion: string | null;
      fecha_creacion: string | null;
      pagador_tipo: "comunidad" | "contrata";
      pagador_contrata_id: string | null;
      contrata: { nombre: string } | null;
      version_firmada_id: string | null;
      versiones: { id: string; numero_version: number; fecha_generada: string | null; url_pdf_hoja: string | null; pdfs_firmados: string[] | null; contenido_html: string | null }[];
      conceptos: { version_hoja_id: string | null; bloque_id: string | null; importe: number | null; incluido: boolean; desglose: Desglose | null; forma_pago: string | null; descripcion: string | null; incluido_en_concepto_id: string | null; bloque: { codigo: string; nombre_corto: string | null; nombre: string } | null }[];
      actuaciones: { orden: number; tipo: { id: string; nombre: string } | null; accesos: { acceso_id: string }[] }[];
    }[]>(
      `hojas_encargo?select=id,oportunidad_id,estado,descripcion,fecha_creacion,pagador_tipo,pagador_contrata_id,` +
        `contrata:pagador_contrata_id(nombre),version_firmada_id,` +
        `versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,fecha_generada,url_pdf_hoja,pdfs_firmados,contenido_html),` +
        `conceptos:conceptos_hoja(version_hoja_id,bloque_id,importe,incluido,desglose,forma_pago,descripcion,incluido_en_concepto_id,bloque:bloque_id(codigo,nombre_corto,nombre)),` +
        `actuaciones:actuaciones_hoja(orden,tipo:tipo_proyecto_id(id,nombre),accesos:actuacion_accesos(acceso_id))` +
        `&comunidad_id=eq.${comunidadId}&estado=neq.anulada&order=fecha_creacion.asc,creado_en.asc`,
    ),
    leer<{ id: string; codigo: string; nombre_corto: string | null; nombre: string; texto_plantilla: string | null; desglose: Desglose; honorarios_defecto: number | null; naturaleza: string | null }[]>(
      "bloques?select=id,codigo,nombre_corto,nombre,texto_plantilla,desglose,honorarios_defecto,naturaleza&activo=is.true&order=orden.asc.nullslast",
    ),
    leer<{ id: string; nombre: string }[]>(
      "tipos_proyecto?select=id,nombre&activo=is.true&elegible=is.true&contratable=is.true&order=orden.asc",
    ),
    leer<{ id: string; nombre: string; cif: string | null }[]>("contratas?select=id,nombre,cif&order=nombre.asc&limit=1000"),
  ]);
  const c = comunidades[0];
  if (!c) return null;

  const oportunidades: Oportunidad[] = opps.map((o) => ({
    id: o.id,
    codigo: o.codigo,
    nombre: o.nombre,
    estado: o.estado,
    comercial: o.comercial?.nombre ?? null,
    accesos: o.accesos
      .filter((a) => !a.hasta && a.acceso)
      .map((a) => ({ id: a.acceso!.id, texto: textoAcceso(a.acceso!) }))
      .sort((a, b) => a.texto.localeCompare(b.texto, "es", { numeric: true })),
  }));

  return {
    comunidad: { id: c.id, nombre: c.nombre, cif: c.cif_comunidad, municipio: c.municipio },
    oportunidades,
    hojas: hojas.map((h, i) => {
      const versiones = [...h.versiones].sort((a, b) => a.numero_version - b.numero_version);
      const ultima = versiones.at(-1) ?? null;
      // Los conceptos de la ultima version; las antiguas no los tienen
      // atados a version, y entonces valen todos los de la hoja.
      const deUltima = h.conceptos.filter((k) => ultima && k.version_hoja_id === ultima.id);
      const conceptos = (deUltima.length ? deUltima : h.conceptos)
        .filter((k) => k.incluido)
        .map((k) => ({
          bloqueId: k.bloque_id,
          codigo: k.bloque?.codigo ?? null,
          nombreCorto: k.bloque?.nombre_corto ?? k.bloque?.nombre ?? "Concepto",
          desglose: k.desglose,
          importe: k.importe,
          descripcion: k.descripcion,
          formaPago: k.forma_pago,
        }));
      const importe = conceptos
        .filter((k) => (k.desglose ? k.desglose === "se_cobra" : true))
        .reduce((s, k) => s + (Number(k.importe) || 0), 0);
      const tipos = [...h.actuaciones].sort((a, b) => a.orden - b.orden);
      const documentos: Documento[] = [];
      for (const v of versiones) {
        if (v.contenido_html || v.url_pdf_hoja)
          documentos.push({
            tipo: "generada",
            etiqueta: `Generada v${v.numero_version}`,
            // Las de la app tienen su PDF (o se hace al pedirlo); las antiguas,
            // su enlace de Drive.
            enlace:
              v.contenido_html || v.url_pdf_hoja?.startsWith("almacen:")
                ? `/comercial/hoja-encargo/pdf/${v.id}`
                : v.url_pdf_hoja
                  ? enlaceDoc(v.url_pdf_hoja)
                  : null,
            versionId: v.id,
            indice: 0,
          });
        (v.pdfs_firmados ?? []).forEach((f, k) =>
          documentos.push({
            tipo: "firmada",
            etiqueta: versiones.length > 1 ? `Firmada v${v.numero_version}` : "Firmada",
            enlace: enlaceDoc(f),
            versionId: v.id,
            indice: k,
          }),
        );
      }
      return {
        id: h.id,
        numero: i + 1,
        oportunidadId: h.oportunidad_id,
        estado: h.estado,
        titulo: tipos.map((t) => t.tipo?.nombre).filter(Boolean).join(" + ") || (h.descripcion ?? "").trim() || "Hoja de encargo",
        fecha: ultima?.fecha_generada ?? h.fecha_creacion,
        aQuien: h.pagador_tipo === "contrata" ? h.contrata?.nombre ?? "Contrata" : c.nombre,
        pagadorTipo: h.pagador_tipo,
        contrataId: h.pagador_contrata_id,
        version: ultima ? { id: ultima.id, numero: ultima.numero_version, html: ultima.contenido_html } : null,
        conceptos,
        actuaciones: tipos.filter((t) => t.tipo).map((t) => ({ tipoId: t.tipo!.id, accesoIds: t.accesos.map((a) => a.acceso_id) })),
        importe,
        documentos,
      };
    }),
    bloques: bloques.map((b) => {
      const [titulo, ...resto] = limpiarTexto(b.texto_plantilla ?? b.nombre).split("\n");
      return {
        id: b.id,
        codigo: b.codigo,
        nombreCorto: b.nombre_corto ?? b.nombre,
        titulo: titulo.trim(),
        puntos: resto.map((l) => l.trim()).filter(Boolean),
        desglose: b.desglose,
        importe: b.honorarios_defecto,
        naturaleza: b.naturaleza ?? null,
      };
    }),
    tipos,
    contratas,
  };
}

// --------------------------------------------------------------- generar

export type Generar = {
  hojaId: string | null;
  comunidadId: string;
  oportunidadId: string;
  aQuien: { tipo: "comunidad" } | { tipo: "contrata"; id: string };
  actuaciones: { tipoId: string; accesoIds: string[] }[];
  conceptos: {
    bloqueId: string;
    desglose: Desglose;
    importe: number | null;
    formaPago: string | null;
    /** El texto de la linea, escrito una vez por el comercial. Viaja a la hoja y
     *  a la viabilidad: una fuente, dos destinos. */
    texto: string | null;
    /** Si esta linea va dentro del proyecto conjunto. */
    enConjunto: boolean;
  }[];
  /** La linea condensada, cuando hay dos o mas cosas que van juntas. Su importe
   *  NO es siempre la suma: "a veces el proyecto conjunto tiene un precio unico,
   *  y otras se desglosa; solo el comercial sabe cual es cada caso". */
  conjunto: { texto: string | null; importe: number } | null;
  html: string;
  /** GUARDAR COMO BORRADOR: se guarda todo pero NO se genera el PDF (Monica,
   *  6-oct-2026). Es la excepcion a "si hay PDF, esta congelado": un borrador
   *  conserva los datos para no perderlos y sigue vivo, porque no ha salido de
   *  Accesalia. */
  borrador?: boolean;
};

/** La foto se guarda limpia: el papel se edita a mano en el navegador, y lo
 *  que se pegue ahi no puede llevar codigo que luego se ejecute al verla. */
function limpiarHtml(html: string): string {
  return html
    .replace(/<\/?(script|iframe|object|embed|link|meta|style)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "")
    .replace(/\scontenteditable(="[^"]*")?/gi, "");
}

/** Guarda una version nueva de la hoja (y la hoja, si es nueva). Devuelve el
 *  id de la version, para abrirla e imprimirla. Las versiones anteriores y sus
 *  conceptos NO se tocan: son lo que se envio. */
/** Marca las viabilidades que habian cogido sus honorarios de una version
 *  anterior de ESTA hoja. Solo las que no estuvieran ya marcadas: la primera que
 *  las dejo atras es la que cuenta. */
async function marcarViabilidadesSuperadas(hojaId: string, versionNueva: string): Promise<void> {
  const usaban = await leer<{ viabilidad_id: string; version: { hoja_encargo_id: string } | null }[]>(
    `relacion_viabilidad_hojas?select=viabilidad_id,version:version_hoja_id(hoja_encargo_id)` +
      `&version.hoja_encargo_id=eq.${hojaId}`,
  );
  const ids = [...new Set(usaban.filter((u) => u.version).map((u) => u.viabilidad_id))];
  if (!ids.length) return;
  await pedir(`viabilidades?id=in.(${ids.join(",")})&superada_por_version_id=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ superada_por_version_id: versionNueva, superada_en: new Date().toISOString() }),
  });
}

export async function generarHoja(g: Generar, yo: Yo): Promise<{ hojaId: string; versionId: string }> {
  const tipos = await leer<{ id: string; nombre: string }[]>(
    `tipos_proyecto?select=id,nombre&id=in.(${g.actuaciones.map((a) => a.tipoId).join(",")})`,
  );
  const descripcion = g.actuaciones.map((a) => tipos.find((t) => t.id === a.tipoId)?.nombre).filter(Boolean).join(" + ");
  const pagador =
    g.aQuien.tipo === "contrata"
      ? { pagador_tipo: "contrata", pagador_contrata_id: g.aQuien.id }
      : { pagador_tipo: "comunidad", pagador_contrata_id: null };
  const generadaPor = yo.funciones.some((f) => f.clave === "secretaria")
    ? "secretaria_comercial"
    : yo.funciones.some((f) => f.clave === "comercial")
      ? "comercial"
      : null;

  // 1 · la hoja
  let hojaId = g.hojaId;
  if (!hojaId) {
    const [h] = await crear<{ id: string }>("hojas_encargo", {
      comunidad_id: g.comunidadId,
      oportunidad_id: g.oportunidadId,
      ...pagador,
      emisor: "accesalia",
      fecha_creacion: hoy(),
      vigencia_meses: 3,
      estado: "borrador",
      fecha_estado: new Date().toISOString(),
      generada_por: generadaPor,
      descripcion,
    });
    hojaId = h.id;
  } else {
    // Una version nueva todavia no se ha enviado: vuelve a "generada". La
    // firmada anterior sigue apuntada (version_firmada_id) y se sigue viendo.
    await pedir(`hojas_encargo?id=eq.${hojaId}`, {
      method: "PATCH",
      body: JSON.stringify({ ...pagador, descripcion, estado: "borrador", fecha_estado: new Date().toISOString() }),
    });
  }

  // 2 · el PDF, ANTES de apuntar nada: si la hoja no se puede convertir, que
  //     no quede una version sin su documento.
  const html = limpiarHtml(g.html);
  // En borrador NO se hace: el PDF es lo que congela, y un borrador no esta
  // congelado. Asi tampoco se paga el coste de convertirlo cada vez que guarda.
  const pdf = g.borrador ? null : await pdfDeHoja(html, `Hoja de encargo · ${descripcion}`);

  // 3 · la version, con la hoja tal cual
  const previas = await leer<{ numero_version: number }[]>(
    `versiones_hoja?select=numero_version&hoja_encargo_id=eq.${hojaId}&order=numero_version.desc&limit=1`,
  );
  const base = g.conceptos.filter((k) => k.desglose === "se_cobra").reduce((s, k) => s + (k.importe ?? 0), 0);
  const numero = (previas[0]?.numero_version ?? 0) + 1;
  const [v] = await crear<{ id: string }>("versiones_hoja", {
    hoja_encargo_id: hojaId,
    numero_version: numero,
    fecha_generada: hoy(),
    contenido_html: html,
    importe_base: base,
    iva_porcentaje: 21,
    importe_total: Math.round(base * 121) / 100,
  });

  // 4 · el PDF al almacen, junto a la version. En borrador no hay PDF, y eso ES
  //     la marca: "si es PDF, ya esta congelado; si aun es editable, es que no
  //     se ha generado y por tanto no se ha enviado".
  if (pdf) {
    const ruta = `hojas-encargo/${hojaId}/hoja-v${numero}-${v.id.slice(0, 8)}.pdf`;
    const sube = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
      method: "POST",
      headers: { ...CAB, "Content-Type": "application/pdf", "x-upsert": "true" },
      body: new Uint8Array(pdf),
      cache: "no-store",
    });
    if (!sube.ok) throw new Error(`Storage ${sube.status}: ${await sube.text()}`);
    await pedir(`versiones_hoja?id=eq.${v.id}`, {
      method: "PATCH",
      body: JSON.stringify({ url_pdf_hoja: `almacen:${ALMACEN}/${ruta}` }),
    });
  }

  // 5 · los conceptos de ESTA version
  if (g.conceptos.length) {
    // EL PROYECTO CONJUNTO VA PRIMERO, porque las lineas que lo componen apuntan
    // a el. La hoja enseña las tres -el conjunto y cada cosa con su precio- y la
    // viabilidad solo el conjunto: "la hoja desglosa, la viabilidad agrupa".
    let conjuntoId: string | null = null;
    if (g.conjunto) {
      const [c] = await crear<{ id: string }>("conceptos_hoja", [{
        hoja_encargo_id: hojaId,
        version_hoja_id: v.id,
        bloque_id: null,
        incluido: true,
        desglose: "se_cobra",
        importe: g.conjunto.importe,
        descripcion: g.conjunto.texto,
      }]);
      conjuntoId = c?.id ?? null;
    }

    await crear(
      "conceptos_hoja",
      g.conceptos.map((k) => ({
        hoja_encargo_id: hojaId,
        version_hoja_id: v.id,
        bloque_id: k.bloqueId,
        incluido: true,
        desglose: k.desglose,
        importe: k.desglose === "se_cobra" ? k.importe : null,
        forma_pago: k.desglose === "se_cobra" ? k.formaPago : null,
        descripcion: k.texto,
        incluido_en_concepto_id: k.enConjunto ? conjuntoId : null,
      })),
    );
  }

  // 6 · el que + donde: es de la hoja, se rehace entero
  await pedir(`actuaciones_hoja?hoja_encargo_id=eq.${hojaId}`, { method: "DELETE" });
  const acts = await crear<{ id: string }>(
    "actuaciones_hoja",
    g.actuaciones.map((a, i) => ({ hoja_encargo_id: hojaId, tipo_proyecto_id: a.tipoId, orden: i + 1 })),
  );
  const filas = acts.flatMap((a, i) => g.actuaciones[i].accesoIds.map((acceso_id) => ({ actuacion_id: a.id, acceso_id })));
  if (filas.length) await crear("actuacion_accesos", filas);

  // 7 · LAS VIABILIDADES QUE ESTA HOJA DEJA ATRAS (Monica, 6-oct-2026).
  //
  //     "Si hay una hoja de encargo posterior y no se regenera la viabilidad,
  //      debe marcarse la viabilidad como 'modificada en hoja de encargo numero
  //      tal', para que nadie la vea y piense que es la correcta."
  //
  //     Se pone SOLA: ella lo pidio automatico, "desde luego". El documento que
  //     salio no se toca -se conserva fiel-; lo que cambia es que ya no se puede
  //     leer como vigente.
  //
  //     Un borrador no deja atras a nadie: no ha salido de Accesalia.
  if (!g.borrador) await marcarViabilidadesSuperadas(hojaId!, v.id);

  return { hojaId: hojaId!, versionId: v.id };
}

// --------------------------------------------------------------- estados

export async function marcarEnviada(hojaId: string) {
  await pedir(`hojas_encargo?id=eq.${hojaId}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "enviada_comunidad", fecha_estado: new Date().toISOString() }),
  });
}

/** ¿De que comunidad es esta hoja? Para comprobar el permiso en cada accion. */
export async function comunidadDeHoja(hojaId: string): Promise<string | null> {
  const [h] = await leer<{ comunidad_id: string }[]>(`hojas_encargo?select=comunidad_id&id=eq.${hojaId}`);
  return h?.comunidad_id ?? null;
}

// ------------------------------------------------- la firmada, al almacen

const limpio = (n: string) =>
  n.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80) || "firmada.pdf";

/** Permiso de un solo uso para que el navegador suba la firmada al almacen. */
export async function permisoFirmada(hojaId: string, nombre: string): Promise<{ ruta: string; url: string }> {
  const ruta = `hojas-encargo/${hojaId}/firmada-${crypto.randomUUID().slice(0, 8)}-${limpio(nombre)}`;
  const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${ALMACEN}/${ruta}`, { method: "POST", headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
  const { url } = (await r.json()) as { url: string };
  const publica = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;
  return { ruta, url: `${publica}/storage/v1${url}` };
}

/** Ya subida: se apunta en la ultima version y la hoja queda firmada. */
export async function apuntarFirmada(hojaId: string, ruta: string) {
  const info = await fetch(`${URL_BASE}/storage/v1/object/info/${ALMACEN}/${ruta}`, { headers: CAB, cache: "no-store" });
  if (!info.ok) throw new Error("El fichero no ha llegado al almacén.");
  const [v] = await leer<{ id: string; pdfs_firmados: string[] | null }[]>(
    `versiones_hoja?select=id,pdfs_firmados&hoja_encargo_id=eq.${hojaId}&order=numero_version.desc&limit=1`,
  );
  if (!v) throw new Error("La hoja no tiene ninguna versión generada.");
  await pedir(`versiones_hoja?id=eq.${v.id}`, {
    method: "PATCH",
    body: JSON.stringify({ pdfs_firmados: [...(v.pdfs_firmados ?? []), `almacen:${ALMACEN}/${ruta}`] }),
  });
  await pedir(`hojas_encargo?id=eq.${hojaId}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "devuelta_firmada", fecha_firma: hoy(), version_firmada_id: v.id, fecha_estado: new Date().toISOString() }),
  });
}

/** Enlace para ver una firmada del almacen. Caduca en diez minutos. */
export async function enlaceFirmada(hojaId: string, versionId: string, n: number): Promise<string | null> {
  const [v] = await leer<{ pdfs_firmados: string[] | null; hoja_encargo_id: string }[]>(
    `versiones_hoja?select=pdfs_firmados,hoja_encargo_id&id=eq.${versionId}`,
  );
  const f = v?.hoja_encargo_id === hojaId ? v.pdfs_firmados?.[n] : null;
  if (!f) return null;
  if (!f.startsWith("almacen:")) return enlaceDoc(f);
  const [, resto] = f.split("almacen:");
  const barra = resto.indexOf("/");
  const almacen = resto.slice(0, barra);
  const ruta = resto.slice(barra + 1);
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${almacen}/${ruta}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600 }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const { signedURL } = (await r.json()) as { signedURL: string };
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE}/storage/v1${signedURL}`;
}

// ------------------------------------------------- la version, en PDF

/** El PDF de una version: el guardado en el almacen, o (si es de antes de que
 *  la app los guardara) hecho al momento con su hoja. */
export async function pdfDeVersion(versionId: string): Promise<{ pdf: Uint8Array; comunidadId: string; nombre: string } | null> {
  const [v] = await leer<{
    contenido_html: string | null;
    url_pdf_hoja: string | null;
    numero_version: number;
    hoja: { comunidad_id: string; descripcion: string | null } | null;
  }[]>(`versiones_hoja?select=contenido_html,url_pdf_hoja,numero_version,hoja:hoja_encargo_id(comunidad_id,descripcion)&id=eq.${versionId}`);
  if (!v?.hoja) return null;
  const nombre = `Hoja de encargo ${v.hoja.descripcion ?? ""} v${v.numero_version}.pdf`.replace(/\s+/g, " ");
  if (v.url_pdf_hoja?.startsWith("almacen:")) {
    const resto = v.url_pdf_hoja.slice("almacen:".length);
    const r = await fetch(`${URL_BASE}/storage/v1/object/${resto}`, { headers: CAB, cache: "no-store" });
    if (r.ok) return { pdf: new Uint8Array(await r.arrayBuffer()), comunidadId: v.hoja.comunidad_id, nombre };
  }
  if (!v.contenido_html) return null;
  return { pdf: new Uint8Array(await pdfDeHoja(v.contenido_html, nombre)), comunidadId: v.hoja.comunidad_id, nombre };
}
