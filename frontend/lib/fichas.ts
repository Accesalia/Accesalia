import "server-only";
// lib/fichas.ts
//
// LA FICHA DE PERSONA Y LA FICHA DE CONTRATA (Monica, 12-oct-2026).
//
// PERSONA, en tres pisos:
//   1. Los datos personales: nombre, apellidos, telefono y correo personales y
//      lo demas ligado a la persona (la agenda: "sea quien sea").
//   2. Su relacion con nosotros: cada cargo con desde-hasta (presidente de la
//      comunidad X, administrador que lleva tales direcciones nuestras, tecnico
//      del Ayto de Leganes, comercial de la contrata X) y el historial de los
//      anteriores ("asi el ex CEGA queda retratado", 10-sep).
//   3. Debajo, lo de su puesto vigente: su administracion, su contrata, su
//      comunidad o su organismo.
//
// CONTRATA: sus datos, sus notas, su gente (actual y anterior) y lo que hemos
// hecho con ella (hojas que paga, presupuestos de licitacion, comisiones).

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(ruta: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json()) as T;
}
const esId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

// ---------------------------------------------------------------- persona

export type Mundo = "comunidad" | "administracion" | "contrata" | "organismo" | "otro";

export type Cargo = {
  id: string;
  mundo: Mundo;
  cargo: string | null;
  /** Donde: la comunidad, la administracion, la contrata o el organismo. */
  entidadId: string | null;
  entidad: string;
  area: string | null;
  desde: string | null;
  hasta: string | null;
  telefono: string | null;
  correos: string[];
  /** Solo administradores: las direcciones nuestras que lleva. */
  lleva: { id: string; nombre: string; municipio: string | null }[];
};

export type FichaPersona = {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  correos: { email: string; etiqueta: string | null }[];
  notas: string | null;
  actuales: Cargo[];
  anteriores: Cargo[];
  /** Si es de Accesalia: su ficha de empleado (hoy, los comerciales, que son
   *  los que estan en la agenda). Seccion con llave: RRHH, direccion y el mismo. */
  empleado: { equipoId: string; email: string | null; titulacion: string | null; activo: boolean; funciones: string[] } | null;
  /** Si es comercial: su cartera. Llave: direccion, supervision y el mismo. */
  comercial: { id: string; administraciones: number; oppsAbiertas: number } | null;
};

type PuestoCrudo = {
  id: string;
  cargo: string | null;
  desde: string | null;
  hasta: string | null;
  telefono_empresa: string | null;
  figura_legal_propietaria_id: string | null;
  empresa: { id: string; nombre_accesalia: string | null } | null;
  contrata: { id: string; nombre: string } | null;
  organismo: { id: string; nombre: string } | null;
  area: { nombre: string } | null;
  correos: { email: string }[];
};

export async function fichaPersona(id: string): Promise<FichaPersona | null> {
  if (!esId(id)) return null;
  const [p] = await leer<
    { id: string; nombre: string; apellidos: string | null; telefono_personal: string | null; notas: string | null; correos: { email: string; etiqueta: string | null; puesto_id: string | null }[]; puestos: PuestoCrudo[] }[]
  >(
    `persona?select=id,nombre,apellidos,telefono_personal,notas,correos:correo(email,etiqueta,puesto_id),` +
      `puestos:puesto(id,cargo,desde,hasta,telefono_empresa,figura_legal_propietaria_id,empresa:empresa_id(id,nombre_accesalia),contrata:contrata_id(id,nombre),organismo:organismo_id(id,nombre),area:organismo_area_id(nombre),correos:correo(email))` +
      `&id=eq.${id}`,
  );
  if (!p) return null;

  // Las comunidades de los cargos de vecino, y las que lleva cada administrador.
  const figuras = p.puestos.map((x) => x.figura_legal_propietaria_id).filter((x): x is string => !!x);
  const deAdmin = p.puestos.filter((x) => x.empresa).map((x) => x.id);
  const [comunidades, llevadas] = await Promise.all([
    figuras.length ? leer<{ id: string; nombre: string }[]>(`comunidades?select=id,nombre&id=in.(${figuras.join(",")})`) : Promise.resolve([]),
    deAdmin.length
      ? leer<{ puesto_id: string; comunidad: { id: string; nombre: string; municipio: string | null } | null }[]>(
          `comunidad_admin_responsable?select=puesto_id,comunidad:comunidad_id(id,nombre,municipio)&vigente=is.true&puesto_id=in.(${deAdmin.join(",")})`,
        )
      : Promise.resolve([]),
  ]);
  const nombreCom = new Map(comunidades.map((c) => [c.id, c.nombre]));

  // ¿Es de la casa? Hoy solo los comerciales estan en la agenda.
  const [com] = await leer<{ id: string; equipo: { id: string; email: string | null; titulacion: string | null; activo: boolean; funciones: { hasta: string | null; funcion: { nombre: string } | null }[] } | null }[]>(
    `comerciales?select=id,equipo:equipo_id(id,email,titulacion,activo,funciones:equipo_funciones(hasta,funcion:funcion_id(nombre)))&persona_id=eq.${id}&limit=1`,
  );
  const [cartera, abiertas] = com
    ? await Promise.all([
        leer<{ id: string }[]>(`empresa?select=id&comercial_id=eq.${com.id}&activa=is.true`),
        leer<{ id: string }[]>(`oportunidades?select=id&comercial_id=eq.${com.id}&estado=eq.abierta`),
      ])
    : [[], []];

  const cargos: Cargo[] = p.puestos.map((x) => {
    const mundo: Mundo = x.figura_legal_propietaria_id ? "comunidad" : x.empresa ? "administracion" : x.contrata ? "contrata" : x.organismo ? "organismo" : "otro";
    return {
      id: x.id,
      mundo,
      cargo: x.cargo,
      entidadId: x.figura_legal_propietaria_id ?? x.empresa?.id ?? x.contrata?.id ?? x.organismo?.id ?? null,
      entidad:
        (x.figura_legal_propietaria_id ? nombreCom.get(x.figura_legal_propietaria_id) : null) ??
        x.empresa?.nombre_accesalia ??
        x.contrata?.nombre ??
        x.organismo?.nombre ??
        "—",
      area: x.area?.nombre ?? null,
      desde: x.desde,
      hasta: x.hasta,
      telefono: x.telefono_empresa,
      correos: x.correos.map((c) => c.email),
      lleva: llevadas
        .filter((l) => l.puesto_id === x.id && l.comunidad)
        .map((l) => l.comunidad!)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    };
  });
  const porDesde = (a: Cargo, b: Cargo) => (b.desde ?? "").localeCompare(a.desde ?? "");
  return {
    id: p.id,
    nombre: p.nombre,
    apellidos: p.apellidos,
    telefono: p.telefono_personal,
    // Los suyos, los que no son de un puesto.
    correos: p.correos.filter((c) => !c.puesto_id).map((c) => ({ email: c.email, etiqueta: c.etiqueta })),
    notas: p.notas,
    actuales: cargos.filter((c) => !c.hasta).sort(porDesde),
    anteriores: cargos.filter((c) => c.hasta).sort((a, b) => (b.hasta ?? "").localeCompare(a.hasta ?? "")),
    empleado: com?.equipo
      ? {
          equipoId: com.equipo.id,
          email: com.equipo.email,
          titulacion: com.equipo.titulacion,
          activo: com.equipo.activo,
          funciones: com.equipo.funciones.filter((f) => !f.hasta && f.funcion).map((f) => f.funcion!.nombre),
        }
      : null,
    comercial: com ? { id: com.id, administraciones: cartera.length, oppsAbiertas: abiertas.length } : null,
  };
}

// ------------------------------------------- lo de su puesto vigente (piso 3)

export type ResumenAdministracion = {
  id: string;
  nombre: string;
  legal: string | null;
  cif: string | null;
  telefono: string | null;
  direccion: string | null;
  municipio: string | null;
  estado: string | null;
  comercial: string | null;
  ultimoContacto: string | null;
  comunidades: number;
  oppsVivas: number;
};

export async function resumenAdministracion(id: string): Promise<ResumenAdministracion | null> {
  if (!esId(id)) return null;
  const [[e], llevadas, vivas] = await Promise.all([
    leer<{ id: string; nombre_accesalia: string; nombre_legal: string | null; cif: string | null; telefono: string | null; direccion: string | null; municipio: string | null; estado: string | null; fecha_ultimo_contacto: string | null; comercial: { nombre: string } | null }[]>(
      `empresa?select=id,nombre_accesalia,nombre_legal,cif,telefono,direccion,municipio,estado,fecha_ultimo_contacto,comercial:comercial_id(nombre)&id=eq.${id}`,
    ),
    leer<{ comunidad_id: string }[]>(`comunidad_admin_responsable?select=comunidad_id&vigente=is.true&empresa_id=eq.${id}`),
    leer<{ id: string }[]>(`oportunidades?select=id,puesto:administrador_puesto_id!inner(empresa_id)&estado=eq.abierta&puesto.empresa_id=eq.${id}`).catch(() => []),
  ]);
  if (!e) return null;
  return {
    id: e.id,
    nombre: e.nombre_accesalia,
    legal: e.nombre_legal,
    cif: e.cif,
    telefono: e.telefono,
    direccion: e.direccion,
    municipio: e.municipio,
    estado: e.estado,
    comercial: e.comercial?.nombre ?? null,
    ultimoContacto: e.fecha_ultimo_contacto,
    comunidades: new Set(llevadas.map((x) => x.comunidad_id)).size,
    oppsVivas: vivas.length,
  };
}

export type ResumenComunidad = { id: string; nombre: string; direccion: string | null; municipio: string | null; cif: string | null; viviendas: number | null; anio: number | null; oppsVivas: number };

export async function resumenComunidad(id: string): Promise<ResumenComunidad | null> {
  if (!esId(id)) return null;
  const [[c], vivas] = await Promise.all([
    leer<{ id: string; nombre: string; direccion: string | null; municipio: string | null; cif_comunidad: string | null; num_viviendas: number | null; anio_construccion: number | null }[]>(
      `comunidades?select=id,nombre,direccion,municipio,cif_comunidad,num_viviendas,anio_construccion&id=eq.${id}`,
    ),
    leer<{ id: string }[]>(`oportunidades?select=id&estado=eq.abierta&comunidad_id=eq.${id}`),
  ]);
  return c
    ? { id: c.id, nombre: c.nombre, direccion: c.direccion, municipio: c.municipio, cif: c.cif_comunidad, viviendas: c.num_viviendas, anio: c.anio_construccion, oppsVivas: vivas.length }
    : null;
}

export type ResumenOrganismo = { id: string; nombre: string; tipo: string | null; ambito: string | null; direccion: string | null; telefono: string | null; sede: string | null; notas: string | null };

export async function resumenOrganismo(id: string): Promise<ResumenOrganismo | null> {
  if (!esId(id)) return null;
  const [o] = await leer<{ id: string; nombre: string; tipo: string | null; ambito: string | null; direccion: string | null; telefono: string | null; sede_electronica: string | null; notas: string | null }[]>(
    `organismos?select=id,nombre,tipo,ambito,direccion,telefono,sede_electronica,notas&id=eq.${id}`,
  );
  return o ? { id: o.id, nombre: o.nombre, tipo: o.tipo, ambito: o.ambito, direccion: o.direccion, telefono: o.telefono, sede: o.sede_electronica, notas: o.notas } : null;
}

// ---------------------------------------------------------------- contrata

export type FichaContrata = {
  id: string;
  nombre: string;
  razonSocial: string | null;
  cif: string | null;
  tipo: string | null;
  especialidad: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  domicilioFiscal: string | null;
  relacion: string | null;
  activa: boolean;
  emisorFactura: string | null;
  codigosExigidos: string | null;
  notasFiabilidad: string | null;
  notasComercial: string | null;
  gente: { actuales: GenteContrata[]; anteriores: GenteContrata[] };
  hojas: { total: number; ultimas: { id: string; numero: string | null; comunidad: string | null; comunidadId: string | null; estado: string | null; fecha: string | null }[] };
  licitaciones: { total: number; ultimas: { id: string; fecha: string | null; pem: number | null; estado: string | null; rol: string | null }[] };
  comisiones: { id: string; beneficiario: string | null; porcentaje: number | null; importe: number | null; base: string | null; vigente: boolean; notas: string | null }[];
  notas: { id: string; texto: string; autor: string | null; fecha: string }[];
};
export type GenteContrata = { personaId: string; nombre: string; cargo: string | null; desde: string | null; hasta: string | null; telefono: string | null; correos: string[] };

const texto = (v: unknown) => (v == null || v === "" ? null : Array.isArray(v) ? v.join(", ") : String(v));

export async function fichaContrata(id: string): Promise<FichaContrata | null> {
  if (!esId(id)) return null;
  const [[c], puestos, hojas, licit, comis, notas] = await Promise.all([
    leer<Record<string, unknown>[]>(
      `contratas?select=id,nombre,razon_social,cif,tipo,especialidad,telefono,email,direccion,domicilio_fiscal,relacion_estado,activa,emisor_factura,codigos_exigidos,notas_fiabilidad,notas_comercial&id=eq.${id}`,
    ),
    leer<{ cargo: string | null; desde: string | null; hasta: string | null; telefono_empresa: string | null; persona: { id: string; nombre: string; apellidos: string | null } | null; correos: { email: string }[] }[]>(
      `puesto?select=cargo,desde,hasta,telefono_empresa,persona:persona_id(id,nombre,apellidos),correos:correo(email)&contrata_id=eq.${id}`,
    ),
    leer<{ id: string; numero_hoja: string | null; estado: string | null; fecha_creacion: string | null; comunidad: { id: string; nombre: string } | null }[]>(
      `hojas_encargo?select=id,numero_hoja,estado,fecha_creacion,comunidad:comunidad_id(id,nombre)&pagador_contrata_id=eq.${id}&order=fecha_creacion.desc.nullslast`,
    ),
    leer<{ id: string; fecha_presupuesto: string | null; importe_pem: number | null; estado: string | null; rol_pretendido: string | null }[]>(
      `presupuestos_licitacion?select=id,fecha_presupuesto,importe_pem,estado,rol_pretendido&contrata_id=eq.${id}&order=fecha_presupuesto.desc.nullslast`,
    ),
    leer<{ id: string; beneficiario: string | null; porcentaje: number | null; importe: number | null; base_calculo: string | null; vigente: boolean; notas: string | null }[]>(
      `acuerdos_comision?select=id,beneficiario,porcentaje,importe,base_calculo,vigente,notas&contrata_id=eq.${id}&order=vigente.desc`,
    ),
    leer<{ id: string; texto: string; autor: string | null; creado_en: string }[]>(`notas_contratas?select=id,texto,autor,creado_en&contrata_id=eq.${id}&order=creado_en.desc`),
  ]);
  if (!c) return null;
  const gente: GenteContrata[] = puestos
    .filter((p) => p.persona)
    .map((p) => ({
      personaId: p.persona!.id,
      nombre: [p.persona!.nombre, p.persona!.apellidos].filter(Boolean).join(" "),
      cargo: p.cargo,
      desde: p.desde,
      hasta: p.hasta,
      telefono: p.telefono_empresa,
      correos: p.correos.map((x) => x.email),
    }));
  return {
    id: String(c.id),
    nombre: String(c.nombre),
    razonSocial: texto(c.razon_social),
    cif: texto(c.cif),
    tipo: texto(c.tipo),
    especialidad: texto(c.especialidad),
    telefono: texto(c.telefono),
    email: texto(c.email),
    direccion: texto(c.direccion),
    domicilioFiscal: texto(c.domicilio_fiscal),
    relacion: texto(c.relacion_estado),
    activa: c.activa !== false,
    emisorFactura: texto(c.emisor_factura),
    codigosExigidos: texto(c.codigos_exigidos),
    notasFiabilidad: texto(c.notas_fiabilidad),
    notasComercial: texto(c.notas_comercial),
    gente: {
      actuales: gente.filter((g) => !g.hasta).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      anteriores: gente.filter((g) => g.hasta).sort((a, b) => (b.hasta ?? "").localeCompare(a.hasta ?? "")),
    },
    hojas: {
      total: hojas.length,
      ultimas: hojas.slice(0, 10).map((h) => ({ id: h.id, numero: h.numero_hoja, comunidad: h.comunidad?.nombre ?? null, comunidadId: h.comunidad?.id ?? null, estado: h.estado, fecha: h.fecha_creacion })),
    },
    licitaciones: { total: licit.length, ultimas: licit.slice(0, 10).map((l) => ({ id: l.id, fecha: l.fecha_presupuesto, pem: l.importe_pem, estado: l.estado, rol: l.rol_pretendido })) },
    comisiones: comis.map((x) => ({ id: x.id, beneficiario: x.beneficiario, porcentaje: x.porcentaje, importe: x.importe, base: x.base_calculo, vigente: x.vigente, notas: x.notas })),
    notas: notas.map((n) => ({ id: n.id, texto: n.texto, autor: n.autor, fecha: n.creado_en })),
  };
}
