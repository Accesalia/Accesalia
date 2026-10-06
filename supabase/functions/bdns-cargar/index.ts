// supabase/functions/bdns-cargar/index.ts
//
// EDGE — baja de la Base de Datos Nacional de Subvenciones (infosubvenciones.es,
// API publica y sin claves) las concesiones de unas convocatorias y las guarda en
// `concesiones_bdns` (Monica, 6-oct-2026: "nos montamos el catalogo de Madrid,
// del 2022 hasta ahora").
//
// La BDNS no se baja entera (son ~10,5 millones de concesiones de todo tipo): se
// le pide CONVOCATORIA A CONVOCATORIA. Solo se guardan las de COMUNIDADES DE
// PROPIETARIOS (CIF que empieza por H o E): son las que sirven para el anexo, y
// asi no entran datos de particulares.
//
// Del beneficiario ("H81451486 CDAD PROP CL VILLARINO DE LOS AIRES N 9") se
// guarda el texto tal cual y, al lado, lo leido de el: CIF, via, calle, numero y
// municipio si viene. No se inventa: lo que no se entiende queda solo con el
// texto. Repetir una carga no duplica (cod_concesion es unico).
//
// Body (JSON): { convocatorias: [{ numero: "833394", catalogo_orden?: 13 }] }
// Devuelve, por convocatoria: cuantas habia, cuantas eran de comunidades y
// cuantas se han guardado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BDNS = "https://www.infosubvenciones.es/bdnstrans/api";
const VIA = "(CL|AV|PZ|PS|CM|CR|GL|RD|TR|PJ|UR|CALLE|AVDA)";
const RE_DIR = new RegExp(
  `^\\w\\d{7}\\w?\\s+C(?:DAD|OMUNIDAD)\\.?\\s*(?:DE\\s+)?PROP\\w*\\.?\\s+(?:${VIA}\\s+)?(.+?)\\s+(?:N\\s+)?(\\d+[A-Z]?)\\b\\s*(.*)$`,
);

type Concesion = {
  codConcesion: string;
  fechaConcesion: string | null;
  beneficiario: string;
  importe: number | null;
  convocatoria: string | null;
  nivel2: string | null;
  nivel3: string | null;
  urlBR: string | null;
};

async function pagina(numero: string, page: number): Promise<{ content: Concesion[]; last: boolean; totalElements: number }> {
  const url = `${BDNS}/concesiones/busqueda?page=${page}&pageSize=100&numeroConvocatoria=${numero}`;
  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) return await r.json();
    } catch (_) { /* reintenta */ }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error(`La BDNS no responde para la convocatoria ${numero} (pagina ${page})`);
}

function leer(b: string) {
  const m = RE_DIR.exec(b.trim());
  if (!m) return { tipo_via: null, nombre_via: null, numero: null, municipio_leido: null };
  const cola = (m[4] ?? "").replace(/^DE\s+/, "").trim();
  return { tipo_via: m[1] ?? null, nombre_via: m[2], numero: m[3], municipio_leido: cola || null };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Solo POST", { status: 405 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { convocatorias } = (await req.json()) as { convocatorias: { numero: string; catalogo_orden?: number }[] };
  const resultado: Record<string, unknown>[] = [];

  for (const c of convocatorias ?? []) {
    let catalogoId: string | null = null;
    if (c.catalogo_orden) {
      const { data } = await db.from("catalogo_convocatorias").select("id").eq("orden", c.catalogo_orden).maybeSingle();
      catalogoId = data?.id ?? null;
    }
    let total = 0, deComunidades = 0, guardadas = 0;
    try {
      for (let page = 0; ; page++) {
        const p = await pagina(c.numero, page);
        total = p.totalElements;
        const filas = (p.content ?? [])
          .filter((k) => /^[HE]\d{7}/.test(k.beneficiario.trim()))
          .map((k) => ({
            cod_concesion: k.codConcesion,
            numero_convocatoria: c.numero,
            convocatoria: k.convocatoria,
            organo: [k.nivel2, k.nivel3].filter(Boolean).join(" · ") || null,
            catalogo_convocatoria_id: catalogoId,
            fecha_concesion: k.fechaConcesion,
            beneficiario: k.beneficiario.trim(),
            cif: k.beneficiario.trim().split(/\s+/)[0],
            importe: k.importe,
            url_bases: k.urlBR?.trim() || null,
            ...leer(k.beneficiario),
          }));
        deComunidades += filas.length;
        if (filas.length) {
          const { error, count } = await db
            .from("concesiones_bdns")
            .upsert(filas, { onConflict: "cod_concesion", ignoreDuplicates: true, count: "exact" });
          if (error) throw new Error(error.message);
          guardadas += count ?? 0;
        }
        if (p.last || !p.content?.length) break;
      }
      resultado.push({ numero: c.numero, total, de_comunidades: deComunidades, guardadas });
    } catch (e) {
      resultado.push({ numero: c.numero, total, de_comunidades: deComunidades, guardadas, error: (e as Error).message });
    }
  }
  return new Response(JSON.stringify({ resultado }), { headers: { "Content-Type": "application/json" } });
});
