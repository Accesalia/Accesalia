// lib/listaAdministraciones.ts
//
// LA LISTA DE ADMINISTRADORES (Monica, 20-oct-2026): "en el area
// administracion, una lista de los administradores que existen, para poder
// arreglar, completar... algo parecido a la de opps". Dos vistas:
//   · por EMPRESA: nombre, el jefe, fecha de alta en cartera, que comercial(es)
//     la llevan, ultimo contacto y opps firmadas;
//   · por GESTOR: su nombre, su empresa, su fecha de alta, el comercial que lo
//     lleva y las opps firmadas con el.
//
// DE DONDE SALE CADA COSA:
//   · el jefe: el puesto vigente marcado "el que manda" (cargo_clave);
//   · la fecha de alta: la apertura de su PRIMERA opp (Monica, 20-oct: el campo
//     de la empresa esta vacio en todas y el del gestor casi siempre);
//   · el comercial: la cartera del gestor (puesto.comercial_id); la empresa, los
//     de todos sus gestores;
//   · el ultimo contacto: el del gestor (cartera_gestor_resumen); la empresa, el
//     mas reciente de los suyos;
//   · firmadas: opps ganadas (con hoja firmada), por el administrador de su
//     comunidad (administradores_de_oportunidad), nunca por un campo de la opp.
//
// SOLO LEE.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

/** Todo, de mil en mil: la API no da mas de golpe. */
async function todo<T>(path: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: { ...CAB, Range: `${desde}-${desde + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
    const lote = (await r.json()) as T[];
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  return filas;
}

export type FilaEmpresa = {
  id: string;
  nombre: string;
  municipio: string | null;
  jefes: string[];
  alta: string | null;
  /** Los comerciales de las carteras de sus gestores (ids). */
  comerciales: string[];
  ultimoContacto: string | null;
  firmadas: number;
  gestores: number;
};

export type FilaGestor = {
  puestoId: string;
  personaId: string | null;
  nombre: string;
  cargo: string | null;
  jefe: boolean;
  empresaId: string;
  empresa: string;
  municipio: string | null;
  alta: string | null;
  comercialId: string | null;
  ultimoContacto: string | null;
  firmadas: number;
};

export async function listaAdministraciones(): Promise<{ empresas: FilaEmpresa[]; gestores: FilaGestor[]; comerciales: { id: string; nombre: string }[] }> {
  const [emps, puestos, adm, res, contactos, comerciales] = await Promise.all([
    todo<{ id: string; nombre_accesalia: string | null; nombre_legal: string | null; municipio: string | null }>(
      "empresa?select=id,nombre_accesalia,nombre_legal,municipio&tipo=eq.administracion_fincas&order=id",
    ),
    todo<{ id: string; empresa_id: string; persona_id: string | null; cargo: string | null; cargo_clave: string | null; comercial_id: string | null; persona: { nombre: string | null; apellidos: string | null } | null }>(
      "puesto?select=id,empresa_id,persona_id,cargo,cargo_clave,comercial_id,persona:persona_id(nombre,apellidos)&hasta=is.null&contrata_id=is.null&empresa_id=not.is.null&order=id",
    ),
    todo<{ oportunidad_id: string; puesto_id: string | null; empresa_id: string | null }>(
      "administradores_de_oportunidad?select=oportunidad_id,puesto_id,empresa_id&or=(puesto_id.not.is.null,empresa_id.not.is.null)&order=oportunidad_id,comunidad_id",
    ),
    todo<{ oportunidad_id: string; fecha_apertura: string | null; resultado: string }>(
      "resultado_oportunidad?select=oportunidad_id,fecha_apertura,resultado&resultado=neq.anulada&order=oportunidad_id",
    ),
    todo<{ puesto_id: string; ultimo_contacto: string | null }>("cartera_gestor_resumen?select=puesto_id,ultimo_contacto&ultimo_contacto=not.is.null&order=puesto_id"),
    todo<{ id: string; nombre: string }>("comerciales?select=id,nombre&order=nombre.asc"),
  ]);

  const deEmpresa = new Map(emps.map((e) => [e.id, e]));
  const opp = new Map(res.map((r) => [r.oportunidad_id, r]));
  const contacto = new Map(contactos.map((c) => [c.puesto_id, c.ultimo_contacto]));

  // Las opps de cada gestor y de cada empresa (sin repetir: una opp con dos
  // comunidades de la misma empresa cuenta una vez).
  const oppsGestor = new Map<string, Set<string>>();
  const oppsEmpresa = new Map<string, Set<string>>();
  const anadir = (m: Map<string, Set<string>>, k: string, o: string) => {
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(o);
  };
  for (const a of adm) {
    if (!opp.has(a.oportunidad_id)) continue; // anuladas fuera
    if (a.puesto_id) anadir(oppsGestor, a.puesto_id, a.oportunidad_id);
    if (a.empresa_id) anadir(oppsEmpresa, a.empresa_id, a.oportunidad_id);
  }
  const resumen = (ids: Set<string> | undefined) => {
    let alta: string | null = null;
    let firmadas = 0;
    for (const id of ids ?? []) {
      const r = opp.get(id);
      if (!r) continue;
      if (r.fecha_apertura && (!alta || r.fecha_apertura < alta)) alta = r.fecha_apertura;
      if (r.resultado === "ganada") firmadas += 1;
    }
    return { alta, firmadas };
  };
  const nombreDe = (p: (typeof puestos)[number]) =>
    [p.persona?.nombre, p.persona?.apellidos].map((x) => x?.trim()).filter(Boolean).join(" ") || "Sin nombre";
  const nombreEmpresa = (e: (typeof emps)[number]) => e.nombre_accesalia?.trim() || e.nombre_legal?.trim() || "Sin nombre";

  const gestores: FilaGestor[] = puestos
    .filter((p) => deEmpresa.has(p.empresa_id))
    .map((p) => {
      const e = deEmpresa.get(p.empresa_id)!;
      const r = resumen(oppsGestor.get(p.id));
      return {
        puestoId: p.id,
        personaId: p.persona_id,
        nombre: nombreDe(p),
        cargo: p.cargo?.trim() || null,
        jefe: p.cargo_clave === "el que manda",
        empresaId: e.id,
        empresa: nombreEmpresa(e),
        municipio: e.municipio?.trim() || null,
        alta: r.alta,
        comercialId: p.comercial_id,
        ultimoContacto: contacto.get(p.id) ?? null,
        firmadas: r.firmadas,
      };
    });

  const porEmpresa = new Map<string, FilaGestor[]>();
  for (const g of gestores) porEmpresa.set(g.empresaId, [...(porEmpresa.get(g.empresaId) ?? []), g]);

  const empresas: FilaEmpresa[] = emps.map((e) => {
    const suyos = porEmpresa.get(e.id) ?? [];
    const r = resumen(oppsEmpresa.get(e.id));
    const ultimo = suyos.map((g) => g.ultimoContacto).filter((x): x is string => !!x).sort().pop() ?? null;
    return {
      id: e.id,
      nombre: nombreEmpresa(e),
      municipio: e.municipio?.trim() || null,
      jefes: suyos.filter((g) => g.jefe).map((g) => g.nombre),
      alta: r.alta,
      comerciales: [...new Set(suyos.map((g) => g.comercialId).filter((x): x is string => !!x))],
      ultimoContacto: ultimo,
      firmadas: r.firmadas,
      gestores: suyos.length,
    };
  });

  return { empresas, gestores, comerciales };
}
