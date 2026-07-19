import Link from "next/link";
import type {
  Administrador,
  AdministracionFincas,
  Comercial,
} from "../../lib/comercial";
import { nombreComercial } from "../../lib/comercial";

// Formulario compartido por alta y edicion de un administrador. Es un Server
// Component: solo pinta un <form> nativo cuya action es una server action ya
// enlazada (crear o actualizar) que le pasa la pantalla contenedora.

type Props = {
  accion: (fd: FormData) => void | Promise<void>;
  admin?: Administrador | null;
  comerciales: Comercial[];
  administraciones: AdministracionFincas[];
  textoBoton: string;
  hrefCancelar: string;
};

const labelCls = "block text-sm font-medium text-carbon/70";
const inputCls =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon " +
  "outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";

export function FormularioAdministrador({
  accion,
  admin,
  comerciales,
  administraciones,
  textoBoton,
  hrefCancelar,
}: Props) {
  return (
    <form action={accion} className="space-y-8">
      {/* --- Persona --- */}
      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">
          Persona
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="nombre">
              Nombre y apellidos <span className="text-lima-dark">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              required
              defaultValue={admin?.nombre ?? ""}
              className={inputCls}
              placeholder="Ej. Juan García Pérez"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="cargo">
              Cargo / rol
            </label>
            <input
              id="cargo"
              name="cargo"
              defaultValue={admin?.cargo ?? ""}
              className={inputCls}
              placeholder="Titular, gestor, secretaría…"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="telefono">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              defaultValue={admin?.telefono ?? ""}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={admin?.email ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* --- Organizacion --- */}
      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">
            Administración de fincas
          </h2>
          <Link
            href="/administradores/administracion/nueva"
            className="text-xs font-medium text-lima-dark hover:underline"
          >
            + Nueva administración
          </Link>
        </div>
        <p className="mt-1 text-xs text-carbon/45">
          Si es un administrador autónomo (sin empresa con más gente), déjala en
          «Autónomo» y, si tiene marca comercial propia, ponla en «Nombre comercial».
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="administracion_id">
              Administración
            </label>
            <select
              id="administracion_id"
              name="administracion_id"
              defaultValue={admin?.administracion_id ?? ""}
              className={inputCls}
            >
              <option value="">— Autónomo (sin administración) —</option>
              {administraciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="empresa">
              Nombre comercial (si es autónomo con marca)
            </label>
            <input
              id="empresa"
              name="empresa"
              defaultValue={admin?.empresa ?? ""}
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* --- Comercial / cartera --- */}
      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">
          Cartera comercial
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="comercial_id">
              Comercial dueño de la cartera
            </label>
            <select
              id="comercial_id"
              name="comercial_id"
              defaultValue={admin?.comercial_id ?? ""}
              className={inputCls}
            >
              <option value="">— Sin asignar —</option>
              {comerciales.map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreComercial(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="comercial_captador_id">
              Comercial que lo captó
            </label>
            <select
              id="comercial_captador_id"
              name="comercial_captador_id"
              defaultValue={admin?.comercial_captador_id ?? ""}
              className={inputCls}
            >
              <option value="">— Igual que el dueño —</option>
              {comerciales.map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreComercial(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="fecha_alta_administrador">
              Fecha de alta (apertura de cartera)
            </label>
            <input
              id="fecha_alta_administrador"
              name="fecha_alta_administrador"
              type="date"
              defaultValue={admin?.fecha_alta_administrador ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="comision_por_defecto">
              Comisión por defecto (€)
            </label>
            <input
              id="comision_por_defecto"
              name="comision_por_defecto"
              inputMode="decimal"
              defaultValue={admin?.comision_por_defecto ?? ""}
              className={inputCls}
              placeholder="Orientativa; el valor real se fija por proyecto"
            />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-carbon/70">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={admin ? admin.activo : true}
            className="h-4 w-4 rounded border-black/20 text-lima-dark focus:ring-lima/30"
          />
          Activo
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
        >
          {textoBoton}
        </button>
        <Link
          href={hrefCancelar}
          className="rounded-full px-5 py-2.5 text-sm font-medium text-carbon/60 hover:text-carbon"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
