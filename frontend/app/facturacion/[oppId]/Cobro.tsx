"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DetalleCobro } from "../../../lib/cobros";
import { cuentasDeDocumento, cuentasDeHito, TEXTO_DOCUMENTO, TEXTO_HITO, type Documento, type Hito } from "../../../lib/cobrosCalculo";
import { accionFecha, accionFraccionar, accionNota, accionPausa } from "../acciones";

// UNA OPORTUNIDAD EN FACTURACION. A la izquierda, cada documento firmado con sus
// lineas, hitos y subhitos (fecha prevista, estado, facturas, notas, pausa,
// fraccionar). A la derecha, el visor: el documento o la factura que se pinche,
// sin salir de la pagina. Arriba, los cuadres.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const eur = (n: number | null) => (n == null ? "a éxito" : `${EUR.format(n)} €`);
const fecha = (f: string | null) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");
const BTN = "rounded-lg border border-black/15 bg-white px-2 py-0.5 text-[11.5px] font-semibold text-carbon/75 hover:border-carbon/40 disabled:opacity-50";
const ESTADO: Record<string, string> = {
  pendiente: "border-black/15 bg-white text-carbon/70",
  parcial: "border-amber-300 bg-amber-50 text-amber-900",
  completado: "border-lima bg-lima-soft text-lima-dark",
  devuelto: "border-alerta/40 bg-[#fbeeee] text-alerta",
  anulado: "border-black/10 bg-black/5 text-carbon/55 line-through",
};

export function Cobro({ d }: { d: DetalleCobro }) {
  const primero = d.documentos.find((x) => x.visor.length)?.visor[0] ?? null;
  const [visor, setVisor] = useState<{ etiqueta: string; url: string } | null>(primero);
  const c = d.documentos.map(cuentasDeDocumento);
  const t = c.reduce(
    (a, x) => ({ firmado: a.firmado + x.firmado, hitos: a.hitos + x.sumaHitos, facturado: a.facturado + x.facturado, cobrado: a.cobrado + x.cobrado,
      porFacturar: a.porFacturar + x.porFacturar, enPausa: a.enPausa + x.enPausa, aExito: a.aExito + x.aExito }),
    { firmado: 0, hitos: 0, facturado: 0, cobrado: 0, porFacturar: 0, enPausa: 0, aExito: 0 },
  );
  const descuadre = Math.abs(t.firmado - t.hitos) > 1;

  return (
    <>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-black/10 pb-4">
        <h1 className="text-3xl font-bold leading-tight text-carbon">{d.opp.comunidad ?? d.opp.nombre}</h1>
        <span className="text-[13px] text-carbon/70">
          {d.opp.codigo} · {d.opp.estado}
        </span>
        <Link href={`/comercial/oportunidades/${d.opp.id}`} className="text-[13px] font-semibold text-[#2f5f8a] hover:underline">
          ir a la oportunidad
        </Link>
      </div>

      {/* los cuadres */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Cifra titulo="Firmado" valor={t.firmado} />
        <Cifra titulo="En hitos" valor={t.hitos} aviso={descuadre ? "no cuadra con lo firmado" : null} />
        <Cifra titulo="Facturado" valor={t.facturado} />
        <Cifra titulo="Cobrado" valor={t.cobrado} aviso={t.facturado - t.cobrado > 1 ? `${EUR.format(t.facturado - t.cobrado)} € sin cobrar` : null} />
        <Cifra titulo="Por facturar" valor={t.porFacturar} />
        <Cifra titulo="En pausa" valor={t.enPausa} pie={t.aExito ? `+ ${t.aExito} hito${t.aExito > 1 ? "s" : ""} a éxito` : null} />
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_620px]">
        <div className="space-y-4">
          {d.documentos.length === 0 && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
              Esta oportunidad no tiene ningún documento firmado: sin él no hay nada que facturar.
            </p>
          )}
          {d.documentos.map((doc) => (
            <DocumentoCard key={doc.id} oppId={d.opp.id} doc={doc} verDoc={setVisor} />
          ))}
          {d.sinHito.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-amber-900">Facturas que no pagan ningún hito</div>
              {d.sinHito.map((f) => (
                <FacturaChip key={f.id} f={f} ver={setVisor} />
              ))}
            </div>
          )}
        </div>

        {/* el visor */}
        <div className="sticky top-4 rounded-2xl border border-black/10 bg-white p-2 shadow-sm">
          {visor ? (
            <>
              <div className="flex items-center justify-between px-2 pb-2 text-[12px] font-semibold text-carbon/75">
                <span className="truncate">{visor.etiqueta}</span>
                <a href={visor.url} target="_blank" rel="noreferrer" className="text-[#2f5f8a] hover:underline">
                  abrir aparte
                </a>
              </div>
              <iframe key={visor.url} src={visor.url} title={visor.etiqueta} className="h-[78vh] w-full rounded-lg border border-black/10" />
            </>
          ) : (
            <p className="px-3 py-10 text-center text-carbon/60">Pincha un documento o una factura para verlo aquí.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Cifra({ titulo, valor, aviso, pie }: { titulo: string; valor: number; aviso?: string | null; pie?: string | null }) {
  return (
    <div className={"rounded-xl border px-3 py-2 " + (aviso ? "border-amber-300 bg-amber-50" : "border-black/10 bg-white")}>
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-carbon/70">{titulo}</div>
      <div className="text-lg font-bold tabular-nums text-carbon">{EUR.format(valor)} €</div>
      {aviso && <div className="text-[11px] text-amber-900">{aviso}</div>}
      {pie && <div className="text-[11px] text-carbon/65">{pie}</div>}
    </div>
  );
}

function DocumentoCard({ oppId, doc, verDoc }: { oppId: string; doc: Documento; verDoc: (v: { etiqueta: string; url: string }) => void }) {
  const c = cuentasDeDocumento(doc);
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className={"text-[11px] font-bold uppercase tracking-wide " + (doc.tipo === "hoja_encargo" ? "text-carbon/70" : "text-ajeno")}>
            {TEXTO_DOCUMENTO[doc.tipo]}
          </span>
          <span className="ml-2 font-semibold text-carbon">{doc.codigo}</span>
          <span className="ml-2 text-[12.5px] text-carbon/70">firmado {fecha(doc.fecha)}</span>
          <div className="text-[12.5px] text-carbon/75">{doc.titulo}</div>
          {(doc.fecha ?? "") < "2025-01-01" && (
            <div className="mt-1 text-[12px] text-amber-800/80">Firmado antes de 2025: sus facturas de entonces no están cargadas; lo pendiente puede estar ya cobrado.</div>
          )}
          {doc.tipo === "nota_responsabilidad" && (
            <div className="mt-1 text-[12px] text-amber-900">
              La asume {doc.responsable}: {doc.motivoSinFirma}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-bold tabular-nums">{EUR.format(c.firmado)} €</div>
          {Math.abs(c.firmado - c.sumaHitos) > 1 && <div className="text-[11px] text-amber-900">hitos: {EUR.format(c.sumaHitos)} €</div>}
          <div className="mt-1 flex flex-wrap justify-end gap-1">
            {doc.visor.map((v, i) => (
              <button key={i} type="button" onClick={() => verDoc({ etiqueta: `${doc.codigo} · ${v.etiqueta}`, url: v.url })}
                className="rounded-lg border border-lima/60 bg-lima-soft px-2 py-0.5 text-[11.5px] font-semibold text-lima-dark hover:border-lima-dark">
                📄 {v.etiqueta}
              </button>
            ))}
            {!doc.visor.length && <span className="text-[11.5px] text-amber-800/80">falta subir el documento</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {doc.lineas.map((l) => (
          <div key={l.id} className="rounded-xl border border-lima/25 bg-lima-soft/40 p-3">
            <div className="flex justify-between gap-3 text-[12.5px] font-semibold text-carbon/85">
              <span>{l.descripcion}</span>
              <span className="tabular-nums">{l.esPorcentaje ? `${l.porcentaje ?? ""} % a éxito` : eur(l.importe)}</span>
            </div>
            <div className="mt-1.5 divide-y divide-black/5">
              {l.hitos.map((h) => (
                <HitoFila key={h.id} oppId={oppId} h={h} verDoc={verDoc} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** El nombre del hito. Los pactados ("otro") llevan el suyo en el texto de la
 *  hoja o del contrato ("DIRECCION DE OBRA: ..."): se usa eso en vez de "Pactado". */
function nombreHito(h: Hito): string {
  const propio = h.tipo === "otro" && h.texto ? h.texto.split("\n")[0].split(":")[0].trim() : "";
  if (propio && propio.length <= 40 && propio === propio.toUpperCase())
    return propio.charAt(0) + propio.slice(1).toLowerCase();
  return TEXTO_HITO[h.tipo] ?? h.tipo;
}

function FacturaChip({ f, ver }: { f: Hito["facturas"][number]; ver: (v: { etiqueta: string; url: string }) => void }) {
  const cls = f.estado === "cobrada" ? "border-lima/60 bg-lima-soft text-lima-dark" : f.estado === "anulada" ? "border-black/10 bg-black/5 text-carbon/55 line-through" : "border-amber-300 bg-amber-50 text-amber-900";
  return (
    <button type="button" disabled={!f.pdf} onClick={() => ver({ etiqueta: `Factura ${f.numero}`, url: `/facturacion/factura/${f.id}` })}
      className={"mr-1 mt-1 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11.5px] font-semibold " + cls}>
      🧾 {f.numero} · {EUR.format(f.importe)} € · {f.estado}
    </button>
  );
}

function HitoFila({ oppId, h, verDoc, sub }: { oppId: string; h: Hito; verDoc: (v: { etiqueta: string; url: string }) => void; sub?: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState<null | "nota" | "pausa" | "fraccionar">(null);
  const [texto, setTexto] = useState("");
  const [partes, setPartes] = useState<{ k: number; importe: string; fecha: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();
  const c = cuentasDeHito(h);
  const pausado = !!h.enPausaDesde;
  const puedeFraccionar = !sub && !h.subhitos.length && !h.facturas.length && h.importe != null && h.estado === "pendiente";

  const correr = (f: () => Promise<{ ok: boolean; error?: string }>) =>
    empezar(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.error ?? "Error");
      setAbierto(null); setTexto(""); setPartes([]);
      router.refresh();
    });

  const abrirFraccionar = () => {
    const n = 2, imp = (h.importe ?? 0) / n;
    setPartes(Array.from({ length: n }, (_, k) => ({ k, importe: imp.toFixed(2), fecha: "" })));
    setAbierto("fraccionar");
  };
  // "1.556,25" (como se escribe aqui) o "1556.25" (como sale al repartir)
  const aNum = (s: string) => (s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s)) || 0;
  const sumaPartes = partes.reduce((a, p) => a + aNum(p.importe), 0);

  return (
    <div className={"py-1.5 " + (sub ? "ml-6 border-l-2 border-amber-200 pl-3" : "")}>
      <div className={"flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] " + (pausado ? "opacity-60" : "")}>
        <span className="w-[200px] font-semibold text-carbon/85">
          {sub ? `Plazo ${h.orden}` : nombreHito(h)}
          {h.porcentaje != null && !sub && <span className="font-normal text-carbon/60"> · {h.porcentaje} %</span>}
        </span>
        <span className="w-[110px] text-right tabular-nums">{eur(h.importe)}</span>
        <span className={`rounded-full border px-2 py-px text-[11px] ${ESTADO[h.estado] ?? ESTADO.pendiente}`}>{h.estado}</span>
        {pausado && <span className="rounded-full border border-ajeno/40 bg-ajeno-soft px-2 py-px text-[11px] text-ajeno">en pausa desde {fecha(h.enPausaDesde)}</span>}
        <label className="flex items-center gap-1 text-[11.5px] text-carbon/65">
          prevista
          <input type="date" defaultValue={h.fechaPrevista ?? ""} disabled={ocupado}
            onChange={(e) => correr(() => accionFecha(oppId, h.id, e.target.value || null))}
            className="rounded-md border border-black/15 bg-white px-1 py-0.5 text-[11.5px]" />
        </label>
        {c.porFacturar > 0 && !h.subhitos.length && <span className="text-[11.5px] text-carbon/70">por facturar {EUR.format(c.porFacturar)} €</span>}
        <span className="ml-auto flex gap-1">
          <button type="button" className={BTN} onClick={() => setAbierto(abierto === "nota" ? null : "nota")}>Nota</button>
          <button type="button" className={BTN} onClick={() => setAbierto(abierto === "pausa" ? null : "pausa")}>{pausado ? "Reactivar" : "Pausar"}</button>
          {puedeFraccionar && <button type="button" className={BTN} onClick={abrirFraccionar}>Fraccionar</button>}
        </span>
      </div>
      {h.texto && !sub && <div className="mt-0.5 text-[11.5px] text-carbon/60">{h.texto.split("\n")[0]}</div>}
      {h.facturas.length > 0 && (
        <div>
          {h.facturas.map((f) => (
            <FacturaChip key={f.id + f.importe} f={f} ver={verDoc} />
          ))}
        </div>
      )}
      {h.notas.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[11.5px] text-carbon/75">
          {h.notas.map((n, i) => (
            <li key={i}>
              <span className="text-carbon/55">{fecha(n.fecha)} {n.autor ? `· ${n.autor}` : ""}:</span> {n.texto}
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-[#fff5cc]/60 p-2.5">
          {abierto === "fraccionar" && (
            <div className="mb-2 space-y-1">
              {partes.map((p, i) => (
                <div key={p.k} className="flex items-center gap-2 text-[12px]">
                  <span className="w-14 text-carbon/70">Plazo {i + 1}</span>
                  <input value={p.importe} onChange={(e) => setPartes(partes.map((x) => (x.k === p.k ? { ...x, importe: e.target.value } : x)))}
                    className="w-28 rounded-md border border-black/15 bg-white px-2 py-0.5 text-right" />
                  <span>€</span>
                  <input type="date" value={p.fecha} onChange={(e) => setPartes(partes.map((x) => (x.k === p.k ? { ...x, fecha: e.target.value } : x)))}
                    className="rounded-md border border-black/15 bg-white px-1 py-0.5" />
                  {partes.length > 2 && <button type="button" className="text-alerta" onClick={() => setPartes(partes.filter((x) => x.k !== p.k))}>quitar</button>}
                </div>
              ))}
              <div className="flex items-center gap-3 text-[12px]">
                <button type="button" className={BTN} onClick={() => setPartes([...partes, { k: Date.now(), importe: "", fecha: "" }])}>+ plazo</button>
                <span className={Math.abs(sumaPartes - (h.importe ?? 0)) > 0.5 ? "text-alerta" : "text-carbon/70"}>
                  suman {EUR.format(sumaPartes)} € de {EUR.format(h.importe ?? 0)} €
                </span>
              </div>
            </div>
          )}
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
            placeholder={abierto === "nota" ? "La nota…" : abierto === "pausa" ? (pausado ? "Por qué se reactiva (opcional)…" : "Por qué se pausa…") : "Por qué se fracciona: hablé con el admin, no tienen caja…"}
            className="w-full resize-y rounded-md border border-black/15 bg-white px-2 py-1 text-[12.5px] placeholder:text-carbon/55" />
          {error && <p className="text-[12px] text-alerta">{error}</p>}
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" className={BTN} onClick={() => { setAbierto(null); setError(null); }}>Cancelar</button>
            <button type="button" disabled={ocupado}
              className="rounded-lg border border-lima bg-lima px-3 py-0.5 text-[12px] font-bold text-carbon hover:bg-lima-dark hover:text-white disabled:opacity-50"
              onClick={() =>
                correr(() =>
                  abierto === "nota"
                    ? accionNota(oppId, h.id, texto)
                    : abierto === "pausa"
                      ? accionPausa(oppId, h.id, !pausado, texto)
                      : accionFraccionar(oppId, h.id, partes.map((p) => ({ importe: aNum(p.importe), fecha: p.fecha || null })), texto),
                )
              }>
              {abierto === "nota" ? "Guardar nota" : abierto === "pausa" ? (pausado ? "Reactivar" : "Pausar") : "Fraccionar"}
            </button>
          </div>
        </div>
      )}

      {h.subhitos.map((s) => (
        <HitoFila key={s.id} oppId={oppId} h={s} verDoc={verDoc} sub />
      ))}
    </div>
  );
}
