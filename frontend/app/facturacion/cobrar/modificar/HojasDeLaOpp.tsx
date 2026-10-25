"use client";

import { useState } from "react";
import { cuentasDeHito, TEXTO_HITO, type Documento, type Hito } from "../../../../lib/cobrosCalculo";
import { Modificar } from "./Modificar";

// LAS HOJAS DE UNA DIRECCION (maqueta validada, pantalla 2): "salen TODAS sus
// hojas firmadas vigentes; cada linea con su concepto e importe y debajo sus
// hitos, en vertical y con sangria; cada hito con «+ modificar», que abre la
// ventana". En «Buscar direccion» es lo mismo, sin modificar. Debajo de cada
// hito, sus notas de facturacion.

const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dia = (iso: string | null) => (iso ? `${Number(iso.slice(8, 10))} ${MES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : null);

export function HojasDeLaOpp({ oppId, documentos, modificar }: { oppId: string; documentos: Documento[]; modificar: boolean }) {
  const [abierto, setAbierto] = useState<Hito | null>(null);
  return (
    <>
      {/* REGLA 8 (Monica, 18-oct): cada hoja mide lo que su tabla; el % y el
          importe van pegados al texto del hito, no al borde de la pantalla. */}
      {documentos.map((d) => (
        <section key={d.id} className="mt-5 w-fit max-w-full overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/10 bg-[#fafbf9] px-5 py-3 text-[14px] text-carbon/75">
            <b className="text-carbon">{d.codigo ?? "—"}</b>
            {d.titulo && ` · ${d.titulo}`}
            {d.fecha && ` · firmada el ${dia(d.fecha)}`}
            {d.responsable && ` · ${d.responsable}`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px] tabular-nums">
              {d.lineas.map((l, i) => (
                <tbody key={l.id} className="border-t border-black/[.07] first:border-0">
                  <tr className="align-baseline">
                    <td className="pl-5 pt-3 text-right text-[13px] font-bold text-carbon/40">{i + 1}</td>
                    <td colSpan={2} className="max-w-[560px] pl-3 pt-3 text-[14.5px] font-semibold text-carbon">
                      {l.descripcion}
                    </td>
                    <td className="whitespace-nowrap pl-5 pt-3 text-right text-[14px] font-bold text-carbon">
                      {l.esPorcentaje ? `${l.porcentaje ?? ""} % a éxito` : l.importe != null ? <>{eur(l.importe)} € <span className="text-[12px] font-semibold text-carbon/55">+ IVA</span></> : "—"}
                    </td>
                    <td colSpan={2} />
                  </tr>
                  {l.hitos.map((h) => (
                    <FilaHito key={h.id} h={h} modificar={modificar} abrir={setAbierto} />
                  ))}
                  <tr>
                    <td colSpan={6} className="pb-2" />
                  </tr>
                </tbody>
              ))}
            </table>
          </div>
        </section>
      ))}
      {abierto && <Modificar oppId={oppId} hito={abierto} cerrar={() => setAbierto(null)} />}
    </>
  );
}

function FilaHito({ h, modificar, abrir, sub }: { h: Hito; modificar: boolean; abrir: (h: Hito) => void; sub?: boolean }) {
  const c = cuentasDeHito(h);
  const estado =
    h.estado === "anulado" ? "anulado"
    : h.enPausaDesde ? "en pausa"
    : c.cobrado > 0 && c.cobrado >= c.importe - 1 ? "cobrado"
    : c.facturado > 0 ? (c.facturado >= c.importe - 1 ? "facturado" : "facturado en parte")
    : null;
  // Se puede modificar lo que no esta facturado; un hito fraccionado, en sus subhitos.
  const puede = modificar && !h.subhitos.length && !c.facturado && h.estado !== "anulado" && h.estado !== "completado";
  // Un hito A EXITO abierto (25-oct-2026): siempre se le puede añadir una concesion o cerrarlo, aunque tenga partes.
  const exitoAbierto = !sub && h.importe == null && !h.cerrado && h.estado !== "anulado";
  return (
    <>
      <tr className="align-baseline">
        <td />
        <td className="max-w-[560px] py-1 pl-3 text-carbon/80">
          <div className={sub ? "ml-3 border-l-2 border-black/5 pl-3" : ""}>
            {h.texto ?? TEXTO_HITO[h.tipo] ?? h.tipo}
            {h.notas.length > 0 && (
              <div className="mb-0.5 mt-0.5 border-l-2 border-[#ecdcae] pl-2.5 text-[12px] text-carbon/60">
                {h.notas.map((n, i) => (
                  <div key={i}>
                    {n.fecha && <span className="text-carbon/45">{n.fecha.slice(8, 10)}/{n.fecha.slice(5, 7)}/{n.fecha.slice(2, 4)} · </span>}
                    {n.texto}
                    {n.autor && <span className="text-carbon/40"> · {n.autor}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </td>
        <td className="whitespace-nowrap py-1 pl-5 text-right text-carbon/55">{h.porcentaje != null ? `${Number(h.porcentaje).toLocaleString("es-ES")} %` : ""}</td>
        <td className="whitespace-nowrap py-1 pl-5 text-right font-semibold text-carbon">{h.importe != null ? `${eur(h.importe)} €` : "a éxito"}</td>
        <td className="whitespace-nowrap py-1 pl-5 text-[12.5px] text-carbon/55">{dia(h.fechaPrevista) ?? "sin fecha"}</td>
        <td className="whitespace-nowrap py-1 pl-5 pr-5">
          {exitoAbierto && modificar ? (
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-[#e8eef5] px-2 py-0.5 text-[11.5px] font-bold text-[#5b7fa6]">
                abierto{h.subhitos.length ? ` · ${h.subhitos.length} ${h.subhitos.length === 1 ? "concesión" : "concesiones"}` : ""}
              </span>
              <button type="button" onClick={() => abrir(h)} className="text-[13px] font-semibold text-lima-dark hover:underline">
                + concesión
              </button>
            </span>
          ) : h.cerrado && h.importe == null && !sub ? (
            <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-[11.5px] font-bold text-carbon/55">cerrado</span>
          ) : estado ? (
            <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${estado === "en pausa" ? "bg-[#fbefd0] text-[#875f07]" : estado === "anulado" ? "bg-black/[.06] text-carbon/50" : "bg-[#e3f1d6] text-[#2f5d14]"}`}>
              {estado}
            </span>
          ) : puede ? (
            <button type="button" onClick={() => abrir(h)} className="text-[13px] font-semibold text-lima-dark hover:underline">
              + modificar
            </button>
          ) : null}
        </td>
      </tr>
      {h.subhitos.map((s) => (
        <FilaHito key={s.id} h={s} modificar={modificar} abrir={abrir} sub />
      ))}
    </>
  );
}
