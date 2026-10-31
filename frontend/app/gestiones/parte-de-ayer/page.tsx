import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { Elegir } from "../../components/Elegir";
import { quienSoy } from "../../../lib/sesion";
import {
  comercialesConCorreo,
  costeUsd,
  diasConParte,
  generarParte,
  MODELOS,
  partesDe,
  partesGuardados,
  type Modelo,
} from "../../../lib/parteDeAyer";
import { BotonGenerar } from "./BotonGenerar";
import { ParteFormateado } from "./ParteFormateado";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// EL PARTE DE AYER, EN PRUEBA (Monica, 28-oct-2026; visor el 31-oct: «elegir
// comercial y elegir dia, o pasar dia a dia, para verlo; el diario en si, la
// card formateada con sus secciones»). Arriba se ve el parte de un comercial y un
// dia. Debajo, conectar el correo de cada comercial y generar partes, para ir
// reuniendo varios dias y compararlos antes de tocar las instrucciones. Solo
// direccion.

const BOTON =
  "inline-flex h-[32px] items-center justify-center whitespace-nowrap rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3 text-[12px] font-bold uppercase text-white transition hover:bg-[#46769c]";
const FLECHA =
  "inline-flex h-[36px] items-center justify-center whitespace-nowrap rounded-xl border border-black/15 bg-white px-3 text-[13px] font-semibold text-carbon/70 hover:border-lima hover:text-carbon";

const hoyMadrid = (menosDias = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(Date.now() - menosDias * 24 * 3600_000));
const mover = (dia: string, n: number) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const largo = (dia: string) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const corto = (dia: string) => dia.split("-").reverse().slice(0, 2).join("/");
const nombreModelo = (m: string) => (m.includes("large") ? "Large" : m.includes("medium") ? "Medium" : m);
const hora = (t: string) =>
  new Date(t).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

async function generar(datos: FormData) {
  "use server";
  const yo = await quienSoy();
  if (!yo?.veTodo) redirect("/menu");
  const comercialId = String(datos.get("comercial") ?? datos.get("comercial_generar") ?? "");
  const dia = String(datos.get("dia") ?? "");
  const modelo = String(datos.get("modelo") ?? "") as Modelo;
  const c = (await comercialesConCorreo()).find((x) => x.id === comercialId);
  if (!c?.correo || !c.conectado || !/^\d{4}-\d{2}-\d{2}$/.test(dia) || !(modelo in MODELOS)) {
    redirect("/gestiones/parte-de-ayer?google_mal=" + encodeURIComponent("Elige un comercial con el correo conectado, el día y el modelo."));
  }
  const id = await generarParte({ comercialId, correo: c.correo, dia, modelo, pedidoPor: yo.id });
  redirect(`/gestiones/parte-de-ayer?comercial=${comercialId}&dia=${dia}&parte=${id}`);
}

export default async function ParteDeAyer({
  searchParams,
}: {
  searchParams: Promise<{ google_ok?: string; google_mal?: string; parte?: string; comercial?: string; dia?: string }>;
}) {
  const sp = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/parte-de-ayer");
  if (!yo.veTodo) redirect("/menu");

  const [comerciales, ultimos] = await Promise.all([comercialesConCorreo(), partesGuardados()]);
  const nombre = new Map(comerciales.map((c) => [c.id, c.nombre]));
  const conectados = comerciales.filter((c) => c.conectado && c.correo);

  // Lo que se mira: lo pedido, o el ultimo parte hecho, o el primer conectado y ayer.
  const comercialId = sp.comercial ?? ultimos[0]?.comercial_id ?? conectados[0]?.id ?? "";
  const dia = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : (sp.comercial ? hoyMadrid(1) : ultimos[0]?.dia ?? hoyMadrid(1));
  const [delDia, dias] = comercialId ? await Promise.all([partesDe(comercialId, dia), diasConParte(comercialId)]) : [[], []];
  const conTexto = delDia.filter((p) => p.texto);
  const visto = delDia.find((p) => p.id === sp.parte) ?? conTexto[0] ?? delDia[0];
  const enlace = (c: string, d: string) => `?comercial=${c}&dia=${d}`;
  const conectado = conectados.some((c) => c.id === comercialId);

  return (
    <div className="min-h-screen bg-fondo">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1300px] px-4 pb-16 pt-5 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <div className="mt-3 border-b border-black/10 pb-3">
          <h1 className="text-[25px] font-bold leading-tight text-carbon">El parte de ayer</h1>
          <p className="mt-1 text-[13px] text-carbon/60">
            Sali lee el correo de un día de un comercial, los hilos enteros tal como llegan, y prepara su parte. En prueba: solo
            lo ve dirección.
          </p>
        </div>

        {sp.google_ok && (
          <p className="mt-4 rounded-xl border border-lima bg-lima-soft px-4 py-2.5 text-[13px] text-carbon">Conectado el correo {sp.google_ok}.</p>
        )}
        {sp.google_mal && <p className="mt-4 rounded-xl border border-alerta/40 bg-red-50 px-4 py-2.5 text-[13px] text-alerta">{sp.google_mal}</p>}

        {/* ---------------- EL VISOR */}
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/45">Comercial</span>
              <Elegir
                id="comercial"
                nombre="Comercial"
                opciones={comerciales.map((c) => ({ valor: c.id, texto: c.nombre, pista: c.conectado ? undefined : "sin conectar" }))}
                defecto={comercialId}
                clase="w-[180px]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/45">Día</span>
              <input
                type="date"
                name="dia"
                defaultValue={dia}
                className="block rounded-xl border border-black/10 bg-white px-3 py-1.5 text-sm focus:border-lima"
              />
            </label>
            <button type="submit" className={FLECHA}>
              Ver
            </button>
          </form>
          {comercialId && (
            <div className="flex gap-2">
              <a href={enlace(comercialId, mover(dia, -1))} className={FLECHA} title="Día anterior">
                ← {corto(mover(dia, -1))}
              </a>
              <a href={enlace(comercialId, mover(dia, 1))} className={FLECHA} title="Día siguiente">
                {corto(mover(dia, 1))} →
              </a>
            </div>
          )}
        </div>

        {dias.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
            <span className="mr-1 font-bold uppercase tracking-wide text-carbon/45">Días con parte</span>
            {dias.map((d) => (
              <a
                key={d}
                href={enlace(comercialId, d)}
                className={`rounded-full border px-2.5 py-0.5 ${d === dia ? "border-lima bg-lima font-bold text-carbon" : "border-black/15 bg-white text-carbon/70 hover:border-lima"}`}
              >
                {corto(d)}
              </a>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-black/10 pb-3">
            <h2 className="text-[20px] font-bold text-carbon">
              {nombre.get(comercialId) ?? "—"} · <span className="first-letter:uppercase">{largo(dia)}</span>
            </h2>
            {visto?.texto && (
              <span className="text-[12px] text-carbon/50">
                {visto.hilos} hilos · Mistral {nombreModelo(visto.modelo)} · hecho el {hora(visto.creado_en)}
              </span>
            )}
          </div>

          {/* Si ese dia hay varios partes (otro modelo, una repeticion), se elige cual. */}
          {conTexto.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
              {conTexto.map((p) => (
                <a
                  key={p.id}
                  href={`${enlace(comercialId, dia)}&parte=${p.id}`}
                  className={`rounded-lg border px-2.5 py-1 ${p.id === visto?.id ? "border-[#223a5d] bg-[#223a5d] font-bold text-white" : "border-black/15 text-carbon/70 hover:border-[#223a5d]"}`}
                >
                  {nombreModelo(p.modelo)} · {hora(p.creado_en)}
                </a>
              ))}
            </div>
          )}

          <div className="mt-4">
            {visto?.texto ? (
              <ParteFormateado texto={visto.texto} />
            ) : (
              <div className="flex flex-wrap items-center gap-4 py-6">
                <p className="text-[14px] text-carbon/60">
                  {visto?.error === "Ese día no hay correos."
                    ? "Ese día no hubo correos."
                    : visto?.error
                      ? `No salió: ${visto.error}`
                      : "Todavía no hay parte de este día."}
                </p>
                {conectado && visto?.error !== "Ese día no hay correos." && (
                  <form action={generar} className="flex items-center gap-3">
                    <input type="hidden" name="comercial" value={comercialId} />
                    <input type="hidden" name="dia" value={dia} />
                    <input type="hidden" name="modelo" value="large" />
                    <BotonGenerar />
                  </form>
                )}
                {!conectado && comercialId && <p className="text-[13px] text-carbon/45">(su correo no está conectado)</p>}
              </div>
            )}
          </div>
        </div>

        {/* ---------------- CONECTAR Y GENERAR */}
        <div className="mt-8 grid items-start gap-4 lg:grid-cols-[auto_1fr]">
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
                    id="comercial_generar"
                    nombre="Comercial"
                    opciones={conectados.map((c) => ({ valor: c.id, texto: c.nombre }))}
                    defecto={conectado ? comercialId : conectados[0].id}
                    clase="w-[180px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-carbon/45">Día</span>
                  <input
                    type="date"
                    name="dia"
                    defaultValue={dia}
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

            {ultimos.length > 0 && (
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
                  {ultimos.map((p) => {
                    const coste = costeUsd(p.modelo, p.input_tokens, p.output_tokens);
                    return (
                      <tr key={p.id} className={`border-t border-black/5 ${p.id === visto?.id ? "bg-lima-soft" : ""}`}>
                        <td className="whitespace-nowrap py-1.5 pr-4">
                          <a href={`${enlace(p.comercial_id, p.dia)}&parte=${p.id}`} className="font-semibold text-[#2E5D88] hover:underline">
                            {hora(p.creado_en)}
                          </a>
                        </td>
                        <td className="whitespace-nowrap py-1.5 pr-4">{nombre.get(p.comercial_id) ?? "—"}</td>
                        <td className="whitespace-nowrap py-1.5 pr-4">{p.dia.split("-").reverse().join("/")}</td>
                        <td className="whitespace-nowrap py-1.5 pr-4">{nombreModelo(p.modelo)}</td>
                        <td className="whitespace-nowrap py-1.5 pr-4 text-right">{p.hilos}</td>
                        <td className="whitespace-nowrap py-1.5 pr-4 text-right">
                          {p.error ? (
                            <span className={p.error === "Ese día no hay correos." ? "text-carbon/45" : "text-alerta"}>
                              {p.error === "Ese día no hay correos." ? "sin correos" : "error"}
                            </span>
                          ) : (
                            `${(p.input_tokens ?? 0).toLocaleString("es-ES")} + ${(p.output_tokens ?? 0).toLocaleString("es-ES")}`
                          )}
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
      </main>
    </div>
  );
}
