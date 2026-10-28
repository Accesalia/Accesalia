import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { accionRepasar } from "./acciones";
import { Salida } from "../../components/Salida";
import { hayPermiso } from "../../../lib/gmailBuzon";

export const dynamic = "force-dynamic";

// ⚠️ PROVISIONAL — SIN REVISAR CON MONICA (29-sep-2026).
//
// La monto porque el reloj repasa el buzon cada diez minutos EN SILENCIO: si un
// correo no se puede colocar, sin esta pantalla no se entera nadie. Sin ella, el
// reloj es una caja negra.
//
// Ella no la ha visto todavia -"no doy abasto con todo a la vez"-, asi que lleva
// su aviso arriba y no se da por buena. Cuando la repase, se quita el aviso o se
// rehace.
//
// La bandeja NO es una tabla: es el propio buzon. Los correos con la etiqueta
// "accesalia-sin-sitio" son los que el reloj miro y no supo donde poner.

const CAJA = "rounded-2xl border border-black/5 bg-white shadow-sm";
const BOTON =
  "inline-flex h-[32px] shrink-0 items-center justify-center rounded-[6px] border border-[#223A5D] bg-[#5680A1] px-3.5 text-[12px] font-bold uppercase text-white transition hover:bg-[#46769c]";
const CAMPO =
  "w-full rounded-lg border border-carbon/40 bg-white px-2.5 py-1.5 text-[13px] text-carbon outline-none transition focus:border-lima";

export default async function Buzon({
  searchParams,
}: {
  searchParams: Promise<{ colocado?: string; hecho?: string; mirados?: string; falta?: string; google_ok?: string; google_mal?: string }>;
}) {
  const { colocado, hecho, mirados, falta, google_ok, google_mal } = await searchParams;
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/comercial/buzon");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/menu");

  // SIN LA LISTA DE «SIN SITIO» (Monica, 28-oct-2026: la pantalla tardaba en
  // abrir). Desde el 2-oct todo lo que llega se guarda y va a la mesa de
  // viabilidades: ningun correo se queda «sin sitio», y aun asi esta pantalla
  // entraba al buzon por IMAP cada vez para buscarlos (siempre vacia).
  const conGoogle = await hayPermiso();

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-16 pt-5">
        <Salida href="/comercial">
          ← Área comercial
        </Salida>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[25px] font-bold leading-tight text-carbon">Buzón del Polycam</h1>
            <p className="mt-1.5 text-[13px] text-carbon/60">
              Lo que llegó por correo y la app no supo dónde colocar. Se repasa solo cada diez minutos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* EL PERMISO DE GOOGLE (28-oct-2026): con el, el buzon se baja por la
                API de Gmail y no se atascan los .glb. Solo direccion. Es un
                enlace normal (no un fetch): Google tiene que abrirse en la pestaña. */}
            {yo.veTodo && (
              <a href="/api/buzon/google" className={BOTON}>
                {conGoogle ? "Reconectar con Google" : "Conectar el buzón con Google"}
              </a>
            )}
            <form action={accionRepasar}>
              <button className={BOTON}>Repasar el buzón ahora</button>
            </form>
          </div>
        </div>
        {yo.veTodo && (
          <p className="mt-2 text-[12px] text-carbon/60">
            {conGoogle
              ? "Conectado con Google: el buzón se baja por la API de Gmail, también los enlaces de Drive."
              : "Sin conectar con Google: el buzón se baja por IMAP y los correos pesados se atascan."}
          </p>
        )}

        {/* El aviso de que esto no está dado por bueno. Se quita cuando ella lo
            repase, no antes. */}
        <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <b>PANTALLA PROVISIONAL.</b> Montada deprisa para que el reloj no trabaje a ciegas. Funciona, pero{" "}
          <b>no está revisada contigo</b>: los textos, el orden y lo que se ve están sin decidir.
        </div>

        {google_ok && (
          <p className="mt-4 rounded-xl border border-lima bg-lima-soft px-4 py-2.5 text-[13px] text-carbon">
            Buzón conectado con Google ({google_ok}). Desde la próxima pasada se baja por la API de Gmail.
          </p>
        )}
        {google_mal && (
          <p className="mt-4 rounded-xl border border-alerta/40 bg-red-50 px-4 py-2.5 text-[13px] text-alerta">
            No se ha conectado con Google: {google_mal}
          </p>
        )}
        {colocado && (
          <p className="mt-4 rounded-xl border border-lima bg-lima-soft px-4 py-2.5 text-[13px] text-carbon">
            Colocado. Ya está en su oportunidad y avisado quien lo revisa.
          </p>
        )}
        {hecho !== undefined && (
          <p className="mt-4 rounded-xl border border-black/10 bg-hueso px-4 py-2.5 text-[13px] text-carbon">
            Repasado: {mirados ?? 0} correo(s) mirado(s), {hecho} colocado(s).
          </p>
        )}
        {falta && (
          <p className="mt-4 rounded-xl border border-alerta/40 bg-red-50 px-4 py-2.5 text-[13px] text-alerta">
            Elige una oportunidad antes de colocarlo.
          </p>
        )}

        <p className={CAJA + " mt-6 px-5 py-6 text-[14px] text-carbon/70"}>
          Todo lo que llega al buzón se guarda y va a la{" "}
          <Link href="/viabilidades" className="font-semibold text-[#3f5f80] underline underline-offset-2">
            mesa de viabilidades
          </Link>
          : allí se coloca cada escaneo en su edificio, se descarta lo que no vale y se ve lo que ya ha salido.
        </p>
      </main>
    </div>
  );
}
