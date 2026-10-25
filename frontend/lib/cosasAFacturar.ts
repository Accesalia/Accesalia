import "server-only";
// lib/cosasAFacturar.ts
//
// COBRAR › COSAS A FACTURAR (Monica, 25-oct-2026; maqueta validada docs/figma/cosas-a-facturar.html). Une «Facturable ya»
// y «Generar proforma». La lista: por direccion, los hitos alcanzados de hojas que ya salieron de Nuevas hojas firmadas
// y aun sin proforma. Al abrir una, cuatro pasos:
//   1. ¿Lo tengo todo? Por pagador: comunidad (CIF, como cobra, IBAN si es cargo, correos del administrador y del
//      presidente) o contrata (CIF, como cobra, a donde se envia, los codigos que exige). Lo que falta se pone ahi.
//   2. ¿Que facturo? Los hitos de todas sus hojas; los alcanzados, marcados. Antes de tiempo: con motivo (y el correo
//      pegado, si lo hay), que va a las notas de facturacion del hito.
//   3. ¿Quien factura? Lo que dice la linea de la hoja (Accesalia o Daniel), con aviso si la contrata o la ultima
//      proforma de esa linea dicen otra cosa. Se cambia en la linea.
//   4. La proforma, vista antes de emitirla. Una proforma = un pagador + una empresa: si se mezclan, se parte sola. Forma
//      de pago de las condiciones de cobro (se cambia); los codigos de la contrata, en una linea a 0 €.
// Los hitos son los de hitos_cobro: los de facturacion (opcion A, 25-oct-2026).

import type { Yo } from "./sesion";
import { nombreDeOpp, enFrase } from "./direccionOpp";
import { proximosHitos } from "./proximosHitos";
import { hojasPasadas } from "./recorridoHoja";
import { condicionesDeCobro, cuandoPaga, type Condicion, type FormaCobro } from "./condicionesCobro";
import { paraEnviar, type Destinatario } from "./envioCorreo";
import { cajonDeOpp, type DocCajon } from "./cajonDocumentos";
import {
  conceptoDe, crearProforma, emisoraDe, enviarProforma, hitosProformables, ivaHonorarios, leerProforma, pagadorDe, type Empresa, type HitoProformable,
} from "./proformas";
import { pdfDeProforma } from "./pdf/ProformaDoc";
import { TEXTO_HITO } from "./cobros";
import { enlaceFirmadaVersion, hojasDeFacturacion, urlFirmada, type HojaFacturacion } from "./hojasNuevas";

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
async function porTramos<T>(ids: string[], hacer: (t: string) => string): Promise<T[]> {
  const t: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) t.push(ids.slice(i, i + 150));
  return (await Promise.all(t.map((x) => leer<T>(hacer(x.join(",")))))).flat();
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);
const r2 = (n: number) => Math.round(n * 100) / 100;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fecha = (iso: string | null) => (iso ? FECHA.format(new Date(iso.slice(0, 10) + "T00:00:00Z")).replace(".", "") : "");
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const EMPRESA_DE_EMISOR: Record<string, Empresa> = { accesalia: "accesalia", daniel_autonomo: "daniel", ecobalance: "ecobalance" };
const EMISOR_DE_EMPRESA: Record<"accesalia" | "daniel", string> = { accesalia: "accesalia", daniel: "daniel_autonomo" };
export const NOMBRE_EMPRESA: Record<string, string> = { accesalia: "Accesalia", daniel: "Daniel", ecobalance: "Ecobalance" };

// ------------------------------------------------------------ las hojas de una opp, con sus lineas e hitos

// Hojas nuevas (dia de la migracion): la hoja es la version firmada, leida de las vistas (lib/hojasNuevas.ts).
type HojaF = HojaFacturacion;
const pdfFirmado = (h: HojaF) => urlFirmada(h);
const clavePagador = (p: { tipo: string; id: string } | null) => (p ? `${p.tipo}:${p.id}` : "sin");

// ------------------------------------------------------------ LA LISTA

export type FilaCosas = {
  oppId: string; direccion: string; paga: string; hitos: number; importe: number; queToca: string; desde: string | null; falta: string[];
};

export async function listaCosas(): Promise<FilaCosas[]> {
  const [{ hitos }, pasadas] = await Promise.all([proximosHitos(), hojasPasadas()]);
  // Lo alcanzado, de hojas que ya salieron de Nuevas hojas firmadas, y sin proforma.
  const ya = hitos.filter((h) => h.cuando === "ya" && h.pasada && !h.proforma && h.oppId);
  const porOpp = new Map<string, typeof ya>();
  for (const h of ya) (porOpp.get(h.oppId!) ?? porOpp.set(h.oppId!, []).get(h.oppId!)!).push(h);
  const opps = [...porOpp.keys()];
  if (!opps.length) return [];
  // Lo que falta, a grandes rasgos: CIF e IBAN de la comunidad, o los codigos de la contrata.
  const crudas = (await porTramos<{ id: string; oportunidad_id: string; pagador_tipo: string | null; codigos_contrata: Record<string, string> | null;
    comunidad_id: string | null; contrata: { cif: string | null; codigos_exigidos: string[] | null } | null }>(opps,
    (t) => `facturacion_hojas?select=id,oportunidad_id,pagador_tipo,codigos_contrata,comunidad_id,contrata:pagador_contrata_id(cif,codigos_exigidos)&oportunidad_id=in.(${t})`))
    .filter((h) => pasadas.has(h.id));
  const idsCom = [...new Set(crudas.map((h) => h.comunidad_id).filter((x): x is string => !!x))];
  const cifs = new Map((idsCom.length ? await porTramos<{ id: string; cif_comunidad: string | null }>(idsCom, (t) => `comunidades?select=id,cif_comunidad&id=in.(${t})`) : []).map((c) => [c.id, c]));
  const hs = crudas.map((h) => ({ ...h, comunidad: h.comunidad_id ? (cifs.get(h.comunidad_id) ?? { id: h.comunidad_id, cif_comunidad: null }) : null }));
  const comus = [...new Set(hs.map((h) => h.comunidad?.id).filter((x): x is string => !!x))];
  const conIban = new Set(comus.length ? (await porTramos<{ titular_id: string }>(comus, (t) => `cuentas_bancarias?select=titular_id&titular_tipo=eq.comunidad&vigente=is.true&titular_id=in.(${t})`)).map((c) => c.titular_id) : []);
  return opps.map((o) => {
    const xs = porOpp.get(o)!;
    const mias = hs.filter((h) => h.oportunidad_id === o);
    const falta = new Set<string>();
    for (const h of mias) {
      if (h.pagador_tipo === "contrata") {
        if (!h.contrata?.cif) falta.add("el CIF de la contrata");
        const sin = (h.contrata?.codigos_exigidos ?? []).filter((c) => !h.codigos_contrata?.[c]?.trim());
        if (sin.length) falta.add(`${sin.length === 1 ? "el código" : `los ${sin.length} códigos`} de ${xs[0].paga}`);
      } else if (h.pagador_tipo !== "persona" && h.comunidad) {
        if (!h.comunidad.cif_comunidad) falta.add("el CIF de la comunidad");
        if (!conIban.has(h.comunidad.id)) falta.add("el IBAN");
      }
    }
    const tipos = [...new Set(xs.map((x) => (TEXTO_HITO[x.tipo] ?? x.tipo).toLowerCase()))];
    return {
      oppId: o, direccion: xs[0].direccion, paga: [...new Set(xs.map((x) => x.paga))].join(" y "), hitos: xs.length,
      importe: r2(xs.reduce((s, x) => s + (x.importe ?? 0), 0)), queToca: tipos.join(", "),
      desde: xs.map((x) => x.fecha ?? "").filter(Boolean).sort()[0] ?? null, falta: [...falta],
    };
  }).sort((a, b) => (a.desde ?? "9999").localeCompare(b.desde ?? "9999"));
}

// ------------------------------------------------------------ UNA DIRECCION

export type ItemCheck = { clave: string; que: string; valor: string | null; ok: boolean; editar?: "cif" | "iban" | "codigo"; codigo?: string; hojaId?: string; enlace?: string };
export type PagadorCosas = {
  clave: string; tipo: "comunidad" | "contrata" | "persona"; id: string; nombre: string; nif: string | null; domicilio: string | null; comunidadId: string | null;
  forma: FormaCobro | null; cuandoPaga: string; iban: string | null; checklist: ItemCheck[]; destinatarios: Destinatario[];
  /** Quien le factura, si la contrata lo dice (Schindler = Daniel). */
  emisorContrata: "accesalia" | "daniel" | null;
};
export type HitoCosas = {
  id: string; hojaId: string; lineaId: string; linea: string; que: string; tipo: string; importe: number | null; ya: boolean; porque: string | null;
  empresa: "accesalia" | "daniel"; pagador: string;
};
export type HojaCosas = { id: string; numero: string; firma: string | null; pdf: string | null; pagador: string; hitos: HitoCosas[] };
export type LineaCosas = { id: string; linea: string; empresa: "accesalia" | "daniel"; ultimaProforma: "accesalia" | "daniel" | null };
export type DetalleCosas = {
  oppId: string; direccion: string; hojas: HojaCosas[]; pagadores: PagadorCosas[]; lineas: LineaCosas[];
  emisoras: Record<"accesalia" | "daniel", { nombre: string; nif: string; domicilio: string; iban: string | null; irpf: number }>;
  ivaPct: number; ordenesDeCompra: DocCajon[]; plantilla: { asunto: string; texto: string } | null;
};

const textoHito = (h: { hito: string; notas: string | null; porcentaje: number | null }) =>
  h.notas?.trim() || `${h.porcentaje != null ? `${Number(h.porcentaje).toLocaleString("es-ES")} % ` : ""}${(TEXTO_HITO[h.hito] ?? h.hito).toLowerCase()}`;

export async function detalleCosas(oppId: string): Promise<DetalleCosas | null> {
  if (!uuid(oppId)) return null;
  const [opp] = await leer<{ id: string; nombre: string | null; codigo: string | null }>(`oportunidades?select=id,nombre,codigo&id=eq.${oppId}`);
  if (!opp) return null;
  const [pasadas, todas, { hitos: proximos }, condiciones, envio, cajon, plantillas, iva, emA, emD] = await Promise.all([
    hojasPasadas(),
    hojasDeFacturacion({ oppId }),
    proximosHitos(),
    condicionesDeCobro(),
    paraEnviar(oppId).catch(() => null),
    cajonDeOpp(oppId).catch(() => []),
    leer<{ asunto: string; texto: string }>(`plantillas_correo?select=asunto,texto&nombre=eq.${encodeURIComponent("Envío proforma")}&propietario_id=is.null&limit=1`).catch(() => []),
    ivaHonorarios(),
    emisoraDe("accesalia"),
    emisoraDe("daniel"),
  ]);
  const hojas = todas.filter((h) => pasadas.has(h.id));
  const ya = new Map(proximos.filter((p) => p.cuando === "ya").map((p) => [p.id, p.porQue]));

  // Los hitos que quedan por facturar: hojas de cada linea, sin subhitos padre, ni anulados ni cobrados.
  const candidatos = hojas.flatMap((h) => h.lineas.flatMap((l) => {
    const padres = new Set(l.hitos.map((x) => x.hito_padre_id).filter(Boolean));
    return l.hitos.filter((x) => x.estado !== "anulado" && x.estado !== "completado" && !padres.has(x.id)).map((x) => ({ h, l, x }));
  }));
  const prof = new Map((await hitosProformables(candidatos.map((c) => c.x.id))).map((p) => [p.id, p]));
  const vivos = candidatos.filter((c) => { const p = prof.get(c.x.id); return p && (p.disponible == null || p.disponible > 0.005); });

  // Quien paga cada hoja (lo dice la primera linea; una hoja tiene un solo pagador).
  const pagadorDeHoja = new Map<string, { tipo: string; id: string } | null>();
  for (const c of vivos) if (!pagadorDeHoja.has(c.h.id)) pagadorDeHoja.set(c.h.id, prof.get(c.x.id)!.pagador);
  const claves = [...new Set([...pagadorDeHoja.values()].map(clavePagador))];

  // La ultima proforma de cada linea, para el aviso de quien factura.
  const lineaIds = [...new Set(vivos.map((c) => c.l.id))];
  const todosHitosLineas = hojas.flatMap((h) => h.lineas.filter((l) => lineaIds.includes(l.id)).flatMap((l) => l.hitos.map((x) => ({ l: l.id, x: x.id }))));
  const previas = todosHitosLineas.length
    ? await porTramos<{ hito_cobro_id: string; linea: { proforma: { empresa: Empresa; fecha: string; estado: string } | null } | null }>(todosHitosLineas.map((x) => x.x),
        (t) => `proforma_linea_hitos?select=hito_cobro_id,linea:proforma_linea_id(proforma:proforma_id(empresa,fecha,estado))&hito_cobro_id=in.(${t})`)
    : [];
  const ultimaDe = new Map<string, "accesalia" | "daniel">();
  for (const l of lineaIds) {
    const ids = new Set(todosHitosLineas.filter((x) => x.l === l).map((x) => x.x));
    const ult = previas.filter((p) => ids.has(p.hito_cobro_id) && p.linea?.proforma?.estado === "emitida").sort((a, b) => (b.linea!.proforma!.fecha).localeCompare(a.linea!.proforma!.fecha))[0];
    const e = ult?.linea?.proforma?.empresa;
    if (e === "accesalia" || e === "daniel") ultimaDe.set(l, e);
  }

  // Los pagadores, con su lista de lo que hace falta.
  const pagadores: PagadorCosas[] = [];
  for (const clave of claves) {
    if (clave === "sin") continue;
    const [tipo, id] = clave.split(":") as ["comunidad" | "contrata" | "persona", string];
    const datos = await pagadorDe({ tipo, id });
    const hojasDe = hojas.filter((h) => clavePagador(pagadorDeHoja.get(h.id) ?? null) === clave);
    const check: ItemCheck[] = [];
    let forma: FormaCobro | null = null, cuando = "", iban: string | null = null, comunidadId: string | null = null, emisorContrata: PagadorCosas["emisorContrata"] = null;
    let destinatarios: Destinatario[] = [];
    if (tipo === "contrata") {
      const [ct] = await leer<{ cif: string | null; codigos_exigidos: string[] | null; emisor_factura: string | null }>(`contratas?select=cif,codigos_exigidos,emisor_factura&id=eq.${id}`);
      const cond = condiciones.condiciones.find((c) => c.activa && c.contrata?.id === id);
      forma = cond?.forma ?? null;
      cuando = cond ? cuandoPaga(cond) : "";
      emisorContrata = ct?.emisor_factura === "daniel_autonomo" ? "daniel" : ct?.emisor_factura === "accesalia" ? "accesalia" : null;
      check.push({ clave: "cif", que: "CIF", valor: ct?.cif ?? null, ok: !!ct?.cif });
      check.push({ clave: "como", que: "Cómo cobra", valor: cond?.forma ? `${FORMA_TXT[cond.forma]}${cuando ? ` · ${cuando}` : ""}` : null, ok: !!cond?.forma, enlace: "/gestiones/condiciones-cobro" });
      const correos = (cond?.correo ?? "").split(/[,;\s]+/).filter((x) => CORREO.test(x));
      check.push({ clave: "envio", que: "A dónde se envía", valor: correos.length ? `${correos.join(", ")}${cond?.alComercial ? " · y también al comercial" : ""}${cond?.comoSeEnvia ? ` · ${cond.comoSeEnvia}` : ""}` : (cond?.comoSeEnvia || null), ok: correos.length > 0 || !!cond?.comoSeEnvia, enlace: "/gestiones/condiciones-cobro" });
      for (const h of hojasDe)
        for (const c of ct?.codigos_exigidos ?? []) {
          const v = h.codigos_contrata?.[c]?.trim() || null;
          check.push({ clave: `cod:${h.id}:${c}`, que: `Código «${c}»${hojasDe.length > 1 ? ` · ${h.numero_hoja}` : ""}`, valor: v, ok: !!v, editar: "codigo", codigo: c, hojaId: h.id });
        }
      destinatarios = correos.map((e) => ({ email: e.toLowerCase(), quien: `${datos?.nombre ?? "Contrata"} · facturas` }));
      const com = envio?.comercial?.email?.trim().toLowerCase();
      if (cond?.alComercial && com && CORREO.test(com)) destinatarios.push({ email: com, quien: `Comercial · ${envio!.comercial!.nombre}` });
    } else if (tipo === "comunidad") {
      comunidadId = id;
      const general = condiciones.condiciones.find((c) => !c.contrata && c.pagadorTipo === "comunidad");
      forma = general?.forma ?? "cargo_cuenta";
      cuando = general ? cuandoPaga(general) : "";
      const [cb] = await leer<{ iban: string }>(`cuentas_bancarias?select=iban&titular_tipo=eq.comunidad&titular_id=eq.${id}&vigente=is.true&order=creado_en.desc&limit=1`);
      iban = cb?.iban ?? null;
      check.push({ clave: "cif", que: "CIF de la comunidad", valor: datos?.nif ?? null, ok: !!datos?.nif, editar: "cif" });
      check.push({ clave: "como", que: "Cómo cobra", valor: FORMA_TXT[forma], ok: true });
      if (forma === "cargo_cuenta") check.push({ clave: "iban", que: "IBAN para el cargo", valor: iban, ok: !!iban, editar: "iban" });
      destinatarios = envio?.destinatarios ?? [];
      const admin = destinatarios.filter((d) => /^administrador/i.test(d.quien));
      const presi = destinatarios.filter((d) => /^presidente/i.test(d.quien));
      check.push({ clave: "admin", que: "Correo del administrador", valor: admin.map((d) => d.email).join(", ") || null, ok: admin.length > 0, enlace: `/administracion/comunidades/${id}` });
      check.push({ clave: "presi", que: "Correo del presidente", valor: presi.map((d) => d.email).join(", ") || null, ok: presi.length > 0, enlace: `/administracion/comunidades/${id}` });
      const com = envio?.comercial?.email?.trim().toLowerCase();
      if (com && CORREO.test(com) && !destinatarios.some((d) => d.email === com)) destinatarios = [...destinatarios, { email: com, quien: `Comercial · ${envio!.comercial!.nombre}` }];
    } else {
      const general = condiciones.condiciones.find((c) => !c.contrata && c.pagadorTipo === "persona");
      forma = general?.forma ?? "cargo_cuenta";
      cuando = general ? cuandoPaga(general) : "";
      check.push({ clave: "nombre", que: "Particular", valor: datos?.nombre ?? null, ok: !!datos?.nombre });
      check.push({ clave: "como", que: "Cómo cobra", valor: FORMA_TXT[forma], ok: true });
      destinatarios = envio?.destinatarios ?? [];
    }
    pagadores.push({
      clave, tipo, id, nombre: datos?.nombre ?? "—", nif: datos?.nif ?? null, domicilio: datos?.domicilio ?? null, comunidadId,
      forma, cuandoPaga: cuando, iban, checklist: check, destinatarios, emisorContrata,
    });
  }

  const hojasOut: HojaCosas[] = hojas
    .filter((h) => vivos.some((c) => c.h.id === h.id))
    .map((h) => ({
      id: h.id, numero: h.numero_hoja, firma: h.fecha_firma, pdf: pdfFirmado(h), pagador: clavePagador(pagadorDeHoja.get(h.id) ?? null),
      hitos: vivos.filter((c) => c.h.id === h.id)
        .sort((a, b) => a.l.id.localeCompare(b.l.id) || (a.x.orden ?? 0) - (b.x.orden ?? 0))
        .map((c) => {
          const p = prof.get(c.x.id)!;
          return {
            id: c.x.id, hojaId: h.id, lineaId: c.l.id, linea: p.linea, que: textoHito(c.x), tipo: c.x.hito, importe: p.disponible, ya: ya.has(c.x.id),
            porque: ya.get(c.x.id) ?? null, empresa: (p.empresa === "daniel" ? "daniel" : "accesalia") as "accesalia" | "daniel", pagador: clavePagador(p.pagador),
          };
        }),
    }));
  const lineas: LineaCosas[] = [...new Map(hojasOut.flatMap((h) => h.hitos).map((x) => [x.lineaId, { id: x.lineaId, linea: x.linea, empresa: x.empresa, ultimaProforma: ultimaDe.get(x.lineaId) ?? null }])).values()];
  const em = (e: Awaited<ReturnType<typeof emisoraDe>>) => ({ nombre: e.nombre_legal || e.nombre, nif: e.nif, domicilio: e.domicilio, iban: e.iban, irpf: Number(e.irpf_porcentaje) || 0 });
  return {
    oppId, direccion: nombreDeOpp(opp), hojas: hojasOut, pagadores, lineas,
    emisoras: { accesalia: em(emA), daniel: em(emD) }, ivaPct: iva,
    ordenesDeCompra: cajon.filter((d) => !d.tipo || /orden de compra|contrato/i.test(d.tipo)),
    plantilla: plantillas[0] ?? null,
  };
}
const FORMA_TXT: Record<FormaCobro, string> = { cargo_cuenta: "Cargo en cuenta", transferencia: "Transferencia", confirming: "Confirming" };

// ------------------------------------------------------------ lo que se completa ahi mismo

export async function guardarCodigo(hojaId: string, codigo: string, valor: string): Promise<void> {
  if (!uuid(hojaId)) throw new Error("Hoja no válida.");
  const [h] = await leer<{ codigos_contrata: Record<string, string> | null; contrata: { codigos_exigidos: string[] | null } | null }>(
    `he_versiones_hoja?select=codigos_contrata,contrata:pagador_contrata_id(codigos_exigidos)&id=eq.${hojaId}`,
  );
  if (!h) throw new Error("Esa hoja no existe.");
  if (!(h.contrata?.codigos_exigidos ?? []).includes(codigo)) throw new Error("La contrata no pide ese código.");
  const nuevos = { ...(h.codigos_contrata ?? {}), [codigo]: valor.trim() };
  if (!valor.trim()) delete nuevos[codigo];
  await pedir(`he_versiones_hoja?id=eq.${hojaId}`, { method: "PATCH", body: JSON.stringify({ codigos_contrata: nuevos }) });
}

export async function guardarCif(comunidadId: string, cif: string): Promise<void> {
  if (!uuid(comunidadId)) throw new Error("Comunidad no válida.");
  const c = cif.toUpperCase().replace(/[\s.-]/g, "");
  if (!/^[A-Z][0-9]{7}[0-9A-J]$/.test(c)) throw new Error("Ese CIF no tiene buena pinta: una letra, siete números y una letra o número.");
  await pedir(`comunidades?id=eq.${comunidadId}`, { method: "PATCH", body: JSON.stringify({ cif_comunidad: c }) });
}

function ibanBueno(iban: string): string | null {
  const s = iban.toUpperCase().replace(/\s+/g, "");
  if (!/^ES[0-9]{22}$/.test(s)) return null;
  const n = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let resto = 0;
  for (const d of n) resto = (resto * 10 + Number(d)) % 97;
  return resto === 1 ? s.replace(/(.{4})/g, "$1 ").trim() : null;
}
export async function guardarIban(comunidadId: string, iban: string): Promise<void> {
  if (!uuid(comunidadId)) throw new Error("Comunidad no válida.");
  const bueno = ibanBueno(iban);
  if (!bueno) throw new Error("Ese IBAN no es válido (ES y 22 números, con su control).");
  await pedir(`cuentas_bancarias?titular_tipo=eq.comunidad&titular_id=eq.${comunidadId}&vigente=is.true`, { method: "PATCH", body: JSON.stringify({ vigente: false }) });
  await pedir("cuentas_bancarias", { method: "POST", body: JSON.stringify({ titular_tipo: "comunidad", titular_id: comunidadId, iban: bueno, vigente: true }) });
}

/** Quien factura una linea: se cambia en la propia linea de la hoja. */
export async function cambiarEmisor(yo: Yo, lineaId: string, empresa: "accesalia" | "daniel"): Promise<void> {
  if (!uuid(lineaId)) throw new Error("Línea no válida.");
  await pedir(`lineas_facturacion?id=eq.${lineaId}&emisor=in.(accesalia,daniel_autonomo)`, {
    method: "PATCH", body: JSON.stringify({ emisor: EMISOR_DE_EMPRESA[empresa], editada_en: new Date().toISOString(), editada_por: yo.id }),
  });
}

// ------------------------------------------------------------ EMITIR

export type PedidoEmitir = {
  hitos: { id: string; importe: number; motivo?: string; correo?: string }[];
  /** La forma de pago de cada pagador, si se cambia (clave del pagador -> forma). */
  formas: Record<string, FormaCobro>;
};

/** Emite una proforma por pagador y empresa. Devuelve las proformas creadas. */
export async function emitirCosas(yo: Yo, oppId: string, p: PedidoEmitir): Promise<{ id: string; codigo: string }[]> {
  const d = await detalleCosas(oppId);
  if (!d) throw new Error("Esa dirección no existe.");
  const todos = new Map(d.hojas.flatMap((h) => h.hitos).map((x) => [x.id, x]));
  if (!p.hitos.length) throw new Error("Marca qué facturas.");
  for (const x of p.hitos) {
    const h = todos.get(x.id);
    if (!h) throw new Error("Algún hito ya no está para facturar: vuelve a abrir la dirección.");
    if (!h.ya && !x.motivo?.trim()) throw new Error(`«${h.que}» aún no se ha alcanzado: falta por qué se factura antes.`);
    if (!(x.importe > 0)) throw new Error(`Falta el importe de «${h.que}».`);
  }
  // Una proforma = un pagador + una empresa.
  const grupos = new Map<string, typeof p.hitos>();
  for (const x of p.hitos) {
    const h = todos.get(x.id)!;
    const k = `${h.pagador}|${h.empresa}`;
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(x);
  }
  for (const k of grupos.keys()) {
    const pag = d.pagadores.find((x) => x.clave === k.split("|")[0]);
    if (!pag) throw new Error("Hay hitos sin pagador: revisa la hoja.");
    const falta = pag.checklist.filter((c) => !c.ok);
    if (falta.length) throw new Error(`Falta en «¿Lo tengo todo?» de ${pag.nombre}: ${falta.map((c) => c.que).join(", ")}.`);
  }
  const hechas: { id: string; codigo: string }[] = [];
  for (const [k, xs] of grupos) {
    const [clave, empresa] = k.split("|") as [string, "accesalia" | "daniel"];
    const pag = d.pagadores.find((x) => x.clave === clave)!;
    const prof = await hitosProformables(xs.map((x) => x.id));
    const porLinea = new Map<string, HitoProformable[]>();
    for (const h of prof) porLinea.set(h.lineaId, [...(porLinea.get(h.lineaId) ?? []), h]);
    const importe = new Map(xs.map((x) => [x.id, r2(x.importe)]));
    const antes = new Set(xs.filter((x) => !todos.get(x.id)!.ya).map((x) => x.id));
    const lineas = [...porLinea.values()].map((hs) => ({
      concepto: conceptoDe(hs, enFrase(d.direccion)) + (hs.some((h) => antes.has(h.id)) ? " Facturado antes del hito, a petición del cliente." : ""),
      hitos: hs.map((h) => ({ id: h.id, importe: importe.get(h.id)! })),
    }));
    const forma = p.formas[clave] ?? pag.forma ?? "transferencia";
    const cuenta = forma === "cargo_cuenta" ? pag.iban : forma === "transferencia" ? d.emisoras[empresa].iban : null;
    if (forma === "cargo_cuenta" && !cuenta) throw new Error(`Para el cargo en cuenta falta el IBAN de ${pag.nombre}.`);
    // Los codigos de la contrata: una linea a 0 € por hoja (Monica, 25-oct-2026: «linea a 0 euros»).
    const ciegas = pag.tipo === "contrata"
      ? [...new Set(xs.map((x) => todos.get(x.id)!.hojaId))].map((hid) => pag.checklist.filter((c) => c.editar === "codigo" && c.hojaId === hid && c.valor).map((c) => `${c.codigo}: ${c.valor}`).join(" · ")).filter(Boolean)
      : [];
    const pagador = await pagadorDe({ tipo: pag.tipo, id: pag.id });
    const id = await crearProforma(yo, {
      lineas, pagador: pagador ?? { nombre: pag.nombre, nif: pag.nif, domicilio: pag.domicilio, email: null },
      ivaPct: d.ivaPct, irpfPct: d.emisoras[empresa].irpf, notas: "", formaCobro: forma, cuenta, lineasCiegas: ciegas,
    });
    // Lo facturado antes de tiempo: por que, y el correo en que lo piden, a las notas de facturacion del hito.
    const notas = xs.filter((x) => antes.has(x.id)).map((x) => ({
      hoja_encargo_id: todos.get(x.id)!.hojaId, hito_cobro_id: x.id, linea_facturacion_id: todos.get(x.id)!.lineaId, fecha: new Date().toISOString().slice(0, 10),
      origen: "persona", tipo: "nota", autor_id: yo.id, autor: [yo.nombre, yo.apellidos].filter(Boolean).join(" "),
      texto: `Facturado antes del hito: ${x.motivo!.trim()}${x.correo?.trim() ? `\n\nEl correo en que lo piden:\n${x.correo.trim()}` : ""}`,
    }));
    if (notas.length) await pedir("notas_facturacion", { method: "POST", body: JSON.stringify(notas) });
    const pf = await leerProforma(id);
    hechas.push({ id, codigo: pf?.codigo ?? "" });
  }
  return hechas;
}

// ------------------------------------------------------------ ENVIAR (con la hoja firmada)

export async function enviarDesdeCosas(yo: Yo, proformaId: string, e: { para: string[]; asunto: string; cuerpo: string }, hojasAdjuntas: string[]): Promise<void> {
  const p = await leerProforma(proformaId);
  if (!p) throw new Error("Esa proforma no existe.");
  const otros: { nombre: string; contenido: Uint8Array }[] = [];
  for (const hid of hojasAdjuntas.filter(uuid)) {
    const [h] = await hojasDeFacturacion({ ids: [hid] });
    const url = h ? await enlaceFirmadaVersion(hid) : null;
    const r = url ? await fetch(url, { cache: "no-store" }) : null;
    if (h && r?.ok) otros.push({ nombre: `Hoja de encargo firmada ${h.numero_hoja}.pdf`, contenido: new Uint8Array(await r.arrayBuffer()) });
  }
  await enviarProforma(yo, proformaId, e, await pdfDeProforma(p), otros);
}

/** El asunto y el texto de la plantilla «Envío proforma», con sus {huecos}. */
export function rellenarPlantilla(t: string, h: { direccion: string; loQueSeCobra: string; codigo: string; total: number; empresa: string }): string {
  return t
    .replaceAll("{dirección}", h.direccion).replaceAll("{lo que se cobra}", h.loQueSeCobra).replaceAll("{código}", h.codigo)
    .replaceAll("{total}", EUR.format(h.total)).replaceAll("{empresa}", h.empresa);
}
export { fecha as fechaCorta };
