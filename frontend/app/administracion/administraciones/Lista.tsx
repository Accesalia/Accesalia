"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Elegir, type Opcion } from "../../components/Elegir";
import { casa, palabrasDe } from "../../../lib/casarBusqueda";
import type { FilaEmpresa, FilaGestor } from "../../../lib/listaAdministraciones";

// La lista de administradores, en dos vistas (por administracion o por
// gestor), con buscador, filtros que se suman y orden por columna, como la de
// todas las opps. Tabla ajustada a su contenido (guia, regla 8).

const SIN = "sin";
const DE_UNA_VEZ = 200;

const CAJA = "rounded-[10px] border border-[#d9d9d9] bg-white";
const ROT = "text-[10px] font-bold uppercase tracking-wide text-carbon/70";
const TH = "border-b border-[#d9d9d9] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-[#6e6e6e] whitespace-nowrap";
const TD = "border-b border-[#f0f0f0] px-3 py-1.5 whitespace-nowrap";
const CAMPO = "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-carbon placeholder:text-carbon/55 focus:border-lima focus:outline-none";
const pill = (on: boolean) =>
  "rounded-full border px-3 py-1 text-[12.5px] transition " +
  (on ? "border-carbon bg-carbon font-semibold text-white" : "border-carbon/25 bg-white text-carbon/75 hover:border-carbon");
const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : null);
const anioDe = (v: string | null) => v?.slice(0, 4) ?? "(sin fecha)";
const FALTA = <span className="text-amber-700/70">por completar</span>;

type Vista = "empresa" | "gestor";
type Orden = "nombre" | "otro" | "alta" | "comercial" | "contacto" | "firmadas";
type Firmadas = "" | "con" | "sin";

/** Lo comun a las dos vistas, para filtrar y ordenar con la misma regla. */
type Fila = {
  clave: string;
  nombre: string;
  /** El jefe (empresa) o la administracion (gestor). */
  otro: string;
  alta: string | null;
  comerciales: string[];
  contacto: string | null;
  firmadas: number;
  buscar: string;
};

export function Lista({ empresas, gestores, comerciales }: { empresas: FilaEmpresa[]; gestores: FilaGestor[]; comerciales: { id: string; nombre: string }[] }) {
  const [vista, setVista] = useState<Vista>("empresa");
  const [q, setQ] = useState("");
  const [comercial, setComercial] = useState("");
  const [anio, setAnio] = useState("");
  const [firmadas, setFirmadas] = useState<Firmadas>("");
  const [orden, setOrden] = useState<{ por: Orden; baja: boolean }>({ por: "nombre", baja: false });
  const [cuantas, setCuantas] = useState(DE_UNA_VEZ);

  const nombreComercial = useMemo(() => new Map(comerciales.map((c) => [c.id, c.nombre])), [comerciales]);
  const deEmpresa = useMemo(() => new Map(empresas.map((e) => [e.id, e])), [empresas]);
  const deGestor = useMemo(() => new Map(gestores.map((g) => [g.puestoId, g])), [gestores]);

  const gestoresDe = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const g of gestores) m.set(g.empresaId, [...(m.get(g.empresaId) ?? []), g.nombre]);
    return m;
  }, [gestores]);

  const filas: Fila[] = useMemo(
    () =>
      vista === "empresa"
        ? empresas.map((e) => ({
            clave: e.id,
            nombre: e.nombre,
            otro: e.jefes.join(", "),
            alta: e.alta,
            comerciales: e.comerciales,
            contacto: e.ultimoContacto,
            firmadas: e.firmadas,
            // Tambien por TODOS sus gestores, no solo el jefe (Monica, 20-oct-2026:
            // buscando a una gestora no salia su administracion).
            buscar: `${e.jefes.join(" ")} ${e.municipio ?? ""} ${(gestoresDe.get(e.id) ?? []).join(" ")}`,
          }))
        : gestores.map((g) => ({
            clave: g.puestoId,
            nombre: g.nombre,
            otro: g.empresa,
            alta: g.alta,
            comerciales: g.comercialId ? [g.comercialId] : [],
            contacto: g.ultimoContacto,
            firmadas: g.firmadas,
            buscar: `${g.cargo ?? ""} ${g.municipio ?? ""}`,
          })),
    [vista, empresas, gestores, gestoresDe],
  );

  // LOS FILTROS SE SUMAN: cada uno cuenta sobre lo que dejan los demas.
  type Filtro = "comercial" | "anio" | "firmadas";
  const pasa = useMemo(() => {
    const palabras = palabrasDe(q);
    return (f: Fila, salvo?: Filtro) => {
      if (salvo !== "comercial" && (comercial === SIN ? f.comerciales.length > 0 : comercial && !f.comerciales.includes(comercial))) return false;
      if (salvo !== "anio" && anio && anioDe(f.alta) !== anio) return false;
      if (salvo !== "firmadas" && (firmadas === "con" ? f.firmadas === 0 : firmadas === "sin" ? f.firmadas > 0 : false)) return false;
      if (palabras.length && !casa(palabras, { nombre: f.nombre, detalle: `${f.otro} ${f.comerciales.map((c) => nombreComercial.get(c) ?? "").join(" ")} ${f.buscar}` })) return false;
      return true;
    };
  }, [q, comercial, anio, firmadas, nombreComercial]);

  const opcionesComercial: Opcion[] = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) if (pasa(f, "comercial")) for (const c of f.comerciales.length ? f.comerciales : [SIN]) n.set(c, (n.get(c) ?? 0) + 1);
    const hay = (k: string) => (n.get(k) ?? 0) > 0 || comercial === k;
    return [
      { valor: "", texto: "Todos" },
      ...(hay(SIN) ? [{ valor: SIN, texto: "Sin comercial", pista: String(n.get(SIN) ?? 0) }] : []),
      ...comerciales.filter((c) => hay(c.id)).map((c) => ({ valor: c.id, texto: c.nombre, pista: String(n.get(c.id) ?? 0) })),
    ];
  }, [filas, pasa, comerciales, comercial]);
  const opcionesAnio: Opcion[] = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) if (pasa(f, "anio")) n.set(anioDe(f.alta), (n.get(anioDe(f.alta)) ?? 0) + 1);
    if (anio && !n.has(anio)) n.set(anio, 0);
    return [{ valor: "", texto: "Todos" }, ...[...n].sort((a, b) => b[0].localeCompare(a[0])).map(([a, k]) => ({ valor: a, texto: a, pista: String(k) }))];
  }, [filas, pasa, anio]);
  const sinFirmadas = useMemo(() => filas.filter((f) => pasa(f, "firmadas")), [filas, pasa]);

  const lista = useMemo(() => {
    const l = filas.filter((f) => pasa(f));
    const v = (f: Fila): string | number =>
      orden.por === "nombre" ? f.nombre
      : orden.por === "otro" ? f.otro
      : orden.por === "alta" ? f.alta ?? ""
      : orden.por === "contacto" ? f.contacto ?? ""
      : orden.por === "firmadas" ? f.firmadas
      : f.comerciales.map((c) => nombreComercial.get(c) ?? "").sort().join(", ");
    return [...l].sort((a, b) => {
      const x = v(a), y = v(b);
      if (typeof x === "number" && typeof y === "number") return orden.baja ? y - x : x - y;
      // Lo vacio, siempre al final.
      if (!x || !y) return x ? -1 : y ? 1 : 0;
      const c = String(x).localeCompare(String(y), "es", { numeric: true });
      return orden.baja ? -c : c;
    });
  }, [filas, pasa, orden, nombreComercial]);

  const hayFiltro = q || comercial || anio || firmadas;
  const limpiar = () => {
    setQ(""); setComercial(""); setAnio(""); setFirmadas(""); setCuantas(DE_UNA_VEZ);
  };
  const ordenarPor = (por: Orden) =>
    setOrden((o) => (o.por === por ? { por, baja: !o.baja } : { por, baja: por === "alta" || por === "contacto" || por === "firmadas" }));
  // Los titulos que ordenan llevan su flecha siempre, para que se vea.
  const Titulo = ({ por, children }: { por: Orden; children: React.ReactNode }) => (
    <th className={TH}>
      <button type="button" onClick={() => ordenarPor(por)} className="uppercase hover:text-carbon hover:underline">
        {children}
        {orden.por === por ? (orden.baja ? " ↓" : " ↑") : " ↕"}
      </button>
    </th>
  );
  const cambiarVista = (v: Vista) => {
    setVista(v);
    setCuantas(DE_UNA_VEZ);
    setOrden({ por: "nombre", baja: false });
  };
  const nombres = (ids: string[]) => ids.map((c) => nombreComercial.get(c) ?? "—").join(", ");

  return (
    <>
      {/* -------------------- vista, buscador y filtros -------------------- */}
      <section className={CAJA + " mt-5 p-4"}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={ROT + " mr-1"}>Ver</span>
          <button type="button" onClick={() => cambiarVista("empresa")} className={pill(vista === "empresa")}>
            Por administración <b>{empresas.length}</b>
          </button>
          <button type="button" onClick={() => cambiarVista("gestor")} className={pill(vista === "gestor")}>
            Por gestor <b>{gestores.length}</b>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="w-[320px] max-w-full">
            <span className={ROT}>Buscar</span>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setCuantas(DE_UNA_VEZ); }}
              placeholder={vista === "empresa" ? "administración, gestor, comercial o municipio…" : "gestor, administración, comercial o cargo…"}
              className={CAMPO + " mt-1"}
            />
          </label>
          <Elegir id="f_comercial" nombre="Comercial" opciones={opcionesComercial} valor={comercial} alElegir={(v) => { setComercial(v); setCuantas(DE_UNA_VEZ); }} conPista clase="w-[200px]" />
          <Elegir id="f_anio" nombre="Año de alta" opciones={opcionesAnio} valor={anio} alElegir={(v) => { setAnio(v); setCuantas(DE_UNA_VEZ); }} conPista clase="w-[140px]" />
          {hayFiltro && (
            <button type="button" onClick={limpiar} className="pb-1.5 text-sm font-semibold text-carbon/65 underline hover:text-carbon">
              Quitar filtros
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={ROT + " mr-1"}>Firmadas</span>
          {(
            [
              ["", "Todos", sinFirmadas.length],
              ["con", "Con alguna firmada", sinFirmadas.filter((f) => f.firmadas > 0).length],
              ["sin", "Sin ninguna", sinFirmadas.filter((f) => f.firmadas === 0).length],
            ] as [Firmadas, string, number][]
          ).map(([v, t, n]) => (
            <button key={v || "todos"} type="button" onClick={() => { setFirmadas(v); setCuantas(DE_UNA_VEZ); }} className={pill(firmadas === v)}>
              {t} <b>{n}</b>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------------------- la tabla ---------------------------- */}
      <section className={CAJA + " mt-3 w-fit"}>
        <table className="w-auto border-collapse text-[13px]">
          <thead className="bg-[#f4f4f1]">
            <tr>
              <Titulo por="nombre">{vista === "empresa" ? "Administración" : "Gestor"} · {lista.length}</Titulo>
              <Titulo por="otro">{vista === "empresa" ? "Jefe" : "Administración"}</Titulo>
              <Titulo por="alta">Alta en cartera</Titulo>
              <Titulo por="comercial">Comercial</Titulo>
              {vista === "empresa" && <Titulo por="contacto">Último contacto</Titulo>}
              <Titulo por="firmadas">Firmadas</Titulo>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-carbon/65">
                  No hay ninguno con estos filtros.
                </td>
              </tr>
            )}
            {lista.slice(0, cuantas).map((f) => {
              const g = vista === "gestor" ? deGestor.get(f.clave) : undefined;
              const e = vista === "empresa" ? deEmpresa.get(f.clave) : undefined;
              return (
                <tr key={f.clave} className="odd:bg-white even:bg-[#fafaf8] hover:bg-[#f1f5ee]">
                  <td className={TD + " max-w-[340px] truncate font-semibold text-carbon"} title={f.nombre}>
                    {/* La administracion abre su ficha (20-oct-2026); el gestor,
                        su ficha de persona. */}
                    {e ? (
                      <Link href={`/administracion/administraciones/${e.id}`} className="hover:underline">
                        {f.nombre}
                      </Link>
                    ) : g?.personaId ? (
                      <Link href={`/consulta/personas/${g.personaId}`} className="hover:underline">
                        {f.nombre}
                      </Link>
                    ) : (
                      f.nombre
                    )}
                    {g?.jefe && <span className="ml-1.5 rounded-[3px] bg-[#E3EAF0] px-1 text-[10px] font-bold uppercase text-[#104269]">jefe</span>}
                  </td>
                  <td className={TD + " max-w-[300px] truncate"} title={f.otro || undefined}>
                    {f.otro || (vista === "empresa" ? FALTA : "—")}
                    {e && e.gestores === 0 && <span className="ml-1.5 text-[12px] text-carbon/65">(sin gestores)</span>}
                  </td>
                  <td className={TD + " text-carbon/80"}>{fecha(f.alta) ?? <span className="text-carbon/50">sin opps</span>}</td>
                  <td className={TD + " max-w-[220px] truncate"} title={nombres(f.comerciales) || undefined}>
                    {f.comerciales.length ? nombres(f.comerciales) : FALTA}
                  </td>
                  {vista === "empresa" && <td className={TD + " text-carbon/80"}>{fecha(f.contacto) ?? "—"}</td>}
                  <td className={TD + " text-right tabular-nums " + (f.firmadas ? "font-semibold text-carbon" : "text-carbon/50")}>{f.firmadas}</td>
                </tr>
              );
            })}
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
