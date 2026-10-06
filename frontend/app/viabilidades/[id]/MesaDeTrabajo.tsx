"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DatosMesa, Mesa } from "../../../lib/mesaViabilidades";
import { accionAvisarDaniel, accionCaptura, accionEnviar, accionGuardar, accionJuntar, accionModelo } from "../acciones";

// La mesa de Alex. Lo que decidio Monica (3-oct-2026):
//   · la captura del 3D va SIEMPRE, y sale de aqui con un boton;
//   · el .glb se puede bajar para SketchUp: "lo mira si es facil, lo mide si
//     empieza a ver problemas";
//   · un escaneo, una viabilidad... salvo cuando dos escaneos dan una conjunta:
//     una pestaña por escaneo y "Juntar otro escaneo";
//   · con varias escaleras, una caja de texto por escalera;
//   · los tres precios de una obra, al momento: PEM -> + 19% -> + 10% de IVA;
//   · Alex llega hasta donde llegue: el comercial lo completa despues.

const VISOR = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js";

const etq = "block text-[10.5px] font-bold uppercase tracking-[0.06em] text-carbon/70";
const de = "ml-1.5 text-[10.5px] font-semibold normal-case tracking-normal text-carbon/50";
const campo =
  "w-full rounded-[10px] border border-carbon/25 bg-white px-3 py-2 text-[14px] text-carbon outline-none transition focus:border-lima-dark focus:ring-2 focus:ring-lima/40";
const bloque = "border-t border-black/[0.06] py-3 first:border-t-0 first:pt-0";

/** La linea mientras se teclea: el importe es texto hasta que se guarda. */
type LineaUI = { grupo: "obra" | "tasas"; concepto: string; importe: string; biPct: number; ivaPct: number };
const ajeno =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-[#3f5f80] bg-ajeno px-3.5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#4a6d91] disabled:opacity-50";
const ajenoClaro =
  "inline-flex h-[30px] items-center justify-center rounded-[8px] border border-ajeno/40 bg-ajeno-soft px-3.5 text-[12px] font-bold uppercase tracking-wide text-[#3f5f80] transition hover:bg-[#dde7f1]";

const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const numero = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return s.trim() && Number.isFinite(n) ? n : null;
};
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VisorEl = HTMLElement & { toDataURL: (tipo?: string) => string } & Record<string, any>;

export function MesaDeTrabajo({ m }: { m: Mesa }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();

  const [fecha, setFecha] = useState(m.fechaVisita ?? "");
  const [objeto, setObjeto] = useState(m.objeto);
  const [descripcion, setDescripcion] = useState(m.descripcion);
  const [conclusion, setConclusion] = useState(m.conclusion);
  // El dinero que pone Alex, por lineas. Si no hay ninguna todavia, se arranca
  // con una de obra: lo normal es que haya al menos una.
  const [lineas, setLineas] = useState<LineaUI[]>(
    m.lineas.length
      ? m.lineas.map((l) => ({ ...l, importe: l.importe !== null ? l.importe.toLocaleString("es-ES") : "" }))
      : [{ grupo: "obra", concepto: "", importe: "", biPct: 19, ivaPct: 10 }],
  );
  const [especifico, setEspecifico] = useState(m.especifico);
  const [modelo, setModelo] = useState(m.modeloId ?? "");
  const [escaleras, setEscaleras] = useState(m.escaleras);
  const [guardadoEn, setGuardadoEn] = useState(m.actualizada);
  const [sucio, setSucio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- el visor
  const [activo, setActivo] = useState(m.escaneos[0]?.id ?? null);
  const [modelos, setModelos] = useState<Record<string, string | null | "cargando">>({});
  const [captura, setCaptura] = useState(m.capturaUrl);
  const [capturando, setCapturando] = useState(false);
  const visor = useRef<VisorEl | null>(null);

  useEffect(() => {
    if (document.querySelector(`script[src="${VISOR}"]`)) return;
    const s = document.createElement("script");
    s.type = "module";
    s.src = VISOR;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!activo || modelos[activo] !== undefined) return;
    setModelos((x) => ({ ...x, [activo]: "cargando" }));
    accionModelo(activo)
      .then((url) => setModelos((x) => ({ ...x, [activo]: url })))
      .catch(() => setModelos((x) => ({ ...x, [activo]: null })));
  }, [activo, modelos]);

  const urlActiva = activo ? modelos[activo] : null;
  const escaneoActivo = m.escaneos.find((e) => e.id === activo) ?? null;

  /** La captura: lo que se ve en el visor ahora mismo. El lienzo del visor es
   *  transparente y en JPEG saldria NEGRO (visto el 3-oct), asi que se pinta
   *  encima de un fondo crema antes de exportar. */
  const guardarCaptura = async () => {
    const v = visor.current;
    if (!v) return;
    setCapturando(true);
    setError(null);
    try {
      const png = v.toDataURL("image/png");
      const img = new Image();
      await new Promise((ok, mal) => {
        img.onload = ok;
        img.onerror = mal;
        img.src = png;
      });
      const lienzo = document.createElement("canvas");
      lienzo.width = img.width;
      lienzo.height = img.height;
      const ctx = lienzo.getContext("2d")!;
      ctx.fillStyle = "#fffaf0";
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(img, 0, 0);
      const url = await accionCaptura(m.id, lienzo.toDataURL("image/jpeg", 0.85));
      setCaptura(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido guardar la captura");
    } finally {
      setCapturando(false);
    }
  };

  // ---- los precios, LINEA A LINEA. Ella, 6-oct-2026: el beneficio industrial y
  // el IVA van por linea y no al total, "asi pueden comparar presupuesto de
  // contrata con estimado de viabilidad".
  const totalDe = (l: LineaUI) => {
    const base = numero(l.importe);
    if (base === null) return null;
    return base * (1 + (l.grupo === "obra" ? l.biPct : 0) / 100) * (1 + l.ivaPct / 100);
  };
  const suma = (g: "obra" | "tasas") =>
    lineas.filter((l) => l.grupo === g).reduce((s, l) => s + (totalDe(l) ?? 0), 0);
  const cambiar = (i: number, cambio: Partial<LineaUI>) => {
    setLineas((ls) => ls.map((l, n) => (n === i ? { ...l, ...cambio } : l)));
    setSucio(true);
  };

  const datos = (): DatosMesa => ({
    fechaVisita: fecha || null,
    objeto,
    descripcion,
    conclusion,
    // Se siguen mandando hasta que se jubilen las columnas viejas: la primera
    // linea de obra hace de PEM para lo que todavia las lee.
    pem: numero(lineas.find((l) => l.grupo === "obra")?.importe ?? ""),
    biPct: lineas.find((l) => l.grupo === "obra")?.biPct ?? 19,
    ivaPct: lineas.find((l) => l.grupo === "obra")?.ivaPct ?? 10,
    lineas: lineas.map((l) => ({ ...l, importe: numero(l.importe) })),
    modeloId: modelo || null,
    especifico,
    escaleras: escaleras.map((e) => ({ accesoId: e.accesoId, texto: e.texto })),
  });

  const tocar = <T,>(f: (v: T) => void) => (v: T) => {
    f(v);
    setSucio(true);
  };

  const guardar = () =>
    empezar(async () => {
      setError(null);
      try {
        setGuardadoEn(await accionGuardar(m.id, datos()));
        setSucio(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se ha podido guardar");
      }
    });

  return (
    <>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-3.5">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-carbon/45">Viabilidad</div>
          <h1 className="text-[25px] font-bold leading-tight text-carbon">{m.direccion}</h1>
          <div className="mt-1 text-[13px] text-carbon/60">
            {[m.opp?.codigo ? `Opp ${m.opp.codigo}` : null, m.opp?.comercial ? `comercial ${m.opp.comercial}` : null, m.escalerasTexto || null, m.escaneos.length > 1 ? `${m.escaneos.length} escaneos` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-800">
          {m.enviada ? "enviada al comercial" : sucio ? "sin guardar" : `borrador · guardado a las ${hora(guardadoEn)}`}
        </span>
      </div>

      {m.opp && !m.opp.comercial && (
        <div className="mt-3 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          <b>Esta oportunidad no tiene comercial asignado.</b> Puedes escribirla y guardarla, pero para enviarla hay que
          asignárselo en la ficha de la oportunidad: el correo va a su comercial.
        </div>
      )}
      {m.danielAvisado && (
        <div className="mt-3 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          <b>Daniel está avisado</b> de que esta viabilidad se ha atascado.
        </div>
      )}
      {error && <div className="mt-3 rounded-[10px] border border-alerta/40 bg-[#fbeeee] px-4 py-2.5 text-[13px] text-alerta">{error}</div>}

      <div className="mt-[18px] grid items-start gap-5 lg:grid-cols-2">
        {/* ===================== izquierda: el edificio ===================== */}
        <div className="rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {m.escaneos.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setActivo(e.id)}
                className={
                  "rounded-lg border px-3 py-1.5 text-[12px] font-bold " +
                  (e.id === activo ? "border-[#3f5f80] bg-ajeno text-white" : "border-ajeno/40 bg-white text-[#3f5f80]")
                }
              >
                Escaneo {e.fecha ? e.fecha.split("-").reverse().slice(0, 2).join("/") : ""}
                {e.escaleras ? ` · ${e.escaleras}` : ""}
              </button>
            ))}
            {m.paraJuntar.length > 0 && (
              <select
                value=""
                onChange={(x) => {
                  const esc = x.target.value;
                  if (!esc) return;
                  empezar(async () => {
                    await accionJuntar(m.id, esc);
                    router.refresh();
                  });
                }}
                className="rounded-lg border border-dashed border-ajeno/60 bg-transparent px-2.5 py-1.5 text-[12px] font-bold text-[#3f5f80]"
              >
                <option value="">+ Juntar otro escaneo</option>
                {m.paraJuntar.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.texto}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative flex h-[380px] items-center justify-center overflow-hidden rounded-xl border border-ajeno/30 bg-[#fffaf0]">
            {urlActiva === "cargando" || urlActiva === undefined ? (
              <p className="text-[13px] text-carbon/55">Abriendo el escaneo… la primera vez tarda un poco.</p>
            ) : urlActiva === null ? (
              <p className="max-w-[34ch] text-center text-[13px] text-carbon/60">
                Este escaneo no se puede ver aquí: el fichero no trae un .glb completo. Descárgalo o ábrelo en Polycam.
              </p>
            ) : (
              <>
                {/* @ts-expect-error: model-viewer es un elemento web, no de React */}
                <model-viewer
                  ref={visor}
                  key={urlActiva}
                  src={urlActiva}
                  camera-controls=""
                  shadow-intensity="1"
                  style={{ width: "100%", height: "100%", background: "transparent" }}
                />
                <span className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-carbon/50">
                  Arrastra para girar · rueda para acercar
                </span>
              </>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={guardarCaptura} disabled={capturando || typeof urlActiva !== "string" || urlActiva === "cargando"} className={ajeno}>
              {capturando ? "Guardando…" : "Guardar captura"}
            </button>
            {typeof urlActiva === "string" && urlActiva !== "cargando" && (
              <a href={`${urlActiva}&download=${encodeURIComponent((escaneoActivo?.nombre ?? "escaneo").replace(/\.\w+$/, "") + ".glb")}`} className={ajenoClaro}>
                Descargar .glb (SketchUp)
              </a>
            )}
            {escaneoActivo?.descargar && !(typeof urlActiva === "string" && urlActiva !== "cargando") && (
              <a href={escaneoActivo.descargar} className={ajenoClaro}>
                Descargar el original
              </a>
            )}
            {escaneoActivo?.rutaPolycam && (
              <a href={escaneoActivo.rutaPolycam} target="_blank" rel="noreferrer" className={ajenoClaro}>
                Abrir en Polycam
              </a>
            )}
          </div>

          {captura ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-lima/40 bg-lima-soft p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={captura} alt="La captura" className="h-20 w-[120px] rounded-md border-2 border-[#c6dc9f] bg-[#fffaf0] object-cover" />
              <div className="text-[12.5px] leading-snug text-lima-dark">
                <b className="block text-[13px]">Esta es la que irá en la viabilidad</b>
                Si guardas otra, sustituye a esta.
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
              Falta la captura: gira el modelo hasta el ángulo bueno y pulsa <b>Guardar captura</b>. Va siempre en la viabilidad.
            </div>
          )}
        </div>

        {/* ===================== derecha: lo que escribe Alex ===================== */}
        <div className="rounded-2xl border border-black/5 bg-white px-[18px] py-4 shadow-sm">
          <div className={bloque + " grid grid-cols-2 gap-3"}>
            <label>
              <span className={etq}>
                Fecha de visita<span className={de}>del escaneo</span>
              </span>
              <input type="date" value={fecha} onChange={(x) => tocar(setFecha)(x.target.value)} className={campo + " mt-1"} />
            </label>
            <div>
              <span className={etq}>
                Proyecto<span className={de}>de la opp</span>
              </span>
              <div className="mt-1.5 text-[14px] text-carbon/85">{m.opp?.proyecto ?? <span className="text-amber-700/70">la opp no dice el tipo</span>}</div>
            </div>
          </div>

          <div className={bloque}>
            <span className={etq}>El 3D para la junta</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { v: false, t: "Lo cubre uno del catálogo" },
                { v: true, t: "Hace falta uno específico" },
              ].map((o) => (
                <label
                  key={String(o.v)}
                  className={
                    "flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13.5px] " +
                    (especifico === o.v ? "border-[#3f5f80] bg-ajeno-soft font-semibold" : "border-carbon/20 bg-white")
                  }
                >
                  <input type="radio" checked={especifico === o.v} onChange={() => tocar(setEspecifico)(o.v)} className="accent-[#3f5f80]" />
                  {o.t}
                </label>
              ))}
            </div>
            {!especifico && (
              <select value={modelo} onChange={(x) => tocar(setModelo)(x.target.value)} className={campo + " mt-2"}>
                <option value="">— elige cuál —</option>
                {m.catalogo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} · {c.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className={bloque}>
            <span className={etq}>Objeto del proyecto</span>
            <textarea rows={2} value={objeto} onChange={(x) => tocar(setObjeto)(x.target.value)} className={campo + " mt-1 resize-y"} />
          </div>

          <div className={bloque}>
            <span className={etq}>
              Descripción de las intervenciones{escaleras.length > 0 && <span className={de}>lo común, y una por escalera</span>}
            </span>
            <textarea rows={escaleras.length ? 2 : 4} value={descripcion} onChange={(x) => tocar(setDescripcion)(x.target.value)} className={campo + " mt-1 resize-y"} />
            {escaleras.map((e, i) => (
              <div key={e.accesoId} className="mt-2">
                <div className="mb-1 text-[12px] font-extrabold text-[#3f5f80]">{e.nombre}</div>
                <textarea
                  rows={3}
                  value={e.texto}
                  onChange={(x) => {
                    const t = x.target.value;
                    setEscaleras((l) => l.map((y, k) => (k === i ? { ...y, texto: t } : y)));
                    setSucio(true);
                  }}
                  className={campo + " resize-y"}
                />
              </div>
            ))}
          </div>

          {/* EL DINERO QUE PONE ALEX, POR LINEAS (Monica, 6-oct-2026).
              Era una sola cifra de PEM. "Imagina que incluimos aerotermia: eso es
              un precio como el PEM, que estimamos. Las lineas de Alex pueden ser
              UNA O VARIAS." Y el beneficio industrial y el IVA van POR LINEA
              para poder comparar cada estimacion con el presupuesto real.
              Los HONORARIOS no estan aqui: los pone el comercial despues. */}
          <div className={bloque}>
            <span className={etq}>Coste de ejecución de obra estimado</span>
            <div className="mt-1 space-y-1.5">
              {lineas.map((l, i) =>
                l.grupo !== "obra" ? null : (
                  <div key={i} className="grid grid-cols-[1fr_84px_auto_auto_92px_14px] items-center gap-x-1.5 text-[12px]">
                    <input
                      value={l.concepto}
                      onChange={(x) => cambiar(i, { concepto: x.target.value })}
                      placeholder="SATE · aerotermia · ascensor"
                      className={campo}
                    />
                    <input
                      value={l.importe}
                      onChange={(x) => cambiar(i, { importe: x.target.value })}
                      placeholder="320.000"
                      inputMode="decimal"
                      className={campo + " text-right"}
                    />
                    <span className="flex items-center gap-1 text-carbon/50">
                      +
                      <input
                        value={String(l.biPct)}
                        onChange={(x) => cambiar(i, { biPct: Number(x.target.value) || 0 })}
                        className="w-9 rounded border border-carbon/20 px-1 text-center"
                      />
                      % BI
                    </span>
                    <span className="flex items-center gap-1 text-carbon/50">
                      +
                      <input
                        value={String(l.ivaPct)}
                        onChange={(x) => cambiar(i, { ivaPct: Number(x.target.value) || 0 })}
                        className="w-9 rounded border border-carbon/20 px-1 text-center"
                      />
                      % IVA
                    </span>
                    <b className="text-right tabular-nums">
                      {totalDe(l) !== null ? eur(totalDe(l) as number) : "—"}
                    </b>
                    <button
                      type="button"
                      title="Quitar la línea"
                      onClick={() => { setLineas((ls) => ls.filter((_, n) => n !== i)); setSucio(true); }}
                      className="text-carbon/30 hover:text-alerta"
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
              <div className="flex items-baseline justify-between gap-2 border-t border-black/10 pt-1.5">
                <button
                  type="button"
                  onClick={() => { setLineas((ls) => [...ls, { grupo: "obra", concepto: "", importe: "", biPct: 19, ivaPct: 10 }]); setSucio(true); }}
                  className="text-[11.5px] font-semibold text-lima-dark hover:underline"
                >
                  + añadir obra
                </button>
                <span className="text-[13px] font-extrabold tabular-nums">
                  Total intervención, IVA incluido: {eur(suma("obra"))}
                </span>
              </div>
            </div>
          </div>

          {/* LAS TASAS. Van aparte y SIN IVA: "las tasas de ayuntamiento no
              llevan IVA". Y son varias -licencia, ICIO- y luego las de la ECU. */}
          <div className={bloque}>
            <span className={etq}>Tasas</span>
            <div className="mt-1 space-y-1.5">
              {lineas.map((l, i) =>
                l.grupo !== "tasas" ? null : (
                  <div key={i} className="grid grid-cols-[1fr_84px_auto_92px_14px] items-center gap-x-1.5 text-[12px]">
                    <input
                      value={l.concepto}
                      onChange={(x) => cambiar(i, { concepto: x.target.value })}
                      placeholder="licencia · ICIO"
                      className={campo}
                    />
                    <input
                      value={l.importe}
                      onChange={(x) => cambiar(i, { importe: x.target.value })}
                      placeholder="42.000"
                      inputMode="decimal"
                      className={campo + " text-right"}
                    />
                    <span className="text-[11px] text-carbon/40">sin IVA</span>
                    <b className="text-right tabular-nums">
                      {totalDe(l) !== null ? eur(totalDe(l) as number) : "—"}
                    </b>
                    <button
                      type="button"
                      title="Quitar la línea"
                      onClick={() => { setLineas((ls) => ls.filter((_, n) => n !== i)); setSucio(true); }}
                      className="text-carbon/30 hover:text-alerta"
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
              <div className="flex items-baseline justify-between gap-2 border-t border-black/10 pt-1.5">
                <button
                  type="button"
                  onClick={() => { setLineas((ls) => [...ls, { grupo: "tasas", concepto: "", importe: "", biPct: 0, ivaPct: 0 }]); setSucio(true); }}
                  className="text-[11.5px] font-semibold text-lima-dark hover:underline"
                >
                  + añadir tasa
                </button>
                <span className="text-[13px] font-bold tabular-nums">Total tasas: {eur(suma("tasas"))}</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-carbon/50">
              Los honorarios no van aquí: los pone el comercial al rematar, y salen de la hoja de encargo.
            </p>
          </div>

          <div className={bloque}>
            <span className={etq}>Conclusión</span>
            <textarea rows={2} value={conclusion} onChange={(x) => tocar(setConclusion)(x.target.value)} className={campo + " mt-1 resize-y"} />
          </div>

          {/* LOS CUATRO PAPELES. Ninguno se elige: salen de lo que ya pasó.
              Ella, 6-oct-2026: "trazabilidad de intervinientes: quién hizo la
              visita y el polycam, quién ve la viabilidad, quién la remató con
              los precios y el texto, y quién la firma". */}
          <div className={bloque}>
            <span className={etq}>Quién ha hecho qué</span>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
              {[
                ["Visitó y escaneó", m.papeles.visitaron.join(" · ")],
                ["Redacta", m.papeles.redacta],
                ["Remata", m.papeles.remata],
                ["Firma", m.papeles.firma],
              ].map(([que, quien]) => (
                <div key={que as string} className="flex items-baseline justify-between gap-2">
                  <span className="text-carbon/55">{que}</span>
                  <b className={quien ? "text-carbon" : "font-normal text-carbon/35"}>{quien || "todavía no"}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-3.5">
            <button
              type="button"
              disabled={pendiente || m.danielAvisado}
              onClick={() =>
                empezar(async () => {
                  const fallos = await accionAvisarDaniel(m.id, datos());
                  setSucio(false);
                  if (fallos.length) setError(`Apuntado, pero el correo no ha salido: ${fallos.join(" · ")}`);
                  router.refresh();
                })
              }
              className="whitespace-nowrap rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-[13px] font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
            >
              {m.danielAvisado ? "Daniel ya está avisado" : "Me he atascado: avisar a Daniel"}
            </button>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={pendiente}
                onClick={guardar}
                className="whitespace-nowrap rounded-xl border border-black/10 bg-white px-[18px] py-2.5 text-[14px] font-semibold text-carbon/75 transition hover:text-carbon disabled:opacity-50"
              >
                {pendiente ? "Guardando…" : "Guardar borrador"}
              </button>
              <button
                type="button"
                disabled={pendiente || m.enviada || !m.opp?.comercial}
                title={!m.opp?.comercial ? "La opp no tiene comercial asignado" : undefined}
                onClick={() =>
                  empezar(async () => {
                    const fallos = await accionEnviar(m.id, datos());
                    if (fallos.length) setError(fallos.join(" · "));
                  })
                }
                className="whitespace-nowrap rounded-xl bg-lima px-5 py-2.5 text-[14px] font-extrabold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50"
              >
                Enviar al comercial
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
