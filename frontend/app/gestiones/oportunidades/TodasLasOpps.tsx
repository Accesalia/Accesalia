"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../components/Elegir";
import { casa, palabrasDe } from "../../../lib/casarBusqueda";
import type { ComercialLista, FilaTodas } from "../../../lib/todasLasOpps";
import { accionComercial, accionEstado, accionPasarGestores, type CambioEstado } from "./acciones";

// El listado de todas las opps: buscador y filtros arriba, la tabla debajo
// ajustada a su contenido (guia, regla 8). El comercial y el estado se cambian
// en la misma fila; pausar y cerrar piden lo mismo que en la ficha.

type Estado = FilaTodas["estado"];
const ESTADOS: { valor: Estado; texto: string; punto: string }[] = [
  { valor: "abierta", texto: "Abierta", punto: "bg-[#3BB54A]" },
  { valor: "pausada", texto: "Pausada", punto: "bg-amber-400" },
  { valor: "cerrada", texto: "Cerrada", punto: "bg-carbon/35" },
];
const SIN = "sin"; // "sin asignar" / "sin administrador", en los filtros
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

type Orden = "nombre" | "municipio" | "codigo" | "apertura" | "admin" | "comercial" | "estado";

/** "Belén Gómez · SM Fincas"; sin gestor, la administracion sola. */
const textoAdmin = (a: FilaTodas["admins"][number]) => [a.gestor, a.empresa].filter(Boolean).join(" · ") || "—";
const adminsDe = (f: FilaTodas) => f.admins.map(textoAdmin).join(" / ");
const SIN_MUNICIPIO = "(sin municipio)";
const anioDe = (f: FilaTodas) => f.apertura?.slice(0, 4) ?? "(sin fecha)";
// EL CAPTADOR (Monica, 20-oct-2026): las siglas del codigo (DAN-2025-001), que
// son de quien la trajo y no cambian aunque la lleve otro.
const SIN_CODIGO = "(sin código)";
const captadorDe = (f: FilaTodas) => f.codigo?.split("-")[0]?.trim().toUpperCase() || SIN_CODIGO;

export function TodasLasOpps({ filas: iniciales, comerciales }: { filas: FilaTodas[]; comerciales: ComercialLista[] }) {
  const router = useRouter();
  // Lo cambiado aqui se ve al momento, sin esperar a que se relea la lista.
  const [cambios, setCambios] = useState<Record<string, Partial<FilaTodas>>>({});
  // La cartera de un gestor que se acaba de pasar a otro comercial (vale para
  // todas sus opps de la lista, no solo para la que se toco).
  const [carteras, setCarteras] = useState<Record<string, string>>({});
  const filas = useMemo(
    () =>
      iniciales.map((f) => {
        const g = { ...f, ...cambios[f.id] };
        return Object.keys(carteras).length ? { ...g, admins: g.admins.map((a) => (a.puestoId && carteras[a.puestoId] ? { ...a, cartera: carteras[a.puestoId] } : a)) } : g;
      }),
    [iniciales, cambios, carteras],
  );
  // Cuantas opps tiene cada gestor, para decirlo al preguntar si se pasa.
  const oppsDeGestor = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of iniciales) for (const a of f.admins) if (a.puestoId) n.set(a.puestoId, (n.get(a.puestoId) ?? 0) + 1);
    return n;
  }, [iniciales]);

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<Estado | "">("");
  const [comercial, setComercial] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [anio, setAnio] = useState("");
  const [admin, setAdmin] = useState("");
  const [captador, setCaptador] = useState("");
  const [orden, setOrden] = useState<{ por: Orden; baja: boolean }>({ por: "apertura", baja: true });
  const [cuantas, setCuantas] = useState(DE_UNA_VEZ);
  // VER POR DIR (Monica, 20-oct-2026): la misma lista, agrupada por DIR, cada
  // una con sus opps colgando como un arbol. Los filtros y el orden, los mismos.
  const [porDir, setPorDir] = useState(false);
  // SOLO LAS DIR CON VARIAS OPPS (Monica, 20-oct-2026: "es muy util"). Varias
  // de verdad, contando todas sus opps (no anuladas), no solo las filtradas:
  // una DIR con una abierta y una cerrada tiene dos.
  const [varias, setVarias] = useState(false);
  // La opp cuyo cuadro "¿su administrador tambien pasa?" esta abierto.
  const [cuadro, setCuadro] = useState<string | null>(null);
  const oppsDeDir = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of iniciales) if (f.dir) n.set(f.dir.id, (n.get(f.dir.id) ?? 0) + 1);
    return n;
  }, [iniciales]);
  const dirsConVarias = useMemo(() => [...oppsDeDir.values()].filter((k) => k > 1).length, [oppsDeDir]);

  const nombreComercial = useMemo(() => new Map(comerciales.map((c) => [c.id, c.nombre])), [comerciales]);

  // LOS FILTROS SE SUMAN (Monica, 20-oct-2026: "si selecciono un comercial me
  // muestra todos los admin, no solo los de ese comercial"). Cada desplegable
  // cuenta sobre lo que dejan pasar TODOS LOS DEMAS filtros (y el buscador),
  // menos el suyo: asi enseña sus otras opciones sin tener que quitarlo. Solo
  // salen las que tienen alguna; la elegida se queda aunque se quede en 0.
  type Filtro = "comercial" | "captador" | "admin" | "municipio" | "anio" | "estado";
  const pasa = useMemo(() => {
    const palabras = palabrasDe(q);
    return (f: FilaTodas, salvo?: Filtro) => {
      if (porDir && varias && (!f.dir || (oppsDeDir.get(f.dir.id) ?? 0) < 2)) return false;
      if (salvo !== "estado" && estado && f.estado !== estado) return false;
      if (salvo !== "comercial" && (comercial === SIN ? f.comercialId !== null : comercial && f.comercialId !== comercial)) return false;
      if (salvo !== "captador" && captador && captadorDe(f) !== captador) return false;
      if (salvo !== "municipio" && municipio && (municipio === SIN_MUNICIPIO ? f.municipio !== "" : !f.municipio.split(", ").includes(municipio))) return false;
      if (salvo !== "anio" && anio && anioDe(f) !== anio) return false;
      if (salvo !== "admin" && (admin === SIN ? f.admins.length > 0 : admin && !f.admins.some((a) => a.clave === admin))) return false;
      if (palabras.length && !casa(palabras, { nombre: `${f.nombre} ${f.codigo ?? ""}`, detalle: `${f.municipio} ${nombreComercial.get(f.comercialId ?? "") ?? ""} ${adminsDe(f)} ${f.dir?.codigo ?? ""} ${f.dir?.nombre ?? ""}` })) return false;
      return true;
    };
  }, [q, estado, comercial, captador, municipio, anio, admin, nombreComercial, porDir, varias, oppsDeDir]);

  const opcionesComercial: Opcion[] = useMemo(() => {
    const n = new Map<string | null, number>();
    for (const f of filas) if (pasa(f, "comercial")) n.set(f.comercialId, (n.get(f.comercialId) ?? 0) + 1);
    const hay = (id: string | null, v: string) => (n.get(id) ?? 0) > 0 || comercial === v;
    return [
      { valor: "", texto: "Todos" },
      ...(hay(null, SIN) ? [{ valor: SIN, texto: "Sin asignar", pista: String(n.get(null) ?? 0) }] : []),
      ...comerciales.filter((c) => hay(c.id, c.id)).map((c) => ({ valor: c.id, texto: c.nombre, pista: String(n.get(c.id) ?? 0) + (c.activo ? "" : " · ya no está") })),
    ];
  }, [filas, pasa, comerciales, comercial]);

  // El del captador: sus siglas, con el nombre de quien las lleva de pista.
  const opcionesCaptador: Opcion[] = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) if (pasa(f, "captador")) n.set(captadorDe(f), (n.get(captadorDe(f)) ?? 0) + 1);
    if (captador && !n.has(captador)) n.set(captador, 0);
    const quien = new Map(comerciales.filter((c) => c.iniciales).map((c) => [c.iniciales!.trim().toUpperCase(), c.nombre]));
    return [
      { valor: "", texto: "Todos" },
      ...[...n].sort((a, b) => b[1] - a[1]).map(([k, c]) => ({ valor: k, texto: k, pista: [quien.get(k), String(c)].filter(Boolean).join(" · ") })),
    ];
  }, [filas, pasa, captador, comerciales]);

  // El del administrador: un gestor cada opcion, con su administracion de
  // pista (asi buscando "SM Fincas" salen todos los suyos).
  const opcionesAdmin: Opcion[] = useMemo(() => {
    const todos = new Map<string, FilaTodas["admins"][number]>();
    const n = new Map<string, number>();
    let sin = 0;
    for (const f of filas) {
      for (const a of f.admins) todos.set(a.clave, a);
      if (!pasa(f, "admin")) continue;
      if (!f.admins.length) sin += 1;
      for (const a of f.admins) n.set(a.clave, (n.get(a.clave) ?? 0) + 1);
    }
    return [
      { valor: "", texto: "Todos" },
      ...(sin > 0 || admin === SIN ? [{ valor: SIN, texto: "Sin administrador", pista: String(sin) }] : []),
      ...[...todos.values()]
        .filter((a) => (n.get(a.clave) ?? 0) > 0 || a.clave === admin)
        .sort((x, y) => (x.gestor ?? x.empresa ?? "").localeCompare(y.gestor ?? y.empresa ?? "", "es"))
        .map((a) => ({ valor: a.clave, texto: a.gestor ?? a.empresa ?? "—", pista: [a.gestor ? a.empresa : null, String(n.get(a.clave) ?? 0)].filter(Boolean).join(" · ") })),
    ];
  }, [filas, pasa, admin]);

  const opcionesMunicipio: Opcion[] = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) if (pasa(f, "municipio")) for (const m of f.municipio ? f.municipio.split(", ") : [SIN_MUNICIPIO]) n.set(m, (n.get(m) ?? 0) + 1);
    if (municipio && !n.has(municipio)) n.set(municipio, 0);
    return [{ valor: "", texto: "Todos" }, ...[...n].sort((a, b) => a[0].localeCompare(b[0], "es")).map(([m, k]) => ({ valor: m, texto: m, pista: String(k) }))];
  }, [filas, pasa, municipio]);

  const opcionesAnio: Opcion[] = useMemo(() => {
    const n = new Map<string, number>();
    for (const f of filas) if (pasa(f, "anio")) n.set(anioDe(f), (n.get(anioDe(f)) ?? 0) + 1);
    if (anio && !n.has(anio)) n.set(anio, 0);
    return [{ valor: "", texto: "Todos" }, ...[...n].sort((a, b) => b[0].localeCompare(a[0])).map(([a, k]) => ({ valor: a, texto: a, pista: String(k) }))];
  }, [filas, pasa, anio]);

  // Las pastillas del estado cuentan dentro de todo lo demas.
  const sinEstado = useMemo(() => filas.filter((f) => pasa(f, "estado")), [filas, pasa]);

  const lista = useMemo(() => {
    const l = estado ? sinEstado.filter((f) => f.estado === estado) : sinEstado;
    const v = (f: FilaTodas) =>
      orden.por === "apertura" ? f.apertura ?? ""
      : orden.por === "admin" ? adminsDe(f)
      : orden.por === "comercial" ? nombreComercial.get(f.comercialId ?? "") ?? ""
      : orden.por === "estado" ? String(ESTADOS.findIndex((e) => e.valor === f.estado))
      : (f[orden.por] ?? "").toString();
    return [...l].sort((a, b) => {
      const x = v(a), y = v(b);
      // Lo vacio, siempre al final.
      if (!x || !y) return x ? -1 : y ? 1 : 0;
      const c = x.localeCompare(y, "es", { numeric: true });
      return orden.baja ? -c : c;
    });
  }, [sinEstado, estado, orden, nombreComercial]);

  // Las DIR, en el orden en que sale su primera opp en la lista ordenada. Las
  // opps sin accesos no tienen DIR: van juntas al final.
  const grupos = useMemo(() => {
    const m = new Map<string, { dir: FilaTodas["dir"]; opps: FilaTodas[] }>();
    for (const f of lista) {
      const k = f.dir?.id ?? "";
      if (!m.has(k)) m.set(k, { dir: f.dir, opps: [] });
      m.get(k)!.opps.push(f);
    }
    const sin = m.get("");
    m.delete("");
    return [...m.values(), ...(sin ? [sin] : [])];
  }, [lista]);

  const hayFiltro = q || estado || comercial || captador || municipio || anio || admin;
  const limpiar = () => {
    setQ(""); setEstado(""); setComercial(""); setCaptador(""); setMunicipio(""); setAnio(""); setAdmin(""); setCuantas(DE_UNA_VEZ);
  };
  const ordenarPor = (por: Orden) => setOrden((o) => (o.por === por ? { por, baja: !o.baja } : { por, baja: por === "apertura" }));
  // Los titulos que ordenan llevan su flecha siempre, para que se vea que se
  // pueden pinchar (Monica, 20-oct-2026, no veia el orden por administrador).
  const flecha = (por: Orden) => (orden.por === por ? (orden.baja ? " ↓" : " ↑") : " ↕");

  const gestoresPasados = (puestoIds: string[], comercialId: string) => {
    setCarteras((x) => ({ ...x, ...Object.fromEntries(puestoIds.map((p) => [p, comercialId])) }));
    router.refresh();
  };
  const extra: Extra = { comerciales, nombreComercial, oppsDeGestor, alCambiar: cambiada, alPasarGestores: gestoresPasados, abrirCuadro: setCuadro };

  function cambiada(id: string, c: Partial<FilaTodas>) {
    setCambios((x) => ({ ...x, [id]: { ...x[id], ...c } }));
    router.refresh();
  }

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
              placeholder="nombre, código, municipio, comercial o administrador…"
              className={CAMPO + " mt-1"}
            />
          </label>
          <Elegir id="f_comercial" nombre="Comercial" opciones={opcionesComercial} valor={comercial} alElegir={(v) => { setComercial(v); setCuantas(DE_UNA_VEZ); }} conPista clase="w-[220px]" />
          <Elegir id="f_captador" nombre="Captador" opciones={opcionesCaptador} valor={captador} alElegir={(v) => { setCaptador(v); setCuantas(DE_UNA_VEZ); }} conPista clase="w-[170px]" />
          <Elegir id="f_admin" nombre="Administrador" opciones={opcionesAdmin} valor={admin} alElegir={(v) => { setAdmin(v); setCuantas(DE_UNA_VEZ); }} conPista clase="w-[260px]" />
          <Elegir id="f_municipio" nombre="Municipio" opciones={opcionesMunicipio} valor={municipio} alElegir={(v) => { setMunicipio(v); setCuantas(DE_UNA_VEZ); }} clase="w-[220px]" />
          <Elegir id="f_anio" nombre="Año de apertura" opciones={opcionesAnio} valor={anio} alElegir={(v) => { setAnio(v); setCuantas(DE_UNA_VEZ); }} clase="w-[140px]" />
          {hayFiltro && (
            <button type="button" onClick={limpiar} className="pb-1.5 text-sm font-semibold text-carbon/65 underline hover:text-carbon">
              Quitar filtros
            </button>
          )}
          <button
            type="button"
            onClick={() => { setPorDir((x) => !x); setCuantas(DE_UNA_VEZ); }}
            className={pill(porDir) + " ml-auto mb-1"}
            title={porDir ? "Volver a la lista de opps" : "Agrupar las opps por su DIR"}
          >
            {porDir ? "Ver la lista" : "Ver por DIR"}
          </button>
          {porDir && (
            <button
              type="button"
              onClick={() => { setVarias((x) => !x); setCuantas(DE_UNA_VEZ); }}
              className={pill(varias) + " mb-1"}
              title="Solo las DIR que tienen más de una opp"
            >
              Solo DIR con varias opps <b>{dirsConVarias}</b>
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
      {/* Sin overflow: una caja con scroll propio CORTA los desplegables de las
          filas (con pocas filas solo se veia el primer comercial; 20-oct-2026). */}
      <section className={CAJA + " mt-3 w-fit"}>
        <table className="w-auto border-collapse text-[13px]">
          <thead className="bg-[#f4f4f1]">
            <tr>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("nombre")} className="uppercase hover:text-carbon hover:underline">
                  {porDir ? `DIR · ${grupos.length} / oportunidad · ${lista.length}` : `Oportunidad · ${lista.length}`}
                  {flecha("nombre")}
                </button>
              </th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("municipio")} className="uppercase hover:text-carbon hover:underline">Municipio{flecha("municipio")}</button>
              </th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("codigo")} className="uppercase hover:text-carbon hover:underline">Código{flecha("codigo")}</button>
              </th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("comercial")} className="uppercase hover:text-carbon hover:underline">Comercial{flecha("comercial")}</button>
              </th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("admin")} className="uppercase hover:text-carbon hover:underline">Administrador{flecha("admin")}</button>
              </th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("apertura")} className="uppercase hover:text-carbon hover:underline">Apertura{flecha("apertura")}</button>
              </th>
              <th className={TH}>
                <button type="button" onClick={() => ordenarPor("estado")} className="uppercase hover:text-carbon hover:underline">Estado{flecha("estado")}</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-carbon/65">
                  No hay ninguna con estos filtros.
                </td>
              </tr>
            )}
            {!porDir &&
              lista.slice(0, cuantas).map((f) => <Fila key={f.id} f={f} extra={extra} />)}
            {porDir &&
              grupos.slice(0, cuantas).map((g) => (
                <Grupo key={g.dir?.id ?? "sin"} dir={g.dir} n={g.opps.length}>
                  {g.opps.map((f, i) => (
                    <Fila key={f.id} f={f} extra={extra} rama={i === g.opps.length - 1 ? "ultima" : "medio"} />
                  ))}
                </Grupo>
              ))}
          </tbody>
        </table>
        {(porDir ? grupos.length : lista.length) > cuantas && (
          <div className="border-t border-[#f0f0f0] px-3 py-2.5 text-sm text-carbon/65">
            Se ven {cuantas} de {porDir ? `${grupos.length} DIR` : lista.length}.{" "}
            <button type="button" onClick={() => setCuantas((n) => n + DE_UNA_VEZ)} className="font-semibold text-carbon underline">
              Ver {Math.min(DE_UNA_VEZ, (porDir ? grupos.length : lista.length) - cuantas)} más
            </button>
          </div>
        )}
      </section>
      {(() => {
        const f = cuadro ? filas.find((x) => x.id === cuadro) : null;
        return f && f.comercialId && deOtraCartera(f, f.comercialId).length > 0 ? (
          <CuadroCartera key={f.id} f={f} extra={extra} alCerrar={() => setCuadro(null)} />
        ) : null;
      })()}
    </>
  );
}

/** La cabecera de una DIR: su numero (solo desde la primera firma) y su nombre,
 *  que ya lleva el municipio. Debajo, sus opps como ramas. */
function Grupo({ dir, n, children }: { dir: FilaTodas["dir"]; n: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-[#f4f4f1]">
        <td colSpan={7} className="border-b border-t border-[#d9d9d9] px-3 py-2">
          <span className="flex items-center gap-2.5 whitespace-nowrap">
            {dir ? (
              <>
                <span className={"rounded-[5px] px-2 py-0.5 text-[11.5px] font-bold " + (dir.codigo ? "bg-carbon text-white" : "border border-carbon/25 bg-white text-carbon/65")}>
                  {dir.codigo ?? "DIR sin número"}
                </span>
                <span className="text-[14px] font-bold text-carbon">{dir.nombre}</span>
              </>
            ) : (
              <span className="text-[14px] font-bold text-amber-800/80">Sin DIR: opps sin portales</span>
            )}
            <span className="text-[12px] text-carbon/65">· {n === 1 ? "1 opp" : `${n} opps`}</span>
          </span>
        </td>
      </tr>
      {children}
    </>
  );
}

type Extra = {
  comerciales: ComercialLista[];
  nombreComercial: Map<string, string>;
  oppsDeGestor: Map<string, number>;
  alCambiar: (id: string, c: Partial<FilaTodas>) => void;
  alPasarGestores: (puestoIds: string[], comercialId: string) => void;
  /** El cuadro de la cartera vive en la LISTA, no en la fila: si la opp sale
   *  del filtro al cambiarle el comercial, la fila desaparece y el cuadro con
   *  ella (20-oct-2026). */
  abrirCuadro: (oppId: string) => void;
};

/** Los gestores de la opp cuya cartera es de OTRO comercial que el que la lleva:
 *  la opp esta "prestada" (se deriva, sin campo; Monica, 8-oct-2026). */
const deOtraCartera = (f: FilaTodas, comercialId: string | null) =>
  comercialId ? f.admins.filter((a) => a.puestoId && a.cartera !== comercialId) : [];

function Fila({
  f,
  extra,
  rama,
}: {
  f: FilaTodas;
  extra: Extra;
  /** En "Ver por DIR": la linea que baja de la DIR y sale hacia esta opp. */
  rama?: "medio" | "ultima";
}) {
  const { comerciales, nombreComercial, alCambiar } = extra;
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
      else {
        alCambiar(f.id, { comercialId: v || null });
        if (deOtraCartera(f, v || null).length) extra.abrirCuadro(f.id);
      }
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
      <tr className={(rama ? "bg-white" : "odd:bg-white even:bg-[#fafaf8]") + " hover:bg-[#f1f5ee] " + (pendiente ? "opacity-60" : "")}>
        {/* El nombre aun no lleva a ningun sitio: la ficha de la opp que va a
            abrir esta por hacer (Monica, 20-oct-2026). Cuando exista, aqui va su
            enlace. */}
        <td className={TD + " relative max-w-[320px] truncate font-semibold text-carbon" + (rama ? " pl-9" : "")} title={f.nombre}>
          {rama && (
            <>
              <span aria-hidden className={"absolute left-5 top-0 w-px bg-carbon/35 " + (rama === "ultima" ? "h-1/2" : "bottom-0")} />
              <span aria-hidden className="absolute left-5 top-1/2 h-px w-3 bg-carbon/35" />
            </>
          )}
          {f.nombre}
        </td>
        <td className={TD + " max-w-[180px] truncate"} title={f.municipio || undefined}>
          {f.municipio || <span className="text-amber-700/70">por completar</span>}
        </td>
        <td className={TD + " text-carbon/80"}>{f.codigo ?? "—"}</td>
        <td className="border-b border-[#f0f0f0] px-2 py-1">
          <Elegir id={`c_${f.id}`} nombre="" opciones={opciones} valor={f.comercialId ?? ""} alElegir={comercial} desactivado={pendiente} clase="w-[170px]" />
        </td>
        <td className={TD + " max-w-[260px] truncate"} title={f.admins.length ? adminsDe(f) : undefined}>
          {f.admins.length ? (
            f.admins.map((a, i) => (
              <span key={a.clave}>
                {i > 0 && <span className="text-carbon/40"> / </span>}
                {a.gestor ?? a.empresa}
                {a.gestor && a.empresa && <span className="text-[12px] text-carbon/65"> · {a.empresa}</span>}
                {a.puestoId && f.comercialId && a.cartera !== f.comercialId && (
                  <button
                    type="button"
                    onClick={() => extra.abrirCuadro(f.id)}
                    className="ml-1.5 rounded-[5px] border border-amber-300 bg-amber-50 px-1.5 py-px text-[11px] font-semibold text-amber-900 hover:border-amber-500"
                    title="Este gestor es de la cartera de otro comercial: ¿pasarlo al que lleva la opp?"
                  >
                    cartera de {a.cartera ? nombreComercial.get(a.cartera) ?? "otro" : "nadie"}
                  </button>
                )}
              </span>
            ))
          ) : (
            <span className="text-amber-700/70">por completar</span>
          )}
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
          <td colSpan={7} className="border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-[12.5px] text-amber-900">
            {f.nombre}: {error}
          </td>
        </tr>
      )}
      {pide && <Ventana f={f} a={pide} pendiente={pendiente} alCancelar={() => setPide(null)} alAceptar={estado} error={error} />}
    </>
  );
}

/** ¿PASAR TAMBIEN EL ADMINISTRADOR, O SOLO LA OPP? (Monica, 20-oct-2026: "paso
 *  opps de Alvaro a Oscar y a Oscar no le sale ni un administrador en su
 *  cartera"). La cartera es del GESTOR (puesto.comercial_id), no de la opp: al
 *  pasarlo, sus opps nuevas son del nuevo; si no, esta queda prestada. */
function CuadroCartera({ f, extra, alCerrar }: { f: FilaTodas; extra: Extra; alCerrar: () => void }) {
  const nuevo = f.comercialId!;
  const gestores = deOtraCartera(f, nuevo);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(gestores.map((g) => g.puestoId!)));
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const quien = extra.nombreComercial.get(nuevo) ?? "el nuevo comercial";

  const marcar = (id: string, si: boolean) =>
    setMarcados((m) => {
      const x = new Set(m);
      if (si) x.add(id);
      else x.delete(id);
      return x;
    });
  const pasar = () => {
    const ids = [...marcados];
    if (!ids.length) return alCerrar();
    setError(null);
    empezar(async () => {
      const r = await accionPasarGestores(f.id, ids, nuevo);
      if (r.error) setError(r.error);
      else {
        extra.alPasarGestores(ids, nuevo);
        alCerrar();
      }
    });
  };

  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onMouseDown={(e) => e.target === e.currentTarget && !pendiente && alCerrar()}>
          <div className={CAJA + " w-[480px] max-w-full p-4 shadow-lg"}>
            <div className="text-[15px] font-bold text-carbon">¿Su administrador también pasa a {quien}?</div>
            <div className="mt-0.5 text-[12.5px] text-carbon/65">
              {f.nombre} la lleva ahora {quien}, pero su administrador es de otra cartera.
            </div>
            <div className="mt-3 space-y-2">
              {gestores.map((g) => {
                const n = extra.oppsDeGestor.get(g.puestoId!) ?? 0;
                const de = g.cartera ? extra.nombreComercial.get(g.cartera) ?? "otro comercial" : "nadie";
                return (
                  <label key={g.clave} className="flex items-start gap-2.5 rounded-lg border border-black/10 bg-hueso px-3 py-2 text-[13px] text-carbon">
                    <input type="checkbox" className="mt-0.5" checked={marcados.has(g.puestoId!)} onChange={(e) => marcar(g.puestoId!, e.target.checked)} />
                    <span>
                      <b>{g.gestor ?? g.empresa}</b>
                      {g.gestor && g.empresa && <span className="text-carbon/65"> · {g.empresa}</span>}
                      <span className="block text-[12px] text-carbon/70">
                        En la cartera de {de} · {n === 1 ? "1 opp" : `${n} opps`} con este gestor en total
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2.5 text-[12px] text-carbon/65">
              Pasarlo cambia su cartera: sus opps nuevas serán de {quien}. Las que ya tiene siguen con quien las lleve.
            </p>
            {error && <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12.5px] text-amber-900">{error}</div>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" disabled={pendiente} onClick={alCerrar} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-carbon/65 hover:text-carbon">
                Solo la opp
              </button>
              <button
                type="button"
                disabled={pendiente || marcados.size === 0}
                onClick={pasar}
                className="rounded-xl bg-lima px-4 py-2 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-50"
              >
                {pendiente ? "Pasando…" : marcados.size === gestores.length ? `Pasar también a ${quien}` : `Pasar los marcados a ${quien}`}
              </button>
            </div>
          </div>
        </div>
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
      <td colSpan={7} className="p-0">
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
