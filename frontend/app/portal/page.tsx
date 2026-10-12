import Link from "next/link";
import { redirect } from "next/navigation";
import { comunidadesDeCorreo, quienEstaEnElPortal } from "../../lib/portal";
import { accionPedirEntrada } from "./acciones";
import { MarcoPortal } from "./Marco";

export const dynamic = "force-dynamic";

// LA PUERTA DEL PORTAL (Monica, 12-oct-2026). Sin sesion: se escribe el correo y
// llega un enlace para entrar (solo a los correos autorizados; la respuesta es
// la misma para todos, para no decir quien lo esta). Con sesion: sus comunidades.

const ROL = { administrador: "Administrador", presidente: "Presidente", comercial: "Comercial", manual: "Autorizado" } as const;

export default async function Portal({ searchParams }: { searchParams: Promise<{ enviado?: string; caducado?: string; error?: string }> }) {
  const sp = await searchParams;
  const email = await quienEstaEnElPortal();

  if (email) {
    const coms = await comunidadesDeCorreo(email);
    if (coms.length === 1) redirect(`/portal/c/${coms[0].id}`);
    return (
      <MarcoPortal email={email}>
        <h1 className="text-2xl font-bold text-carbon">Tus comunidades</h1>
        {coms.length === 0 ? (
          <p className="mt-3 text-carbon/70">Este correo ya no tiene acceso a ninguna comunidad. Si crees que es un error, escríbenos.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {coms.map((c) => (
              <li key={c.id}>
                <Link href={`/portal/c/${c.id}`} className="block rounded-2xl border border-lima/40 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="font-semibold text-carbon">{c.nombre}</div>
                  <div className="text-[13px] text-carbon/65">
                    {[c.municipio, ROL[c.rol]].filter(Boolean).join(" · ")}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </MarcoPortal>
    );
  }

  return (
    <MarcoPortal email={null}>
      <div className="mx-auto max-w-[460px] rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-carbon">Documentación de tu comunidad</h1>
        <p className="mt-2 text-[14px] text-carbon/70">
          Escribe tu correo y te mandamos un enlace para entrar. Solo funciona con los correos que tenemos autorizados para cada comunidad.
        </p>
        {sp.enviado ? (
          <p className="mt-4 rounded-xl bg-lima-soft px-4 py-3 text-[14px] text-carbon">
            Si tu correo está autorizado, en unos minutos te llegará el enlace. Sirve una vez y caduca en una hora. Mira también en la carpeta de correo no deseado.
          </p>
        ) : (
          <form action={accionPedirEntrada} className="mt-4 space-y-3">
            <input
              name="email"
              type="email"
              required
              autoFocus
              placeholder="tu correo"
              className="w-full rounded-lg border border-carbon/30 px-3 py-2.5 text-[15px] outline-none placeholder:text-carbon/55 focus:border-lima"
            />
            <button type="submit" className="w-full rounded-lg bg-lima px-4 py-2.5 text-[15px] font-bold text-carbon transition hover:bg-lima-dark hover:text-white">
              Enviarme el enlace
            </button>
          </form>
        )}
        {sp.caducado && <p className="mt-3 text-[13px] font-semibold text-alerta">Ese enlace ya se usó o ha caducado. Pide otro.</p>}
        {sp.error && <p className="mt-3 text-[13px] font-semibold text-alerta">{sp.error}</p>}
      </div>
    </MarcoPortal>
  );
}
