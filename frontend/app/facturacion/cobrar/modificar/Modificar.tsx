"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TEXTO_HITO, type Hito } from "../../../../lib/cobrosCalculo";
import { accionCambiarHito, accionCerrarExito, accionConcesion, accionFraccionar } from "../../acciones";

// LA VENTANA DE «+ MODIFICAR» (maqueta validada): Modificar fecha · Modificar
// importe · Dividir en subhitos (en 2, 3, 6 pagos o a mano, mes a mes). Y
// siempre "De donde viene el cambio (obligatorio)": queda en sus notas de
// facturacion ("Me llama el administrador: no tienen fondos y van a hacer una
// derrama...").

// Y, en un hito A EXITO (25-oct-2026): «Añadir concesion» (cada convocatoria concedida es una parte suya, que se
// factura y se cobra) y «Cerrar» (ya no habra mas: a mano, con su motivo).
type Modo = "fecha" | "importe" | "dividir" | "concesion" | "cerrar";
const r2 = (n: number) => Math.round(n * 100) / 100;
const masMeses = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};

export function Modificar({ oppId, hito, cerrar }: { oppId: string; hito: Hito; cerrar: () => void }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("fecha");
  const [fecha, setFecha] = useState(hito.fechaPrevista ?? "");
  const [importe, setImporte] = useState(hito.importe != null ? String(hito.importe) : "");
  const [pagos, setPagos] = useState(2);
  const [primera, setPrimera] = useState(hito.fechaPrevista ?? new Date().toISOString().slice(0, 10));
  const [partes, setPartes] = useState<{ importe: string; fecha: string }[] | null>(null);
  const [motivo, setMotivo] = useState("");
  const aExito = hito.importe == null && !hito.cerrado;
  const [convocatoria, setConvocatoria] = useState("");
  const [concedido, setConcedido] = useState("");
  const [fechaConcesion, setFechaConcesion] = useState(new Date().toISOString().slice(0, 10));
  const numConcedido = Number(concedido.replace(/\./g, "").replace(",", ".")) || 0;
  const aFacturar = hito.porcentaje != null ? Math.round(numConcedido * hito.porcentaje) / 100 : null;
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  // Los plazos: a partes iguales, mes a mes; el ultimo se lleva los centimos.
  const calculadas = useMemo(() => {
    const total = hito.importe ?? 0;
    const cada = Math.floor((total / pagos) * 100) / 100;
    return Array.from({ length: pagos }, (_, k) => ({
      importe: String(k === pagos - 1 ? r2(total - cada * (pagos - 1)) : cada),
      fecha: masMeses(primera, k),
    }));
  }, [hito.importe, pagos, primera]);
  const filas = partes ?? calculadas;
  const suma = r2(filas.reduce((s, p) => s + (Number(p.importe.replace(",", ".")) || 0), 0));

  const guardar = () =>
    empezar(async () => {
      setError(null);
      if (modo !== "concesion" && !motivo.trim()) return setError(modo === "cerrar" ? "Escribe por qué se cierra." : "Escribe de dónde viene el cambio.");
      const r =
        modo === "concesion"
          ? await accionConcesion(oppId, hito.id, { convocatoria, concedido: numConcedido, fecha: fechaConcesion })
          : modo === "cerrar"
            ? await accionCerrarExito(oppId, hito.id, motivo)
            : modo === "fecha"
          ? await accionCambiarHito(oppId, hito.id, { fecha: fecha || null }, motivo)
          : modo === "importe"
            ? await accionCambiarHito(oppId, hito.id, { importe: Number(importe.replace(",", ".")) }, motivo)
            : await accionFraccionar(oppId, hito.id, filas.map((p) => ({ importe: Number(p.importe.replace(",", ".")) || 0, fecha: p.fecha || null })), motivo);
      if (!r.ok) return setError(r.error);
      cerrar();
      router.refresh();
    });

  const pestana = (m: Modo, t: string, no?: boolean) => (
    <button
      type="button"
      disabled={no}
      onClick={() => setModo(m)}
      className={`rounded-lg px-3.5 py-1.5 text-[13.5px] font-semibold disabled:opacity-35 ${modo === m ? "bg-carbon text-white" : "text-carbon/70 hover:bg-black/[.04]"}`}
    >
      {t}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={cerrar}>
      <div className="w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[17px] font-bold text-carbon">{hito.texto ?? TEXTO_HITO[hito.tipo] ?? hito.tipo}</div>
            <div className="text-[13px] text-carbon/55">{hito.importe != null ? `${hito.importe.toLocaleString("es-ES")} € + IVA` : "a éxito"}</div>
          </div>
          <button type="button" onClick={cerrar} className="text-[18px] text-carbon/40 hover:text-carbon" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-xl bg-[#f0f1ee] p-1">
          {pestana("fecha", "Modificar fecha")}
          {pestana("importe", "Modificar importe", hito.importe == null)}
          {pestana("dividir", "Dividir en subhitos", hito.importe == null)}
          {aExito && pestana("concesion", "Añadir concesión")}
          {aExito && pestana("cerrar", "Cerrar")}
        </div>

        <div className="mt-4 text-[13.5px]">
          {modo === "concesion" && (
            <div className="flex flex-col gap-3">
              <div className="text-[12.5px] text-carbon/65">
                Cada convocatoria concedida es un cobro suyo{hito.subhitos.length ? ` (lleva ${hito.subhitos.length})` : ""}. El hito sigue abierto por si llega otra.
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-carbon/55">Convocatoria</span>
                <input value={convocatoria} onChange={(e) => setConvocatoria(e.target.value)} placeholder="«Plan PREE 2025, Comunidad de Madrid»" className="w-full rounded-lg border border-black/15 px-3 py-2" />
              </label>
              <div className="flex flex-wrap items-end gap-4">
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-carbon/55">Lo concedido (€)</span>
                  <input inputMode="decimal" value={concedido} onChange={(e) => setConcedido(e.target.value)} className="w-40 rounded-lg border border-black/15 px-3 py-2 text-right tabular-nums" />
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-carbon/55">Fecha de la concesión</span>
                  <input type="date" value={fechaConcesion} onChange={(e) => setFechaConcesion(e.target.value)} className="rounded-lg border border-black/15 px-3 py-2" />
                </label>
                <div className="pb-2 text-[13px]">
                  {aFacturar != null && numConcedido > 0 ? (
                    <>A facturar: <b>{aFacturar.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</b> + IVA <span className="text-carbon/55">({hito.porcentaje?.toLocaleString("es-ES")} %)</span></>
                  ) : (
                    <span className="text-carbon/55">{hito.porcentaje != null ? `${hito.porcentaje.toLocaleString("es-ES")} % de lo concedido` : ""}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {modo === "cerrar" && (
            <div className="text-[12.5px] text-carbon/65">
              Ya no habrá más concesiones de esta línea{hito.subhitos.length ? `: se queda con las ${hito.subhitos.length} que tiene, y lo que falte por cobrar de ellas sigue su curso` : ": como no tuvo ninguna, se anula"}.
            </div>
          )}
          {modo === "fecha" && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-carbon/55">Nueva fecha prevista</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-lg border border-black/15 px-3 py-2" />
            </label>
          )}
          {modo === "importe" && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-carbon/55">Nuevo importe (€ + IVA)</span>
              <input inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} className="w-40 rounded-lg border border-black/15 px-3 py-2 text-right tabular-nums" />
            </label>
          )}
          {modo === "dividir" && (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-carbon/55">En cuántos pagos</span>
                  <div className="flex gap-1">
                    {[2, 3, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setPagos(n);
                          setPartes(null);
                        }}
                        className={`rounded-lg border px-3 py-1.5 font-semibold ${pagos === n && !partes ? "border-carbon bg-carbon text-white" : "border-black/15"}`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPartes(calculadas.map((p) => ({ ...p })))}
                      className={`rounded-lg border px-3 py-1.5 font-semibold ${partes ? "border-carbon bg-carbon text-white" : "border-black/15"}`}
                    >
                      a mano
                    </button>
                  </div>
                </div>
                <label>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-carbon/55">Primer pago</span>
                  <input
                    type="date"
                    value={primera}
                    onChange={(e) => {
                      setPrimera(e.target.value);
                      setPartes(null);
                    }}
                    className="rounded-lg border border-black/15 px-3 py-1.5"
                  />
                </label>
              </div>
              <table className="mt-3 w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-carbon/50">
                    <th className="w-8 py-1">#</th>
                    <th className="py-1">Fecha</th>
                    <th className="py-1 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((p, k) => (
                    <tr key={k} className="border-t border-black/5">
                      <td className="py-1 text-carbon/45">{k + 1}</td>
                      <td className="py-1">
                        {partes ? (
                          <input type="date" value={p.fecha} onChange={(e) => setPartes(filas.map((x, i) => (i === k ? { ...x, fecha: e.target.value } : x)))} className="rounded border border-black/15 px-2 py-0.5" />
                        ) : (
                          p.fecha
                        )}
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        {partes ? (
                          <input value={p.importe} onChange={(e) => setPartes(filas.map((x, i) => (i === k ? { ...x, importe: e.target.value } : x)))} className="w-28 rounded border border-black/15 px-2 py-0.5 text-right" />
                        ) : (
                          Number(p.importe).toLocaleString("es-ES", { minimumFractionDigits: 2 })
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {partes && (
                <div className="mt-2 flex items-center gap-3 text-[12.5px]">
                  <button type="button" onClick={() => setPartes([...filas, { importe: "0", fecha: masMeses(filas.at(-1)?.fecha || primera, 1) }])} className="font-semibold text-lima-dark hover:underline">
                    + un pago más
                  </button>
                  <span className={Math.abs(suma - (hito.importe ?? 0)) > 0.5 ? "font-semibold text-alerta" : "text-carbon/55"}>
                    suman {suma.toLocaleString("es-ES", { minimumFractionDigits: 2 })} de {(hito.importe ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <label className={`mt-5 block ${modo === "concesion" ? "hidden" : ""}`}>
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-carbon/55">{modo === "cerrar" ? "Por qué se cierra (obligatorio)" : "De dónde viene el cambio (obligatorio)"}</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="«Me llama el administrador: no tienen fondos y van a hacer una derrama…»"
            className="w-full resize-y rounded-lg border border-black/15 px-3 py-2 text-[13.5px] outline-none focus:border-carbon/50"
          />
        </label>
        {error && <p className="mt-2 text-[13px] font-semibold text-alerta">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={cerrar} className="rounded-xl px-4 py-2 text-[14px] font-semibold text-carbon/70 hover:bg-black/[.04]">
            Cancelar
          </button>
          <button type="button" disabled={ocupado} onClick={guardar} className="rounded-xl bg-carbon px-5 py-2 text-[14px] font-bold text-white disabled:opacity-50">
            {ocupado ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
