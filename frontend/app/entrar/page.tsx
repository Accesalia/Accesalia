import Image from "next/image";
import { redirect } from "next/navigation";
import { quienSoy } from "../../lib/sesion";
import { entrarConGoogle, enviarEnlace } from "./acciones";

export const dynamic = "force-dynamic";

// La puerta de la app. Dos formas de entrar, las dos sin contraseñas nuevas:
// Google para el equipo (Gmail nominativo de Accesalia) y un enlace al correo
// para cualquier otro, que es como entraran administradores, comunidades y
// contratas.

const AVISOS: Record<string, { texto: string; tono: "bien" | "mal" }> = {
  google: { texto: "No se ha podido entrar con Google. Si vuelve a pasar, prueba con el enlace al correo.", tono: "mal" },
  correo: { texto: "Ese correo no parece bien escrito. Revísalo y vuelve a probar.", tono: "mal" },
  enlace: { texto: "No hemos podido enviar el enlace. Espera un minuto y vuelve a pedirlo.", tono: "mal" },
  caducado: { texto: "Ese enlace ya no vale: caduca en una hora y solo sirve una vez. Pide otro.", tono: "mal" },
  sin_acceso: { texto: "Ese correo no tiene acceso a la app. Si crees que debería tenerlo, habla con Accesalia.", tono: "mal" },
};

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; error?: string; enviado?: string; salido?: string }>;
}) {
  const { volver = "/menu", error, enviado, salido } = await searchParams;
  if (await quienSoy()) redirect(volver.startsWith("/") && !volver.startsWith("//") ? volver : "/menu");

  const aviso = error ? AVISOS[error] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-carbon px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image src="/logotipo.jpg" alt="Accesalia" width={190} height={50} priority className="h-16 w-auto rounded-lg bg-white px-4 py-2.5" />
        </div>

        <div className="rounded-2xl border-t-4 border-lima bg-white p-7 shadow-xl sm:p-8">
          <h1 className="text-2xl font-bold text-carbon">Entrar</h1>

          {enviado ? (
            <div className="mt-5 space-y-3 text-base leading-relaxed text-carbon/80">
              <p className="rounded-xl bg-lima-soft px-4 py-3 text-lima-dark">
                Si <b>{enviado}</b> tiene acceso, te acaba de llegar un enlace para entrar.
              </p>
              <p>Ábrelo desde este mismo navegador. Caduca en una hora y solo sirve una vez.</p>
              <p className="text-sm text-carbon/55">¿No llega en un par de minutos? Mira en la carpeta de spam.</p>
              <a href="/entrar" className="inline-block text-sm font-semibold text-lima-dark hover:underline">
                ← Usar otro correo
              </a>
            </div>
          ) : (
            <>
              {aviso && (
                <p
                  className={
                    "mt-4 rounded-xl px-4 py-3 text-sm " +
                    (aviso.tono === "mal" ? "bg-amber-50 text-amber-800" : "bg-lima-soft text-lima-dark")
                  }
                >
                  {aviso.texto}
                </p>
              )}
              {salido && !aviso && (
                <p className="mt-4 rounded-xl bg-hueso px-4 py-3 text-sm text-carbon/70">Has salido. Hasta la próxima.</p>
              )}

              {/* ---- Equipo: Google ---- */}
              <section className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/55">Equipo de Accesalia</h2>
                <form action={entrarConGoogle} className="mt-2.5">
                  <input type="hidden" name="volver" value={volver} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/15 bg-white px-4 py-3 text-base font-semibold text-carbon shadow-sm transition hover:border-lima hover:shadow-md"
                  >
                    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
                    </svg>
                    Entrar con Google
                  </button>
                </form>
                <p className="mt-2 text-sm text-carbon/55">Con tu correo de Accesalia, el que acaba en .accesalia@gmail.com.</p>
              </section>

              <div className="my-6 flex items-center gap-3 text-sm text-carbon/40">
                <span className="h-px flex-1 bg-black/10" />o<span className="h-px flex-1 bg-black/10" />
              </div>

              {/* ---- Cualquier otro correo: enlace ---- */}
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/55">Con cualquier otro correo</h2>
                <form action={enviarEnlace} className="mt-2.5 space-y-2.5">
                  <input type="hidden" name="volver" value={volver} />
                  <label className="block">
                    <span className="sr-only">Tu correo</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      placeholder="tu@correo.com"
                      className="w-full rounded-xl border border-black/15 px-4 py-3 text-base outline-none transition focus:border-lima focus:ring-2 focus:ring-lima/30"
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-lima px-4 py-3 text-base font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
                  >
                    Enviarme un enlace para entrar
                  </button>
                </form>
                <p className="mt-2 text-sm text-carbon/55">Sin contraseña: te llega un enlace al correo y entras con él.</p>
              </section>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-white/45">Accesalia · la app de la oficina</p>
      </div>
    </main>
  );
}
