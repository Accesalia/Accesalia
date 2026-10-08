"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Elegir, type Opcion } from "../../../components/Elegir";
import { accionCompletar } from "./acciones";

// COMPLETAR LA OPORTUNIDAD (Monica, 8-oct-2026). Sale arriba en la ficha
// cuando le falta algo de lo que exige el camino: direccion confirmada,
// contacto y siguiente paso. Mientras falte, no salen documentos hacia fuera
// (viabilidad, hoja, presupuesto); las notas y el Polycam siguen llegando.
// El administrador se puede poner aqui, pero no cuenta: no bloquea.

const PASOS = [
  { clave: "primer_contacto", texto: "Llamar para que me cuenten" },
  { clave: "visita", texto: "Ir a verlo" },
  { clave: "envio_documentos", texto: "Enviar Hoja de Encargo" },
];
const ETQ = "block text-[10px] font-bold uppercase tracking-[0.05em] text-amber-900/75";
const CAMPO = "w-full rounded-lg border border-carbon/30 bg-white px-3 py-1.5 text-sm text-carbon outline-none focus:border-lima";

export function Completar({
  id,
  falta,
  personas,
}: {
  id: string;
  /** Los textos de lo que falta: "confirmar la dirección", "el contacto"… */
  falta: { clave: string; texto: string }[];
  personas: Opcion[];
}) {
  const router = useRouter();
  const [contacto, setContacto] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [paso, setPaso] = useState("");
  const [admin, setAdmin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  const faltaContacto = falta.some((f) => f.clave === "contacto");
  const faltaPaso = falta.some((f) => f.clave === "paso");
  const faltaDireccion = falta.some((f) => f.clave === "direccion");
  // El contacto: alguien de la lista (administracion o comunidad) o escrito.
  const contactos = personas.filter((p) => p.valor.startsWith("puesto:") || p.valor.startsWith("pc:"));
  const admins = personas.filter((p) => p.valor.startsWith("puesto:"));

  const guardar = () =>
    empezar(async () => {
      setError(null);
      const r = await accionCompletar(id, {
        contacto: contacto || null,
        contactoNombre: contacto ? null : nombre || null,
        contactoTelefono: contacto ? null : telefono || null,
        siguientePaso: paso || null,
        administrador: admin || null,
      });
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const algo = contacto || nombre.trim() || paso || admin;

  return (
    <section className="mb-[10px] rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-[13px] text-amber-900">
        <b>Esta oportunidad está a medias.</b> Falta: <b>{falta.map((f) => f.texto).join(" · ")}</b>. Hasta completarla no
        se puede generar la viabilidad, la hoja ni el presupuesto. Las notas y el Polycam sí siguen entrando.
      </p>
      {faltaDireccion && (
        <p className="mt-1 text-[12px] text-amber-900/80">
          La dirección se confirma con el botón de cambiar la dirección, junto al nombre de arriba.
        </p>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {faltaContacto && (
          <div>
            <span className={ETQ}>Contacto</span>
            <Elegir id="completar_contacto" nombre="" opciones={contactos} valor={contacto} alElegir={setContacto} vacio="de la lista…" conPista clase="mt-1" />
            {!contacto && (
              <div className="mt-1.5 grid grid-cols-[1fr_120px] gap-1.5">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="o escríbelo: nombre" className={CAMPO} />
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="teléfono" className={CAMPO} />
              </div>
            )}
          </div>
        )}
        {faltaPaso && (
          <div>
            <span className={ETQ}>Siguiente paso</span>
            <div className="mt-1 flex flex-col gap-1">
              {PASOS.map((p) => (
                <label key={p.clave} className="flex cursor-pointer items-center gap-2 text-[13px] text-carbon/85">
                  <input type="radio" name="completar_paso" checked={paso === p.clave} onChange={() => setPaso(p.clave)} className="size-4 accent-carbon" />
                  {p.texto}
                </label>
              ))}
            </div>
          </div>
        )}
        <div>
          <span className={ETQ}>Administrador (si se sabe; no es obligatorio)</span>
          <Elegir id="completar_admin" nombre="" opciones={admins} valor={admin} alElegir={setAdmin} vacio="de la lista…" conPista clase="mt-1" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!algo || ocupado}
          onClick={guardar}
          className="rounded-lg bg-lima px-5 py-1.5 text-sm font-bold text-carbon transition hover:bg-lima-dark hover:text-white disabled:opacity-40"
        >
          {ocupado ? "Guardando…" : "Guardar"}
        </button>
        {error && <span className="text-[13px] font-semibold text-alerta">{error}</span>}
      </div>
    </section>
  );
}
