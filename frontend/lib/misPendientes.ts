// lib/misPendientes.ts
//
// TODO LO QUE TENGO PENDIENTE, EN UN SITIO (Monica, 8-oct-2026): "un boton
// junto a llamadas con un chisme que ponga PENDIENTES y el numero de items.
// Pulsarlo te lleva a la pantalla de cosas pendientes: notas, llamadas, opps,
// lo que sea. Tipo lista: pinchar cada una abre lo que sea con lo que falta
// destacado."
//
// Que cuenta para cada uno:
//   · NOTAS por colocar: las suyas, y las del comercial cuya cartera comparte
//     (Alejandra, las de Daniel). Direccion, todas.
//   · OPORTUNIDADES a medias: las de su cartera (la propia o la compartida).
//     Direccion, todas.
//   · LLAMADAS por colocar: a quien las coloca (hoy la secretaria comercial) y
//     a direccion. La pantalla de colocarlas esta aparcada: de momento se leen.

import "server-only";
import type { Yo } from "./sesion";
import { comercialDe, puedeEntrar } from "./sesion";
import { autoresQueVeo } from "./pendientes";
import { TEXTO_FALTA, type Falta } from "./completa";

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";
const CAB = { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` };

async function leer<T>(path: string, contar = false): Promise<{ filas: T; total: number }> {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: contar ? { ...CAB, Prefer: "count=exact" } : CAB,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${await r.text()}`);
  // "0-49/145": lo que va detras de la barra es el total de verdad.
  const total = Number(r.headers.get("content-range")?.split("/")[1] ?? "0");
  return { filas: (await r.json()) as T, total };
}

const veTodo = (yo: Yo) => yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
const colocaLlamadas = (yo: Yo) => yo.veTodo || yo.funciones.some((f) => f.clave === "secretaria");

/** Los filtros de cada persona, calculados una vez. */
async function filtros(yo: Yo) {
  const [autores, mio] = await Promise.all([autoresQueVeo(yo), veTodo(yo) ? Promise.resolve(null) : comercialDe(yo.id)]);
  return {
    notas: autores === "todas" ? "" : `&autor_id=in.(${autores.join(",")})`,
    // Sin cartera y sin ver todo: ninguna oportunidad es suya.
    opps: veTodo(yo) ? "" : mio ? `&comercial_id=eq.${mio.id}` : null,
    llamadas: colocaLlamadas(yo),
  };
}

/** El numero del boton. Si algo falla, 0: el boton nunca tumba la barra. */
export async function cuantosPendientes(yo: Yo): Promise<number> {
  try {
    const f = await filtros(yo);
    const [n, o, l] = await Promise.all([
      leer(`notas_pendientes?select=id&estado=eq.pendiente${f.notas}&limit=1`, true),
      f.opps === null ? Promise.resolve({ total: 0 }) : leer(`oportunidades_por_completar?select=id${f.opps}&limit=1`, true),
      f.llamadas ? leer(`llamadas?select=id&estado=eq.por_colocar&limit=1`, true) : Promise.resolve({ total: 0 }),
    ]);
    return n.total + o.total + l.total;
  } catch {
    return 0;
  }
}

export type ItemPendiente = {
  id: string;
  clase: "nota" | "oportunidad" | "llamada";
  titulo: string;
  detalle: string;
  /** Lo que falta, destacado. */
  falta: string;
  fecha: string | null;
  href: string | null;
};

export async function misPendientes(yo: Yo): Promise<{ notas: ItemPendiente[]; opps: ItemPendiente[]; llamadas: ItemPendiente[] }> {
  const f = await filtros(yo);
  const [notas, opps, llamadas] = await Promise.all([
    leer<{ id: string; creado_en: string; texto: string; donde_texto: string | null; autor: { nombre: string } | null }[]>(
      `notas_pendientes?select=id,creado_en,texto,donde_texto,autor:autor_id(nombre)&estado=eq.pendiente${f.notas}&order=creado_en.asc&limit=200`,
    ),
    f.opps === null
      ? Promise.resolve({ filas: [], total: 0 })
      : leer<{ id: string; codigo: string | null; direccion: string | null; desde: string; falta_direccion: boolean; falta_contacto: boolean; falta_paso: boolean;
               comercial_id: string | null }[]>(
          `oportunidades_por_completar?select=id,codigo,direccion,desde,falta_direccion,falta_contacto,falta_paso,comercial_id` +
            `${f.opps}&order=desde.asc&limit=500`,
        ),
    f.llamadas
      ? leer<{ id: string; recibida_en: string; que_dicen: string | null; quien_texto: string | null; donde_texto: string | null; area: string | null }[]>(
          `llamadas?select=id,recibida_en,que_dicen,quien_texto,donde_texto,area&estado=eq.por_colocar&order=recibida_en.asc&limit=200`,
        )
      : Promise.resolve({ filas: [], total: 0 }),
  ]);

  // Los nombres de los comerciales aparte: la vista no se cruza sola con ellos.
  const { filas: comerciales } = await leer<{ id: string; nombre: string }[]>("comerciales?select=id,nombre");
  const nombreDe = new Map(comerciales.map((c) => [c.id, c.nombre]));

  return {
    notas: notas.filas.map((n) => ({
      id: n.id,
      clase: "nota",
      titulo: n.donde_texto ? `«${n.donde_texto}»` : "Nota sin sitio",
      detalle: [n.autor?.nombre, n.texto.slice(0, 140)].filter(Boolean).join(" · "),
      falta: "colocarla: la dirección no estaba en la lista",
      fecha: n.creado_en.slice(0, 10),
      href: "/comercial/pendientes",
    })),
    opps: (opps.filas as { id: string; codigo: string | null; direccion: string | null; desde: string; falta_direccion: boolean; falta_contacto: boolean; falta_paso: boolean; comercial_id: string | null }[]).map((o) => {
      const falta: Falta[] = [];
      if (o.falta_direccion) falta.push("direccion");
      if (o.falta_contacto) falta.push("contacto");
      if (o.falta_paso) falta.push("paso");
      return {
        id: o.id,
        clase: "oportunidad",
        titulo: o.direccion ?? o.codigo ?? "(sin dirección)",
        detalle: [o.codigo, o.comercial_id ? nombreDe.get(o.comercial_id) : null].filter(Boolean).join(" · "),
        falta: falta.map((x) => TEXTO_FALTA[x]).join(" · "),
        fecha: o.desde,
        href: `/comercial/oportunidades/${o.id}`,
      };
    }),
    llamadas: (llamadas.filas as { id: string; recibida_en: string; que_dicen: string | null; quien_texto: string | null; donde_texto: string | null; area: string | null }[]).map((l) => ({
      id: l.id,
      clase: "llamada",
      titulo: [l.quien_texto, l.donde_texto].filter(Boolean).join(" · ") || "Llamada",
      detalle: [l.area, (l.que_dicen ?? "").slice(0, 140)].filter(Boolean).join(" · "),
      falta: "gestionarla",
      fecha: l.recibida_en.slice(0, 10),
      href: null,
    })),
  };
}
