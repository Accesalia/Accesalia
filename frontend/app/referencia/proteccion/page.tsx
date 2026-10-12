import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { quienSoy } from "../../../lib/sesion";
import { documentosDe, type DocumentoReferencia } from "../../../lib/documentosReferencia";
import { nombreBonito } from "../../../lib/catalogoProteccion";
import { Salida } from "../../components/Salida";

export const dynamic = "force-dynamic";

// CONSULTAS DE EDIFICIOS PROTEGIDOS (Monica, 11-oct-2026): "por municipios,
// acceso a los pdf o docs que hemos bajado + los enlaces de los que los bajamos
// + la fecha de bajada y la fecha probable en que habria que revisar si siguen
// actualizados (6 meses)". Para consultarlos tal cual, ademas de lo extraido
// (catalogo_proteccion), que sale en las fichas. Tabla documentos_referencia,
// seccion proteccion.

const URL_BASE = process.env.SUPABASE_URL ?? "";
const SECRETO = process.env.SUPABASE_SECRET_KEY ?? "";

const BOTON =
  "inline-flex h-[34px] items-center justify-center rounded-[10px] px-4 text-[13px] font-bold transition";

const bonito = nombreBonito;

const mb = (n: number | null) => (n ? `${(n / 1e6).toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB` : null);
const fecha = (d: string | null) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";

// Cuantos elementos se han sacado ya de los PDF de cada municipio (a la tabla).
async function extraidos(): Promise<Map<string, number>> {
  const r = await fetch(`${URL_BASE}/rest/v1/catalogo_proteccion?select=municipio`, {
    headers: { apikey: SECRETO, Authorization: `Bearer ${SECRETO}` },
    cache: "no-store",
  });
  const cuenta = new Map<string, number>();
  if (!r.ok) return cuenta;
  for (const f of (await r.json()) as { municipio: string }[]) cuenta.set(f.municipio, (cuenta.get(f.municipio) ?? 0) + 1);
  return cuenta;
}

export default async function Proteccion() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/referencia/proteccion");
  const [docs, cuenta] = await Promise.all([documentosDe("proteccion"), extraidos()]);
  const hoy = new Date().toISOString().slice(0, 10);

  const porMunicipio = new Map<string, DocumentoReferencia[]>();
  for (const d of docs) {
    const m = d.municipio ?? "SIN MUNICIPIO";
    porMunicipio.set(m, [...(porMunicipio.get(m) ?? []), d]);
  }

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[900px] px-4 py-6 sm:px-6">
        <Salida href="/referencia">
          ← Documentación de referencia
        </Salida>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Consultas de edificios protegidos</h1>
        <p className="mt-1 text-carbon/55">
          Catálogos, normas y planos de protección de cada municipio, tal como los publica el ayuntamiento. Con el enlace de
          donde se bajaron y cuándo toca mirar si han cambiado.
        </p>

        {porMunicipio.size === 0 && (
          <p className="mt-6 rounded-2xl border border-black/5 bg-white p-5 text-[13px] text-carbon/55 shadow-sm">Todavía no hay documentos.</p>
        )}

        {[...porMunicipio].map(([municipio, lista]) => (
          <section key={municipio} className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-carbon">{bonito(municipio)}</h2>
              <span className="text-[12.5px] text-carbon/55">
                {cuenta.get(municipio)
                  ? `${cuenta.get(municipio)} elementos sacados a la tabla`
                  : "Aún no se ha sacado nada a la tabla"}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {lista.map((d) => {
                const toca = d.revisarEn !== null && d.revisarEn <= hoy;
                return (
                  <div key={d.id} className="rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[16px] font-bold text-carbon">{d.titulo}</div>
                        <div className="mt-0.5 text-[12.5px] text-carbon/55">
                          {["PDF", mb(d.tamano)].filter(Boolean).join(" · ")}
                          {d.descripcion && <> · {d.descripcion}</>}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {d.ver && (
                          <a href={d.ver} target="_blank" rel="noreferrer" className={BOTON + " bg-lima text-carbon hover:bg-lima-dark hover:text-white"}>
                            Ver
                          </a>
                        )}
                        {d.descargar && (
                          <a href={d.descargar} className={BOTON + " border border-carbon/20 bg-white text-carbon/80 hover:border-carbon/50"}>
                            Descargar
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-black/5 pt-2.5 text-[12.5px] text-carbon/60">
                      <span>Bajado el {fecha(d.descargadoEn)}</span>
                      <span className={toca ? "font-bold text-alerta" : ""}>
                        {toca ? "Toca revisar si ha cambiado (desde el " : "Revisar si ha cambiado el "}
                        {fecha(d.revisarEn)}
                        {toca ? ")" : ""}
                      </span>
                      {d.urlOrigen && (
                        <a href={d.urlOrigen} target="_blank" rel="noreferrer" className="font-semibold text-lima-dark underline-offset-2 hover:underline">
                          Original en la web oficial ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
