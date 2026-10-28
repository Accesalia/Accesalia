import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { hayLlaveDropbox } from "../../../lib/dropboxApi";

export const dynamic = "force-dynamic";

// CONECTAR EL DROPBOX (Monica, 28-oct-2026). Con el permiso, los enlaces de la
// ficha a las carpetas antiguas los abre cualquier cuenta del equipo, no solo
// Daniel. Se entra con la cuenta de Daniel. Solo direccion.

const BOTON =
  "inline-flex h-[36px] items-center justify-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-4 text-[12.5px] font-bold uppercase text-white transition hover:bg-[#46769c]";

export default async function DropboxConectar({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; mal?: string }>;
}) {
  const { ok, mal } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/dropbox");
  if (!yo.veTodo) redirect("/menu");
  const conectado = await hayLlaveDropbox();

  return (
    <div className="min-h-screen bg-white">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-4 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Dropbox</h1>
        <p className="mt-1.5 text-[13px] text-carbon/60">
          Con el permiso, los botones «Carpeta antigua» y «Ficha de datos antigua» de la ficha de la oportunidad abren en
          Dropbox con cualquier cuenta del equipo (Daniel o técnicos), no solo con la de Daniel. La app solo puede ver
          nombres y crear enlaces para el equipo: no lee, no sube ni borra ficheros.
        </p>

        {ok && (
          <p className="mt-4 rounded-xl border border-lima bg-lima-soft px-4 py-2.5 text-[13px] text-carbon">
            Dropbox conectado ({ok}). Los enlaces a las carpetas antiguas ya van por la app.
          </p>
        )}
        {mal && (
          <p className="mt-4 rounded-xl border border-alerta/40 bg-red-50 px-4 py-2.5 text-[13px] text-alerta">
            No se ha conectado: {mal}
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-[14px] text-carbon">
            {conectado ? (
              <>
                <b>Conectado.</b> Los enlaces a las carpetas antiguas los abre todo el equipo.
              </>
            ) : (
              <>
                <b>Sin conectar.</b> Los enlaces a las carpetas antiguas solo los abre la cuenta de Daniel.
              </>
            )}
          </p>
          <p className="mt-1.5 text-[12.5px] text-carbon/60">
            Hay que entrar en Dropbox con la cuenta de <b>Daniel</b> (danieldesotoarquitecto@gmail.com) y pulsar «Permitir».
          </p>
          {/* Enlace normal, no <Link>: Dropbox se abre en la pestaña. */}
          <a href="/api/dropbox" className={`${BOTON} mt-4`}>
            {conectado ? "Reconectar el Dropbox" : "Conectar el Dropbox"}
          </a>
        </div>
      </main>
    </div>
  );
}
