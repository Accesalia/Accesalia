// lib/presupuesto.ts
//
// GENERAR PRESUPUESTOS EN LA APP (Monica, 10-oct-2026). Hasta hoy se hacian en
// Factusol "y es francamente engorroso: la mitad de las hojas no se llegan a
// firmar, pero invertimos mucho tiempo en crearles su presupuesto".
//
// Se construye desde la oportunidad: se marcan las hojas de encargo que entran
// ("a incluir") y el motor (lib/motorPresupuesto.ts, validado contra Factusol)
// saca las lineas. Se guarda como borrador o se genera el PDF:
//   - el codigo PR-año-numero se da al GENERAR (un borrador no gasta numero),
//     de la serie propia: "si el codigo es diferente al de factusol, mejor: nos
//     sirve para diferenciarlos de un vistazo";
//   - con PDF queda congelado; si algo cambia, se hace otro;
//   - los datos, los mismos que lleva el de Factusol ("el formato me da mas
//     igual, pero los datos conservaria los mismos, que sabemos que funcionan").
//
// Las lineas NO vienen del navegador: el servidor las vuelve a calcular con el
// mismo motor desde las hojas marcadas.

import "server-only";
import { exigirCompleta } from "./completa";
import type { Yo } from "./sesion";
import type { Desglose } from "./catalogoBloques";
import { lineasDelPresupuesto, totales, IVA, type Cliente, type FormaPago, type HojaMotor } from "./motorPresupuesto";
import { pdfDePresupuesto } from "./pdf/PresupuestoDoc";

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

// ------------------------------------------------------------ lo que se pinta

/** Una hoja de la oportunidad, con su desglose minimo para saber elegir. */
export type HojaElegible = HojaMotor & {
  titulo: string;
  estado: string;
  /** lo que suma lo que se cobra con precio */
  importe: number;
  /** sustituida por otra hoja: se enseña, pero no se marca sola */
  sustituida: boolean;
};

export type PresupuestoResumen = {
  id: string;
  codigo: string | null;
  fecha: string | null;
  estado: string;
  base: number;
  borrador: boolean;
  hojaIds: string[];
  cliente: Cliente;
  formaPago: FormaPago;
};

export type DatosPresupuesto = {
  opp: { id: string; codigo: string | null; nombre: string | null; comunidadId: string };
  direccion: string;
  hojas: HojaElegible[];
  cliente: Cliente;
  pagador: { tipo: "comunidad" | "contrata"; id: string };
  presupuestos: PresupuestoResumen[];
};

type FilaConcepto = {
  id: string;
  version_hoja_id: string | null;
  descripcion: string | null;
  importe: number | null;
  porcentaje: number | null;
  desglose: Desglose | null;
  incluido: boolean;
  incluido_en_concepto_id: string | null;
  bloque: { nombre_corto: string | null; nombre: string; desglose: Desglose } | null;
};

/** La direccion del texto: el nombre de la comunidad sin el "CP" de delante. */
const sinCp = (n: string) => n.replace(/^CP\s+/i, "").trim();

export async function oportunidadDePresupuesto(id: string): Promise<string | null> {
  const [p] = await leer<{ oportunidad_id: string | null }[]>(`presupuestos?select=oportunidad_id&id=eq.${id}`);
  return p?.oportunidad_id ?? null;
}

export async function comunidadDeOportunidad(oppId: string): Promise<string | null> {
  const [o] = await leer<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${oppId}`);
  return o?.comunidad_id ?? null;
}

export async function datosPresupuesto(oppId: string): Promise<DatosPresupuesto | null> {
  const [opps, hojas, sustituidas, presus] = await Promise.all([
    leer<{
      id: string; codigo: string | null; nombre: string | null;
      comunidad: { id: string; nombre: string; cif_comunidad: string | null; domicilio_fiscal: string | null; cp: string | null; municipio: string | null; provincia: string | null } | null;
    }[]>(
      `oportunidades?select=id,codigo,nombre,comunidad:comunidad_id(id,nombre,cif_comunidad,domicilio_fiscal,cp,municipio,provincia)&id=eq.${oppId}`,
    ),
    leer<{
      id: string; numero_hoja: string | null; estado: string; descripcion: string | null; fecha_creacion: string | null; fecha_firma: string | null;
      pagador_tipo: "comunidad" | "contrata"; pagador_contrata_id: string | null;
      contrata: { nombre: string; cif: string | null; domicilio_fiscal: string | null } | null;
      versiones: { id: string; numero_version: number; fecha_generada: string | null; url_pdf_hoja: string | null }[];
      conceptos: FilaConcepto[];
      lineas: { id: string; descripcion: string | null; importe: number | null; es_porcentaje: boolean | null; porcentaje: number | null }[];
    }[]>(
      `hojas_encargo?select=id,numero_hoja,estado,descripcion,fecha_creacion,fecha_firma,pagador_tipo,pagador_contrata_id,` +
        `contrata:pagador_contrata_id(nombre,cif,domicilio_fiscal),` +
        `versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,fecha_generada,url_pdf_hoja),` +
        `conceptos:conceptos_hoja(id,version_hoja_id,descripcion,importe,porcentaje,desglose,incluido,incluido_en_concepto_id,bloque:bloque_id(nombre_corto,nombre,desglose)),` +
        `lineas:lineas_facturacion(id,descripcion,importe,es_porcentaje,porcentaje)` +
        `&oportunidad_id=eq.${oppId}&estado=neq.anulada&order=fecha_creacion.asc,creado_en.asc`,
    ),
    leer<{ hoja_antigua_id: string }[]>("sustituciones_hoja?select=hoja_antigua_id"),
    leer<{
      id: string; codigo: string | null; fecha: string | null; estado: string; base: number | null; url_pdf: string | null; forma_pago: FormaPago | null;
      pagador_nombre: string | null; pagador_nif: string | null; pagador_domicilio: string | null; pagador_cp: string | null; pagador_poblacion: string | null; pagador_provincia: string | null;
      hojas: { hoja_encargo_id: string }[];
    }[]>(
      // Los de la app hechos aqui: con codigo o en borrador. Los 1.062 que se
      // generaron en retrospectiva para compararlos con Factusol no se enseñan.
      `presupuestos?select=id,codigo,fecha,estado,base,url_pdf,forma_pago,pagador_nombre,pagador_nif,pagador_domicilio,pagador_cp,pagador_poblacion,pagador_provincia,` +
        `hojas:presupuesto_hojas(hoja_encargo_id)&oportunidad_id=eq.${oppId}&origen=eq.app&or=(codigo.not.is.null,estado.eq.borrador)&order=creado_en.desc`,
    ),
  ]);
  const o = opps[0];
  if (!o?.comunidad) return null;
  const c = o.comunidad;
  const direccion = sinCp(c.nombre);
  const fuera = new Set(sustituidas.map((s) => s.hoja_antigua_id));

  const elegibles: HojaElegible[] = [];
  for (const h of hojas) {
    const versiones = [...h.versiones].sort((a, b) => a.numero_version - b.numero_version);
    // La ultima que SALIO (con PDF o enlace de Drive); un borrador no ha salido.
    const v = versiones.filter((x) => x.url_pdf_hoja).at(-1) ?? null;
    if (!v && h.estado === "borrador") continue;
    const deVersion = h.conceptos.filter((k) => v && k.version_hoja_id === v.id);
    const cs = (deVersion.length ? deVersion : h.conceptos).filter((k) => k.incluido);
    const aparece = (k: FilaConcepto): Desglose =>
      k.bloque?.desglose === "no_aparece" ? "no_aparece" : k.desglose ?? (k.importe ? "se_cobra" : "incluido");
    const nombre = (k: FilaConcepto) => (k.descripcion ?? "").trim() || k.bloque?.nombre_corto || k.bloque?.nombre || "Proyecto";
    let cobra;
    if (h.estado === "devuelta_firmada" && h.lineas.length) {
      // firmada: lo releido del papel manda en los importes
      cobra = h.lineas.map((l) => ({
        nombre: (l.descripcion ?? "").trim() || "Honorarios",
        importe: l.es_porcentaje ? null : l.importe,
        pct: l.es_porcentaje ? l.porcentaje : null,
        lineaId: l.id,
      }));
    } else {
      // Lo que va DENTRO de un proyecto conjunto no se cobra aparte: su precio
      // ya esta en el del conjunto. Sale como incluido.
      cobra = cs
        .filter((k) => aparece(k) === "se_cobra" && !k.incluido_en_concepto_id)
        .map((k) => ({ nombre: nombre(k), importe: k.importe, pct: k.porcentaje, lineaId: null }));
    }
    const incluidos = cs
      .filter((k) => aparece(k) === "incluido" || (aparece(k) === "se_cobra" && k.incluido_en_concepto_id))
      .map(nombre);
    elegibles.push({
      id: h.id,
      codigo: h.numero_hoja,
      versionId: v?.id ?? null,
      fecha: v?.fecha_generada ?? h.fecha_creacion,
      fechaFirma: h.estado === "devuelta_firmada" ? h.fecha_firma : null,
      cobra,
      incluidos,
      titulo: (h.descripcion ?? "").trim() || "Hoja de encargo",
      estado: h.estado,
      importe: cobra.reduce((s, x) => s + (Number(x.importe) || 0), 0),
      sustituida: fuera.has(h.id),
    });
  }

  // Quien paga: el de la ultima hoja que no sea de la comunidad, si la hay
  // (una contrata que paga por ella); si no, la comunidad.
  const deContrata = [...hojas].reverse().find((h) => h.pagador_tipo === "contrata" && h.pagador_contrata_id && h.contrata);
  const cliente: Cliente = deContrata
    ? { nombre: deContrata.contrata!.nombre, nif: deContrata.contrata!.cif ?? "", domicilio: deContrata.contrata!.domicilio_fiscal ?? "", cp: "", poblacion: "", provincia: "" }
    : {
        nombre: c.nombre,
        nif: c.cif_comunidad ?? "",
        // Sin domicilio fiscal apuntado, la direccion del nombre (sin el municipio).
        domicilio: c.domicilio_fiscal ?? (c.municipio ? direccion.replace(new RegExp(`\\s+${c.municipio}$`, "i"), "") : direccion),
        cp: c.cp ?? "",
        poblacion: c.municipio ?? "",
        provincia: c.provincia ?? "",
      };

  return {
    opp: { id: o.id, codigo: o.codigo, nombre: o.nombre, comunidadId: c.id },
    direccion,
    hojas: elegibles,
    cliente,
    pagador: deContrata ? { tipo: "contrata", id: deContrata.pagador_contrata_id! } : { tipo: "comunidad", id: c.id },
    presupuestos: presus.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      fecha: p.fecha,
      estado: p.estado,
      base: Number(p.base) || 0,
      borrador: !p.url_pdf,
      hojaIds: p.hojas.map((x) => x.hoja_encargo_id),
      cliente: {
        nombre: p.pagador_nombre ?? "", nif: p.pagador_nif ?? "", domicilio: p.pagador_domicilio ?? "",
        cp: p.pagador_cp ?? "", poblacion: p.pagador_poblacion ?? "", provincia: p.pagador_provincia ?? "",
      },
      formaPago: p.forma_pago ?? "cargo_en_cuenta",
    })),
  };
}

// --------------------------------------------------------------- guardar

export type GuardarPresupuesto = {
  presupuestoId: string | null;
  oportunidadId: string;
  hojaIds: string[];
  cliente: Cliente;
  formaPago: FormaPago;
  /** true = guardar como borrador (sin PDF ni numero) */
  borrador: boolean;
};

/** El codigo PR-año-numero: si aun no lo tiene, el siguiente de la serie, de un
 *  golpe en la base (dos a la vez nunca reciben el mismo). Solo al generar. */
async function codigoDe(id: string): Promise<string> {
  const [p] = await leer<{ codigo: string | null }[]>(`presupuestos?select=codigo&id=eq.${id}`);
  if (p?.codigo) return p.codigo;
  const r = await pedir("rpc/siguiente_codigo", { method: "POST", body: JSON.stringify({ p_tipo: "PR", p_anio: Number(hoy().slice(0, 4)) }) });
  const codigo = (await r.json()) as string;
  await pedir(`presupuestos?id=eq.${id}&codigo=is.null`, { method: "PATCH", body: JSON.stringify({ codigo }) });
  return codigo;
}

export async function guardarPresupuesto(g: GuardarPresupuesto, _yo: Yo): Promise<{ id: string; codigo: string | null }> {
  if (!g.borrador) await exigirCompleta(g.oportunidadId, "generar el presupuesto");
  const d = await datosPresupuesto(g.oportunidadId);
  if (!d) throw new Error("La oportunidad no tiene comunidad.");
  const elegidas = d.hojas.filter((h) => g.hojaIds.includes(h.id));
  if (g.hojaIds.length !== elegidas.length) throw new Error("Alguna hoja marcada no es de esta oportunidad.");
  const lineas = lineasDelPresupuesto(elegidas, d.direccion);
  if (!g.borrador) {
    if (!elegidas.length) throw new Error("Marca al menos una hoja de encargo.");
    if (!lineas.some((l) => l.importe > 0)) throw new Error("Las hojas marcadas no tienen nada que se cobre.");
    if (!g.cliente.nombre.trim()) throw new Error("Falta el nombre del cliente.");
  }
  const t = totales(lineas);
  const limpio = (s: string) => s.trim() || null;
  const fila = {
    origen: "app",
    empresa_emisora: "accesalia",
    serie: "PR",
    estado: "borrador",
    pagador_tipo: d.pagador.tipo,
    pagador_id: d.pagador.id,
    pagador_nombre: limpio(g.cliente.nombre),
    pagador_nif: limpio(g.cliente.nif),
    pagador_domicilio: limpio(g.cliente.domicilio),
    pagador_cp: limpio(g.cliente.cp),
    pagador_poblacion: limpio(g.cliente.poblacion),
    pagador_provincia: limpio(g.cliente.provincia),
    forma_pago: g.formaPago,
    base: t.base,
    iva_desglose: [{ tipo: IVA, base: t.base, cuota: t.cuota }],
    irpf_porcentaje: 0,
    irpf_importe: 0,
    total: t.total,
    oportunidad_id: g.oportunidadId,
  };

  // 1 · la fila. Uno con PDF no se toca: es lo que salio.
  let id = g.presupuestoId;
  if (id) {
    const [p] = await leer<{ url_pdf: string | null; oportunidad_id: string | null }[]>(`presupuestos?select=url_pdf,oportunidad_id&id=eq.${id}`);
    if (!p || p.oportunidad_id !== g.oportunidadId) throw new Error("Ese presupuesto no es de esta oportunidad.");
    if (p.url_pdf) throw new Error("Ese presupuesto ya está generado: no se cambia. Haz uno nuevo.");
    await pedir(`presupuestos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ ...fila, actualizado_en: new Date().toISOString() }) });
    await pedir(`presupuesto_lineas?presupuesto_id=eq.${id}`, { method: "DELETE" });
    await pedir(`presupuesto_hojas?presupuesto_id=eq.${id}`, { method: "DELETE" });
  } else {
    [{ id }] = await crear<{ id: string }>("presupuestos", fila);
  }

  // 2 · sus lineas y sus hojas
  if (lineas.length)
    await crear(
      "presupuesto_lineas",
      lineas.map((l, k) => ({
        presupuesto_id: id, posicion: k + 1, concepto: l.concepto, cantidad: 1, precio: l.importe, base: l.importe,
        iva_porcentaje: IVA, irpf_porcentaje: 0, total: l.importe, hoja_encargo_id: l.hojaId, linea_facturacion_id: l.lineaId,
      })),
    );
  if (elegidas.length)
    await crear("presupuesto_hojas", elegidas.map((h) => ({ presupuesto_id: id, hoja_encargo_id: h.id, version_hoja_id: h.versionId })));

  if (g.borrador) return { id: id!, codigo: null };

  // 3 · el numero, la fecha y el PDF. El PDF, lo ultimo: es lo que lo congela.
  //     Si algo falla antes, se queda en borrador con su numero ya dado, y el
  //     siguiente "generar" lo reutiliza.
  const codigo = await codigoDe(id!);
  const fecha = hoy();
  const pdf = await pdfDePresupuesto({ codigo, fecha, cliente: g.cliente, formaPago: g.formaPago, lineas, ...t });
  const ruta = `presupuestos/${id}/${codigo}.pdf`;
  const sube = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/pdf", "x-upsert": "true" },
    body: new Uint8Array(pdf),
    cache: "no-store",
  });
  if (!sube.ok) throw new Error(`Storage ${sube.status}: ${await sube.text()}`);
  const [anio, numero] = codigo.split("-").slice(1).map(Number);
  await pedir(`presupuestos?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ estado: "pendiente", fecha, anio, numero, url_pdf: `almacen:${ALMACEN}/${ruta}`, generado_en: new Date().toISOString() }),
  });
  return { id: id!, codigo };
}

/** Borrar un BORRADOR (no ha salido de Accesalia). Uno generado no se borra. */
export async function borrarBorrador(id: string): Promise<void> {
  const [p] = await leer<{ url_pdf: string | null }[]>(`presupuestos?select=url_pdf&id=eq.${id}`);
  if (!p) return;
  if (p.url_pdf) throw new Error("Un presupuesto generado no se borra.");
  await pedir(`presupuestos?id=eq.${id}&url_pdf=is.null`, { method: "DELETE" });
}

// ------------------------------------------------------------- el PDF

export async function pdfGuardado(id: string): Promise<{ pdf: Uint8Array; oportunidadId: string; nombre: string } | null> {
  const [p] = await leer<{ url_pdf: string | null; codigo: string | null; oportunidad_id: string | null; pagador_nombre: string | null }[]>(
    `presupuestos?select=url_pdf,codigo,oportunidad_id,pagador_nombre&id=eq.${id}`,
  );
  if (!p?.url_pdf?.startsWith("almacen:") || !p.oportunidad_id) return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/${p.url_pdf.slice("almacen:".length)}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) return null;
  return {
    pdf: new Uint8Array(await r.arrayBuffer()),
    oportunidadId: p.oportunidad_id,
    nombre: `Presupuesto ${p.codigo} ${p.pagador_nombre ?? ""}.pdf`.replace(/\s+/g, " "),
  };
}
