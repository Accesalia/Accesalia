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

/** Donde vive el fichero de cada tipo. La tarjeta, en su almacen de siempre; los
 *  demas, en el privado de la documentacion de la comunidad (el del portal). */
export const ALMACEN_DE_TIPO: Record<string, string> = {
  [TIPO.tarjeta]: "tarjeta-cif",
  [TIPO.acta]: "documentos-comerciales",
  [TIPO.dni]: "documentos-comerciales",
  [TIPO.certificado]: "documentos-comerciales",
  [TIPO.votacion]: "documentos-comerciales",
};

/** Lo que llega del PORTAL se queda donde lo subio la comunidad (su almacen,
 *  carpeta portal/): al aceptarlo no se mueve, se apunta. */
export const almacenDe = (tipo: string, ruta: string | null): string | null =>
  // Y lo del cajon de documentos de la opp (25-oct-2026), igual: se queda en su carpeta opp/.
  ruta?.startsWith("portal/") || ruta?.startsWith("opp/") ? "documentos-comerciales" : (ALMACEN_DE_TIPO[tipo] ?? null);

/** Los papeles que se suben desde la ficha. */
export type ClavePapel = "tarjeta" | "acta" | "dni" | "certificado" | "votacion";
export const PAPELES: Record<ClavePapel, { tipo: string; fecha: "emision" | "caducidad" | null }> = {
  tarjeta: { tipo: TIPO.tarjeta, fecha: null },
  acta: { tipo: TIPO.acta, fecha: "emision" },
  dni: { tipo: TIPO.dni, fecha: "caducidad" },
  certificado: { tipo: TIPO.certificado, fecha: "emision" },
  votacion: { tipo: TIPO.votacion, fecha: "emision" },
};

export type Papel = { id: string; enAlmacen: boolean; emision: string | null; caduca: string | null; creado: string } | null;

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
  /** hoja_encargo, nota_responsabilidad... */
  tipoDocumento: string | null;
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
  /** Acta y DNI subidos cuando aun no hay presidente apuntado. */
  actaSuelta: Papel;
  dniSuelto: Papel;
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
          enAlmacen: d.backend === "supabase" && !!d.storage_ref && !!almacenDe(nombreTipo.get(d.tipo_documento_id) ?? "", d.storage_ref),
          emision: d.fecha_emision,
          caduca: d.fecha_caducidad,
          creado: d.creado_en,
        }
      : null;
  const docsDe = (tipo: string) => docs.filter((d) => d.tipo_documento_id === idTipo.get(tipo) && d.vigente !== false);

  // ---- la gente, por cargo
  const rolDe = (p: PersonaDeComunidad) => (p.rol ?? "").toLowerCase();
  // El acta o el DNI subidos sin presidente apuntado (puesto vacio) van al
  // primero que haya; si no hay ninguno, se enseñan sueltos.
  const suelto = (tipo: string) => docsDe(tipo).find((d) => !d.puesto_id && !d.persona_id);
  const presidentes: Presidente[] = gente
    .filter((p) => rolDe(p) === "presidente")
    .map((p, i) => {
      const mio = (tipo: string) => docsDe(tipo).find((d) => d.puesto_id === p.id || d.persona_id === p.personaId) ?? (i === 0 ? suelto(tipo) : undefined);
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
            fecha_firma: string | null; fecha_creacion: string | null; pagador_tipo: string | null; version_firmada_id: string | null; tipo_documento: string | null;
            lineas_facturacion: { descripcion: string | null; importe: string | null; quitada_en: string | null }[];
            versiones_hoja: { id: string; numero_version: number; pdfs_firmados: string[] | null }[] }[]>(
            "hojas_encargo?select=id,oportunidad_id,numero_hoja,descripcion,estado,fecha_firma,fecha_creacion,pagador_tipo,version_firmada_id,tipo_documento," +
              "lineas_facturacion(descripcion,importe,quitada_en)," +
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
                  `&oportunidad_id=in.(${oppIds.join(",")})&tipo_documento_id=eq.${idTipo.get(TIPO.votacion)}&vigente=is.true&order=creado_en.desc`,
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
            // las quitadas de la hoja no cuentan
            const lineas = h.lineas_facturacion.filter((l) => !l.quitada_en).map((l) => ({ que: l.descripcion ?? "sin concepto", importe: num(l.importe) }));
            const vs = [...h.versiones_hoja].sort((a, b) => b.numero_version - a.numero_version);
            const v = vs.find((x) => x.id === h.version_firmada_id && x.pdfs_firmados?.length) ?? vs.find((x) => x.pdfs_firmados?.length);
            return {
              id: h.id,
              numero: h.numero_hoja,
              tipoDocumento: h.tipo_documento,
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
    actaSuelta: presidentes.length ? null : papel(suelto(TIPO.acta)),
    dniSuelto: presidentes.length ? null : papel(suelto(TIPO.dni)),
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
  const almacen = almacenDe(d.tipo?.nombre ?? "", d.storage_ref);
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

// ---------------------------------------------------------------- subir papeles
//
// SUBIR DESDE LA FICHA (Monica, 20-oct-2026): «poner que falta sin dar opcion de
// subirla, mala cosa». Cada papel que falta se arrastra o se elige ahi mismo.
// El navegador sube el fichero con un permiso de un solo uso y despues se
// apunta en documentos. Si ya habia uno, el nuevo es su version siguiente y el
// anterior deja de estar vigente: no se borra nada.

const CAB_ESCRIBIR = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };

const limpio = (n: string) =>
  n.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80) || "documento";

const carpeta = (clave: ClavePapel, comunidadId: string) =>
  clave === "tarjeta" ? `${comunidadId}/` : `comunidades/${comunidadId}/${clave}/`;

/** Permiso de un solo uso para que el navegador suba UN fichero. */
export async function permisoPapel(comunidadId: string, clave: ClavePapel, nombre: string): Promise<{ ruta: string; url: string }> {
  const almacen = ALMACEN_DE_TIPO[PAPELES[clave].tipo];
  const ruta = `${carpeta(clave, comunidadId)}${crypto.randomUUID().slice(0, 8)}-${limpio(nombre)}`;
  // sin "Content-Type": va sin cuerpo y con JSON el almacen contesta 400
  const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${almacen}/${ruta}`, { method: "POST", headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`No se ha podido preparar la subida (${r.status}).`);
  const { url } = (await r.json()) as { url: string };
  return { ruta, url: `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE}/storage/v1${url}` };
}

export type DatosPapel = {
  comunidadId: string;
  clave: ClavePapel;
  ruta: string;
  fecha: string | null;
  puestoId: string | null;
  oportunidadId: string | null;
};

/** Apunta en documentos el fichero ya subido: desde la ficha, o al aceptar lo
 *  que la comunidad subio por el portal (que se queda en su carpeta portal/). */
export async function registrarPapel(d: DatosPapel, desdePortal = false): Promise<void> {
  const { tipo, fecha } = PAPELES[d.clave];
  const almacen = desdePortal ? "documentos-comerciales" : ALMACEN_DE_TIPO[tipo];
  if (!d.ruta.startsWith(desdePortal ? `portal/${d.comunidadId}/` : carpeta(d.clave, d.comunidadId))) throw new Error("Ruta no válida.");
  if (d.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) throw new Error("La fecha no es válida.");

  // que el fichero haya llegado de verdad
  const info = await fetch(`${URL_BASE}/storage/v1/object/info/${almacen}/${d.ruta}`, { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" });
  if (!info.ok) throw new Error("El fichero no ha llegado. Vuelve a intentarlo.");

  const [t] = await rest<{ id: string }[]>(`tipos_documento?select=id&nombre=eq.${encodeURIComponent(tipo)}`);
  if (!t) throw new Error("Ese tipo de documento no está en el catálogo.");

  // de quien es: el acta de votacion, de la opp; lo demas, de la comunidad
  let filtro: string;
  let personaId: string | null = null;
  if (d.clave === "votacion") {
    if (!d.oportunidadId || !/^[0-9a-f-]{36}$/.test(d.oportunidadId)) throw new Error("Falta la oportunidad.");
    const suya = await rest<{ oportunidad_id: string }[]>(
      `administradores_de_oportunidad?select=oportunidad_id&comunidad_id=eq.${d.comunidadId}&oportunidad_id=eq.${d.oportunidadId}&limit=1`,
    );
    if (!suya.length) throw new Error("Esa oportunidad no es de esta comunidad.");
    filtro = `oportunidad_id=eq.${d.oportunidadId}`;
  } else {
    filtro = `comunidad_id=eq.${d.comunidadId}`;
    if (d.puestoId) {
      if (!/^[0-9a-f-]{36}$/.test(d.puestoId)) throw new Error("Persona no válida.");
      const [p] = await rest<{ persona_id: string | null; figura_legal_propietaria_id: string | null }[]>(
        `puesto?select=persona_id,figura_legal_propietaria_id&id=eq.${d.puestoId}`,
      );
      if (!p || p.figura_legal_propietaria_id !== d.comunidadId) throw new Error("Esa persona no es de esta comunidad.");
      personaId = p.persona_id;
      filtro += `&puesto_id=eq.${d.puestoId}`;
    } else if (d.clave === "acta" || d.clave === "dni") {
      filtro += "&puesto_id=is.null&persona_id=is.null";
    }
  }

  // el que habia: el nuevo es su version siguiente
  const [antes] = await rest<{ id: string; grupo_id: string; n_version: number }[]>(
    `documentos?select=id,grupo_id,n_version&${filtro}&tipo_documento_id=eq.${t.id}&vigente=is.true&order=creado_en.desc&limit=1`,
  );

  const r = await fetch(`${URL_BASE}/rest/v1/documentos`, {
    method: "POST",
    headers: { ...CAB_ESCRIBIR, Prefer: "return=minimal" },
    body: JSON.stringify({
      comunidad_id: d.clave === "votacion" ? null : d.comunidadId,
      oportunidad_id: d.clave === "votacion" ? d.oportunidadId : null,
      puesto_id: d.clave === "votacion" ? null : d.puestoId,
      persona_id: personaId,
      tipo_documento_id: t.id,
      fecha_emision: fecha === "emision" ? d.fecha : null,
      fecha_caducidad: fecha === "caducidad" ? d.fecha : null,
      grupo_id: antes?.grupo_id ?? crypto.randomUUID(),
      n_version: (antes?.n_version ?? 0) + 1,
      vigente: true,
      naturaleza: "subido",
      backend: "supabase",
      storage_ref: d.ruta,
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`No se ha podido apuntar el documento (${r.status}): ${(await r.text()).slice(0, 200)}`);

  if (antes) {
    await fetch(`${URL_BASE}/rest/v1/documentos?id=eq.${antes.id}`, {
      method: "PATCH",
      headers: { ...CAB_ESCRIBIR, Prefer: "return=minimal" },
      body: JSON.stringify({ vigente: false }),
      cache: "no-store",
    });
  }
}
