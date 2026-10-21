// lib/extractos.ts
//
// SUBIR EL EXTRACTO (Monica, 21-oct-2026): se sueltan los Excel tal cual vienen del banco (La Caixa «Movimientos_cuenta_…
// .xls», BBVA «Histórico movimientos….xlsx»), cuando se quiera: la semana, lo que va de mes, hasta hoy.
//   1. LA CUENTA: por el IBAN que trae el propio fichero (cuentas_propias).
//   2. COSER: cada fila trae el saldo (saldo = anterior + importe). Lo que ya estaba se reconoce y no se duplica; si
//      entre lo que habia y lo nuevo falta un trozo, se dice y no se sube nada de esa cuenta.
//   3. CLASIFICAR, diciendo siempre por que: un ingreso, con el cobro de la app del mismo importe (o la suma de los de
//      un pagador ese dia; el confirming de Santander Factoring llega neto); un gasto, con sus reglas (reglas_movimientos:
//      las respuestas de Monica), y a su gasto habitual (como aparece en el banco / tipos). Lo que no se conoce, «por saber».
//   4. INTERNOS: lo que sale de una cuenta nuestra y entra en otra (mismo importe, ±3 dias).
// El motor es el mismo que scripts/bancos/extractos_en_seco.py (con el que se cargo 2025-2026).

import "server-only";
import * as XLSX from "xlsx";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T[]> {
  const todo: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const trozo = (await r.json()) as T[];
    todo.push(...trozo);
    if (trozo.length < 1000) return todo;
  }
}
async function escribir(metodo: "POST" | "PATCH", path: string, cuerpo: unknown) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
}

const EMPRESA_DE_CUENTA: Record<string, "accesalia" | "daniel_autonomo"> = { caixa_accesalia: "accesalia", bbva_accesalia: "accesalia", caixa_daniel: "daniel_autonomo" };
const EMPRESA_FACTURA: Record<string, string> = { accesalia: "accesalia", daniel_autonomo: "daniel" };

type Fila = { fecha: string; fecha_valor: string | null; concepto: string; mas_datos: string; importe: number; saldo: number; referencia: string | null };

// ------------------------------------------------------------------------------------------------ 1. leer el fichero
const txt = (v: unknown) => (v == null ? "" : String(v).trim());
const r2 = (n: number) => Math.round(n * 100) / 100;
function fechaDe(v: unknown): string | null {
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}` : null;
  }
  const s = txt(v);
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
function numeroDe(v: unknown): number | null {
  if (typeof v === "number") return r2(v);
  const s = txt(v).replace(/EUR|€|\s/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isNaN(n) ? null : r2(n);
}
const soloDigitos = (s: string) => s.replace(/[^0-9A-Z]/gi, "").toUpperCase();

/** Lee un Excel del banco: devuelve el IBAN que trae y sus filas, de la mas vieja a la mas nueva. */
export function leerExtracto(datos: ArrayBuffer, nombre: string): { iban: string; filas: Fila[] } {
  const wb = XLSX.read(datos, { cellDates: false });
  const filas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
  const todo = filas.map((r) => r.map(txt).join(" "));
  const iban = (todo.join(" ").match(/ES\d{2}(?:\s?\d{4}){5}/) ?? [])[0];
  if (!iban) throw new Error(`${nombre}: no encuentro el IBAN de la cuenta en el fichero.`);
  const out: Fila[] = [];
  // La Caixa: Fecha | Fecha valor | Movimiento | Mas datos | Importe | Saldo
  const iCaixa = filas.findIndex((r) => txt(r[0]) === "Fecha" && txt(r[2]) === "Movimiento");
  // BBVA: … F. CONTABLE | F. VALOR | CODIGO | CONCEPTO | BENEFICIARIO/ORDENANTE | OBSERVACIONES | IMPORTE | SALDO | DIVISA | OFICINA | REMESA
  const iBbva = filas.findIndex((r) => r.some((c) => txt(c).toUpperCase().startsWith("F. CONTABLE")));
  if (iCaixa >= 0) {
    for (const r of filas.slice(iCaixa + 1)) {
      const fecha = fechaDe(r[0]), importe = numeroDe(r[4]), saldo = numeroDe(r[5]);
      if (!fecha || importe == null || saldo == null) continue;
      out.push({ fecha, fecha_valor: fechaDe(r[1]), concepto: txt(r[2]), mas_datos: txt(r[3]), importe, saldo, referencia: null });
    }
  } else if (iBbva >= 0) {
    const c = filas[iBbva].findIndex((x) => txt(x).toUpperCase().startsWith("F. CONTABLE"));
    for (const r of filas.slice(iBbva + 1)) {
      const fecha = fechaDe(r[c]), importe = numeroDe(r[c + 6]), saldo = numeroDe(r[c + 7]);
      if (!fecha || importe == null || saldo == null) continue;
      out.push({
        fecha, fecha_valor: fechaDe(r[c + 1]), concepto: txt(r[c + 3]),
        mas_datos: [txt(r[c + 4]), txt(r[c + 5])].filter(Boolean).join(" · "), importe, saldo, referencia: txt(r[c + 10]) || null,
      });
    }
  } else throw new Error(`${nombre}: no reconozco el formato (ni La Caixa ni BBVA).`);
  if (!out.length) throw new Error(`${nombre}: no trae ningún movimiento.`);
  return { iban, filas: out.reverse() };   // el banco las da de la mas nueva a la mas vieja
}

// ------------------------------------------------------------------------------------------------ 2. coser
const clave = (f: { fecha: string; importe: number; saldo: number; concepto: string }) => `${f.fecha}|${r2(f.importe)}|${r2(f.saldo)}|${f.concepto}`;
const encadena = (antes: { saldo: number }, f: { importe: number; saldo: number }) => Math.abs(r2(antes.saldo + f.importe) - f.saldo) < 0.011;

type Ultima = { orden: number; fecha: string; concepto: string; importe: string; saldo: string };

/** Lo nuevo de un fichero respecto a lo que ya hay de esa cuenta. */
export function loNuevo(filas: Fila[], ultimas: Ultima[]): { nuevas: Fila[]; aviso?: string } {
  for (let i = 1; i < filas.length; i++)
    if (!encadena(filas[i - 1], filas[i])) throw new Error(`el saldo no cuadra dentro del fichero entre el ${filas[i - 1].fecha} y el ${filas[i].fecha}`);
  if (!ultimas.length) return { nuevas: filas };
  const ult = ultimas[0];
  const u = { fecha: ult.fecha, importe: Number(ult.importe), saldo: Number(ult.saldo), concepto: ult.concepto };
  const pos = filas.map(clave).lastIndexOf(clave(u));
  if (pos >= 0) return { nuevas: filas.slice(pos + 1) };
  if (filas[0].fecha >= u.fecha && encadena(u, filas[0])) return { nuevas: filas };
  // ¿Es todo de antes (ya subido)?
  const yaHay = new Set(ultimas.map((x) => clave({ fecha: x.fecha, importe: Number(x.importe), saldo: Number(x.saldo), concepto: x.concepto })));
  if (filas[filas.length - 1].fecha <= u.fecha && yaHay.has(clave(filas[filas.length - 1]))) return { nuevas: [], aviso: "todo lo de este fichero ya estaba" };
  throw new Error(`falta un trozo: lo último que hay es del ${u.fecha} (saldo ${u.saldo}) y este fichero no empalma con eso. Suba también los días de en medio.`);
}

// ------------------------------------------------------------------------------------------------ 3. clasificar
type Regla = { id: string; orden: number; sentido: "gasto" | "ingreso"; patron: string; cuenta: string | null; tipo: string; se_repite: string | null; solo_direccion: boolean };
type GastoH = { id: string; empresa: string; como_aparece: string[] | null; tipos: string[] | null; meses: number[] | null };
type Cobro = { id: string; fecha: string; importe: number; tipo: string; pagador: string; factura: string; facturaId: string; oportunidad_id: string | null };

const prueba = (patron: string, t: string) => {
  try {
    return new RegExp(patron).test(t);
  } catch {
    return t.includes(patron);
  }
};
const dias = (a: string, b: string) => Math.abs((Date.parse(a) - Date.parse(b)) / 864e5);

export type PorSaber = { id: string; cuenta: string; fecha: string; concepto: string; mas_datos: string | null; importe: number; clase: string };
export type ResultadoCuenta = { cuenta: string; fichero: string; nuevos: number; reconocidos: number; porSaber: number; hasta: string | null; aviso?: string; error?: string };

export async function subirExtractos(ficheros: { nombre: string; datos: ArrayBuffer }[]): Promise<ResultadoCuenta[]> {
  const cuentas = await leer<{ clave: string; iban: string; empresa: string }>("cuentas_propias?select=clave,iban,empresa&vigente=eq.true");
  const reglas = await leer<Regla>("reglas_movimientos?select=id,orden,sentido,patron,cuenta,tipo,se_repite,solo_direccion&activa=eq.true&order=orden");
  const gastos = await leer<GastoH>("gastos_habituales?select=id,empresa,como_aparece,tipos,meses&empresa=in.(accesalia,daniel_autonomo)");
  const resultados: ResultadoCuenta[] = [];

  // Varios ficheros de la misma cuenta: se cosen de mas viejo a mas nuevo
  const leidos = ficheros.map((f) => {
    try {
      const x = leerExtracto(f.datos, f.nombre);
      const c = cuentas.find((c) => soloDigitos(c.iban) === soloDigitos(x.iban));
      if (!c) throw new Error(`${f.nombre}: la cuenta ${x.iban} no es ninguna de las nuestras.`);
      return { ...f, ...x, cuenta: c.clave };
    } catch (e) {
      resultados.push({ cuenta: "?", fichero: f.nombre, nuevos: 0, reconocidos: 0, porSaber: 0, hasta: null, error: (e as Error).message });
      return null;
    }
  }).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => a.filas[0].fecha.localeCompare(b.filas[0].fecha));

  const nuevosIds: string[] = [];
  for (const f of leidos) {
    try {
      const ultimas = await leer<Ultima>(`movimientos_bancarios?select=orden,fecha,concepto,importe,saldo&cuenta=eq.${f.cuenta}&order=orden.desc&limit=400`);
      // Un fichero de fechas ya subidas (uno viejo): se comprueba que todo lo suyo este, y no se sube nada
      const ultFecha = ultimas[0]?.fecha;
      let r: { nuevas: Fila[]; aviso?: string };
      if (ultFecha && f.filas[f.filas.length - 1].fecha <= ultFecha && !f.filas.some((x) => clave(x) === clave({ fecha: ultFecha, importe: Number(ultimas[0].importe), saldo: Number(ultimas[0].saldo), concepto: ultimas[0].concepto }))) {
        const hay = await leer<{ fecha: string; concepto: string; importe: string; saldo: string }>(
          `movimientos_bancarios?select=fecha,concepto,importe,saldo&cuenta=eq.${f.cuenta}&fecha=gte.${f.filas[0].fecha}&fecha=lte.${f.filas[f.filas.length - 1].fecha}`,
        );
        const claves = new Set(hay.map((x) => clave({ fecha: x.fecha, concepto: x.concepto, importe: Number(x.importe), saldo: Number(x.saldo) })));
        const faltan = f.filas.filter((x) => !claves.has(clave(x)));
        if (faltan.length) throw new Error(`es de fechas ya subidas, pero trae ${faltan.length} movimientos que no están (el primero, del ${faltan[0].fecha}). Avíseme y lo miro.`);
        r = { nuevas: [], aviso: "todo lo de este fichero ya estaba" };
      } else r = loNuevo(f.filas, ultimas);
      const { nuevas, aviso } = r;
      const empresa = EMPRESA_DE_CUENTA[f.cuenta];
      let orden = ultimas[0]?.orden ?? 0;
      const desde = nuevas[0]?.fecha;
      const cobros = desde ? await cobrosLibres(empresa, desde) : [];
      const filas = nuevas.map((n) => {
        const id = crypto.randomUUID();
        nuevosIds.push(id);
        return { id, cuenta: f.cuenta, orden: ++orden, fecha: n.fecha, fecha_valor: n.fecha_valor, concepto: n.concepto, mas_datos: n.mas_datos || null,
          importe: n.importe, saldo: n.saldo, referencia: n.referencia, fichero_origen: f.nombre, ...clasificar(n, f.cuenta, empresa, reglas, gastos, cobros) };
      });
      const enlaces = filas.flatMap((x) => (x._cobros ?? []).map((c) => ({ cobro: c, mov: x.id })));
      const limpias = filas.map(({ _cobros, ...x }) => { void _cobros; return x; });
      for (let i = 0; i < limpias.length; i += 200) await escribir("POST", "movimientos_bancarios", limpias.slice(i, i + 200));
      for (const e of enlaces) await escribir("PATCH", `cobros?id=eq.${e.cobro}`, { movimiento_bancario_id: e.mov });
      resultados.push({
        cuenta: f.cuenta, fichero: f.nombre, nuevos: limpias.length, reconocidos: limpias.filter((x) => x.tipo || x.facturas || x.clase === "interno").length,
        porSaber: limpias.filter((x) => !x.tipo && !x.facturas).length, hasta: nuevas.length ? nuevas[nuevas.length - 1].fecha : ultimas[0]?.fecha ?? null, aviso: aviso ?? (nuevas.length ? undefined : "nada nuevo: todo esto ya estaba"),
      });
    } catch (e) {
      resultados.push({ cuenta: f.cuenta, fichero: f.nombre, nuevos: 0, reconocidos: 0, porSaber: 0, hasta: null, error: (e as Error).message });
    }
  }
  if (nuevosIds.length) await emparejarInternos(nuevosIds);
  return resultados;
}

async function cobrosLibres(empresa: string, desde: string): Promise<Cobro[]> {
  const ini = new Date(Date.parse(desde) - 15 * 864e5).toISOString().slice(0, 10);
  const filas = await leer<{ id: string; fecha_cobro: string; importe: string; tipo: string; facturas: { id: string; empresa_emisora: string; anio: number; serie: string; numero: number; pagador_nombre: string | null; oportunidad_id: string | null } }>(
    `cobros?select=id,fecha_cobro,importe,tipo,facturas!inner(id,empresa_emisora,anio,serie,numero,pagador_nombre,oportunidad_id)&movimiento_bancario_id=is.null&fecha_cobro=gte.${ini}&facturas.empresa_emisora=eq.${EMPRESA_FACTURA[empresa]}`,
  );
  return filas.map((c) => ({
    id: c.id, fecha: c.fecha_cobro, importe: Number(c.importe), tipo: c.tipo, pagador: c.facturas.pagador_nombre ?? "",
    factura: `${c.facturas.empresa_emisora === "accesalia" ? "Accesalia" : "Daniel"} ${c.facturas.anio}/${c.facturas.serie}-${c.facturas.numero}`,
    facturaId: c.facturas.id, oportunidad_id: c.facturas.oportunidad_id,
  }));
}

const MESES_NOMINA: Record<string, number> = { ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, SETIEMBRE: 9, SEPT: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12 };
/** «Nomina Agosto 2025» pagada el 1-sep cuenta en agosto (Monica, 21-oct). Sin año, el del cargo (o el anterior si el mes va por delante). */
function mesDeNomina(t: string, fecha: string): string | null {
  const mo = t.match(new RegExp(String.raw`\b(${Object.keys(MESES_NOMINA).join("|")})\b(?:\D{0,4}(20\d\d))?`));
  if (!mo) return null;
  const mes = MESES_NOMINA[mo[1]];
  let y = mo[2] ? Number(mo[2]) : Number(fecha.slice(0, 4));
  if (!mo[2] && mes > Number(fecha.slice(5, 7)) + 1) y -= 1;
  const mi = `${y}-${String(mes).padStart(2, "0")}`;
  return mi === fecha.slice(0, 7) ? null : mi;
}

export function clasificar(n: Fila, cuenta: string, empresa: string, reglas: Regla[], gastos: GastoH[], cobros: Cobro[]) {
  const t = `${n.concepto} ${n.mas_datos}`.toUpperCase();
  const base = { clase: n.importe > 0 ? "ingreso" : "gasto", tipo: null as string | null, se_repite: null as string | null, como_se_sabe: null as string | null,
    regla_id: null as string | null, facturas: null as string | null, oportunidad_id: null as string | null, solo_direccion: false,
    gasto_habitual_id: null as string | null, mes_imputado: null as string | null, _cobros: null as string[] | null };
  if (/^DETIR\d/.test(n.concepto.toUpperCase())) return { ...base, clase: "devolucion", como_se_sabe: "devolución de una remesa (DETIR)" };

  if (n.importe > 0) {
    const tomar = (cs: Cobro[], como: string) => {
      for (const c of cs) cobros.splice(cobros.indexOf(c), 1);
      return { ...base, facturas: cs.map((c) => c.factura).join(" + "), oportunidad_id: cs[0].oportunidad_id, tipo: null, como_se_sabe: como, _cobros: cs.map((c) => c.id) };
    };
    const uno = cobros.filter((c) => Math.abs(c.importe - n.importe) < 0.011 && dias(c.fecha, n.fecha) <= 10).sort((a, b) => dias(a.fecha, n.fecha) - dias(b.fecha, n.fecha))[0];
    if (uno) return tomar([uno], `cobro de la app (${uno.tipo}, ${uno.fecha}), mismo importe`);
    const grupos = new Map<string, Cobro[]>();
    for (const c of cobros) if (dias(c.fecha, n.fecha) <= 10) grupos.set(`${c.fecha}|${c.pagador}`, [...(grupos.get(`${c.fecha}|${c.pagador}`) ?? []), c]);
    const orden = [...grupos.values()].sort((a, b) => dias(a[0].fecha, n.fecha) - dias(b[0].fecha, n.fecha));
    const g = orden.find((g) => g.length > 1 && Math.abs(g.reduce((s, c) => s + c.importe, 0) - n.importe) < 0.011);
    if (g) return tomar(g, `${g.length} cobros de la app del ${g[0].fecha} que suman este importe`);
    if (/FACTORING|CONFIRMING/.test(t)) {
      const c = orden.find((g) => { const s = g.reduce((s, c) => s + c.importe, 0); return s - n.importe >= 0 && s - n.importe <= 0.04 * s; });
      if (c) return tomar(c, `${c.length} cobros de la app que suman ${r2(c.reduce((s, x) => s + x.importe, 0))}; el banco paga menos: coste del anticipo`);
    }
    const rg = reglas.find((r) => r.sentido === "ingreso" && (!r.cuenta || r.cuenta === cuenta) && prueba(r.patron, t));
    if (rg) return { ...base, tipo: rg.tipo, regla_id: rg.id, solo_direccion: rg.solo_direccion, como_se_sabe: `regla: «${rg.patron}»` };
    return base;
  }

  const rg = reglas.find((r) => r.sentido === "gasto" && (!r.cuenta || r.cuenta === cuenta) && prueba(r.patron, t));
  const tipo = rg?.tipo ?? null;
  const mes = Number(n.fecha.slice(5, 7));
  let cand = gastos.filter((g) => g.empresa === empresa && (g.como_aparece ?? []).some((p) => prueba(p, t)));
  if (!cand.length && tipo) cand = gastos.filter((g) => g.empresa === empresa && (g.tipos ?? []).map((x) => x.toUpperCase()).includes(tipo.toUpperCase()));
  cand.sort((a, b) => (a.meses?.includes(mes) ? 0 : 1) - (b.meses?.includes(mes) ? 0 : 1));
  return {
    ...base, tipo, regla_id: rg?.id ?? null, mes_imputado: tipo === "NÓMINAS" ? mesDeNomina(t, n.fecha) : null, se_repite: rg?.se_repite ?? null, solo_direccion: rg?.solo_direccion ?? false,
    como_se_sabe: rg ? `regla: «${rg.patron}»` : cand.length ? "como aparece en el banco, su gasto habitual" : null,
    gasto_habitual_id: cand[0]?.id ?? null,
  };
}

// ------------------------------------------------------------------------------------------------ 4. internos
async function emparejarInternos(ids: string[]) {
  type M = { id: string; cuenta: string; fecha: string; concepto: string; mas_datos: string | null; importe: string; interno_con: string | null };
  const nuevos: M[] = [];
  for (let i = 0; i < ids.length; i += 100)
    nuevos.push(...(await leer<M>(`movimientos_bancarios?select=id,cuenta,fecha,concepto,mas_datos,importe,interno_con&id=in.(${ids.slice(i, i + 100).join(",")})`)));
  if (!nuevos.length) return;
  const min = nuevos.map((m) => m.fecha).sort()[0];
  const ini = new Date(Date.parse(min) - 4 * 864e5).toISOString().slice(0, 10);
  const todos = await leer<M>(`movimientos_bancarios?select=id,cuenta,fecha,concepto,mas_datos,importe,interno_con&fecha=gte.${ini}&interno_con=is.null`);
  const usados = new Set<string>();
  const señal = (m: M) => /TRASPASO|TRANSFER|SOTO|SOLUCIONES ACCESIBILIDAD|ACCESALIA|SU FRA|SALDO PARA/.test(`${m.concepto} ${m.mas_datos ?? ""}`.toUpperCase());
  for (const m of nuevos) {
    if (usados.has(m.id) || m.interno_con) continue;
    const otro = todos.find((o) => !usados.has(o.id) && o.id !== m.id && o.cuenta !== m.cuenta && Math.abs(Number(o.importe) + Number(m.importe)) < 0.011 && dias(o.fecha, m.fecha) <= 3 && (señal(o) || señal(m)));
    if (!otro) continue;
    usados.add(m.id).add(otro.id);
    for (const [a, b] of [[m, otro], [otro, m]] as const)
      await escribir("PATCH", `movimientos_bancarios?id=eq.${a.id}`, { clase: "interno", interno_con: b.id, tipo: null, gasto_habitual_id: null, como_se_sabe: `sale de una cuenta nuestra y entra en otra el ${b.fecha}, mismo importe` });
  }
}

// ------------------------------------------------------------------------------------------------ 5. lo que no se conoce
export async function porSaber(verSoloDireccion: boolean): Promise<PorSaber[]> {
  const f = await leer<{ id: string; cuenta: string; fecha: string; concepto: string; mas_datos: string | null; importe: string; clase: string; solo_direccion: boolean }>(
    "movimientos_bancarios?select=id,cuenta,fecha,concepto,mas_datos,importe,clase,solo_direccion&tipo=is.null&facturas=is.null&gasto_habitual_id=is.null&clase=in.(gasto,ingreso)&fecha=gte.2026-10-01&order=fecha.desc&limit=200",
  );
  return f.filter((m) => verSoloDireccion || !m.solo_direccion).map((m) => ({ ...m, importe: Number(m.importe) }));
}

/** Monica dice que es un apunte: se apunta, y queda como regla para los que vengan (el mes que viene ya no se pregunta). */
export async function decirQueEs(id: string, d: { tipo: string; seRepite: "si" | "no" | null; gastoId: string | null; patron: string }) {
  const [m] = await leer<{ id: string; cuenta: string; importe: string; concepto: string; mas_datos: string | null }>(`movimientos_bancarios?select=id,cuenta,importe,concepto,mas_datos&id=eq.${id}`);
  if (!m) throw new Error("Ese movimiento ya no está.");
  const tipo = d.tipo.trim();
  if (!tipo && !d.gastoId) throw new Error("Falta decir qué es.");
  const sentido = Number(m.importe) > 0 ? "ingreso" : "gasto";
  const patron = (d.patron || m.concepto).trim().toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const [primera] = await leer<{ orden: number }>("reglas_movimientos?select=orden&order=orden.asc&limit=1");
  const reglaId = crypto.randomUUID();
  // La regla nueva va DELANTE de las generales: lo que ella dice manda
  await escribir("POST", "reglas_movimientos", { id: reglaId, orden: (primera?.orden ?? 0) - 10, sentido, patron, cuenta: null, tipo: tipo || "GASTO HABITUAL", se_repite: d.seRepite, origen: "Mónica, al subir el extracto" });
  await escribir("PATCH", `movimientos_bancarios?id=eq.${id}`, { tipo: tipo || null, se_repite: d.seRepite, regla_id: reglaId, gasto_habitual_id: d.gastoId, como_se_sabe: "Mónica, al subir el extracto" });
  if (d.gastoId) {
    const [g] = await leer<{ como_aparece: string[] | null }>(`gastos_habituales?select=como_aparece&id=eq.${d.gastoId}`);
    const como = [...new Set([...(g?.como_aparece ?? []), patron])];
    await escribir("PATCH", `gastos_habituales?id=eq.${d.gastoId}`, { como_aparece: como });
  }
}
