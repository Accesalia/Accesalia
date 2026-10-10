"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CarteraEnMunicipio, ComercialAlQueAsignar } from "../../../lib/alertasIEE";
import { Asignador, Descartar, Recuperar } from "./Piezas";

// LA LISTA DE PENDIENTES, FILTRADA EN EL NAVEGADOR (Monica, 10-oct-2026).
//
// "Si la lista ya esta, ¿como es que cambiar de municipio tarda 2-3 segundos?"
// Porque cada clic volvia a pedir la pantalla entera al servidor. Ahora el
// servidor manda la lista una vez -con lo de "que tiene cada comercial" ya
// calculado para todos los municipios- y los tres filtros (municipio, las
// nuestras, las descartadas) se aplican aqui, sin ir y volver.
//
// Lo que viaja es lo justo para pintar la fila: sin la nota entera del IEE.

export type FilaPendiente = {
  codigo: string;
  direccion: string | null;
  /** Ya limpio: sin tildes, en mayusculas, sin "(MADRID)". La clave del filtro. */
  municipio: string | null;
  /** Como se ensena: sin "(MADRID)", con sus tildes. */
  municipioTexto: string | null;
  nuestra: { tipo: "misma_finca" | "misma_calle"; comunidad: string } | null;
  estado: string;
  motivo: string;
  /** Las dos mejores van en negro; las demas, en gris. */
  buena: boolean;
  descartadaPor: string | null;
  motivoDescarte: string | null;
};

export type DiaPendiente = { dia: string; alertas: FilaPendiente[] };

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const ROTULO = "text-[11px] font-bold uppercase tracking-wider text-carbon/45";
const MUNI =
  "rounded-full border border-black/10 bg-white px-3 py-1 text-[12px] font-semibold text-carbon/60 transition hover:text-carbon";
const MUNI_ACTIVO = "rounded-full border border-[#104269] bg-[#104269] px-3 py-1 text-[12px] font-semibold text-white";
const BOTON =
  "rounded-full border border-carbon/25 bg-white px-3 py-1 text-[12px] font-semibold text-carbon/70 transition hover:border-carbon/50";

const DIA_LARGO = new Intl.DateTimeFormat("es-ES", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid",
});
function comoSeDice(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return DIA_LARGO.format(new Date(Date.UTC(a, m - 1, d, 12)));
}
const bonito = (m: string) =>
  m
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
    .replace(/ (De|Del|La|Las|Los|El|Y) /g, (x) => x.toLowerCase());

/** La URL sigue diciendo donde estas, para poder volver o pasar el enlace,
 *  pero sin recargar: replaceState no pide nada al servidor. */
function apuntarEnLaUrl(muni: string | null, nuestras: boolean, descartadas: boolean) {
  const q = new URLSearchParams(window.location.search);
  for (const [k, v] of [["municipio", muni], ["nuestras", nuestras ? "1" : null], ["descartadas", descartadas ? "1" : null]] as const) {
    if (v) q.set(k, v);
    else q.delete(k);
  }
  const s = q.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
}

export function ListaPendientes({
  dias: todos,
  comerciales,
  cartera,
  hoy,
  inicial,
}: {
  dias: DiaPendiente[];
  comerciales: ComercialAlQueAsignar[];
  cartera: Record<string, CarteraEnMunicipio[]>;
  hoy: string;
  inicial: { municipio: string | null; nuestras: boolean; descartadas: boolean };
}) {
  const [municipioPedido, setMunicipio] = useState<string | null>(inicial.municipio);
  const [verNuestras, setNuestras] = useState(inicial.nuestras);
  const [verDescartadas, setDescartadas] = useState(inicial.descartadas);

  const esNuestra = (a: FilaPendiente) => a.nuestra?.tipo === "misma_finca";
  const esDescartada = (a: FilaPendiente) => a.estado === "descartada";

  const { sinFiltrar, municipios, cuantasNuestras, cuantasDescartadas } = useMemo(() => {
    const todas = todos.flatMap((d) => d.alertas);
    // En pendientes no salen los dias que se quedan vacios al apartar las
    // nuestras y las descartadas: "ese dia no habia nada" seria falso.
    const sinFiltrar = todos
      .map((d) => ({
        ...d,
        alertas: d.alertas.filter((a) => (verNuestras || !esNuestra(a)) && (verDescartadas || !esDescartada(a))),
      }))
      .filter((d) => d.alertas.length > 0);
    const cuenta = new Map<string, number>();
    for (const a of sinFiltrar.flatMap((d) => d.alertas)) {
      if (a.municipio) cuenta.set(a.municipio, (cuenta.get(a.municipio) ?? 0) + 1);
    }
    return {
      sinFiltrar,
      municipios: [...cuenta].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")),
      cuantasNuestras: todas.filter(esNuestra).length,
      cuantasDescartadas: todas.filter((a) => esDescartada(a) && !esNuestra(a)).length,
    };
  }, [todos, verNuestras, verDescartadas]);

  // Si en el municipio elegido ya no queda nada (se asigno o descarto la
  // ultima), a todos: si no, la lista se quedaba vacia y parecia que habian
  // desaparecido todas.
  const municipio = municipioPedido && municipios.some(([m]) => m === municipioPedido) ? municipioPedido : null;
  const dias = municipio
    ? sinFiltrar
        .map((d) => ({ ...d, alertas: d.alertas.filter((a) => a.municipio === municipio) }))
        .filter((d) => d.alertas.length > 0)
    : sinFiltrar;
  const suCartera = municipio ? (cartera[municipio] ?? []) : [];

  const elegir = (m: string | null) => {
    setMunicipio(m);
    apuntarEnLaUrl(m, verNuestras, verDescartadas);
  };
  const conmutarNuestras = () => {
    setNuestras(!verNuestras);
    apuntarEnLaUrl(municipio, !verNuestras, verDescartadas);
  };
  const conmutarDescartadas = () => {
    setDescartadas(!verDescartadas);
    apuntarEnLaUrl(municipio, verNuestras, !verDescartadas);
  };

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className={ROTULO}>
          Pendientes de asignar{verNuestras ? " · con las nuestras" : " · solo las de fuera"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {cuantasDescartadas > 0 && (
            <button type="button" onClick={conmutarDescartadas} className={BOTON}>
              {verDescartadas ? "Ocultar las descartadas" : `Mostrar las descartadas (${cuantasDescartadas})`}
            </button>
          )}
          {cuantasNuestras > 0 && (
            <button type="button" onClick={conmutarNuestras} className={BOTON}>
              {verNuestras ? "Ocultar las nuestras" : `Mostrar las nuestras (${cuantasNuestras})`}
            </button>
          )}
        </div>
      </div>

      {municipios.length > 1 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => elegir(null)} className={municipio ? MUNI : MUNI_ACTIVO}>
            Todos los municipios
          </button>
          {municipios.map(([m, n]) => (
            <button key={m} type="button" onClick={() => elegir(m)} className={municipio === m ? MUNI_ACTIVO : MUNI}>
              {bonito(m)} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      )}

      {/* QUIEN TIENE QUE AHI (Monica, 10-oct-2026): contexto para repartir, "no
          para condicionar". Las pausadas cuentan con las abiertas: "lo que
          cuenta es el admin".
          UNA CHULETA, NO LA PRIMERA PARTE DEL LISTADO (Monica, 10-oct-2026):
          "mas pequeña y alineada a la derecha, con color de fondo tenue: que se
          vea el dato, que se vea que es una chuleta". Un tercio del ancho. */}
      {municipio && suCartera.length > 0 && (
        <div className="mb-3 flex justify-end">
          <div className="w-full rounded-xl border border-lima/25 bg-lima-soft/60 px-3 py-2 sm:w-auto sm:min-w-[340px] lg:w-1/3">
            <div className="mb-1 text-[11px] font-semibold text-carbon/55">
              Quién tiene ya opps en {bonito(municipio)}
            </div>
            <table className="w-full text-[12px] tabular-nums">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-carbon/45">
                  <th className="pb-0.5 text-left font-semibold" rowSpan={2}></th>
                  <th className="pb-0.5 text-center font-semibold" colSpan={2}>Aquí</th>
                  <th className="pb-0.5 text-center font-semibold" colSpan={2}>En total</th>
                </tr>
                <tr className="text-[10px] text-carbon/45">
                  <th className="px-1 text-right font-normal">abiertas*</th>
                  <th className="px-1 text-right font-normal">cerradas</th>
                  <th className="px-1 text-right font-normal">abiertas*</th>
                  <th className="px-1 text-right font-normal">cerradas</th>
                </tr>
              </thead>
              <tbody>
                {suCartera.map((c) => (
                  <tr key={c.comercialId} className="border-t border-lima/15">
                    <td className="py-0.5 pr-2 font-semibold text-carbon">{c.nombre}</td>
                    <td className={"px-1 text-right " + (c.abiertasAqui ? "font-bold text-carbon" : "text-carbon/30")}>{c.abiertasAqui}</td>
                    <td className={"px-1 text-right " + (c.cerradasAqui ? "text-carbon/70" : "text-carbon/30")}>{c.cerradasAqui}</td>
                    <td className="px-1 text-right text-carbon/50">{c.abiertasTotal}</td>
                    <td className="px-1 text-right text-carbon/50">{c.cerradasTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 text-[10px] text-carbon/40">* con las pausadas</div>
          </div>
        </div>
      )}

      <div className={CAJA + " overflow-hidden"}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-wider text-carbon/45">
              <th className="px-4 py-2 font-bold">Dirección</th>
              <th className="px-3 py-2 font-bold">Por qué está aquí</th>
              <th className="px-3 py-2 font-bold">El informe</th>
              <th className="px-3 py-2 font-bold">Comercial</th>
            </tr>
          </thead>

          {dias.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[13px] text-carbon/50">
                  No queda ninguna por asignar. Todo repartido.
                </td>
              </tr>
            </tbody>
          )}
          {dias.map((d) => (
            <tbody key={d.dia}>
              <tr className="border-y border-black/5 bg-hueso/60">
                <td colSpan={4} className="px-4 py-1.5 text-[12px] font-bold text-carbon/70">
                  {d.dia === hoy ? "Hoy · " : ""}
                  {comoSeDice(d.dia)}
                </td>
              </tr>
              {d.alertas.map((a) => (
                <tr key={a.codigo} className="border-b border-black/5">
                  <td className="px-4 py-2">
                    <div className="font-bold text-carbon">
                      {a.direccion ?? "Sin dirección"}
                      {a.municipioTexto && <span className="font-semibold text-carbon/60"> · {a.municipioTexto}</span>}
                    </div>
                    {/* La misma finca es un cliente que ya tenemos; la misma
                        calle, el mejor argumento que hay para llamar. */}
                    {a.nuestra && (
                      <div className={"mt-0.5 text-[11px] " + (a.nuestra.tipo === "misma_finca" ? "text-carbon/45" : "text-lima-dark")}>
                        {a.nuestra.tipo === "misma_finca" ? `Ya la tenemos: ${a.nuestra.comunidad}` : `Misma calle que ${a.nuestra.comunidad}`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={"text-[12px] " + (a.buena ? "font-semibold text-carbon/80" : "text-carbon/45")}>{a.motivo}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/comercial/alertas-iee/${a.codigo}`} className="font-semibold text-[#2B6CB0] hover:underline">
                      Ver el IEE
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {/* Si ya es nuestra, no se asigna: no se le regala a un
                        comercial un cliente que ya tenemos. */}
                    {esNuestra(a) ? (
                      <span className="text-[12px] text-carbon/45">Ya es nuestra</span>
                    ) : esDescartada(a) ? (
                      <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-carbon/50">
                        <span>
                          Descartada{a.descartadaPor ? ` por ${a.descartadaPor}` : ""}
                          {a.motivoDescarte ? ` · ${a.motivoDescarte}` : ""}
                        </span>
                        <Recuperar codigo={a.codigo} />
                      </span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-2">
                        <Asignador codigo={a.codigo} comerciales={comerciales} />
                        <Descartar codigo={a.codigo} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
