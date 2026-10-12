import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { comercialDe, puedeEntrar, quienSoy } from "../../../lib/sesion";
import { listarComerciales } from "../../../lib/comercial";
import { correosEnviados } from "../../../lib/envioCorreo";

export const dynamic = "force-dynamic";

// CORREOS ENVIADOS (Monica, 12-oct-2026): "que cada comercial pueda revisar que
// envio, en que fecha, a quien y que tenia dentro". Como "Enviados" de Gmail con
// el filtro de quien lo envio. Los documentos van como enlace: no se duplican.
// Un comercial ve los suyos; direccion y supervision, los de todos.

const CUANDO = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default async function CorreosEnviados({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/correos-enviados");
  if (!yo.veTodo && !puedeEntrar(yo, "comercial")) redirect("/menu");
  const todos = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const [mio, comerciales] = await Promise.all([comercialDe(yo.id), todos ? listarComerciales() : Promise.resolve([])]);
  const elegido = todos ? (comerciales.find((x) => x.id === c)?.id ?? null) : (mio?.id ?? null);
  if (!todos && !elegido) redirect("/comercial");
  const correos = await correosEnviados(elegido);

  const pill = (activo: boolean) =>
    "rounded-full border px-3.5 py-1.5 text-sm transition " + (activo ? "border-lima bg-lima font-semibold text-carbon" : "border-black/10 bg-white text-carbon/70 hover:border-lima");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
        <Link href="/comercial" className="text-sm font-semibold text-carbon/55 transition hover:text-carbon">
          ← Accesos del área comercial
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-carbon">Correos enviados</h1>
        <p className="mt-1.5 text-carbon/65">Lo que se ha mandado a las comunidades desde la app: cuándo, a quién, qué decía y qué llevaba.</p>

        {todos && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Link href="/comercial/correos-enviados" className={pill(!elegido)}>
              Todos
            </Link>
            {comerciales.map((m) => (
              <Link key={m.id} href={`/comercial/correos-enviados?c=${m.id}`} className={pill(elegido === m.id)}>
                {m.nombre}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {correos.length === 0 ? (
            <p className="rounded-2xl border border-black/10 bg-white px-5 py-10 text-center text-carbon/65">Todavía no se ha enviado nada desde la app.</p>
          ) : (
            correos.map((m) => (
              <details key={m.id} className="rounded-2xl border border-black/10 bg-white px-5 py-3.5 shadow-sm">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-semibold text-carbon">{m.asunto}</span>
                    <span className="text-sm text-carbon/65">{CUANDO.format(new Date(m.creado_en))}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-carbon/70">
                    A {m.para.join(", ")} · de {m.remitente_nombre.replace(" · Accesalia", "")}
                    {m.enviador && !m.remitente_nombre.startsWith(m.enviador.nombre) ? ` (lo envió ${m.enviador.nombre})` : ""}
                    {m.oportunidad ? ` · ${m.oportunidad.codigo ?? ""} ${m.oportunidad.nombre ?? ""}` : ""}
                    {m.documentos.length > 0 && ` · ${m.documentos.length} documento${m.documentos.length > 1 ? "s" : ""}`}
                    {!m.ok && <b className="text-alerta"> · no salió: {m.error}</b>}
                  </div>
                </summary>
                <p className="mt-3 whitespace-pre-wrap border-t border-black/5 pt-3 text-[14px] leading-relaxed text-carbon">{m.cuerpo}</p>
                {m.documentos.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {m.documentos.map((d) => (
                      <li key={d.enlace}>
                        <a href={d.enlace} target="_blank" rel="noreferrer" className="font-semibold text-lima-dark hover:underline">
                          {d.nombre}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {m.oportunidad_id && (
                  <Link href={`/comercial/oportunidades/${m.oportunidad_id}?bloque=2`} className="mt-3 inline-block text-sm font-semibold text-carbon/65 hover:text-carbon">
                    Ir a la oportunidad →
                  </Link>
                )}
              </details>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
