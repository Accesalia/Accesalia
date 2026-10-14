"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir } from "../../components/Elegir";
import type { Desglose } from "../../../lib/catalogoBloques";
import type { BloqueHoja, DatosHoja, Documento, Hoja, OpcionOpp } from "../../../lib/hojaEncargo";
import { CLAUSULA_ICIO, ESTILO_PAPEL, FORMAS_PAGO, esqueletoHoja, fechaLarga } from "../../../lib/hojaPapel";
import { accionApuntarFirmada, accionBorrador, accionEnlaceFirmada, accionEnviada, accionGenerar, accionPermisoFirmada } from "./acciones";
import { estadoDeHoja } from "../../../lib/estadoHoja";
import { columnasDeInteres } from "../../../lib/columnasInteres";

// LA PESTAÑA HOJA DE ENCARGO, tal cual la maqueta que Monica aprobo el 2-oct-2026
// (docs/figma/hoja-de-encargo.html):
//   1 · que han contratado (las seis etiquetas) y el importe total
//   2 · las hojas, cada una con su generada y su firmada, y el visor al lado
//   3 · generar o modificar: se despliega debajo, sin salir de la pantalla. A la
//       izquierda las casillas; a la derecha la hoja tal como saldra, que se
//       edita a mano haciendo clic en el texto.

const EUR = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: "always" });
const eur = (n: number) => EUR.format(Math.round(n * 100) / 100);
const aNumero = (v: string) => {
  const t = v.trim().replace(/\s|€/g, "");
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};


// "Que han contratado": las seis etiquetas de su esbozo, y que bloques
// encienden cada una. La subvencion vieja (accesibilidad / eficiencia) tambien.
const CONTRATADO: { texto: string; codigos: (c: string) => boolean }[] = [
  { texto: "Proyecto", codigos: (c) => c === "REDACCION PROYECTO" },
  { texto: "DO", codigos: (c) => c === "DF" },
  { texto: "CSS", codigos: (c) => c === "CSS" },
  { texto: "Subvención", codigos: (c) => c.startsWith("TRAMITACION SUBVENCIONES") },
  { texto: "IEE", codigos: (c) => c === "IEE" },
  { texto: "Memoria", codigos: (c) => c === "MEMORIA TECNICA" },
];

// La regla de la DF (2-oct-2026): sale incluida si la hoja lleva proyecto, y se
// cobra si no. Los ATAJOS (DF -> CFO, proyecto o consulta -> visado,
// subvenciones -> documentacion tecnica -> CEE + IEE + libro) estan en el
// catalogo: bloques.marca_tambien (14-oct-2026).
// LOS BLOQUES, POR AREA (Monica, 14-oct-2026: "ahora es un mar de palabras").
// El area es de cada bloque, en el catalogo (bloques.area).
const AREAS: { clave: string; titulo: string }[] = [
  { clave: "PRY", titulo: "Proyecto" },
  { clave: "OBR", titulo: "Obra" },
  { clave: "SUBV", titulo: "Subvenciones" },
  { clave: "IEE", titulo: "IEE" },
  { clave: "CAES", titulo: "CAES" },
  { clave: "FIN", titulo: "Financiación" },
  { clave: "3PPTOS", titulo: "3 presupuestos" },
];
const PROYECTO = "REDACCION PROYECTO";
const DF = "DF";
const LICENCIA = "TRAMITACION LICENCIAS";

type Actuacion = { clave: number; tipoId: string; accesoIds: string[] };
type Estado = {
  hojaId: string | null;
  titulo: string;
  oppId: string;
  aQuien: string; // "comunidad", "persona:<id>" (un particular) o el id de la contrata
  actuaciones: Actuacion[];
  on: Record<string, boolean>;
  modo: Record<string, Desglose>;
  imp: Record<string, string>;
  pago: Record<string, string>;
  /** El % de las lineas A EXITO (Subvenciones), retocable en cada hoja. */
  pct: Record<string, string>;
  /** EL TEXTO DE CADA LINEA, escrito UNA vez (Monica, 6-oct-2026): "proyecto de
   *  bajada a cota cero de 5 ascensores". Viaja a la hoja y a la viabilidad: una
   *  fuente, dos destinos. La clave CONJUNTO es la de la linea condensada. */
  texto: Record<string, string>;
  /** Que lineas van dentro del PROYECTO CONJUNTO. Cada una conserva su importe
   *  -el ascensor baja de 6.000 a 5.000 por ir conjunto- y la condensada es la
   *  suma. La hoja enseña las tres; la viabilidad, solo la suma. */
  junto: Record<string, boolean>;
  html: string | null;
  /** La version que saldra al generar. De la 2 en adelante pide el porque. */
  versionQueSale: number;
  /** POR QUE CAMBIA (Monica, 8-oct-2026): obligatorio de la version 2 en
   *  adelante. "Si no se pide, ¿como se va a poner?" */
  motivo: string;
};

const ETQ = "mb-[3px] block text-[10px] font-bold uppercase tracking-[.06em] text-carbon/70";
const TARJETA = "rounded-2xl border border-[#cfcfcf] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)]";
const TITULO = "text-xs font-bold uppercase tracking-[.08em] text-carbon/70";
const BTN = "rounded-xl border border-black/15 bg-white px-3.5 py-[7px] text-[13px] font-semibold text-carbon/80 transition hover:border-carbon disabled:opacity-50";
const BTN_PRIM = "rounded-xl border border-lima bg-lima px-3.5 py-[7px] text-[13px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50";
/** El secundario es un borde, como manda la guia de estilo. */
const BTN_SEC = "rounded-xl border border-black/15 bg-white px-3.5 py-[7px] text-[13px] font-semibold text-carbon/70 transition hover:border-carbon/40 disabled:opacity-50";
const CHIP = "inline-flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-[13px] font-semibold";
const DOC = "cursor-pointer rounded-lg border px-[9px] py-1 text-xs font-semibold";

export function HojasDeEncargo({
  opps,
  datos,
  aviso,
  abrirNueva,
}: {
  opps: OpcionOpp[];
  datos: DatosHoja | null;
  aviso: string | null;
  abrirNueva?: boolean;
}) {
  const router = useRouter();

  // ------------------------------------------------- sin oportunidad elegida
  // LA HOJA ES DE LA OPORTUNIDAD, no de la comunidad (Monica, 13-oct-2026).
  const selector = (
    <div className="mt-3 max-w-[560px]">
      <Elegir
        id="opp"
        nombre="Oportunidad"
        opciones={opps}
        valor={datos?.opp.id ?? ""}
        alElegir={(v) => v && router.push(`/comercial/hoja-encargo?opp=${v}`)}
        vacio="Elige la oportunidad…"
        conPista
        abrirAlMontar={!datos}
      />
    </div>
  );
  if (!datos)
    return (
      <>
        <h1 className="mt-2.5 text-[25px] font-bold leading-tight text-carbon">Hoja de encargo</h1>
        <p className="mt-1 text-[13px] text-carbon/65">Elige de qué oportunidad es la hoja.</p>
        {selector}
        {aviso && <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-amber-900">{aviso}</p>}
        {opps.length === 0 && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-amber-900">
            No hay oportunidades en tu cartera todavía.
          </p>
        )}
      </>
    );
  return <ConOpp datos={datos} selector={selector} abrirNueva={abrirNueva} />;
}

/** A quien va por defecto: su comunidad si la tiene; si no, el particular
 *  titular de sus accesos; si no, nadie (se elige). */
const aQuienPorDefecto = (d: DatosHoja) => (d.comunidad ? "comunidad" : d.personas[0] ? `persona:${d.personas[0].id}` : "");

function ConOpp({
  datos,
  selector,
  abrirNueva,
}: {
  datos: DatosHoja;
  selector: React.ReactNode;
  /** Se llega desde el boton "Hoja de encargo" del area comercial: el
   *  generador ya abierto, para esa oportunidad (9-oct-2026). */
  abrirNueva?: boolean;
}) {
  const router = useRouter();
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const opps = datos.oportunidades;
  const [oppId, setOppId] = useState<string>(datos.opp.id);
  const opp = opps.find((o) => o.id === oppId) ?? null;

  // ---------------------------------------------------------- lo contratado
  const hojas = datos.hojas;
  const contratado = CONTRATADO.map((c) => ({ ...c, on: hojas.some((h) => h.conceptos.some((k) => k.codigo && c.codigos(k.codigo))) }));
  const total = hojas.reduce((s, h) => s + h.importe, 0);

  // ------------------------------------------------------------------ visor
  const [visor, setVisor] = useState<{ titulo: string; src: string | null; clave: string } | null>(null);
  const ver = (h: Hoja, d: Documento) =>
    empezar(async () => {
      const clave = `${d.versionId}-${d.tipo}-${d.indice}`;
      const titulo = `Hoja ${h.numero} · ${d.tipo === "firmada" ? "firmada (PDF de la comunidad)" : d.etiqueta.toLowerCase()}`;
      if (d.enlace) return setVisor({ titulo, src: d.enlace, clave });
      setVisor({ titulo, src: null, clave });
      const src = await accionEnlaceFirmada(h.id, d.versionId, d.indice);
      setVisor({ titulo, src, clave });
    });
  // Al abrir, el visor enseña lo ultimo: la firmada si la hay, si no la generada.
  useEffect(() => {
    for (const h of [...hojas].reverse()) {
      const d = h.documentos.findLast((x) => x.tipo === "firmada") ?? h.documentos.findLast((x) => x.tipo === "generada");
      if (d) return ver(h, d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------- la firmada
  const subir = useRef<HTMLInputElement>(null);
  const [subiendoA, setSubiendoA] = useState<string | null>(null);
  const alSubir = (f: File | undefined) => {
    const hojaId = subiendoA;
    if (!f || !hojaId) return;
    empezar(async () => {
      setError(null);
      const p = await accionPermisoFirmada(hojaId, f.name);
      if (!p.ok) return setError(p.error);
      const put = await fetch(p.url, { method: "PUT", headers: { "Content-Type": f.type || "application/pdf", "x-upsert": "false" }, body: f });
      if (!put.ok) return setError("No se ha podido subir el fichero.");
      const r = await accionApuntarFirmada(hojaId, p.ruta);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  };

  // --------------------------------------------------------- el generador
  const [st, setSt] = useState<Estado | null>(null);
  const claveAct = useRef(1);
  const abrir = (h: Hoja | null) => {
    setError(null);
    const oppDeHoja = (h?.oportunidadId && opps.find((o) => o.id === h.oportunidadId)?.id) || oppId;
    const accesosOpp = opps.find((o) => o.id === oppDeHoja)?.accesos.map((a) => a.id) ?? [];
    const on: Record<string, boolean> = {};
    const modo: Record<string, Desglose> = {};
    const imp: Record<string, string> = {};
    const pago: Record<string, string> = {};
    const pct: Record<string, string> = {};
    const junto: Record<string, boolean> = {};
    // La clave de cada linea: el bloque, o bloque|actuacion si ese bloque da
    // varias (un proyecto por actuacion, 14-oct-2026).
    const cuantas = (id: string | null) => (h?.conceptos ?? []).filter((x) => x.bloqueId === id).length;
    const claveDe = (k: { bloqueId: string | null; tipoId: string | null }) =>
      cuantas(k.bloqueId) > 1 && k.tipoId ? `${k.bloqueId}|${k.tipoId}` : (k.bloqueId as string);
    for (const k of h?.conceptos ?? []) {
      // La linea del conjunto: su importe es el que se escribio (precio unico o
      // la suma), y vuelve tal cual.
      if (k.esConjunto && k.importe != null) imp.CONJUNTO = EUR.format(k.importe);
      if (!k.bloqueId || !datos.bloques.some((b) => b.id === k.bloqueId)) continue;
      const c = claveDe(k);
      if (k.enConjunto) junto[c] = true;
      on[k.bloqueId] = true;
      if (k.desglose) modo[k.bloqueId] = k.desglose;
      if (k.importe != null) imp[c] = EUR.format(k.importe);
      if (k.formaPago) pago[c] = k.formaPago;
      if (k.porcentaje != null) pct[k.bloqueId] = EUR.format(k.porcentaje);
    }
    const acts = h?.actuaciones.length
      ? h.actuaciones.map((a) => ({ clave: claveAct.current++, tipoId: a.tipoId, accesoIds: a.accesoIds }))
      : [{ clave: claveAct.current++, tipoId: "", accesoIds: accesosOpp }];
    setSt({
      hojaId: h?.id ?? null,
      // Si la ultima es un borrador, se sigue ESE: no sale una version mas.
      titulo: h
        ? h.version?.borrador
          ? `Seguir el borrador · hoja ${h.numero}${h.codigo ? ` (${h.codigo})` : ""} · ${h.titulo} (versión ${h.version.numero})`
          : `Modificar hoja ${h.numero}${h.codigo ? ` (${h.codigo})` : ""} · ${h.titulo} (saldrá la versión ${(h.version?.numero ?? 0) + 1})`
        : "Nueva hoja de encargo",
      oppId: oppDeHoja,
      aQuien:
        h?.pagadorTipo === "contrata" && h.contrataId
          ? h.contrataId
          : h?.pagadorTipo === "persona" && h.personaId
            ? `persona:${h.personaId}`
            : h?.pagadorTipo === "comunidad" && datos.comunidad
              ? "comunidad"
              : aQuienPorDefecto(datos),
      actuaciones: acts,
      on,
      modo,
      imp,
      pago,
      pct,
      texto: Object.fromEntries(
        (h?.conceptos ?? [])
          .filter((k) => k.descripcion && (k.bloqueId || k.esConjunto))
          .map((k) => [k.esConjunto ? "CONJUNTO" : claveDe(k), k.descripcion as string]),
      ),
      junto,
      html: h?.version?.html ?? null,
      versionQueSale: h ? (h.version?.borrador ? h.version.numero : (h.version?.numero ?? 0) + 1) : 1,
      // Si se sigue un borrador, el porque que ya se escribio vuelve.
      motivo: h?.version?.borrador ? h.version.motivo ?? "" : "",
    });
    setTimeout(() => document.getElementById("generador")?.scrollIntoView({ behavior: "smooth" }), 50);
  };
  // Desde el boton "Hoja de encargo": el generador, abierto de salida.
  useEffect(() => {
    if (abrirNueva && oppId) abrir(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cerrar = () => {
    if (!confirm("¿Cierras sin generar? Lo que hayas cambiado en esta hoja se pierde.")) return;
    setSt(null);
  };

  return (
    <>
      {/* ---------------- cabecera ---------------- */}
      {selector}
      <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">{datos.opp.nombre}</h1>
      <p className="mt-1 text-[13px] text-carbon/65">
        {opp?.codigo && <b className="text-carbon/85">{opp.codigo}</b>}
        {opp?.codigo && " · "}
        {opp?.comercial ?? "sin comercial"} · Hoja de encargo
      </p>
      {opps.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/60">Oportunidad</span>
          {opps.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOppId(o.id)}
              className={
                "rounded-full border px-3 py-1 text-xs transition " +
                (o.id === oppId ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/70 hover:border-lima")
              }
            >
              {o.codigo ?? o.nombre ?? "sin código"} · {o.estado}
            </button>
          ))}
        </div>
      )}

      {/* ---------------- 1 · lo contratado ---------------- */}
      <section className={TARJETA + " mt-4 flex flex-wrap items-center justify-between gap-4"}>
        <div>
          <div className={TITULO + " mb-2.5"}>Qué han contratado</div>
          <div className="flex flex-wrap gap-2">
            {contratado.map((c) => (
              <span key={c.texto} className={CHIP + " " + (c.on ? "border-lima bg-lima-soft text-lima-dark" : "border-black/10 bg-white text-carbon/45")}>
                {c.on && "✓"} {c.texto}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className={TITULO}>Importe total</div>
          <div className="text-2xl font-extrabold">{eur(total)} € + IVA</div>
          <div className="text-xs text-carbon/65">
            {eur(total * 1.21)} € IVA incluido · suma de {hojas.length === 1 ? "la hoja" : `las ${hojas.length} hojas`}
          </div>
        </div>
      </section>

      {/* ---------------- 2 · las hojas + el visor ---------------- */}
      <section className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className={TARJETA + " lg:w-[46%] lg:shrink-0"}>
          <div className="mb-2.5 flex items-center justify-between">
            <div className={TITULO}>Hojas de encargo</div>
            <button type="button" className={BTN_PRIM} disabled={!opp || ocupado} onClick={() => abrir(null)}>
              + Generar nueva hoja
            </button>
          </div>
          {hojas.length === 0 && <p className="py-6 text-center text-carbon/60">Esta oportunidad aún no tiene ninguna hoja.</p>}
          {hojas.map((h) => {
            // Un borrador se dice: no tiene PDF, no ha salido y no se marca enviado.
            const enBorrador = !!h.version?.borrador;
            const e = estadoDeHoja(h.estado, enBorrador);
            const abierta = st?.hojaId === h.id;
            // La firmada va con la ultima version GENERADA (la que tiene PDF).
            const ultimaGenerada = h.documentos.filter((d) => d.tipo === "generada").at(-1)?.versionId ?? null;
            const firmadaDeUltima = h.documentos.some((d) => d.tipo === "firmada" && d.versionId === ultimaGenerada);
            return (
              <div key={h.id} className={"mb-2 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-xl border px-3 py-2.5 " + (abierta ? "border-lima bg-lima-soft" : "border-[#e4e4e4]")}>
                <div>
                  <span className="font-bold">
                    Hoja {h.numero}
                    {/* El codigo, para seguirla (9-oct-2026). */}
                    {h.codigo && <span className="ml-1.5 rounded-md bg-carbon/[0.06] px-1.5 py-px font-mono text-[12px] text-carbon/80">{h.codigo}</span>}
                    {" · "}
                    {h.titulo}
                  </span>{" "}
                  <span className={"rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.06em] " + e.clase}>{e.texto}</span>
                  {enBorrador && h.estado !== "borrador" && (
                    <span className="ml-1.5 rounded-full border border-dashed border-carbon/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.06em] text-carbon/60">
                      + borrador
                    </span>
                  )}
                  {h.estado === "borrador" && !enBorrador && ultimaGenerada && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => empezar(async () => { const r = await accionEnviada(h.id); if (!r.ok) setError(r.error); else router.refresh(); })}
                      className="ml-2 text-[11px] font-semibold text-lima-dark underline-offset-2 hover:underline"
                    >
                      marcar enviada
                    </button>
                  )}
                  <div className="text-xs text-carbon/65">
                    {h.version ? `Versión ${h.version.numero}${enBorrador ? " (borrador, sin PDF)" : ""}` : "Sin versión"}
                    {h.fecha && ` · ${new Date(h.fecha).toLocaleDateString("es-ES")}`} · {h.aQuien}
                    {h.importe > 0 && ` · ${eur(h.importe)} € + IVA`}
                  </div>
                </div>
                <button type="button" className={BTN} disabled={ocupado} onClick={() => abrir(h)}>
                  {enBorrador ? "Seguir el borrador" : "Modificar"}
                </button>
                <div className="col-span-2 flex flex-wrap gap-1.5">
                  {h.documentos.map((d) => {
                    const clave = `${d.versionId}-${d.tipo}-${d.indice}`;
                    return (
                      <button
                        key={clave}
                        type="button"
                        onClick={() => ver(h, d)}
                        className={DOC + " border-lima/60 bg-lima-soft text-lima-dark " + (visor?.clave === clave ? "outline-2 outline-carbon outline" : "")}
                      >
                        📄 {d.etiqueta}
                      </button>
                    );
                  })}
                  {ultimaGenerada && !firmadaDeUltima && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => { setSubiendoA(h.id); subir.current?.click(); }}
                      title="Subir el PDF firmado que manda la comunidad"
                      className={DOC + " border-lima/30 bg-white text-lima-dark/70 hover:border-lima"}
                    >
                      📄 Firmada (falta) · subir
                    </button>
                  )}
                </div>
                {/* Por que cambio cada version (Monica, 8-oct-2026). */}
                {h.cambios.length > 0 && (
                  <div className="col-span-2 flex flex-col gap-0.5 border-t border-black/[0.06] pt-1.5 text-xs text-carbon/75">
                    {h.cambios.map((c) => (
                      <p key={c.numero}>
                        <b className="text-carbon/85">Cambio v{c.numero}:</b> {c.motivo}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <input
            ref={subir}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => { alSubir(e.target.files?.[0]); e.target.value = ""; }}
          />
          {error && <p className="mt-2 text-[13px] font-semibold text-alerta">{error}</p>}
        </div>

        <div className={TARJETA + " flex min-h-[420px] flex-1 flex-col"}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <div className={TITULO}>{visor?.titulo ?? "Visor"}</div>
            {visor?.src && (
              <span className="text-[11px] text-carbon/60">
                solo ver ·{" "}
                <a href={visor.src} target="_blank" rel="noreferrer" className="underline">
                  abrir en pestaña aparte ↗
                </a>
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden rounded-xl bg-[#e9e9e6]">
            {visor?.src ? (
              <iframe key={visor.src} src={visor.src} title={visor.titulo} className="h-full min-h-[420px] w-full border-0" />
            ) : (
              <p className="p-10 text-center text-carbon/60">{visor ? "Abriendo…" : "Pincha en un documento de la lista para verlo aquí."}</p>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- 3 · generar / modificar ---------------- */}
      {st && (
        <Generador
          key={(st.hojaId ?? "nueva") + st.titulo}
          inicial={st}
          datos={datos}
          claveAct={claveAct}
          alCerrar={cerrar}
          alGenerar={(versionId, borrador) => {
            setSt(null);
            // Un borrador no tiene PDF: no hay nada que abrir (14-oct-2026).
            if (!borrador) window.open(`/comercial/hoja-encargo/pdf/${versionId}`, "_blank");
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ===================================================================== generador

function Generador({
  inicial,
  datos,
  claveAct,
  alCerrar,
  alGenerar,
}: {
  inicial: Estado;
  datos: DatosHoja;
  claveAct: React.MutableRefObject<number>;
  alCerrar: () => void;
  alGenerar: (versionId: string, borrador: boolean) => void;
}) {
  const [st, setSt] = useState<Estado>(inicial);
  const [ocupado, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const papel = useRef<HTMLDivElement>(null);

  const opp = datos.oportunidades.find((o) => o.id === st.oppId) ?? null;
  const accesos = opp?.accesos ?? [];
  const bloques = datos.bloques;
  const porCodigo = (c: string) => bloques.find((b) => b.codigo === c);
  const marcado = (c: string) => {
    const b = porCodigo(c);
    return !!b && !!st.on[b.id];
  };
  const modoDe = (b: BloqueHoja): Desglose => {
    if (st.modo[b.id]) return st.modo[b.id];
    if (b.codigo === DF) return marcado(PROYECTO) ? "incluido" : "se_cobra";
    return b.desglose;
  };
  // A EXITO (Subvenciones): sin importe fijo, un % de lo concedido que SALE en la
  // hoja, en el desglose y en la forma de pago (Monica, 14-oct-2026).
  const exitoDe = (b: BloqueHoja) => (b.exito && modoDe(b) === "se_cobra" ? b.exito : null);
  const pctDe = (b: BloqueHoja) => aNumero(st.pct[b.id] ?? (b.exito ? EUR.format(b.exito.porcentaje) : "")) ?? 0;
  const textoExito = (b: BloqueHoja) =>
    `${eur(pctDe(b))} % de ${b.exito?.base ?? "la base"}, a la ${MOMENTO[b.exito?.hito ?? ""] ?? b.exito?.hito ?? ""}`;

  // UN PROYECTO POR ACTUACION (paso 2, Monica 14-oct-2026). Un bloque de
  // naturaleza proyecto (redaccion, memoria, modificacion) da una linea por cada
  // actuacion de la cabecera: rampa, fotovoltaica, aerotermia... Con una sola,
  // una linea, como siempre. Los demas -visado y licencia incluidos- van una vez
  // por hoja aunque haya varios proyectos.
  const tiposCab = [...new Set(st.actuaciones.map((a) => a.tipoId).filter(Boolean))];
  const nombreTipo = (id: string) => datos.tipos.find((t) => t.id === id)?.nombre ?? "";
  const lineasDe = (b: BloqueHoja): Linea[] =>
    b.naturaleza === "proyecto" && tiposCab.length >= 2
      ? tiposCab.map((t) => ({ clave: `${b.id}|${t}`, b, tipoId: t, tipo: nombreTipo(t) }))
      : [{ clave: b.id, b, tipoId: b.naturaleza === "proyecto" && tiposCab.length === 1 ? tiposCab[0] : null, tipo: null }];
  const importeDe = (l: Linea) =>
    exitoDe(l.b) ? 0 : aNumero(st.imp[l.clave] ?? (l.b.importe != null ? EUR.format(l.b.importe) : "")) ?? 0;
  const pagoDe = (l: Linea) => st.pago[l.clave] ?? st.pago[l.b.id] ?? l.b.formaPagoDefecto ?? FORMAS_PAGO[0];

  const marcados = bloques.filter((b) => st.on[b.id]);
  const conLinea = marcados.filter((b) => modoDe(b) !== "no_aparece").flatMap(lineasDe);
  // Los que no tienen texto (inicio de obra, visado) no son "solo texto": no salen.
  const soloTexto = marcados.filter((b) => modoDe(b) === "no_aparece" && (b.titulo || b.puntos.length));
  const cobrados = conLinea.filter((l) => modoDe(l.b) === "se_cobra");
  // Lo que se añade al total en letra: "+ 3 % de lo concedido".
  const masExito = cobrados
    .filter((l) => exitoDe(l.b))
    .map((l) => ` + ${eur(pctDe(l.b))} % de ${l.b.exito?.base ?? "la base"}`)
    .join("");
  // Las que el comercial ha marcado como parte de un proyecto conjunto.
  const enConjunto = cobrados.filter((l) => st.junto[l.clave]);
  const sumaConjunto = enConjunto.reduce((s, l) => s + importeDe(l), 0);
  // El conjunto existe con dos o mas lineas. Su importe es el escrito (precio
  // unico) o, si no se toca, la suma de las de dentro.
  const hayConjunto = enConjunto.length >= 2;
  const importeConjunto = hayConjunto ? aNumero(st.imp.CONJUNTO ?? "") ?? sumaConjunto : 0;
  const dentro = (l: Linea) => hayConjunto && !!st.junto[l.clave];
  // LO QUE SE COBRA: las lineas sueltas + el conjunto. Las de dentro no suman:
  // su precio ya esta en el del conjunto.
  const total = cobrados.filter((l) => !dentro(l)).reduce((s, l) => s + importeDe(l), 0) + importeConjunto;
  // Como se llama cada linea en el documento: el texto escrito una vez por el
  // comercial, o si no hay, el titulo del bloque (y de que actuacion es).
  const nombreLinea = (l: Linea) => (st.texto[l.clave] ?? "").trim() || frase(l.b.titulo) + (l.tipo ? ` de ${l.tipo.toLowerCase()}` : "");
  const nombreConjunto = (st.texto.CONJUNTO ?? "").trim() || "Proyecto conjunto: " + enConjunto.map((l) => nombreLinea(l)).join(" + ");
  // POR SEPARADO O CONJUNTO, de un golpe: las lineas de proyecto que se cobran.
  // Cada una sigue teniendo su casilla, por si una va aparte.
  const deProyecto = cobrados.filter((l) => l.b.naturaleza === "proyecto");
  const todasJuntas = deProyecto.length >= 2 && deProyecto.every((l) => st.junto[l.clave]);

  const contrata = datos.contratas.find((c) => c.id === st.aQuien) ?? null;
  const persona = st.aQuien.startsWith("persona:") ? datos.personas.find((x) => `persona:${x.id}` === st.aQuien) ?? null : null;
  // El DNI del particular no esta en la app: su casilla sale en blanco y se escribe en la hoja.
  const razon = st.aQuien === "comunidad" ? datos.comunidad?.nombre ?? "" : persona ? persona.nombre : contrata?.nombre ?? "";
  const cif = st.aQuien === "comunidad" ? datos.comunidad?.cif ?? "" : persona ? "" : contrata?.cif ?? "";

  const poner = (cambio: Partial<Estado>) => setSt((s) => ({ ...s, ...cambio }));
  // ATAJOS (catalogo, bloques.marca_tambien): al MARCAR un bloque se marcan los
  // suyos, y los de esos (subvenciones -> doc. tecnica -> CEE, IEE, libro). Solo
  // atajan: desmarcar no arrastra nada, y cada uno se puede quitar a mano.
  const toggle = (b: BloqueHoja) =>
    setSt((s) => {
      const on = { ...s.on, [b.id]: !s.on[b.id] };
      const modo = { ...s.modo };
      const marcar = (x: BloqueHoja, visto: Set<string>) => {
        for (const id of x.marcaTambien) {
          if (visto.has(id)) continue;
          visto.add(id);
          const y = bloques.find((z) => z.id === id);
          if (!y) continue;
          if (!on[id]) {
            on[id] = true;
            if (x.marcaComo) modo[id] = x.marcaComo;
          }
          marcar(y, visto);
        }
      };
      if (on[b.id]) marcar(b, new Set([b.id]));
      return { ...s, on, modo };
    });
  // Un bloque que no va suelto (el visado) solo se puede marcar si esta marcado
  // alguno que lo arrastra.
  const arrastrado = (b: BloqueHoja) => bloques.some((x) => st.on[x.id] && x.marcaTambien.includes(b.id));

  // -------------------------------------------- el papel: montarlo una vez
  useEffect(() => {
    const p = papel.current;
    if (!p) return;
    p.innerHTML = inicial.html ?? esqueletoHoja();
    p.contentEditable = "true";
    // Lo que se rellena desde las casillas no se edita en el papel: se cambia
    // a la izquierda (si no, se pisaria al tocar una casilla).
    for (const k of ["cab", "desglose", "pago"]) {
      const el = p.querySelector<HTMLElement>(`[data-p="${k}"]`);
      if (el) {
        el.contentEditable = "false";
        el.title = "Se cambia en las casillas de la izquierda";
      }
    }
    const fecha = p.querySelector<HTMLElement>('[data-p="fecha"]');
    if (fecha) fecha.textContent = fechaLarga();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------- el conforme: cuando cambia a quien va
  useEffect(() => {
    const p = papel.current;
    if (!p) return;
    const r = p.querySelector<HTMLElement>('[data-p="razon"]');
    const c = p.querySelector<HTMLElement>('[data-p="cif"]');
    // Al abrir una hoja ya generada se respeta lo que se escribio a mano.
    if (r && (!inicial.html || st.aQuien !== inicial.aQuien)) r.textContent = razon;
    if (c && (!inicial.html || st.aQuien !== inicial.aQuien)) c.textContent = cif;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.aQuien]);

  // ------------------------------------- lo demas: cada vez que se toca algo
  useEffect(() => {
    const p = papel.current;
    if (!p) return;

    const cab = p.querySelector<HTMLElement>('[data-p="cab"]');
    if (cab)
      cab.innerHTML = st.actuaciones
        .map((a) => {
          const tipo = datos.tipos.find((t) => t.id === a.tipoId)?.nombre ?? "…";
          const donde = accesos.filter((x) => a.accesoIds.includes(x.id)).map((x) => x.texto).join(" · ") || "…";
          return `<div>Proyecto para <b>${esc(tipo)}</b> en edificio residencial existente en: <b>${esc(donde)}</b>${datos.municipio ? ", " + esc(datos.municipio) : ""}</div>`;
        })
        .join("");

    // Los parrafos se añaden y se quitan SIN tocar los demas: lo que se haya
    // editado a mano en un bloque se queda.
    const cont = p.querySelector<HTMLElement>('[data-p="bloques"]');
    if (cont) {
      // Un bloque de proyecto con varias actuaciones da UN PARRAFO POR PROYECTO,
      // o uno solo si todas sus lineas van en el conjunto (14-oct-2026). SIN
      // TEXTO NO SALE NADA: el inicio de obra y el visado existen por debajo y
      // abren su trabajo, pero la comunidad no los lee.
      const parrafos: { clave: string; orden: number; titulo: string; puntos: string[] }[] = [];
      bloques.forEach((b, i) => {
        if (!st.on[b.id] || (!b.titulo && !b.puntos.length)) return;
        const ls = lineasDe(b);
        if (!ls.some((l) => l.tipo)) return void parrafos.push({ clave: b.id, orden: i, titulo: b.titulo, puntos: b.puntos });
        if (modoDe(b) === "se_cobra" && ls.every((l) => st.junto[l.clave]))
          return void parrafos.push({
            clave: `${b.id}|C|${ls.map((l) => l.tipoId).join(",")}`,
            orden: i,
            titulo: `${b.titulo} CONJUNTO DE ${enLista(ls.map((l) => (l.tipo ?? "").toUpperCase()))}`,
            puntos: b.puntos,
          });
        ls.forEach((l, j) => parrafos.push({ clave: l.clave, orden: i + (j + 1) / 100, titulo: `${b.titulo} DE ${(l.tipo ?? "").toUpperCase()}`, puntos: b.puntos }));
      });
      const quedan = new Set(parrafos.map((x) => x.clave));
      cont.querySelectorAll<HTMLElement>("[data-c]").forEach((el) => {
        if (!quedan.has(el.dataset.c ?? "")) el.remove();
      });
      for (const x of parrafos) {
        if ([...cont.querySelectorAll<HTMLElement>("[data-c]")].some((el) => el.dataset.c === x.clave)) continue;
        const el = document.createElement("div");
        el.className = "bloque";
        el.dataset.c = x.clave;
        el.dataset.i = String(x.orden);
        el.innerHTML = `<b>${esc(x.titulo)}</b>` + (x.puntos.length ? `<ul>${x.puntos.map((y) => `<li>${esc(y.replace(/^•\s*/, ""))}</li>`).join("")}</ul>` : "");
        const sig = [...cont.children].find((y) => Number((y as HTMLElement).dataset.i) > x.orden) ?? null;
        cont.insertBefore(el, sig);
      }
    }

    // EL DESGLOSE. "La hoja desglosa": si hay proyecto conjunto, sale su linea
    // con su precio y, debajo y sangradas, las que lo forman -con su precio si
    // lo tienen, o "incluido en el conjunto" si va a precio unico-.
    const des = p.querySelector<HTMLElement>('[data-p="desglose"]');
    const precio = (n: number) => `${eur(n)} € + ${eur(n * 0.21)} IVA = ${eur(n * 1.21)} €`;
    if (des) {
      const filas: string[] = [];
      if (hayConjunto) {
        filas.push(`<tr><td><b>${esc(nombreConjunto)}</b></td><td class="r"><b>${precio(importeConjunto)}</b></td></tr>`);
        for (const l of enConjunto) {
          const n = importeDe(l);
          filas.push(`<tr><td style="padding-left:16px">${esc(nombreLinea(l))}</td><td class="r">${n > 0 ? precio(n) : "<i>incluido en el conjunto</i>"}</td></tr>`);
        }
      }
      for (const l of conLinea) {
        if (dentro(l)) continue;
        const valor = exitoDe(l.b)
          ? `${eur(pctDe(l.b))} % de ${esc(l.b.exito?.base ?? "")} + IVA`
          : modoDe(l.b) === "se_cobra" ? precio(importeDe(l)) : "<i>incluido</i>";
        filas.push(`<tr><td>${esc(nombreLinea(l))}</td><td class="r">${valor}</td></tr>`);
      }
      des.innerHTML = `<table>${filas.join("")}</table>` + `<div class="totalbanda">Total Honorarios Profesionales: ${eur(total)} €${esc(masExito)} + IVA</div>`;
    }

    const icio = p.querySelector<HTMLElement>('[data-p="icio"]');
    if (icio) {
      const lleva = marcado(LICENCIA);
      if (lleva && !icio.innerHTML.trim()) icio.innerHTML = CLAUSULA_ICIO;
      if (!lleva) icio.innerHTML = "";
    }

    const pago = p.querySelector<HTMLElement>('[data-p="pago"]');
    if (pago)
      // Se paga lo que se cobra: el conjunto como una sola cosa (con la forma de
      // pago de su primera linea) y cada linea suelta con la suya.
      pago.innerHTML = cobrados.length
        ? `<p style="margin-top:12px"><b><u>Forma de Pago de Honorarios:</u></b></p><ul class="pago">${[
            ...(hayConjunto ? [`<li>${esc(nombreConjunto)}: ${esc(pagoDe(enConjunto[0]))}</li>`] : []),
            ...cobrados.filter((l) => !dentro(l)).map((l) => `<li>${esc(nombreLinea(l))}: ${esc(exitoDe(l.b) ? textoExito(l.b) : pagoDe(l))}</li>`),
          ].join("")}</ul>`
        : "";
  });

  const generar = (borrador = false) =>
    empezar(async () => {
      setError(null);
      const p = papel.current;
      if (!p) return;
      const copia = p.cloneNode(true) as HTMLElement;
      copia.querySelectorAll("[contenteditable]").forEach((x) => x.removeAttribute("contenteditable"));
      copia.querySelectorAll("[title]").forEach((x) => x.removeAttribute("title"));
      const r = await (borrador ? accionBorrador : accionGenerar)({
        hojaId: st.hojaId,
        oportunidadId: st.oppId,
        aQuien:
          st.aQuien === "comunidad"
            ? { tipo: "comunidad" }
            : st.aQuien.startsWith("persona:")
              ? { tipo: "persona", id: st.aQuien.slice("persona:".length) }
              : { tipo: "contrata", id: st.aQuien },
        actuaciones: st.actuaciones.map((a) => ({ tipoId: a.tipoId, accesoIds: a.accesoIds })),
        // Un concepto por linea: un bloque de proyecto, uno por actuacion.
        conceptos: marcados.flatMap(lineasDe).map((l) => ({
          bloqueId: l.b.id,
          tipoId: l.tipoId,
          desglose: modoDe(l.b),
          importe: modoDe(l.b) === "se_cobra" && !exitoDe(l.b) ? importeDe(l) : null,
          porcentaje: exitoDe(l.b) ? pctDe(l.b) : null,
          formaPago: modoDe(l.b) === "se_cobra" ? (exitoDe(l.b) ? textoExito(l.b) : pagoDe(l)) : null,
          // El texto de la linea, escrito una vez: va a la hoja y a la viabilidad.
          // Si es de una actuacion, su nombre la distingue de las demas.
          texto: (st.texto[l.clave] ?? "").trim() || (l.tipo ? nombreLinea(l) : null),
          enConjunto: dentro(l) && modoDe(l.b) === "se_cobra",
        })),
        // La linea condensada, si la hay. Su importe puede NO ser la suma: "a
        // veces el proyecto conjunto tiene un precio unico, y otras se desglosa".
        conjunto: hayConjunto ? { texto: (st.texto.CONJUNTO ?? "").trim() || null, importe: importeConjunto } : null,
        html: copia.innerHTML,
        motivoCambio: st.versionQueSale > 1 ? st.motivo.trim() || null : null,
      });
      if (!r.ok) return setError(r.error);
      alGenerar(r.versionId, borrador);
    });

  const opcionesTipo = datos.tipos.map((t) => ({ valor: t.id, texto: t.nombre }));
  // "Que se hace" en las cuatro columnas del alta de la opp (14-oct-2026).
  const gruposTipo = columnasDeInteres(datos.tipos);
  // Los bloques por area; uno sin area (uno nuevo del catalogo) sale al final.
  const porArea = [...AREAS, { clave: "", titulo: "Otros" }]
    .map((a) => ({ ...a, bloques: bloques.filter((b) => (a.clave ? b.area === a.clave : !AREAS.some((x) => x.clave === b.area))) }))
    .filter((a) => a.bloques.length);
  // A quien va: su comunidad (si la tiene), el particular titular de sus accesos
  // o una contrata. Tener CP no es condicion para hacer la hoja (13-oct-2026).
  const opcionesAQuien = [
    ...(datos.comunidad ? [{ valor: "comunidad", texto: datos.comunidad.nombre, pista: datos.comunidad.cif ?? "sin CIF" }] : []),
    ...datos.personas.map((x) => ({ valor: `persona:${x.id}`, texto: x.nombre, pista: "particular, titular" })),
    ...datos.contratas.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.cif ?? "contrata" })),
  ];

  return (
    <section id="generador" className="mt-4 rounded-[18px] border border-[#b9d9a0] bg-form p-4">
      <style>{ESTILO_PAPEL}</style>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{st.titulo}</h2>
        <div className="flex items-center gap-2">
          {error && <span className="max-w-[420px] text-right text-[13px] font-semibold text-alerta">{error}</span>}
          <button type="button" className={BTN} disabled={ocupado} onClick={alCerrar}>
            Cancelar
          </button>
          {/* GUARDAR COMO BORRADOR: guarda sin generar el PDF, "para no perder
              los datos NI generar el pdf". Mientras no hay PDF, la hoja sigue
              viva y no ha salido de Accesalia. */}
          <button
            type="button"
            className={BTN_SEC}
            disabled={ocupado}
            title="Guarda lo que llevas sin generar el documento"
            onClick={() => generar(true)}
          >
            Guardar como borrador
          </button>
          <button
            type="button"
            className={BTN_PRIM}
            disabled={ocupado || (st.versionQueSale > 1 && !st.motivo.trim())}
            title={st.versionQueSale > 1 && !st.motivo.trim() ? "Escribe por qué cambia esta versión" : undefined}
            onClick={() => generar()}
          >
            {ocupado ? "Generando…" : "Generar hoja (PDF)"}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(430px,40%)_1fr]">
        <div className="flex flex-col gap-3">
          {/* ---------- por que cambia: de la version 2 en adelante ---------- */}
          {st.versionQueSale > 1 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <label htmlFor="motivo" className={TITULO + " mb-1.5 block text-amber-900"}>
                Por qué cambia · versión {st.versionQueSale}
              </label>
              <textarea
                id="motivo"
                rows={2}
                value={st.motivo}
                onChange={(e) => poner({ motivo: e.target.value })}
                placeholder="El administrador pide quitar el estudio de seguridad…"
                className="w-full resize-y rounded-[10px] border border-carbon/25 bg-white px-3 py-2 text-[14px] text-carbon outline-none focus:border-lima-dark focus:ring-2 focus:ring-lima/40"
              />
              <p className="mt-1 text-[11px] text-amber-900/80">Obligatorio para generar. Queda en la hoja y en el diario de la oportunidad.</p>
            </div>
          )}
          {/* ---------- cabecera ---------- */}
          <div className="rounded-2xl border border-[#cfcfcf] bg-form-card p-4">
            <div className={TITULO + " mb-2.5"}>Cabecera</div>
            <Elegir id="aquien" nombre="A quién" opciones={opcionesAQuien} valor={st.aQuien} alElegir={(v) => poner({ aQuien: v || aQuienPorDefecto(datos) })} conPista />
            <span className={ETQ + " mt-2.5"}>Qué + dónde</span>
            {st.actuaciones.map((a, i) => (
              <div key={a.clave} className="mb-1.5 grid grid-cols-[1fr_1fr_24px] items-start gap-2">
                <Elegir
                  id={`tipo-${a.clave}`}
                  nombre=""
                  opciones={opcionesTipo}
                  grupos={gruposTipo}
                  valor={a.tipoId}
                  vacio="Qué se hace…"
                  alElegir={(v) => poner({ actuaciones: st.actuaciones.map((x) => (x.clave === a.clave ? { ...x, tipoId: v } : x)) })}
                />
                <Donde
                  accesos={accesos}
                  elegidos={a.accesoIds}
                  alCambiar={(ids) => poner({ actuaciones: st.actuaciones.map((x) => (x.clave === a.clave ? { ...x, accesoIds: ids } : x)) })}
                />
                {st.actuaciones.length > 1 ? (
                  <button type="button" title="quitar" className="pt-1.5 text-base text-carbon/50 hover:text-carbon" onClick={() => poner({ actuaciones: st.actuaciones.filter((_, k) => k !== i) })}>
                    ×
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            <button
              type="button"
              className="py-0.5 text-xs font-semibold text-lima-dark disabled:opacity-40"
              disabled={st.actuaciones.some((a) => !a.tipoId)}
              onClick={() => poner({ actuaciones: [...st.actuaciones, { clave: claveAct.current++, tipoId: "", accesoIds: accesos.map((x) => x.id) }] })}
            >
              + añadir otra actuación
            </button>
            <div className="mt-2 text-[13px]">
              <span className={ETQ + " !inline"}>Fecha</span> {fechaLarga()} <small className="text-carbon/60">· la de hoy, sola</small>
            </div>
          </div>

          {/* ---------- que incluye ---------- */}
          <div className="rounded-2xl border border-[#cfcfcf] bg-form-card p-4">
            <div className={TITULO + " mb-2.5"}>Qué incluye</div>
            <div className="flex flex-col gap-2">
            {porArea.map((a) => (
            <div key={a.clave} className="grid grid-cols-[96px_1fr] items-start gap-2">
              <span className="pt-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#237812]">{a.titulo}</span>
            <div className="flex flex-wrap gap-1.5">
              {a.bloques.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b)}
                  disabled={!b.suelto && !st.on[b.id] && !arrastrado(b)}
                  title={
                    b.suelto
                      ? undefined
                      : "No se contrata suelto: va con " +
                        bloques.filter((x) => x.marcaTambien.includes(b.id)).map((x) => x.nombreCorto).join(" o ")
                  }
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 " +
                    (st.on[b.id] ? "border-lima bg-lima-soft text-lima-dark" : "border-black/10 bg-white text-carbon/50 hover:border-carbon hover:text-carbon")
                  }
                >
                  {st.on[b.id] && "✓"} {b.nombreCorto}
                </button>
              ))}
            </div>
            </div>
            ))}
            </div>
          </div>

          {/* ---------- importes y forma de pago ---------- */}
          <div className="rounded-2xl border border-[#cfcfcf] bg-form-card p-4">
            <div className={TITULO + " mb-2.5"}>Importes y forma de pago</div>
            {conLinea.length === 0 && <p className="text-xs text-carbon/60">Marca arriba lo que incluye la hoja.</p>}
            {/* VARIOS PROYECTOS: cada uno con su importe, o un proyecto conjunto
                (un parrafo y una linea, a precio unico o la suma). 14-oct-2026. */}
            {deProyecto.length >= 2 && (
              <div className="mb-1.5 flex items-center gap-2 text-xs text-carbon/70">
                <span className="font-semibold">{deProyecto.length} proyectos:</span>
                <span className="inline-flex overflow-hidden rounded-[9px] border border-black/20">
                  {([[false, "Cada uno con su importe"], [true, "Proyecto conjunto"]] as const).map(([si, t], i) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => poner({ junto: { ...st.junto, ...Object.fromEntries(deProyecto.map((l) => [l.clave, si])) } })}
                      className={"px-2 py-1 text-[11px] font-semibold " + (i > 0 ? "border-l border-black/10 " : "") + (todasJuntas === si ? "bg-carbon text-white" : "bg-white text-carbon/60")}
                    >
                      {t}
                    </button>
                  ))}
                </span>
              </div>
            )}
            {conLinea.map((l) => {
              const b = l.b;
              const m = modoDe(b);
              // El interruptor es del bloque: sale en su primera linea.
              const primera = conLinea.find((x) => x.b.id === b.id) === l;
              return (
                <div key={l.clave} className="grid grid-cols-[1fr_auto_92px] items-center gap-2 border-b border-dashed border-[#e2e2e2] py-1.5">
                  <span className="text-[13px] font-semibold">
                    {b.nombreCorto}
                    {l.tipo && <span className="font-normal text-carbon/70"> · {l.tipo}</span>}
                    {/* VA EN EL CONJUNTO. Solo para lo que es proyecto: con SATE
                        y ascensor juntos, cada uno conserva su importe y la linea
                        condensada es la suma. */}
                    {b.naturaleza === "proyecto" && m === "se_cobra" && (
                      <label className="ml-2 cursor-pointer text-[11px] font-normal text-carbon/55">
                        <input
                          type="checkbox"
                          checked={Boolean(st.junto[l.clave])}
                          onChange={(e) => poner({ junto: { ...st.junto, [l.clave]: e.target.checked } })}
                          className="mr-1 align-middle"
                        />
                        va en el conjunto
                      </label>
                    )}
                  </span>
                  {primera ? <Interruptor valor={m} alCambiar={(v) => poner({ modo: { ...st.modo, [b.id]: v } })} /> : <span />}
                  {exitoDe(b) ? (
                    <label className="flex items-center gap-1 text-[13px]">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={st.pct[b.id] ?? EUR.format(b.exito!.porcentaje)}
                        onChange={(e) => poner({ pct: { ...st.pct, [b.id]: e.target.value } })}
                        className="w-full rounded-[10px] border border-black/20 bg-white px-2.5 py-1.5 text-right text-[13px] focus:border-lima focus:outline-none"
                      />
                      %
                    </label>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={m !== "se_cobra"}
                      value={m === "se_cobra" ? st.imp[l.clave] ?? (b.importe != null ? EUR.format(b.importe) : "") : "—"}
                      placeholder="€"
                      onChange={(e) => poner({ imp: { ...st.imp, [l.clave]: e.target.value } })}
                      className="w-full rounded-[10px] border border-black/20 bg-white px-2.5 py-1.5 text-right text-[13px] focus:border-lima focus:outline-none disabled:bg-[#f3f3f3] disabled:text-carbon/40"
                    />
                  )}
                  {m === "se_cobra" && (
                    <div className="col-span-3">
                      {/* EL TEXTO, escrito una vez: viaja a la hoja y a la
                          viabilidad. "Proyecto de bajada a cota cero de 5
                          ascensores." */}
                      <input
                        type="text"
                        value={st.texto[l.clave] ?? ""}
                        placeholder={`Cómo se llama en el documento — "${nombreLinea({ ...l, clave: "" }).toLowerCase()}…"`}
                        onChange={(e) => poner({ texto: { ...st.texto, [l.clave]: e.target.value } })}
                        className="mb-1 w-full rounded-[10px] border border-black/15 bg-white px-2.5 py-1 text-[12.5px] focus:border-lima focus:outline-none"
                      />
                    </div>
                  )}
                  {exitoDe(b) && primera && (
                    <div className="col-span-3 text-xs text-carbon/65">
                      A éxito: <b className="text-carbon/80">{textoExito(b)}</b>. Sale así en la hoja.
                    </div>
                  )}
                  {m === "se_cobra" && !exitoDe(b) && (
                    <div className="col-span-3 flex items-center gap-1.5 text-xs text-carbon/65">
                      <span className="shrink-0">Forma de pago</span>
                      <Elegir
                        id={`pago-${l.clave}`}
                        nombre=""
                        clase="min-w-0 flex-1"
                        opciones={FORMAS_PAGO.map((f) => ({ valor: f, texto: f }))}
                        valor={pagoDe(l)}
                        alElegir={(v) => v && poner({ pago: { ...st.pago, [l.clave]: v } })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {/* LA LINEA DEL PROYECTO CONJUNTO (Monica, 6-oct-2026).
                Aparece cuando hay dos o mas marcadas como "va en el conjunto".
                Su importe viene prerrellenado con la suma, PERO ES EDITABLE:
                "a veces el proyecto conjunto tiene un precio UNICO, y otras se
                desglosa; de ahi que la mano del comercial sea la que retoca al
                final, solo el sabe cual es cada caso".
                La hoja enseña las tres lineas; la viabilidad, solo esta. */}
            {enConjunto.length >= 2 && (
              <div className="mt-2 rounded-xl border border-lima/40 bg-lima-soft/40 p-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-lima-dark/80">
                  Proyecto conjunto · {enConjunto.map((l) => l.b.nombreCorto + (l.tipo ? ` (${l.tipo.toLowerCase()})` : "")).join(" + ")}
                </div>
                <input
                  type="text"
                  value={st.texto.CONJUNTO ?? ""}
                  placeholder="Proyecto conjunto de bajada a cota cero de 5 ascensores y arreglo de cubierta"
                  onChange={(e) => poner({ texto: { ...st.texto, CONJUNTO: e.target.value } })}
                  className="mt-1.5 w-full rounded-[10px] border border-black/15 bg-white px-2.5 py-1 text-[12.5px] focus:border-lima focus:outline-none"
                />
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-carbon/65">Importe del conjunto</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={st.imp.CONJUNTO ?? EUR.format(sumaConjunto)}
                    onChange={(e) => poner({ imp: { ...st.imp, CONJUNTO: e.target.value } })}
                    className="w-[110px] rounded-[10px] border border-black/20 bg-white px-2.5 py-1.5 text-right text-[13px] focus:border-lima focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-carbon/55">
                  Sale la suma de las líneas de arriba. Cámbialo si el conjunto va a precio único.
                </p>
              </div>
            )}

            <div className="mt-2 flex justify-between font-bold">
              <span>Total honorarios</span>
              <span>
                {eur(total)} € + IVA = {eur(total * 1.21)} €{masExito}
              </span>
            </div>
            {soloTexto.length > 0 && (
              <div className="mt-2 text-xs text-carbon/65">
                Solo texto, sin precio:{" "}
                {soloTexto.map((b, i) => (
                  <span key={b.id}>
                    {i > 0 && " · "}
                    <b>{b.nombreCorto}</b>{" "}
                    <button type="button" className="text-[11px] text-lima-dark underline" onClick={() => poner({ modo: { ...st.modo, [b.id]: "se_cobra" } })}>
                      cobrar
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------- la hoja, como papel ---------- */}
        <div className="xl:sticky xl:top-[76px]">
          <div className="mb-1.5 text-xs text-carbon/65">
            La hoja tal como saldrá. <b>Haz clic en cualquier texto para cambiarlo</b> en esta hoja (el catálogo no se toca). Los importes se cambian en las casillas.
          </div>
          <div
            ref={papel}
            suppressContentEditableWarning
            className="hoja-papel max-h-[calc(100vh-110px)] overflow-auto rounded px-[46px] py-[38px] shadow-[0_2px_10px_rgba(0,0,0,.12)] [&_[contenteditable=true]:focus]:outline-none"
          />
        </div>
      </div>
    </section>
  );
}

/** Una linea de la hoja: un bloque, o un bloque de proyecto para UNA actuacion. */
type Linea = { clave: string; b: BloqueHoja; tipoId: string | null; tipo: string | null };
/** "RAMPA, FOTOVOLTAICA Y AEROTERMIA". */
const enLista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} Y ${xs.at(-1)}` : xs[0] ?? "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** El hito de un cobro a exito, como se escribe en la hoja. */
const MOMENTO: Record<string, string> = { concesion: "concesión", adjudicacion: "adjudicación", presentacion: "presentación", licencia: "licencia", cfo: "fin de obra" };
const frase = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

function Interruptor({ valor, alCambiar }: { valor: Desglose; alCambiar: (v: Desglose) => void }) {
  const op: [Desglose, string][] = [
    ["se_cobra", "Se cobra"],
    ["incluido", "Incluido"],
    ["no_aparece", "No aparece"],
  ];
  return (
    <span className="inline-flex overflow-hidden rounded-[9px] border border-black/20">
      {op.map(([v, t], i) => (
        <button
          key={v}
          type="button"
          onClick={() => alCambiar(v)}
          className={"px-2 py-1 text-[11px] font-semibold " + (i > 0 ? "border-l border-black/10 " : "") + (valor === v ? "bg-carbon text-white" : "bg-white text-carbon/60")}
        >
          {t}
        </button>
      ))}
    </span>
  );
}

/** El "donde": los accesos de la oportunidad, con casillas. Salen todos
 *  marcados; se quitan los que no entran en esta actuacion. */
function Donde({ accesos, elegidos, alCambiar }: { accesos: { id: string; texto: string }[]; elegidos: string[]; alCambiar: (ids: string[]) => void }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => caja.current && !caja.current.contains(e.target as Node) && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);
  const texto = useMemo(() => {
    const n = elegidos.length;
    if (!n) return "Dónde…";
    if (n === accesos.length && n > 1) return `Los ${n} accesos`;
    return accesos.filter((a) => elegidos.includes(a.id)).map((a) => a.texto).join(" · ");
  }, [accesos, elegidos]);
  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        onClick={() => setAbierto((x) => !x)}
        className={"flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-1.5 text-left text-sm transition " + (abierto ? "border-lima" : "border-black/10")}
      >
        <span className={"truncate " + (elegidos.length ? "" : "text-carbon/55")}>{texto}</span>
        <span className="shrink-0 text-carbon/55">▾</span>
      </button>
      {abierto && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-black/10 bg-white py-1 shadow-lg">
          {accesos.length === 0 && <p className="px-3 py-2 text-sm text-carbon/65">La oportunidad no tiene accesos.</p>}
          {accesos.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-lima-soft">
              <input
                type="checkbox"
                checked={elegidos.includes(a.id)}
                onChange={(e) => alCambiar(e.target.checked ? [...elegidos, a.id] : elegidos.filter((x) => x !== a.id))}
                className="accent-[#7ac943]"
              />
              {a.texto}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
