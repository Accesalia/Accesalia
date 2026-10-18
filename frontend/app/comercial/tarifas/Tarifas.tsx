"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir } from "../../components/Elegir";
import type { DatosTarifas, Precio, VersionPrecio } from "../../../lib/tarifas";
import { accionAsignar } from "./acciones";
import { EditorTarifas } from "./EditorTarifas";

// LA PANTALLA DE TARIFAS (Monica, 17-oct-2026): SUS TARIFAS TAL CUAL SUS WORD,
// para leer. Cada tarifa con sus tablas "Servicio | Honorarios", los mismos
// textos y el mismo orden; en la casilla de honorarios, los tramos, lo que
// incluye y sus notas. Para cambiar precios, "Modificar tarifas": por bloques
// logicos, con todos los sitios donde esta cada uno (EditorTarifas). Nada de
// tocar sobre el texto, que deja un sitio sin cambiar.

// LOS DOCUMENTOS, de sus Word de tarifas 2026. PRUEBA: si le vale, esto pasa a
// la base para que los textos se cambien desde la pantalla.
type Parte = { bloque: string; tipos: string[] };
type Linea = { servicio: string; partes: Parte[]; nota?: string };
type Documento = { tarifa: string; titulo: string; intro?: string; tablas: { titulo: string; lineas: Linea[] }[] };

const PRY = (...tipos: string[]): Parte => ({ bloque: "REDACCION PROYECTO", tipos });
const SOLO = (bloque: string): Parte => ({ bloque, tipos: [] });
const ASC_PROYECTO = "Proyecto básico y de ejecución, dirección de obra y tramitación de licencias (con derribo)";
const COTA = "Proyecto de bajada a cota cero de ascensores";
const PLAT = "Proyectos de elevadores, plataformas inclinadas o verticales";
const CSS: Linea = { servicio: "Coordinación de Seguridad y Salud (CSS)", partes: [SOLO("CSS")] };
const IEE: Linea = { servicio: "Inspección Técnica del Edificio (IEE)", partes: [SOLO("IEE")], nota: "*podrá variar al alza a partir de 30 viviendas" };
const LEE: Linea = { servicio: "Libro del Edificio Existente (LEE)", partes: [SOLO("LEE")] };
const subvenciones = (incluye: string): Linea => ({
  servicio: "Tramitación de subvenciones para proyectos propios (hasta 2 años después de finalización de obra)",
  partes: [SOLO("DOCUMENTACION TECNICA SUBVENCIONES"), SOLO("TRAMITACION SUBVENCIONES")],
  nota: `*Este % implica que las subvenciones se seguirán presentando, sin necesidad de renovaciones ni de que ello suponga un coste adicional para la CP. ${incluye}`,
});
const SUBV_ACC = subvenciones("El servicio de subvenciones de accesibilidad, siempre que la comunidad no disponga de uno válido, incluye: CEE e IEE.");
const SUBV_SATE = subvenciones("El servicio de subvenciones de eficiencia energética, siempre que la comunidad no disponga de uno válido, incluye: CEE, IEE y LEE.");
const SATE = ["SATE envolvente completa", "SATE fachada"];
const CONVENIO =
  "Convenio de colaboración para la elaboración de presupuestos y documentación técnica. En el marco del presente convenio se contemplan los siguientes servicios profesionales:";

const DOCUMENTOS: Documento[] = [
  {
    tarifa: "Comunidades y pequeñas contratas",
    titulo: "Tarifas 2026 para comunidades de propietarios",
    intro: "Para uso interno. También para particulares y contratas sin convenio.",
    tablas: [
      {
        titulo: "Accesibilidad",
        lineas: [
          { servicio: ASC_PROYECTO, partes: [PRY("Ascensor")] },
          { servicio: COTA, partes: [PRY("Cota cero")], nota: "(sin incluir la CSS)" },
          { servicio: PLAT, partes: [PRY("Plataforma")], nota: "(sin incluir la CSS)" },
          { servicio: "Sustitución de ascensor", partes: [PRY("Sustitución de ascensor")] },
          CSS,
          IEE,
          LEE,
          SUBV_ACC,
        ],
      },
      {
        titulo: "SATE",
        lineas: [
          { servicio: "Proyecto", partes: [PRY(...SATE)] },
          { servicio: "Proyecto de SATE solo en cubierta", partes: [PRY("SATE cubierta")] },
          { servicio: "DF", partes: [{ bloque: "DF", tipos: SATE }], nota: "*lo tenemos en cuenta cuando son más de 30 viviendas" },
          CSS,
          IEE,
          LEE,
          SUBV_SATE,
        ],
      },
    ],
  },
  {
    tarifa: "Ascensoristas",
    titulo: "Información de tarifas 2026 · Convenio de colaboración con empresas contratistas",
    intro: CONVENIO,
    tablas: [{ titulo: "Accesibilidad", lineas: [{ servicio: ASC_PROYECTO, partes: [PRY("Ascensor")] }, { servicio: COTA, partes: [PRY("Cota cero")] }, { servicio: PLAT, partes: [PRY("Plataforma")] }, CSS, IEE, LEE, SUBV_ACC] }],
  },
  {
    tarifa: "Rehabilitadores completos",
    titulo: "Información de tarifas 2026 · Convenio de colaboración con empresas contratistas",
    intro: CONVENIO,
    tablas: [
      { titulo: "Accesibilidad", lineas: [{ servicio: ASC_PROYECTO, partes: [PRY("Ascensor")] }, { servicio: COTA, partes: [PRY("Cota cero")] }, { servicio: PLAT, partes: [PRY("Plataforma")] }, CSS, IEE, LEE, SUBV_ACC] },
      {
        titulo: "SATE",
        lineas: [
          { servicio: "Proyecto", partes: [PRY(...SATE)] },
          { servicio: "DF", partes: [{ bloque: "DF", tipos: SATE }], nota: "*lo tenemos en cuenta cuando son más de 30 viviendas" },
          CSS,
          IEE,
          LEE,
          SUBV_SATE,
        ],
      },
    ],
  },
];

const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const fecha = (iso: string) => iso.split("-").reverse().join("/");
/** Como lo escribe ella: "6.900 € + IVA", "3 % del PEM", "3,5 % del importe concedido (a éxito)". */
const honorario = (v: VersionPrecio) =>
  v.forma === "fijo" ? `${EUR.format(v.importe ?? 0)} € + IVA` : v.forma === "pct_pem" ? `${EUR.format(v.porcentaje ?? 0)} % del PEM` : `${EUR.format(v.porcentaje ?? 0)} % del importe concedido (a éxito)`;
const tramoDe = (p: { desde: number | null; hasta: number | null }) =>
  p.desde == null && p.hasta == null ? "" : p.hasta == null ? `${p.desde} viviendas o más` : `de ${p.desde ?? 0} a ${p.hasta} viviendas`;

const TARJETA = "rounded-2xl border border-[#cfcfcf] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]";
const TITULO = "text-xs font-bold uppercase tracking-[.08em] text-carbon/70";
const BTN_PRIM = "rounded-xl border border-lima bg-lima px-3.5 py-[7px] text-[13px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50";

export function Tarifas({ datos }: { datos: DatosTarifas }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // LEER o MODIFICAR: se lee como sus Word; se modifica por bloques logicos.
  const [modificando, setModificando] = useState(false);

  const bloqueId = (codigo: string) => datos.bloques.find((b) => b.codigo === codigo)?.id ?? "";
  const tipoId = (nombre: string) => datos.tipos.find((t) => t.nombre === nombre)?.id ?? "";
  const nombresDe = (ids: string[]) => ids.map((id) => datos.bloques.find((b) => b.id === id)?.nombre ?? "?");
  const enLista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : xs[0] ?? "");
  const quienes = (tarifaId: string) => datos.contratas.filter((c) => c.tarifaId === tarifaId);
  const sinTarifa = datos.contratas.filter((c) => !c.tarifaId);

  /** Los precios de una parte de una linea, en una tarifa (del primer "que se hace"). */
  const preciosDe = (tarifaId: string, p: Parte) => {
    const b = bloqueId(p.bloque);
    const t = p.tipos[0] ? tipoId(p.tipos[0]) : null;
    return datos.precios
      .filter((x) => x.tarifaId === tarifaId && x.bloqueId === b && (x.tipoId ?? null) === t && (x.vigente || x.proxima))
      .sort((a, c) => (a.desde ?? -1) - (c.desde ?? -1));
  };

  const asignar = (contrataId: string, tarifaId: string | null) =>
    empezar(async () => {
      setError(null);
      const r = await accionAsignar(contrataId, tarifaId);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });

  // ------------------------------------------------- la casilla de honorarios
  const honorarios = (tarifaId: string, l: Linea) => {
    const partes = l.partes.map((parte) => ({ parte, ps: preciosDe(tarifaId, parte) }));
    // Varias partes de un precio cada una (1.980 € + IVA + 3,5 %): en una linea, seguidas.
    const seguidas = partes.length > 1 && partes.every(({ ps }) => ps.length <= 1);
    const cifra = (p: Precio) => (
      <span key={p.clave} className="px-1 text-[13.5px]">
        <b className="font-semibold">{p.vigente ? honorario(p.vigente) : "—"}</b>
        {tramoDe(p) && <span className="ml-2 text-carbon/70">{tramoDe(p)}</span>}
        {p.proxima && <span className="ml-2 text-[11.5px] text-amber-900/80">→ {honorario(p.proxima)} desde el {fecha(p.proxima.vigenteDesde)}</span>}
      </span>
    );
    const sinPrecio = (parte: Parte) => (
      <span key={parte.bloque} className="px-1 text-[13px] text-carbon/40">
        —
      </span>
    );
    // LO QUE INCLUYE, una vez por grupo de tramos que incluye lo mismo; con el
    // rango de viviendas solo si no es igual en todos.
    const incluye = (ps: Precio[]) => {
      const grupos: { ids: string[]; ps: Precio[] }[] = [];
      for (const p of ps) {
        const ids = (p.vigente ?? p.proxima!).incluye;
        const g = grupos.find((x) => x.ids.join() === ids.join());
        if (g) g.ps.push(p);
        else grupos.push({ ids, ps: [p] });
      }
      return grupos
        .filter((g) => g.ids.length)
        .map((g) => {
          const desde = Math.min(...g.ps.map((p) => p.desde ?? 0));
          const hastas = g.ps.map((p) => p.hasta);
          const rango = grupos.length > 1 ? (hastas.includes(null) ? ` (${desde} viviendas o más)` : ` (de ${desde} a ${Math.max(...(hastas as number[]))} viviendas)`) : "";
          return (
            <span key={g.ids.join()} className="px-1 text-[12px] text-lima-dark">
              Aquí está incluida la {enLista(nombresDe(g.ids))}
              {rango}
            </span>
          );
        });
    };
    return (
      <div className="flex flex-col gap-0.5">
        {seguidas ? (
          <div className="flex flex-wrap items-baseline">
            {partes.map(({ parte, ps }, i) => (
              <Fragment key={parte.bloque}>
                {i > 0 && <span className="px-0.5 font-semibold">+</span>}
                {ps[0] ? cifra(ps[0]) : sinPrecio(parte)}
              </Fragment>
            ))}
          </div>
        ) : (
          partes.map(({ parte, ps }, i) => (
            <Fragment key={parte.bloque}>
              {i > 0 && <span className="px-1 font-semibold">+</span>}
              {ps.length === 0 && sinPrecio(parte)}
              {ps.map((p) => cifra(p))}
            </Fragment>
          ))
        )}
        {partes.flatMap(({ ps }) => incluye(ps))}
        {l.nota && <span className="px-1 text-[12px] italic text-carbon/60">{l.nota}</span>}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mt-2.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[25px] font-bold leading-tight text-carbon">Tarifas 2026</h1>
          <p className="mt-1 text-[13px] text-carbon/65">Tus tarifas tal cual. Para cambiar precios, «Modificar tarifas»: por bloques, con todos los sitios donde está cada uno.</p>
        </div>
        {!modificando && (
          <button type="button" className={BTN_PRIM} onClick={() => setModificando(true)}>
            Modificar tarifas
          </button>
        )}
      </div>

      {error && <p className="mt-3 rounded-xl border border-alerta/40 bg-[#fbeeee] px-4 py-2 text-[13px] font-semibold text-alerta">{error}</p>}

      {modificando ? (
        <EditorTarifas datos={datos} alCerrar={() => setModificando(false)} />
      ) : (
        <>
          {DOCUMENTOS.map((d) => {
            const t = datos.tarifas.find((x) => x.nombre === d.tarifa);
            if (!t) return null;
            return (
              <section key={d.tarifa} className={TARJETA + " mt-5"}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[17px] font-bold text-carbon">{d.tarifa}</h2>
                  <span className="text-[12px] text-carbon/60">
                    {t.general ? "Comunidades, particulares y contratas sin convenio" : quienes(t.id).map((c) => c.nombre).join(" · ") || "sin contratas aún"}
                  </span>
                </div>
                <div className="text-[12px] font-semibold uppercase tracking-[.04em] text-carbon/70">{d.titulo}</div>
                {d.intro && <p className="mt-1 text-[12.5px] text-carbon/65">{d.intro}</p>}
                {d.tablas.map((tb) => (
                  <table key={tb.titulo} className="mt-3 w-fit border-collapse border border-black/20 text-[13.5px]">
                    <thead>
                      <tr className="bg-[#f1f1ee]">
                        <th className="max-w-[380px] border border-black/20 px-3 py-1.5 text-left font-bold">Servicio para {tb.titulo}</th>
                        <th className="border border-black/20 px-3 py-1.5 text-left font-bold">Honorarios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tb.lineas.map((l, i) => (
                        <tr key={i} className="align-top">
                          <td className="max-w-[380px] border border-black/20 px-3 py-1.5">{l.servicio}</td>
                          <td className="max-w-[440px] border border-black/20 px-2 py-1.5">{honorarios(t.id, l)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
              </section>
            );
          })}

          {/* A QUIEN SE APLICA CADA TARIFA */}
          <section className={TARJETA + " mt-5"}>
            <div className={TITULO + " mb-2.5"}>A quién se aplica cada tarifa</div>
            <div className="grid gap-4 md:grid-cols-3">
              {datos.tarifas.map((t) => (
                <div key={t.id}>
                  <div className="mb-1 text-[13px] font-bold">{t.nombre}</div>
                  {t.general ? (
                    <p className="text-[12px] text-carbon/70">
                      Comunidades, particulares y toda contrata sin otra tarifa ({sinTarifa.length} {sinTarifa.length === 1 ? "contrata" : "contratas"}).
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {quienes(t.id).map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-2.5 py-0.5 text-[12px] font-semibold">
                            {c.nombre}
                            <button type="button" title="Quitar: pasa a la general" disabled={ocupado} className="text-carbon/45 hover:text-alerta" onClick={() => asignar(c.id, null)}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5">
                        <Elegir
                          id={`asignar-${t.id}`}
                          nombre=""
                          opciones={datos.contratas.filter((c) => c.tarifaId !== t.id).map((c) => ({ valor: c.id, texto: c.nombre, pista: c.tarifaId ? "tiene otra tarifa" : undefined }))}
                          valor=""
                          vacio="+ Añadir contrata…"
                          conPista
                          alElegir={(v) => v && asignar(v, t.id)}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
