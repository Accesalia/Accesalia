import Link from "next/link";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { crearAdministracion } from "../../acciones";

export const dynamic = "force-dynamic";

const labelCls = "block text-sm font-medium text-carbon/70";
const inputCls =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon " +
  "outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";

export default function NuevaAdministracion() {
  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[720px] px-6 py-10">
        <Link href="/administradores/nuevo" className="text-sm text-carbon/50 hover:text-carbon">
          ← Volver al alta de administrador
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-carbon sm:text-3xl">
          Nueva administración de fincas
        </h1>
        <p className="mt-1 text-carbon/50">
          La empresa que agrupa a varios administradores. Al guardarla, volverás al alta de
          administrador con ella ya disponible en el selector.
        </p>

        <form action={crearAdministracion} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="nombre">
                  Nombre <span className="text-lima-dark">*</span>
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  required
                  className={inputCls}
                  placeholder="Ej. Fincas García S.L."
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="cif">
                  CIF
                </label>
                <input id="cif" name="cif" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="telefono">
                  Teléfono
                </label>
                <input id="telefono" name="telefono" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="email">
                  Email
                </label>
                <input id="email" name="email" type="email" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="municipio">
                  Municipio
                </label>
                <input id="municipio" name="municipio" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="direccion">
                  Dirección
                </label>
                <input id="direccion" name="direccion" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="notas">
                  Notas
                </label>
                <textarea id="notas" name="notas" rows={3} className={inputCls} />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Crear administración
            </button>
            <Link
              href="/administradores/nuevo"
              className="rounded-full px-5 py-2.5 text-sm font-medium text-carbon/60 hover:text-carbon"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
