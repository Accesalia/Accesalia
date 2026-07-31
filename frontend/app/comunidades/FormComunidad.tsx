import Link from "next/link";
import type { Comunidad } from "../../lib/comunidades";
import { Guardando } from "../components/Guardando";

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
  textoBoton,
  hrefCancelar = "/comunidades",
}: {
  accion: (fd: FormData) => void;
  comunidad?: Comunidad;
  textoBoton: string;
  hrefCancelar?: string;
}) {
  const c = comunidad;
  return (
    <form action={accion} className="mt-8 space-y-8">
      <Guardando />
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
          <Campo etiqueta="Comunidad autónoma" name="comunidad_autonoma"
            defaultValue={c?.comunidad_autonoma} className="sm:col-span-2"
            placeholder="COMUNIDAD DE MADRID" />
        </div>
      </section>

      {/* La administracion NO se edita aqui.
          Cambiar de administracion no es cambiar un dato del edificio: es cerrar
          una etapa y abrir otra, con su fecha y su motivo, conservando la
          anterior. Eso es lo que permite entender despues por que un documento
          de hace dos anos lleva otra firma. Tiene pantalla propia. */}
      <section className="rounded-2xl border border-black/5 bg-black/[0.015] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon/50">
          Administración de fincas
        </h2>
        {c ? (
          <p className="mt-2 text-sm text-carbon/60">
            Se cambia desde la ficha de la comunidad, para poder guardar desde cuándo
            y quién la llevaba antes.{" "}
            <Link href={`/comunidades/${c.id}/administracion`}
              className="font-medium text-lima-dark hover:underline">
              Cambiar administración
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-sm text-carbon/60">
            Se asigna al terminar, desde la ficha de la comunidad.
          </p>
        )}
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
