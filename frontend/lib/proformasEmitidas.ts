import "server-only";
// lib/proformasEmitidas.ts
//
// COBRAR › PROFORMAS EMITIDAS (Monica, 25-oct-2026; maqueta validada docs/figma/proformas-emitidas.html). Cada proforma
// hasta que es factura: a quien se envio, si ha dado el ok (el correo pegado) y si ya esta en Factusol como PEDIDO con
// el mismo numero. El orden de Monica: se emite la proforma y se envia en el momento, por correo y a Factusol; con el ok,
// en Factusol se pasa a factura y se hace el cargo. Las de contrata no esperan el ok.
// «Enviar a Factusol» no toca la base de Factusol: genera los ficheros de su importacion (lib/factusol/importar.ts) en
// una carpeta con el nombre del asunto del correo, al Dropbox si la app tiene acceso y, si no, en un zip; y guarda una
// copia junto a la proforma. Antes comprueba que el numero este libre en Factusol (lo que copia la pasada de cada
// noche, factusol_pedidos), el NIF, el codigo de cliente y la forma de pago.

import type { Yo } from "./sesion";
import { nombreDeOpp } from "./direccionOpp";
import { hitosProformables, leerProforma, type Empresa, type Proforma } from "./proformas";
import { puedeVerLibro, type Libro } from "./cobros";
import { ficherosPedido, nombreCarpeta, zipCarpeta, type PedidoFactusol } from "./factusol/importar";
import { hayAccesoDropbox, subirFichero } from "./dropboxApi";
import { SEL_FICHA_HOJA, adaptarFichas } from "./hojasNuevas";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
async function pedir(path: string, init?: RequestInit) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...CAB, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r;
}
async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const x = (await (await pedir(path, { headers: { Range: `${d}-${d + 999}` } })).json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);
const SERIE_PEDIDO = 1; // los pedidos de cliente de la app van en la serie 1, como los de Alexandra
/** La carpeta de las importaciones en el Dropbox, junto a los datos de Factusol. */
export const CARPETA_IMPORTAR = "/D SM/factusol/Factusol – importar";
const ALMACEN = "facturas";
const EMPRESAS_DE: Record<Libro, Empresa[]> = { accesalia: ["accesalia", "daniel"], ecobalance: ["ecobalance"] };

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
function laborablesDesde(iso: string): number {
  let n = 0;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  const fin = new Date(`${hoyISO()}T12:00:00Z`);
  while (d < fin) { d.setUTCDate(d.getUTCDate() + 1); const s = d.getUTCDay(); if (s !== 0 && s !== 6) n++; }
  return n;
}

// ------------------------------------------------------------ la lista

export type FilaEmitida = {
  id: string; codigo: string; numero: number; anio: number; empresa: Empresa; fecha: string; oppId: string | null; direccion: string; paga: string; total: number;
  contrata: boolean; notas: string | null;
  enviada: { en: string; para: string[] } | null;
  ok: { en: string; correo: string | null } | null;
  sinRespuesta: boolean;
  /** Su pedido en Factusol: enviado desde la app, o ya estaba (las volcadas). */
  pedido: { como: "enviado" | "ya_estaba"; texto: string } | null;
  /** El numero lo usa OTRO pedido en Factusol (otro importe u otra direccion). */
  choque: string | null;
};

type FilaP = {
  id: string; codigo: string; numero: number; anio: number; empresa: Empresa; fecha: string; oportunidad_id: string | null; pagador_nombre: string; total: number;
  notas: string | null; se_puede_cobrar_en: string | null; ok_correo: string | null; factusol_en: string | null;
  opp: { nombre: string | null; codigo: string | null } | null;
  lineas: { hitos: { hito: { linea: { pagador_tipo: string | null; hoja: { pagador_tipo: string | null } | null } | null } | null }[] }[];
};

export async function proformasEmitidas(libro: Libro): Promise<FilaEmitida[]> {
  const filas = await leer<FilaP>(
    "proformas?select=id,codigo,numero,anio,empresa,fecha,oportunidad_id,pagador_nombre,total,notas,se_puede_cobrar_en,ok_correo,factusol_en," +
      `opp:oportunidad_id(nombre,codigo),lineas:proforma_lineas(hitos:proforma_linea_hitos(hito:hito_cobro_id(linea:linea_facturacion_id(pagador_tipo,${SEL_FICHA_HOJA}))))` +
      `&estado=eq.emitida&factura_id=is.null&empresa=in.(${EMPRESAS_DE[libro].join(",")})&order=numero.desc`,
  ).then(adaptarFichas);
  if (!filas.length) return [];
  const anios = [...new Set(filas.map((f) => f.anio))];
  const [pedidos, envios] = await Promise.all([
    leer<{ empresa: Empresa; anio: number; numero: number; referencia: string | null; total: number }>(
      `factusol_pedidos?select=empresa,anio,numero,referencia,total&serie=eq.${SERIE_PEDIDO}&anio=in.(${anios.join(",")})&empresa=in.(${EMPRESAS_DE[libro].join(",")})`,
    ),
    Promise.all(filas.map((f) =>
      leer<{ creado_en: string; para: string[] }>(
        `correos_enviados?select=creado_en,para&ok=is.true&documentos=cs.${encodeURIComponent(JSON.stringify([{ tipo: "Proforma", id: f.id }]))}&order=creado_en.asc&limit=1`,
      ).then((x) => x[0] ?? null).catch(() => null),
    )),
  ]);
  const pedidoDe = new Map(pedidos.map((p) => [`${p.empresa}|${p.anio}|${p.numero}`, p]));
  return filas.map((f, i) => {
    const contrata = f.lineas.some((l) => l.hitos.some((h) => (h.hito?.linea?.pagador_tipo ?? h.hito?.linea?.hoja?.pagador_tipo) === "contrata"));
    const pf = pedidoDe.get(`${f.empresa}|${f.anio}|${f.numero}`);
    const cuadra = pf && Math.abs(Number(pf.total) - Number(f.total)) < 0.01;
    const enviada = envios[i] ? { en: envios[i]!.creado_en, para: envios[i]!.para } : null;
    return {
      id: f.id, codigo: f.codigo, numero: f.numero, anio: f.anio, empresa: f.empresa, fecha: f.fecha, oppId: f.oportunidad_id,
      direccion: f.opp ? nombreDeOpp(f.opp) : "—", paga: f.pagador_nombre, total: Number(f.total), contrata, notas: f.notas,
      enviada,
      ok: f.se_puede_cobrar_en ? { en: f.se_puede_cobrar_en, correo: f.ok_correo } : null,
      sinRespuesta: !contrata && !f.se_puede_cobrar_en && !!enviada && laborablesDesde(enviada.en) > 3,
      pedido: f.factusol_en
        ? { como: "enviado", texto: `pedido ${SERIE_PEDIDO}/${f.numero}` }
        : cuadra ? { como: "ya_estaba", texto: `pedido ${SERIE_PEDIDO}/${f.numero}` } : null,
      choque: !f.factusol_en && pf && !cuadra ? `El pedido ${SERIE_PEDIDO}/${f.numero} de Factusol es otro: «${pf.referencia ?? "sin referencia"}», ${Number(pf.total).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €.` : null,
    };
  });
}

// ------------------------------------------------------------ ok y nota

export async function guardarOk(yo: Yo, id: string, correo: string, fecha: string): Promise<void> {
  const p = await deMiLibro(yo, id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("La fecha del ok no es válida.");
  if (!correo.trim()) throw new Error("Pega el correo del ok.");
  await pedir(`proformas?id=eq.${p.id}`, {
    method: "PATCH",
    body: JSON.stringify({ se_puede_cobrar_en: `${fecha}T12:00:00Z`, se_puede_cobrar_por: yo.id, ok_correo: correo.trim() }),
  });
}
export async function guardarNota(yo: Yo, id: string, nota: string): Promise<void> {
  const p = await deMiLibro(yo, id);
  await pedir(`proformas?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ notas: nota.trim() || null }) });
}
async function deMiLibro(yo: Yo, id: string): Promise<Proforma> {
  const p = uuid(id) ? await leerProforma(id) : null;
  if (!p) throw new Error("Esa proforma no existe.");
  if (!puedeVerLibro(yo, p.empresa === "ecobalance" ? "ecobalance" : "accesalia")) throw new Error("Esta proforma es del otro libro de facturación.");
  return p;
}

// ------------------------------------------------------------ ENVIAR A FACTUSOL

export type Comprobacion = { ok: boolean; que: string; texto: string; enlace?: string };
export type ParaFactusol = { comprobaciones: Comprobacion[]; listo: boolean; carpeta: string; ficheros: string[]; clienteNuevo: boolean; dropbox: boolean; leido: string | null };

type Plan = ParaFactusol & { pedido: PedidoFactusol | null };

async function planFactusol(p: Proforma): Promise<Plan> {
  const c: Comprobacion[] = [];
  const empresa = p.empresa;
  // 1. El numero: el mismo que la proforma, y libre en Factusol (o ya es este mismo pedido).
  const [pf] = await leer<{ referencia: string | null; total: number; leido_en: string }>(
    `factusol_pedidos?select=referencia,total,leido_en&empresa=eq.${empresa}&anio=eq.${p.fecha.slice(0, 4)}&serie=eq.${SERIE_PEDIDO}&numero=eq.${p.numero}`,
  );
  const [ultima] = await leer<{ leido_en: string }>(`factusol_pedidos?select=leido_en&empresa=eq.${empresa}&order=leido_en.desc&limit=1`);
  const leido = ultima?.leido_en ?? null;
  if (pf && Math.abs(Number(pf.total) - p.total) < 0.01) c.push({ ok: false, que: "Número del pedido", texto: `Ya está en Factusol: el pedido ${SERIE_PEDIDO}/${p.numero} es esta misma proforma. No hace falta enviarla.` });
  else if (pf) c.push({ ok: false, que: "Número del pedido", texto: `El ${SERIE_PEDIDO}/${p.numero} lo usa OTRO pedido en Factusol: «${pf.referencia ?? "sin referencia"}», ${Number(pf.total).toLocaleString("es-ES", { minimumFractionDigits: 2 })} €. Hay que aclararlo antes de enviar nada.` });
  else c.push({ ok: true, que: "Número del pedido", texto: `${SERIE_PEDIDO}/${p.numero}: el mismo que la proforma, y libre en Factusol${leido ? "" : " (aún no se ha leído Factusol: no se puede asegurar)"}` });

  // 2. El NIF del cliente.
  c.push(p.pagador.nif ? { ok: true, que: "NIF del cliente", texto: p.pagador.nif } : { ok: false, que: "NIF del cliente", texto: "Falta: ponlo en su ficha antes de enviarla." });

  // 3. El codigo de cliente en Factusol: por la comunidad o la contrata que paga, si no por el NIF; si no esta, uno nuevo.
  const ids = p.lineas.flatMap((l) => l.hitos.map((h) => h.id)).filter(uuid);
  const hp = ids.length ? (await hitosProformables(ids))[0] : null;
  const pag = hp?.pagador ?? null;
  const filtroPag = pag?.tipo === "comunidad" ? `comunidad_id=eq.${pag.id}` : pag?.tipo === "contrata" ? `contrata_id=eq.${pag.id}` : null;
  const nif = (p.pagador.nif ?? "").replace(/[\s.-]/g, "").toUpperCase();
  const [porPag] = filtroPag ? await leer<{ codigo: number }>(`factusol_clientes?select=codigo&empresa=eq.${empresa}&${filtroPag}&limit=1`) : [];
  const [porNif] = !porPag && nif ? await leer<{ codigo: number }>(`factusol_clientes?select=codigo&empresa=eq.${empresa}&nif=eq.${nif}&limit=1`) : [];
  let codigo = porPag?.codigo ?? porNif?.codigo ?? null;
  const nuevo = codigo == null;
  if (nuevo) {
    // El siguiente libre: ni en Factusol ni dado ya por la app a otro cliente nuevo que aun no se haya importado.
    const [maxF] = await leer<{ codigo: number }>(`factusol_clientes?select=codigo&empresa=eq.${empresa}&order=codigo.desc&limit=1`);
    const [maxA] = await leer<{ factusol_cliente: number }>(`proformas?select=factusol_cliente&empresa=eq.${empresa}&factusol_cliente=not.is.null&order=factusol_cliente.desc&limit=1`);
    codigo = Math.max(maxF?.codigo ?? 0, maxA?.factusol_cliente ?? 0) + 1;
    c.push({ ok: true, que: "Cliente en Factusol", texto: `No está (ni por ${pag?.tipo === "contrata" ? "la contrata" : "la comunidad"} ni por NIF): se da de alta con el código ${codigo}, el siguiente libre. ¿Seguro que no está ya con otro nombre?`, enlace: "/gestiones/clientes-factusol" });
  } else c.push({ ok: true, que: "Cliente en Factusol", texto: `código ${codigo}${porPag ? "" : ", casado por NIF"}` });

  // 4. La forma de pago, con su codigo en esa empresa.
  const forma = p.formaCobro ?? (pag?.tipo === "contrata" ? "transferencia" : "cargo_cuenta");
  const [fc] = await leer<{ codigo: string }>(`factusol_formas_cobro?select=codigo&empresa=eq.${empresa}&forma_cobro=eq.${forma}`);
  c.push(fc ? { ok: true, que: "Forma de pago", texto: `${forma === "cargo_cuenta" ? "cargo en cuenta" : forma} · código ${fc.codigo}` } : { ok: false, que: "Forma de pago", texto: `${forma}: no tiene código en Factusol para esta empresa.` });

  // La carpeta: el asunto del primer correo con que se envio; si no, la direccion y el codigo.
  const [env] = await leer<{ asunto: string }>(
    `correos_enviados?select=asunto&ok=is.true&documentos=cs.${encodeURIComponent(JSON.stringify([{ tipo: "Proforma", id: p.id }]))}&order=creado_en.asc&limit=1`,
  );
  const carpeta = nombreCarpeta(env?.asunto || `${(p.opp?.nombre ?? p.pagador.nombre).toUpperCase()} – ${p.codigo}`);
  const listo = c.every((x) => x.ok);
  let pedido: PedidoFactusol | null = null;
  if (listo) {
    let dom = { domicilio: p.pagador.domicilio ?? "", poblacion: "", cp: "", provincia: "" };
    if (pag?.tipo === "comunidad") {
      const [cm] = await leer<{ direccion: string | null; domicilio_fiscal: string | null; municipio: string | null; cp: string | null; provincia: string | null }>(
        `comunidades?select=direccion,domicilio_fiscal,municipio,cp,provincia&id=eq.${pag.id}`,
      );
      if (cm) dom = { domicilio: cm.domicilio_fiscal || cm.direccion || dom.domicilio, poblacion: cm.municipio ?? "", cp: cm.cp ?? "", provincia: cm.provincia ?? "" };
    }
    const [fcCli] = await leer<{ codigo: string }>(`factusol_formas_cobro?select=codigo&empresa=eq.${empresa}&forma_cobro=eq.${pag?.tipo === "contrata" ? "transferencia" : "cargo_cuenta"}`);
    pedido = {
      serie: SERIE_PEDIDO, numero: p.numero, referencia: carpeta, fecha: p.fecha,
      cliente: { codigo: codigo!, nif, nombre: p.pagador.nombre, ...dom, nuevo },
      lineas: p.lineas.map((l) => ({ concepto: l.concepto, base: l.base })),
      base: p.base, ivaPct: p.ivaPct, iva: p.iva, irpfPct: p.irpfPct, irpf: p.irpf, total: p.total,
      formaPago: fc!.codigo, formaPagoCliente: fcCli?.codigo ?? fc!.codigo, observaciones: p.codigo,
    };
  }
  return {
    comprobaciones: c, listo, carpeta, clienteNuevo: nuevo, dropbox: await hayAccesoDropbox(), leido,
    ficheros: [...(nuevo ? ["CLI.xls · el cliente nuevo"] : []), "PCL.xls · el pedido", "LPC.xls · sus líneas"], pedido,
  };
}

export async function paraFactusol(yo: Yo, id: string): Promise<ParaFactusol> {
  const p = await deMiLibro(yo, id);
  const { pedido: _p, ...resto } = await planFactusol(p);
  void _p;
  return resto;
}

/** Genera los ficheros, los deja en el Dropbox (si hay acceso) y guarda el zip junto a la proforma. La marca enviada. */
export async function enviarAFactusol(yo: Yo, id: string): Promise<{ dropbox: boolean; carpeta: string }> {
  const p = await deMiLibro(yo, id);
  if (p.estado === "anulada") throw new Error("Está anulada: no se envía a Factusol.");
  if (p.factusol) throw new Error("Ya se envió a Factusol.");
  const plan = await planFactusol(p);
  if (!plan.listo || !plan.pedido) throw new Error(plan.comprobaciones.filter((x) => !x.ok).map((x) => x.texto).join(" "));
  const ficheros = ficherosPedido(plan.pedido);
  const leeme =
    `Proforma ${p.codigo} = pedido ${SERIE_PEDIDO}/${p.numero} de Factusol.\r\n` +
    `En Factusol: Utilidades > Importaciones > Ficheros .XLS, y elegir la carpeta «${plan.carpeta}».\r\n` +
    (plan.clienteNuevo ? `Incluye el cliente nuevo (código ${plan.pedido.cliente.codigo}).\r\n` : "");
  const zip = zipCarpeta(plan.carpeta, ficheros, leeme);
  // La copia, junto a la proforma; la ruta del almacen, sin acentos (el nombre de la carpeta va en la proforma).
  const ruta = rutaCopia(p);
  const r = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${ruta}`, {
    method: "POST", headers: { ...CAB, "Content-Type": "application/zip", "x-upsert": "true" }, body: zip as unknown as BodyInit,
  });
  if (!r.ok) throw new Error(`No se ha podido guardar la copia: ${r.status} ${await r.text()}`);
  let dropbox = false;
  if (await hayAccesoDropbox()) {
    for (const [n, f] of Object.entries(ficheros)) await subirFichero(`${CARPETA_IMPORTAR}/${plan.carpeta}/${n}`, f);
    dropbox = true;
  }
  await pedir(`proformas?id=eq.${p.id}&factusol_en=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ factusol_en: new Date().toISOString(), factusol_por: yo.id, factusol_carpeta: plan.carpeta, factusol_cliente: plan.pedido.cliente.codigo }),
  });
  return { dropbox, carpeta: plan.carpeta };
}

/** El zip guardado de una proforma (para descargarlo). */
export async function zipGuardado(yo: Yo, id: string): Promise<{ nombre: string; contenido: ArrayBuffer } | null> {
  const p = await deMiLibro(yo, id);
  if (!p.factusol) return null;
  const r = await fetch(`${URL_BASE}/storage/v1/object/${ALMACEN}/${rutaCopia(p)}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) return null;
  return { nombre: `${p.factusol.carpeta ?? p.codigo}.zip`, contenido: await r.arrayBuffer() };
}
const rutaCopia = (p: Proforma) => `factusol/${p.empresa}/${p.fecha.slice(0, 4)}/pedido-${SERIE_PEDIDO}-${p.numero}.zip`;
