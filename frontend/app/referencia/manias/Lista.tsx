"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Filtros, type Criterios, type Opcion } from "./Filtros";

// EL BUSCADOR (Monica, 10-oct-2026): "si busco 'amianto' tiene que encontrarse,
// aunque no recuerde quien lo pide o como. Igual si busco Luis Enrique o
// Leganes". Busca segun se escribe, letra a letra, en todo lo que se ve de la
// mania, sin mayusculas ni tildes; con varias palabras, tienen que estar todas.
// Lo encontrado sale en negrita.
//
// Son unos cientos: se busca en el navegador, sin indice. Si un dia son miles,
// entonces se pasa a la base.

export type ManiaVista = {
  id: string;
  municipio: string | null;
  entidad: string | null;
  detalle: string | null;
  tecnico: string | null;
  mania: string;
  cita: string | null;
  fecha: string | null;
  autor: string | null;
  oportunidad: { id: string; codigo: string | null; nombre: string | null } | null;
};

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });

/** Sin tildes ni mayusculas, y CARACTER A CARACTER: asi una posicion en el
 *  texto normalizado es la misma en el original y se puede resaltar alli. */
const llano = (s: string) =>
  Array.from(s.normalize("NFC"))
    .map((c) => c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().charAt(0) || c)
    .join("");

function cuantoHace(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso + "T12:00:00").getTime()) / 864e5);
  if (dias < 31) return "este mes";
  const meses = Math.floor(dias / 30.44);
  if (meses < 12) return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
  const años = Math.floor(meses / 12);
  return `hace ${años} ${años === 1 ? "año" : "años"}`;
}

/** El texto con las palabras buscadas en negrita. */
function Resaltar({ texto, palabras }: { texto: string; palabras: string[] }) {
  if (!palabras.length) return <>{texto}</>;
  const letras = Array.from(texto.normalize("NFC"));
  const original = { length: letras.length, slice: (a: number, b: number) => letras.slice(a, b).join("") };
  const plano = llano(texto);
  const marca = new Array<boolean>(plano.length).fill(false);
  for (const p of palabras) {
    for (let i = plano.indexOf(p); i !== -1; i = plano.indexOf(p, i + 1)) {
      for (let k = i; k < i + p.length; k++) marca[k] = true;
    }
  }
  const trozos: ReactNode[] = [];
  let desde = 0;
  for (let i = 1; i <= original.length; i++) {
    if (i === original.length || marca[i] !== marca[desde]) {
      const t = original.slice(desde, i);
      trozos.push(
        marca[desde] ? (
          <b key={desde} className="rounded-[3px] bg-lima/40 font-bold text-carbon">
            {t}
          </b>
        ) : (
          t
        ),
      );
      desde = i;
    }
  }
  return <>{trozos}</>;
}

const sinCriterios: Criterios = { municipio: "", entidad: "", persona: "" };

/** Cuantas de cada valor, ordenadas por nombre. */
function contar(lista: ManiaVista[], campo: (m: ManiaVista) => string | null): Opcion[] {
  const n = new Map<string, number>();
  for (const m of lista) {
    const v = campo(m);
    if (v) n.set(v, (n.get(v) ?? 0) + 1);
  }
  return Array.from(n, ([valor, k]) => ({ valor, n: k })).sort((a, b) => a.valor.localeCompare(b.valor, "es"));
}

const CAMPO: Record<keyof Criterios, (m: ManiaVista) => string | null> = {
  municipio: (m) => m.municipio,
  entidad: (m) => m.entidad,
  persona: (m) => m.tecnico,
};

// BUSQUEDA Y FILTROS, JUNTOS Y EN EL NAVEGADOR (Monica, 10-oct-2026): "se
// pueden ejecutar filtros sobre la busqueda, no?". Si: cada cosa restringe lo
// que deja la otra, y encima de la lista se dice con palabras que se esta
// viendo, con una × en cada criterio. Los numeros de cada filtro cuentan
// dentro de lo buscado y de los OTROS filtros, no de toda la tabla.
export function Lista({ manias }: { manias: ManiaVista[] }) {
  const [busco, setBusco] = useState("");
  const [criterios, setCriterios] = useState<Criterios>(sinCriterios);
  const palabras = useMemo(() => llano(busco).split(/\s+/).filter((p) => p.length > 0), [busco]);

  const buscadas = useMemo(() => {
    if (!palabras.length) return manias;
    return manias.filter((m) => {
      const todo = llano(
        [m.mania, m.cita, m.entidad, m.detalle, m.tecnico, m.municipio, m.oportunidad?.nombre, m.oportunidad?.codigo]
          .filter(Boolean)
          .join(" · "),
      );
      return palabras.every((p) => todo.includes(p));
    });
  }, [manias, palabras]);

  const pasa = (m: ManiaVista, salvo?: keyof Criterios) =>
    (Object.keys(CAMPO) as (keyof Criterios)[]).every((k) => k === salvo || !criterios[k] || CAMPO[k](m) === criterios[k]);
  const vistas = buscadas.filter((m) => pasa(m));
  const opciones = (k: keyof Criterios) => contar(buscadas.filter((m) => pasa(m, k)), CAMPO[k]);

  const cambiar = (k: keyof Criterios, v: string) => setCriterios((c) => ({ ...c, [k]: v }));
  const hayAlgo = !!busco.trim() || Object.values(criterios).some(Boolean);

  const R = ({ t }: { t: string }) => <Resaltar texto={t} palabras={palabras} />;
  const etiqueta = (texto: string, quitar: () => void) => (
    <span className="inline-flex items-center gap-1 rounded-full border border-lima-dark/40 bg-lima-soft py-0.5 pl-2.5 pr-1 text-[12.5px] font-semibold text-carbon">
      {texto}
      <button
        type="button"
        onClick={quitar}
        title="Quitar"
        className="flex h-5 w-5 items-center justify-center rounded-full text-[14px] leading-none text-carbon/60 transition hover:bg-carbon hover:text-white"
      >
        ×
      </button>
    </span>
  );

  return (
    <>
      <div className="relative mt-5">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-carbon/45"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={busco}
          onChange={(e) => setBusco(e.target.value)}
          placeholder="Buscar: amianto, Leganés, un técnico, una calle…"
          aria-label="Buscar en las manías"
          autoFocus
          className="h-[46px] w-full rounded-2xl border border-carbon/25 bg-white pl-12 pr-11 text-[15px] text-carbon shadow-sm outline-none transition focus:border-lima-dark focus:ring-2 focus:ring-lima/40"
        />
        {busco && (
          <button
            type="button"
            onClick={() => setBusco("")}
            title="Vaciar la búsqueda"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[18px] leading-none text-carbon/55 transition hover:bg-carbon hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <Filtros
          actual={criterios}
          cambiar={cambiar}
          municipios={opciones("municipio")}
          entidades={opciones("entidad")}
          personas={opciones("persona")}
        />
      </div>

      {/* QUE SE ESTA VIENDO, dicho con palabras: asi se ve que la lista de
          abajo ya es la busqueda, sin boton de "buscar". */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-black/10 pb-2.5">
        <span className="text-[14px] font-bold text-carbon">
          {hayAlgo
            ? `${vistas.length} ${vistas.length === 1 ? "manía" : "manías"} de ${manias.length}`
            : `Todas las manías · ${manias.length}`}
        </span>
        {busco.trim() && etiqueta(`con «${busco.trim()}»`, () => setBusco(""))}
        {criterios.municipio && etiqueta(`en ${criterios.municipio}`, () => cambiar("municipio", ""))}
        {criterios.entidad && etiqueta(criterios.entidad, () => cambiar("entidad", ""))}
        {criterios.persona && etiqueta(criterios.persona, () => cambiar("persona", ""))}
        {hayAlgo && (
          <button
            type="button"
            onClick={() => {
              setBusco("");
              setCriterios(sinCriterios);
            }}
            className="ml-auto text-[12.5px] font-semibold text-[#2B6CB0] hover:underline"
          >
            Quitar todo
          </button>
        )}
      </div>

      <div className="mt-2 space-y-3">
        {vistas.length === 0 ? (
          <p className={CAJA + " p-5 text-[13px] text-carbon/55"}>
            Ninguna manía con eso. Quita algún criterio de arriba.
          </p>
        ) : (
          vistas.map((m) => (
            <article key={m.id} className={CAJA + " px-5 py-4"}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="text-[13px] text-carbon/70">
                  <span className="font-bold text-carbon">
                    <R t={m.entidad ?? "Sin entidad"} />
                  </span>
                  {m.detalle && (
                    <span>
                      {" · "}
                      <R t={m.detalle} />
                    </span>
                  )}
                  {m.tecnico && (
                    <span>
                      {" · "}
                      <R t={m.tecnico} />
                    </span>
                  )}
                  {/* El municipio, si la entidad no lo dice ya ("Ayuntamiento de Alcorcón"). */}
                  {m.municipio && !llano(m.entidad ?? "").includes(llano(m.municipio)) && (
                    <span className="text-carbon/45">
                      {" · "}
                      <R t={m.municipio} />
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-[12.5px] tabular-nums text-carbon/60">
                  {m.fecha ? (
                    <>
                      <b className="text-carbon/80">{FECHA.format(new Date(m.fecha + "T12:00:00"))}</b> · {cuantoHace(m.fecha)}
                    </>
                  ) : (
                    "sin fecha"
                  )}
                </div>
              </div>
              <p className="mt-2 text-[15px] font-semibold leading-snug text-carbon">
                <R t={m.mania} />
              </p>
              {m.cita && (
                <blockquote className="mt-2 whitespace-pre-line border-l-2 border-black/10 pl-3 text-[12.5px] leading-relaxed text-carbon/55">
                  <R t={m.cita} />
                </blockquote>
              )}
              {m.autor && m.autor !== "Volcado de Dropbox" && (
                <div className="mt-2 text-[12px] text-carbon/50">
                  La puso <b className="font-semibold text-carbon/70">{m.autor}</b>
                </div>
              )}
              {m.oportunidad && (
                <div className="mt-2 text-[12px] text-carbon/50">
                  De la ficha de{" "}
                  <Link href={`/comercial/oportunidades/${m.oportunidad.id}`} className="font-semibold text-[#2B6CB0] hover:underline">
                    <R t={m.oportunidad.nombre ?? m.oportunidad.codigo ?? "su oportunidad"} />
                  </Link>
                  {m.oportunidad.codigo && m.oportunidad.nombre ? ` (${m.oportunidad.codigo})` : ""}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </>
  );
}
