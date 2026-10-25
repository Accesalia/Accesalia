import "server-only";
import { nombreFirmadaPortal } from "./hojasOpp";
// lib/portal.ts
//
// EL PORTAL DE LA COMUNIDAD (Monica, 12-oct-2026). Ver la memoria
// "portal-de-la-comunidad". Lo esencial:
//
//   - El acceso es POR CORREO, nunca por enlace. Se entra con un ENLACE MAGICO
//     que llega al buzon de la persona: un uso, caduca en una hora. Si alguien
//     reenvia el correo de la comunidad a "la cuñada del vecino del 5B", no le
//     sirve: la llave llega al buzon autorizado.
//   - Quien entra en cada comunidad:
//       · el ADMINISTRADOR que la lleva y el PRESIDENTE vigentes: automaticos,
//         sacados de la agenda (si cambian en la agenda, cambian aqui);
//       · el COMERCIAL de sus oportunidades: tambien, para subir lo que le
//         llegue por correo ("un motivo mas para adiestrar al admin");
//       · el resto, A MANO (portal_autorizados).
//   - SUBIR: todos. VER: caso a caso; de momento, nada.
//
// La sesion es nuestra (una cookie firmada), no la de Supabase: los de fuera
// nunca son usuarios de la app de dentro.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { enviarCorreo } from "./correo";
import { personaPorCorreo, quienSoy } from "./sesion";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}`, "Content-Type": "application/json" };
const APP = process.env.URL_PUBLICA ?? "https://accesalia-crm.vercel.app";
export const ALMACEN_PORTAL = "documentos-comerciales";

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...init, headers: { ...CAB, ...(init.headers ?? {}) }, cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  // Con «return=minimal» la base contesta sin cuerpo (201 al crear, 204 al
  // cambiar): leerlo como JSON rompia la puerta del portal («Unexpected end of
  // JSON input», 20-oct-2026) despues de apuntar la entrada y antes de mandar
  // el correo.
  const texto = await r.text();
  return (texto ? JSON.parse(texto) : null) as T;
}
const limpio = (e: string) => e.trim().toLowerCase();
const CORREO_VALIDO = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// ------------------------------------------------------------ quien entra donde

export type Rol = "administrador" | "presidente" | "comercial" | "manual" | "direccion";

/** DIRECCION ENTRA EN TODAS, SIN APARECER (Monica, 12-oct-2026): "dame acceso a
 *  mi por defecto, pero INVISIBLE a todas las comunidades", con un buscador
 *  arriba para elegir. Con el correo con que entra en la app. No sale en la
 *  lista de autorizados de ninguna comunidad. */
export async function esDireccion(email: string): Promise<boolean> {
  return !!(await personaPorCorreo(limpio(email)).catch(() => null))?.veTodo;
}
export type Autorizado = { email: string; nombre: string | null; rol: Rol; puedeSubir: boolean; id?: string; motivo?: string | null };

/** Los correos que entran en el portal de una comunidad, con su papel. */
export async function autorizadosDe(comunidadId: string): Promise<Autorizado[]> {
  const [admins, presis, opps, manuales] = await Promise.all([
    pedir<{ puesto: { id: string; persona: { nombre: string; apellidos: string | null } | null } | null }[]>(
      `comunidad_admin_responsable?select=puesto:puesto_id(id,persona:persona_id(nombre,apellidos))&vigente=is.true&comunidad_id=eq.${comunidadId}`,
    ),
    pedir<{ id: string; persona_id: string | null; persona: { nombre: string; apellidos: string | null } | null }[]>(
      `puesto?select=id,persona_id,persona:persona_id(nombre,apellidos)&figura_legal_propietaria_id=eq.${comunidadId}&cargo=eq.presidente&hasta=is.null`,
    ),
    pedir<{ comercial: { nombre: string; equipo: { email: string | null } | null } | null }[]>(
      `oportunidades?select=comercial:comercial_id(nombre,equipo:equipo_id(email))&comunidad_id=eq.${comunidadId}&estado=in.(abierta,pausada)`,
    ),
    pedir<{ id: string; email: string; nombre: string | null; motivo: string | null; puede_subir: boolean }[]>(
      `portal_autorizados?select=id,email,nombre,motivo,puede_subir&comunidad_id=eq.${comunidadId}&activo=is.true`,
    ),
  ]);
  const puestos = [...admins.map((a) => a.puesto?.id), ...presis.map((p) => p.id)].filter((x): x is string => !!x);
  const personas = presis.map((p) => p.persona_id).filter((x): x is string => !!x);
  const correos = puestos.length || personas.length
    ? await pedir<{ email: string; puesto_id: string | null; persona_id: string | null }[]>(
        `correo?select=email,puesto_id,persona_id&or=(${[
          puestos.length ? `puesto_id.in.(${puestos.join(",")})` : null,
          personas.length ? `persona_id.in.(${personas.join(",")})` : null,
        ].filter(Boolean).join(",")})`,
      )
    : [];
  const nombre = (p: { nombre: string; apellidos: string | null } | null | undefined) => (p ? [p.nombre, p.apellidos].filter(Boolean).join(" ") : null);

  const out = new Map<string, Autorizado>();
  const pon = (email: string | null | undefined, a: Omit<Autorizado, "email">) => {
    const e = limpio(email ?? "");
    if (CORREO_VALIDO.test(e) && !out.has(e)) out.set(e, { email: e, ...a });
  };
  for (const a of admins)
    for (const c of correos.filter((x) => x.puesto_id === a.puesto?.id)) pon(c.email, { nombre: nombre(a.puesto?.persona), rol: "administrador", puedeSubir: true });
  for (const p of presis)
    for (const c of correos.filter((x) => x.puesto_id === p.id || (x.persona_id && x.persona_id === p.persona_id)))
      pon(c.email, { nombre: nombre(p.persona), rol: "presidente", puedeSubir: true });
  for (const o of opps) pon(o.comercial?.equipo?.email, { nombre: o.comercial?.nombre ?? null, rol: "comercial", puedeSubir: true });
  for (const m of manuales) pon(m.email, { nombre: m.nombre, rol: "manual", puedeSubir: m.puede_subir, id: m.id, motivo: m.motivo });
  return [...out.values()];
}

/** Las comunidades en las que entra un correo (para la portada del portal). */
export async function comunidadesDeCorreo(email: string): Promise<{ id: string; nombre: string; municipio: string | null; rol: Rol }[]> {
  const e = limpio(email);
  if (!CORREO_VALIDO.test(e)) return [];
  const [correos, manuales, equipo] = await Promise.all([
    pedir<{ puesto_id: string | null; persona_id: string | null }[]>(`correo?select=puesto_id,persona_id&email=ilike.${encodeURIComponent(e)}`),
    pedir<{ comunidad_id: string }[]>(`portal_autorizados?select=comunidad_id&email=eq.${encodeURIComponent(e)}&activo=is.true`),
    pedir<{ id: string }[]>(`equipo?select=id&email=ilike.${encodeURIComponent(e)}&activo=is.true`),
  ]);
  const roles = new Map<string, Rol>();
  const pon = (id: string, r: Rol) => roles.has(id) || roles.set(id, r);

  // Sus cargos vigentes: los del correo y los de la persona dueña del correo.
  const puestosDirectos = correos.map((c) => c.puesto_id).filter((x): x is string => !!x);
  const personas = correos.map((c) => c.persona_id).filter((x): x is string => !!x);
  const puestos = [
    ...new Set([
      ...puestosDirectos,
      ...(personas.length ? (await pedir<{ id: string }[]>(`puesto?select=id&persona_id=in.(${personas.join(",")})&hasta=is.null`)).map((p) => p.id) : []),
    ]),
  ];
  if (puestos.length) {
    const [lleva, presidente] = await Promise.all([
      pedir<{ comunidad_id: string }[]>(`comunidad_admin_responsable?select=comunidad_id&vigente=is.true&puesto_id=in.(${puestos.join(",")})`),
      pedir<{ figura_legal_propietaria_id: string }[]>(`puesto?select=figura_legal_propietaria_id&id=in.(${puestos.join(",")})&cargo=eq.presidente&hasta=is.null&figura_legal_propietaria_id=not.is.null`),
    ]);
    lleva.forEach((x) => pon(x.comunidad_id, "administrador"));
    presidente.forEach((x) => pon(x.figura_legal_propietaria_id, "presidente"));
  }
  // El comercial: las comunidades de sus oportunidades vivas.
  if (equipo.length) {
    const coms = await pedir<{ id: string }[]>(`comerciales?select=id&equipo_id=eq.${equipo[0].id}`);
    if (coms.length) {
      const opps = await pedir<{ comunidad_id: string | null }[]>(
        `oportunidades?select=comunidad_id&comercial_id=in.(${coms.map((c) => c.id).join(",")})&estado=in.(abierta,pausada)&comunidad_id=not.is.null`,
      );
      opps.forEach((o) => o.comunidad_id && pon(o.comunidad_id, "comercial"));
    }
  }
  manuales.forEach((m) => pon(m.comunidad_id, "manual"));
  if (!roles.size) return [];
  const coms = await pedir<{ id: string; nombre: string; municipio: string | null }[]>(
    `comunidades?select=id,nombre,municipio&id=in.(${[...roles.keys()].join(",")})&order=nombre.asc`,
  );
  return coms.map((c) => ({ ...c, rol: roles.get(c.id)! }));
}

export async function puedeEntrarEn(email: string, comunidadId: string): Promise<Rol | null> {
  const suya = (await comunidadesDeCorreo(email)).find((c) => c.id === comunidadId)?.rol ?? null;
  if (suya) return suya;
  return (await esDireccion(email)) ? "direccion" : null;
}

export async function datosComunidad(id: string): Promise<{ id: string; nombre: string; municipio: string | null; rol: Rol } | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [c] = await pedir<{ id: string; nombre: string; municipio: string | null }[]>(`comunidades?select=id,nombre,municipio&id=eq.${id}`);
  return c ? { ...c, rol: "direccion" } : null;
}

/** Todas las comunidades, para el buscador de direccion. */
export async function todasLasComunidades(): Promise<{ valor: string; texto: string; pista: string }[]> {
  const out: { id: string; nombre: string; municipio: string | null }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const r = await fetch(`${URL_BASE}/rest/v1/comunidades?select=id,nombre,municipio&order=nombre.asc`, {
      headers: { ...CAB, Range: `${desde}-${desde + 999}` },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`${r.status}`);
    const t = (await r.json()) as typeof out;
    out.push(...t);
    if (t.length < 1000) break;
  }
  return out.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.municipio ?? "" }));
}

// ------------------------------------------------------------ la entrada

const huella = (t: string) => createHash("sha256").update(t).digest("hex");

/** Manda el enlace magico, si el correo tiene alguna comunidad. Responde igual
 *  en los dos casos: no se dice a nadie que correos estan autorizados. */
export async function pedirEntrada(email: string): Promise<void> {
  const e = limpio(email);
  if (!CORREO_VALIDO.test(e)) throw new Error("Escribe un correo válido.");
  // Freno: como mucho 5 enlaces por correo y hora.
  const hace1h = new Date(Date.now() - 3600_000).toISOString();
  const recientes = await pedir<{ id: string }[]>(`portal_entradas?select=id&email=eq.${encodeURIComponent(e)}&creado_en=gte.${hace1h}`);
  if (recientes.length >= 5) return;
  const coms = await comunidadesDeCorreo(e);
  const direccion = !coms.length && (await esDireccion(e));
  if (!coms.length && !direccion) return;

  const token = randomBytes(32).toString("base64url");
  await pedir("portal_entradas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ email: e, huella: huella(token), caduca_en: new Date(Date.now() + 3600_000).toISOString() }),
  });
  const enlace = `${APP}/portal/entrar?t=${token}`;
  const r = await enviarCorreo({
    desde: "comercial",
    nombreRemitente: "Accesalia",
    para: e,
    asunto: "Tu acceso a la documentación de Accesalia",
    texto:
      `Hola:\n\nPara entrar en la página de documentación de ${coms.length === 1 ? coms[0].nombre : "las comunidades"}, pulsa este enlace:\n\n${enlace}\n\n` +
      `Sirve una sola vez y caduca en una hora. Si no lo has pedido tú, ignora este correo.\n\nAccesalia`,
    html:
      `<p>Hola:</p><p>Para entrar en la página de documentación de <b>${coms.length === 1 ? coms[0].nombre : "las comunidades"}</b>, pulsa el botón:</p>` +
      `<p><a href="${enlace}" style="display:inline-block;background:#7ac943;color:#2b2b2b;font-weight:bold;padding:12px 22px;border-radius:10px;text-decoration:none">Entrar</a></p>` +
      `<p style="color:#666;font-size:13px">Sirve una sola vez y caduca en una hora. Si no lo has pedido tú, ignora este correo.</p><p>Accesalia</p>`,
  });
  if (!r.ok) throw new Error("No se ha podido enviar el correo. Inténtalo en unos minutos.");
}

/** Usa el enlace magico: si vale, abre la sesion (30 dias). */
export async function usarEntrada(token: string): Promise<string | null> {
  const [x] = await pedir<{ id: string; email: string; caduca_en: string; usado_en: string | null }[]>(
    `portal_entradas?select=id,email,caduca_en,usado_en&huella=eq.${huella(token)}`,
  );
  if (!x || x.usado_en || new Date(x.caduca_en) < new Date()) return null;
  await pedir(`portal_entradas?id=eq.${x.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ usado_en: new Date().toISOString() }) });
  await abrirSesion(x.email);
  return x.email;
}

// ------------------------------------------------------------ la sesion (cookie firmada)

const COOKIE = "portal_sesion";
const DIAS = 30;
const firma = (s: string) => createHmac("sha256", `portal:${SECRETO}`).update(s).digest("base64url");

async function abrirSesion(email: string) {
  const caduca = Date.now() + DIAS * 864e5;
  const valor = `${Buffer.from(email).toString("base64url")}.${caduca}`;
  (await cookies()).set(COOKIE, `${valor}.${firma(valor)}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/portal", maxAge: DIAS * 86400 });
}

/** El correo de quien esta dentro del portal, o null.
 *
 *  DIRECCION ENTRA SIN ENLACE (Monica, 20-oct-2026: «acceso universal a
 *  gerencia.accesalia@gmail.com a todos los portales, sin tener que generar
 *  enlace, y sin que se vea en las fichas, para poder ver lo que sale»): si no
 *  hay sesion del portal pero si de la APP (Google, ya verificada) y es de
 *  direccion, se entra con ese correo. Sigue sin aparecer en ninguna lista.
 *  Nadie mas se salta el enlace: escribir un correo en la puerta no basta. */
export async function quienEstaEnElPortal(): Promise<string | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) {
    const yo = await quienSoy().catch(() => null);
    return yo?.veTodo && yo.email ? limpio(yo.email) : null;
  }
  const [e, caduca, f] = v.split(".");
  if (!e || !caduca || !f) return null;
  const esperada = Buffer.from(firma(`${e}.${caduca}`));
  const dada = Buffer.from(f);
  if (esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) return null;
  if (Number(caduca) < Date.now()) return null;
  return Buffer.from(e, "base64url").toString();
}

export async function cerrarSesion() {
  (await cookies()).delete({ name: COOKIE, path: "/portal" });
}

// ------------------------------------------------------------ lo que se les pide

export type Pedido = { hojaId: string; codigo: string; version: number; descripcion: string | null; enviada: string | null; recibida: boolean; opp: string | null };

/** Las hojas de encargo enviadas a esta comunidad y aun sin firmar.
 *
 *  POR COMUNIDAD -> SUS OPPS EN CURSO -> SUS HOJAS (Monica, 14-oct-2026): "una
 *  comunidad debe ver solo las opps en curso; no va por direccion, sino por
 *  comunidad-opp". Solo las opps ABIERTAS de esta comunidad, y de ellas las
 *  hojas enviadas y sin firmar que van A LA COMUNIDAD (las de una contrata las
 *  firma la contrata). Con el nombre de su opp, para que sepan de que obra es. */
export async function hojasPorFirmar(comunidadId: string): Promise<Pedido[]> {
  const opps = await pedir<{ id: string; nombre: string | null; codigo: string | null }[]>(
    `oportunidades?select=id,nombre,codigo&comunidad_id=eq.${comunidadId}&estado=eq.abierta`,
  );
  if (!opps.length) return [];
  const nombreDe = new Map(opps.map((o) => [o.id, o.nombre?.trim() || o.codigo || null]));
  const [hojas, recibidas] = await Promise.all([
    pedir<{ id: string; oportunidad_id: string | null; numero_hoja: string | null; descripcion: string | null; versiones: { numero_version: number; url_pdf_hoja: string | null; fecha_enviada: string | null }[] }[]>(
      `hojas_encargo?select=id,oportunidad_id,numero_hoja,descripcion,versiones:versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(numero_version,url_pdf_hoja,fecha_enviada)` +
        `&oportunidad_id=in.(${opps.map((o) => o.id).join(",")})&estado=eq.enviada_comunidad&pagador_tipo=eq.comunidad&order=creado_en.desc`,
    ),
    pedir<{ hoja_encargo_id: string }[]>(`portal_recibidos?select=hoja_encargo_id&comunidad_id=eq.${comunidadId}&tipo=eq.hoja_firmada&estado=eq.por_revisar`),
  ]);
  const ya = new Set(recibidas.map((r) => r.hoja_encargo_id));
  return hojas.flatMap((h) => {
    const v = [...h.versiones].filter((x) => x.url_pdf_hoja).sort((a, b) => b.numero_version - a.numero_version)[0];
    return v
      ? [{ hojaId: h.id, codigo: h.numero_hoja ?? "", version: v.numero_version, descripcion: h.descripcion, enviada: v.fecha_enviada, recibida: ya.has(h.id), opp: nombreDe.get(h.oportunidad_id ?? "") ?? null }]
      : [];
  });
}

/** Lo que ha subido ESTE correo a esta comunidad (para que lo vea en su lista). */
export async function subidoPor(email: string, comunidadId: string) {
  return pedir<{ id: string; tipo: string; descripcion: string | null; nombre_fichero: string | null; estado: string; creado_en: string; hoja: { numero_hoja: string | null } | null }[]>(
    `portal_recibidos?select=id,tipo,descripcion,nombre_fichero,estado,creado_en,hoja:hoja_encargo_id(numero_hoja)&comunidad_id=eq.${comunidadId}&subido_por_email=eq.${encodeURIComponent(limpio(email))}&order=creado_en.desc&limit=50`,
  );
}

// ------------------------------------------------------------ la subida

const nombreLimpio = (n: string) =>
  n.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(-80) || "documento";

/** Permiso de un solo uso para que el navegador suba el fichero al almacen. */
export async function permisoSubida(comunidadId: string, nombre: string): Promise<{ ruta: string; url: string }> {
  const ruta = `portal/${comunidadId}/${randomBytes(6).toString("hex")}-${nombreLimpio(nombre)}`;
  // Sin "Content-Type": pedir el permiso va sin cuerpo, y con JSON el almacen
  // contesta 400 (20-oct-2026; lo mismo que CAB_ALMACEN en lib/citas.ts).
  const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${ALMACEN_PORTAL}/${ruta}`, { method: "POST", headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`No se ha podido preparar la subida (${r.status}).`);
  const { url } = (await r.json()) as { url: string };
  const publica = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;
  return { ruta, url: `${publica}/storage/v1${url}` };
}

/** Los papeles que pide el portal, cada uno en su ventanita (21-oct-2026). */
export const CLAVES_PORTAL = ["tarjeta", "dni", "acta", "certificado", "votacion"] as const;
export type ClavePortal = (typeof CLAVES_PORTAL)[number];

export async function registrarSubida(d: {
  comunidadId: string;
  hojaId: string | null;
  /** Que papel es (su ventanita). Sin el, y sin hoja, es «otro». */
  clave?: ClavePortal | null;
  /** Una hoja del sistema nuevo: la firmada se archiva en su opp (25-oct-2026). */
  versionId?: string | null;
  /** El acta de votacion va a su opp. */
  oportunidadId?: string | null;
  descripcion: string | null;
  ruta: string;
  nombreFichero: string;
  email: string;
  nombre: string | null;
}): Promise<string> {
  // Que el fichero haya llegado de verdad, y a la carpeta de su comunidad.
  if (!d.ruta.startsWith(`portal/${d.comunidadId}/`)) throw new Error("Ruta no válida.");
  const info = await fetch(`${URL_BASE}/storage/v1/object/info/${ALMACEN_PORTAL}/${d.ruta}`, { headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` }, cache: "no-store" });
  if (!info.ok) throw new Error("El fichero no ha llegado. Vuelve a intentarlo.");
  const tam = Number(((await info.json()) as { size?: number }).size ?? 0) || null;
  if (d.versionId) return archivarFirmadaNueva(d.comunidadId, d.versionId, d.ruta, d.nombreFichero, d.email);
  if (d.hojaId) {
    const ok = (await hojasPorFirmar(d.comunidadId)).some((h) => h.hojaId === d.hojaId);
    if (!ok) throw new Error("Esa hoja de encargo ya no está pendiente de firma.");
  }
  if (d.clave && !CLAVES_PORTAL.includes(d.clave)) throw new Error("Documento no válido.");
  if (d.clave === "votacion") {
    if (!d.oportunidadId || !/^[0-9a-f-]{36}$/.test(d.oportunidadId)) throw new Error("Falta el expediente.");
    const suya = await pedir<{ oportunidad_id: string }[]>(
      `administradores_de_oportunidad?select=oportunidad_id&comunidad_id=eq.${d.comunidadId}&oportunidad_id=eq.${d.oportunidadId}&limit=1`,
    );
    if (!suya.length) throw new Error("Ese expediente no es de esta comunidad.");
  }
  const [f] = await pedir<{ id: string }[]>("portal_recibidos", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      comunidad_id: d.comunidadId,
      hoja_encargo_id: d.hojaId,
      tipo: d.hojaId ? "hoja_firmada" : (d.clave ?? "otro"),
      oportunidad_id: d.clave === "votacion" ? d.oportunidadId : null,
      descripcion: d.descripcion,
      ruta: d.ruta,
      nombre_fichero: d.nombreFichero,
      tamano: tam,
      subido_por_email: limpio(d.email),
      subido_por_nombre: d.nombre,
    }),
  });
  return f.id;
}


/** LA FIRMADA DE UNA HOJA NUEVA, A SU SITIO (Monica, 25-oct-2026): «si llega por el portal es fácil: se guarda en su
 *  sitio de su opp» y la valida el comercial. Se archiva en el archivo de documentos de la opp con el tipo «Hoja de
 *  encargo» y un nombre que dice de que hoja es; el fichero se queda donde lo subio (mismo almacen que el cajon). Solo
 *  hojas que paga esta comunidad, de un expediente vivo y esperando la firma. */
async function archivarFirmadaNueva(comunidadId: string, versionId: string, ruta: string, nombreFichero: string, email: string): Promise<string> {
  if (!/^[0-9a-f-]{36}$/.test(versionId)) throw new Error("Hoja no válida.");
  const [v] = await pedir<{ id: string; codigo_he: string | null; numero_version: number; estado: string; oportunidad_id: string; pagador_tipo: string; pagador_comunidad_id: string | null; opp: { estado: string; comunidad_id: string | null } | null }[]>(
    `he_versiones_hoja?select=id,codigo_he,numero_version,estado,oportunidad_id,pagador_tipo,pagador_comunidad_id,opp:oportunidad_id(estado,comunidad_id)&id=eq.${versionId}`,
  );
  if (!v || v.pagador_tipo !== "comunidad" || v.pagador_comunidad_id !== comunidadId) throw new Error("Esa hoja de encargo no es de esta comunidad.");
  if (!v.opp || !["abierta", "pausada"].includes(v.opp.estado)) throw new Error("Ese expediente ya no está en curso.");
  if (!["ok_daniel", "enviada", "firma_con_errores"].includes(v.estado)) throw new Error("Esa hoja de encargo ya no está pendiente de firma.");
  const [tipo] = await pedir<{ id: string }[]>(`tipos_documento?select=id&nombre=eq.${encodeURIComponent("Hoja de encargo")}`);
  if (!tipo) throw new Error("Falta el tipo «Hoja de encargo» en el catálogo de documentos.");
  const ext = (nombreFichero.match(/\.[A-Za-z0-9]{2,5}$/)?.[0] ?? ".pdf").toLowerCase();
  const [doc] = await pedir<{ id: string }[]>("documentos", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      oportunidad_id: v.oportunidad_id, comunidad_id: comunidadId, tipo_documento_id: tipo.id, backend: "supabase", storage_ref: ruta, naturaleza: "subido",
      nombre: `${nombreFirmadaPortal(v.codigo_he, v.numero_version)}${ext}`, archivado_en: new Date().toISOString(),
      justificacion: `Subida desde el portal por ${limpio(email)} (fichero original: ${nombreFichero.slice(0, 120)}).`,
    }),
  });
  return doc.id;
}
