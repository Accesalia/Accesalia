// lib/catastro.ts
//
// CATASTRO (Monica, 29-sep-2026).
//
// La Sede Electronica del Catastro publica servicios gratuitos y sin certificado
// para los datos NO PROTEGIDOS de un inmueble. De ahi salen, sin que nadie
// levante un dedo: año de construccion, numero de viviendas, superficie, plantas,
// codigo postal y la direccion OFICIAL.
//
// POR QUE ESTO IMPORTA TANTO, y no es cosmetico (Monica): para pedir
// subvenciones y para visar, la direccion del proyecto tiene que cuadrar con la
// de Catastro. Cuando no cuadra hay que justificarlo "con cincuenta papeles". Si
// se cuadra desde el minuto uno, todo sale oficial.
//
// Y de rebote sale un control de calidad que ella vio antes que yo: SI CATASTRO
// NO ENCUENTRA LA DIRECCION, LA DIRECCION ESTA MAL ESCRITA. Es el canario en la
// mina del alta de oportunidad.
//
// Con un matiz importante, para no dar por malo lo que no lo es: "no lo
// encuentra" tambien pasa en Navarra y Pais Vasco -tienen catastro propio y NO
// estan en el estatal-, en numeros con bis o letra, en fincas de varios portales
// donde la direccion catastral es la del portal principal, y en obra nueva sin
// incorporar. Por eso el aviso dice REVISALA, no "esta mal".
//
// Lo que NO se puede sin certificado: el nombre del titular (dato protegido, y
// para una comunidad no hace falta) y la certificacion descriptiva y grafica
// sellada. Los datos y el croquis si.

import "server-only";

const CALLEJERO = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json";
const COORDENADAS = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx";

export type FichaCatastro = {
  referencia: string;
  /** La direccion OFICIAL, la que tiene que cuadrar para subvenciones y visado. */
  direccion: string;
  municipio: string | null;
  provincia: string | null;
  cp: string | null;
  anio: number | null;
  inmuebles: number;
  viviendas: number;
  superficie: number | null;
  plantas: string[];
  usos: { uso: string; cuantos: number }[];
};

type Inmueble = {
  rc?: { pc1?: string; pc2?: string };
  dt?: {
    np?: string;
    nm?: string;
    locs?: { lous?: { lourb?: { dir?: { tv?: string; nv?: string; pnp?: string }; dp?: string; loint?: { pt?: string } } } };
  };
  debi?: { luso?: string; sfc?: string; ant?: string };
};

const soloDigitos = (s: string | undefined) => {
  const n = Number(String(s ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Junta la lista de inmuebles de una finca en una sola ficha. */
function resumir(referencia: string, lista: Inmueble[]): FichaCatastro | null {
  if (lista.length === 0) return null;
  const primero = lista[0];
  const urb = primero.dt?.locs?.lous?.lourb;
  const d = urb?.dir;

  const anios = lista.map((i) => soloDigitos(i.debi?.ant)).filter((n): n is number => n !== null);
  const usos = new Map<string, number>();
  for (const i of lista) {
    const u = i.debi?.luso ?? "Sin uso";
    usos.set(u, (usos.get(u) ?? 0) + 1);
  }
  const plantas = Array.from(new Set(lista.map((i) => i.dt?.locs?.lous?.lourb?.loint?.pt).filter((p): p is string => !!p))).sort();

  return {
    referencia,
    direccion: [d?.tv, d?.nv, d?.pnp].filter(Boolean).join(" ").trim(),
    municipio: primero.dt?.nm ?? null,
    provincia: primero.dt?.np ?? null,
    cp: urb?.dp ?? null,
    // El año de la finca es el mas antiguo: lo que se añadio despues no cambia
    // cuando se construyo el edificio.
    anio: anios.length ? Math.min(...anios) : null,
    inmuebles: lista.length,
    viviendas: usos.get("Residencial") ?? 0,
    superficie: lista.reduce((t, i) => t + (soloDigitos(i.debi?.sfc) ?? 0), 0) || null,
    plantas,
    usos: Array.from(usos, ([uso, cuantos]) => ({ uso, cuantos })).sort((a, b) => b.cuantos - a.cuantos),
  };
}

async function pedir(url: string): Promise<unknown> {
  const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`Catastro ${r.status}`);
  return r.json();
}

/** Todo lo de una finca, a partir de su referencia catastral (los 14 primeros). */
export async function porReferencia(referencia: string): Promise<FichaCatastro | null> {
  const rc = referencia.replace(/\s/g, "").toUpperCase().slice(0, 14);
  if (rc.length < 14) return null;

  // El parametro se llama RefCat. Con RC o RC1/RC2 contesta "la referencia
  // catastral es obligatoria", que despista bastante.
  const d = (await pedir(`${CALLEJERO}/Consulta_DNPRC?Provincia=&Municipio=&RefCat=${rc}`)) as {
    consulta_dnprcResult?: { lrcdnp?: { rcdnp?: Inmueble[] }; bico?: { bi?: Inmueble }; lerr?: unknown };
  };
  const r = d.consulta_dnprcResult;
  if (!r) return null;
  const lista = r.lrcdnp?.rcdnp ?? (r.bico?.bi ? [r.bico.bi] : []);
  return resumir(rc, lista);
}

/** La finca que hay en unas coordenadas. Es el camino FIABLE: no depende de como
 *  este escrita la direccion, y la app ya tiene las coordenadas de la mayoria de
 *  las comunidades (son las que pintan el mapa de la cartera). */
export async function porCoordenadas(lat: number, lng: number): Promise<string | null> {
  const url = `${COORDENADAS}/Consulta_RCCOOR?SRS=EPSG:4326&Coordenada_X=${lng}&Coordenada_Y=${lat}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return null;
  const xml = await r.text();
  const pc1 = /<pc1>([^<]+)<\/pc1>/.exec(xml)?.[1];
  const pc2 = /<pc2>([^<]+)<\/pc2>/.exec(xml)?.[1];
  return pc1 && pc2 ? `${pc1}${pc2}` : null;
}

/** Buscar por direccion escrita. Devuelve las fincas que encajan: si son varias,
 *  NO se elige; que elija una persona. */
export async function porDireccion(a: {
  provincia: string;
  municipio: string;
  sigla?: string;
  calle: string;
  numero: string;
}): Promise<{ referencia: string; direccion: string; cp: string | null }[]> {
  const q = new URLSearchParams({
    Provincia: a.provincia,
    Municipio: a.municipio,
    Sigla: a.sigla ?? "",
    Calle: a.calle,
    Numero: a.numero,
  });
  const d = (await pedir(`${CALLEJERO}/Consulta_DNPLOC?${q}`)) as {
    consulta_dnplocResult?: { lrcdnp?: { rcdnp?: Inmueble[] } };
  };
  const lista = d.consulta_dnplocResult?.lrcdnp?.rcdnp ?? [];
  const fincas = new Map<string, { referencia: string; direccion: string; cp: string | null }>();
  for (const i of lista) {
    const rc = `${i.rc?.pc1 ?? ""}${i.rc?.pc2 ?? ""}`;
    if (rc.length < 14 || fincas.has(rc)) continue;
    const urb = i.dt?.locs?.lous?.lourb;
    fincas.set(rc, {
      referencia: rc,
      direccion: [urb?.dir?.tv, urb?.dir?.nv, urb?.dir?.pnp].filter(Boolean).join(" "),
      cp: urb?.dp ?? null,
    });
  }
  return Array.from(fincas.values());
}

/** El croquis de la finca, como imagen. Lo usan los tecnicos desde el minuto 1. */
export function croquis(lat: number, lng: number, lado = 0.0012, px = 700): string {
  const bbox = [lng - lado, lat - lado, lng + lado, lat + lado].join(",");
  return (
    "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx" +
    `?service=WMS&request=GetMap&version=1.1.1&layers=Catastro&srs=EPSG:4326&bbox=${bbox}` +
    `&width=${px}&height=${px}&format=image/png`
  );
}
