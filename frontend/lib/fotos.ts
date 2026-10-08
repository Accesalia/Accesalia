// lib/fotos.ts
//
// LAS FOTOS DE LAS NOTAS (Monica, 8-oct-2026).
//
// La nota es privada; la foto, no: "los tecnicos que hacen el proyecto deben
// poder acceder a ellas, las administrativas... son utiles". Cada foto es un
// DOCUMENTO del repositorio comun (de la oportunidad o de la persona del
// administrador) y la nota solo apunta a ella (fotos_nota). Si la nota esta
// pendiente, la foto espera como fichero hasta que se coloque.
//
// El navegador las reduce antes de subirlas (lado mayor 2.000 px) y sube
// tambien una miniatura, que vive al lado: foto.jpg y foto-mini.jpg. Asi el
// diario no descarga fotos enteras para enseñar sellos.

import "server-only";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const ALMACEN = "almacen-polycam-y-fotos";

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: CAB, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function crear(tabla: string, filas: unknown): Promise<void> {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(filas),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
}

const mini = (ruta: string) => ruta.replace(/\.jpg$/, "-mini.jpg");
/** Solo rutas que hemos dado nosotros: fotos/<uuid>.jpg. */
const rutaValida = (r: string) => /^fotos\/[0-9a-f-]{36}\.jpg$/.test(r);

/** Permisos de un solo uso para que el navegador suba N fotos (cada una con su
 *  miniatura) directamente al almacen, sin pasar por la app. */
export async function permisosFotos(n: number): Promise<{ ruta: string; url: string; urlMini: string }[]> {
  if (n < 1 || n > 20) throw new Error("Entre 1 y 20 fotos por nota.");
  const publica = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_BASE;
  const firmar = async (ruta: string) => {
    const r = await fetch(`${URL_BASE}/storage/v1/object/upload/sign/${ALMACEN}/${ruta}`, { method: "POST", headers: CAB, cache: "no-store" });
    if (!r.ok) throw new Error(`Storage ${r.status}: ${await r.text()}`);
    const { url } = (await r.json()) as { url: string };
    return `${publica}/storage/v1${url}`;
  };
  return Promise.all(
    Array.from({ length: n }, async () => {
      const ruta = `fotos/${crypto.randomUUID()}.jpg`;
      const [url, urlMini] = await Promise.all([firmar(ruta), firmar(mini(ruta))]);
      return { ruta, url, urlMini };
    }),
  );
}

let tipoFoto: string | null = null;
async function tipoFotografia(): Promise<string> {
  if (tipoFoto) return tipoFoto;
  const [t] = await leer<{ id: string }[]>(`tipos_documento?select=id&nombre=eq.${encodeURIComponent("Fotografía")}&limit=1`);
  if (!t) throw new Error('Falta el tipo de documento "Fotografía".');
  tipoFoto = t.id;
  return t.id;
}

export type DondeFotos =
  | { nota: "oportunidad"; notaId: string; oportunidadId: string; comunidadId: string | null }
  | { nota: "administracion"; notaId: string; puestoId: string | null; personaId: string | null }
  | { nota: "pendiente"; notaId: string };

/** Apunta las fotos ya subidas: documento (si la nota tiene sitio) y enlace con
 *  la nota. Las rutas que no son nuestras o que no han llegado, se ignoran. */
export async function apuntarFotos(rutas: string[], d: DondeFotos): Promise<number> {
  const buenas: string[] = [];
  for (const r of rutas.filter(rutaValida)) {
    const info = await fetch(`${URL_BASE}/storage/v1/object/info/${ALMACEN}/${r}`, { headers: CAB, cache: "no-store" });
    if (info.ok) buenas.push(r);
  }
  if (!buenas.length) return 0;

  const tipo = d.nota === "pendiente" ? null : await tipoFotografia();
  const docs = buenas.map((ruta) => {
    const id = crypto.randomUUID();
    return {
      ruta,
      fila:
        d.nota === "pendiente"
          ? null
          : {
              id,
              grupo_id: id,
              n_version: 1,
              tipo_documento_id: tipo,
              naturaleza: "subido",
              estado_firma: "no_aplica",
              backend: "supabase",
              storage_ref: ruta,
              vigente: true,
              oportunidad_id: d.nota === "oportunidad" ? d.oportunidadId : null,
              comunidad_id: d.nota === "oportunidad" ? d.comunidadId : null,
              puesto_id: d.nota === "administracion" ? d.puestoId : null,
              persona_id: d.nota === "administracion" ? d.personaId : null,
            },
    };
  });
  const filasDoc = docs.map((x) => x.fila).filter(Boolean);
  if (filasDoc.length) await crear("documentos", filasDoc);

  await crear(
    "fotos_nota",
    docs.map((x, i) => ({
      storage_ref: x.ruta,
      documento_id: x.fila?.id ?? null,
      nota_oportunidad_id: d.nota === "oportunidad" ? d.notaId : null,
      nota_administracion_id: d.nota === "administracion" ? d.notaId : null,
      nota_pendiente_id: d.nota === "pendiente" ? d.notaId : null,
      orden: i,
    })),
  );
  return buenas.length;
}

export type Foto = { id: string; mini: string; grande: string };

/** Enlaces firmados (una hora) para un monton de rutas, de una vez. */
async function firmarVarias(rutas: string[]): Promise<Map<string, string>> {
  const salida = new Map<string, string>();
  if (!rutas.length) return salida;
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${ALMACEN}`, {
    method: "POST",
    headers: { ...CAB, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600, paths: rutas }),
    cache: "no-store",
  });
  if (!r.ok) return salida;
  const firmadas = (await r.json()) as { path: string; signedURL: string | null }[];
  for (const f of firmadas) if (f.signedURL) salida.set(f.path, `${URL_BASE}/storage/v1${f.signedURL}`);
  return salida;
}

async function comoFotos(filas: { id: string; storage_ref: string }[]): Promise<Foto[]> {
  const firmas = await firmarVarias(filas.flatMap((f) => [f.storage_ref, mini(f.storage_ref)]));
  return filas
    .filter((f) => firmas.get(f.storage_ref))
    .map((f) => ({ id: f.id, grande: firmas.get(f.storage_ref)!, mini: firmas.get(mini(f.storage_ref)) ?? firmas.get(f.storage_ref)! }));
}

/** Las fotos de varias notas, por nota: para las miniaturas del diario. */
export async function fotosDeNotas(campo: "nota_oportunidad_id" | "nota_administracion_id", ids: string[]): Promise<Map<string, Foto[]>> {
  const salida = new Map<string, Foto[]>();
  if (!ids.length) return salida;
  const filas: { id: string; storage_ref: string; nota: string }[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const trozo = ids.slice(i, i + 150);
    filas.push(
      ...(await leer<{ id: string; storage_ref: string; nota: string }[]>(
        `fotos_nota?select=id,storage_ref,nota:${campo}&${campo}=in.(${trozo.join(",")})&order=orden.asc`,
      )),
    );
  }
  const fotos = await comoFotos(filas);
  const porId = new Map(fotos.map((f) => [f.id, f]));
  for (const f of filas) {
    const foto = porId.get(f.id);
    if (foto) salida.set(f.nota, [...(salida.get(f.nota) ?? []), foto]);
  }
  return salida;
}

/** Las fotografias de una oportunidad, para su Documentacion: las ven todos. */
export async function fotosDeOportunidad(oppId: string): Promise<(Foto & { fecha: string })[]> {
  const tipo = await tipoFotografia();
  const filas = await leer<{ id: string; storage_ref: string; creado_en: string }[]>(
    `documentos?select=id,storage_ref,creado_en&oportunidad_id=eq.${oppId}&tipo_documento_id=eq.${tipo}&order=creado_en.desc&limit=200`,
  );
  const fotos = await comoFotos(filas);
  const fecha = new Map(filas.map((f) => [f.id, f.creado_en.slice(0, 10)]));
  return fotos.map((f) => ({ ...f, fecha: fecha.get(f.id) ?? "" }));
}
