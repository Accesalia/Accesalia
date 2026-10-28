import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { quienSoy } from "../../../lib/sesion";
import { hayPermiso } from "../../../lib/gmailBuzon";

export const dynamic = "force-dynamic";

// CONECTAR EL BUZON DEL POLYCAM CON GOOGLE (Monica, 28-oct-2026: «pon el boton
// de conectar en gestiones»). Pantalla minima a proposito: NO abre el buzon al
// cargar (la de /comercial/buzon lo lee por IMAP y salia en blanco). Solo dice
// si hay permiso y lleva a Google. Solo direccion.

const BOTON =
  "inline-flex h-[36px] items-center justify-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-4 text-[12.5px] font-bold uppercase text-white transition hover:bg-[#46769c]";

export default async function BuzonPolycamGoogle({
  searchParams,
}: {
  searchParams: Promise<{ google_ok?: string; google_mal?: string }>;
}) {
  const { google_ok, google_mal } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/gestiones/buzon-polycam");
  if (!yo.veTodo) redirect("/menu");
  const conectado = await hayPermiso();

  return (
    <div className="min-h-screen bg-white">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[760px] px-4 pb-16 pt-4 sm:px-6">
        <Salida href="/gestiones">← Gestiones de la app</Salida>
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Buzón del Polycam</h1>
        <p className="mt-1.5 text-[13px] text-carbon/60">
          Con el permiso de Google, la app baja los escaneos por la API de Gmail: los .glb pesados no se atascan y los
          enlaces de Drive (lo que pasa de 25 MB) también entran.
        </p>

        {google_ok && (
          <p className="mt-4 rounded-xl border border-lima bg-lima-soft px-4 py-2.5 text-[13px] text-carbon">
            Conectado con Google ({google_ok}). Desde la próxima pasada (cada 10 minutos) se baja por la API de Gmail.
          </p>
        )}
        {google_mal && (
          <p className="mt-4 rounded-xl border border-alerta/40 bg-red-50 px-4 py-2.5 text-[13px] text-alerta">
            No se ha conectado: {google_mal}
          </p>
        )}

        <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-[14px] text-carbon">
            {conectado ? (
              <>
                <b>Conectado con Google.</b> El buzón se baja por la API de Gmail.
              </>
            ) : (
              <>
                <b>Sin conectar.</b> El buzón se baja por IMAP y los correos pesados se atascan.
              </>
            )}
          </p>
          <p className="mt-1.5 text-[12.5px] text-carbon/60">
            Hay que entrar con <b>buzon.polycam.accesalia@gmail.com</b>. Google avisará de que la app no está verificada:
            «Configuración avanzada» → «Ir a Accesalia».
          </p>
          {/* Enlace normal, no <Link>: Google se abre en la pestaña. */}
          <a href="/api/buzon/google" className={`${BOTON} mt-4`}>
            {conectado ? "Reconectar con Google" : "Conectar el buzón con Google"}
          </a>
        </div>
      </main>
    </div>
  );
}
