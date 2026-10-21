// lib/gastosMes.ts
//
// PREVER › GASTOS DEL MES (Monica, 21-oct-2026; maqueta validada: docs/figma/gastos-del-mes.html).
// Para un mes: cada gasto habitual de Accesalia y de Daniel con su PREVISTO (si toca ese mes) y su REAL (lo que
// salio del banco y esta enlazado a ese gasto: movimientos_bancarios.gasto_habitual_id). Lo pagado, en verde; lo
// pendiente, con el dia en que suele salir; «¿no pasó?» si ya tocaba. Lo que salio del banco y no es de ningun gasto,
// en «Sin prever». Arriba, los saldos (del ultimo extracto, con su fecha) y el cartel: lo que no es de todos los
// meses y toca este mes, el siguiente y los dos de despues, con lo que hay que hacer.
// Los impuestos no van aqui: estan en Pagar › Impuestos.
// Quien lo ve: facturacion (Alexandra) y direccion. Lo marcado «solo direccion», solo direccion.

import "server-only";
import type { Yo } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}
/** PostgREST corta en 1.000 filas sin avisar: aqui se pide por tramos. */
async function leerTodo<T>(path: string): Promise<T[]> {
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
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<{ id: string }[]>;
}

export type EmpresaGasto = "accesalia" | "daniel_autonomo";
export const EMPRESAS_GASTO: EmpresaGasto[] = ["accesalia", "daniel_autonomo"];
export const NOMBRE_EMPRESA: Record<EmpresaGasto, string> = { accesalia: "Accesalia", daniel_autonomo: "Daniel" };
const EMPRESA_DE_CUENTA: Record<string, EmpresaGasto> = { caixa_accesalia: "accesalia", bbva_accesalia: "accesalia", caixa_daniel: "daniel_autonomo" };
export type Cada = "mensual" | "trimestral" | "semestral" | "anual" | "una_vez" | "plazos";

export type Gasto = {
  id: string;
  empresa: EmpresaGasto;
  concepto: string;
  importe: number | null;
  cada: Cada;
  dia: number | null;
  meses: number[] | null;
  desde: string | null;
  hasta: string | null;
  notas: string | null;
  accion: string | null;
  avisar: boolean;
  solo_direccion: boolean;
  activo: boolean;
  como_aparece: string[] | null;
  tipos: string[] | null;
};

export type Estado = "pagado" | "pendiente" | "no_paso" | "no_toca";
export type FilaGasto = { gasto: Gasto; previsto: number | null; real: number | null; estado: Estado; apuntes: number };
export type Apunte = { id: string; fecha: string; concepto: string; mas_datos: string | null; importe: number; tipo: string | null };
export type BloqueEmpresa = {
  empresa: EmpresaGasto;
  filas: FilaGasto[];
  sinPrever: Apunte[];
  previsto: number;
  real: number;
  pagado: number;
  quedaPorPagar: number;
};
export type Aviso = { gasto: Gasto; mes: string; importe: number | null };
export type Saldo = { clave: string; nombre: string; saldo: number; fecha: string; limite: number | null };
export type GastosMes = {
  mes: string;
  hasta: string | null;          // hasta que dia llega el ultimo extracto
  cerrado: boolean;              // el extracto cubre el mes entero: hay «Diferencia»
  futuro: boolean;               // aun no ha empezado (o no hay extracto de ese mes)
  saldos: Saldo[];
  bloques: BloqueEmpresa[];
  cartel: { este: Aviso[]; siguiente: Aviso[]; despues: Aviso[]; sinMes: Gasto[] };
  verSoloDireccion: boolean;
};

/** Quien ve Gastos del mes: facturacion (Alexandra) y direccion. */
export function puedeVerGastos(yo: Yo) {
  return yo.veTodo || yo.funciones.some((f) => f.clave === "facturacion");
}

const finDeMes = (mes: string) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).toISOString().slice(0, 10);
export const mesMas = (m: string, n: number) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);

/** ¿Toca este gasto en el mes? Dentro de su desde/hasta; mensual siempre; una vez, en el mes de «desde»; el resto, en sus meses. */
export function tocaEn(g: Gasto, mes: string) {
  const ini = `${mes}-01`;
  const fin = finDeMes(mes);
  if (g.desde && g.desde > fin) return false;
  if (g.hasta && g.hasta < ini) return false;
  if (!g.activo && !g.hasta) return false;
  if (g.cada === "mensual") return true;
  if (g.cada === "una_vez") return !!g.desde && g.desde.slice(0, 7) === mes;
  return !!g.meses?.includes(Number(mes.slice(5, 7)));
}

const SELECT_GASTO = "id,empresa,concepto,importe,cada,dia,meses,desde,hasta,notas,accion,avisar,solo_direccion,activo,como_aparece,tipos";
const num = (v: unknown) => (v == null ? null : Number(v));
const aGasto = (g: Record<string, unknown>) => ({ ...g, importe: num(g.importe) }) as Gasto;

export async function gastosDelMes(mes: string, yo: Yo): Promise<GastosMes> {
  const verSoloDireccion = yo.veTodo;
  const ini = `${mes}-01`;
  const fin = finDeMes(mes);
  const [gastosTodos, movs, cuentas] = await Promise.all([
    leer<Record<string, unknown>[]>(`gastos_habituales?select=${SELECT_GASTO}&empresa=in.(accesalia,daniel_autonomo)&order=importe.desc.nullslast`),
    leerTodo<{ id: string; cuenta: string; fecha: string; concepto: string; mas_datos: string | null; importe: string; tipo: string | null; gasto_habitual_id: string | null; solo_direccion: boolean }>(
      `movimientos_bancarios?select=id,cuenta,fecha,concepto,mas_datos,importe,tipo,gasto_habitual_id,solo_direccion&clase=eq.gasto&fecha=gte.${ini}&fecha=lte.${fin}&order=fecha`,
    ),
    leer<{ clave: string; banco: string; empresa: string; limite_credito: string | null }[]>("cuentas_propias?select=clave,banco,empresa,limite_credito&vigente=eq.true&order=clave"),
  ]);
  const gastos = gastosTodos.map(aGasto).filter((g) => verSoloDireccion || !g.solo_direccion);
  const visibles = movs.filter((m) => verSoloDireccion || !m.solo_direccion);

  // Los saldos: el ultimo apunte de cada cuenta. Y hasta donde llega el extracto.
  const saldos: Saldo[] = [];
  for (const c of cuentas) {
    const [u] = await leer<{ fecha: string; saldo: string }[]>(`movimientos_bancarios?select=fecha,saldo&cuenta=eq.${c.clave}&order=orden.desc&limit=1`);
    if (u)
      saldos.push({
        clave: c.clave,
        nombre: `${c.banco} ${c.empresa === "accesalia" ? "Accesalia" : "Daniel"}`,
        saldo: Number(u.saldo),
        fecha: u.fecha,
        limite: num(c.limite_credito),
      });
  }
  const hasta = saldos.length ? saldos.map((s) => s.fecha).sort()[0] : null;   // el extracto que menos llega manda
  const cerrado = !!hasta && hasta >= fin;
  const futuro = !hasta || hasta < ini;
  const diaCorte = hasta && hasta.slice(0, 7) === mes ? Number(hasta.slice(8, 10)) : cerrado ? 31 : 0;

  const realDe = new Map<string, { suma: number; n: number }>();
  for (const m of visibles) {
    if (!m.gasto_habitual_id) continue;
    const r = realDe.get(m.gasto_habitual_id) ?? { suma: 0, n: 0 };
    r.suma += -Number(m.importe);
    r.n += 1;
    realDe.set(m.gasto_habitual_id, r);
  }

  const bloques: BloqueEmpresa[] = EMPRESAS_GASTO.map((empresa) => {
    const filas: FilaGasto[] = [];
    for (const g of gastos.filter((x) => x.empresa === empresa)) {
      const toca = tocaEn(g, mes);
      const r = realDe.get(g.id);
      if (!toca && !r) continue;
      const previsto = toca ? g.importe : null;
      const real = r ? Math.round(r.suma * 100) / 100 : null;
      let estado: Estado = "no_toca";
      if (real != null && real > 0) estado = "pagado";
      else if (toca) estado = !futuro && (cerrado || (g.dia ?? 31) <= diaCorte) ? "no_paso" : "pendiente";
      filas.push({ gasto: g, previsto, real, estado, apuntes: r?.n ?? 0 });
    }
    // Por PREVISTO, de mayor a menor (Monica, 21-oct): lo gordo arriba, y si un mes algo se dispara no cambia el orden.
    // Lo que no tocaba y salio igual, al final, por su importe habitual.
    filas.sort((a, b) => (b.previsto ?? -1) - (a.previsto ?? -1) || (b.gasto.importe ?? 0) - (a.gasto.importe ?? 0));
    const sinPrever = visibles
      .filter((m) => !m.gasto_habitual_id && EMPRESA_DE_CUENTA[m.cuenta] === empresa && !(m.tipo ?? "").startsWith("IMPUESTOS"))
      .map((m) => ({ id: m.id, fecha: m.fecha, concepto: m.concepto, mas_datos: m.mas_datos, importe: -Number(m.importe), tipo: m.tipo }));
    const previsto = filas.reduce((s, f) => s + (f.previsto ?? 0), 0);
    const pagado = filas.reduce((s, f) => s + (f.real ?? 0), 0) + sinPrever.reduce((s, a) => s + a.importe, 0);
    const quedaPorPagar = filas.filter((f) => f.estado === "pendiente" || f.estado === "no_paso").reduce((s, f) => s + (f.previsto ?? 0), 0);
    return { empresa, filas, sinPrever, previsto, real: pagado, pagado, quedaPorPagar };
  });

  // El cartel: lo que NO es de todos los meses (y lo que tiene algo que hacer), en este mes, el siguiente y los dos de despues
  const avisos = (m: string) =>
    gastos
      .filter((g) => g.activo && g.avisar && (g.cada !== "mensual" || g.accion) && tocaEn(g, m))
      .map((g) => ({ gasto: g, mes: m, importe: g.importe }));
  const cartel = {
    este: avisos(mes),
    siguiente: avisos(mesMas(mes, 1)),
    despues: [...avisos(mesMas(mes, 2)), ...avisos(mesMas(mes, 3))],
    sinMes: gastos.filter((g) => g.activo && ["trimestral", "semestral", "anual", "plazos"].includes(g.cada) && !g.meses?.length),
  };
  return { mes, hasta, cerrado, futuro, saldos, bloques, cartel, verSoloDireccion };
}

// ------------------------------------------------------------------------------------------------ guardar
export type DatosGasto = {
  empresa: EmpresaGasto;
  concepto: string;
  importe: number | null;
  cada: Cada;
  meses: number[] | null;
  dia: number | null;
  desde: string | null;
  hasta: string | null;
  como_aparece: string | null;
  accion: string | null;
  avisar: boolean;
  solo_direccion: boolean;
};

/** Alta o cambio de un gasto habitual. Y enseguida, los apuntes del banco que aun no son de nadie y casan con
 *  «en el banco aparece como» pasan a ser suyos: asi su «Real» sale ya, sin esperar al siguiente extracto. */
export async function guardarGasto(d: DatosGasto, id: string | null, yo: Yo) {
  const concepto = d.concepto.trim();
  if (!concepto) throw new Error("Falta el nombre.");
  if (d.cada !== "mensual" && d.cada !== "una_vez" && !d.meses?.length) throw new Error("Falta en qué mes (o meses).");
  if (d.cada === "una_vez" && !d.desde) throw new Error("Falta en qué mes.");
  const fila = {
    empresa: d.empresa,
    concepto,
    importe: d.importe,
    cada: d.cada,
    meses: d.cada === "mensual" || d.cada === "una_vez" ? null : d.meses,
    dia: d.dia,
    desde: d.desde,
    hasta: d.hasta,
    como_aparece: d.como_aparece ? d.como_aparece.split(/\s*[,;]\s*/).map((p) => p.trim().toUpperCase()).filter(Boolean) : null,
    accion: d.accion?.trim() || null,
    avisar: d.avisar,
    solo_direccion: yo.veTodo ? d.solo_direccion : false,
  };
  const [g] = id
    ? await escribir("PATCH", `gastos_habituales?id=eq.${id}`, fila)
    : await escribir("POST", "gastos_habituales", { ...fila, origen: "manual", activo: true });
  if (fila.como_aparece?.length) {
    const cuentas = Object.entries(EMPRESA_DE_CUENTA).filter(([, e]) => e === d.empresa).map(([c]) => c);
    const libres = await leerTodo<{ id: string; concepto: string; mas_datos: string | null }>(
      `movimientos_bancarios?select=id,concepto,mas_datos&clase=eq.gasto&gasto_habitual_id=is.null&cuenta=in.(${cuentas.join(",")})`,
    );
    const casan = libres.filter((m) => {
      const t = `${m.concepto} ${m.mas_datos ?? ""}`.toUpperCase();
      return fila.como_aparece!.some((p) => {
        try {
          return new RegExp(p).test(t);
        } catch {
          return t.includes(p);
        }
      });
    });
    for (let i = 0; i < casan.length; i += 80)
      await escribir("PATCH", `movimientos_bancarios?id=in.(${casan.slice(i, i + 80).map((m) => m.id).join(",")})`, { gasto_habitual_id: g.id });
  }
  return g.id;
}

/** Quitar un gasto: deja de preverse desde este mes (no se borra: su historia en el banco se queda). */
export async function quitarGasto(id: string, mes: string) {
  await escribir("PATCH", `gastos_habituales?id=eq.${id}`, { activo: false, hasta: finDeMes(mesMas(mes, -1)) });
}

// ------------------------------------------------------------------------------------------------ la lista de gastos
// GESTIONAR LA LISTA DE GASTOS (Monica, 21-oct-2026): todos los gastos, toquen este mes o no, para cambiarlos de una
// vez. De cada uno, lo que se sabe y lo que dice el banco: la ultima vez que salio, la media por vez del ultimo año,
// la proxima vez que toca y lo que cuesta al año. Y lo que le falta: revisar el importe, no saber reconocerlo en el
// banco, el mes, el importe, el dia.

export type Falta = "revisar_importe" | "no_reconoce" | "falta_mes" | "falta_importe" | "falta_dia";
export type GastoLista = {
  gasto: Gasto;
  ultima: { fecha: string; importe: number } | null;
  mediaPorVez: number | null;      // ultimos 12 meses: lo pagado / las veces (meses) que salio
  vecesAno: number;                // cuantas veces toca en un año
  alAno: number | null;            // previsto x veces al año
  proxima: string | null;          // AAAA-MM
  faltas: Falta[];
};
export type ListaGastos = { hoy: string; verSoloDireccion: boolean; empresas: { empresa: EmpresaGasto; activos: GastoLista[]; bajas: GastoLista[]; alMes: number; alAno: number }[] };

const VECES: Record<Cada, number> = { mensual: 12, trimestral: 4, semestral: 2, anual: 1, una_vez: 1, plazos: 0 };

export async function listaGastos(yo: Yo, hoy: string): Promise<ListaGastos> {
  const verSoloDireccion = yo.veTodo;
  const haceUnAno = `${mesMas(hoy, -12)}-01`;
  const [gastosTodos, movs] = await Promise.all([
    leer<Record<string, unknown>[]>(`gastos_habituales?select=${SELECT_GASTO}&empresa=in.(accesalia,daniel_autonomo)`),
    leerTodo<{ fecha: string; importe: string; gasto_habitual_id: string }>(
      "movimientos_bancarios?select=fecha,importe,gasto_habitual_id&gasto_habitual_id=not.is.null&order=fecha",
    ),
  ]);
  const gastos = gastosTodos.map(aGasto).filter((g) => verSoloDireccion || !g.solo_direccion);
  const porGasto = new Map<string, { fecha: string; importe: number }[]>();
  for (const m of movs) porGasto.set(m.gasto_habitual_id, [...(porGasto.get(m.gasto_habitual_id) ?? []), { fecha: m.fecha, importe: -Number(m.importe) }]);

  const fila = (g: Gasto): GastoLista => {
    const ms = porGasto.get(g.id) ?? [];
    const ultimoMes = ms.length ? ms[ms.length - 1].fecha.slice(0, 7) : null;
    const ultima = ultimoMes ? { fecha: ms[ms.length - 1].fecha, importe: ms.filter((m) => m.fecha.startsWith(ultimoMes)).reduce((s, m) => s + m.importe, 0) } : null;
    const ano = ms.filter((m) => m.fecha >= haceUnAno);
    const veces = new Set(ano.map((m) => m.fecha.slice(0, 7))).size;
    const mediaPorVez = veces ? Math.round(ano.reduce((s, m) => s + m.importe, 0) / veces * 100) / 100 : null;
    let proxima: string | null = null;
    for (let i = 0; i < 36 && !proxima; i++) if (tocaEn(g, mesMas(hoy, i))) proxima = mesMas(hoy, i);
    const vecesAno = g.cada === "plazos" ? Array.from({ length: 12 }, (_, i) => mesMas(hoy, i)).filter((m) => tocaEn(g, m)).length : VECES[g.cada];
    const faltas: Falta[] = [];
    if (g.importe == null) faltas.push("falta_importe");
    if (g.cada !== "mensual" && g.cada !== "una_vez" && !g.meses?.length) faltas.push("falta_mes");
    if (!g.como_aparece?.length && !g.tipos?.length) faltas.push("no_reconoce");
    if (g.dia == null) faltas.push("falta_dia");
    if (g.importe != null && mediaPorVez != null && Math.abs(mediaPorVez - g.importe) > Math.max(20, g.importe * 0.15)) faltas.push("revisar_importe");
    return { gasto: g, ultima, mediaPorVez, vecesAno, alAno: g.importe == null ? null : Math.round(g.importe * vecesAno), proxima, faltas };
  };
  const empresas = EMPRESAS_GASTO.map((empresa) => {
    const todos = gastos.filter((g) => g.empresa === empresa).map(fila);
    const vivo = (x: GastoLista) => x.gasto.activo && (!x.gasto.hasta || x.gasto.hasta >= `${hoy}-01`);
    const activos = todos.filter(vivo).sort((a, b) => (b.gasto.importe ?? -1) - (a.gasto.importe ?? -1));
    const bajas = todos.filter((x) => !vivo(x)).sort((a, b) => (b.gasto.hasta ?? "").localeCompare(a.gasto.hasta ?? ""));
    const alAno = activos.reduce((s, x) => s + (x.alAno ?? 0), 0);
    return { empresa, activos, bajas, alMes: Math.round(alAno / 12), alAno };
  });
  return { hoy, verSoloDireccion, empresas };
}

/** Cambios sueltos desde la lista: avisar, notas, importe. */
export async function cambiarGasto(id: string, cambio: { avisar?: boolean; notas?: string | null; importe?: number }) {
  await escribir("PATCH", `gastos_habituales?id=eq.${id}`, cambio);
}

/** Dejar de incluirlo (como la Ford): se prevé hasta el mes que se diga, incluido; despues, no. */
export async function dejarDeIncluir(id: string, ultimoMes: string) {
  await escribir("PATCH", `gastos_habituales?id=eq.${id}`, { activo: false, hasta: finDeMes(ultimoMes) });
}

/** Volver a incluirlo. */
export async function volverAIncluir(id: string) {
  await escribir("PATCH", `gastos_habituales?id=eq.${id}`, { activo: true, hasta: null });
}
