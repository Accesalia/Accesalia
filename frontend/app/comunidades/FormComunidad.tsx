import Link from "next/link";
import type { Comunidad } from "../../lib/comunidades";

// Formulario compartido de alta/edicion de comunidad. Los campos son los ESTABLES
// (capa 1). La accion (crear/actualizar) se inyecta desde la pagina; el boton y el
// desplegable de administracion tambien. Sin "use client": es un <form> con action
// de servidor.

function Campo({
  etiqueta,
  name,
  defaultValue,
  type = "text",
  placeholder,
  className = "",
}: {
  etiqueta: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-carbon/45">{etiqueta}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon outline-none transition focus:border-lima"
      />
    </label>
  );
}

export function FormComunidad({
  accion,
  comunidad,
  administraciones,
  textoBoton,
  hrefCancelar = "/comunidades",
}: {
  accion: (fd: FormData) => void;
  comunidad?: Comunidad;
  administraciones: { id: string; nombre: string }[];
  textoBoton: string;
  hrefCancelar?: string;
}) {
  const c = comunidad;
  return (
    <form action={accion} className="mt-8 space-y-8">
      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Identidad</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre de la comunidad *" name="nombre" defaultValue={c?.nombre} className="sm:col-span-2" placeholder="CDAD PROP CL SAN IGNACIO 6 ALCORCON" />
          <Campo etiqueta="CIF" name="cif_comunidad" defaultValue={c?.cif_comunidad} placeholder="H80626294" />
          <Campo etiqueta="Ref. catastral" name="referencia_catastral" defaultValue={c?.referencia_catastral} placeholder="0165804VK3606N" />
          <Campo etiqueta="Año construcción" name="anio_construccion" type="number" defaultValue={c?.anio_construccion} placeholder="1965" />
          <Campo etiqueta="Nº viviendas" name="num_viviendas" type="number" defaultValue={c?.num_viviendas} />
          <Campo etiqueta="IBAN (nº de cuenta)" name="iban" defaultValue={c?.iban} className="sm:col-span-2" placeholder="ES21 2100 8364 3013 0014 7605" />
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Dirección</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Dirección" name="direccion" defaultValue={c?.direccion} className="sm:col-span-2" placeholder="CL SAN IGNACIO 6" />
          <Campo etiqueta="Código postal" name="cp" defaultValue={c?.cp} placeholder="28921" />
          <Campo etiqueta="Municipio" name="municipio" defaultValue={c?.municipio} placeholder="ALCORCÓN" />
          <Campo etiqueta="Provincia" name="provincia" defaultValue={c?.provincia} placeholder="MADRID" />
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-lima-dark">Administración de fincas</h2>
          <Link
            href="/administraciones/nueva"
            target="_blank"
            className="shrink-0 rounded-full border border-lima px-3 py-1 text-xs font-semibold text-lima-dark transition hover:bg-lima hover:text-carbon"
          >
            + Nueva administración
          </Link>
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-medium uppercase tracking-wide text-carbon/45">Administración que la gestiona</span>
          <select
            name="administracion_id"
            defaultValue={c?.administracion_id ?? ""}
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-carbon outline-none transition focus:border-lima"
          >
            <option value="">— Sin administración / contacto directo —</option>
            {administraciones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-carbon/40">¿No está en la lista? Créala en la otra pestaña y recarga esta para elegirla.</span>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-lima px-6 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
        >
          {textoBoton}
        </button>
        <Link href={hrefCancelar} className="text-sm text-carbon/50 hover:text-carbon">
          Cancelar
        </Link>
        <input type="hidden" name="activa" value="on" />
      </div>
    </form>
  );
}
