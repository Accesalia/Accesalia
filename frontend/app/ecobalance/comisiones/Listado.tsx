import Link from "next/link";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { listaAcuerdos, SOBRES, type Acuerdo } from "../../../lib/comisionesAdmin";
import { textoCondicion } from "./formato";

// COMISIONES DE ADMINISTRADORES › EL LISTADO (Monica, 17-oct-2026). Solo Ana y
// direccion. Una fila por acuerdo: quien cobra, de que administraciones, y lo que
// se lleva de proyecto, de subvenciones y de contrata. Arriba los verificados por
// Monica; abajo, aparte, lo que esta por revisar (lo de Monday no era fiable).

const TITULO = { proyecto: "Proyecto", subvenciones: "Subvenciones", contrata: "Contrata" } as const;
const COLS = "grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_130px_130px_170px_110px]";

function Fila({ a, repetidas }: { a: Acuerdo; repetidas: Set<string> }) {
  const apagado = !a.vigente || a.noCobra;
  return (
    <Link
      href={`/ecobalance/comisiones/${a.id}`}
      className={`grid ${COLS} items-baseline gap-x-3 border-b border-black/5 px-4 py-2.5 text-[13.5px] last:border-0 hover:bg-[#fafbf9] ${apagado ? "opacity-55" : ""}`}
    >
      <span className="min-w-0 truncate font-semibold text-carbon">
        {a.persona ?? <span className="font-normal italic text-carbon/45">sin persona</span>}
        {a.alcance === "lo_suyo" && <span className="ml-1.5 rounded-full bg-[#e6eef8] px-1.5 py-px text-[11px] font-bold text-[#2d4f7c]">solo lo suyo</span>}
      </span>
      <span className="min-w-0 truncate text-carbon/75" title={a.empresas.map((e) => e.nombre).join(", ")}>
        {a.empresas.map((e, i) => (
          <span key={e.id}>
            {i > 0 && ", "}
            {e.nombre}
            {repetidas.has(e.id) && (
              <span className="ml-1 text-[#b4441c]" title="Esta administración está en más de un acuerdo vigente">
                ⚠
              </span>
            )}
          </span>
        ))}
      </span>
      {SOBRES.map((s) => {
        const t = textoCondicion(a.condiciones[s], s === "contrata");
        return (
          <span key={s} className="min-w-0">
            {t ? (
              <>
                <span className={`font-semibold tabular-nums ${t.valor === "pendiente" ? "text-[#875f07]" : "text-carbon"}`}>{t.valor}</span>
                {t.detalle && <span className="block truncate text-[11.5px] text-carbon/50">{t.detalle}</span>}
              </>
            ) : (
              <span className="text-carbon/30">—</span>
            )}
          </span>
        );
      })}
      <span>
        {a.noCobra ? (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[12px] font-semibold text-carbon/55">no cobra</span>
        ) : a.vigente ? (
          <span className="rounded-full bg-[#e3f1d6] px-2 py-0.5 text-[12px] font-semibold text-[#2f5d14]">vigente</span>
        ) : (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[12px] font-semibold text-carbon/55">de baja</span>
        )}
      </span>
    </Link>
  );
}

function Tabla({ titulo, nota, lista, repetidas }: { titulo: string; nota?: string; lista: Acuerdo[]; repetidas: Set<string> }) {
  return (
    <section className="mt-6">
      <h2 className="text-[17px] font-bold text-carbon">
        {titulo} <span className="ml-1 text-[14px] font-normal text-carbon/50">{lista.length}</span>
      </h2>
      {nota && <p className="mt-0.5 text-[13px] text-carbon/55">{nota}</p>}
      <div className="mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className={`grid ${COLS} gap-x-3 border-b border-black/10 px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-wide text-carbon/50`}>
          <span>Quién cobra</span>
          <span>Administración</span>
          {SOBRES.map((s) => (
            <span key={s}>{TITULO[s]}</span>
          ))}
          <span />
        </div>
        {lista.length === 0 && <div className="px-5 py-6 text-center text-[13.5px] text-carbon/55">Ninguno.</div>}
        {lista.map((a) => (
          <Fila key={a.id} a={a} repetidas={repetidas} />
        ))}
      </div>
    </section>
  );
}

/** El contenido, sin el permiso (lo pone quien lo pinta). */
export async function ListadoComisiones() {
  const todos = await listaAcuerdos();
  // Una administracion en dos acuerdos vigentes: aviso (alguien cobraria dos veces).
  const cuenta = new Map<string, number>();
  for (const a of todos) if (a.vigente && !a.noCobra && a.alcance === "empresas") for (const e of a.empresas) cuenta.set(e.id, (cuenta.get(e.id) ?? 0) + 1);
  const repetidas = new Set([...cuenta].filter(([, n]) => n > 1).map(([id]) => id));
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <Salida href="/ecobalance">← Ecobalance</Salida>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <h1 className="text-3xl font-bold text-carbon">Comisiones de administradores</h1>
            <p className="mt-1 text-[14px] text-carbon/65">Lo pactado con cada uno. Cobra el jefe; factura siempre a Ecobalance. Solo lo ven Ana, Daniel y Mónica.</p>
          </div>
          <Link href="/ecobalance/comisiones/nuevo" className="ml-auto rounded-xl bg-carbon px-4 py-2 text-[14px] font-bold text-white hover:bg-carbon/85">
            + Nuevo acuerdo
          </Link>
        </div>
        {repetidas.size > 0 && (
          <p className="mt-4 rounded-xl bg-[#fdf0e8] px-4 py-2.5 text-[13.5px] text-[#8a3413]">
            ⚠ Hay {repetidas.size === 1 ? "una administración" : `${repetidas.size} administraciones`} en más de un acuerdo vigente: revisa que nadie cobre dos veces.
          </p>
        )}
        <Tabla titulo="Verificados" lista={todos.filter((a) => a.revision === "verificado")} repetidas={repetidas} />
        <Tabla
          titulo="Por revisar"
          nota="No se dan por buenos hasta que Mónica los verifique: no cuentan para las hojas ni para lo que se les debe."
          lista={todos.filter((a) => a.revision !== "verificado")}
          repetidas={repetidas}
        />
      </main>
    </div>
  );
}
