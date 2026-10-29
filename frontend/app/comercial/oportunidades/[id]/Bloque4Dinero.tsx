import Link from "next/link";
import type { ReactNode } from "react";
import type { Dinero } from "../../../../lib/bloque4";
import { EjeCobros } from "./EjeCobros";

// BLOQUE 4 · EL DINERO Y EL ENCARGO HASTA EL FINAL (Monica, 29-oct-2026, su maqueta «me encanta»:
// docs/figma/bloque4-rastro-dinero.html). Como los bloques 1-3: menu con sus grupos y su linea de color, el contenido
// en gris. Arriba, en lugar de la tira del 3D, «¿que hay de lo mio?»: lo que se le dice a la comunidad si llama.

export const VISTAS_BLOQUE4 = ["cobros", "hojas", "comision", "marcha", "subvenciones"] as const;
export type VistaBloque4 = (typeof VISTAS_BLOQUE4)[number];

const CAJA = "rounded-[12px] border border-[#5d646c] bg-white px-4 py-3";
const ROT = "text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65";
const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const dia = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

const GRUPOS: { titulo: string; color: string; items: { v: VistaBloque4; texto: string }[] }[] = [
  { titulo: "Rastro del dinero", color: "#3f8a1c", items: [{ v: "hojas", texto: "Hojas firmadas" }, { v: "cobros", texto: "Los cobros" }, { v: "comision", texto: "Tu comisión" }] },
  { titulo: "El encargo en marcha", color: "#2f6fb3", items: [{ v: "marcha", texto: "Por dónde va" }] },
  { titulo: "Subvenciones", color: "#d4860b", items: [{ v: "subvenciones", texto: "Convocatorias" }] },
];

export function Bloque4Dinero({ id, ver, d, verComision }: { id: string; ver: VistaBloque4 | null; d: Dinero | null; verComision: boolean }) {
  const vista: VistaBloque4 = ver ?? "cobros";
  const href = (v: VistaBloque4) => `/comercial/oportunidades/${id}?bloque=4&ver=${v}`;
  const chip: Partial<Record<VistaBloque4, string>> = { hojas: d ? String(d.hojas.length) : undefined };
  const titulo = (t: string, sub?: ReactNode) => (
    <div className="mb-3">
      <h3 className="text-[18px] font-bold text-carbon">{t}</h3>
      {sub && <p className="mt-0.5 text-[13px] text-carbon/70">{sub}</p>}
    </div>
  );
  const hueco = (t: ReactNode) => <div className="rounded-[12px] border-[1.5px] border-dashed border-[#cfcfcf] bg-[#fafafa] p-6 text-center text-[13px] text-carbon/65">{t}</div>;

  return (
    <section className="grid min-h-[620px] overflow-hidden rounded-[10px] bg-white text-[13px] text-carbon xl:grid-cols-[250px_minmax(0,1fr)]">
      {/* ============================== EL MENU ============================== */}
      <nav className="flex flex-col gap-4 border-b border-[#e6e6e6] bg-[#fafbfc] py-3.5 pr-2 xl:border-b-0 xl:border-r">
        {GRUPOS.map((g) => (
          <div key={g.titulo} className="ml-2.5 border-l-4" style={{ borderColor: g.color }}>
            <div className="px-3 pb-1 pt-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: g.color }}>{g.titulo}</div>
            {g.items
              .filter((it) => it.v !== "comision" || verComision)
              .map((it) => (
                <Link
                  key={it.v}
                  href={href(it.v)}
                  scroll={false}
                  replace
                  className={"flex items-center gap-2 rounded-r-[6px] px-3 py-1.5 transition " + (vista === it.v ? "font-bold" : "hover:bg-[#eef2f6]")}
                  style={vista === it.v ? { background: `color-mix(in srgb, ${g.color} 14%, #fff)` } : undefined}
                >
                  <span className="flex-1 leading-snug">{it.texto}</span>
                  {chip[it.v] && <span className="rounded-[20px] bg-[#dbe5ee] px-2 py-px text-[11px] font-bold text-[#104269]">{chip[it.v]}</span>}
                </Link>
              ))}
          </div>
        ))}
      </nav>

      {/* ============================== EL CONTENIDO ============================== */}
      <div className="min-w-0 bg-[#f1f3f5]">
        {/* ¿QUE HAY DE LO MIO? En lugar de la tira del 3D (Monica, 29-oct-2026: «es tan PERFECTO»). Sale de los datos. */}
        <div className="bg-[#575d64] px-4 py-2.5">
          <div className="rounded-[10px] border-[0.5px] border-[#efe4c8] bg-[#fffcf4] px-4 py-2.5">
            <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#6b2135]">Si llaman · «¿qué hay de lo mío?»</div>
            {d ? (
              <>
                <p className="mt-0.5 text-[14.5px] font-semibold leading-snug">{d.frase}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px]">
                  {d.deEllos.length ? (
                    d.deEllos.map((x, i) => <span key={i} className="font-semibold text-[#7a4a00]">⚠ De ellos: {x}</span>)
                  ) : (
                    <span className="text-[#7a4a00]">De ellos: nada pendiente ahora mismo.</span>
                  )}
                  {d.proximo && <span className="text-carbon/75">Próximo cobro: <b>{d.proximo}</b></span>}
                </div>
              </>
            ) : (
              <p className="mt-0.5 text-[14px] font-semibold text-carbon/70">Todavía no hay ninguna hoja firmada y validada: el dinero empieza aquí cuando la haya.</p>
            )}
          </div>
        </div>

        <div className="px-5 py-4">
          {!d ? (
            hueco(
              <>
                Cuando firmen una hoja de encargo y la valides, aquí se ve su dinero y por dónde va el encargo.{" "}
                <Link href={`/comercial/oportunidades/${id}?bloque=3&ver=resultado`} className="font-semibold text-[#104269] underline-offset-2 hover:underline">
                  Ver el resultado de la negociación
                </Link>
              </>,
            )
          ) : vista === "cobros" ? (
            <div className="flex flex-col gap-3">
              <div className={CAJA}>
                <div className={ROT + " mb-2"}>Qué se cobra en cada punto · y por dónde va el encargo</div>
                <EjeCobros lineas={d.lineas} puntos={d.puntos} />
              </div>
              {verComision && d.comision && <Comision c={d.comision} />}
            </div>
          ) : vista === "hojas" ? (
            <div className="flex flex-col gap-3">
              {titulo("Hojas firmadas", "Desde que el comercial la valida hasta que entra en producción.")}
              {d.hojas.map((h) => (
                <div key={h.id} className={CAJA}>
                  <div className="text-[14px]">
                    <b>{h.que || "Hoja de encargo"}</b> · <span className="tabular-nums">{EUR.format(h.total)} €</span>{" "}
                    <span className="text-carbon/55">{h.codigo}</span>
                  </div>
                  {h.firma && <div className="text-[12px] text-carbon/60">Firmada el {dia(h.firma)}</div>}
                  <div className="mt-2.5 grid gap-px overflow-hidden rounded-[8px] border border-[#d0d5da] bg-[#d0d5da] sm:grid-cols-4">
                    {[
                      { t: "1 · En facturación", q: "el comercial la valida" },
                      { t: "2 · Pedido el cobro", q: "proforma enviada por correo" },
                      { t: "3 · Primera parte cobrada", q: "justificante del banco" },
                      { t: "4 · En producción", q: "la mete la secretaria" },
                    ].map((f, i) => {
                      const x = h.fases[i];
                      const ahora = !x.hecha && (i === 0 || h.fases[i - 1].hecha);
                      return (
                        <div key={i} className={"px-3 py-2 text-[11.5px] " + (x.hecha ? "bg-[#e6f2df]" : ahora ? "bg-[#fdf0d9]" : "bg-[#eef0f2]")}>
                          <b className="block text-[12px]">{f.t}</b>
                          <span className="text-carbon/60">{f.q}</span>
                          {x.hecha && (
                            <span className="block font-semibold">
                              {x.fecha ? dia(x.fecha) : "hecho"}
                              {i === 2 && " · se libera la comisión"}
                            </span>
                          )}
                          {x.nota && <span className="block">{x.nota}</span>}
                        </div>
                      );
                    })}
                  </div>
                  {h.pausa && (
                    <div className="mt-2 rounded-[8px] border border-[#d4860b] bg-[#fdf0d9] px-3 py-1.5 text-[12.5px] text-[#6b4300]">
                      <b>En pausa</b> desde el {dia(h.pausa.desde)}
                      {h.pausa.deEllos && " (por su parte)"}
                      {h.pausa.motivo && `: ${h.pausa.motivo}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : vista === "comision" && verComision ? (
            <div className="flex flex-col gap-3">
              {titulo("Tu comisión", "Hito a hito: se libera cuando se cobra, en proporción a lo cobrado.")}
              {d.comision ? <Comision c={d.comision} /> : hueco("Esta opp no tiene comercial responsable.")}
              {d.comision && (
                <div className={CAJA}>
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="text-left text-[11px] text-carbon/55">
                        <th className="py-1 font-semibold">Qué se cobra</th><th className="font-semibold">Cuándo</th>
                        <th className="text-right font-semibold">Importe</th><th className="text-right font-semibold">Tu parte</th><th className="pl-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.lineas.flatMap((l) =>
                        l.cobros.map((c) => (
                          <tr key={c.id} className="border-t border-[#eceef0]">
                            <td className="py-1.5">{l.que}</td>
                            <td>{d.puntos.find((p) => p.k === c.punto)?.t ?? "—"}</td>
                            <td className="text-right tabular-nums">{c.importe != null ? `${EUR.format(c.importe)} €` : "a éxito"}</td>
                            <td className="text-right tabular-nums">{c.comision != null ? `${EUR.format(c.comision)} €` : "—"}</td>
                            <td className={"pl-3 " + (c.devengada ? "font-bold text-[#3f8a1c]" : "text-carbon/60")}>{c.devengada ? "liberada" : c.importe == null ? "si sale" : "cuando se cobre"}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : vista === "marcha" ? (
            <div className="flex flex-col gap-3">
              {titulo("Por dónde va el encargo", "Lo mínimo para saber por dónde va. Cada área tendrá aquí sus pasos cuando esté en la app.")}
              <div className={CAJA}>
                <ul className="flex flex-col gap-1.5 text-[13px]">
                  <Paso hecho={d.hojas.some((h) => h.fases[0].hecha)} t="Firmada y en facturación" f={d.hojas.map((h) => h.fases[0].fecha).filter(Boolean).sort()[0] ?? null} />
                  <Paso hecho={d.hojas.some((h) => h.fases[2].hecha)} t="Primera parte cobrada" f={d.hojas.map((h) => h.fases[2].fecha).filter(Boolean).sort()[0] ?? null} />
                  <Paso hecho={!!d.produccion} t={`En producción${d.produccion ? `: ${d.produccion.areas.join(" · ")}` : ""}`} f={d.produccion?.desde ?? null} />
                  {d.nube && d.nube.necesita !== false && (
                    <>
                      <Paso hecho={!!d.nube.escaneado} t={`Escaneo del edificio${!d.nube.escaneado && d.nube.prevista ? ` (previsto el ${dia(d.nube.prevista)})` : ""}`} f={d.nube.escaneado} />
                      <Paso hecho={!!d.nube.lista} t="Nube de puntos lista" f={d.nube.lista} />
                    </>
                  )}
                  {d.puntos.map((p) => (
                    <Paso key={p.k} hecho={p.estado === "hecho"} ahora={p.estado === "ahora"} t={p.estado === "hecho" ? p.hecho : p.t} f={null} />
                  ))}
                </ul>
              </div>
              <div className="rounded-[12px] border-[1.5px] border-dashed border-[#cfcfcf] bg-[#fafafa] px-4 py-3 text-[12.5px] text-carbon/65">
                Lo que vendrá de las áreas: proyecto asignado · proyecto terminado · visado · licencia pedida (declaración responsable o licencia, por el
                Ayuntamiento o por ECU) · licencia concedida · obra iniciada · obra acabada.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {titulo("Subvenciones", "Una línea por cada convocatoria a la que se presente.")}
              <div className={CAJA + " opacity-70"}>
                <div className="flex flex-wrap gap-1.5">
                  {["Abierta", "Documentación en preparación", "Presentada", "Requerido", "Respondido", "Salen las listas", "Concedida · cuándo", "Denegada · por qué"].map((x) => (
                    <span key={x} className="rounded-full border border-dashed border-[#b9bfc5] bg-white px-2.5 py-0.5 text-[11.5px] text-carbon/65">{x}</span>
                  ))}
                </div>
                <p className="mt-2 text-carbon/60">Todavía no se siguen las convocatorias en la app: aquí irán cuando estén.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Comision({ c }: { c: NonNullable<Dinero["comision"]> }) {
  return (
    <div className="rounded-[12px] border-[1.5px] border-[#3f8a1c] px-4 py-3" style={{ background: "linear-gradient(100deg, #e6f2df 0%, #ffffff 70%)" }}>
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#3f8a1c]">Solo para ti · no se lo cuentes a la comunidad</div>
      <div className="mt-0.5 text-[12.5px]">
        Comisión de {c.comercial}: {c.pct != null ? `${c.pct.toLocaleString("es-ES")} %` : "sin % apuntado"} de lo que se cobra, sin la comisión del administrador.
      </div>
      {c.fuera && <div className="mt-1 text-[12.5px] font-semibold text-[#7a4a00]">{c.fuera}</div>}
      <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[#cfe3c4] bg-white px-3 py-2">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Te toca en total</span>
          <b className="block text-[18px] tabular-nums">{EUR.format(c.suya)} €</b>
          <span className="text-[11px] text-carbon/55">+ lo «a éxito», si sale</span>
        </div>
        <div className="rounded-[10px] border border-[#cfe3c4] bg-white px-3 py-2">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Ya liberada</span>
          <b className="block text-[18px] tabular-nums text-[#3f8a1c]">{EUR.format(c.devengada)} €</b>
          <span className="text-[11px] text-carbon/55">de {EUR.format(c.cobrado)} € cobrados</span>
        </div>
        <div className="rounded-[10px] border border-[#cfe3c4] bg-white px-3 py-2">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-carbon/65">Te falta</span>
          <b className="block text-[18px] tabular-nums">{EUR.format(c.falta)} €</b>
          <span className="text-[11px] text-carbon/55">según se vaya cobrando</span>
        </div>
      </div>
    </div>
  );
}

function Paso({ hecho, ahora, t, f }: { hecho: boolean; ahora?: boolean; t: string; f: string | null }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={"h-3.5 w-3.5 shrink-0 rounded-full " + (hecho ? "bg-[#2f6fb3]" : ahora ? "border-[3px] border-[#d4860b] bg-white" : "border-2 border-[#9aa0a6] bg-white")} />
      <span className={hecho || ahora ? "font-semibold" : "text-carbon/55"}>{t}</span>
      {f && <span className="text-carbon/55">· {dia(f)}</span>}
    </li>
  );
}
