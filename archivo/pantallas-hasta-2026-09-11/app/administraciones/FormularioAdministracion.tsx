import Link from "next/link";
import {
  ESTADOS,
  ESTADOS_LISTA,
  nombreComercial,
  type AdministracionFincas,
  type Comercial,
} from "../../lib/comercial";
import { Guardando } from "../components/Guardando";

// Formulario compartido por alta y edicion de una administracion de fincas.
// Server Component: <form> nativo cuya action es una server action ya enlazada.

type Props = {
  accion: (fd: FormData) => void | Promise<void>;
  administracion?: AdministracionFincas | null;
  comerciales: Comercial[];
  titulares?: { id: string; nombre: string }[];
  textoBoton: string;
  hrefCancelar: string;
};

const labelCls = "block text-sm font-medium text-carbon/70";
const inputCls =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon " +
  "outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">{titulo}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function FormularioAdministracion({
  accion,
  administracion,
  comerciales,
  titulares = [],
  textoBoton,
  hrefCancelar,
}: Props) {
  const a = administracion;
  return (
    <form action={accion} className="space-y-8">
      <Guardando />
      <Seccion titulo="Identificación">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="nombre">
            Nombre <span className="text-lima-dark">*</span>
          </label>
          <input id="nombre" name="nombre" required defaultValue={a?.nombre ?? ""} className={inputCls}
            placeholder="Ej. Fincas García S.L." />
        </div>
        <div>
          <label className={labelCls} htmlFor="cif">CIF</label>
          <input id="cif" name="cif" defaultValue={a?.cif ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="municipio">Municipio</label>
          <input id="municipio" name="municipio" defaultValue={a?.municipio ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="telefono">Teléfono</label>
          <input id="telefono" name="telefono" defaultValue={a?.telefono ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={a?.email ?? ""} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="direccion">Dirección</label>
          <input id="direccion" name="direccion" defaultValue={a?.direccion ?? ""} className={inputCls} />
        </div>
      </Seccion>

      <Seccion titulo="Relación">
        <div>
          <label className={labelCls} htmlFor="estado">Estado</label>
          <select id="estado" name="estado" defaultValue={a?.estado ?? ""} className={inputCls}>
            {/* vacio a proposito: que una casa no tenga estado decidido es una
                respuesta valida, y mejor que meterlas todas como "contacto" */}
            <option value="">— Sin definir —</option>
            {ESTADOS_LISTA.map((e) => (
              <option key={e} value={e}>{ESTADOS[e].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="fecha_alta_cartera">Alta en cartera</label>
          <input id="fecha_alta_cartera" name="fecha_alta_cartera" type="date"
            defaultValue={a?.fecha_alta_cartera ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="motivo_fin">Motivo de baja / baneo</label>
          <input id="motivo_fin" name="motivo_fin" defaultValue={a?.motivo_fin ?? ""} className={inputCls}
            placeholder="Solo si descontento/baneado" />
        </div>
        <div>
          <label className={labelCls} htmlFor="fecha_fin">Fecha de baja</label>
          <input id="fecha_fin" name="fecha_fin" type="date" defaultValue={a?.fecha_fin ?? ""} className={inputCls} />
        </div>
      </Seccion>

      <Seccion titulo="Cartera comercial">
        <div>
          <label className={labelCls} htmlFor="comercial_id">Comercial dueño</label>
          <select id="comercial_id" name="comercial_id" defaultValue={a?.comercial_id ?? ""} className={inputCls}>
            <option value="">— Sin asignar —</option>
            {comerciales.map((c) => (
              <option key={c.id} value={c.id}>{nombreComercial(c)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="comercial_captador_id">Comercial que la captó</label>
          <select id="comercial_captador_id" name="comercial_captador_id"
            defaultValue={a?.comercial_captador_id ?? ""} className={inputCls}>
            <option value="">— Igual que el dueño —</option>
            {comerciales.map((c) => (
              <option key={c.id} value={c.id}>{nombreComercial(c)}</option>
            ))}
          </select>
        </div>
        {titulares.length > 0 && (
          <div>
            <label className={labelCls} htmlFor="titular_id">Titular (dueño que cobra comisión)</label>
            <select id="titular_id" name="titular_id" defaultValue={a?.titular_id ?? ""} className={inputCls}>
              <option value="">— Sin definir —</option>
              {titulares.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Notas">
        <div className="sm:col-span-2">
          <textarea name="notas" rows={4} defaultValue={a?.notas ?? ""} className={inputCls}
            placeholder="Cajón de sastre: cualquier detalle relevante." />
        </div>
        <label className="flex items-center gap-2 text-sm text-carbon/70">
          <input type="checkbox" name="activo" defaultChecked={a ? a.activo : true}
            className="h-4 w-4 rounded border-black/20 text-lima-dark focus:ring-lima/30" />
          Activa
        </label>
      </Seccion>

      <div className="flex items-center gap-3">
        <button type="submit"
          className="rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white">
          {textoBoton}
        </button>
        <Link href={hrefCancelar} className="rounded-full px-5 py-2.5 text-sm font-medium text-carbon/60 hover:text-carbon">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
