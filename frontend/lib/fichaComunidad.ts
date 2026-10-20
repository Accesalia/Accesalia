// lib/fichaComunidad.ts
//
// LA FICHA DE COMUNIDAD (Monica, 20-oct-2026): la «propuesta» del 25-sep con lo
// que le faltaba. Maqueta: docs/figma/ficha-comunidad.html.
//
// SOLO LEE. Cada dato sale de donde ya vive, sin campos nuevos:
//   - nombre (provisional) / razon_social (el del CIF) / domicilio_fiscal: comunidades
//   - la gente: la AGENDA (puesto colgado de la comunidad), vigentes y anteriores
//   - los papeles: documentos (tarjeta del CIF, acta de nombramiento, DNI,
//     certificado de la cuenta) y, en cada opp, el acta de votacion
//   - la cuenta: cuentas_bancarias
//   - quien la administra: comunidad_admin_responsable (VARIOS gestores vigentes)
//   - los accesos: accesos.figura_legal_propietaria_id (la comunidad es figura legal)
//   - catastro, IEE, subvenciones, proteccion: por la referencia de sus accesos
//   - lo contratado: «de la comunidad solo sus datos», asi que las HOJAS se
//     leen por sus OPPS (vista administradores_de_oportunidad), no por comunidad_id.

import "server-only";
import { personasDeComunidad, type PersonaDeComunidad } from "./personasComunidad";
import { NOMBRE_TIPO, bonito, viaEntera } from "./direccionNombre";
import { PASOS } from "./pasosEscalera";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase ${path.split("?")[0]} ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

const enLista = (xs: string[]) => xs.map((x) => `"${x.replace(/"/g, "")}"`).join(",");
const num = (x: string | number | null) => (x === null ? null : Number(x));

// Los tipos de documento que enseña la ficha, por su nombre en el catalogo.
export const TIPO = {
  tarjeta: "tarjeta_cif",
  acta: "Acta de nombramiento del presidente",
  dni: "DNI",
  certificado: "Certificado de titularidad de la cuenta",
  votacion: "Acta de votacion de la actuacion",
  iee: "IEE - Informe de Evaluacion del Edificio",
} as const;

/** Donde vive el fichero de cada tipo, cuando ya se sube a algun sitio. */
export const ALMACEN_DE_TIPO: Record<string, string> = { [TIPO.tarjeta]: "tarjeta-cif" };

export type Papel = { id: string; enAlmacen: boolean; emision: string | null; caduca: string | null } | null;

export type Persona = {
  puestoId: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  documento: string | null;
  notas: string | null;
};
export type Presidente = Persona & { desde: string | null; acta: Papel; dni: Papel };
export type Anterior = { nombre: string; desde: string | null; hasta: string | null };

export type Gestor = { nombre: string | null; cargo: string | null; telefono: string | null; email: string | null; comercial: string | null };
export type Administracion = {
  empresa: string | null;
  telefono: string | null;
  direccion: string | null;
  desde: string | null;
  gestores: Gestor[];
};
export type AdminAnterior = { empresa: string | null; desde: string | null; hasta: string | null };

export type Acceso = { texto: string; escalera: string | null; ref: string | null; opps: string[] };

export type Hoja = {
  id: string;
  numero: string | null;
  que: string | null;
  estado: string | null;
  firma: string | null;
  pagador: string | null;
  total: number;
  lineas: { que: string; importe: number | null }[];
  firmada: { versionId: string; n: number } | null;
};
export type Opp = {
  id: string;
  codigo: string | null;
  nombre: string;
  estado: string | null;
  apertura: string | null;
  comercial: string | null;
  fase: string | null;
  accesos: string[];
  votacion: Papel;
  hojas: Hoja[];
};

export type Catastro = {
  ref: string;
  anio: number | null;
  viviendas: number | null;
  inmuebles: number | null;
  superficie: number | null;
  plantas: string | null;
  usos: string | null;
  ascensor: boolean | null;
  portalAccesible: boolean | null;
};
export type Iee = { codigo: string | null; emision: string | null; valoracion: string | null; validez: string | null; accesibilidad: string | null };
export type Subvencion = { convocatoria: string | null; fecha: string | null; importe: number | null };
export type Proteccion = { grado: string | null; tipo: string | null; denominacion: string | null };

export type Ficha = {
  id: string;
  nombre: string;
  razonSocial: string | null;
  domicilioFiscal: string | null;
  cif: string | null;
  cp: string | null;
  municipio: string | null;
  provincia: string | null;
  tarjeta: Papel;
  cuenta: { iban: string; desde: string | null; origen: string | null } | null;
  certificado: Papel;
  presidentes: Presidente[];
  presidentesAnteriores: Anterior[];
  vicepresidentes: Persona[];
  secretarios: Persona[];
  otros: (Persona & { rol: string | null })[];
  mancomunidades: string[];
  subcomunidades: string[];
  administraciones: Administracion[];
  adminAnteriores: AdminAnterior[];
  comercial: string | null;
  accesos: Acceso[];
  catastro: Catastro[];
  iee: Iee[];
  subvenciones: Subvencion[];
  proteccion: Proteccion[];
  condicionantes: string[];
  opps: Opp[];
  tipos: string[];
  conProyecto: boolean;
  ultimoContacto: string | null;
  avisos: string[];
};

const persona = (p: PersonaDeComunidad): Persona => ({
  puestoId: p.id, nombre: p.nombre, telefono: p.telefono, email: p.email, documento: p.documento, notas: p.notas,
});

export async function fichaComunidad(id: string): Promise<Ficha | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const avisos: string[] = [];
  const intenta = async <T,>(p: Promise<T>, vacio: T, que: string): Promise<T> => {
    try {
      return await p;
    } catch (e) {
      console.error(`ficha comunidad: ${que}`, e);
      avisos.push(que);
      return vacio;
    }
  };

  const [c] = await rest<
    { id: string; nombre: string; razon_social: string | null; domicilio_fiscal: string | null; cif_comunidad: string | null;
      cp: string | null; municipio: string | null; provincia: string | null; referencia_catastral: string | null }[]
  >(`comunidades?select=id,nombre,razon_social,domicilio_fiscal,cif_comunidad,cp,municipio,provincia,referencia_catastral&id=eq.${id}`);
  if (!c) return null;

  const [tipos, gente, anterioresP, admins, accesosF, cuentas, docs, oppIds, mancoP, mancoH, proyectos] = await Promise.all([
    intenta(rest<{ id: string; nombre: string }[]>(`tipos_documento?select=id,nombre&nombre=in.(${enLista(Object.values(TIPO))})`), [], "los tipos de documento"),
    intenta(personasDeComunidad(id), [], "la gente de la comunidad"),
    intenta(
      rest<{ cargo: string | null; desde: string | null; hasta: string | null; persona: { nombre: string; apellidos: string | null } | null }[]>(
        `puesto?select=cargo,desde,hasta,persona:persona_id(nombre,apellidos)&figura_legal_propietaria_id=eq.${id}&hasta=not.is.null&order=hasta.desc`,
      ),
      [],
      "los presidentes anteriores",
    ),
    intenta(
      rest<{ vigente: boolean; desde: string | null; hasta: string | null; empresa_id: string | null;
        empresa: { nombre_accesalia: string; telefono: string | null; direccion: string | null } | null;
        puesto: { cargo: string | null; telefono_empresa: string | null;
          persona: { nombre: string; apellidos: string | null; telefono_personal: string | null } | null;
          correos: { email: string | null; principal: boolean | null }[];
          comercial: { nombre: string } | null } | null }[]>(
        "comunidad_admin_responsable?select=vigente,desde,hasta,empresa_id," +
          "empresa(nombre_accesalia,telefono,direccion)," +
          "puesto(cargo,telefono_empresa,persona(nombre,apellidos,telefono_personal),correos:correo(email,principal)," +
          "comercial:comerciales!puesto_comercial_id_fkey(nombre))" +
          `&comunidad_id=eq.${id}&order=vigente.desc,desde.desc.nullslast`,
      ),
      [],
      "el administrador",
    ),
    intenta(
      rest<{ id: string; tipo_via: string | null; nombre_via: string | null; numero: string | null; escalera: string | null; ref_catastral: string | null }[]>(
        `accesos?select=id,tipo_via,nombre_via,numero,escalera,ref_catastral&figura_legal_propietaria_id=eq.${id}&order=nombre_via,numero,escalera`,
      ),
      [],
      "los accesos",
    ),
    intenta(
      rest<{ iban: string; desde: string | null; origen: string | null }[]>(
        `cuentas_bancarias?select=iban,desde,origen&titular_tipo=eq.comunidad&titular_id=eq.${id}&vigente=is.true&order=desde.desc.nullslast&limit=1`,
      ),
      [],
      "la cuenta",
    ),
    intenta(
      rest<{ id: string; tipo_documento_id: string; backend: string | null; storage_ref: string | null; fecha_emision: string | null;
        fecha_caducidad: string | null; puesto_id: string | null; persona_id: string | null; vigente: boolean | null; creado_en: string }[]>(
        `documentos?select=id,tipo_documento_id,backend,storage_ref,fecha_emision,fecha_caducidad,puesto_id,persona_id,vigente,creado_en&comunidad_id=eq.${id}&order=creado_en.desc`,
      ),
      [],
      "los documentos",
    ),
    intenta(
      rest<{ oportunidad_id: string }[]>(`administradores_de_oportunidad?select=oportunidad_id&comunidad_id=eq.${id}`).then((xs) => [
        ...new Set(xs.map((x) => x.oportunidad_id)),
      ]),
      [] as string[],
      "las oportunidades",
    ),
    intenta(
      rest<{ c: { nombre: string } | null }[]>(`relacion_mancomunidad_comunidades?select=c:comunidades!mancomunidad_padre(nombre)&comunidad_hija=eq.${id}`),
      [],
      "la mancomunidad",
    ),
    intenta(
      rest<{ c: { nombre: string } | null }[]>(`relacion_mancomunidad_comunidades?select=c:comunidades!comunidad_hija(nombre)&mancomunidad_padre=eq.${id}`),
      [],
      "las subcomunidades",
    ),
    // EL TIPO DE PROYECTO (25-sep): sale de proyectos.tipo, como ella lo escribe.
    intenta(rest<{ tipo: string | null }[]>(`proyectos?select=tipo&comunidad_id=eq.${id}`), [], "los proyectos"),
  ]);

  const idTipo = new Map(tipos.map((t) => [t.nombre, t.id]));
  const nombreTipo = new Map(tipos.map((t) => [t.id, t.nombre]));
  const papel = (d: (typeof docs)[number] | undefined): Papel =>
    d
      ? {
          id: d.id,
          enAlmacen: d.backend === "supabase" && !!d.storage_ref && !!ALMACEN_DE_TIPO[nombreTipo.get(d.tipo_documento_id) ?? ""],
          emision: d.fecha_emision,
          caduca: d.fecha_caducidad,
        }
      : null;
  const docsDe = (tipo: string) => docs.filter((d) => d.tipo_documento_id === idTipo.get(tipo) && d.vigente !== false);

  // ---- la gente, por cargo
  const rolDe = (p: PersonaDeComunidad) => (p.rol ?? "").toLowerCase();
  const presidentes: Presidente[] = gente
    .filter((p) => rolDe(p) === "presidente")
    .map((p) => {
      const mio = (tipo: string) => docsDe(tipo).find((d) => d.puesto_id === p.id || d.persona_id === p.personaId);
      return { ...persona(p), desde: null, acta: papel(mio(TIPO.acta)), dni: papel(mio(TIPO.dni)) };
    });
  const presidentesAnteriores = anterioresP
    .filter((p) => (p.cargo ?? "").toLowerCase() === "presidente" && p.persona)
    .map((p) => ({ nombre: [p.persona!.nombre, p.persona!.apellidos].filter(Boolean).join(" "), desde: p.desde, hasta: p.hasta }));

  // ---- quien la administra: los vigentes, agrupados por administracion
  const porEmpresa = new Map<string, Administracion>();
  for (const a of admins.filter((x) => x.vigente)) {
    const k = a.empresa_id ?? "sin";
    const adm = porEmpresa.get(k) ?? {
      empresa: a.empresa?.nombre_accesalia ?? null,
      telefono: a.empresa?.telefono ?? null,
      direccion: a.empresa?.direccion ?? null,
      desde: a.desde,
      gestores: [],
    };
    if (a.puesto?.persona) {
      adm.gestores.push({
        nombre: [a.puesto.persona.nombre, a.puesto.persona.apellidos].filter(Boolean).join(" "),
        cargo: a.puesto.cargo,
        telefono: a.puesto.telefono_empresa ?? a.puesto.persona.telefono_personal,
        email: [...a.puesto.correos].sort((x, y) => Number(!!y.principal) - Number(!!x.principal)).find((x) => x.email)?.email ?? null,
        comercial: a.puesto.comercial?.nombre ?? null,
      });
    }
    porEmpresa.set(k, adm);
  }
  const administraciones = [...porEmpresa.values()];
  const comercialCartera = administraciones.flatMap((a) => a.gestores).find((g) => g.comercial)?.comercial ?? null;

  // ---- las opps y sus hojas
  const [opps, fases, oppAccesos, hojas, votaciones] = oppIds.length
    ? await Promise.all([
        intenta(
          rest<{ id: string; codigo: string | null; nombre: string | null; estado: string | null; fecha_apertura: string | null;
            anulada_en: string | null; comercial: { nombre: string } | null }[]>(
            `oportunidades?select=id,codigo,nombre,estado,fecha_apertura,anulada_en,comercial:comerciales!oportunidades_comercial_id_fkey(nombre)` +
              `&id=in.(${oppIds.join(",")})&order=fecha_apertura.asc.nullslast`,
          ),
          [],
          "las oportunidades",
        ),
        intenta(
          rest<{ id: string; clave: string | null; ultimo_contacto: string | null }[]>(`opps_por_fases?select=id,clave,ultimo_contacto&id=in.(${oppIds.join(",")})`),
          [],
          "la fase de las opps",
        ),
        intenta(
          rest<{ opp_id: string; acceso_id: string }[]>(`relacion_oportunidad_accesos?select=opp_id,acceso_id&opp_id=in.(${oppIds.join(",")})&hasta=is.null`),
          [],
          "los accesos de las opps",
        ),
        intenta(
          rest<{ id: string; oportunidad_id: string; numero_hoja: string | null; descripcion: string | null; estado: string | null;
            fecha_firma: string | null; fecha_creacion: string | null; pagador_tipo: string | null; version_firmada_id: string | null;
            lineas_facturacion: { descripcion: string | null; importe: string | null }[];
            versiones_hoja: { id: string; numero_version: number; pdfs_firmados: string[] | null }[] }[]>(
            "hojas_encargo?select=id,oportunidad_id,numero_hoja,descripcion,estado,fecha_firma,fecha_creacion,pagador_tipo,version_firmada_id," +
              "lineas_facturacion(descripcion,importe)," +
              "versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,pdfs_firmados)" +
              `&oportunidad_id=in.(${oppIds.join(",")})&order=fecha_firma.asc.nullslast,fecha_creacion.asc`,
          ),
          [],
          "las hojas de encargo",
        ),
        idTipo.get(TIPO.votacion)
          ? intenta(
              rest<{ id: string; oportunidad_id: string; backend: string | null; storage_ref: string | null; fecha_emision: string | null;
                fecha_caducidad: string | null; tipo_documento_id: string; puesto_id: string | null; persona_id: string | null; vigente: boolean | null; creado_en: string }[]>(
                `documentos?select=id,oportunidad_id,backend,storage_ref,fecha_emision,fecha_caducidad,tipo_documento_id,puesto_id,persona_id,vigente,creado_en` +
                  `&oportunidad_id=in.(${oppIds.join(",")})&tipo_documento_id=eq.${idTipo.get(TIPO.votacion)}`,
              ),
              [],
              "las actas de votacion",
            )
          : Promise.resolve([]),
      ])
    : [[], [], [], [], []];

  const textoAcceso = (a: (typeof accesosF)[number]) =>
    [a.tipo_via ? NOMBRE_TIPO[a.tipo_via] ?? a.tipo_via : null, a.nombre_via ? bonito(viaEntera(a.nombre_via)) : null, a.numero]
      .filter(Boolean)
      .join(" ");
  const accesoPorId = new Map(accesosF.map((a) => [a.id, a]));
  const faseDe = new Map(fases.map((f) => [f.id, f]));

  const oppsFicha: Opp[] = opps
    .filter((o) => !o.anulada_en)
    .map((o) => {
      const mios = oppAccesos.filter((r) => r.opp_id === o.id).map((r) => accesoPorId.get(r.acceso_id)).filter((a) => !!a);
      const clave = faseDe.get(o.id)?.clave ?? null;
      return {
        id: o.id,
        codigo: o.codigo,
        nombre: o.nombre?.trim() || o.codigo || "Sin nombre",
        estado: o.estado,
        apertura: o.fecha_apertura,
        comercial: o.comercial?.nombre ?? null,
        fase: clave ? (PASOS.find((p) => p.clave === clave)?.titulo ?? clave) : null,
        accesos: [...new Set(mios.map(textoAcceso))],
        votacion: papel(votaciones.find((d) => d.oportunidad_id === o.id) as (typeof docs)[number] | undefined),
        hojas: hojas
          .filter((h) => h.oportunidad_id === o.id && h.estado !== "anulada")
          .map((h) => {
            const lineas = h.lineas_facturacion.map((l) => ({ que: l.descripcion ?? "sin concepto", importe: num(l.importe) }));
            const vs = [...h.versiones_hoja].sort((a, b) => b.numero_version - a.numero_version);
            const v = vs.find((x) => x.id === h.version_firmada_id && x.pdfs_firmados?.length) ?? vs.find((x) => x.pdfs_firmados?.length);
            return {
              id: h.id,
              numero: h.numero_hoja,
              que: h.descripcion,
              estado: h.estado,
              firma: h.fecha_firma,
              pagador: h.pagador_tipo,
              total: lineas.reduce((s, l) => s + (l.importe ?? 0), 0),
              lineas,
              firmada: v ? { versionId: v.id, n: 0 } : null,
            };
          }),
      };
    });

  // ---- catastro, IEE, subvenciones y proteccion: por las referencias de sus accesos
  const refs = [...new Set([...accesosF.map((a) => a.ref_catastral), c.referencia_catastral].filter((x): x is string => !!x).map((r) => r.slice(0, 14)))];
  const [cat, iee, subv, prot, cond] = refs.length
    ? await Promise.all([
        intenta(
          rest<{ referencia: string; anio: number | null; viviendas: number | null; inmuebles: number | null; superficie: string | null;
            plantas: string[] | null; usos: Record<string, number> | null; tiene_ascensor: boolean | null; portal_accesible: boolean | null }[]>(
            `ficha_catastro?select=referencia,anio,viviendas,inmuebles,superficie,plantas,usos,tiene_ascensor,portal_accesible&referencia=in.(${enLista(refs)})`,
          ),
          [],
          "la ficha de Catastro",
        ),
        intenta(
          rest<{ codigo: string | null; fecha_emision: string | null; valoracion: string | null; validez: string | null; accesibilidad_satisface: string | null }[]>(
            `iee_registrado?select=codigo,fecha_emision,valoracion,validez,accesibilidad_satisface&referencia_parcela=in.(${enLista(refs)})&order=fecha_emision.desc.nullslast`,
          ),
          [],
          "el IEE",
        ),
        intenta(
          rest<{ convocatoria: string | null; fecha: string | null; importe: string | null }[]>(
            `subvencion_concedida?select=convocatoria,fecha,importe&referencia=in.(${enLista(refs)})&order=fecha.desc.nullslast`,
          ),
          [],
          "las subvenciones",
        ),
        intenta(
          rest<{ grado: string | null; tipo: string | null; denominacion: string | null }[]>(
            `catalogo_proteccion?select=grado,tipo,denominacion&referencia_catastral=in.(${enLista(refs)})`,
          ),
          [],
          "la proteccion",
        ),
        intenta(rest<{ texto: string }[]>(`condicionantes_comunidad?select=texto&comunidad_id=eq.${id}`), [], "los condicionantes"),
      ])
    : [[], [], [], [], []];

  const PLANTA = (p: string) => (/^-?\d+$/.test(p) ? Number(p) : null);
  const catastro: Catastro[] = cat.map((f) => {
    const ns = (f.plantas ?? []).map(PLANTA).filter((x): x is number => x !== null);
    const usos = f.usos ? Object.entries(f.usos).sort((a, b) => b[1] - a[1]).map(([u, n]) => `${n} ${u.toLowerCase()}`).join(" · ") : null;
    return {
      ref: f.referencia,
      anio: f.anio,
      viviendas: f.viviendas,
      inmuebles: f.inmuebles,
      superficie: num(f.superficie),
      plantas: ns.length ? `${Math.min(...ns)} a ${Math.max(...ns)}`.replace(/-/g, "−") : null,
      usos,
      ascensor: f.tiene_ascensor,
      portalAccesible: f.portal_accesible,
    };
  });

  const ultimo = fases.map((f) => f.ultimo_contacto).filter((x): x is string => !!x).sort().at(-1) ?? null;

  return {
    id: c.id,
    nombre: c.nombre,
    razonSocial: c.razon_social,
    domicilioFiscal: c.domicilio_fiscal,
    cif: c.cif_comunidad,
    cp: c.cp,
    municipio: c.municipio,
    provincia: c.provincia,
    tarjeta: papel(docsDe(TIPO.tarjeta)[0]),
    cuenta: cuentas[0] ?? null,
    certificado: papel(docsDe(TIPO.certificado)[0]),
    presidentes,
    presidentesAnteriores,
    vicepresidentes: gente.filter((p) => rolDe(p) === "vicepresidente").map(persona),
    secretarios: gente.filter((p) => rolDe(p) === "secretario").map(persona),
    otros: gente.filter((p) => !["presidente", "vicepresidente", "secretario"].includes(rolDe(p))).map((p) => ({ ...persona(p), rol: p.rol })),
    mancomunidades: mancoP.map((m) => m.c?.nombre).filter((x): x is string => !!x),
    subcomunidades: mancoH.map((m) => m.c?.nombre).filter((x): x is string => !!x),
    administraciones,
    adminAnteriores: admins.filter((a) => !a.vigente).map((a) => ({ empresa: a.empresa?.nombre_accesalia ?? null, desde: a.desde, hasta: a.hasta })),
    comercial: comercialCartera ?? oppsFicha.at(-1)?.comercial ?? null,
    accesos: accesosF.map((a) => ({
      texto: textoAcceso(a),
      escalera: a.escalera,
      ref: a.ref_catastral,
      opps: oppsFicha.filter((o) => oppAccesos.some((r) => r.opp_id === o.id && r.acceso_id === a.id)).map((o) => o.codigo ?? o.nombre),
    })),
    catastro,
    iee: iee.map((x) => ({ codigo: x.codigo, emision: x.fecha_emision, valoracion: x.valoracion, validez: x.validez, accesibilidad: x.accesibilidad_satisface })),
    subvenciones: subv.map((s) => ({ convocatoria: s.convocatoria, fecha: s.fecha, importe: num(s.importe) })),
    proteccion: prot,
    condicionantes: cond.map((x) => x.texto),
    opps: oppsFicha,
    tipos: [...new Set(proyectos.map((p) => p.tipo).filter((x): x is string => !!x))],
    conProyecto: proyectos.length > 0,
    ultimoContacto: ultimo,
    avisos,
  };
}

/** El documento de esta comunidad (o de una de sus opps), para firmarle el enlace. */
export async function rutaDePapel(comunidadId: string, docId: string): Promise<{ almacen: string; ruta: string } | null> {
  if (!/^[0-9a-f-]{36}$/.test(docId)) return null;
  const [d] = await rest<{ comunidad_id: string | null; oportunidad_id: string | null; backend: string | null; storage_ref: string | null; tipo: { nombre: string } | null }[]>(
    `documentos?select=comunidad_id,oportunidad_id,backend,storage_ref,tipo:tipos_documento(nombre)&id=eq.${docId}`,
  );
  if (!d || d.backend !== "supabase" || !d.storage_ref) return null;
  if (d.comunidad_id !== comunidadId) {
    if (!d.oportunidad_id) return null;
    const suyas = await rest<{ oportunidad_id: string }[]>(
      `administradores_de_oportunidad?select=oportunidad_id&comunidad_id=eq.${comunidadId}&oportunidad_id=eq.${d.oportunidad_id}&limit=1`,
    );
    if (!suyas.length) return null;
  }
  const almacen = ALMACEN_DE_TIPO[d.tipo?.nombre ?? ""];
  return almacen ? { almacen, ruta: d.storage_ref } : null;
}

/** Enlace firmado de diez minutos. */
export async function firmarEnlace(almacen: string, ruta: string): Promise<string | null> {
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${almacen}/${ruta}`, {
    method: "POST",
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 600 }),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const { signedURL } = (await r.json()) as { signedURL?: string };
  return signedURL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE}/storage/v1${signedURL}` : null;
}
