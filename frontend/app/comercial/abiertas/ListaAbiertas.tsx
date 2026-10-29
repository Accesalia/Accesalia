"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FilaAbierta } from "../../../lib/listaAbiertas";
import { LoQueFalta, type PasoLista } from "./LoQueFalta";

// LA LISTA DE LA MAQUETA VALIDADA (docs/figma/oportunidades-abiertas-clara.html, 26-oct-2026). Sus reglas, de Monica:
//   - UNA LINEA por opp, cada dato en su columna «como un Excel», los titulos solo en la cabecera (nada de «Esta en»
//     dentro de las celdas) salvo «245 dias parada aqui»; la DIRECCION manda (mas grande, negrita);
//   - las cobradas (y lo que se cobra al llegar a su hito) ya no se siguen: ✓ en vez de dias;
//   - «Que quieren» en pildora clara, nunca verde lleno;
//   - arriba, en la franja de pizarra: buscador (del ancho de la direccion), Ordenar por y, a la derecha, «Ver todas /
//     Ver solo las abiertas» y «Ver solo» con la escalera. LOS FILTROS SE SUMAN («lo mantenemos asi»);
//   - pinchar una fila abre la ficha de la opp (hoy, la de bloques; la nueva cuando exista).

type Paso = PasoLista;
type Orden = "nombre" | "punto" | "dias" | "contacto" | "admin" | "importe" | "recientes" | "antiguas";
/** CUANDO SE ABRIO, para filtrar (Monica, 29-oct-2026: «poder ordenar y filtrar por fecha arriba»). */
type Cuando = "" | "mes" | "3m" | "6m" | "ano" | "pasado" | "mas1" | "entre";

/** Lo de la firma en adelante (firmado, facturado, cobrado): fuera con «Ver solo las abiertas». */
const FIRMADAS = new Set([
  "firmada_por_validar", "firma_con_errores", "facturacion_prepara", "falta_que_paguen", "cobro_hito_posterior",
  "falta_ok_cobro_primera", "primera_parte_cobrada", "completado",
]);
const POR_PAGINA = 50;
const PARADA = 180;
const SIN_CONTACTO = 60;

const eur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const fecha = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");
const fechaLarga = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const lim = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hoyIso = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const mesesAtras = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
};
/** El tramo [desde, hasta] de cada opcion de «Abiertas» (AAAA-MM-DD; vacio = sin limite). */
function tramo(c: Cuando, entre: { desde: string; hasta: string }): [string, string] {
  const h = hoyIso(), a = h.slice(0, 4);
  return c === "mes" ? [`${h.slice(0, 7)}-01`, ""]
    : c === "3m" ? [mesesAtras(3), ""]
    : c === "6m" ? [mesesAtras(6), ""]
    : c === "ano" ? [`${a}-01-01`, ""]
    : c === "pasado" ? [`${Number(a) - 1}-01-01`, `${Number(a) - 1}-12-31`]
    : c === "mas1" ? ["", mesesAtras(12)]
    : c === "entre" ? [entre.desde, entre.hasta]
    : ["", ""];
}
const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso + "T12:00:00").getTime()) / 86_400_000);
/** Las administraciones y personas que vienen en mayusculas, en minusculas con su inicial: que mande la direccion. */
const MENORES = new Set(["de", "del", "la", "las", "los", "y", "e", "en"]);
const suave = (s: string | null) =>
  s && s === s.toUpperCase()
    ? s
        .toLowerCase()
        .split(/(\s+)/)
        .map((p, i) => (i && MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
        .join("")
        .replace(/\(([a-zñáéíóú])/g, (_, l: string) => "(" + l.toUpperCase())
    : s;

export function ListaAbiertas({
  filas,
  pasos,
  saludo,
  carteras,
}: {
  filas: FilaAbierta[];
  pasos: Paso[];
  saludo: { nombre: string | null; hoy: string };
  carteras: { elegido: string | null; lista: { id: string; nombre: string }[] } | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState<Orden>("nombre");
  const [soloAbiertas, setSoloAbiertas] = useState(false);
  const [punto, setPunto] = useState("");
  const [cuando, setCuando] = useState<Cuando>("");
  const [entre, setEntre] = useState({ desde: "", hasta: "" });
  const [pagina, setPagina] = useState(0);
  // LAS DOS VISTAS (29-oct-2026): la lista, y «Lo que falta para avanzar» (las mismas opps, por de quien depende).
  const [vista, setVista] = useState<"lista" | "avanzar">("lista");

  const ordenDe = useMemo(() => new Map(pasos.map((p, i) => [p.clave, i])), [pasos]);
  const hechaDe = useMemo(() => new Map(pasos.map((p) => [p.clave, p.hecha])), [pasos]);
  const presentes = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) if (f.clave) n.set(f.clave, (n.get(f.clave) ?? 0) + 1);
    return pasos.filter((p) => n.has(p.clave)).map((p) => ({ ...p, n: n.get(p.clave)! }));
  }, [filas, pasos]);

  const vistas = useMemo(() => {
    const t = lim(q.trim());
    const [desde, hasta] = tramo(cuando, entre);
    const xs = filas.filter(
      (f) =>
        (!soloAbiertas || !FIRMADAS.has(f.clave ?? "")) &&
        (!punto || f.clave === punto) &&
        (!desde || (!!f.abierta && f.abierta >= desde)) &&
        (!hasta || (!!f.abierta && f.abierta <= hasta)) &&
        (!t || lim([f.nombre, f.codigo, f.empresa, f.persona, f.quieren].join(" ")).includes(t)),
    );
    const val = (f: FilaAbierta): number | string =>
      orden === "dias" ? -(f.dias ?? -1)
      : orden === "importe" ? -(f.importe ?? -1)
      : orden === "punto" ? (ordenDe.get(f.clave ?? "") ?? 99)
      : orden === "contacto" ? (f.ultimoContacto ?? "0000")
      : orden === "admin" ? lim(f.empresa ?? "~")
      : orden === "recientes" ? -new Date(f.abierta ?? "1970-01-01").getTime()
      : orden === "antiguas" ? new Date(f.abierta ?? "9999-12-31").getTime()
      : lim(f.nombre);
    return xs.sort((a, b) => {
      const x = val(a), y = val(b);
      return x > y ? 1 : x < y ? -1 : lim(a.nombre).localeCompare(lim(b.nombre));
    });
  }, [filas, q, orden, soloAbiertas, punto, cuando, entre, ordenDe]);

  const paginas = Math.max(1, Math.ceil(vistas.length / POR_PAGINA));
  const pag = Math.min(pagina, paginas - 1);
  const enPagina = vistas.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);
  const cambia = <T,>(f: (v: T) => void) => (v: T) => {
    f(v);
    setPagina(0);
  };
  const etiqueta = "flex items-center gap-2 text-[14.5px] font-semibold text-[#f3ecdd]";
  const selector = "rounded-lg border border-white bg-white px-2.5 py-1.5 text-[13.5px] font-medium text-carbon shadow-sm focus:outline-none";
  const chip = "ml-2 whitespace-nowrap rounded-full bg-amber-50 px-2 py-px text-[10px] font-bold uppercase tracking-wide text-amber-700";

  return (
    <>
      {/* UNA LINEA: donde estas, el saludo, lo que viene y (direccion) de quien es la cartera. */}
      <div className="mt-1 flex flex-wrap items-center gap-x-12 gap-y-3">
        <p className="flex items-center gap-2 font-[family-name:var(--letra-menu)] text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#a6dc7e]">
          <span className="h-2 w-2 rounded-full bg-[#a6dc7e]" />
          Área comercial <span className="text-[#f3f4f1]/45">›</span> Oportunidades abiertas
        </p>
        <p className="text-[14px] text-[#f3f4f1]/70">
          {saludo.nombre ? (
            <>
              Hola, <b className="text-[#f3f4f1]">{saludo.nombre}</b>.{" "}
            </>
          ) : (
            "Todos los comerciales. "
          )}
          {saludo.hoy}.
        </p>
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--letra-menu)] text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#f3ecdd]/85">
            Estas son las opps que tienes sobre la mesa <span className="text-[#a6dc7e]">→</span> vamos a moverlas
          </span>
          {/* «Hacer algo con ellas» abre «Lo que falta para avanzar» (29-oct-2026). */}
          <button
            type="button"
            onClick={() => setVista(vista === "lista" ? "avanzar" : "lista")}
            className="flex items-center gap-2 rounded-xl border border-[#a6dc7e]/60 bg-[#3a3e44] px-4 py-2 text-[13.5px] font-bold text-[#a6dc7e] transition hover:border-[#a6dc7e] hover:bg-[#44494f]"
          >
            {vista === "lista" ? "Hacer algo con ellas →" : "← Volver a la lista"}
          </button>
        </div>
        {carteras && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {[{ id: null as string | null, nombre: "Todos" }, ...carteras.lista].map((m) => (
              <Link
                key={m.id ?? "todos"}
                href={`/comercial/abiertas${m.id ? `?c=${m.id}` : ""}`}
                className={
                  "rounded-full border px-3.5 py-1.5 text-sm transition " +
                  (m.id === carteras.elegido ? "border-lima bg-lima font-semibold text-carbon" : "border-white/20 text-[#f3f4f1]/75 hover:border-white/50")
                }
              >
                {m.nombre}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-1.5" role="tablist" aria-label="Cómo verlas">
        {(
          [
            ["lista", `Lista · ${vistas.length}`],
            ["avanzar", "Lo que falta para avanzar"],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={vista === k}
            onClick={() => setVista(k)}
            className={
              "rounded-t-xl px-4 py-2 text-[14px] font-bold transition " +
              (vista === k ? "bg-[#4f6072] text-white" : "bg-white/[0.06] text-[#f3f4f1]/70 hover:bg-white/[0.12] hover:text-white")
            }
          >
            {t}
          </button>
        ))}
      </div>
      <section className="w-full overflow-hidden rounded-2xl rounded-tl-none border border-black/5 bg-white shadow-[0_2px_4px_rgba(0,0,0,.18),0_18px_36px_-18px_rgba(0,0,0,.6)]">
        {/* La franja: buscador, ordenar y, a la derecha, los filtros (se suman). */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-[#4f6072] px-4 py-3">
          <label className="flex w-[290px] max-w-full items-center gap-2 rounded-xl border-2 border-white bg-white px-3 py-1.5 shadow-sm focus-within:border-lima">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-carbon/60">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => cambia(setQ)(e.target.value)}
              aria-label="Buscar"
              placeholder="Buscar dirección, administrador…"
              className="w-full min-w-0 bg-transparent text-[14px] text-carbon outline-none placeholder:text-carbon/55"
            />
          </label>
          <label className={etiqueta}>
            Ordenar por
            <select value={orden} onChange={(e) => cambia(setOrden)(e.target.value as Orden)} className={selector}>
              <option value="nombre">Dirección</option>
              <option value="punto">En qué punto está</option>
              <option value="dias">Más días en este punto</option>
              <option value="contacto">Último contacto más antiguo</option>
              <option value="admin">Administrador</option>
              <option value="importe">Más importe</option>
              <option value="recientes">Apertura: más recientes</option>
              <option value="antiguas">Apertura: más antiguas</option>
            </select>
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="inline-flex rounded-full bg-black/20 p-0.5" role="group" aria-label="Qué opps ver">
              {[false, true].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={soloAbiertas === v}
                  onClick={() => cambia(setSoloAbiertas)(v)}
                  className={
                    "rounded-full px-3.5 py-1 text-[13px] font-semibold transition " +
                    (soloAbiertas === v ? "bg-white text-carbon shadow-sm" : "text-[#f3ecdd]/80 hover:text-white")
                  }
                >
                  {v ? "Ver solo las abiertas" : "Ver todas"}
                </button>
              ))}
            </div>
            <label className={etiqueta}>
              Ver solo
              <select value={punto} onChange={(e) => cambia(setPunto)(e.target.value)} className={selector + " max-w-[250px]"}>
                <option value="">Todos los puntos</option>
                {presentes.map((p) => (
                  <option key={p.clave} value={p.clave}>
                    {p.titulo} ({p.n})
                  </option>
                ))}
              </select>
            </label>
            <label className={etiqueta}>
              Abiertas
              <select value={cuando} onChange={(e) => cambia(setCuando)(e.target.value as Cuando)} className={selector}>
                <option value="">cuando sea</option>
                <option value="mes">este mes</option>
                <option value="3m">últimos 3 meses</option>
                <option value="6m">últimos 6 meses</option>
                <option value="ano">este año</option>
                <option value="pasado">el año pasado</option>
                <option value="mas1">hace más de un año</option>
                <option value="entre">entre fechas…</option>
              </select>
            </label>
            {cuando === "entre" && (
              <span className="flex items-center gap-1.5 text-[13px] text-[#f3ecdd]">
                <input type="date" aria-label="Abiertas desde" value={entre.desde} onChange={(e) => cambia(setEntre)({ ...entre, desde: e.target.value })} className={selector + " py-1"} />
                y
                <input type="date" aria-label="Abiertas hasta" value={entre.hasta} onChange={(e) => cambia(setEntre)({ ...entre, hasta: e.target.value })} className={selector + " py-1"} />
              </span>
            )}
            <p className="whitespace-nowrap text-[14px] font-semibold text-[#f3ecdd]">
              {vistas.length === filas.length ? `${filas.length} opps` : `${vistas.length} de ${filas.length} opps`}
            </p>
          </div>
        </div>

        {vista === "lista" && (
        <>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="whitespace-nowrap border-b border-black/10 bg-[#F3ECDD] text-left text-[11.5px] font-bold uppercase tracking-wide text-carbon/65">
                <th className="px-4 py-2.5">Dirección</th>
                <th className="px-3 py-2.5">Administrador</th>
                <th className="px-3 py-2.5">En qué punto está</th>
                <th className="w-[175px] min-w-[175px] px-3 py-2.5">Días en este punto</th>
                <th className="w-[120px] min-w-[120px] px-3 py-2.5">Últ. contacto</th>
                <th className="w-[150px] min-w-[150px] px-3 py-2.5">Qué quieren</th>
                <th className="w-[110px] min-w-[110px] px-4 py-2.5 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {enPagina.map((f, i) => {
                const hecha = hechaDe.get(f.clave ?? "") ?? false;
                const parada = !hecha && (f.dias ?? 0) > PARADA;
                const sinContacto = !hecha && (!f.ultimoContacto || diasDesde(f.ultimoContacto) > SIN_CONTACTO);
                const admin = [suave(f.persona), suave(f.empresa)].filter(Boolean).join(" · ");
                const href = `/comercial/oportunidades/${f.id}`;
                return (
                  <tr key={f.id} title={f.codigo ?? undefined} onClick={() => router.push(href)} className={"cursor-pointer border-b border-black/5 transition hover:bg-lima-soft " + (i % 2 ? "bg-[#f8f9fa]" : "")}>
                    <td className="max-w-[470px] px-4 py-2">
                      <div className="flex items-center">
                        <Link href={href} className="truncate text-[15.5px] font-bold text-carbon hover:underline">
                          {f.nombre}
                        </Link>
                        {f.aviso && <span className={chip}>{f.aviso}</span>}
                        {f.sinComunidad && <span className={chip}>sin dar de alta</span>}
                      </div>
                      {/* CUANDO SE ABRIO (Monica, 28-oct-2026), bajo la direccion para no tocar las columnas de su maqueta. */}
                      {f.abierta && <div className="text-[11.5px] text-carbon/75">abierta el {fechaLarga(f.abierta)}</div>}
                    </td>
                    <td className="max-w-[230px] truncate px-3 py-2 text-carbon/75" title={admin || undefined}>
                      {admin || <span className="text-carbon/35">—</span>}
                    </td>
                    <td className={"max-w-[320px] truncate px-3 py-2 " + (hecha ? "text-lima-dark" : "text-carbon/90")} title={f.texto ?? undefined}>
                      {hecha ? "✓ " : ""}
                      {f.texto ?? <span className="text-carbon/35">sin calcular</span>}
                      {f.masHojas > 0 && <span className="ml-1.5 text-[12px] text-carbon/50">· +{f.masHojas} {f.masHojas === 1 ? "hoja" : "hojas"}</span>}
                    </td>
                    <td className={"whitespace-nowrap px-3 py-2 tabular-nums " + (parada ? "font-semibold text-alerta" : "text-carbon/75")}>
                      {hecha ? <span className="text-lima-dark">✓</span> : f.dias === null ? "—" : `${f.dias} ${f.dias === 1 ? "día" : "días"}${parada ? " parada aquí" : ""}`}
                    </td>
                    <td className={"whitespace-nowrap px-3 py-2 tabular-nums " + (sinContacto ? "font-semibold text-alerta" : "text-carbon/75")}>{fecha(f.ultimoContacto)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {f.quieren ? (
                        <span className="rounded-full border border-lima/60 bg-lima-soft px-2 py-px text-[12px] font-semibold text-lima-dark">{f.quieren}</span>
                      ) : (
                        <span className="text-carbon/35">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums text-carbon/85">
                      {f.importe ? eur(f.importe) : <span className="font-normal text-carbon/35">—</span>}
                    </td>
                  </tr>
                );
              })}
              {!enPagina.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-carbon/60">
                    {q ? `Nada con «${q}».` : "Ninguna con estos filtros."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-hueso px-4 py-2.5 text-[13px] text-carbon/70">
          <button type="button" disabled={pag === 0} onClick={() => setPagina(pag - 1)} className="rounded-full border border-black/15 bg-white px-3.5 py-1 font-semibold text-carbon/75 hover:border-lima disabled:opacity-35">
            ← Anteriores
          </button>
          <span>
            {vistas.length ? pag * POR_PAGINA + 1 : 0}–{Math.min((pag + 1) * POR_PAGINA, vistas.length)} de {vistas.length}
          </span>
          <button type="button" disabled={pag >= paginas - 1} onClick={() => setPagina(pag + 1)} className="rounded-full border border-black/15 bg-white px-3.5 py-1 font-semibold text-carbon/75 hover:border-lima disabled:opacity-35">
            Siguientes →
          </button>
        </div>
        </>
        )}
      </section>
      {vista === "avanzar" && <LoQueFalta filas={vistas} pasos={pasos} />}
    </>
  );
}
