import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import { PestanasMaestros } from "../components/PestanasMaestros";
import {
  listarCartera,
  listarComerciales,
  listarPersonasAdmin,
  nPersonas,
  nComunidades,
  estadoDe,
} from "../../lib/comercial";
import { CarteraCliente, type FilaCartera, type FilaPersona } from "./CarteraCliente";

export const dynamic = "force-dynamic";

// Dos puertas a la misma lista:
//   - desde Administracion, el maestro entero;
//   - desde el area comercial ("Mis administradores", con ?c=), solo las del
//     comercial que se esta mirando. Monica, 11-sep-2026: el boton llevaba a la
//     cartera global y no a la de Alvaro.
export default async function Cartera({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const comerciales = c ? await listarComerciales() : [];
  const comercial = comerciales.find((x) => x.id === c) ?? null;

  const [admins, todasLasPersonas] = await Promise.all([listarCartera(comercial?.id), listarPersonasAdmin()]);
  const ids = new Set(admins.map((a) => a.id));
  const personas = comercial ? todasLasPersonas.filter((p) => p.empresaId && ids.has(p.empresaId)) : todasLasPersonas;
  const conComunidades = admins.filter((a) => nComunidades(a) > 0).length;

  // Aplanar en el servidor (lib/comercial es server-only) para que el cliente
  // solo filtre y pinte primitivos.
  const filas: FilaCartera[] = admins.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    municipio: a.municipio,
    estadoLabel: estadoDe(a.estado).label,
    estadoClase: estadoDe(a.estado).clase,
    estadoClave: a.estado,
    comercialNombre: a.comercial ? [a.comercial.nombre, a.comercial.apellidos].filter(Boolean).join(" ") : null,
    personas: nPersonas(a),
    comunidades: nComunidades(a),
    ultimoContacto: a.fecha_ultimo_contacto,
    activo: a.activo,
  }));

  const filasPersonas: FilaPersona[] = personas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cargo: p.cargo,
    empresa: p.empresa,
    comunidades: p.comunidades,
    email: p.email,
    telefono: p.telefono,
  }));

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      {!comercial && <PestanasMaestros activa="administraciones" />}
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-7">
        {comercial && (
          <Link
            href={`/comercial?c=${comercial.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-carbon/55 transition hover:text-carbon"
          >
            ← Área comercial
          </Link>
        )}
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-carbon sm:text-4xl">
              {comercial ? `Administraciones de ${comercial.nombre}` : "Cartera de administraciones"}
            </h1>
            <p className="mt-1.5 text-carbon/70">
              {admins.length} administraciones de fincas · {conComunidades} con comunidades ·{" "}
              {personas.length} personas
              {comercial && (
                <>
                  {" · "}
                  <Link href="/administraciones" className="font-semibold text-lima-dark hover:underline">
                    ver todas
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/administraciones/nueva"
                className="rounded-full bg-lima px-5 py-2.5 text-base font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
              >
                + Nueva administración
              </Link>
              <Link
                href="/administraciones/nueva?persona=1"
                className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-base font-medium text-carbon transition hover:border-lima hover:text-lima-dark"
              >
                + Nueva persona
              </Link>
            </div>
            {/* La frase es de Monica, y es la promesa de la pantalla de alta:
                se puede empezar una ficha con casi nada. */}
            <p className="text-sm text-carbon/60">Basta con un nombre. Lo demás se va rellenando.</p>
          </div>
        </div>

        {admins.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-black/5 bg-white px-4 py-16 text-center shadow-sm">
            <p className="text-carbon/70">
              {comercial ? `${comercial.nombre} no tiene administraciones a su nombre.` : "Todavía no hay administraciones en la cartera."}
            </p>
            <Link
              href="/administraciones/nueva"
              className="mt-4 inline-block rounded-full bg-lima px-5 py-2.5 text-base font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
            >
              Dar de alta la primera
            </Link>
          </div>
        ) : (
          <CarteraCliente filas={filas} personas={filasPersonas} />
        )}
      </main>
    </div>
  );
}
