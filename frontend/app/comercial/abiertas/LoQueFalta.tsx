"use client";

import Link from "next/link";
import type { FilaAbierta } from "../../../lib/listaAbiertas";
import type { Accion } from "../../../lib/pasosEscalera";

// LO QUE FALTA PARA AVANZAR (Monica, 29-oct-2026: «hoy enseño la app a los comerciales: aunque no me guste el estilo, la
// vamos a cablear para que ya les aparezca, y vean como navegar a ella y como usarla»). Es la pestaña de la maqueta
// docs/figma/oportunidades-comercial-v3.html, con el aspecto de esta pantalla. Las opps, segun DE QUIEN DEPENDE el
// siguiente paso, que lo dice la escalera (lib/pasosEscalera, su «accion»): EN CASA (de mi, de un compañero) y FUERA DE
// CASA (de terceros). Dentro, un grupo plegable por paso; si un grupo es largo, se parte por antigüedad (y fuera de
// casa, antes por administración).

export type PasoLista = { clave: string; titulo: string; hecha: boolean; accion: Accion | null; quien: string | null };
type Lado = "yo" | "comp" | "fuera" | "ya";

const DE_MI: (Accion | null)[] = ["doc", "polycam", "validar", "perdida"];
const ladoDe = (p: PasoLista | undefined): Lado =>
  !p || p.accion === null ? "ya" : DE_MI.includes(p.accion) ? "yo" : p.accion === "interno" ? "comp" : "fuera";

const TOPE = 12;
const LOTE = 10;
const PARADA = 180;
const TRAMOS = [
  { hasta: 30, t: "Desde hace menos de un mes" },
  { hasta: 90, t: "Desde hace 1 a 3 meses" },
  { hasta: 180, t: "Desde hace 3 a 6 meses" },
  { hasta: 365, t: "Desde hace 6 meses a un año" },
  { hasta: Infinity, t: "Desde hace más de un año" },
];
const alfa = (a: FilaAbierta, b: FilaAbierta) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
const porDias = (a: FilaAbierta, b: FilaAbierta) => (b.dias ?? 0) - (a.dias ?? 0) || alfa(a, b);

type Nodo = { filas: FilaAbierta[] } | { subs: { titulo: string; nodo: Nodo; n: number; deAdmin?: boolean }[] };
type Criterio = (xs: FilaAbierta[]) => { titulo: string; xs: FilaAbierta[]; deAdmin?: boolean }[];

const porAntiguedad: Criterio = (xs) =>
  [...TRAMOS, { hasta: NaN, t: "Sin fecha" }]
    .map((tr, i) => ({
      titulo: tr.t,
      xs: xs.filter((x) => (Number.isNaN(tr.hasta) ? x.dias == null : x.dias != null && x.dias < tr.hasta && (i === 0 || x.dias >= TRAMOS[i - 1].hasta))),
    }))
    .filter((g) => g.xs.length);
const porAdministracion: Criterio = (xs) => {
  const SIN = "Sin administración apuntada";
  const m = new Map<string, FilaAbierta[]>();
  for (const x of xs) m.set(x.empresa || SIN, [...(m.get(x.empresa || SIN) ?? []), x]);
  const grandes = [...m].filter(([k, v]) => v.length >= 3 && k !== SIN).sort((a, b) => b[1].length - a[1].length);
  const otras = [...m].filter(([k, v]) => v.length < 3 && k !== SIN).flatMap(([, v]) => v);
  return [
    ...grandes.map(([titulo, v]) => ({ titulo, xs: v, deAdmin: true })),
    ...(otras.length ? [{ titulo: "Otras administraciones", xs: otras }] : []),
    ...(m.has(SIN) ? [{ titulo: SIN, xs: m.get(SIN)! }] : []),
  ];
};
const CRITERIOS: Record<Lado, Criterio[]> = { yo: [porAntiguedad], comp: [porAntiguedad], fuera: [porAdministracion, porAntiguedad], ya: [porAntiguedad] };

function partir(xs: FilaAbierta[], criterios: Criterio[], nivel = 0): Nodo {
  if (xs.length <= TOPE) return { filas: [...xs].sort(porDias) };
  const c = criterios[nivel];
  if (!c) {
    const o = [...xs].sort(alfa);
    const subs = [];
    for (let i = 0; i < o.length; i += LOTE) {
      const t = o.slice(i, i + LOTE);
      subs.push({ titulo: `De «${(t[0].nombre ?? "?").split(",")[0]}» a «${(t[t.length - 1].nombre ?? "?").split(",")[0]}»`, n: t.length, nodo: { filas: t.sort(porDias) } as Nodo });
    }
    return { subs };
  }
  return { subs: c(xs).map((g) => ({ titulo: g.titulo, n: g.xs.length, deAdmin: g.deAdmin, nodo: partir(g.xs, criterios, nivel + 1) })) };
}

const COLOR: Record<Lado, { borde: string; texto: string; pildora: string }> = {
  yo: { borde: "border-t-[#3f8a1c]", texto: "text-[#2f6a14]", pildora: "bg-[#e2f1d6] text-[#2f6a14]" },
  comp: { borde: "border-t-[#d4860b]", texto: "text-[#8a5700]", pildora: "bg-[#fcefd2] text-[#8a5700]" },
  fuera: { borde: "border-t-[#2b6cb3]", texto: "text-[#1f4f86]", pildora: "bg-[#e3ecf5] text-[#1f4f86]" },
  ya: { borde: "border-t-[#949ca5]", texto: "text-carbon/70", pildora: "bg-black/[0.06] text-carbon/70" },
};

function Filas({ filas, conAdmin }: { filas: FilaAbierta[]; conAdmin: boolean }) {
  return (
    <ul className="mt-0.5">
      {filas.map((x) => (
        <li key={x.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-black/[0.06] py-1.5 pl-6 pr-2 first:border-t-0">
          <span className="min-w-0 truncate">
            <Link href={`/comercial/oportunidades/${x.id}`} title={x.codigo ?? undefined} className="font-semibold text-carbon hover:underline">
              {x.nombre}
            </Link>
            {conAdmin && x.empresa && <span className="ml-2 text-[12.5px] text-carbon/55">{x.empresa}</span>}
          </span>
          <span className={"whitespace-nowrap text-[12.5px] tabular-nums " + ((x.dias ?? 0) > PARADA ? "font-semibold text-alerta" : "text-carbon/60")}>
            {x.dias == null ? "—" : `${x.dias} d`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function VerNodo({ nodo, conAdmin }: { nodo: Nodo; conAdmin: boolean }) {
  if ("filas" in nodo) return <Filas filas={nodo.filas} conAdmin={conAdmin} />;
  return (
    <>
      {nodo.subs.map((s) => (
        <details key={s.titulo} className="group/sub ml-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-carbon/80 hover:bg-black/[0.04] [&::-webkit-details-marker]:hidden">
            <span className="text-carbon/40 transition group-open/sub:rotate-90">›</span>
            <span className="flex-1">{s.titulo}</span>
            <span className="text-[12px] tabular-nums text-carbon/55">{s.n}</span>
          </summary>
          <VerNodo nodo={s.nodo} conAdmin={conAdmin && !s.deAdmin} />
        </details>
      ))}
    </>
  );
}

function Grupos({ lado, filas, pasos }: { lado: Lado; filas: FilaAbierta[]; pasos: PasoLista[] }) {
  const xs = filas.filter((f) => ladoDe(pasos.find((p) => p.clave === f.clave)) === lado);
  const deLado = pasos.filter((p) => ladoDe(p) === lado && xs.some((x) => x.clave === p.clave));
  const sinPaso = lado === "ya" ? xs.filter((x) => !x.clave) : [];
  if (!deLado.length && !sinPaso.length) return <p className="px-2 py-2 text-[13px] text-carbon/55">Nada ahora mismo.</p>;
  const grupo = (clave: string, titulo: string, quien: string | null, g: FilaAbierta[]) => (
    <details key={clave} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-md px-2 py-2 hover:bg-black/[0.04] [&::-webkit-details-marker]:hidden">
        <span className="text-carbon/40 transition group-open:rotate-90">›</span>
        <span className="flex-1 text-[14px] font-semibold leading-snug">{titulo}</span>
        {quien && <span className="whitespace-nowrap rounded-[4px] bg-black/[0.05] px-1.5 py-px text-[11.5px] text-carbon/65">{quien}</span>}
        <span className={"min-w-[28px] rounded-full px-2 py-px text-center text-[12px] font-bold tabular-nums " + COLOR[lado].pildora}>{g.length}</span>
      </summary>
      <div className="pb-1.5">
        <VerNodo nodo={partir(g, CRITERIOS[lado])} conAdmin />
      </div>
    </details>
  );
  return (
    <>
      {deLado.map((p) => grupo(p.clave, p.titulo, p.quien, xs.filter((x) => x.clave === p.clave)))}
      {sinPaso.length > 0 && grupo("sin", "Sin calcular todavía", null, sinPaso)}
    </>
  );
}

function Caja({ lado, titulo, n, children }: { lado: Lado; titulo: string; n: number; children: React.ReactNode }) {
  return (
    <div className={"rounded-[10px] border-t-4 bg-white px-3 pb-2.5 pt-3 shadow-[0_2px_4px_rgba(0,0,0,.18),0_18px_36px_-18px_rgba(0,0,0,.6)] " + COLOR[lado].borde}>
      <h3 className={"mb-1.5 flex items-baseline gap-2 px-2 font-[family-name:var(--letra-menu)] text-[13px] font-extrabold uppercase tracking-[0.08em] " + COLOR[lado].texto}>
        {titulo}
        <span className="ml-auto text-[13px] tabular-nums text-carbon/55">{n}</span>
      </h3>
      {children}
    </div>
  );
}

export function LoQueFalta({ filas, pasos }: { filas: FilaAbierta[]; pasos: PasoLista[] }) {
  const cuenta = (l: Lado) => filas.filter((f) => ladoDe(pasos.find((p) => p.clave === f.clave)) === l).length;
  const cifras: { lado: Lado | null; n: number; t: string }[] = [
    { lado: null, n: filas.length, t: "en la lista" },
    { lado: "yo", n: cuenta("yo"), t: "dependen de mí" },
    { lado: "comp", n: cuenta("comp"), t: "de un compañero" },
    { lado: "fuera", n: cuenta("fuera"), t: "fuera de casa" },
  ];
  return (
    <div className="mt-5">
      {/* COMO SE USA: hoy se la enseña a los comerciales. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap gap-2">
          {cifras.map((c) => (
            <span key={c.t} className="flex items-baseline gap-1.5 rounded-[8px] bg-white/[0.07] px-3 py-1.5 text-[13px] text-[#f3f4f1]/80">
              <b className={"font-[family-name:var(--letra-menu)] text-[18px] font-extrabold " + (c.lado ? { yo: "text-[#a6dc7e]", comp: "text-[#f3c46a]", fuera: "text-[#9cc4ee]", ya: "" }[c.lado] : "text-[#f3f4f1]")}>
                {c.n}
              </b>
              {c.t}
            </span>
          ))}
        </div>
        <p className="max-w-[70ch] text-[13px] text-[#f3f4f1]/70">
          <b className="text-[#f3f4f1]">Cómo se usa:</b> empieza por «Depende de mí». Abre un paso para ver sus opps (las que llevan más días, arriba) y
          pincha una para ir a su ficha y moverla. Los filtros y el buscador de la lista también valen aquí.
        </p>
      </div>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Caja lado="yo" titulo="En casa · depende de mí" n={cuenta("yo")}>
            <Grupos lado="yo" filas={filas} pasos={pasos} />
          </Caja>
          <Caja lado="comp" titulo="En casa · depende de un compañero" n={cuenta("comp")}>
            <Grupos lado="comp" filas={filas} pasos={pasos} />
          </Caja>
        </div>
        <div className="flex flex-col gap-4">
          <Caja lado="fuera" titulo="Fuera de casa · depende de terceros" n={cuenta("fuera")}>
            <Grupos lado="fuera" filas={filas} pasos={pasos} />
          </Caja>
          <Caja lado="ya" titulo="Aparte · se cobran a su hito o ya cobradas" n={cuenta("ya")}>
            <Grupos lado="ya" filas={filas} pasos={pasos} />
          </Caja>
        </div>
      </div>
    </div>
  );
}
