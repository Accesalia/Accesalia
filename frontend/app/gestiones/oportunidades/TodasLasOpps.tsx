"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { casa, palabrasDe } from "../../../lib/casarBusqueda";
import type { ComercialLista, FilaTodas } from "../../../lib/todasLasOpps";
import { accionComercial, accionEstado, type CambioEstado } from "./acciones";

// El listado de todas las opps: buscador y filtros arriba, la tabla debajo
// ajustada a su contenido (guia, regla 8). El comercial y el estado se cambian
// en la misma fila; pausar y cerrar piden lo mismo que en la ficha.

type Estado = FilaTodas["estado"];
const ESTADOS: { valor: Estado; texto: string; punto: string }[] = [
  { valor: "abierta", texto: "Abierta", punto: "bg-[#3BB54A]" },
  { valor: "pausada", texto: "Pausada", punto: "bg-amber-400" },
  { valor: "cerrada", texto: "Cerrada", punto: "bg-carbon/35" },
];
const SIN = "sin"; // "sin asignar", en el filtro de comercial
const DE_UNA_VEZ = 200; // filas pintadas de golpe; el resto, con "Ver más"

const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white";
const ROT = "text-[10px] font-bold uppercase tracking-wide text-carbon/70";
const TH = "border-b border-[#d9d9d9] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-[#6e6e6e] whitespace-nowrap";
const TD = "border-b border-[#f0f0f0] px-3 py-1.5 whitespace-nowrap";
const CAMPO = "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-carbon placeholder:text-carbon/55 focus:border-lima focus:outline-none";
const pill = (on: boolean) =>
  "rounded-full border px-3 py-1 text-[12.5px] transition " +
  (on ? "border-carbon bg-carbon font-semibold text-white" : "border-carbon/25 bg-white text-carbon/75 hover:border-carbon");
const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");

type Orden = "nombre" | "municipio" | "codigo" | "apertura";

export function TodasLasOpps({ filas: iniciales, comerciales }: { filas: FilaTodas[]; comerciales: ComercialLista[] }) {
  const router = useRouter();
  // Lo cambiado aqui se ve al momento, sin esperar a que se relea la lista.
  const [cambios, setCambios] = useState<Record<string, Partial<FilaTodas>>>({});
  const filas = useMemo(() => iniciales.map((f) => ({ ...f, ...cambios[f.id] })), [iniciales, cambios]);

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<Estado | "">("");
  const [comercial, setComercial] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [anio, setAnio] = useState("");
  const [orden, setOrden] = useState<{ por: Orden; baja: boolean }>({ por: "apertura", baja: true });
  const [cuantas, setCuantas] = useState(DE_UNA_VEZ);

  const nombreComercial = useMemo(() => new Map(comerciales.map((c) => [c.id, c.nombre])), [comerciales]);

  // Las opciones de los filtros salen de lo que hay, con cuantas tiene cada una.
  const opcionesComercial: Opcion[] = useMemo(() => {
    const n = (id: string | null) => filas.filter((f) => f.comercialId === id).length;
    return [
      { valor: "", texto: "Todos" },
      { valor: SIN, texto: "Sin asignar", pista: String(n(null)) },
      ...comerciales.filter((c) => c.activo || n(c.id) > 0).map((c) => ({ valor: c.id, texto: c.nombre, pista: String(n(c.id)) + (c.activo ? "" : " · ya no está") })),
    ];
  }, [filas, comerciales]);
  const opcionesMunicipio: Opcion[] = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) for (const m of f.municipio ? f.municipio.split(", ") : ["(sin municipio)"]) n.set(m, (n.get(m) ?? 0) + 1);
    return [{ valor: "", texto: "Todos" }, ...[...n].sort((a, b) => a[0].localeCompare(b[0], "es")).map(([m, k]) => ({ valor: m, texto: m, pista: String(k) }))];
  }, [filas]);
  const opcionesAnio: Opcion[] = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) {
      const a = f.apertura?.slice(0, 4) ?? "(sin fecha)";
      n.set(a, (n.get(a) ?? 0) + 1);
    }
    return [{ valor: "", texto: "Todos" }, ...[...n].sort((a, b) => b[0].localeCompare(a[0])).map(([a, k]) => ({ valor: a, texto: a, pista: String(k) }))];
  }, [filas]);

  // Todos los filtros menos el del estado: asi las pastillas cuentan lo que hay
  // en cada estado DENTRO de lo filtrado.
  const sinEstado = useMemo(() => {
    const palabras = palabrasDe(q);
    return filas.filter((f) => {
      if (comercial === SIN ? f.comercialId !== null : comercial && f.comercialId !== comercial) return false;
      if (municipio && (municipio === "(sin municipio)" ? f.municipio !== "" : !f.municipio.split(", ").includes(municipio))) return false;
      if (anio && (f.apertura?.slice(0, 4) ?? "(sin fecha)") !== anio) return false;
      if (palabras.length && !casa(palabras, { nombre: `${f.nombre} ${f.codigo ?? ""}`, detalle: `${f.municipio} ${nombreComercial.get(f.comercialId ?? "") ?? ""}` })) return false;
      return true;
    });
  }, [filas, q, comercial, municipio, anio, nombreComercial]);

  const lista = useMemo(() => {
    const l = estado ? sinEstado.filter((f) => f.estado === estado) : sinEstado;
    const v = (f: FilaTodas) => (orden.por === "apertura" ? f.apertura ?? "" : (f[orden.por] ?? "").toString());
    return [...l].sort((a, b) => {
      const x = v(a), y = v(b);
      // Lo vacio, siempre al final.
      if (!x || !y) return x ? -1 : y ? 1 : 0;
      const c = x.localeCompare(y, "es", { numeric: true });
      return orden.baja ? -c : c;
    });
  }, [sinEstado, estado, orden]);

  const hayFiltro = q || estado || comercial || municipio || anio;
  const limpiar = () => {
    setQ(""); setEstado(""); setComercial(""); setMunicipio(""); setAnio(""); setCuantas(DE_UNA_VEZ);
  };
  const ordenarPor = (por: Orden) => setOrden((o) => (o.por === por ? { por, baja: !o.baja } : { por, baja: por === "apertura" }));
  const flecha = (por: Orden) => (orden.por === por ? (orden.baja ? " ↓" : " ↑") : "");

  const cambiada = (id: string, c: Partial<FilaTodas>) => {
    setCambios((x) => ({ ...x, [id]: { ...x[id], ...c } }));
    router.refresh();
  };

  return (
    <>
      {/* -------------------- buscador y filtros -------------------- */}
      <section className={CAJA + " mt-5 p-4"}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="w-[320px] max-w-full">
            <span className={ROT}>Buscar</span>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setCuantas(DE_UNA_VEZ); }}
              placeholder="nombre, código, municipio o comercial…"
              className={CAMPO + " mt-1"}
            />
          </label>
          <Elegir id="f_comercial" nombre="Comercial" opciones={opcionesComercial} valor={comercial} alElegir={(v) => { setComercial(v); setCuantas(DE_UNA_VEZ); }} conPista clase="w-[220px]" />
          <Elegir id="f_municipio" nombre="Municipio" opciones={opcionesMunicipio} valor={municipio} alElegir={(v) => { setMunicipio(v); setCuantas(DE_UNA_VEZ); }} clase="w-[220px]" />
          <Elegir id="f_anio" nombre="Año de apertura" opciones={opcionesAnio} valor={anio} alElegir={(v) => { setAnio(v); setCuantas(DE_UNA_VEZ); }} clase="w-[140px]" />
          {hayFiltro && (
            <button type="button" onClick={limpiar} className="pb-1.5 text-sm font-semibold text-carbon/65 underline hover:text-carbon">
              Quitar filtros
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={ROT + " mr-1"}>Estado</span>
          <button type="button" onClick={() => setEstado("")} className={pill(estado === "")}>
            Todas <b>{sinEstado.length}</b>
          </button>
          {ESTADOS.map((e) => (
            <button key={e.valor} type="button" onClick={() => setEstado(e.valor)} className={pill(estado === e.valor)}>
              {e.texto} <b>{sinEstado.filter((f) => f.estado === e.valor).length}</b>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------------------- la tabla ---------------------------- */}
      <section className={CAJA + " mt-3 w-fit max-w-full overflow-x-auto"}>
        <table className="w-auto border-collapse text-[13px]">
          <thead className="bg-[#f4f4f1]">
            <tr>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("nombre")} className="uppercase">Oportunidad · {lista.length}{flecha("nombre")}</button>
              </th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("municipio")} className="uppercase">Municipio{flecha("municipio")}</button>
              </th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("codigo")} className="uppercase">Código{flecha("codigo")}</button>
              </th>
              <th className={TH}>Comercial</th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("apertura")} className="uppercase">Apertura{flecha("apertura")}</button>
              </th>
              <th className={TH}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-carbon/65">
                  No hay ninguna con estos filtros.
                </td>
              </tr>
            )}
            {lista.slice(0, cuantas).map((f) => (
              <Fila key={f.id} f={f} comerciales={comerciales} alCambiar={cambiada} />
            ))}
          </tbody>
        </table>
        {lista.length > cuantas && (
          <div className="border-t border-[#f0f0f0] px-3 py-2.5 text-sm text-carbon/65">
            Se ven {cuantas} de {lista.length}.{" "}
            <button type="button" onClick={() => setCuantas((n) => n + DE_UNA_VEZ)} className="font-semibold text-carbon underline">
              Ver {Math.min(DE_UNA_VEZ, lista.length - cuantas)} más
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function Fila({ f, comerciales, alCambiar }: { f: FilaTodas; comerciales: ComercialLista[]; alCambiar: (id: string, c: Partial<FilaTodas>) => void }) {
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Pausar y cerrar piden algo antes: se abre su ventana.
  const [pide, setPide] = useState<"pausada" | "cerrada" | null>(null);

  // Se eligen los activos; el que ya no esta solo sale si es el de esta opp.
  const opciones: Opcion[] = [
    { valor: "", texto: "Sin asignar" },
    ...comerciales.filter((c) => c.activo || c.id === f.comercialId).map((c) => ({ valor: c.id, texto: c.nombre + (c.activo ? "" : " (ya no está)") })),
  ];

  const comercial = (v: string) => {
    if (v === (f.comercialId ?? "")) return;
    setError(null);
    empezar(async () => {
      const r = await accionComercial(f.id, v);
      if (r.error) setError(r.error);
      else alCambiar(f.id, { comercialId: v || null });
    });
  };
  const estado = (cambio: CambioEstado) => {
    setError(null);
    empezar(async () => {
      const r = await accionEstado(f.id, f.estado, cambio);
      if (r.error) setError(r.error);
      else {
        setPide(null);
        alCambiar(f.id, { estado: cambio.a });
      }
    });
  };
  const elegirEstado = (v: string) => {
    if (v === f.estado) return;
    if (v === "abierta") estado({ a: "abierta" });
    else setPide(v as "pausada" | "cerrada");
  };

  const e = ESTADOS.find((x) => x.valor === f.estado);
  return (
    <>
      <tr className={"odd:bg-white even:bg-[#fafaf8] hover:bg-[#f1f5ee] " + (pendiente ? "opacity-60" : "")}>
        {/* El nombre aun no lleva a ningun sitio: la ficha de la opp que va a
            abrir esta por hacer (Monica, 20-oct-2026). Cuando exista, aqui va su
            enlace. */}
        <td className={TD + " max-w-[380px] truncate font-semibold text-carbon"} title={f.nombre}>
          {f.nombre}
        </td>
        <td className={TD + " max-w-[220px] truncate"} title={f.municipio || undefined}>
          {f.municipio || <span className="text-amber-700/70">por completar</span>}
        </td>
        <td className={TD + " text-carbon/80"}>{f.codigo ?? "—"}</td>
        <td className="border-b border-[#f0f0f0] px-2 py-1">
          <Elegir id={`c_${f.id}`} nombre="" opciones={opciones} valor={f.comercialId ?? ""} alElegir={comercial} desactivado={pendiente} clase="w-[170px]" />
        </td>
        <td className={TD + " text-carbon/80"}>{fecha(f.apertura)}</td>
        <td className="border-b border-[#f0f0f0] px-2 py-1">
          <div className="flex items-center gap-2">
            <i className={"inline-block h-2.5 w-2.5 shrink-0 rounded-full " + (e?.punto ?? "")} />
            <Elegir id={`e_${f.id}`} nombre="" opciones={ESTADOS.map(({ valor, texto }) => ({ valor, texto }))} valor={f.estado} alElegir={elegirEstado} desactivado={pendiente} clase="w-[120px]" />
          </div>
        </td>
      </tr>
      {error && !pide && (
        <tr>
          <td colSpan={6} className="border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-[12.5px] text-amber-900">
            {f.nombre}: {error}
          </td>
        </tr>
      )}
      {pide && <Ventana f={f} a={pide} pendiente={pendiente} alCancelar={() => setPide(null)} alAceptar={estado} error={error} />}
    </>
  );
}

/** Lo que piden pausar (cuándo retomarla) y cerrar (cómo y por qué), igual que
 *  en la ficha de la opp. */
function Ventana({
  f,
  a,
  pendiente,
  error,
  alCancelar,
  alAceptar,
}: {
  f: FilaTodas;
  a: "pausada" | "cerrada";
  pendiente: boolean;
  error: string | null;
  alCancelar: () => void;
  alAceptar: (c: CambioEstado) => void;
}) {
  const [nota, setNota] = useState("");
  const [perdida, setPerdida] = useState(true);
  const [motivo, setMotivo] = useState("");
  return (
    <tr>
      <td colSpan={6} className="p-0">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onMouseDown={(e) => e.target === e.currentTarget && !pendiente && alCancelar()}>
          <div className={CAJA + " w-[380px] max-w-full p-4 shadow-lg"}>
            <div className="text-[15px] font-bold text-carbon">{a === "pausada" ? "Pausarla" : "Cerrarla"}</div>
            <div className="mt-0.5 truncate text-[12.5px] text-carbon/65">
              {f.nombre}
              {f.municipio ? ` · ${f.municipio}` : ""}
            </div>
            {a === "pausada" ? (
              <label className="mt-3 block">
                <span className={ROT}>Retomarla cuándo</span>
                <input autoFocus value={nota} onChange={(e) => setNota(e.target.value)} placeholder="cuando hagan hucha, si sale la subvención…" className={CAMPO + " mt-1"} />
              </label>
            ) : (
              <>
                <span className={ROT + " mt-3 block"}>¿Cómo se cierra?</span>
                <label className="mt-1.5 flex items-center gap-2 text-[13px] text-carbon">
                  <input type="radio" checked={perdida} onChange={() => setPerdida(true)} /> Perdida
                </label>
                <label className="mt-1 flex items-center gap-2 text-[13px] text-carbon">
                  <input type="radio" checked={!perdida} onChange={() => setPerdida(false)} /> Otra razón (no localizable…)
                </label>
                <span className={ROT + " mt-2.5 block"}>¿Por qué?</span>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="se han ido con otro arquitecto, no hay dinero…" className={CAMPO + " mt-1 resize-y"} />
              </>
            )}
            {error && <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12.5px] text-amber-900">{error}</div>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" disabled={pendiente} onClick={alCancelar} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-carbon/65 hover:text-carbon">
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendiente || (a === "cerrada" && !motivo.trim())}
                onClick={() => alAceptar(a === "pausada" ? { a, nota } : { a, perdida, motivo })}
                className="rounded-xl bg-lima px-4 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50"
              >
                {pendiente ? "Guardando…" : a === "pausada" ? "Pausarla" : "Cerrarla"}
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
