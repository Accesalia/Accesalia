import Link from "next/link";
import type { Administrador } from "../../lib/comercial";
import { Guardando, BotonGuardar } from "../components/Guardando";

// Formulario compartido por alta y edicion de una persona (administrador) que
// cuelga de una administracion. Server Component; action ya enlazada.

type Props = {
  accion: (fd: FormData) => void | Promise<void>;
  persona?: Administrador | null;
  textoBoton: string;
  hrefCancelar: string;
  /** En el alta, el buscador que evita duplicar a alguien que ya existe.
   *  Cuando se pasa, sustituye al campo de nombre: la identidad la resuelve el
   *  buscador (eliges a quien ya esta o creas), y aqui solo quedan los datos
   *  del puesto. En la edicion no se pasa y el nombre se escribe normal. */
  identidad?: React.ReactNode;
};

const labelCls = "block text-sm font-medium text-carbon/70";
const inputCls =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon " +
  "outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";

export function FormularioPersona({
  accion, persona, textoBoton, hrefCancelar, identidad,
}: Props) {
  const p = persona;
  return (
    <form action={accion} className="space-y-6">
      <Guardando />
      {identidad && (
        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          {identidad}
        </section>
      )}
      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!identidad && (
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="nombre">
                Nombre y apellidos <span className="text-lima-dark">*</span>
              </label>
              <input id="nombre" name="nombre" required defaultValue={p?.nombre ?? ""} className={inputCls} />
            </div>
          )}
          <div>
            <label className={labelCls} htmlFor="cargo">Cargo / rol</label>
            <input id="cargo" name="cargo" defaultValue={p?.cargo ?? ""} className={inputCls}
              placeholder="Titular, gestor, secretaría…" />
          </div>
          <div>
            <label className={labelCls} htmlFor="telefono">Teléfono</label>
            <input id="telefono" name="telefono" defaultValue={p?.telefono ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" defaultValue={p?.email ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="notas">Notas</label>
            <textarea id="notas" name="notas" rows={3} defaultValue={p?.notas ?? ""} className={inputCls} />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-carbon/70">
          <input type="checkbox" name="activo" defaultChecked={p ? p.activo : true}
            className="h-4 w-4 rounded border-black/20 text-lima-dark focus:ring-lima/30" />
          Activo
        </label>
      </section>

      <div className="flex items-center gap-3">
        <BotonGuardar className="rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
          {textoBoton}
        </BotonGuardar>
        <Link href={hrefCancelar} className="rounded-full px-5 py-2.5 text-sm font-medium text-carbon/60 hover:text-carbon">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
