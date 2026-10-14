"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DetalleRevision, FilaConcepto, HojaEnRevision } from "../../../lib/revisionOferta";
import { ESTILO_PAPEL } from "../../../lib/hojaPapel";
import { accionMarcarModificar, accionResolverRevision } from "./acciones";

// EL PAQUETE EN REVISION (Monica, 14-oct-2026). Arriba, de que opp es, quien lo
// manda y su nota, el cierre (ok o devolver con cambios, AL PAQUETE ENTERO) y la
// viabilidad y el presupuesto. Luego, cada hoja: su TABLA de conceptos (bloque ·
// importe o "x % de lo concedido" · forma de pago), con el "Modifícalo" de cada
// fila, y debajo la hoja tal cual, para leerla sin abrir el documento.

const CUANDO = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
// Con punto de miles también en 4 cifras ("8.900 €"; es-ES por defecto pone "8900").
const EUROS = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: "always" });

const BOTON = "rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-carbon/75 hover:border-lima hover:text-carbon disabled:opacity-50";
const DOC = "inline-flex items-center gap-1.5 rounded-lg border border-lima/60 bg-lima-soft px-2.5 py-1 text-[13px] font-semibold text-lima-dark hover:border-lima-dark";

function cuanto(c: FilaConcepto) {
  if (c.desglose === "incluido") return <span className="text-carbon/70">incluido</span>;
  if (c.desglose === "no_aparece") return <span className="text-carbon/55">no aparece</span>;
  if (c.porcentaje != null) return <span>{c.porcentaje.toLocaleString("es-ES")} % de lo concedido</span>;
  if (c.importe != null) return <span className="tabular-nums">{EUROS.format(c.importe)}</span>;
  return <span className="text-amber-700/70">sin importe</span>;
}

function Fila({ c, revisionId, abierta }: { c: FilaConcepto; revisionId: string; abierta: boolean }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nota, setNota] = useState(c.modificar?.nota ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  const guardar = (texto: string | null) =>
    empezar(async () => {
      setError(null);
      const r = await accionMarcarModificar(revisionId, c.conceptoId, texto).catch((e: Error) => ({ ok: false as const, error: e.message }));
      if (!r.ok) return setError(r.error);
      setEditando(false);
      router.refresh();
    });

  const marcada = !!c.modificar;
  return (
    <>
      <tr className={(marcada ? "bg-amber-50/70 " : "") + (c.esConjunto ? "font-bold " : "") + (c.desglose === "no_aparece" ? "text-carbon/55 " : "")}>
        <td className="px-3 py-2 align-top">
          <span className={c.enConjunto ? "pl-4" : ""}>{c.bloque}</span>
          {c.texto && <span className="block text-[12px] font-normal text-carbon/65">{c.texto}</span>}
        </td>
        <td className="px-3 py-2 text-right align-top">
          {cuanto(c)}
          {c.enConjunto && <span className="block text-[11px] font-normal text-carbon/60">dentro del conjunto</span>}
        </td>
        <td className="px-3 py-2 align-top text-[13px]">
          {c.formaPago ?? <span className="text-carbon/55">—</span>}
          {c.formaPagoAMano && <span className="ml-1 text-[11px] text-carbon/60">(a mano)</span>}
        </td>
        <td className="px-3 py-2 text-right align-top">
          {abierta && !editando && (
            <button type="button" onClick={() => setEditando(true)} className={"whitespace-nowrap text-[13px] font-semibold hover:underline " + (marcada ? "text-amber-800" : "text-lima-dark")}>
              {marcada ? "Cambiar nota" : "Modifícalo"}
            </button>
          )}
        </td>
      </tr>
      {(marcada || editando) && (
        <tr className="bg-amber-50/70">
          <td colSpan={4} className="px-3 pb-3">
            {editando ? (
              <div className="flex flex-wrap items-start gap-2">
                <textarea
                  autoFocus
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                  placeholder="Qué hay que cambiar en este bloque"
                  className="min-w-[260px] flex-1 resize-y rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm placeholder:text-carbon/55 focus:border-lima focus:outline-none"
                />
                <button type="button" disabled={pendiente || !nota.trim()} onClick={() => guardar(nota.trim())} className="rounded-xl bg-lima px-4 py-2 text-sm font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-50">
                  Guardar
                </button>
                {marcada && (
                  <button type="button" disabled={pendiente} onClick={() => guardar(null)} className={BOTON}>
                    Quitar la marca
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setNota(c.modificar?.nota ?? "");
                    setEditando(false);
                  }}
                  className={BOTON}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <p className="text-[13px] text-amber-900/90">
                <b>Modifícalo:</b> {c.modificar!.nota}
                {c.modificar!.quien && <span className="ml-2 text-[12px] text-amber-900/70">— {c.modificar!.quien}</span>}
              </p>
            )}
            {error && <p className="mt-1 text-[12px] text-alerta">{error}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

function Hoja({ h, revisionId, abierta }: { h: HojaEnRevision; revisionId: string; abierta: boolean }) {
  const [verPapel, setVerPapel] = useState(true);
  return (
    <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="text-xl font-bold text-carbon">
          {h.numero ?? "Hoja sin número"} <span className="text-[14px] font-semibold text-carbon/65">v{h.version}</span>
        </h2>
        <span className="text-[14px] text-carbon/80">{h.titulo}</span>
        {h.importeBase != null && <span className="text-[14px] font-semibold tabular-nums text-carbon">{EUROS.format(h.importeBase)} + IVA</span>}
        <a href={h.pdf} target="_blank" rel="noreferrer" className={DOC + " ml-auto"}>📄 Abrir el PDF</a>
      </div>

      <table className="mt-3 w-full border-collapse text-[14px] text-carbon">
        <thead>
          <tr className="border-b border-black/10 text-left text-[11px] font-bold uppercase tracking-wide text-carbon/70">
            <th className="px-3 py-2">Bloque</th>
            <th className="px-3 py-2 text-right">Importe</th>
            <th className="px-3 py-2">Forma de pago</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {h.conceptos.map((c) => (
            <Fila key={c.conceptoId} c={c} revisionId={revisionId} abierta={abierta} />
          ))}
        </tbody>
      </table>

      {h.html && (
        <div className="mt-4">
          <button type="button" onClick={() => setVerPapel(!verPapel)} className="text-[13px] font-semibold text-lima-dark hover:underline">
            {verPapel ? "▲ Ocultar la hoja" : "▼ Ver la hoja"}
          </button>
          {verPapel && (
            <div className="mt-2 rounded-xl bg-hueso p-4">
              <div
                className="hoja-papel mx-auto max-w-[820px] rounded px-[46px] py-[38px] shadow-[0_2px_10px_rgba(0,0,0,.12)]"
                // La foto de la hoja la escribe la propia app al generarla.
                dangerouslySetInnerHTML={{ __html: h.html }}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function RevisarPaquete({ d }: { d: DetalleRevision }) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ decision: "ok" | "cambios"; avisos: string[] } | null>(null);
  const [pendiente, empezar] = useTransition();
  const abierta = d.estado === "pendiente" && !hecho;
  const marcadas = d.hojas.flatMap((h) => h.conceptos).filter((c) => c.modificar).length;

  const cerrar = (decision: "ok" | "cambios") =>
    empezar(async () => {
      setError(null);
      const r = await accionResolverRevision(d.id, decision, comentario.trim() || null).catch((e: Error) => ({ ok: false as const, error: e.message }));
      if (!r.ok) return setError(r.error);
      setHecho({ decision, avisos: r.avisos });
      router.refresh();
    });

  return (
    <div>
      <style>{ESTILO_PAPEL}</style>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-black/10 pb-4">
        <h1 className="text-3xl font-bold leading-tight text-carbon sm:text-4xl">
          <Link href={`/comercial/oportunidades/${d.oportunidadId}`} className="hover:underline">{d.opp}</Link>
        </h1>
        <span className="text-[14px] text-carbon/75">
          Envío {d.numero} · {d.enviadaPor ?? "—"} · {CUANDO.format(new Date(d.enviadaEn))}
        </span>
      </div>

      {/* ---- el cierre, al paquete entero ---- */}
      <section className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {d.nota && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/70">Nota del comercial</span>
                <p className="whitespace-pre-line text-[15px] text-carbon/90">{d.nota}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {d.viabilidad && (
                <a href={d.viabilidad.enlace} target="_blank" rel="noreferrer" className={DOC}>
                  📄 Viabilidad {d.viabilidad.numero ?? ""} v{d.viabilidad.version}
                </a>
              )}
              {d.presupuesto && (
                <a href={d.presupuesto.enlace} target="_blank" rel="noreferrer" className={DOC}>
                  📄 Presupuesto {d.presupuesto.codigo ?? ""}
                </a>
              )}
              {!d.viabilidad && !d.presupuesto && <span className="text-[13px] text-carbon/65">Sin viabilidad ni presupuesto en el paquete.</span>}
            </div>
          </div>

          <div>
            {hecho || d.estado !== "pendiente" ? (
              <div className={"rounded-xl border px-4 py-3 text-[15px] " + ((hecho?.decision ?? d.estado) === "ok" ? "border-lima/60 bg-lima-soft text-lima-dark" : "border-amber-300 bg-amber-50 text-amber-900")}>
                <b>
                  {(hecho?.decision ?? d.estado) === "ok"
                    ? "Tiene el ok. El comercial ya puede enviarla a la comunidad."
                    : (hecho?.decision ?? d.estado) === "cambios"
                      ? "Devuelta al comercial con los cambios."
                      : "Esta revisión ya no está vigente: hay un envío más nuevo."}
                </b>
                {!hecho && d.resueltaPor && <span className="block text-[13px]">{d.resueltaPor}{d.resueltaEn ? ` · ${CUANDO.format(new Date(d.resueltaEn))}` : ""}</span>}
                {!hecho && d.comentario && <span className="block whitespace-pre-line text-[14px]">«{d.comentario}»</span>}
                {hecho?.avisos.map((a, i) => <span key={i} className="block text-[13px]">{a}</span>)}
                {hecho && (
                  <Link href="/comercial/revision" className="mt-2 inline-block text-[13px] font-semibold underline">
                    Volver a las ofertas esperando
                  </Link>
                )}
              </div>
            ) : (
              <>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={2}
                  placeholder="Comentario general para el comercial (opcional)"
                  className="w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm placeholder:text-carbon/55 focus:border-lima focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pendiente || marcadas > 0}
                    title={marcadas > 0 ? "Hay bloques marcados con «Modifícalo»: quítales la marca o devuélvela con cambios" : undefined}
                    onClick={() => cerrar("ok")}
                    className="rounded-xl bg-lima px-5 py-2.5 text-base font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ✓ Dar el ok al paquete
                  </button>
                  <button type="button" disabled={pendiente} onClick={() => cerrar("cambios")} className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-base font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50">
                    Devolver con cambios
                  </button>
                </div>
                {marcadas > 0 && (
                  <p className="mt-2 text-[13px] text-amber-900/90">
                    {marcadas === 1 ? "Hay 1 bloque marcado" : `Hay ${marcadas} bloques marcados`} con «Modifícalo»: el comercial recibirá sus notas.
                  </p>
                )}
                {error && <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}
              </>
            )}
          </div>
        </div>
      </section>

      {d.hojas.map((h) => (
        <Hoja key={h.versionId} h={h} revisionId={d.id} abierta={abierta} />
      ))}
    </div>
  );
}
