import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { datosHoja, oppsParaHoja } from "../../../lib/hojaEncargo";
import { borradoresDe, formasParaHoja, type BorradorGuardado, type LineaGuardada } from "../../../lib/hojaCompromisos";
import { ArbolHoja, ElegirOpp, type Defecto } from "./ArbolHoja";

export const dynamic = "force-dynamic";

// CREAR HOJA DE ENCARGO · PRUEBA (Monica, 22-oct-2026): «en un apartado solo para mi, para probarlo con la base».
// La maqueta validada (docs/figma/hoja-encargo-arbol.md) sobre una opp de verdad: lo que les interesa y el catalogo de
// bloques salen de la base, con la misma lectura que el generador de hojas (datosHoja); las formas de pago, de
// he_formas_pago con su caso por defecto (sin caso, en blanco). GUARDA EN BORRADOR en las tablas nuevas (24-oct) y
// debajo enseña lo guardado, leido de la base, para comprobar que guarda lo que se ve. Solo direccion.

// Lo que les interesa (oportunidad_tipos) -> el paquete del catalogo que lo cubre.
const PAQUETE: Record<string, string> = {
  Ascensor: "asc", Subvenciones: "subv", CSS: "css", IEE: "iee", DF: "df", CAES: "caes", Financiación: "fin",
  "Consulta urbanística": "cons", "Informe técnico": "inf", "Informe pericial": "per", "Memoria técnica valorada": "mem", "3 Presupuestos": "tres",
  Plataforma: "acc", Rampa: "acc", Accesibilidad: "acc", "Cota cero": "acc", "Modificación asc.": "acc", "Sustitución de ascensor": "acc",
  "Accesibilidad portal": "acc", "Añadir parada": "acc", "Cambio de puertas": "acc", "Cambio de cabina": "acc",
  "SATE envolvente completa": "efi", "SATE fachada": "efi", "SATE cubierta": "efi", Aerotermia: "efi", Fotovoltaica: "efi", "Eficiencia energética": "efi",
};

export default async function HojaPrueba({ searchParams }: { searchParams: Promise<{ opp?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/hoja-prueba");
  if (!yo.veTodo) redirect("/gestiones");
  const sp = await searchParams;
  const [opps, d, fp, guardadas] = await Promise.all([
    oppsParaHoja(yo),
    sp.opp ? datosHoja(sp.opp) : Promise.resolve(null),
    formasParaHoja(),
    sp.opp ? borradoresDe(sp.opp) : Promise.resolve([]),
  ]);

  const defectos: Record<string, Defecto> = {};
  for (const b of d?.bloques ?? [])
    defectos[b.codigo] = {
      cobra: b.desglose === "se_cobra",
      importe: b.importe != null ? Number(b.importe) : null,
      forma: fp.defecto[b.codigo] ?? null,
      pct: b.exito?.porcentaje ?? null,
    };
  const interesa = [...new Set((d?.interes ?? []).map((t) => PAQUETE[t.nombre]).filter(Boolean))];
  // Los accesos seleccionados en la opp (vivos), con su escalera: de ellos se eligen los portales de cada cosa.
  const accesos = (d?.oportunidades.find((o) => o.id === d.opp.id)?.accesos ?? []).map((a) => ({ id: a.id, texto: a.texto }));
  const sinPaquete = (d?.interes ?? []).filter((t) => !PAQUETE[t.nombre]).map((t) => t.nombre);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-black/10 pb-3">
          <h1 className="text-2xl font-bold text-carbon">Crear hoja de encargo</h1>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-900/80">Prueba · guarda en borrador</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <ElegirOpp opciones={opps} valor={sp.opp ?? null} />
          {d && (
            <span className="text-sm text-carbon/70">
              Para: <b className="text-carbon">{d.comunidad?.nombre ?? "sin comunidad"}</b>
              {d.interes.length > 0 && <> · Les interesa: <b className="text-carbon">{d.interes.map((t) => t.nombre).join(", ")}</b></>}
              {sinPaquete.length > 0 && <span className="text-amber-800/80"> (sin paquete en el catálogo: {sinPaquete.join(", ")})</span>}
            </span>
          )}
        </div>
        <div className="mt-4">
          {d ? <ArbolHoja key={d.opp.id} oppId={d.opp.id} defectos={defectos} interesa={interesa} accesos={accesos} formas={fp.formas} /> : sp.opp ? <p className="text-sm text-amber-800/80">No encuentro esa oportunidad.</p> : null}
        </div>
        {d && guardadas.length > 0 && <Guardadas borradores={guardadas} accesos={accesos} />}
      </main>
    </div>
  );
}

const mil = (x: number) => Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Lo guardado de esta opp, tal como ha quedado en he_lineas_compromisos: cada fila colgada de la suya. */
function Guardadas({ borradores, accesos }: { borradores: BorradorGuardado[]; accesos: { id: string; texto: string }[] }) {
  const texto = new Map(accesos.map((a) => [a.id, a.texto]));
  const portales = (ids: string[]) =>
    accesos.length > 0 && ids.length === accesos.length && accesos.every((a) => ids.includes(a.id)) ? "todos" : ids.map((i) => texto.get(i) ?? "otro").join(", ");
  const enArbol = (ls: LineaGuardada[]) => {
    const out: { l: LineaGuardada; nivel: number }[] = [];
    const bajar = (padre: string | null, nivel: number) => ls.filter((l) => l.padre === padre).forEach((l) => { out.push({ l, nivel }); bajar(l.id, nivel + 1); });
    bajar(null, 0);
    return out;
  };
  const th = "border border-black/15 bg-black/[.04] px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide text-carbon/60 whitespace-nowrap";
  const td = "border border-black/15 px-2 py-1 whitespace-nowrap";
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-carbon">Lo guardado de esta oportunidad</h2>
      <p className="text-sm text-carbon/60">Leído de la base (tablas nuevas), para comprobar que guarda lo que se ve. Son borradores de prueba.</p>
      {borradores.map((b) => (
        <div key={b.id} className="mt-4">
          <p className="text-sm text-carbon/80">
            <b>Borrador</b> del {new Date(b.creadoEn).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })}
            {b.quien && <> · {b.quien}</>} · {b.lineas.length} filas
          </p>
          <table className="mt-1 border-collapse text-[13px] tabular-nums">
            <thead>
              <tr><th className={th}>Bloque</th><th className={th}>Tipo</th><th className={th}>En el papel</th><th className={th}>Se cobra</th><th className={th}>Importe o %</th><th className={th}>Forma de pago</th><th className={th}>Precios del conjunto</th><th className={th}>Portales</th></tr>
            </thead>
            <tbody>
              {enArbol(b.lineas).map(({ l, nivel }) => (
                <tr key={l.id}>
                  <td className={`${td} ${nivel === 0 ? "font-bold" : ""}`} style={{ paddingLeft: 8 + nivel * 18 }}>{l.bloque}</td>
                  <td className={td}>{l.desglose ?? ""}</td>
                  <td className={td}>{l.enPapel ? "sale" : "no sale"}</td>
                  <td className={td}>{l.seCobra ? "sí" : <i className="text-carbon/55">incluido</i>}</td>
                  <td className={`${td} text-right`}>{l.importe != null ? `${mil(l.importe)} €` : l.porcentaje != null ? `${String(l.porcentaje).replace(".", ",")} %` : ""}</td>
                  <td className={td}>{l.forma ?? ""}</td>
                  <td className={td}>{l.desglosar == null ? "" : l.desglosar ? "desglosados" : "solo el total"}</td>
                  <td className={td}>{portales(l.portales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
