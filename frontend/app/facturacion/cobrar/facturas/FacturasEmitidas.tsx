"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EstadoCobro, FacturaEmitida } from "../../../../lib/facturasEmitidas";

// COBRAR › FACTURAS EMITIDAS. Con el estilo de «Todo lo contratado» de la maqueta
// (docs/figma/area-dinero-v1.html): tres cifras arriba, filtros en pastillas y
// una tabla de una linea por factura. La columna que importa: DONDE VA, a que
// hito de que hoja. Pinchando la fila se ven sus notas de facturacion.

// "always": en español, sin el, los miles de cuatro cifras no llevan punto (3850).
const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);
const eur0 = (n: number) => Math.round(n).toLocaleString("es-ES", { useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const fecha = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");
const limpio = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// COBRADO = JUSTIFICANTE SUBIDO (Monica, 12-oct-2026). El estado sale de los
// justificantes (tabla cobros), no de lo que dice Factusol.
const ESTADO: Record<EstadoCobro, { t: string; c: string }> = {
  cobrada: { t: "cobrada", c: "bg-[#e3f1d6] text-[#2f5d14]" },
  parcial: { t: "cobrada en parte", c: "bg-[#fbefd0] text-[#875f07]" },
  devuelta: { t: "devuelta", c: "bg-[#f6dfdd] text-alerta" },
  sin_justificante: { t: "sin justificante", c: "bg-[#fbefd0] text-[#875f07]" },
  cobrada_factura: { t: "cobrada (por la factura)", c: "bg-[#eef5e8] text-[#4d6b3a]" },
  anulada: { t: "—", c: "text-carbon/40" },
};
const TIPO_COBRO: Record<string, string> = {
  cargo_en_cuenta: "cargo en cuenta", transferencia: "transferencia", confirming: "confirming", aviso_de_pago: "aviso de pago",
  devolucion: "devolución", otro: "cobro",
};

export type Filtro = "todas" | "sin-justificante" | "devueltas" | "sin-casar" | "abonos";

export function FacturasEmitidas({
  facturas, anio, anios, titulo = "Facturas emitidas", filtroInicial = "todas", ruta = "/facturacion/cobrar/facturas",
}: {
  facturas: FacturaEmitida[]; anio: number | null; anios: number[]; titulo?: string; filtroInicial?: Filtro; ruta?: string;
}) {
  const [empresa, setEmpresa] = useState<"las-dos" | "accesalia" | "daniel">("las-dos");
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const [q, setQ] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);

  const deEmpresa = facturas.filter((f) => empresa === "las-dos" || f.empresa === empresa);
  // Las cifras, CON IVA: lo cobrado sale de los justificantes, que llevan el IVA.
  const vivas = deEmpresa.filter((f) => f.estadoCobro !== "anulada");
  const emitido = vivas.reduce((s, f) => s + f.total, 0);
  // Hasta 2023, la factura da por cobrado: suma su total.
  const cobrado = vivas.reduce((s, f) => s + (f.estadoCobro === "cobrada_factura" ? f.total : Math.min(f.cobrado, f.total)), 0);
  const sinJustificante = vivas.filter((f) => f.estadoCobro === "sin_justificante");
  const devueltas = vivas.filter((f) => f.estadoCobro === "devuelta");
  const sinCasar = vivas.filter((f) => f.sinCasar > 0.5);

  const lista = useMemo(() => {
    const t = limpio(q.trim());
    return deEmpresa.filter((f) => {
      if (filtro === "sin-justificante" && f.estadoCobro !== "sin_justificante") return false;
      if (filtro === "devueltas" && f.estadoCobro !== "devuelta") return false;
      if (filtro === "sin-casar" && !(f.sinCasar > 0.5)) return false;
      if (filtro === "abonos" && f.tipo !== "abono") return false;
      if (!t) return true;
      return limpio([f.direccion, f.pagador, f.referencia, f.numero, ...f.donde.map((d) => d.hoja ?? "")].join(" ")).includes(t);
    });
  }, [deEmpresa, filtro, q]);

  const pastilla = (on: boolean) =>
    `rounded-full border px-3 py-1 text-[12.5px] font-semibold transition ${on ? "border-carbon bg-carbon text-white" : "border-black/10 bg-white text-carbon/75 hover:border-carbon/40"}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-carbon">{titulo}</h1>
          <p className="mt-1 text-[14.5px] text-carbon/65">
            Accesalia y Daniel de Soto · {anio ?? "todos los años"} · de Factusol, con su PDF, a qué hito de qué hoja va cada una y su justificante de cobro
          </p>
        </div>
        <div className="flex gap-1.5">
          {anios.map((a) => (
            <Link key={a} href={`${ruta}?anio=${a}`} className={pastilla(a === anio)}>
              {a}
            </Link>
          ))}
        </div>
      </div>

      {/* LAS TRES CIFRAS, como en «Todo lo contratado», con IVA: cobrado = justificante subido. */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Cifra titulo="Emitido" valor={eur0(emitido)} sub={`${vivas.length} facturas · con IVA`} />
        <Cifra titulo={anio != null && anio < 2024 ? "Cobrado (lo da la factura)" : "Cobrado, con justificante"} valor={eur0(cobrado)} sub={`${emitido ? Math.round((100 * cobrado) / emitido) : 0} % de lo emitido`} />
        <Cifra
          titulo="Sin justificante de cobro"
          valor={eur0(sinJustificante.reduce((s, f) => s + f.total, 0))}
          sub={`${sinJustificante.length} facturas${devueltas.length ? ` · ${devueltas.length} devueltas` : ""}`}
          rojo={sinJustificante.length + devueltas.length > 0}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(
          [
            ["todas", `Todas · ${deEmpresa.length}`],
            ["sin-justificante", `Sin justificante · ${sinJustificante.length}`],
            ["devueltas", `Devueltas · ${devueltas.length}`],
            ["sin-casar", `Sin casar con su hito · ${sinCasar.length}`],
            ["abonos", `Abonos · ${deEmpresa.filter((f) => f.tipo === "abono").length}`],
          ] as [Filtro, string][]
        ).map(([k, t]) => (
          <button key={k} type="button" onClick={() => setFiltro(k)} className={pastilla(filtro === k)}>
            {t}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-black/10" />
        {(
          [
            ["las-dos", "Las dos"],
            ["accesalia", "Accesalia"],
            ["daniel", "Daniel de Soto"],
          ] as const
        ).map(([k, t]) => (
          <button key={k} type="button" onClick={() => setEmpresa(k)} className={pastilla(empresa === k)}>
            {t}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar dirección, número, hoja…"
          className="ml-auto w-[280px] rounded-xl border border-black/15 bg-white px-3 py-1.5 text-[13.5px] outline-none focus:border-carbon/50"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="grid grid-cols-[70px_80px_minmax(0,1.1fr)_minmax(0,1.9fr)_100px_110px_44px] gap-x-3 border-b border-black/10 px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-wide text-carbon/50">
          <span>Fecha</span>
          <span>Número</span>
          <span>Dirección</span>
          <span>Dónde va</span>
          <span className="text-right">Base</span>
          <span>Estado</span>
          <span>PDF</span>
        </div>
        {lista.length === 0 && <div className="px-5 py-8 text-center text-[13.5px] text-carbon/55">Ninguna factura con ese filtro.</div>}
        {lista.map((f) => {
          const on = abierta === f.id;
          const e = ESTADO[f.estadoCobro];
          return (
            <div key={f.id} className="border-b border-black/15 last:border-0">
              <div
                onClick={() => setAbierta(on ? null : f.id)}
                className={`grid cursor-pointer grid-cols-[70px_80px_minmax(0,1.1fr)_minmax(0,1.9fr)_100px_110px_44px] items-baseline gap-x-3 px-4 py-2.5 text-[13.5px] ${on ? "bg-[#f3f9ec]" : "hover:bg-[#fafbf9]"} ${f.estadoCobro === "anulada" ? "opacity-55" : ""}`}
              >
                <span className="tabular-nums text-carbon/70">{fecha(f.fecha)}</span>
                <span className="tabular-nums text-carbon/80">
                  {f.numero}
                  {f.empresa === "daniel" && <span className="ml-1 text-[11px] text-carbon/45">D</span>}
                </span>
                <span className="min-w-0 truncate font-semibold text-carbon" title={f.pagador ?? undefined}>
                  {f.oppId ? (
                    <Link href={`/facturacion/${f.oppId}?desde=facturas`} onClick={(ev) => ev.stopPropagation()} className="hover:underline">
                      {f.direccion}
                    </Link>
                  ) : (
                    f.direccion
                  )}
                </span>
                <span className="min-w-0 text-carbon/80">
                  {f.tipo === "abono" ? (
                    <span className="text-carbon/55">Abono{f.referencia ? ` · ${f.referencia}` : ""}</span>
                  ) : f.donde.length ? (
                    f.donde.map((d, i) => (
                      <span key={i} className="block truncate">
                        <b className="font-semibold text-carbon">{d.plazo}</b>
                        {d.que && <span className="text-carbon/60"> · {d.que}</span>}
                        {d.hoja && <span className="text-carbon/45"> · {d.hoja}</span>}
                      </span>
                    ))
                  ) : (
                    <span className="text-alerta/85">sin casar con su hito</span>
                  )}
                  {f.donde.length > 0 && f.sinCasar > 0.5 && <span className="block text-[12px] text-alerta/85">{eur(f.sinCasar)} € sin casar</span>}
                </span>
                <span className={`text-right font-semibold tabular-nums ${f.base < 0 ? "text-alerta" : "text-carbon"}`}>{eur(f.base)}</span>
                <span>
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold ${e.c}`}>{e.t}</span>
                  {f.notas.length > 0 && (
                    <span className="ml-1.5 text-[11.5px] font-semibold text-carbon/50" title="Notas de facturación">
                      ✎{f.notas.length}
                    </span>
                  )}
                </span>
                <span>
                  {f.pdf && (
                    <a href={`/facturacion/factura/${f.id}`} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="font-semibold text-lima-dark hover:underline">
                      PDF
                    </a>
                  )}
                </span>
              </div>
              {on && (
                <div className="grid gap-4 bg-[#f7f8f5] px-6 py-4 text-[13px] md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-carbon/50">Lo que dice la factura</div>
                    <div className="text-carbon/80">{f.referencia ?? "—"}</div>
                    <div className="mt-1 text-carbon/55">
                      {f.pagador} · total con IVA {eur(f.total)} € · Factusol la da por {f.estado.replace(/_/g, " ")}
                    </div>
                    <div className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wide text-carbon/50">Justificantes de cobro</div>
                    {f.cobros.length ? (
                      f.cobros.map((c) => (
                        <div key={c.id} className="mb-1">
                          <span className="tabular-nums text-carbon/45">{fecha(c.fecha)} · </span>
                          <span className={c.tipo === "devolucion" ? "font-semibold text-alerta" : "text-carbon/85"}>
                            {TIPO_COBRO[c.tipo] ?? c.tipo} {c.importe == null ? "(importe sin leer)" : `${eur(c.importe)} €`}
                          </span>
                          <a href={`/facturacion/justificante/${c.id}`} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="ml-2 font-semibold text-lima-dark hover:underline">
                            ver
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="text-carbon/45">Ninguno subido.</div>
                    )}
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-carbon/50">Notas de facturación</div>
                    {f.notas.length ? (
                      f.notas.map((n, i) => (
                        <div key={i} className="mb-1.5">
                          <span className="tabular-nums text-carbon/45">{fecha(n.fecha)} · </span>
                          <span className="text-carbon/85">{n.texto}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-carbon/45">Ninguna.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Cifra({ titulo, valor, sub, rojo }: { titulo: string; valor: string; sub: string; rojo?: boolean }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-5 py-4">
      <div className="text-[11.5px] font-bold uppercase tracking-[.12em] text-carbon/55">{titulo}</div>
      <div className={`mt-1.5 text-[30px] font-bold leading-none tabular-nums ${rojo ? "text-alerta" : "text-carbon"}`}>{valor}</div>
      <div className="mt-2 text-[12.5px] text-carbon/55">{sub}</div>
    </div>
  );
}
