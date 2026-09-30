import "server-only";

// ============================================================================
// BAJAR LA FICHA DE CATASTRO DE CADA ACCESO (Monica, 1-oct-2026)
//
// Hace dos cosas de una sola consulta, y por eso merece la pena:
//
//   1. Llena `ficha_catastro` / `ficha_catastro_portal` / `ficha_catastro_inmueble`.
//      Esas tres tablas se diseñaron hace meses y estaban VACIAS (2 fichas, 0
//      portales, 0 inmuebles). Son las que necesita la pantalla del bloque 1:
//      año, viviendas, superficie, plantas, usos y el desglose por portal.
//
//   2. Le pone a cada acceso su NOMBRE: (municipio, tipo_via, nombre_via, numero,
//      escalera). Hoy los 1.244 accesos solo tienen la referencia catastral.
//
// CUAL ES EL PROBLEMA FINO: dada UNA referencia de parcela, la parcela puede tener
// UN acceso o 203 (Cuestablanca). Cuando tiene uno, se copia y listo. Cuando tiene
// varios, no se puede saber CUAL de ellos es este acceso solo con la referencia, asi
// que se intenta casar con la direccion oficial que ya teniamos guardada, por el
// numero. Si no casa, el acceso se queda sin nombre y se anota por que: no se
// inventa.
//
// Lo hecho no se repite: el marcador es `accesos_comunidad.ficha_id`.
//
// CORRE EN LA APP Y NO EN UN PORTATIL: las credenciales son las de Vercel.
// ============================================================================

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const cab = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };
const cabJson = { ...cab, "Content-Type": "application/json" };

const OVC = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json";
const COORDENADAS =
  "https://ovc.catastro.meh.es/ovcservweb/ovcswlocalizacionrc/ovccoordenadas.asmx/Consulta_CPMRC";
const PAUSA = 260; // Catastro corta si se va deprisa

// ------------------------------------------------------------------ Supabase

async function leer<T>(path: string): Promise<T> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: cab, cache: "no-store" });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T>;
}

async function meter<T>(tabla: string, filas: unknown[], conflicto?: string): Promise<T[]> {
  if (!filas.length) return [];
  const q = conflicto ? `?on_conflict=${conflicto}` : "";
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}${q}`, {
    method: "POST",
    headers: {
      ...cabJson,
      Prefer: conflicto
        ? "resolution=merge-duplicates,return=representation"
        : "return=representation",
    },
    body: JSON.stringify(filas),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  return r.json() as Promise<T[]>;
}

async function retocar(tabla: string, filtro: string, cuerpo: unknown): Promise<void> {
  const r = await fetch(`${URL_BASE}/rest/v1/${tabla}?${filtro}`, {
    method: "PATCH",
    headers: { ...cabJson, Prefer: "return=minimal" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
}

// -------------------------------------------------------------------- Catastro

function comoLista<T>(x: T | T[] | undefined | null): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

async function pedir(url: string): Promise<string> {
  let ultimo = "";
  for (let i = 0; i < 3; i += 1) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Accesalia CRM" }, cache: "no-store" });
      if (!r.ok) throw new Error(`Catastro ${r.status}`);
      return await r.text();
    } catch (e) {
      ultimo = e instanceof Error ? e.message : String(e);
      await new Promise((s) => setTimeout(s, 1200 * (i + 1)));
    }
  }
  throw new Error(`Catastro no contesta: ${ultimo}`);
}

type Finca = {
  rc?: { pc1?: string; pc2?: string; car?: string; cc1?: string; cc2?: string };
  idbi?: { rc?: { pc1?: string; pc2?: string; car?: string; cc1?: string; cc2?: string } };
  dt?: {
    np?: string;
    nm?: string;
    loine?: { cp?: string; cm?: string };
    cmc?: string;
    locs?: {
      lous?: {
        lourb?: {
          dir?: { tv?: string; nv?: string; pnp?: string; snp?: string; cv?: string; plp?: string };
          loint?: { es?: string; pt?: string; pu?: string };
          dp?: string;
          dm?: string;
        };
      };
    };
  };
  debi?: { luso?: string; sfc?: string; cpt?: string; ant?: string };
};

function referenciaDe(f: Finca): string {
  const rc = f.rc ?? f.idbi?.rc ?? {};
  return `${rc.pc1 ?? ""}${rc.pc2 ?? ""}${rc.car ?? ""}${rc.cc1 ?? ""}${rc.cc2 ?? ""}`;
}

function sitio(f: Finca) {
  const lo = f.dt?.locs?.lous?.lourb ?? {};
  return {
    tipo_via: lo.dir?.tv ?? "",
    nombre_via: lo.dir?.nv ?? "",
    numero: String(lo.dir?.pnp ?? ""),
    numero2: String(lo.dir?.snp ?? "") === "0" ? "" : String(lo.dir?.snp ?? ""),
    codigo_via: lo.dir?.cv ?? "",
    // "escalera" es lo que Catastro llama `es`. Su campo `plp` (portal) esta vacio
    // en todos los edificios que hemos mirado, asi que no se usa.
    escalera: (lo.loint?.es ?? "").trim(),
    planta: (lo.loint?.pt ?? "").trim(),
    puerta: (lo.loint?.pu ?? "").trim(),
    cp: lo.dp ?? "",
    distrito: lo.dm ?? "",
  };
}

function numero(x: string | undefined): number | null {
  if (!x) return null;
  const n = Number(String(x).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ------------------------------------------------------------------ la ficha

export type Acceso = {
  id: string;
  comunidad_id: string;
  referencia: string;
  direccion_oficial: string | null;
  municipio: string | null;
};

export async function accesosPendientes(cuantos: number): Promise<Acceso[]> {
  return leer<Acceso[]>(
    "accesos_comunidad?select=id,comunidad_id,referencia,direccion_oficial,municipio" +
      `&ficha_id=is.null&order=principal.desc,creado_en.asc&limit=${cuantos}`,
  );
}

export async function comoVa(): Promise<{
  accesos: number;
  con_ficha: number;
  con_nombre_de_calle: number;
  fichas: number;
  portales: number;
  inmuebles: number;
}> {
  const uno = async (path: string) =>
    Number((await leer<{ count: string }[]>(path))[0]?.count ?? 0);
  const [accesos, con_ficha, con_nombre, fichas, portales, inmuebles] = await Promise.all([
    uno("accesos_comunidad?select=count"),
    uno("accesos_comunidad?select=count&ficha_id=not.is.null"),
    uno("accesos_comunidad?select=count&nombre_via=not.is.null"),
    uno("ficha_catastro?select=count"),
    uno("ficha_catastro_portal?select=count"),
    uno("ficha_catastro_inmueble?select=count"),
  ]);
  return { accesos, con_ficha, con_nombre_de_calle: con_nombre, fichas, portales, inmuebles };
}

/** Baja la ficha de una parcela y la guarda entera: parcela, portales e inmuebles. */
async function guardarFicha(parcela: string): Promise<{ id: string; accesos: number }> {
  const crudo = await pedir(`${OVC}/Consulta_DNPRC?RefCat=${parcela}`);
  const d = JSON.parse(crudo) as {
    consulta_dnprcResult?: {
      control?: { cuerr?: number };
      lerr?: { des?: string }[];
      bico?: { bi?: Finca; finca?: { ldt?: string; ltp?: string; dff?: { ss?: string } } };
      lrcdnp?: { rcdnp?: Finca | Finca[] };
    };
  };
  const res = d.consulta_dnprcResult ?? {};
  if (res.control?.cuerr) {
    throw new Error(comoLista(res.lerr)[0]?.des ?? "Catastro devuelve error");
  }
  let fincas = comoLista(res.lrcdnp?.rcdnp);
  if (!fincas.length && res.bico?.bi) fincas = [res.bico.bi];
  if (!fincas.length) throw new Error("la referencia no devuelve ni una finca");

  const primera = fincas[0];
  const s = sitio(primera);

  // el resumen de la parcela
  const usos: Record<string, number> = {};
  const plantas = new Set<string>();
  let superficie = 0;
  let viviendas = 0;
  for (const f of fincas) {
    const uso = f.debi?.luso ?? "?";
    usos[uso] = (usos[uso] ?? 0) + 1;
    if (uso === "Residencial") viviendas += 1;
    superficie += numero(f.debi?.sfc) ?? 0;
    const p = sitio(f).planta;
    if (p) plantas.add(p);
  }

  const [fila] = await meter<{ id: string }>(
    "ficha_catastro",
    [
      {
        referencia: parcela,
        direccion: res.bico?.finca?.ldt ?? null,
        tipo_parcela: res.bico?.finca?.ltp ?? null,
        municipio: primera.dt?.nm ?? null,
        provincia: primera.dt?.np ?? null,
        cp: s.cp || null,
        anio: numero(primera.debi?.ant),
        inmuebles: fincas.length,
        viviendas,
        superficie: Math.round(superficie) || null,
        superficie_suelo: numero(res.bico?.finca?.dff?.ss),
        plantas: [...plantas].sort(),
        usos,
        tipo_via: s.tipo_via || null,
        nombre_via: s.nombre_via || null,
        numero: s.numero || null,
        numero2: s.numero2 || null,
        codigo_via: s.codigo_via || null,
        distrito_municipal: s.distrito || null,
        ine_provincia: primera.dt?.loine?.cp ?? null,
        ine_municipio: primera.dt?.loine?.cm ?? null,
        bruto: JSON.parse(crudo),
        consultado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      },
    ],
    "referencia",
  );
  const fichaId = fila.id;

  // los portales: uno por (numero, escalera). La escalera se guarda como cadena
  // vacia cuando no hay, no como nulo, para que el unico de la tabla funcione.
  const porPortal = new Map<
    string,
    { numero: string; escalera: string; inmuebles: number; viviendas: number;
      superficie: number; plantas: Set<string>; usos: Record<string, number>;
      tipo_via: string; nombre_via: string }
  >();
  for (const f of fincas) {
    const t = sitio(f);
    const clave = `${t.numero}|${t.escalera}`;
    let p = porPortal.get(clave);
    if (!p) {
      p = { numero: t.numero, escalera: t.escalera, inmuebles: 0, viviendas: 0,
            superficie: 0, plantas: new Set(), usos: {},
            tipo_via: t.tipo_via, nombre_via: t.nombre_via };
      porPortal.set(clave, p);
    }
    p.inmuebles += 1;
    const uso = f.debi?.luso ?? "?";
    p.usos[uso] = (p.usos[uso] ?? 0) + 1;
    if (uso === "Residencial") p.viviendas += 1;
    p.superficie += numero(f.debi?.sfc) ?? 0;
    if (t.planta) p.plantas.add(t.planta);
  }

  const portales = await meter<{ id: string; numero: string; escalera: string }>(
    "ficha_catastro_portal",
    [...porPortal.values()].map((p) => ({
      ficha_id: fichaId,
      tipo_via: p.tipo_via || null,
      nombre_via: p.nombre_via || null,
      numero: p.numero,
      escalera: p.escalera,
      inmuebles: p.inmuebles,
      viviendas: p.viviendas,
      superficie: Math.round(p.superficie) || null,
      plantas: [...p.plantas].sort(),
      usos: p.usos,
    })),
    "ficha_id,numero,escalera",
  );
  const idPortal = new Map(portales.map((p) => [`${p.numero}|${p.escalera ?? ""}`, p.id]));

  // los inmuebles, uno por finca
  await meter(
    "ficha_catastro_inmueble",
    fincas
      .map((f) => {
        const t = sitio(f);
        const ref = referenciaDe(f);
        if (!ref) return null;
        return {
          ficha_id: fichaId,
          portal_id: idPortal.get(`${t.numero}|${t.escalera}`) ?? null,
          referencia: ref,
          numero: t.numero || null,
          escalera: t.escalera || null,
          planta: t.planta || null,
          puerta: t.puerta || null,
          uso: f.debi?.luso ?? null,
          superficie: numero(f.debi?.sfc),
          coeficiente: numero(f.debi?.cpt),
        };
      })
      .filter((x) => x !== null),
    "referencia",
  );

  return { id: fichaId, accesos: porPortal.size };
}

/** Las coordenadas de la parcela. Si fallan no se para: es un dato menos. */
async function coordenadas(parcela: string): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const x = await pedir(
      `${COORDENADAS}?Provincia=&Municipio=&SRS=EPSG:4326&RC=${parcela}`,
    );
    const saca = (etiqueta: string) => {
      const m = new RegExp(`<${etiqueta}>([-\\d.,]+)</${etiqueta}>`).exec(x);
      return m ? Number(m[1].replace(",", ".")) : null;
    };
    return { lat: saca("ypc") ?? saca("ycen"), lng: saca("xcen") };
  } catch {
    return { lat: null, lng: null };
  }
}

/**
 * Le pone nombre al acceso. Cuando la parcela tiene un solo portal se copia; cuando
 * tiene varios se intenta casar por el numero con la direccion oficial que ya
 * teniamos. Si no casa, se deja sin nombre y se dice por que: no se inventa.
 */
async function nombrarAcceso(a: Acceso, fichaId: string): Promise<string> {
  type Portal = {
    id: string; tipo_via: string | null; nombre_via: string | null;
    numero: string | null; escalera: string | null; viviendas: number | null;
  };
  const portales = await leer<Portal[]>(
    `ficha_catastro_portal?select=id,tipo_via,nombre_via,numero,escalera,viviendas` +
      `&ficha_id=eq.${fichaId}`,
  );
  const ficha = (
    await leer<{ municipio: string | null }[]>(
      `ficha_catastro?select=municipio&id=eq.${fichaId}`,
    )
  )[0];

  let elegido: Portal | undefined;
  let porque = "";
  if (portales.length === 1) {
    elegido = portales[0];
    porque = "la parcela tiene un solo portal";
  } else {
    // el numero que dice la direccion oficial guardada, p.ej. "CL HUMERA 44" -> 44
    const dice = a.direccion_oficial ?? "";
    const m = /(\d+)\s*(?:\([A-Z]+\))?\s*$/.exec(dice.trim());
    const buscado = m ? m[1] : "";
    const casan = buscado ? portales.filter((p) => p.numero === buscado) : [];
    if (casan.length === 1) {
      elegido = casan[0];
      porque = `casado por el numero ${buscado} de la direccion oficial`;
    } else {
      porque =
        `la parcela tiene ${portales.length} portales y no se puede saber cual es este: ` +
        (buscado
          ? `el numero ${buscado} sale ${casan.length} veces`
          : "la direccion oficial no dice el numero");
    }
  }

  const { lat, lng } = await coordenadas(a.referencia.slice(0, 14));
  await retocar(`accesos_comunidad`, `id=eq.${a.id}`, {
    ficha_id: fichaId,
    municipio: a.municipio ?? ficha?.municipio ?? null,
    tipo_via: elegido?.tipo_via ?? null,
    nombre_via: elegido?.nombre_via ?? null,
    numero: elegido?.numero ?? null,
    escalera: elegido?.escalera ?? null,
    lat,
    lng,
    de_donde: porque.slice(0, 300),
    actualizado_en: new Date().toISOString(),
  });
  return porque;
}

export async function barridoDeFichas(cuantos = 30): Promise<{
  hechos: { referencia: string; portales: number; porque: string }[];
  fallos: { referencia: string; dice: string }[];
  quedan: number;
}> {
  const pendientes = await accesosPendientes(cuantos);
  const hechos: { referencia: string; portales: number; porque: string }[] = [];
  const fallos: { referencia: string; dice: string }[] = [];
  const fichaDe = new Map<string, string>(); // parcela -> ficha_id, para no repetir

  for (const a of pendientes) {
    const parcela = a.referencia.slice(0, 14);
    try {
      let fichaId = fichaDe.get(parcela);
      let portales = 0;
      if (!fichaId) {
        const r = await guardarFicha(parcela);
        fichaId = r.id;
        portales = r.accesos;
        fichaDe.set(parcela, fichaId);
        await new Promise((s) => setTimeout(s, PAUSA));
      }
      const porque = await nombrarAcceso(a, fichaId);
      hechos.push({ referencia: a.referencia, portales, porque });
    } catch (e) {
      fallos.push({ referencia: a.referencia, dice: e instanceof Error ? e.message : String(e) });
    }
    await new Promise((s) => setTimeout(s, PAUSA));
  }

  const restantes = await leer<{ count: string }[]>(
    "accesos_comunidad?select=count&ficha_id=is.null",
  );
  return { hechos, fallos, quedan: Number(restantes[0]?.count ?? 0) };
}
