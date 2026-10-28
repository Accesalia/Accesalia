import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { Elegir } from "../../components/Elegir";
import { quienSoy } from "../../../lib/sesion";
import { comercialesConCorreo, costeUsd, generarParte, MODELOS, partesGuardados, type Modelo } from "../../../lib/parteDeAyer";
import { BotonGenerar } from "./BotonGenerar";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// EL PARTE DE AYER, EN PRUEBA (Monica, 28-oct-2026: «el boton en gestiones de
// la app, un boton para cada correo»). Arriba, el correo de cada comercial y su
// boton de conectar (solo lectura). Debajo, generar el parte de un dia con
// Mistral Large o Medium, y los partes ya hechos para compararlos. Solo direccion.

const BOTON =
  "inline-flex h-[32px] items-center justify-center whitespace-nowrap rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3 text-[12px] font-bold uppercase text-white transition hover:bg-[#46769c]";

const ayerMadrid = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(Date.now() - 24 * 3600_000));

async function generar(datos: FormData) {
  "use server";
  const yo = await quienSoy();
  if (!yo?.veTodo) redirect("/menu");
  const comercialId = String(datos.get("comercial") ?? "");
  const dia = String(datos.get("dia") ?? "");
  const modelo = String(datos.get("modelo") ?? "") as Modelo;
  const c = (await comercialesConCorreo()).find((x) => x.id === comercialId);
  if (!c?.correo || !c.conectado || !/^\d{4}-\d{2}-\d{2}$/.test(dia) || !(modelo in MODELOS)) {
    redirect("/gestiones/parte-de-ayer?google_mal=" + encodeURIComponent("Elige un comercial con el correo conectado, el día y el modelo."));
  }
  const id = await generarParte({ comercialId, correo: c.correo, dia, modelo, pedidoPor: yo.id });
  redirect(`/gestiones/parte-de-ayer?parte=${id}#parte`);
}

export default async function ParteDeAyer({
  searchParams,
}: {
  searchParams: Promise<{ google_ok?: string; google_mal?: string; parte?: string }>;
}) {
  const { google_ok, google_mal, parte } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/parte-de-ayer");
  if (!yo.veTodo) redirect("/menu");

  const [comerciales, partes] = await Promise.all([comercialesConCorreo(), partesGuardados()]);
  const nombre = new Map(comerciales.map((c) => [c.id, c.nombre]));
  const conectados = comerciales.filter((c) => c.conectado && c.correo);
  const abierto = partes.find((p) => p.id === parte) ?? partes[0];

  return (
    <div className="min-h-screen bg-white">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <div className="mt-3 border-b border-black/10 pb-3">
          <h1 className="text-[25px] font-bold leading-tight text-carbon">El parte de ayer</h1>
          <p className="mt-1 text-[13px] text-carbon/60">
            Sali lee el correo de un día de un comercial, los hilos enteros tal como llegan, y prepara su parte. En prueba:
            solo lo ve dirección.
          </p>
        </div>

        {google_ok && (
          <p className="mt-4 rounded-xl border border-lima bg-lima-soft px-4 py-2.5 text-[13px] text-carbon">
            Conectado el correo {google_ok}.
          </p>
        )}
        {google_mal && (
          <p className="mt-4 rounded-xl border border-alerta/40 bg-red-50 px-4 py-2.5 text-[13px] text-alerta">{google_mal}</p>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[auto_1fr]">
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/70">El correo de cada comercial</h2>
            <table className="mt-3 w-auto text-[13px]">
              <tbody>
                {comerciales.map((c) => (
                  <tr key={c.id} className="border-t border-black/5">
                    <td className="whitespace-nowrap py-2 pr-4 font-semibold text-carbon">{c.nombre}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-carbon/70">{c.correo ?? <span className="text-amber-700">sin correo</span>}</td>
                    <td className="whitespace-nowrap py-2 pr-4">
                      {c.conectado ? <span className="text-lima-dark">conectado</span> : <span className="text-carbon/45">sin conectar</span>}
                    </td>
                    <td className="py-2">
                      {c.correo && (
                        // Enlace normal, no <Link>: Google se abre en la pestaña.
                        <a href={`/api/buzon/google/comercial?id=${c.id}`} className={BOTON}>
                          {c.conectado ? "Reconectar" : "Conectar"}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 max-w-[460px] text-[12px] text-carbon/55">
              Hay que entrar con la cuenta de ese comercial. Solo lectura: Sali no marca, mueve, envía ni borra nada. Google
              avisará de que la app no está verificada: «Configuración avanzada» → «Ir a Accesalia».
            </p>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/70">Generar un parte</h2>
            {conectados.length ? (
              <form action={generar} className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/45">Comercial</span>
                  <Elegir
                    id="comercial"
                    nombre="Comercial"
                    opciones={conectados.map((c) => ({ valor: c.id, texto: c.nombre }))}
                    defecto={conectados[0].id}
                    clase="w-[180px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/45">Día</span>
                  <input
                    type="date"
                    name="dia"
                    defaultValue={ayerMadrid()}
                    className="block rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm focus:border-lima"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/45">Modelo</span>
                  <Elegir
                    id="modelo"
                    nombre="Modelo"
                    opciones={[
                      { valor: "large", texto: "Mistral Large" },
                      { valor: "medium", texto: "Mistral Medium" },
                    ]}
                    defecto="large"
                    clase="w-[180px]"
                  />
                </label>
                <BotonGenerar />
              </form>
            ) : (
              <p className="mt-3 text-[13px] text-carbon/60">Primero hay que conectar el correo de algún comercial.</p>
            )}

            {partes.length > 0 && (
              <table className="mt-5 w-auto text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-carbon/45">
                    <th className="pb-1 pr-4">Hecho</th>
                    <th className="pb-1 pr-4">Comercial</th>
                    <th className="pb-1 pr-4">Día</th>
                    <th className="pb-1 pr-4">Modelo</th>
                    <th className="pb-1 pr-4 text-right">Hilos</th>
                    <th className="pb-1 pr-4 text-right">Tokens</th>
                    <th className="pb-1 pr-4 text-right">Coste</th>
                    <th className="pb-1 text-right">Tardó</th>
                  </tr>
                </thead>
                <tbody>
                  {partes.map((p) => {
                    const coste = costeUsd(p.modelo, p.input_tokens, p.output_tokens);
                    const elegido = p.id === abierto?.id;
                    return (
                      <tr key={p.id} className={`border-t border-black/5 ${elegido ? "bg-lima-soft" : ""}`}>
                        <td className="whitespace-nowrap py-1.5 pr-4">
                          <a href={`?parte=${p.id}#parte`} className="font-semibold text-[#2E5D88] hover:underline">
                            {new Date(p.creado_en).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </a>
                        </td>
                        <td className="whitespace-nowrap py-1.5 pr-4">{nombre.get(p.comercial_id) ?? "—"}</td>
                        <td className="whitespace-nowrap py-1.5 pr-4">{p.dia.split("-").reverse().join("/")}</td>
                        <td className="whitespace-nowrap py-1.5 pr-4">{p.modelo.includes("large") ? "Large" : "Medium"}</td>
                        <td className="whitespace-nowrap py-1.5 pr-4 text-right">{p.hilos}</td>
                        <td className="whitespace-nowrap py-1.5 pr-4 text-right">
                          {p.error ? <span className="text-alerta">error</span> : `${(p.input_tokens ?? 0).toLocaleString("es-ES")} + ${(p.output_tokens ?? 0).toLocaleString("es-ES")}`}
                        </td>
                        <td className="whitespace-nowrap py-1.5 pr-4 text-right">{coste == null ? "—" : `${(coste * 100).toFixed(2)} c$`}</td>
                        <td className="whitespace-nowrap py-1.5 text-right">{p.segundos == null ? "—" : `${p.segundos} s`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>

        {abierto && (
          <section id="parte" className="mt-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/70">
              Parte de {nombre.get(abierto.comercial_id) ?? "—"} · {abierto.dia.split("-").reverse().join("/")} ·{" "}
              {abierto.modelo.includes("large") ? "Mistral Large" : "Mistral Medium"}
            </h2>
            {abierto.error ? (
              <p className="mt-3 text-[13px] text-alerta">{abierto.error}</p>
            ) : (
              <div className="mt-3 max-w-[900px] whitespace-pre-wrap text-[13.5px] leading-relaxed text-carbon">{abierto.texto}</div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
