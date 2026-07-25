import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { listarCartera, nombreComercial, nPersonas, ESTADOS } from "../../lib/comercial";
import { CarteraCliente, type FilaCartera } from "./CarteraCliente";

export const dynamic = "force-dynamic";

export default async function Cartera() {
  const admins = await listarCartera();
  const clientes = admins.filter((a) => a.estado.startsWith("cliente")).length;
  const contactos = admins.filter((a) => a.estado === "contacto").length;

  // Aplanar en el servidor (lib/comercial es server-only) para que el cliente
  // solo filtre/pinte primitivos.
  const filas: FilaCartera[] = admins.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    municipio: a.municipio,
    estadoLabel: ESTADOS[a.estado].label,
    estadoClase: ESTADOS[a.estado].clase,
    comercialId: a.comercial_id,
    comercialNombre: nombreComercial(a.comercial),
    personas: nPersonas(a),
    ultimoContacto: a.fecha_ultimo_contacto,
    activo: a.activo,
  }));

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-lima-dark">Comercial · CRM</p>
            <h1 className="mt-1 text-2xl font-bold text-carbon sm:text-3xl">Cartera de administraciones</h1>
            <p className="mt-1 text-carbon/50">
              {admins.length} administracion{admins.length === 1 ? "" : "es"}
              {admins.length > 0 && ` · ${clientes} cliente${clientes === 1 ? "" : "s"} · ${contactos} contacto${contactos === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link
            href="/administraciones/nueva"
            className="rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            + Nueva administración
          </Link>
        </div>

        {admins.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-black/5 bg-white px-4 py-16 text-center shadow-sm">
            <p className="text-carbon/50">Todavía no hay administraciones en la cartera.</p>
            <Link
              href="/administraciones/nueva"
              className="mt-4 inline-block rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Dar de alta la primera
            </Link>
          </div>
        ) : (
          <CarteraCliente filas={filas} />
        )}
      </main>
    </div>
  );
}
