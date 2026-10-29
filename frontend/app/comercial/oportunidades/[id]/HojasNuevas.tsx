"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HojaHe, VersionHe } from "../../../../lib/hojasOpp";
import type { DocCajon } from "../../../../lib/cajonDocumentos";
import { accionHojaAnular, accionHojaDescartar, accionHojaEnviada, accionHojaModificar, accionHojaNoFirmada, accionValidarFirmada } from "./accionesHoja";

// LAS HOJAS DEL SISTEMA NUEVO EN EL BLOQUE 2 (Monica, 25-oct-2026): «las acciones pasarían a esa pantalla». Misma fila
// que la lista de hojas de siempre (fecha, estado, importe, codigo y para quien, ver) y, al lado, lo que toca hacer en su
// fase: seguir el borrador, descartarlo, marcarla enviada, no firmada, modificarla (version nueva) o anularla. La fase y
// los colores salen del lector unico (lib/hojasOpp.ts).

const ENLACE = "font-semibold text-[#104269] underline-offset-2 hover:underline disabled:opacity-50";
const EUR = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Madrid" }) : "—");
const pct = (x: number) => String(x).replace(".", ",");

type Fase = Record<string, { texto: string; clase: string }>;

type Firmadas = Record<string, { nombre: string; url: string | null }>;
// Las fases en las que una version puede recibir su firmada (las mismas que valida lib/hojaEmitir.ts).
const ESPERA_FIRMADA = ["ok_daniel", "enviada", "firma_con_errores"];

export function HojasNuevas({ oppId, hojas, fases, porValidar, firmadas }: { oppId: string; hojas: HojaHe[]; fases: Fase; porValidar: DocCajon[]; firmadas: Firmadas }) {
  const candidatas = hojas.map((h) => h.actual).filter((v) => ESPERA_FIRMADA.includes(v.estado));
  return (
    <>
      {porValidar.map((d) => <PorValidar key={d.id} oppId={oppId} doc={d} candidatas={candidatas} />)}
      <ul className="mt-1.5 divide-y divide-[#eee]">
        {hojas.map((h) => <Fila key={h.actual.id} oppId={oppId} v={h.actual} anteriores={h.anteriores.length} fases={fases} firmadas={firmadas} />)}
      </ul>
    </>
  );
}

/** UNA HOJA FIRMADA POR VALIDAR (Monica, 25-oct-2026): archivada en la opp como «Hoja de encargo firmada», llegue por el
 *  portal o por el cajon. El comercial dice de que hoja(s) es y comprueba las tres cosas; bien, pasa a facturacion. */
export function PorValidar({ oppId, doc, candidatas }: { oppId: string; doc: DocCajon; candidatas: VersionHe[] }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [elegidas, setElegidas] = useState<string[]>(candidatas.length === 1 ? [candidatas[0].id] : []);
  const [checks, setChecks] = useState([false, false, false]);
  const [nota, setNota] = useState("");
  const COMPROBAR = ["Está bien firmada", "Es la última versión que se envió", "No está retocada"];
  const resolver = (decision: "ok" | "errores") =>
    empezar(async () => {
      setError(null);
      const r = await accionValidarFirmada(oppId, doc.id, elegidas, decision, nota);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  return (
    <div className="mt-2 rounded-[8px] border border-[#f0d78c] bg-[#fdf6e3] px-2.5 py-2 text-[12px] text-[#5a3d00]">
      <p>
        <b>Hoja firmada por validar:</b>{" "}
        {doc.url ? <a href={doc.url} target="_blank" rel="noreferrer" className={ENLACE}>{doc.nombre}</a> : doc.nombre}
        <span className="text-[#8a6a2a]"> · {fecha(doc.archivado ?? doc.subido)}{doc.subidoPor && ` · la subió ${doc.subidoPor}`}</span>
      </p>
      {candidatas.length === 0 ? (
        <p className="mt-1">No hay ninguna hoja de esta oportunidad esperando la firma (con el ok de Daniel o enviada).</p>
      ) : (
        <>
          <p className="mt-1 font-semibold">¿De qué hoja es? (un PDF puede traer varias)</p>
          <div className="flex flex-wrap gap-x-4">
            {candidatas.map((v) => (
              <label key={v.id} className="flex items-center gap-1">
                <input type="checkbox" checked={elegidas.includes(v.id)} onChange={(e) => setElegidas(e.target.checked ? [...elegidas, v.id] : elegidas.filter((x) => x !== v.id))} />
                <b>{v.tipos.join(" + ") || "Hoja de encargo"}</b> · {EUR.format(v.importe)} €
                <span className="text-carbon/55">
                  {v.codigo ? `${v.codigo} v${v.numero}` : "sin código"}
                  {v.aQuien && ` · ${v.aQuien}`}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 font-semibold">Compruébalo:</p>
          <div className="flex flex-wrap gap-x-4">
            {COMPROBAR.map((t, i) => (
              <label key={t} className="flex items-center gap-1">
                <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks(checks.map((c, j) => (j === i ? e.target.checked : c)))} /> {t}
              </label>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (obligatoria si la firma tiene errores)"
              className="min-w-[260px] flex-1 rounded-[5px] border border-[#cfcfcf] bg-white px-2 py-0.5" />
            <button type="button" className={ENLACE} disabled={ocupado || !elegidas.length || checks.some((c) => !c)} onClick={() => resolver("ok")}>
              validada: pasa a facturación
            </button>
            <button type="button" className={ENLACE} disabled={ocupado || !elegidas.length || !nota.trim()} onClick={() => resolver("errores")}>
              firma con errores
            </button>
          </div>
        </>
      )}
      {error && <p className="mt-0.5 font-semibold text-alerta">{error}</p>}
    </div>
  );
}

export function Fila({ oppId, v, anteriores, fases, firmadas }: { oppId: string; v: VersionHe; anteriores: number; fases: Fase; firmadas: Firmadas }) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Lo que pide texto (no firmada, anular, modificar) se escribe en la propia fila.
  const [pide, setPide] = useState<null | "no_firmada" | "anular" | "modificar">(null);
  const [nota, setNota] = useState("");
  const [quien, setQuien] = useState<"comunidad" | "comercial" | "">("");
  const f = fases[v.estado] ?? { texto: v.estado, clase: "border-black/15 bg-hueso text-carbon/70" };
  const pdf = `/comercial/hoja-encargo/pdf/${v.id}`;
  const hacer = (accion: () => Promise<{ ok: true; id?: string } | { ok: false; error: string }>, despues?: (id?: string) => void) =>
    empezar(async () => {
      setError(null);
      const r = await accion();
      if (!r.ok) return setError(r.error);
      setPide(null); setNota(""); setQuien("");
      if (despues) despues(r.id);
      else router.refresh();
    });

  const editable = v.estado === "borrador" || v.estado === "cambios_daniel";
  const enviable = v.estado === "ok_daniel";
  const esperaFirma = [...ESPERA_FIRMADA, "cambios_comunidad", "cambios_comercial"].includes(v.estado);
  const modificable = !!v.codigo && !["borrador", "pendiente_ok_daniel", "cambios_daniel", "sustituida", "anulada", "no_firmada"].includes(v.estado);
  const anulable = v.estado !== "borrador" && !["no_firmada", "anulada", "sustituida"].includes(v.estado);

  return (
    <li className="py-1.5 text-[12px]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="w-[74px]">{fecha(v.fechaEmision ?? v.creadaEn)}</span>
        <span className={`rounded-[20px] border px-2 py-px text-[10.5px] ${f.clase}`}>{f.texto}</span>
        {v.pausa && (
          <span className="rounded-[20px] border border-alerta/40 bg-[#fbeeee] px-2 py-px text-[10.5px] text-alerta" title={v.pausa.nota ?? undefined}>
            {v.pausa.paraReanudar ? "en pausa · para reanudar" : "en pausa"}
          </span>
        )}
        {/* PRIMERO LO QUE CONTIENE (Monica, 29-oct-2026: «el codigo es accesorio para un humano, saber lo que contiene la
            hoja es critico»): lo que es en negrita, el importe, y el codigo al final en gris. */}
        <b className="text-carbon">{v.tipos.join(" + ") || "Hoja de encargo"}</b>
        <span className="font-semibold">
          {EUR.format(v.importe)} €{v.aExito.map((x) => ` + ${pct(x)} % a éxito`).join("")}
        </span>
        <span className="min-w-0 flex-1 truncate text-[#6e6e6e]">
          {v.codigo ? `${v.codigo} v${v.numero}` : "Sin código aún"}
          {v.aQuien && ` · ${v.aQuien}`}
          {anteriores > 0 && ` · ${anteriores} versión${anteriores > 1 ? "es" : ""} anterior${anteriores > 1 ? "es" : ""}`}
        </span>
        <span className="flex flex-wrap gap-3">
          {!editable && v.estado !== "borrador" && <a href={pdf} target="_blank" rel="noreferrer" className={ENLACE}>ver</a>}
          {!editable && v.presupuesto && <a href={`${pdf}?que=presupuesto`} target="_blank" rel="noreferrer" className={ENLACE}>presupuesto</a>}
          {v.firmadaDocumentoId && firmadas[v.firmadaDocumentoId]?.url && (
            <a href={firmadas[v.firmadaDocumentoId].url!} target="_blank" rel="noreferrer" className={ENLACE}>firmada</a>
          )}
          {editable && <a href={`/comercial/hoja-encargo?opp=${oppId}&borrador=${v.id}`} className={ENLACE}>seguir</a>}
          {v.estado === "borrador" && (
            <button type="button" className={ENLACE} disabled={ocupado}
              onClick={() => confirm(v.codigo ? "¿Descartas este borrador? La versión anterior sigue valiendo." : "¿Descartas este borrador? Se borra entero.") && hacer(() => accionHojaDescartar(v.id))}>
              descartar
            </button>
          )}
          {enviable && <button type="button" className={ENLACE} disabled={ocupado} onClick={() => hacer(() => accionHojaEnviada(v.id))}>marcar enviada</button>}
          {esperaFirma && <button type="button" className={ENLACE} disabled={ocupado} onClick={() => setPide(pide === "no_firmada" ? null : "no_firmada")}>no firmada</button>}
          {modificable && <button type="button" className={ENLACE} disabled={ocupado} onClick={() => setPide(pide === "modificar" ? null : "modificar")}>modificar</button>}
          {anulable && <button type="button" className={ENLACE} disabled={ocupado} onClick={() => setPide(pide === "anular" ? null : "anular")}>anular</button>}
        </span>
      </div>
      {v.estado === "pendiente_ok_daniel" && <p className="mt-0.5 text-[#6e6e6e]">Espera el ok de Daniel.</p>}
      {v.ultimo?.nota && ["cambios_daniel", "no_firmada", "anulada", "cambios_comunidad", "cambios_comercial", "firma_con_errores"].includes(v.ultimo.estado) && (
        <p className="mt-0.5 text-[#6e6e6e]"><b>{f.texto}</b>{v.ultimo.quien && ` · ${v.ultimo.quien}`}: {v.ultimo.nota}</p>
      )}
      {pide && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {pide === "modificar" && (
            <>
              <span>¿Quién pide el cambio?</span>
              {(["comunidad", "comercial"] as const).map((x) => (
                <label key={x} className="flex items-center gap-1">
                  <input type="radio" name={`pide-${v.id}`} checked={quien === x} onChange={() => setQuien(x)} /> {x === "comunidad" ? "la comunidad" : "el comercial"}
                </label>
              ))}
            </>
          )}
          <input type="text" value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder={pide === "no_firmada" ? "Por qué no la firman" : pide === "anular" ? "Por qué se anula" : "Qué cambia y por qué"}
            className="min-w-[260px] flex-1 rounded-[5px] border border-[#cfcfcf] px-2 py-0.5" />
          <button type="button" className={ENLACE} disabled={ocupado || !nota.trim() || (pide === "modificar" && !quien)}
            onClick={() =>
              pide === "no_firmada" ? hacer(() => accionHojaNoFirmada(v.id, nota))
                : pide === "anular" ? hacer(() => accionHojaAnular(v.id, nota))
                  : hacer(() => accionHojaModificar(v.id, quien as "comunidad" | "comercial", nota), (id) => router.push(`/comercial/hoja-encargo?opp=${oppId}&borrador=${id}`))
            }>
            {pide === "modificar" ? "crear la versión nueva" : "guardar"}
          </button>
          <button type="button" className={ENLACE} onClick={() => setPide(null)}>cancelar</button>
        </div>
      )}
      {error && <p className="mt-0.5 font-semibold text-alerta">{error}</p>}
    </li>
  );
}
