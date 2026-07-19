import Link from "next/link";
import { BarraSuperior } from "../components/BarraSuperior";
import {
  listarAdministradores,
  nombreComercial,
  organizacionDe,
  type Administrador,
} from "../../lib/comercial";

export const dynamic = "force-dynamic";

function fecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Semaforo de contacto: verde reciente, ambar tibio, gris frio (enchufe de IA).
function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function PuntoContacto({ iso }: { iso: string | null }) {
  const d = diasDesde(iso);
  const color =
    d === null ? "bg-black/15" : d <= 30 ? "bg-lima" : d <= 90 ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />;
}

function Fila({ a }: { a: Administrador }) {
  const org = organizacionDe(a);
  return (
    <Link
      href={`/administradores/${a.id}`}
      className="grid grid-cols-12 items-center gap-3 border-b border-black/5 px-4 py-3 text-sm transition hover:bg-lima-soft/50"
    >
      <div className="col-span-3 min-w-0">
        <div className="truncate font-medium text-carbon">{a.nombre}</div>
        {a.cargo && <div className="truncate text-xs text-carbon/45">{a.cargo}</div>}
      </div>
      <div className="col-span-3 min-w-0 truncate text-carbon/70">
        {org ?? <span className="text-carbon/30">Autónomo</span>}
      </div>
      <div className="col-span-2 min-w-0 truncate text-carbon/70">
        {nombreComercial(a.comercial)}
      </div>
      <div className="col-span-2 min-w-0 truncate text-carbon/60">
        {a.telefono ?? a.email ?? "—"}
      </div>
      <div className="col-span-1 flex items-center gap-1.5 text-xs text-carbon/60">
        <PuntoContacto iso={a.fecha_ultimo_contacto} />
        {fecha(a.fecha_ultimo_contacto)}
      </div>
      <div className="col-span-1 text-right">
        {a.activo ? (
          <span className="rounded-full bg-lima-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-lima-dark">
            Activo
          </span>
        ) : (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-carbon/40">
            Baja
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function CarteraAdministradores() {
  const admins = await listarAdministradores();
  const activos = admins.filter((a) => a.activo).length;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-lima-dark">
              Comercial · CRM
            </p>
            <h1 className="mt-1 text-2xl font-bold text-carbon sm:text-3xl">
              Cartera de administradores
            </h1>
            <p className="mt-1 text-carbon/50">
              {admins.length} administrador{admins.length === 1 ? "" : "es"}
              {admins.length > 0 && ` · ${activos} activo${activos === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link
            href="/administradores/nuevo"
            className="rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
          >
            + Nuevo administrador
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          {/* Cabecera de columnas */}
          <div className="grid grid-cols-12 gap-3 border-b border-black/10 bg-hueso px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-carbon/40">
            <div className="col-span-3">Administrador</div>
            <div className="col-span-3">Administración de fincas</div>
            <div className="col-span-2">Comercial</div>
            <div className="col-span-2">Contacto</div>
            <div className="col-span-1">Últ. contacto</div>
            <div className="col-span-1 text-right">Estado</div>
          </div>

          {admins.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-carbon/50">Todavía no hay administradores en la cartera.</p>
              <Link
                href="/administradores/nuevo"
                className="mt-4 inline-block rounded-full bg-lima px-5 py-2.5 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white"
              >
                Dar de alta el primero
              </Link>
            </div>
          ) : (
            admins.map((a) => <Fila key={a.id} a={a} />)
          )}
        </div>
      </main>
    </div>
  );
}
