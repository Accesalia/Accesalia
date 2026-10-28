// lib/negociacion.ts
//
// BLOQUE 3 · SEGUIMIENTO Y NEGOCIACION (Monica, 28-oct-2026; maqueta docs/figma/bloque3-seguimiento.html): lo que el
// comercial necesita tener delante para negociar, sacado de donde ya vive. Aqui no se inventa ningun dato:
//   - QUIEN ES QUIEN: los administradores de la comunidad (vista administradores_de_oportunidad), con su ACUERDO DE
//     COMISION (comisionesAdmin): «la ve el comercial, la incluye en su precio y la negocia el». Si la cobra otra
//     persona (el jefe), se dice: «lo cobra el jefe, fulano no tiene constancia». Y lo que nos ha traido en 12 meses.
//   - LA AGENDA DE ESTA COMUNIDAD: las citas de la opp, de sus comunidades o que la nombran en el asunto («como buscar
//     en Google por el nombre»). Una sola fuente: citas.
//   - LAS JUNTAS (juntas) y LOS CAMBIOS PEDIDOS (he_estados_hoja: cambios de la comunidad o del comercial).
import "server-only";
import { listaAcuerdos, type Acuerdo } from "./comisionesAdmin";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}
const uuid = (x: string) => /^[0-9a-f-]{36}$/.test(x);
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

export type AdminNegociacion = {
  personaId: string | null;
  persona: string;
  empresaId: string | null;
  empresa: string | null;
  telefono: string | null;
  /** «Del Brio cobra 1.000 € por proyecto y 50 € por subvencion» */
  comision: string | null;
  /** Quien la cobra, si no es el mismo: «lo cobra el jefe, Ivan no tiene constancia». */
  cobraOtro: string | null;
  /** Lo que nos ha traido en 12 meses (como quien la trae) y cuantas se firmaron. */
  traidas12: number;
  firmadas12: number;
};
export type CitaNegociacion = { id: string; inicio: string; tipo: string; asunto: string; direccion: string | null; estado: string | null };
export type JuntaNegociacion = { id: string; fecha: string | null; celebrada: boolean; resultado: string | null; detalle: string | null; seguimiento: boolean };
export type CambioPedido = { version: string; estado: string; fecha: string; nota: string | null; quien: string | null };

export type Negociacion = {
  admins: AdminNegociacion[];
  citas: CitaNegociacion[];
  juntas: JuntaNegociacion[];
  cambios: CambioPedido[];
};

const FIRMADAS = ["firmada_recibida", "ok_comercial", "hitos_validados", "primer_cobro", "ok_administracion"];

function textoComision(a: Acuerdo, empresa: string | null): string | null {
  if (a.noCobra) return "Acuerdo apuntado: no cobra comisión.";
  const que = (["proyecto", "subvenciones", "contrata"] as const)
    .map((s) => {
      const c = a.condiciones[s];
      if (!c || c.valor == null) return null;
      const cuanto = c.forma === "pct" ? `${EUR.format(c.valor)} %` : `${EUR.format(c.valor)} €`;
      const sobre = s === "proyecto" ? "por proyecto" : s === "subvenciones" ? "por subvención" : "de la contrata";
      return `${cuanto} ${sobre}${c.estado === "pendiente" ? " (pendiente de pactar)" : ""}`;
    })
    .filter(Boolean);
  if (!que.length) return a.notas ?? "Hay acuerdo, sin cifras apuntadas.";
  return `${empresa ?? a.persona ?? "Cobra"} cobra ${que.join(" y ")}.`;
}

export async function negociacionDe(oppId: string, nombreOpp: string): Promise<Negociacion> {
  if (!uuid(oppId)) return { admins: [], citas: [], juntas: [], cambios: [] };
  const hace12 = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  // La calle y el numero del nombre de la opp («Principes de España 17 y 19, Coslada» → «Principes de España 17»):
  // con eso se buscan en la agenda las citas que la nombran.
  const calle = nombreOpp.split(",")[0].replace(/\s+y\s+\d+.*$/, "").trim();

  const [admins, comunidades, juntas, versiones, acuerdos] = await Promise.all([
    leer<{ comunidad_id: string; puesto: { telefono_empresa: string | null; cargo: string | null; persona: { id: string; nombre: string; apellidos: string | null } | null; empresa: { id: string; nombre_accesalia: string } | null } | null }[]>(
      `administradores_de_oportunidad?select=comunidad_id,puesto:puesto_id(telefono_empresa,cargo,persona:persona_id(id,nombre,apellidos),empresa:empresa_id(id,nombre_accesalia))&oportunidad_id=eq.${oppId}`,
    ).catch(() => []),
    leer<{ acceso: { figura_legal_propietaria_id: string | null } | null }[]>(
      `relacion_oportunidad_accesos?select=acceso:acceso_id(figura_legal_propietaria_id)&opp_id=eq.${oppId}&hasta=is.null`,
    ).catch(() => []),
    leer<{ id: string; fecha_junta: string | null; celebrada: boolean | null; resultado: string | null; resultado_detalle: string | null; requiere_seguimiento: boolean | null }[]>(
      `juntas?select=id,fecha_junta,celebrada,resultado,resultado_detalle,requiere_seguimiento&oportunidad_id=eq.${oppId}&order=fecha_junta.desc.nullslast`,
    ).catch(() => []),
    leer<{ codigo_he: string | null; numero_version: number; estados: { estado: string; fecha: string; nota: string | null; persona: { nombre: string } | null }[] }[]>(
      `he_versiones_hoja?select=codigo_he,numero_version,estados:he_estados_hoja(estado,fecha,nota,persona:persona_id(nombre))&oportunidad_id=eq.${oppId}`,
    ).catch(() => []),
    listaAcuerdos().catch(() => [] as Acuerdo[]),
  ]);

  // ---- quien es quien: los administradores, sin repetir, con su comision y lo que nos han traido
  const vistos = new Set<string>();
  const unicos = admins.filter((a) => {
    const k = a.puesto?.persona?.id ?? a.puesto?.empresa?.id ?? "";
    if (!k || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  const personas = unicos.map((a) => a.puesto?.persona?.id).filter((x): x is string => !!x);
  const traidas = personas.length
    ? await leer<{ id: string; quien_lo_trae: string; hojas: { estado: string }[] }[]>(
        `oportunidades?select=id,quien_lo_trae,hojas:he_versiones_hoja(estado)&quien_lo_trae=in.(${personas.join(",")})&fecha_apertura=gte.${hace12}&anulada_en=is.null`,
      ).catch(() => [])
    : [];
  const vivos = acuerdos.filter((a) => a.vigente);
  const adminsOut: AdminNegociacion[] = unicos.map((a) => {
    const p = a.puesto?.persona ?? null;
    const e = a.puesto?.empresa ?? null;
    const nombre = p ? [p.nombre, p.apellidos].filter(Boolean).join(" ").trim() : (e?.nombre_accesalia ?? "Administración");
    const acuerdo = vivos.find((x) => (p && x.personaId === p.id) || (e && x.empresas.some((y) => y.id === e.id))) ?? null;
    const suyas = traidas.filter((t) => t.quien_lo_trae === p?.id);
    return {
      personaId: p?.id ?? null,
      persona: nombre,
      empresaId: e?.id ?? null,
      empresa: e?.nombre_accesalia ?? null,
      telefono: a.puesto?.telefono_empresa ?? null,
      comision: acuerdo ? textoComision(acuerdo, e?.nombre_accesalia ?? null) : null,
      cobraOtro: acuerdo && p && acuerdo.personaId && acuerdo.personaId !== p.id ? `Lo cobra ${acuerdo.persona ?? "otra persona"}: ${p.nombre} no tiene constancia.` : null,
      traidas12: suyas.length,
      firmadas12: suyas.filter((t) => t.hojas.some((h) => FIRMADAS.includes(h.estado))).length,
    };
  });

  // ---- la agenda de esta comunidad: de la opp, de sus comunidades o que la nombran
  const comIds = [...new Set(comunidades.map((c) => c.acceso?.figura_legal_propietaria_id).filter((x): x is string => !!x && uuid(x)))];
  const filtros = [`oportunidad_id.eq.${oppId}`];
  if (comIds.length) filtros.push(`comunidad_id.in.(${comIds.join(",")})`);
  if (calle.length >= 4) filtros.push(`asunto.ilike.*${encodeURIComponent(calle.replace(/[(),*]/g, " ").trim())}*`);
  const citas = await leer<{ id: string; inicio: string; tipo: string; asunto: string; direccion: string | null; estado: string | null }[]>(
    `citas?select=id,inicio,tipo,asunto,direccion,estado&or=(${filtros.join(",")})&order=inicio.desc&limit=50`,
  ).catch(() => []);

  // ---- los cambios que han pedido (los de la comunidad o el comercial; los de Daniel son de casa)
  const cambios: CambioPedido[] = versiones
    .flatMap((v) =>
      v.estados
        .filter((e) => e.estado === "cambios_comunidad" || e.estado === "cambios_comercial")
        .map((e) => ({ version: `${v.codigo_he ?? "sin código"} v${v.numero_version}`, estado: e.estado, fecha: e.fecha, nota: e.nota, quien: e.persona?.nombre ?? null })),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return {
    admins: adminsOut,
    citas,
    juntas: juntas.map((j) => ({ id: j.id, fecha: j.fecha_junta, celebrada: !!j.celebrada, resultado: j.resultado, detalle: j.resultado_detalle, seguimiento: !!j.requiere_seguimiento })),
    cambios,
  };
}
