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
//   · ADMINISTRADORES POSIBLES, sin consolidar (13-oct-2026): los que trajo un
//     comercial y aun no tienen su primera hoja firmada. Son "posibles" suyos,
//     no de su cartera: la lista es para insistirles hasta que den una
//     direccion. Cada comercial, los suyos; direccion, todos.

import "server-only";
import { cache } from "react";
import type { Yo } from "./sesion";
import { comercialDe, puedeEntrar } from "./sesion";
import { autoresQueVeo } from "./pendientes";
import { TEXTO_FALTA, type Falta } from "./completa";
import { puedeRevisar } from "./revisionOferta";

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
    // Los sin consolidar de QUIEN LOS LLEVA (28-oct-2026: captador y «lo lleva»
    // son cosas distintas; si direccion lo pasa a otro, le sale al nuevo).
    // Direccion, todos; sin cartera y sin ver todo, ninguno.
    // Solo direccion (28-oct-2026: el comercial no puede moverlo; a el le salen
    // los que se le enfrian, lib/adminsDormidos.ts).
    posibles: veTodo(yo) ? "&comercial_captador_id=not.is.null" : null,
  };
}

const SEL_POSIBLES = "puesto?select=id,desde,creado_en,persona_id,telefono_empresa,comercial_captador_id," +
  "persona:persona_id(nombre,apellidos),empresa:empresa_id(nombre_accesalia)&consolidado=is.false&contrata_id=is.null&hasta=is.null";

/** QUE TARJETAS LE TOCAN A CADA UNO en la pizarra de Pendientes (Monica,
 *  10-oct-2026). Una tarjeta sale aunque este a cero si es suya: "nada
 *  pendiente" tambien es un dato. */
export function tarjetasQueVeo(yo: Yo) {
  return {
    supervisa: veTodo(yo),
    llamadas: colocaLlamadas(yo),
  };
}

/** TODOS LOS AVISOS DE UNA PERSONA, EN UNA LLAMADA (Monica, 16-oct-2026: "se
 *  trata de corregir la raiz"). Antes la barra hacia 8-10 peticiones en 3 tandas
 *  en cada pantalla; ahora los cuenta la base (funcion mis_avisos, migracion
 *  20261016120000) con las mismas reglas de arriba, y la barra, el menu y quien
 *  mas lo pida en la misma pantalla comparten la respuesta (cache de React). */
export type Avisos = {
  notas: number;
  opps: number;
  llamadas: number;
  ausencias: number;
  posibles: number;
  recibidos: number;
  /** Hojas firmadas archivadas en la opp que el comercial aun no ha validado (25-oct-2026). */
  firmadas: number;
  ofertas: number;
  /** Escaneados de Polycam sin portal (la mesa de viabilidades). */
  polycam: number;
  /** 1 si queda alguna opp abierta de 2025-26 sin administrador, 0 si no
   *  (Monica, 18-oct-2026: su cifra «atura», pero si solo queda eso, que haya señal). */
  sin_admin: number;
};
const SIN_AVISOS: Avisos = { notas: 0, opps: 0, llamadas: 0, ausencias: 0, posibles: 0, recibidos: 0, firmadas: 0, ofertas: 0, polycam: 0, sin_admin: 0 };

export const misAvisos = cache(async (yo: Yo): Promise<Avisos> => {
  try {
    const mio = veTodo(yo) ? null : await comercialDe(yo.id);
    const r = await fetch(`${URL_BASE}/rest/v1/rpc/mis_avisos`, {
      method: "POST",
      headers: { ...CAB, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_equipo: yo.id,
        p_ve_todas: veTodo(yo),
        p_comercial: mio?.id ?? null,
        p_llamadas: colocaLlamadas(yo),
        p_ausencias: puedeEntrar(yo, "rrhh", "trabajar"),
        p_ofertas: puedeRevisar(yo),
      }),
      cache: "no-store",
    });
    if (!r.ok) return SIN_AVISOS;
    return { ...SIN_AVISOS, ...((await r.json()) as Partial<Avisos>) };
  } catch {
    return SIN_AVISOS;
  }
});

/** El numero del boton PENDIENTES. Si algo falla, 0: el boton nunca tumba la barra.
 *  Las ofertas suman tambien aqui ademas de su aviso propio (14-oct-2026). */
export async function cuantosPendientes(yo: Yo): Promise<number> {
  const a = await misAvisos(yo);
  return a.notas + a.opps + a.llamadas + a.ausencias + a.posibles + a.recibidos + a.firmadas + a.ofertas + a.sin_admin;
}

export type ItemPendiente = {
  id: string;
  clase: "nota" | "oportunidad" | "llamada" | "administrador";
  titulo: string;
  detalle: string;
  /** Lo que falta, destacado. */
  falta: string;
  fecha: string | null;
  href: string | null;
  /** De quien es (las oportunidades), para filtrar por comercial. */
  comercial?: string | null;
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
      // Solo el Catastro deja una opp en esta lista (28-oct-2026).
      if (o.falta_direccion) falta.push("direccion");
      return {
        id: o.id,
        clase: "oportunidad",
        // La direccion es el NOMBRE DE LA OPP; la vista ya lo trae (13-oct-2026).
        titulo: o.direccion ?? o.codigo ?? "Sin nombre",
        detalle: [o.codigo, o.comercial_id ? nombreDe.get(o.comercial_id) : null].filter(Boolean).join(" · "),
        falta: falta.map((x) => TEXTO_FALTA[x]).join(" · "),
        fecha: o.desde,
        href: `/comercial/oportunidades/${o.id}`,
        comercial: o.comercial_id ? (nombreDe.get(o.comercial_id) ?? null) : null,
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

/** LOS ADMINISTRADORES POSIBLES, SIN CONSOLIDAR (Monica, 13-oct-2026): los que
 *  trajo un comercial y aun no tienen su primera hoja firmada. Los mas antiguos
 *  arriba: son a los que mas hay que insistir. */
export async function posiblesDe(yo: Yo): Promise<ItemPendiente[]> {
  const f = await filtros(yo);
  if (f.posibles === null) return [];
  const [{ filas }, { filas: comerciales }] = await Promise.all([
    leer<{ id: string; desde: string | null; creado_en: string; persona_id: string; telefono_empresa: string | null; comercial_captador_id: string | null;
           persona: { nombre: string; apellidos: string | null } | null; empresa: { nombre_accesalia: string } | null }[]>(
      `${SEL_POSIBLES}${f.posibles}&order=creado_en.asc&limit=500`,
    ),
    leer<{ id: string; nombre: string }[]>("comerciales?select=id,nombre"),
  ]);
  const nombreDe = new Map(comerciales.map((c) => [c.id, c.nombre]));
  const hoy = Date.now();
  return filas.map((p) => {
    const desde = p.desde ?? p.creado_en.slice(0, 10);
    const dias = Math.max(0, Math.floor((hoy - new Date(desde).getTime()) / 86400000));
    return {
      id: p.id,
      clase: "administrador",
      titulo: [p.persona?.nombre, p.persona?.apellidos].filter(Boolean).join(" ") || "(sin nombre)",
      detalle: [p.empresa?.nombre_accesalia ?? "sin administración todavía", p.telefono_empresa,
                p.comercial_captador_id ? nombreDe.get(p.comercial_captador_id) : null].filter(Boolean).join(" · "),
      falta: `su primera hoja firmada · ${dias === 0 ? "creado hoy" : dias === 1 ? "hace 1 día" : `hace ${dias} días`}`,
      fecha: desde,
      href: `/consulta/personas/${p.persona_id}`,
      comercial: p.comercial_captador_id ? (nombreDe.get(p.comercial_captador_id) ?? null) : null,
    };
  });
}
