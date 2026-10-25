// lib/facturableYa.ts
//
// COBRAR › FACTURABLE YA (Monica, 19-oct-2026, pensada desde cero): la pantalla de
// trabajo de Alexandra, la que algun dia tiene que quedar a CERO. Una opp entra
// cuando alcanza un hito y sale cuando su cargo esta ok.
//   - Agrupada POR OPP (paga la misma persona); dentro, una fila por cada hito
//     alcanzado sin proforma, y una por cada proforma (que agrupa los suyos).
//   - Columnas: opp | hito alcanzado (que; fecha + importe) | proforma (numero,
//     estado, fecha) | factura (numero con año, fecha) | cargo (pendiente/devuelto).
//   - Estados de la proforma: pendiente de validar → (anulada) → se puede cobrar →
//     proforma ok (la factura cuadra) o DESCUADRA → cobrada (fuera de la lista).
//   - Alerta: enviada y sin respuesta en 3 dias laborables.
// Las celdas vacias van vacias: sin «sin proforma» ni guiones.

import "server-only";
import { SEL_FICHA_HOJA, adaptarFichas } from "./hojasNuevas";
import { nombreDeOpp } from "./direccionOpp";
import { adminsDeComunidades } from "./adminComunidad";
import { proximosHitos } from "./proximosHitos";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function leer<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let d = 0; ; d += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
      headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, Range: `${d}-${d + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const x = (await r.json()) as T[];
    out.push(...x);
    if (x.length < 1000) return out;
  }
}
const tramos = (ids: string[]) => {
  const t: string[][] = [];
  for (let i = 0; i < ids.length; i += 150) t.push(ids.slice(i, i + 150));
  return t;
};

export type EstadoProforma = "sin_enviar" | "pendiente" | "se_puede_cobrar" | "ok" | "descuadra";
export type HitoFila = { que: string; fecha: string | null; importe: number | null };
export type FilaFacturable = {
  clave: string;
  hitos: HitoFila[];
  proforma: { id: string; codigo: string; estado: EstadoProforma; fecha: string | null; sinRespuesta: boolean } | null;
  factura: { id: string; numero: string; fecha: string } | null;
  cargo: { estado: "pendiente" | "devuelto"; fecha: string | null } | null;
  /** Algo en rojo: cargo devuelto, descuadra o sin respuesta. */
  rojo: boolean;
};
export type OppFacturable = { oppId: string; nombre: string; hojas: string[]; paga: string | null; comercial: string | null; filas: FilaFacturable[] };
export type Facturable = { opps: OppFacturable[]; hitos: number; porCobrar: number };

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
/** Dias laborables (lunes a viernes) desde una fecha hasta hoy, sin contarla. */
function laborablesDesde(iso: string): number {
  let n = 0;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  const fin = new Date(`${hoyISO()}T12:00:00Z`);
  while (d < fin) {
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.getUTCDay();
    if (s !== 0 && s !== 6) n++;
  }
  return n;
}
// EL HITO, CON SU NOMBRE Y NADA MAS (Monica, 19-oct-2026: «es un HITO, con una palabra sobra»).
const HITO: Record<string, string> = {
  encargo: "Encargo", firma: "Firma", entrega: "Entrega", licencia: "Licencia", inicio_obra: "Inicio de obra", cfo: "Fin de obra",
  pss: "Plan de seguridad", presentacion: "Presentación", concesion: "Concesión", adjudicacion: "Adjudicación", otro: "Otro",
};
const EMPRESA: Record<string, string> = { accesalia: "Accesalia", daniel: "Daniel", daniel_autonomo: "Daniel", ecobalance: "Ecobalance" };

type FilaPf = {
  id: string; codigo: string; fecha: string; total: number; se_puede_cobrar_en: string | null; oportunidad_id: string | null; pagador_nombre: string;
  factura: { id: string; empresa_emisora: string; anio: number; serie: string; numero: number; fecha: string; total: number; estado: string } | null;
  lineas: { hitos: { importe: number; hito: { hito: string; porcentaje: number | null; fecha_prevista: string | null; hito_padre_id: string | null;
    linea: { descripcion: string | null; hoja: { numero_hoja: string | null; fecha_firma: string | null } | null } | null } | null }[] }[];
};

export async function facturableYa(): Promise<Facturable> {
  const [{ hitos }, proformas] = await Promise.all([
    proximosHitos(),
    leer<FilaPf>(
      "proformas?select=id,codigo,fecha,total,se_puede_cobrar_en,oportunidad_id,pagador_nombre," +
        "factura:factura_id(id,empresa_emisora,anio,serie,numero,fecha,total,estado)," +
        "lineas:proforma_lineas(hitos:proforma_linea_hitos(importe,hito:hito_cobro_id(hito,porcentaje,fecha_prevista,hito_padre_id," +
        `linea:linea_facturacion_id(${SEL_FICHA_HOJA}))))` +
        "&estado=eq.emitida&empresa=in.(accesalia,daniel)",
    ).then(adaptarFichas),
  ]);
  // Lo que ya se ha alcanzado, de una hoja que ya salio de Nuevas hojas firmadas con su boton (25-oct-2026: antes
  // bastaba con validar la linea), y aun sin proforma.
  const sueltos = hitos.filter((h) => h.cuando === "ya" && h.pasada && !h.proforma && h.oppId);

  // De cada proforma: cuando se envio (el primer correo bueno) y lo cobrado de su factura.
  const facturaIds = proformas.map((p) => p.factura?.id).filter((x): x is string => !!x);
  const [envios, cobros] = await Promise.all([
    Promise.all(
      proformas.map((p) =>
        leer<{ creado_en: string }>(
          `correos_enviados?select=creado_en&ok=is.true&documentos=cs.${encodeURIComponent(JSON.stringify([{ tipo: "Proforma", id: p.id }]))}&order=creado_en.asc&limit=1`,
        ).then((x) => x[0]?.creado_en ?? null).catch(() => null),
      ),
    ),
    Promise.all(tramos(facturaIds).map((t) => leer<{ factura_id: string; fecha_cobro: string; importe: number | null; tipo: string }>(
      `cobros?select=factura_id,fecha_cobro,importe,tipo&factura_id=in.(${t.join(",")})`,
    ))).then((x) => x.flat()),
  ]);

  type Bruta = FilaFacturable & { oppId: string; hojas: string[]; paga: string | null };
  const filas: Bruta[] = [];
  for (const h of sueltos)
    filas.push({
      clave: `h-${h.id}`, oppId: h.oppId!, hojas: h.hoja ? [h.hoja] : [], paga: h.paga === "Comunidad" ? null : h.paga,
      hitos: [{ que: HITO[h.tipo] ?? h.tipo, fecha: h.fecha, importe: h.importe }], proforma: null, factura: null, cargo: null, rojo: false,
    });
  proformas.forEach((p, i) => {
    if (!p.oportunidad_id) return;
    const f = p.factura && p.factura.estado !== "anulada" ? p.factura : null;
    const suyos = f ? cobros.filter((c) => c.factura_id === f.id) : [];
    const neto = suyos.reduce((s, c) => s + Number(c.importe ?? 0), 0);
    const devuelto = suyos.some((c) => c.tipo === "devolucion");
    // Cobrada: el justificante cubre la factura. Sale de aqui (va a «Cargos ok»).
    if (f && suyos.length && !devuelto && neto >= Number(f.total) - 0.01) return;
    const enviada = envios[i];
    let estado: EstadoProforma, fecha: string | null;
    if (f) {
      estado = Math.abs(Number(f.total) - Number(p.total)) < 0.01 ? "ok" : "descuadra";
      fecha = f.fecha;
    } else if (p.se_puede_cobrar_en) {
      estado = "se_puede_cobrar";
      fecha = p.se_puede_cobrar_en;
    } else if (enviada) {
      estado = "pendiente";
      fecha = enviada.slice(0, 10);
    } else {
      estado = "sin_enviar";
      fecha = p.fecha;
    }
    const sinRespuesta = estado === "pendiente" && !!enviada && laborablesDesde(enviada) >= 3;
    const ultimoCobro = [...suyos].sort((a, b) => b.fecha_cobro.localeCompare(a.fecha_cobro))[0];
    const hs = p.lineas.flatMap((l) => l.hitos);
    filas.push({
      clave: `p-${p.id}`,
      oppId: p.oportunidad_id,
      hojas: [...new Set(hs.map((x) => x.hito?.linea?.hoja?.numero_hoja).filter((x): x is string => !!x))],
      paga: p.pagador_nombre,
      hitos: hs.map((x) => {
        const t = x.hito;
        const firma = t?.linea?.hoja?.fecha_firma ?? null;
        const alcanzado = t && (t.hito === "encargo" || t.hito === "firma") ? firma : (t?.fecha_prevista ?? null);
        return {
          que: HITO[t?.hito ?? ""] ?? t?.hito ?? "",
          fecha: alcanzado,
          importe: Number(x.importe),
        };
      }),
      proforma: { id: p.id, codigo: p.codigo, estado, fecha, sinRespuesta },
      factura: f ? { id: f.id, numero: `${EMPRESA[f.empresa_emisora] ?? f.empresa_emisora} ${f.anio}/${f.serie}-${f.numero}`, fecha: f.fecha } : null,
      cargo: f ? { estado: devuelto ? "devuelto" : "pendiente", fecha: devuelto ? (ultimoCobro?.fecha_cobro ?? null) : null } : null,
      rojo: devuelto || estado === "descuadra" || sinRespuesta,
    });
  });

  // La cabecera de cada opp: nombre, comercial y quien paga (la contrata de la hoja o,
  // si paga la comunidad, su administrador vigente).
  const oppIds = [...new Set(filas.map((f) => f.oppId))];
  const [opps, rels] = await Promise.all([
    Promise.all(tramos(oppIds).map((t) => leer<{ id: string; nombre: string | null; codigo: string | null; comercial: { nombre: string } | null }>(
      `oportunidades?select=id,nombre,codigo,comercial:comercial_id(nombre)&id=in.(${t.join(",")})`,
    ))).then((x) => x.flat()),
    Promise.all(tramos(oppIds).map((t) => leer<{ opp_id: string; acceso: { figura_legal_propietaria_id: string | null } | null }>(
      `relacion_oportunidad_accesos?select=opp_id,acceso:acceso_id(figura_legal_propietaria_id)&opp_id=in.(${t.join(",")})&hasta=is.null`,
    ))).then((x) => x.flat()),
  ]);
  const admins = await adminsDeComunidades(rels.map((r) => r.acceso?.figura_legal_propietaria_id).filter((x): x is string => !!x));
  const adminDe = new Map<string, string>();
  for (const r of rels) {
    const a = admins.get(r.acceso?.figura_legal_propietaria_id ?? "");
    // «persona · administración»: en la cabecera, la administración.
    if (a && !adminDe.has(r.opp_id)) adminDe.set(r.opp_id, a.nombre.split(" · ").pop()!);
  }
  const oppDe = new Map(opps.map((o) => [o.id, o]));

  const grupos = new Map<string, OppFacturable>();
  for (const f of filas) {
    let g = grupos.get(f.oppId);
    if (!g) {
      const o = oppDe.get(f.oppId);
      g = { oppId: f.oppId, nombre: o ? nombreDeOpp(o) : "—", hojas: [], paga: null, comercial: o?.comercial?.nombre ?? null, filas: [] };
      grupos.set(f.oppId, g);
    }
    for (const h of f.hojas) if (!g.hojas.includes(h)) g.hojas.push(h);
    g.paga ??= f.paga ?? adminDe.get(f.oppId) ?? null;
    g.filas.push({ clave: f.clave, hitos: f.hitos, proforma: f.proforma, factura: f.factura, cargo: f.cargo, rojo: f.rojo });
  }
  const masAntigua = (g: OppFacturable) => g.filas.flatMap((f) => f.hitos.map((h) => h.fecha ?? "9999")).sort()[0] ?? "9999";
  const lista = [...grupos.values()];
  for (const g of lista) g.filas.sort((a, b) => (a.hitos[0]?.fecha ?? "9999").localeCompare(b.hitos[0]?.fecha ?? "9999"));
  // Primero lo que esta en rojo; luego, lo que lleva mas tiempo esperando.
  lista.sort((a, b) => Number(b.filas.some((f) => f.rojo)) - Number(a.filas.some((f) => f.rojo)) || masAntigua(a).localeCompare(masAntigua(b)));
  const todos = lista.flatMap((g) => g.filas.flatMap((f) => f.hitos));
  return { opps: lista, hitos: todos.length, porCobrar: todos.reduce((s, h) => s + (h.importe ?? 0), 0) };
}
