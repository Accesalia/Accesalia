"use client";

import { useState } from "react";
import { Cobro, FichaDesplegada } from "./FichaDesplegada";
import type {
  CarteraCuadro,
  CifraCuadro,
  EntradaCuadro,
  EstadoTramo,
  FirmadaCuadro,
  FilaRanking,
  OportunidadCuadro,
  Paso,
  TareaCuadro,
} from "../../lib/cuadroComercial";

// Las piezas del cuadro de mando comercial. Solo pintan: todo llega ya
// calculado en un CuadroComercial, sea de la base o de la demostracion.

const hoyISO = () => new Date().toISOString().slice(0, 10);
const dias = (desde: string) =>
  Math.round((new Date(hoyISO()).getTime() - new Date(desde).getTime()) / 86_400_000);
const DIA_CORTO = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric" });
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// Con punto de miles tambien en las cifras de cuatro digitos: 9.800 €, no 9800 €.
const EUR = new Intl.NumberFormat("es-ES", { useGrouping: "always", maximumFractionDigits: 0 });
const eur = (n: number) => `${EUR.format(n)} €`;

export function Titulo({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/60">{children}</h2>
      {extra}
    </div>
  );
}

// ---------------------------------------------------------------- agenda

function cuandoTarea(t: TareaCuadro): { texto: string; tono: "tarde" | "hoy" | "luego" } {
  if (!t.fecha) return { texto: "sin fecha", tono: "luego" };
  const d = dias(t.fecha);
  if (d > 0) return { texto: d === 1 ? "vencía ayer" : `vencía hace ${d} días`, tono: "tarde" };
  if (d === 0) return { texto: t.hora ?? "hoy", tono: "hoy" };
  return { texto: DIA_CORTO.format(new Date(t.fecha)) + (t.hora ? ` · ${t.hora}` : ""), tono: "luego" };
}

export function Agenda({ tareas }: { tareas: TareaCuadro[] }) {
  const hoy = hoyISO();
  const deHoy = tareas.filter((t) => t.fecha && t.fecha <= hoy);
  const semana = tareas.filter((t) => t.fecha && t.fecha > hoy);
  const sinFecha = tareas.filter((t) => !t.fecha);
  const tarde = deHoy.filter((t) => t.fecha! < hoy).length;

  const grupo = (titulo: string, lista: TareaCuadro[], fondo: string, cabecera: string) =>
    lista.length > 0 && (
      <div className={fondo}>
        <div className={"border-t border-black/5 px-5 py-2 text-xs font-bold uppercase tracking-wider first:border-t-0 " + cabecera}>
          {titulo}
        </div>
        <ul>
          {lista.map((t) => {
            const c = cuandoTarea(t);
            return (
              <li key={t.id} className="flex items-start gap-3 border-t border-black/5 px-5 py-3">
                <span
                  className={
                    "mt-2 h-2 w-2 shrink-0 rounded-full " +
                    (c.tono === "tarde" ? "bg-alerta" : c.tono === "hoy" ? "bg-amber-500" : "bg-carbon/25")
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base text-carbon">{t.texto}</p>
                  {t.donde && <p className="mt-0.5 text-sm text-carbon/55">{t.donde}</p>}
                </div>
                <span
                  className={
                    "shrink-0 whitespace-nowrap pt-0.5 text-sm font-semibold " +
                    (c.tono === "tarde" ? "text-alerta" : c.tono === "hoy" ? "text-amber-700" : "text-carbon/55")
                  }
                >
                  {c.texto}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <section>
      <Titulo>Lo que tengo que hacer</Titulo>
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        {tareas.length === 0 ? (
          <p className="px-5 py-10 text-center text-base text-carbon/50">
            Nada para hoy ni para esta semana.
            <br />
            <span className="text-sm">Las tareas salen solas de lo que grabas en el diario.</span>
          </p>
        ) : (
          <>
            {grupo(
              `Hoy · ${deHoy.length} ${deHoy.length === 1 ? "cosa" : "cosas"}${tarde ? `, ${tarde} con retraso` : ""}`,
              deHoy,
              "bg-amber-50/60",
              "text-amber-700",
            )}
            {grupo("Próximos días", semana, "bg-black/[0.015]", "text-carbon/50")}
            {grupo("Sin fecha", sinFecha, "", "text-carbon/45")}
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- acciones

// Montada de cero el 12-sep-2026: las pantallas de detras (abrir oportunidad,
// grabar entrada, viabilidad, hoja) estan archivadas y se volveran a montar una
// a una. Hasta entonces los botones estan, para que se vea el sitio, pero no
// llevan a ningun sitio: "Próximamente".
function Accion({ icono, rotulo, principal = false }: { icono: string; rotulo: string; principal?: boolean }) {
  return (
    <div
      className={
        "flex h-full cursor-not-allowed items-center gap-3 rounded-2xl border border-dashed px-4 py-3.5 " +
        (principal ? "border-lima/50 bg-lima-soft/60" : "border-black/10 bg-white")
      }
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lima/70 text-lg text-carbon">{icono}</span>
      <div className="min-w-0">
        <div className="text-base font-bold leading-tight text-carbon/70">{rotulo}</div>
        <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-carbon/40">Próximamente</div>
      </div>
    </div>
  );
}

// Arriba lo que se HACE; abajo lo que genera documentos (Monica, 11-sep).
export function Acciones() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Accion icono="◇" rotulo="Abrir oportunidad" principal />
      <Accion icono="🎤" rotulo="Grabar entrada" />
      <Accion icono="▤" rotulo="Informe de viabilidad" />
      <Accion icono="✎" rotulo="Hoja de encargo" />
    </div>
  );
}

// ---------------------------------------------------------------- diario

export function Diario({ entradas }: { entradas: EntradaCuadro[] }) {
  return (
    <section className="flex min-h-0 flex-col">
      <Titulo>Lo que va pasando</Titulo>
      <div className="max-h-[30rem] overflow-y-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        {entradas.length === 0 ? (
          <p className="px-5 py-10 text-center text-base text-carbon/50">Aún no hay nada grabado.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {entradas.map((e) => {
              const cuerpo = (
                <>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-carbon/55">
                    <span className="font-bold text-carbon/80">{ddmm(e.fecha)}</span>
                    <span className="rounded-full border border-black/5 bg-hueso px-2 py-px text-xs font-semibold">{e.tipo}</span>
                    {e.con && <span className="text-lima-dark">{e.con}</span>}
                    {e.revisar && (
                      <span className="rounded-full bg-amber-50 px-2 py-px text-xs font-bold uppercase tracking-wide text-amber-700">
                        revisar
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-base leading-snug text-carbon/80">{e.texto}</p>
                </>
              );
              return (
                <li key={e.id}>
                  <div className="px-4 py-3">{cuerpo}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- la barra

// Una sola rejilla para la leyenda y para cada barra: asi cada rotulo queda
// justo debajo de su tramo, en todas las filas.
function Rejilla({ n, children, className = "" }: { n: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={"grid gap-1.5 " + className} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

export function Leyenda({ pasos }: { pasos: Paso[] }) {
  return (
    <div className="border-b border-black/5 bg-hueso/60 px-5 pb-3 pt-4">
      <Rejilla n={pasos.length}>
        {pasos.map((p) => (
          <div key={p.clave} className="min-w-0">
            <div
              className={
                "h-2 rounded-full " +
                (p.ramal ? "border-2 border-dashed border-ajeno bg-transparent" : p.ajeno ? "bg-ajeno" : "bg-lima")
              }
            />
            <div className={"mt-2 text-sm font-semibold leading-tight " + (p.ajeno ? "text-ajeno" : "text-carbon/80")}>
              {p.numero && <span className="mr-1 tabular-nums text-carbon/40">{p.numero}</span>}
              {p.corto[0]}
              {p.corto[1] && <span className="block">{p.corto[1]}</span>}
            </div>
            {p.quien && <div className="mt-0.5 text-xs text-ajeno/80">{p.ramal ? "si la junta lo pide" : p.quien}</div>}
          </div>
        ))}
      </Rejilla>
      <p className="mt-3 text-sm text-carbon/55">
        En verde lo tuyo, en <span className="font-semibold text-ajeno">azul lo que depende de otros</span>. El caso normal: cada
        oportunidad se salta los pasos que no le tocan.
      </p>
    </div>
  );
}

function Tramo({ estado, paso }: { estado: EstadoTramo; paso: Paso }) {
  const base = "rounded-full self-center ";
  if (estado === "no_aplica")
    return <span title={`${paso.corto.join(" ")}: no aplica`} className={base + "h-2 border border-dashed border-black/15"} />;
  if (estado === "hecho") return <span title={`${paso.corto.join(" ")}: hecho`} className={base + "h-2 bg-lima"} />;
  if (estado === "actual")
    return (
      <span
        title={`${paso.corto.join(" ")}: aquí está`}
        className={base + "h-3.5 ring-2 ring-offset-1 " + (paso.ajeno ? "bg-ajeno ring-ajeno/30" : "bg-lima-dark ring-lima/40")}
      />
    );
  return <span title={`${paso.corto.join(" ")}: pendiente`} className={base + "h-2 bg-black/10"} />;
}

export function TarjetaOportunidad({
  o, pasos, umbralParado, umbralSinContacto, conComercial,
}: {
  o: OportunidadCuadro;
  pasos: Paso[];
  umbralParado: number;
  umbralSinContacto: number;
  conComercial?: string | null;
}) {
  const parada = o.diasAqui !== null && o.diasAqui >= umbralParado && !o.esperando;
  const sinContacto = o.ultimoContacto !== null && dias(o.ultimoContacto) > umbralSinContacto;
  // Se despliega aqui mismo, hacia abajo (Monica, 12-sep-2026).
  const [abierta, setAbierta] = useState(false);

  const cuerpo = (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={"text-carbon/35 transition " + (abierta ? "rotate-90" : "")} aria-hidden>
              ▸
            </span>
            <span className="text-lg font-bold text-carbon">{o.nombre}</span>
            {o.sinComunidad && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                sin dar de alta
              </span>
            )}
          </div>
          <div className="mt-0.5 text-base text-lima-dark">
            {o.empresa ?? <span className="text-carbon/40">sin administración</span>}
            {o.persona && <span> · {o.persona}</span>}
            {o.trajo && <span className="text-carbon/60"> · lo trajo {o.trajo}</span>}
            {o.prestada && (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">prestada</span>
            )}
            {conComercial && <span className="text-carbon/45"> · {conComercial}</span>}
          </div>
          {abierta && (
            <div className="mt-2.5">
              <Cobro cobra={o.ficha?.cobra ?? null} />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-4">
          <span
            title="La ficha completa está por montar"
            onClick={(e) => e.stopPropagation()}
            className="hidden cursor-not-allowed flex-col items-center rounded-lg border border-dashed border-lima/70 bg-white px-4 py-2 text-center sm:flex"
          >
            <span className="text-sm font-bold uppercase tracking-wide text-carbon/60">Ver ficha completa</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-carbon/35">Próximamente</span>
          </span>
          {/* Ancho fijo: asi el precio, el tipo y el boton caen en la misma
              columna en todas las filas y se leen de un vistazo. */}
          <div className="w-[11.5rem] text-right">
            {o.precio !== null ? (
              <div className="text-lg font-bold tabular-nums text-lima-dark">{eur(o.precio)}</div>
            ) : (
              <div className="text-base text-carbon/40">Sin precio aún</div>
            )}
            {/* Que contratan, en grande: "es importante ver de un vistazo que
                tipo de proyecto tenemos entre manos" (Monica, 12-sep-2026). */}
            <div className="mt-1">
              {o.que ? (
                <span className="inline-block rounded-lg bg-lima px-2.5 py-1 text-lg font-bold leading-tight text-carbon">
                  {o.que}
                </span>
              ) : (
                <span className="inline-block rounded-lg border border-dashed border-black/15 px-2.5 py-1 text-base leading-tight text-carbon/35">
                  sin definir aún
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Rejilla n={pasos.length} className="mt-3 h-4">
        {pasos.map((p) => (
          <Tramo key={p.clave} paso={p} estado={o.tramos[p.clave] ?? "pendiente"} />
        ))}
      </Rejilla>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-carbon/55">
        {o.actual && (
          <span>
            Está en{" "}
            <b className={o.actual.ajeno ? "text-ajeno" : "text-carbon/85"}>
              {o.actual.numero ? `${o.actual.numero} · ` : ""}
              {o.actual.nombre}
            </b>
          </span>
        )}
        {o.esperando ? (
          <span className="font-semibold text-ajeno">
            esperando {o.esperando}
            {o.diasAqui !== null ? `, ${o.diasAqui} ${o.diasAqui === 1 ? "día" : "días"}` : ""}
          </span>
        ) : o.diasAqui !== null ? (
          <span className={parada ? "font-semibold text-alerta" : ""}>
            {o.diasAqui} {o.diasAqui === 1 ? "día" : "días"} {parada ? "parada aquí" : "aquí"}
          </span>
        ) : null}
        {o.proximo && <span className="font-semibold text-carbon/75">{o.proximo}</span>}
        <span className={sinContacto ? "font-semibold text-alerta" : ""}>
          últ. contacto {o.ultimoContacto ? ddmm(o.ultimoContacto) : "—"}
        </span>
      </div>
    </div>
  );

  // No lleva a otra pantalla: se abre aqui mismo.
  return (
    <div className={abierta ? "bg-white ring-1 ring-lima/60" : ""}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={abierta}
        onClick={() => setAbierta((x) => !x)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAbierta((x) => !x);
          }
        }}
        className="cursor-pointer outline-none transition hover:bg-hueso/60 focus-visible:bg-hueso/60"
      >
        {cuerpo}
      </div>
      {abierta && <FichaDesplegada ficha={o.ficha} />}
    </div>
  );
}

// -------------------------------------------------- la segunda vida comercial

// Cuando la hoja esta firmada y verificada, la barra de nueve pasos ya no
// aporta ("una HE firmada ya esta") y se sustituye por la ESTRELLA. Debajo
// arranca la otra barra: la del cobro, con un tramo por hito de facturacion.
//
// COLOR (Monica, 12-sep-2026): rampa DORADA, de suave a intenso. El verde ya es
// la barra comercial y el azul ya significa "depende de otros". El dorado se
// oscurece segun avanza el cobro; el RETRASO no se dice con color, se dice con
// el borde y con la fecha en rojo, para que un color no signifique dos cosas.
const ORO_CLARO = [217, 183, 90];
const ORO_OSCURO = [138, 100, 16];
const oro = (i: number, n: number, alfa = 1) => {
  const t = n <= 1 ? 1 : i / (n - 1);
  const c = ORO_CLARO.map((a, k) => Math.round(a + (ORO_OSCURO[k] - a) * t));
  return `rgba(${c.join(",")},${alfa})`;
};

// Cuanto tarda en llegar cada tramo, contando desde la firma. Es lo que le da
// el ancho: dos cobros seguidos se ven juntos, y uno a tres meses se ve lejos.
function anchosPorTiempo(f: FirmadaCuadro): number[] {
  const cero = new Date(f.firmada).getTime();
  let previo = 0;
  return f.hitos.map((h) => {
    const cuando = h.cobrado ?? h.previsto;
    if (!cuando) return 1;
    const d = Math.max(0, Math.round((new Date(cuando).getTime() - cero) / 86_400_000));
    const tramo = Math.max(1, d - previo);
    previo = d;
    return tramo;
  });
}

export function TarjetaFirmada({ f }: { f: FirmadaCuadro }) {
  const [abierta, setAbierta] = useState(false);
  const hoy = hoyISO();
  const cobrado = f.hitos.filter((h) => h.cobrado);
  const suyoCobrado = cobrado.reduce((s, h) => s + h.comision, 0);
  const suyoTotal = f.hitos.reduce((s, h) => s + h.comision, 0);
  const nosCobrado = cobrado.reduce((s, h) => s + h.importe, 0);

  return (
    <div className={abierta ? "bg-white ring-1 ring-lima/60" : ""}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={abierta}
        onClick={() => setAbierta((x) => !x)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAbierta((x) => !x);
          }
        }}
        className="cursor-pointer px-5 py-4 outline-none transition hover:bg-hueso/60 focus-visible:bg-hueso/60"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={"text-carbon/35 transition " + (abierta ? "rotate-90" : "")} aria-hidden>▸</span>
              <span className="text-lg font-bold text-carbon">{f.nombre}</span>
            </div>
            <div className="mt-0.5 text-base text-lima-dark">
              {f.empresa ?? <span className="text-carbon/40">sin administración</span>}
              {f.persona && <span> · {f.persona}</span>}
            </div>
            {/* La estrella sustituye a la barra de nueve pasos. Los tiempos de
                cada paso NO se pierden: siguen guardados para las estadisticas
                de rendimiento del comercial y del administrador. */}
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#FBF3DC] px-3 py-1.5">
              <span className="text-xl leading-none text-[#C9971B]" aria-hidden>★</span>
              <span className="text-sm font-bold uppercase tracking-wider text-[#8A6410]">Proyecto firmado</span>
              <span className="text-sm text-[#8A6410]/70">{ddmm(f.firmada)}</span>
            </div>
          </div>
          <div className="w-[11.5rem] text-right">
            <div className="text-lg font-bold tabular-nums text-lima-dark">{eur(f.precio)}</div>
            <div className="mt-1">
              {f.que && (
                <span className="inline-block rounded-lg bg-lima px-2.5 py-1 text-lg font-bold leading-tight text-carbon">{f.que}</span>
              )}
            </div>
          </div>
        </div>

        {/* La barra del cobro: un tramo por hito de facturacion, y ADEMAS
            situada en el tiempo (Monica, 12-sep-2026): "una cosa es ver 28 de
            octubre y otra ver que quedan 43 días hasta cobrar". El ancho de
            cada tramo es proporcional a lo que tarda en llegar, con un minimo
            para que el rotulo siga siendo legible, y debajo van los dias que
            faltan o los que lleva vencido. */}
        <div
          className="mt-4 grid gap-1.5"
          style={{ gridTemplateColumns: anchosPorTiempo(f).map((n) => `minmax(7rem, ${n}fr)`).join(" ") }}
        >
          {f.hitos.map((h, i) => {
            const tarde = !h.cobrado && h.previsto !== null && h.previsto < hoy;
            const faltan = h.previsto ? -dias(h.previsto) : null;
            return (
              <div key={h.nombre + i} className="min-w-0">
                {/* Cobrado: relleno. Sin cobrar: hueco con el BORDE de su
                    dorado, "para que se vea a dónde se llega pero que aún no
                    estamos ahí" (Monica). Vencido: borde rojo discontinuo. */}
                <div
                  className={"h-3 rounded-full " + (tarde ? "border-2 border-dashed border-alerta" : "")}
                  style={
                    tarde
                      ? undefined
                      : h.cobrado
                        ? { background: oro(i, f.hitos.length) }
                        : { border: `2px solid ${oro(i, f.hitos.length, 0.45)}` }
                  }
                />
                <div className="mt-1.5 text-sm font-semibold leading-tight text-carbon/80">{h.nombre}</div>
                <div className="text-sm tabular-nums text-carbon/60">{eur(h.importe)}</div>
                {/* lo suyo, en cada tramo: la zanahoria */}
                <div className="text-sm font-bold tabular-nums text-[#8A6410]">tuyo {eur(h.comision)}</div>
                <div className={"text-xs " + (tarde ? "font-bold text-alerta" : "text-carbon/45")}>
                  {h.cobrado
                    ? `cobrado ${ddmm(h.cobrado)}`
                    : h.previsto === null
                      ? "sin fecha"
                      : tarde
                        ? `vencía ${ddmm(h.previsto)} · hace ${-faltan!} ${-faltan! === 1 ? "día" : "días"}`
                        : `${ddmm(h.previsto)} · ${faltan === 0 ? "hoy" : `faltan ${faltan} ${faltan === 1 ? "día" : "días"}`}`}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-carbon/60">
          <span>
            Cobrado <b className="tabular-nums text-carbon/85">{eur(nosCobrado)}</b> de {eur(f.precio)}
          </span>
          <span className="text-[#8A6410]">
            Tu comisión: <b className="tabular-nums">{eur(suyoCobrado)}</b> cobrada
            {suyoTotal > suyoCobrado && <> · <b className="tabular-nums">{eur(suyoTotal - suyoCobrado)}</b> por cobrar</>}
          </span>
        </div>
      </div>
      {abierta && <FichaDesplegada ficha={f.ficha} />}
    </div>
  );
}

// ---------------------------------------------------------------- cifras

export function Cifras({ cifras, periodo }: { cifras: CifraCuadro[]; periodo: string | null }) {
  const faltan = cifras.every((c) => c.valor === null);
  return (
    <section className="mt-10">
      <Titulo extra={periodo && <span className="text-sm text-carbon/55">{periodo}</span>}>Cómo voy de lo mío</Titulo>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/5 bg-black/5 shadow-sm sm:grid-cols-4">
        {cifras.map((c) => (
          <div key={c.etiqueta} className="bg-white px-4 py-3.5">
            <div className="text-sm text-carbon/60">{c.etiqueta}</div>
            <div
              className={
                "mt-1 text-2xl font-bold tabular-nums tracking-tight " +
                (c.valor === null ? "text-carbon/20" : c.acento ? "text-lima-dark" : "text-carbon")
              }
            >
              {c.valor ?? "—"}
            </div>
            <div className={"mt-0.5 text-sm " + (c.valor === null ? "text-amber-700/80" : "text-carbon/45")}>{c.pie}</div>
          </div>
        ))}
      </div>
      {faltan && (
        <p className="mt-2 text-sm text-carbon/55">
          Estas cifras salen de las hojas firmadas, con su fecha y su importe. Cuando lleguen los datos de cada comercial,
          se rellenan solas.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- cartera

function Ranking({ filas, numerado, tono }: { filas: FilaRanking[]; numerado: boolean; tono?: "bien" | "mal" }) {
  return (
    <ul className="divide-y divide-black/5">
      {filas.map((f, i) => {
        const nombre = (
          <span className="min-w-0 flex-1 truncate text-base text-carbon/85">
            {f.nombre}
            {f.prestada && <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-px text-xs font-bold text-amber-700">prest.</span>}
          </span>
        );
        return (
          <li key={f.nombre + i} className="flex items-center gap-2.5 px-4 py-2">
            <span className="w-4 shrink-0 text-sm font-bold tabular-nums text-carbon/35">{numerado ? i + 1 : "·"}</span>
            {nombre}
            <span
              className={
                "shrink-0 whitespace-nowrap text-sm font-bold tabular-nums " +
                (tono === "bien" ? "text-lima-dark" : tono === "mal" ? "text-alerta" : "text-carbon/60")
              }
            >
              {f.dato}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CajaCartera({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="border-b border-black/5 px-4 pb-2.5 pt-3">
        <div className="text-base font-bold text-carbon">{titulo}</div>
        <div className="text-sm text-carbon/50">{sub}</div>
      </div>
      {children}
    </div>
  );
}

const Falta = ({ texto }: { texto: string }) => (
  <p className="px-4 py-6 text-sm leading-relaxed text-amber-700/80">{texto}</p>
);

export function Cartera({ cartera, todos }: { cartera: CarteraCuadro; todos: boolean }) {
  return (
    <section className="mt-10">
      <Titulo>{todos ? "Las carteras" : "Mis administradores"}</Titulo>
      <div className="grid gap-4 md:grid-cols-3">
        <CajaCartera titulo={todos ? "Toda la cartera" : "Mi cartera"} sub={todos ? "lo que lleva cada comercial, sumado" : "lo que llevo"}>
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-black/5 px-4 py-3">
            {cartera.cifras.map((c) => (
              <div key={c.etiqueta}>
                <div className="text-xl font-bold tabular-nums text-carbon">{c.valor}</div>
                <div className="text-sm text-carbon/55">{c.etiqueta}</div>
              </div>
            ))}
          </div>
          {cartera.mias.length ? <Ranking filas={cartera.mias} numerado={false} /> : <Falta texto="Sin administraciones asignadas." />}
        </CajaCartera>
        <CajaCartera titulo="Estrella" sub="las que más firman">
          {cartera.estrella ? <Ranking filas={cartera.estrella} numerado tono="bien" /> : <Falta texto={cartera.faltaEstrella} />}
        </CajaCartera>
        <CajaCartera titulo="Que marean" sub="mucho ir y venir, poco firmar">
          {cartera.marean ? <Ranking filas={cartera.marean} numerado tono="mal" /> : <Falta texto={cartera.faltaMarean} />}
        </CajaCartera>
      </div>
    </section>
  );
}
