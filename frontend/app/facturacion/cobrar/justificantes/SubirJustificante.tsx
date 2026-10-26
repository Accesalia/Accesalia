"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Empresa, PorJustificar } from "../../../../lib/justificantes";
import { accionGuardarJustificante } from "./acciones";

// LA PANTALLA DE LA MAQUETA VALIDADA (docs/figma/subir-justificante.html, 26-oct-2026). Paso a paso:
//   - sin papel: la zona de soltar;
//   - con papel: a la izquierda el papel (fijo al bajar), a la derecha 1) a que facturas corresponde (Accesalia / Daniel,
//     solo los numeros), 2) el cobro (fecha, tipo, lo que entra, ¿gastos?), la cuenta y el veredicto: si cuadra (±1 €),
//     todas completas; si no, completa / parcial una a una. «Al guardar…» dice lo que va a pasar. Nada se apunta antes.
//   - pestaña Pagos parciales: las cobradas en parte, con lo que queda.

const eur = (n: number) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions) + " €";
const leer = (s: string) => {
  const t = s.trim().replace(/\s|€/g, "");
  // «3.430,10» y «1.452» (miles con punto) como se escriben aqui; «3430.10» tambien vale.
  const miles = !t.includes(",") && /^\d{1,3}(\.\d{3})+$/.test(t);
  const n = parseFloat(t.includes(",") || miles ? t.replace(/\./g, "").replace(",", ".") : t);
  return isNaN(n) ? null : n;
};
const fecha = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

const pestanaCls = (on: boolean) =>
  `-mb-px rounded-t-xl border px-4 py-2 text-[14px] font-bold ${on ? "border-black/15 border-b-white bg-white text-carbon" : "border-transparent text-carbon/65 hover:text-carbon"}`;
const campoCls = "w-full rounded-[10px] border border-black/15 bg-white px-2.5 py-1.5 text-[14px] text-carbon tabular-nums focus:border-lima focus:outline-none";
const etiquetaCls = "mb-1 block text-[10.5px] font-extrabold uppercase tracking-wider text-carbon/70";
const tarjetaCls = "rounded-2xl border border-black/15 bg-white p-4";
const tituloCls = "mb-2.5 flex flex-wrap items-baseline gap-2.5 text-[13px] font-extrabold uppercase tracking-wider text-carbon/70";

type Decision = "c" | "p";

export function SubirJustificante({ facturas, tipos }: { facturas: PorJustificar[]; tipos: { v: string; t: string }[] }) {
  const router = useRouter();
  const [pestana, setPestana] = useState<"subir" | "parciales">("subir");
  const [fichero, setFichero] = useState<File | null>(null);
  const [verUrl, setVerUrl] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<Empresa>("accesalia");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [dia, setDia] = useState(hoy());
  const [tipo, setTipo] = useState(tipos[0]?.v ?? "transferencia");
  const [ingresado, setIngresado] = useState("");
  const [hayGasto, setHayGasto] = useState(false);
  const [gastoTxt, setGastoTxt] = useState("");
  const [decision, setDecision] = useState<Record<string, Decision>>({});
  const [parcialTxt, setParcialTxt] = useState<Record<string, string>>({});
  const [encima, setEncima] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok?: string; error?: string } | null>(null);
  const [guardando, empezar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (verUrl) URL.revokeObjectURL(verUrl); }, [verUrl]);

  const porId = useMemo(() => new Map(facturas.map((f) => [f.id, f])), [facturas]);
  const deEmpresa = facturas.filter((f) => f.empresa === empresa);
  const parciales = facturas.filter((f) => f.cobrado > 0);
  const elegidas = [...marcadas].map((id) => porId.get(id)).filter((f): f is PorJustificar => !!f)
    .sort((a, b) => a.numero.localeCompare(b.numero, "es", { numeric: true }));

  function ponerFichero(f: File | null) {
    if (verUrl) URL.revokeObjectURL(verUrl);
    setFichero(f);
    setVerUrl(f ? URL.createObjectURL(f) : null);
    setMensaje(null);
  }
  function empezarDeNuevo() {
    ponerFichero(null);
    setMarcadas(new Set()); setDecision({}); setParcialTxt({});
    setIngresado(""); setGastoTxt(""); setHayGasto(false); setDia(hoy());
  }
  function marcar(id: string) {
    setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setDecision((d) => { const n = { ...d }; delete n[id]; return n; });
  }
  function cambiarEmpresa(e: Empresa) {
    setEmpresa(e);
    // Un papel es de una sola empresa: lo marcado de la otra se suelta.
    setMarcadas((m) => new Set([...m].filter((id) => porId.get(id)?.empresa === e)));
  }

  // LA CUENTA
  const ing = leer(ingresado);
  const gasto = hayGasto ? (leer(gastoTxt) ?? 0) : 0;
  const suma = elegidas.reduce((s, f) => s + f.queda, 0);
  const esperado = suma - gasto;
  const cuadraTodo = ing != null && elegidas.length > 0 && Math.abs(esperado - ing) <= 1;
  const indagar = ing != null && elegidas.length > 0 && !cuadraTodo;
  const reparto = elegidas.map((f) => {
    const parcial = indagar && decision[f.id] === "p";
    return { f, parcial, paga: parcial ? (leer(parcialTxt[f.id] ?? "") ?? 0) : f.queda };
  });
  const sumaReparto = reparto.reduce((s, r) => s + r.paga, 0);
  const falta = ing != null ? ing + gasto - sumaReparto : 0;
  const listo =
    !!fichero && !!dia && ing != null && ing > 0 && elegidas.length > 0 &&
    (cuadraTodo || (Math.abs(falta) <= 1 && reparto.every((r) => !r.parcial || (r.paga > 0 && r.paga < r.f.queda + 1))));

  function guardar() {
    if (!fichero || !listo || ing == null) return;
    const datos = new FormData();
    datos.set("fichero", fichero);
    datos.set("empresa", empresa);
    datos.set("fecha", dia);
    datos.set("tipo", tipo);
    datos.set("ingresado", String(ing));
    datos.set("gasto", String(gasto));
    datos.set("pagos", JSON.stringify(reparto.map((r) => ({ facturaId: r.f.id, importe: Math.round(r.paga * 100) / 100 }))));
    empezar(async () => {
      const r = await accionGuardarJustificante(datos);
      setMensaje(r);
      if (r.ok) { empezarDeNuevo(); setMensaje(r); router.refresh(); }
    });
  }

  const esImagen = fichero?.type.startsWith("image/");

  return (
    <div className="text-carbon">
      <Link href="/facturacion/cobrar/sin-justificante" className="text-sm font-semibold text-carbon/60 hover:text-carbon">← Facturas sin justificante</Link>
      <div className="mt-2.5 border-b border-black/15 pb-3">
        <h1 className="text-[28px] font-bold leading-tight">Subir justificantes de cobro</h1>
        <p className="mt-1 text-[14.5px] text-carbon/70">Sube el papel del banco o del pagador y dile a qué facturas corresponde.</p>
      </div>

      <div className="mt-4 flex gap-1 border-b border-black/15" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === "subir"} className={pestanaCls(pestana === "subir")} onClick={() => setPestana("subir")}>Subir justificante</button>
        <button type="button" role="tab" aria-selected={pestana === "parciales"} className={pestanaCls(pestana === "parciales")} onClick={() => setPestana("parciales")}>
          Pagos parciales <span className="ml-1 font-semibold text-carbon/60">{parciales.length}</span>
        </button>
      </div>

      {mensaje?.ok && <div className="mt-4 rounded-xl border border-[#bfe0a1] bg-[#f1f9e9] px-4 py-2.5 font-semibold text-[#24500c]">{mensaje.ok}</div>}

      {pestana === "subir" && !fichero && (
        <div
          className={`mt-4 rounded-[18px] border-2 border-dashed bg-white px-5 py-11 text-center ${encima ? "border-lima" : "border-black/20"}`}
          onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
          onDragLeave={() => setEncima(false)}
          onDrop={(e) => { e.preventDefault(); setEncima(false); const f = e.dataTransfer.files?.[0]; if (f) ponerFichero(f); }}
        >
          <strong className="mb-1.5 block text-lg">Arrastra aquí el justificante</strong>
          <p className="text-carbon/70">PDF o foto del ingreso, la transferencia, el confirming o el aviso de pago.</p>
          <button type="button" onClick={() => entrada.current?.click()} className="mt-3.5 rounded-xl border border-black/15 bg-white px-4 py-2 font-bold text-carbon/75 hover:border-carbon/40">Elegir fichero</button>
          <input ref={entrada} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => ponerFichero(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {pestana === "subir" && fichero && (
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
          {/* IZQUIERDA: el papel */}
          <div className="rounded-2xl border border-black/15 bg-white p-3 lg:sticky lg:top-3">
            <div className="mb-2.5 flex items-center justify-between gap-2 text-[13px] text-carbon/70">
              <span>Justificante: <b className="break-all text-carbon">{fichero.name}</b></span>
              <button type="button" onClick={empezarDeNuevo} className="shrink-0 rounded-lg border border-black/15 px-3 py-1 text-[12.5px] font-bold text-carbon/70 hover:border-carbon/40">Cambiar papel</button>
            </div>
            {verUrl && (esImagen
              ? <img src={verUrl} alt="El justificante" className="max-h-[75vh] w-full rounded border border-black/10 object-contain" />
              : <iframe src={verUrl} title="El justificante" className="h-[75vh] w-full rounded border border-black/10" />)}
          </div>

          {/* DERECHA */}
          <div className="flex min-w-0 flex-col gap-3.5">
            <div className={tarjetaCls}>
              <h2 className={tituloCls}>
                <span className="text-lima-dark">1</span> ¿A qué facturas corresponde?
                {elegidas.length > 0 && <span className="font-semibold normal-case tracking-normal text-carbon/60">{elegidas.length} marcada{elegidas.length > 1 ? "s" : ""} · {eur(suma)}</span>}
              </h2>
              <div className="mb-3 inline-flex overflow-hidden rounded-xl border border-black/15" role="group" aria-label="Empresa que ha cobrado">
                {(["accesalia", "daniel"] as Empresa[]).map((e, i) => (
                  <button key={e} type="button" aria-pressed={empresa === e} onClick={() => cambiarEmpresa(e)}
                    className={`px-4 py-1.5 font-bold ${i ? "border-l border-black/15" : ""} ${empresa === e ? "bg-carbon text-white" : "text-carbon/70"}`}>
                    {e === "accesalia" ? "Accesalia" : "Daniel"}
                  </button>
                ))}
              </div>
              <div className="grid max-h-[300px] grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-1.5 overflow-auto p-0.5">
                {deEmpresa.map((f) => {
                  const on = marcadas.has(f.id);
                  return (
                    <label key={f.id} title={f.pagador ?? undefined}
                      className={`flex cursor-pointer select-none flex-col rounded-[10px] border px-2.5 py-1.5 ${on ? "border-lima bg-[#e6f3d8] shadow-[inset_0_0_0_1px_#7ac943]" : "border-black/15 bg-white hover:bg-[#f6faf2]"}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => marcar(f.id)} />
                      <b className="text-[14.5px] tabular-nums">{f.numero}</b>
                      <small className={`text-[11px] ${f.cobrado > 0 ? "font-semibold text-[#6e4a06]" : "text-carbon/60"}`}>
                        {f.cobrado > 0 ? `queda ${eur(f.queda)}` : eur(f.total)}
                      </small>
                    </label>
                  );
                })}
                {!deEmpresa.length && <p className="text-carbon/60">No hay facturas de {empresa === "accesalia" ? "Accesalia" : "Daniel"} esperando justificante.</p>}
              </div>
              <p className="mt-2.5 text-[12.5px] text-carbon/60">Facturas sin justificante y cobradas en parte (con lo que queda). Marca todas las que cita el papel.</p>
            </div>

            <div className={tarjetaCls}>
              <h2 className={tituloCls}><span className="text-lima-dark">2</span> El cobro</h2>
              <div className="flex flex-wrap items-end gap-3">
                <div><label htmlFor="j-fecha" className={etiquetaCls}>Fecha del cobro</label><input id="j-fecha" type="date" value={dia} onChange={(e) => setDia(e.target.value)} className={campoCls} /></div>
                <div><label htmlFor="j-tipo" className={etiquetaCls}>Tipo</label>
                  <select id="j-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={campoCls}>
                    {tipos.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
                  </select></div>
                <div><label htmlFor="j-ingresado" className={etiquetaCls}>Entra en el banco</label>
                  <input id="j-ingresado" inputMode="decimal" value={ingresado} onChange={(e) => setIngresado(e.target.value)} className={`${campoCls} w-[140px] text-right`} /></div>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div><span className={etiquetaCls}>¿Gastos por el cobro?</span>
                  <div className="inline-flex gap-1.5" role="group" aria-label="¿Hay gastos por el cobro?">
                    {[false, true].map((v) => (
                      <button key={String(v)} type="button" aria-pressed={hayGasto === v} onClick={() => setHayGasto(v)}
                        className={`rounded-[10px] border px-3.5 py-1.5 font-bold ${hayGasto === v ? "border-carbon bg-carbon text-white" : "border-black/15 text-carbon/70"}`}>{v ? "Sí" : "No"}</button>
                    ))}
                  </div></div>
                {hayGasto && <div><label htmlFor="j-gasto" className={etiquetaCls}>Gasto (confirming, comisión…)</label>
                  <input id="j-gasto" inputMode="decimal" value={gastoTxt} onChange={(e) => setGastoTxt(e.target.value)} className={`${campoCls} w-[140px] text-right`} /></div>}
              </div>

              {elegidas.length > 0 && ing != null && (
                <div className="mt-3.5 grid w-fit grid-cols-[auto_auto] gap-x-7 gap-y-0.5 tabular-nums">
                  <span>Suma de las facturas marcadas</span><span className="text-right">{eur(suma)}</span>
                  {hayGasto && <><span>− Gasto por el cobro</span><span className="text-right">−{eur(gasto)}</span></>}
                  <span className="col-span-2 my-0.5 border-t border-black/15" />
                  <span className="font-extrabold">Debería entrar</span><span className="text-right font-extrabold">{eur(esperado)}</span>
                  <span>Ha entrado</span><span className="text-right">{eur(ing)}</span>
                </div>
              )}

              {cuadraTodo && (
                <div className="mt-3.5 rounded-xl border border-[#bfe0a1] bg-[#f1f9e9] px-3.5 py-2.5 font-semibold text-[#24500c]">
                  Cuadra. {elegidas.length > 1 ? `Las ${elegidas.length} facturas quedan cobradas.` : "La factura queda cobrada."}
                </div>
              )}

              {indagar && (
                <>
                  <div className={`mt-3.5 rounded-xl border px-3.5 py-2.5 font-semibold ${listo ? "border-[#bfe0a1] bg-[#f1f9e9] text-[#24500c]" : "border-[#f2d48a] bg-[#fff8e1] text-[#6e4a06]"}`}>
                    {listo ? "Ahora cuadra con lo que has marcado." : (
                      <>No me cuadran las cifras: entran {eur(ing!)}{hayGasto ? ` + ${eur(gasto)} de gasto` : ""} y las facturas suman {eur(sumaReparto)}. ¿Hay alguna pagada solo en parte?
                        {Math.abs(falta) > 1 && <span className="block font-medium">Diferencia: {eur(falta)}.</span>}</>
                    )}
                  </div>
                  <div className="mt-2.5 overflow-x-auto">
                    <table className="w-auto border-collapse tabular-nums">
                      <thead><tr className="border-b border-black/15 text-left text-[10.5px] font-extrabold uppercase tracking-wider text-carbon/70">
                        <th className="py-1.5 pr-3.5">Factura</th><th className="py-1.5 pr-3.5">Pagador</th><th className="py-1.5 pr-3.5 text-right">Importe</th>
                        <th className="py-1.5 pr-3.5">Pagada</th><th className="py-1.5 pr-3.5 text-right">Se paga ahora</th><th className="py-1.5 pr-3.5 text-right">Queda</th></tr></thead>
                      <tbody>
                        {reparto.map(({ f, parcial, paga }) => (
                          <tr key={f.id} className="border-b border-black/5 even:bg-lima-soft/40">
                            <td className="whitespace-nowrap py-1.5 pr-3.5 font-bold">{f.numero}</td>
                            <td className="max-w-[220px] truncate py-1.5 pr-3.5" title={f.pagador ?? undefined}>{f.pagador ?? "—"}</td>
                            <td className="whitespace-nowrap py-1.5 pr-3.5 text-right">{eur(f.queda)}</td>
                            <td className="py-1.5 pr-3.5">
                              <span className="inline-flex overflow-hidden rounded-[9px] border border-black/15" role="group" aria-label="¿Pagada entera o en parte?">
                                <button type="button" aria-pressed={!parcial} onClick={() => setDecision((d) => ({ ...d, [f.id]: "c" }))}
                                  className={`px-2.5 py-1 text-[12.5px] font-bold ${!parcial ? "bg-lima text-[#1f3a0c]" : "text-carbon/70"}`}>Completa</button>
                                <button type="button" aria-pressed={parcial} onClick={() => setDecision((d) => ({ ...d, [f.id]: "p" }))}
                                  className={`border-l border-black/15 px-2.5 py-1 text-[12.5px] font-bold ${parcial ? "bg-[#f2c14e] text-[#3d2a00]" : "text-carbon/70"}`}>Parcial</button>
                              </span>
                            </td>
                            <td className="whitespace-nowrap py-1.5 pr-3.5 text-right">
                              {parcial ? (
                                <input inputMode="decimal" placeholder="¿cuánto?" aria-label={`Lo que se paga de la ${f.numero}`} value={parcialTxt[f.id] ?? ""}
                                  onChange={(e) => setParcialTxt((p) => ({ ...p, [f.id]: e.target.value }))}
                                  className="w-[110px] rounded-lg border border-black/15 bg-form-nuevo px-2 py-1 text-right tabular-nums focus:border-lima focus:outline-none" />
                              ) : eur(f.queda)}
                            </td>
                            <td className="whitespace-nowrap py-1.5 pr-3.5 text-right">{parcial ? <span className="font-semibold text-[#6e4a06]">{eur(Math.max(0, f.queda - paga))}</span> : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="mt-3.5 border-t border-dashed border-black/15 pt-3">
                {listo && (
                  <>
                    <div><b>Al guardar</b>, el papel queda apuntado en:</div>
                    <ul className="mt-1.5 list-disc pl-5 text-carbon/75">
                      {reparto.map(({ f, parcial, paga }) => (
                        <li key={f.id}>
                          <b className="text-carbon">{f.numero}</b>: {parcial
                            ? <>se pagan {eur(paga)} y quedan {eur(Math.max(0, f.queda - paga))} → pasa a <b className="text-carbon">Pagos parciales</b></>
                            : <>{eur(paga)} → <b className="text-carbon">cobrada</b></>}
                        </li>
                      ))}
                      {hayGasto && gasto > 0 && <li>Gasto de {eur(gasto)}, repartido entre las facturas → a <b className="text-carbon">gastos</b></li>}
                    </ul>
                  </>
                )}
                {mensaje?.error && <div className="mt-2.5 rounded-xl border border-[#e6b8b5] bg-[#f6dfdd] px-3.5 py-2 font-semibold text-alerta">{mensaje.error}</div>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={!listo || guardando} onClick={guardar}
                    className="rounded-xl bg-lima px-5 py-2 font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                    {guardando ? "Guardando…" : "Guardar justificante"}
                  </button>
                  <button type="button" onClick={empezarDeNuevo} className="rounded-xl border border-black/15 px-5 py-2 font-bold text-carbon/70">Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pestana === "parciales" && (
        <div className={`${tarjetaCls} mt-4`}>
          <h2 className={tituloCls}>Facturas cobradas en parte</h2>
          {parciales.length ? (
            <div className="overflow-x-auto">
              <table className="w-auto border-collapse tabular-nums">
                <thead><tr className="border-b border-black/15 text-left text-[10.5px] font-extrabold uppercase tracking-wider text-carbon/70">
                  <th className="py-1.5 pr-4">Factura</th><th className="py-1.5 pr-4">Pagador</th><th className="py-1.5 pr-4 text-right">Importe</th>
                  <th className="py-1.5 pr-4 text-right">Cobrado</th><th className="py-1.5 pr-4 text-right">Queda</th><th className="py-1.5 pr-4 text-right">Justificantes</th><th className="py-1.5 pr-4">Último cobro</th></tr></thead>
                <tbody>
                  {parciales.map((f) => (
                    <tr key={f.id} className="border-b border-black/5 even:bg-lima-soft/40">
                      <td className="whitespace-nowrap py-1.5 pr-4"><b>{f.numero}</b> · {f.empresa === "accesalia" ? "Accesalia" : "Daniel"}</td>
                      <td className="max-w-[280px] truncate py-1.5 pr-4" title={f.pagador ?? undefined}>{f.pagador ?? "—"}</td>
                      <td className="whitespace-nowrap py-1.5 pr-4 text-right">{eur(f.total)}</td>
                      <td className="whitespace-nowrap py-1.5 pr-4 text-right">{eur(f.cobrado)}</td>
                      <td className="whitespace-nowrap py-1.5 pr-4 text-right font-semibold text-[#6e4a06]">{eur(f.queda)}</td>
                      <td className="py-1.5 pr-4 text-right">{f.justificantes}</td>
                      <td className="whitespace-nowrap py-1.5 pr-4">{fecha(f.ultimoCobro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-carbon/60">No hay ninguna factura cobrada en parte.</p>}
          <p className="mt-2.5 text-[12.5px] text-carbon/60">Cuando llega el resto, se sube su justificante en la otra pestaña: estas facturas salen en la lista con lo que queda.</p>
        </div>
      )}
    </div>
  );
}
