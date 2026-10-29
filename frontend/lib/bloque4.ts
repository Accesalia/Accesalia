import "server-only";
// lib/bloque4.ts
//
// BLOQUE 4 · EL DINERO Y EL ENCARGO HASTA EL FINAL (Monica, 29-oct-2026; maqueta «me encanta»
// docs/figma/bloque4-rastro-dinero.html). Dos objetivos, sus palabras: rastrear el dinero y contestar «¿que hay de lo
// mio?» cuando la comunidad llama al comercial. Todo sale de lo que ya existe:
//   - los cobros, hito a hito, del calculo de comisiones (comisionesDe, solo esta opp): solo lo de Accesalia y Daniel,
//     NUNCA lo que se cobra a la contrata (Ecobalance);
//   - el comercial ve el RESULTADO, no el papel: emitida (proforma enviada) / atascada (3 dias laborables sin ok) /
//     cobrada y su fecha. Ni la factura ni el justificante: eso es de facturacion;
//   - las fases de cada hoja: 1 en facturacion (ok del comercial) · 2 cobro pedido (el correo con la proforma) ·
//     3 primera parte cobrada (el justificante del primer hito) · 4 en produccion (la mete la secretaria);
//   - la nube, de nubes_puntos. Lo demas de produccion (visado, licencia, obra) aun no esta en la app.

import { comisionesDe, type HitoComision } from "./comisionesComercial";
import { estadosDeHojas, nombreArea } from "./recorridoHoja";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T[]> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return (await r.json()) as T[];
}

// ------------------------------------------------------------ los puntos del encargo

/** Los puntos del encargo, en su orden, con los momentos de cobro que caen en cada uno. Los textos de «que pasa
 *  aqui», «cuanto suele tardar» y «que falta» son BORRADOR para que Monica los corrija. */
export const PUNTOS = [
  {
    k: "contratar", tipos: ["encargo", "firma"], t: "Al contratar", hecho: "Firmada y pagada la provisión",
    que: "Firman la hoja de encargo y pagan la provisión de fondos; con eso empezamos a trabajar.",
    tarda: "Al firmar.", falta: "De ellos: el pago de la provisión de fondos.",
  },
  {
    k: "entrega", tipos: ["entrega"], t: "Entrega del proyecto", hecho: "Proyecto entregado",
    que: "El técnico redacta el proyecto con la toma de datos; cuando está terminado se lo entregamos.",
    tarda: "Un proyecto suele llevar de 4 a 8 semanas desde la toma de datos.", falta: "De ellos, nada, salvo algún dato que les pidamos.",
  },
  {
    k: "presentacion", tipos: ["presentacion"], t: "Presentación de la subvención", hecho: "Subvención presentada",
    que: "Presentamos la solicitud de la subvención en su convocatoria.",
    tarda: "Depende de cuándo se abra la convocatoria.", falta: "De ellos: la documentación que les pidamos (actas, certificados…).",
  },
  {
    k: "licencia", tipos: ["licencia"], t: "Visado y licencia", hecho: "Licencia",
    que: "El Colegio visa el proyecto y con el visado pedimos la licencia (o presentamos la declaración responsable) al Ayuntamiento o a la ECU.",
    tarda: "Visado: de 2 a 4 semanas. Licencia: según el Ayuntamiento, de 1 a 6 meses.", falta: "De ellos: pagar las tasas cuando lleguen.",
  },
  {
    k: "obra", tipos: ["pss", "inicio_obra"], t: "Plan de seguridad · inicio de obra", hecho: "Obra iniciada",
    que: "Con la licencia y la contrata elegida, firmamos el plan de seguridad y empieza la obra.",
    tarda: "Depende de cuándo elijan contrata y de su calendario.", falta: "De ellos: elegir contrata y firmar con ella.",
  },
  {
    k: "fin", tipos: ["cfo", "fin_obra"], t: "Fin de obra", hecho: "Obra acabada",
    que: "Acaba la obra y firmamos el certificado final de obra.", tarda: "Una obra de ascensor suele llevar de 2 a 4 meses.", falta: "De ellos, nada.",
  },
  {
    k: "concesion", tipos: ["concesion"], t: "Concesión de la subvención", hecho: "Subvención concedida",
    que: "Resuelven la subvención; cobramos nuestra parte cuando la ingresan a la comunidad.",
    tarda: "Depende de la convocatoria: suelen ser meses.", falta: "De ellos: avisarnos cuando les llegue el ingreso.",
  },
  {
    k: "adjudicacion", tipos: ["adjudicacion"], t: "Adjudicación de la obra", hecho: "Obra adjudicada",
    que: "La comunidad adjudica la obra a una contrata.", tarda: "Depende de la junta.", falta: "De ellos: decidirlo en junta.",
  },
  { k: "otro", tipos: ["otro"], t: "Otro plazo", hecho: "Otro plazo", que: "Un plazo propio de esta hoja: lo dice el cobro.", tarda: "—", falta: "—" },
] as const;
export type ClavePunto = (typeof PUNTOS)[number]["k"];
const puntoDe = (tipo: string): ClavePunto => PUNTOS.find((p) => (p.tipos as readonly string[]).includes(tipo))?.k ?? "otro";

// ------------------------------------------------------------ los tipos

/** Como esta un cobro, para el comercial: el resultado, no el papel. */
export type EstadoCobro = "por_pedir" | "emitida" | "atascada" | "ok" | "facturada" | "cobrada" | "devuelta" | "a_exito";
export type Cobro = {
  id: string; punto: ClavePunto; texto: string; importe: number | null; porcentaje: string | null; sub: boolean;
  estado: EstadoCobro; fecha: string | null; comision: number | null; devengada: boolean;
};
export type LineaCobro = { id: string; hojaId: string; que: string; detalle: string | null; importe: number; cobros: Cobro[] };
export type FaseHoja = { hecha: boolean; fecha: string | null; nota: string | null };
export type HojaDinero = {
  id: string; codigo: string | null; que: string; total: number; firma: string | null;
  fases: [FaseHoja, FaseHoja, FaseHoja, FaseHoja];
  pausa: { motivo: string | null; deEllos: boolean; desde: string } | null;
};
export type Punto = { k: ClavePunto; t: string; hecho: string; que: string; tarda: string; falta: string; estado: "hecho" | "ahora" | "luego" };
export type Dinero = {
  hojas: HojaDinero[];
  lineas: LineaCobro[];
  puntos: Punto[];
  /** La frase para el telefono y lo que falta de ellos. */
  frase: string;
  deEllos: string[];
  proximo: string | null;
  comision: { comercialId: string; comercial: string; pct: number | null; suya: number; devengada: number; falta: number; cobrado: number; fuera: string | null } | null;
  nube: { necesita: boolean | null; prevista: string | null; escaneado: string | null; lista: string | null } | null;
  produccion: { desde: string; areas: string[] } | null;
};

// ------------------------------------------------------------ el calculo

const r2 = (n: number) => Math.round(n * 100) / 100;
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: "always" });
const dia = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
function laborablesDesde(iso: string): number {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const fin = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  let n = 0;
  while (d < fin) { d.setUTCDate(d.getUTCDate() + 1); const s = d.getUTCDay(); if (s !== 0 && s !== 6) n++; }
  return n;
}
/** El nombre corto de una linea: lo de antes del primer parentesis o guion. */
const corta = (d: string) => d.split(/\s+[—–-]\s+|\s*\(|\n/)[0].trim();
const detalleDe = (d: string) => d.match(/\(([^)]*)\)/)?.[1]?.trim() ?? null;

export async function dineroDeOpp(oppId: string): Promise<Dinero | null> {
  if (!/^[0-9a-f-]{36}$/.test(oppId)) return null;
  const [opp] = await leer<{ comercial: { id: string; nombre: string; apellidos: string | null; comision_pct: number | null } | null }>(
    `oportunidades?select=comercial:comerciales!oportunidades_comercial_id_fkey(id,nombre,apellidos,comision_pct)&id=eq.${oppId}`,
  );
  const com = opp?.comercial ?? null;
  const [o] = await comisionesDe(
    { id: com?.id ?? "", nombre: com ? [com.nombre, com.apellidos].filter(Boolean).join(" ") : "", pct: com?.comision_pct == null ? null : Number(com.comision_pct), nota: null },
    oppId,
  );
  if (!o || !o.hojas.length) return null;
  const hojaIds = o.hojas.map((h) => h.id);
  const hitos = o.lineas.flatMap((l) => l.hitos);
  const porPedir = hitos.filter((h) => h.estado === "pendiente_emitir").map((h) => h.id);

  const [estadosHoja, recorrido, enProforma, [nube]] = await Promise.all([
    leer<{ version_id: string; estado: string; fecha: string }>(`he_estados_hoja?select=version_id,estado,fecha&version_id=in.(${hojaIds.join(",")})&estado=in.(firmada_recibida,ok_comercial)&order=fecha`),
    estadosDeHojas(hojaIds),
    porPedir.length
      ? leer<{ hito_cobro_id: string; linea: { proforma: { id: string; estado: string; se_puede_cobrar_en: string | null } | null } | null }>(
          `proforma_linea_hitos?select=hito_cobro_id,linea:proforma_linea_id(proforma:proforma_id(id,estado,se_puede_cobrar_en))&hito_cobro_id=in.(${porPedir.join(",")})`,
        )
      : Promise.resolve([]),
    leer<{ necesita_nube: boolean | null; fecha_prevista_escaneo: string | null; escaneado_en: string | null; nube_lista_en: string | null }>(
      `nubes_puntos?select=necesita_nube,fecha_prevista_escaneo,escaneado_en,nube_lista_en&oportunidad_id=eq.${oppId}`,
    ).catch(() => []),
  ]);
  // La proforma de cada hito por pedir, y cuando se envio (el primer correo bueno): el cobro pedido.
  const proformaDe = new Map(enProforma.filter((x) => x.linea?.proforma?.estado === "emitida").map((x) => [x.hito_cobro_id, x.linea!.proforma!]));
  const pfs = [...new Map([...proformaDe.values()].map((p) => [p.id, p])).values()];
  const envio = new Map(
    await Promise.all(
      pfs.map(async (p) => {
        const [c] = await leer<{ creado_en: string }>(
          `correos_enviados?select=creado_en&ok=is.true&documentos=cs.${encodeURIComponent(JSON.stringify([{ tipo: "Proforma", id: p.id }]))}&order=creado_en.asc&limit=1`,
        ).catch(() => []);
        return [p.id, c?.creado_en ?? null] as const;
      }),
    ),
  );

  const cobroDe = (h: HitoComision): Cobro | null => {
    if (h.estado === "anulado") return null;
    let estado: EstadoCobro;
    let fecha: string | null = null;
    if (h.estado === "cobrada" || h.estado === "completado_sin_factura") { estado = "cobrada"; fecha = h.fechaCobro; }
    else if (h.estado === "emitida") estado = "facturada";
    else if (h.estado === "devuelta") estado = "devuelta";
    else if (h.estado === "a_exito") estado = "a_exito";
    else {
      const p = proformaDe.get(h.id);
      const enviada = p ? envio.get(p.id) ?? null : null;
      if (p?.se_puede_cobrar_en) { estado = "ok"; fecha = p.se_puede_cobrar_en; }
      else if (enviada) { estado = laborablesDesde(enviada) > 3 ? "atascada" : "emitida"; fecha = enviada; }
      else estado = "por_pedir";
    }
    return {
      id: h.id, punto: puntoDe(h.tipo), texto: h.texto, importe: h.importe, porcentaje: null, sub: h.sub,
      estado, fecha, comision: h.comision, devengada: h.devengada,
    };
  };
  const lineas: LineaCobro[] = o.lineas
    .map((l) => ({ id: l.id, hojaId: l.hojaId, que: corta(l.descripcion) || "Sin nombre", detalle: detalleDe(l.descripcion), importe: l.importe, cobros: l.hitos.map(cobroDe).filter((x): x is Cobro => !!x) }))
    .filter((l) => l.cobros.length);
  const todos = lineas.flatMap((l) => l.cobros);

  // LOS PUNTOS: solo los que tienen algun cobro. Hecho = ya se ha pedido o cobrado algo de ese punto (lo que dispara
  // el cobro ya paso); lo «a exito», solo si se cobro.
  const pasado = (c: Cobro) => (c.estado === "a_exito" ? false : c.estado !== "por_pedir");
  const conCobro = PUNTOS.filter((p) => todos.some((c) => c.punto === p.k));
  let ahora = false;
  const puntos: Punto[] = conCobro.map((p) => {
    const cs = todos.filter((c) => c.punto === p.k);
    const hecho = cs.some(pasado);
    const estado = hecho ? "hecho" : ahora ? "luego" : ((ahora = true), "ahora");
    return { k: p.k, t: p.t, hecho: p.hecho, que: p.que, tarda: p.tarda, falta: p.falta, estado };
  });

  // LAS FASES DE CADA HOJA
  const hojas: HojaDinero[] = o.hojas.map((h) => {
    const ok = estadosHoja.filter((e) => e.version_id === h.id && e.estado === "ok_comercial").at(-1)?.fecha ?? null;
    const suyos = lineas.filter((l) => l.hojaId === h.id).flatMap((l) => l.cobros);
    const pedidos = suyos.map((c) => (c.estado === "emitida" || c.estado === "atascada" ? c.fecha : null)).filter((x): x is string => !!x).sort();
    const pedido = suyos.some((c) => c.estado !== "por_pedir" && c.estado !== "a_exito");
    const primeros = suyos.filter((c) => c.punto === "contratar");
    const cobrados = primeros.length > 0 && primeros.every((c) => c.estado === "cobrada");
    const e = recorrido.get(h.id);
    return {
      id: h.id, codigo: h.codigo, que: h.que, total: h.total, firma: h.fecha,
      fases: [
        { hecha: !!ok, fecha: ok, nota: null },
        { hecha: pedido, fecha: pedidos[0] ?? null, nota: null },
        { hecha: cobrados, fecha: cobrados ? primeros.map((c) => c.fecha ?? "").sort().at(-1) || null : null, nota: null },
        { hecha: !!e?.metida, fecha: e?.metida?.en ?? null, nota: e?.metida ? e.areas.map(nombreArea).join(" · ") : null },
      ],
      pausa: e?.pausa ? { motivo: e.pausa.mov.motivo, deEllos: e.pausa.mov.tejado === "cliente", desde: e.pausa.mov.en } : null,
    };
  });

  // LA PRODUCCION: la metida mas antigua y sus areas.
  const metidas = [...recorrido.values()].filter((e) => e.metida);
  const produccion = metidas.length
    ? { desde: metidas.map((e) => e.metida!.en).sort()[0], areas: [...new Set(metidas.flatMap((e) => e.areas))].map(nombreArea) }
    : null;

  // ¿QUE HAY DE LO MIO? La frase para el telefono, de los datos.
  const hechos = puntos.filter((p) => p.estado === "hecho");
  const ya = puntos.find((p) => p.estado === "ahora");
  const partes: string[] = [];
  if (hechos.length) partes.push(`Ya está: ${hechos.map((p) => p.hecho.toLowerCase()).join(", ")}.`);
  else partes.push("La hoja está firmada y en manos de facturación.");
  if (produccion) partes.push(`En marcha desde el ${dia(produccion.desde)}: ${produccion.areas.join(", ")}.`);
  if (nube?.nube_lista_en) partes.push("La toma de datos (nube de puntos) está lista.");
  else if (nube?.escaneado_en) partes.push("Ya hemos escaneado el edificio; estamos preparando la nube de puntos.");
  else if (nube?.fecha_prevista_escaneo) partes.push(`El escaneo del edificio está previsto el ${dia(nube.fecha_prevista_escaneo)}.`);
  if (ya) partes.push(`Lo siguiente: ${ya.t.toLowerCase()}. ${ya.que}`);
  const deEllos: string[] = [];
  for (const c of todos.filter((c) => c.estado === "atascada"))
    deEllos.push(`Su ok al pago de ${c.importe != null ? `${EUR.format(c.importe)} €` : "un cobro"} (${PUNTOS.find((p) => p.k === c.punto)!.t.toLowerCase()}), pedido el ${dia(c.fecha)}.`);
  for (const h of hojas.filter((h) => h.pausa?.deEllos)) deEllos.push(`En pausa por su parte desde el ${dia(h.pausa!.desde)}${h.pausa!.motivo ? `: ${h.pausa!.motivo}` : ""}.`);
  const orden = (c: Cobro) => PUNTOS.findIndex((p) => p.k === c.punto);
  const sig = [...todos].filter((c) => c.estado !== "cobrada" && c.importe != null).sort((a, b) => orden(a) - orden(b))[0];
  const lineaDe = (c: Cobro) => lineas.find((l) => l.cobros.includes(c))!;
  const proximo = sig
    ? `${lineaDe(sig).que}, ${EUR.format(sig.importe!)} €, ${PUNTOS.find((p) => p.k === sig.punto)!.t.toLowerCase()}${sig.estado === "emitida" || sig.estado === "atascada" ? ` (pedido el ${dia(sig.fecha)})` : ""}`
    : null;

  const cobrado = r2(todos.filter((c) => c.estado === "cobrada").reduce((s, c) => s + (c.importe ?? 0), 0));
  return {
    hojas, lineas, puntos, frase: partes.join(" "), deEllos, proximo,
    comision: com
      ? {
          comercialId: com.id, comercial: com.nombre, pct: com.comision_pct == null ? null : Number(com.comision_pct), suya: o.suya, devengada: o.devengada,
          falta: r2(Math.max(0, o.suya - o.devengada)), cobrado,
          fuera: o.fuera ? (o.fuera.motivo === "marcada" ? `Dirección la ha marcado como que no cuenta${o.fuera.nota ? `: ${o.fuera.nota}` : ""}.` : "No cuenta: su primera factura es de antes de 2026.") : null,
        }
      : null,
    nube: nube ? { necesita: nube.necesita_nube, prevista: nube.fecha_prevista_escaneo, escaneado: nube.escaneado_en, lista: nube.nube_lista_en } : null,
    produccion,
  };
}
