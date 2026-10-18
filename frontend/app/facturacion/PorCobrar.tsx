"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FilaPorCobrar } from "../../lib/cobros";
import { TEXTO_DOCUMENTO, TEXTO_HITO } from "../../lib/cobrosCalculo";

// LO QUE QUEDA POR COBRAR. Por defecto, solo las oportunidades con algo por
// facturar o por cobrar, y sin las firmadas antes de 2025 que no tienen ninguna
// factura cargada (lo facturado entonces no esta en la app: saldrian como
// "todo por facturar" sin serlo).

const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const eur = (n: number) => (n ? `${EUR.format(n)} €` : "—");
const fecha = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function PorCobrar({ filas }: { filas: FilaPorCobrar[] }) {
  const [buscar, setBuscar] = useState("");
  const [todas, setTodas] = useState(false);
  const [antiguas, setAntiguas] = useState(false);
  const hoyIso = new Date().toISOString().slice(0, 10);

  const vistas = useMemo(() => {
    const q = sinTildes(buscar.trim());
    return filas
      .filter((f) => todas || f.porFacturar > 0 || f.pendienteCobro > 0 || f.enPausa > 0 || (antiguas && f.previo > 0))
      .filter((f) => antiguas || !f.antiguo)
      .filter((f) => !q || sinTildes(`${f.codigo ?? ""} ${f.nombre} ${f.documentos.map((d) => d.codigo).join(" ")}`).includes(q))
      .sort((a, b) => (a.proximo?.fecha ?? "9999").localeCompare(b.proximo?.fecha ?? "9999") || b.porFacturar - a.porFacturar);
  }, [filas, buscar, todas, antiguas]);

  const tot = vistas.reduce(
    (a, f) => ({ porFacturar: a.porFacturar + f.porFacturar, pendienteCobro: a.pendienteCobro + f.pendienteCobro, enPausa: a.enPausa + f.enPausa, previo: a.previo + f.previo }),
    { porFacturar: 0, pendienteCobro: 0, enPausa: 0, previo: 0 },
  );

  // REGLA 8 (Monica, 18-oct): la tabla mide lo que sus columnas; las cajas de
  // arriba, el ancho de la tabla y con el texto centrado.
  return (
    <div className="w-fit max-w-full">
      <div className="mt-4 grid w-0 min-w-full gap-3 sm:grid-cols-4">
        <Cifra titulo="Por facturar" valor={tot.porFacturar} />
        <Cifra titulo="Facturado sin cobrar" valor={tot.pendienteCobro} />
        <Cifra titulo="En pausa" valor={tot.enPausa} apagada />
        <Cifra titulo="De antes de 2025, sin facturas cargadas" valor={tot.previo} apagada />
      </div>

      <div className="mt-4 flex w-0 min-w-full flex-wrap items-center gap-x-5 gap-y-2">
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Busca la dirección, la oportunidad o la hoja…"
          className="w-full max-w-[420px] rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm placeholder:text-carbon/55 focus:border-lima focus:outline-none"
        />
        <label className="flex items-center gap-2 text-[13px] text-carbon/75">
          <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} className="accent-[#7a9a01]" />
          Ver también las que ya están al día
        </label>
        <label className="flex items-center gap-2 text-[13px] text-carbon/75" title="Firmadas antes de 2025 y sin ninguna factura cargada: lo facturado entonces no está en la app.">
          <input type="checkbox" checked={antiguas} onChange={(e) => setAntiguas(e.target.checked)} className="accent-[#7a9a01]" />
          Incluir las anteriores a 2025 sin facturas cargadas
        </label>
        <span className="ml-auto text-[12.5px] text-carbon/65">{vistas.length} oportunidades</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm">
        <table className="text-left text-[13px]">
          <thead className="bg-[#f1f1ee] text-[10.5px] font-bold uppercase tracking-wide text-carbon/70">
            <tr>
              <th className="px-3 py-2">Oportunidad</th>
              <th className="whitespace-nowrap px-3 py-2">Documentos firmados</th>
              <th className="px-3 py-2 text-right">Firmado</th>
              <th className="px-3 py-2 text-right">Facturado</th>
              <th className="px-3 py-2 text-right">Cobrado</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">Por facturar</th>
              <th className="px-3 py-2">Próximo hito</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {vistas.map((f) => {
              const vencido = f.proximo?.fecha && f.proximo.fecha < hoyIso;
              return (
                <tr key={f.oppId} className="hover:bg-lima-soft/40">
                  <td className="min-w-[200px] max-w-[290px] px-3 py-2">
                    <Link href={`/facturacion/${f.oppId}`} className="font-semibold text-carbon hover:underline">
                      {f.nombre}
                    </Link>
                    <div className="text-[11.5px] text-carbon/65">{f.codigo}</div>
                  </td>
                  <td className="max-w-[170px] px-3 py-2 text-[12px] text-carbon/75">
                    {f.documentos.map((d, i) => (
                      <span key={i} className="block">
                        {d.tipo !== "hoja_encargo" && <b className="text-ajeno">{TEXTO_DOCUMENTO[d.tipo]} </b>}
                        {d.codigo}
                      </span>
                    ))}
                    {f.antiguo && <span className="block text-amber-800/80">anterior a 2025: sus facturas no están cargadas</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{eur(f.firmado)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{eur(f.facturado)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {eur(f.cobrado)}
                    {f.pendienteCobro > 0 && <div className="text-[11px] text-amber-800/80">{eur(f.pendienteCobro)} sin cobrar</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                    {eur(f.porFacturar)}
                    {f.enPausa > 0 && <div className="text-[11px] font-normal text-carbon/60">{eur(f.enPausa)} en pausa</div>}
                    {f.aExito > 0 && <div className="text-[11px] font-normal text-carbon/60">+ {f.aExito} a éxito</div>}
                    {f.previo > 0 && <div className="text-[11px] font-normal text-amber-800/80" title="Documentos firmados antes de 2025: sus facturas no están cargadas">+ {eur(f.previo)} de antes de 2025</div>}
                  </td>
                  <td className="min-w-[180px] max-w-[250px] px-3 py-2 text-[12.5px]">
                    {f.proximo ? (
                      <>
                        <span className={`whitespace-nowrap ${vencido ? "font-semibold text-alerta" : ""}`}>{f.proximo.fecha ? fecha(f.proximo.fecha) : "sin fecha"}</span>
                        <span className="text-carbon/70"> · {TEXTO_HITO[f.proximo.tipo] ?? f.proximo.tipo} · {eur(f.proximo.importe)}</span>
                      </>
                    ) : (
                      <span className="text-carbon/55">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {vistas.length === 0 && <p className="px-4 py-8 text-center text-carbon/60">Nada que cobrar con estos filtros.</p>}
      </div>
    </div>
  );
}

function Cifra({ titulo, valor, apagada }: { titulo: string; valor: number; apagada?: boolean }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-center shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">{titulo}</div>
      <div className={"mt-0.5 text-2xl font-bold tabular-nums " + (apagada ? "text-carbon/60" : "text-carbon")}>{EUR.format(valor)} €</div>
    </div>
  );
}
