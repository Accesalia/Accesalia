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
import { firmadoDe } from "./firmaDigital";
import { exigirCompleta } from "./completa";
import { nombreDeOpp } from "./direccionOpp";
import type { Yo } from "./sesion";
import { lineasDelPresupuesto, totales, IVA, type Cliente, type FormaPago, type HojaMotor } from "./motorPresupuesto";
import { pdfDePresupuesto } from "./pdf/PresupuestoDoc";
import { faseHe } from "./hojasOpp";

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
  /** su fase, como se dice y con su color (lib/hojasOpp.ts) */
  fase: { texto: string; clase: string };
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
  opp: { id: string; codigo: string | null; nombre: string | null; comunidadId: string | null };
  direccion: string;
  hojas: HojaElegible[];
  cliente: Cliente;
  /** Quien paga, si se sabe. Tener CP no es condicion (13-oct-2026). */
  pagador: { tipo: "comunidad" | "contrata" | "persona"; id: string } | null;
  presupuestos: PresupuestoResumen[];
};



export async function oportunidadDePresupuesto(id: string): Promise<string | null> {
  const [p] = await leer<{ oportunidad_id: string | null }[]>(`presupuestos?select=oportunidad_id&id=eq.${id}`);
  return p?.oportunidad_id ?? null;
}

export async function comunidadDeOportunidad(oppId: string): Promise<string | null> {
  const [o] = await leer<{ comunidad_id: string | null }[]>(`oportunidades?select=comunidad_id&id=eq.${oppId}`);
  return o?.comunidad_id ?? null;
}

export async function datosPresupuesto(oppId: string): Promise<DatosPresupuesto | null> {
  // LAS HOJAS NUEVAS (25-oct-2026, «lo adaptamos para leer hojas nuevas»): las versiones de la opp que ya salieron (con
  // el ok de Daniel y su PDF), con sus lineas de he_lineas_compromisos por el mismo motor. La sustituida se enseña, pero
  // no se marca sola; las anuladas y no firmadas, fuera.
  const [opps, versiones, presus] = await Promise.all([
    leer<{
      id: string; codigo: string | null; nombre: string | null;
      comunidad: { id: string; nombre: string; cif_comunidad: string | null; domicilio_fiscal: string | null; cp: string | null; municipio: string | null; provincia: string | null } | null;
    }[]>(
      `oportunidades?select=id,codigo,nombre,comunidad:comunidad_id(id,nombre,cif_comunidad,domicilio_fiscal,cp,municipio,provincia)&id=eq.${oppId}`,
    ),
    leer<{
      id: string; codigo_he: string | null; numero_version: number; estado: string; fecha_emision: string | null; creado_en: string;
      pagador_tipo: "comunidad" | "contrata" | "persona"; pagador_contrata_id: string | null; pagador_persona_id: string | null;
      contrata: { nombre: string; cif: string | null; domicilio_fiscal: string | null } | null;
      persona: { nombre: string; apellidos: string | null } | null;
      estados: { estado: string; fecha: string }[];
      lineas: LineaHe[];
    }[]>(
      `he_versiones_hoja?select=id,codigo_he,numero_version,estado,fecha_emision,creado_en,pagador_tipo,pagador_contrata_id,pagador_persona_id,` +
        `contrata:pagador_contrata_id(nombre,cif,domicilio_fiscal),persona:pagador_persona_id(nombre,apellidos),estados:he_estados_hoja(estado,fecha),` +
        `lineas:he_lineas_compromisos(id,padre_id,se_cobra,en_papel,importe,porcentaje,texto,desglosar_precios,creado_en,bloque:bloque_id(codigo,nombre_corto,nombre),desglose:desglose_id(nombre))` +
        `&oportunidad_id=eq.${oppId}&pdf=not.is.null&estado=not.in.(anulada,no_firmada)&order=creado_en.asc`,
    ),
    leer<{
      id: string; codigo: string | null; fecha: string | null; estado: string; base: number | null; url_pdf: string | null; forma_pago: FormaPago | null;
      pagador_nombre: string | null; pagador_nif: string | null; pagador_domicilio: string | null; pagador_cp: string | null; pagador_poblacion: string | null; pagador_provincia: string | null;
      he_version_id: string | null; hojas: { he_version_id: string | null }[];
    }[]>(
      // Los de la app hechos aqui: con codigo o en borrador. Los 1.062 que se
      // generaron en retrospectiva para compararlos con Factusol no se enseñan.
      `presupuestos?select=id,codigo,fecha,estado,base,url_pdf,forma_pago,pagador_nombre,pagador_nif,pagador_domicilio,pagador_cp,pagador_poblacion,pagador_provincia,he_version_id,` +
        `hojas:presupuesto_hojas(he_version_id)&oportunidad_id=eq.${oppId}&origen=eq.app&or=(codigo.not.is.null,estado.eq.borrador)&order=creado_en.desc`,
    ),
  ]);
  const o = opps[0];
  if (!o) return null;
  // Su comunidad, si la tiene: un dato, no una condicion (13-oct-2026).
  const c = o.comunidad;
  // La direccion del texto es el NOMBRE DE LA OPP (13-oct-2026).
  const direccion = nombreDeOpp(o);

  const elegibles: HojaElegible[] = versiones.map((v) => {
    const fechaFirma = v.estados.filter((e) => e.estado === "firmada_recibida").map((e) => e.fecha).sort()[0] ?? null;
    const m = hojaMotorDe(v.id, v.codigo_he, v.fecha_emision ?? v.creado_en, v.lineas);
    const tipos = [...new Set(v.lineas.map((l) => l.desglose?.nombre).filter((x): x is string => !!x))];
    return {
      ...m,
      fechaFirma: fechaFirma ? fechaFirma.slice(0, 10) : null,
      codigo: v.codigo_he ? `${v.codigo_he} v${v.numero_version}` : null,
      titulo: tipos.join(" + ") || "Hoja de encargo",
      estado: v.estado,
      importe: m.cobra.reduce((t, x) => t + (Number(x.importe) || 0), 0),
      sustituida: v.estado === "sustituida",
      fase: faseHe(v.estado),
    };
  });

  // Quien paga: el de la ultima hoja que no sea de la comunidad, si la hay
  // (una contrata que paga por ella, o el particular al que va); si no, la
  // comunidad; si no tiene, se escribe a mano.
  const deContrata = [...versiones].reverse().find((h) => h.pagador_tipo === "contrata" && h.pagador_contrata_id && h.contrata);
  const dePersona = [...versiones].reverse().find((h) => h.pagador_tipo === "persona" && h.pagador_persona_id && h.persona);
  const vacio: Cliente = { nombre: "", nif: "", domicilio: "", cp: "", poblacion: "", provincia: "" };
  const cliente: Cliente = deContrata
    ? { ...vacio, nombre: deContrata.contrata!.nombre, nif: deContrata.contrata!.cif ?? "", domicilio: deContrata.contrata!.domicilio_fiscal ?? "" }
    : dePersona
      ? { ...vacio, nombre: [dePersona.persona!.nombre, dePersona.persona!.apellidos].filter(Boolean).join(" ") }
      : c
        ? {
            nombre: c.nombre,
            nif: c.cif_comunidad ?? "",
            // Sin domicilio fiscal apuntado, la direccion (sin el municipio).
            domicilio: c.domicilio_fiscal ?? direccion.replace(/,\s*[^,]*$/, ""),
            cp: c.cp ?? "",
            poblacion: c.municipio ?? "",
            provincia: c.provincia ?? "",
          }
        : vacio;
  const pagador: DatosPresupuesto["pagador"] = deContrata
    ? { tipo: "contrata", id: deContrata.pagador_contrata_id! }
    : dePersona
      ? { tipo: "persona", id: dePersona.pagador_persona_id! }
      : c
        ? { tipo: "comunidad", id: c.id }
        : null;

  return {
    opp: { id: o.id, codigo: o.codigo, nombre: o.nombre, comunidadId: c?.id ?? null },
    direccion,
    hojas: elegibles,
    cliente,
    pagador,
    presupuestos: presus.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      fecha: p.fecha,
      estado: p.estado,
      base: Number(p.base) || 0,
      borrador: !p.url_pdf,
      // Las hojas que lleva: las marcadas (presupuesto_hojas) o, si salio con una hoja al generarla, la suya.
      hojaIds: [...new Set([...p.hojas.map((x) => x.he_version_id), p.he_version_id].filter((x): x is string => !!x))],
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

/** Una linea en presupuesto_lineas. Las de texto (la cabecera de la hoja, lo incluido) van sin cantidad ni importe. */
function filaDeLinea(presupuestoId: string, k: number, l: { concepto: string; importe: number | null }) {
  const conImporte = l.importe != null;
  return {
    presupuesto_id: presupuestoId, posicion: k + 1, concepto: l.concepto, cantidad: conImporte ? 1 : null, precio: l.importe, base: l.importe,
    iva_porcentaje: conImporte ? IVA : null, irpf_porcentaje: conImporte ? 0 : null, total: l.importe,
  };
}

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
  if (!d) throw new Error("No existe esa oportunidad.");
  const elegidas = d.hojas.filter((h) => g.hojaIds.includes(h.id));
  if (g.hojaIds.length !== elegidas.length) throw new Error("Alguna hoja marcada no es de esta oportunidad.");
  const lineas = lineasDelPresupuesto(elegidas, d.direccion);
  if (!g.borrador) {
    if (!elegidas.length) throw new Error("Marca al menos una hoja de encargo.");
    if (!lineas.some((l) => (l.importe ?? 0) > 0)) throw new Error("Las hojas marcadas no tienen nada que se cobre.");
    if (!g.cliente.nombre.trim()) throw new Error("Falta el nombre del cliente.");
  }
  const t = totales(lineas);
  const limpio = (s: string) => s.trim() || null;
  const fila = {
    origen: "app",
    empresa_emisora: "accesalia",
    serie: "PR",
    estado: "borrador",
    pagador_tipo: d.pagador?.tipo ?? null,
    pagador_id: d.pagador?.id ?? null,
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
      lineas.map((l, k) => filaDeLinea(id!, k, l)),
    );
  if (elegidas.length)
    await crear("presupuesto_hojas", elegidas.map((h) => ({ presupuesto_id: id, he_version_id: h.id })));

  if (g.borrador) return { id: id!, codigo: null };
  return emitir(id!, g.cliente, g.formaPago, lineas);
}

/** 3 · el numero, la fecha y el PDF. El PDF, lo ultimo: es lo que lo congela.
 *  Si algo falla antes, se queda en borrador con su numero ya dado, y el
 *  siguiente "generar" lo reutiliza. */
async function emitir(id: string, cliente: Cliente, formaPago: FormaPago, lineas: { concepto: string; importe: number | null }[]): Promise<{ id: string; codigo: string }> {
  const t = totales(lineas as Parameters<typeof totales>[0]);
  const codigo = await codigoDe(id);
  const fecha = hoy();
  const pdf = await pdfDePresupuesto({ codigo, fecha, cliente, formaPago, lineas: lineas as Parameters<typeof totales>[0], ...t });
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
  return { id, codigo };
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
  const pdf = new Uint8Array(await r.arrayBuffer());
  return {
    // Si la app lo firmo (el ok a la oferta), sale el firmado.
    pdf: (await firmadoDe(pdf)) ?? pdf,
    oportunidadId: p.oportunidad_id,
    nombre: `Presupuesto ${p.codigo} ${p.pagador_nombre ?? ""}.pdf`.replace(/\s+/g, " "),
  };
}

// ------------------------------------------------- el de una hoja del sistema nuevo (Monica, 25-oct-2026)
// Al «Generar» la hoja, su presupuesto se monta solo, desde sus lineas (he_lineas_compromisos), con el mismo motor, y va
// con ella al ok de Daniel en BORRADOR (sin numero: un borrador no gasta numero). Con el ok se rehace con la fecha de
// emision y se le dan numero y PDF. Una version de hoja = un presupuesto (presupuestos.he_version_id).

type LineaHe = {
  id: string; padre_id: string | null; se_cobra: boolean; en_papel: boolean; importe: number | null; porcentaje: number | null; texto: string | null; desglosar_precios: boolean | null;
  bloque: { codigo: string; nombre_corto: string | null; nombre: string } | null; desglose: { nombre: string } | null;
};

/** Lo que entra en el motor de una version: lo que se cobra (el conjunto con «solo el total», como una linea con la
 *  suma) y lo incluido que sale en el papel (las filas sin nada colgando: las cabeceras no son conceptos). */
function hojaMotorDe(versionId: string, codigo: string | null, fecha: string, ls: LineaHe[]): HojaMotor {
  const hijos = (id: string) => ls.filter((l) => l.padre_id === id);
  const porId = new Map(ls.map((l) => [l.id, l]));
  const nombre = (l: LineaHe) =>
    (l.texto ?? "").trim() || `${l.bloque?.nombre_corto ?? l.bloque?.nombre ?? "Concepto"}${l.desglose ? ` de ${l.desglose.nombre.toLowerCase()}` : ""}`;
  const enSoloTotal = (l: LineaHe) => {
    const p = l.padre_id ? porId.get(l.padre_id) : null;
    return !!p && p.bloque?.codigo === "PROYECTO CONJUNTO" && p.desglosar_precios === false;
  };
  const cobra = ls
    .filter((l) => l.se_cobra && !enSoloTotal(l))
    .map((l) => {
      const conjunto = l.bloque?.codigo === "PROYECTO CONJUNTO" && l.desglosar_precios === false;
      const importe = conjunto ? hijos(l.id).reduce((t, h) => t + (Number(h.importe) || 0), 0) : l.importe == null ? null : Number(l.importe);
      return { nombre: nombre(l), importe, pct: l.porcentaje == null ? null : Number(l.porcentaje), lineaId: null };
    });
  const incluidos = ls.filter((l) => l.en_papel && ((!l.se_cobra && !hijos(l.id).length) || (l.se_cobra && enSoloTotal(l)))).map(nombre);
  return { id: versionId, codigo, versionId, fecha, fechaFirma: null, cobra, incluidos };
}

/** Monta (o rehace) el presupuesto en borrador de una version de hoja. Devuelve su id, o null si la hoja no tiene nada
 *  que se cobre con importe (entonces no hay presupuesto). */
export async function presupuestoDeVersion(versionId: string, fecha: string = hoy()): Promise<string | null> {
  const [v] = await leer<{
    id: string; codigo_he: string | null; numero_version: number; oportunidad_id: string; pagador_tipo: "comunidad" | "contrata" | "persona";
    pagador_comunidad_id: string | null; pagador_contrata_id: string | null; pagador_persona_id: string | null;
    comunidad: { id: string; nombre: string; cif_comunidad: string | null; domicilio_fiscal: string | null; cp: string | null; municipio: string | null; provincia: string | null } | null;
    contrata: { id: string; nombre: string; cif: string | null; domicilio_fiscal: string | null } | null;
    persona: { id: string; nombre: string; apellidos: string | null } | null;
    opp: { id: string; codigo: string | null; nombre: string | null } | null;
  }[]>(
    `he_versiones_hoja?select=id,codigo_he,numero_version,oportunidad_id,pagador_tipo,pagador_comunidad_id,pagador_contrata_id,pagador_persona_id,` +
      `comunidad:pagador_comunidad_id(id,nombre,cif_comunidad,domicilio_fiscal,cp,municipio,provincia),contrata:pagador_contrata_id(id,nombre,cif,domicilio_fiscal),` +
      `persona:pagador_persona_id(id,nombre,apellidos),opp:oportunidad_id(id,codigo,nombre)&id=eq.${versionId}`,
  );
  if (!v || !v.opp) throw new Error("No encuentro esa hoja.");
  const ls = await leer<LineaHe[]>(
    `he_lineas_compromisos?select=id,padre_id,se_cobra,en_papel,importe,porcentaje,texto,desglosar_precios,bloque:bloque_id(codigo,nombre_corto,nombre),desglose:desglose_id(nombre)` +
      `&version_id=eq.${versionId}&order=creado_en.asc`,
  );
  const direccion = nombreDeOpp(v.opp);
  const lineas = lineasDelPresupuesto([hojaMotorDe(versionId, v.codigo_he ? `${v.codigo_he} v${v.numero_version}` : null, fecha, ls)], direccion);
  // Fuera el borrador anterior de esta version (sus lineas caen con el): el presupuesto es el de la hoja tal como va.
  await pedir(`presupuestos?he_version_id=eq.${versionId}&url_pdf=is.null`, { method: "DELETE" });
  if (!lineas.some((l) => (l.importe ?? 0) > 0)) return null;

  // Quien paga, el de la hoja; la forma de cobro, la de sus condiciones (comunidad y particular: cargo en cuenta).
  const vacio: Cliente = { nombre: "", nif: "", domicilio: "", cp: "", poblacion: "", provincia: "" };
  const c = v.comunidad;
  const cliente: Cliente =
    v.pagador_tipo === "contrata" && v.contrata
      ? { ...vacio, nombre: v.contrata.nombre, nif: v.contrata.cif ?? "", domicilio: v.contrata.domicilio_fiscal ?? "" }
      : v.pagador_tipo === "persona" && v.persona
        ? { ...vacio, nombre: [v.persona.nombre, v.persona.apellidos].filter(Boolean).join(" ") }
        : c
          ? { nombre: c.nombre, nif: c.cif_comunidad ?? "", domicilio: c.domicilio_fiscal ?? direccion.replace(/,\s*[^,]*$/, ""), cp: c.cp ?? "", poblacion: c.municipio ?? "", provincia: c.provincia ?? "" }
          : vacio;
  let formaPago: FormaPago = "cargo_en_cuenta";
  if (v.pagador_tipo === "contrata" && v.pagador_contrata_id) {
    const [cc] = await leer<{ forma_cobro: string | null }[]>(`condiciones_cobro?select=forma_cobro&contrata_id=eq.${v.pagador_contrata_id}&activa=is.true&limit=1`);
    formaPago = /cargo/i.test(cc?.forma_cobro ?? "") ? "cargo_en_cuenta" : "transferencia";
  }
  const t = totales(lineas);
  const limpio = (x: string) => x.trim() || null;
  const [{ id }] = await crear<{ id: string }>("presupuestos", {
    origen: "app", empresa_emisora: "accesalia", serie: "PR", estado: "borrador",
    pagador_tipo: v.pagador_tipo, pagador_id: v.pagador_comunidad_id ?? v.pagador_contrata_id ?? v.pagador_persona_id,
    pagador_nombre: limpio(cliente.nombre), pagador_nif: limpio(cliente.nif), pagador_domicilio: limpio(cliente.domicilio),
    pagador_cp: limpio(cliente.cp), pagador_poblacion: limpio(cliente.poblacion), pagador_provincia: limpio(cliente.provincia),
    forma_pago: formaPago, base: t.base, iva_desglose: [{ tipo: IVA, base: t.base, cuota: t.cuota }], irpf_porcentaje: 0, irpf_importe: 0, total: t.total,
    oportunidad_id: v.oportunidad_id, he_version_id: versionId,
  });
  await crear(
    "presupuesto_lineas",
    lineas.map((l, k) => filaDeLinea(id, k, l)),
  );
  return id;
}

type PresupuestoBorrador = { id: string; cliente: Cliente; formaPago: FormaPago; lineas: { concepto: string; importe: number | null }[] };
async function borradorDeVersion(versionId: string): Promise<PresupuestoBorrador | null> {
  const [p] = await leer<{
    id: string; forma_pago: FormaPago | null; pagador_nombre: string | null; pagador_nif: string | null; pagador_domicilio: string | null; pagador_cp: string | null;
    pagador_poblacion: string | null; pagador_provincia: string | null; lineas: { posicion: number; concepto: string | null; precio: number | null }[];
  }[]>(
    `presupuestos?select=id,forma_pago,pagador_nombre,pagador_nif,pagador_domicilio,pagador_cp,pagador_poblacion,pagador_provincia,lineas:presupuesto_lineas(posicion,concepto,precio)` +
      `&he_version_id=eq.${versionId}&url_pdf=is.null&limit=1`,
  );
  if (!p) return null;
  return {
    id: p.id,
    formaPago: p.forma_pago ?? "cargo_en_cuenta",
    cliente: { nombre: p.pagador_nombre ?? "", nif: p.pagador_nif ?? "", domicilio: p.pagador_domicilio ?? "", cp: p.pagador_cp ?? "", poblacion: p.pagador_poblacion ?? "", provincia: p.pagador_provincia ?? "" },
    lineas: [...p.lineas].sort((a, b) => a.posicion - b.posicion).map((l) => ({ concepto: l.concepto ?? "", importe: l.precio == null ? null : Number(l.precio) })),
  };
}

/** Con el ok de Daniel: el presupuesto se rehace con la fecha de emision de la hoja y se le dan numero y PDF. */
export async function emitirPresupuestoDeVersion(versionId: string, fecha: string): Promise<{ id: string; codigo: string } | null> {
  if (!(await presupuestoDeVersion(versionId, fecha))) return null;
  const b = await borradorDeVersion(versionId);
  return b ? emitir(b.id, b.cliente, b.formaPago, b.lineas) : null;
}

/** El PDF del presupuesto de una version: el emitido (el firmado, si lo hay) o, mientras espera el ok, una vista
 *  previa sin numero. */
export async function pdfPresupuestoDeVersion(versionId: string): Promise<Uint8Array | null> {
  const [hecho] = await leer<{ id: string }[]>(`presupuestos?select=id&he_version_id=eq.${versionId}&url_pdf=not.is.null&order=generado_en.desc&limit=1`);
  if (hecho) return (await pdfGuardado(hecho.id))?.pdf ?? null;
  const b = await borradorDeVersion(versionId);
  if (!b) return null;
  const t = totales(b.lineas as Parameters<typeof totales>[0]);
  return new Uint8Array(await pdfDePresupuesto({ codigo: "sin número (pendiente del ok)", fecha: hoy(), cliente: b.cliente, formaPago: b.formaPago, lineas: b.lineas as Parameters<typeof totales>[0], ...t }));
}
