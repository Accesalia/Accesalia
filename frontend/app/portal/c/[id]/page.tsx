import Link from "next/link";
import { redirect } from "next/navigation";
import { comunidadesDeCorreo, hojasPorFirmar, quienEstaEnElPortal, subidoPor } from "../../../../lib/portal";
import { MarcoPortal } from "../../Marco";
import { Subir } from "../../Subir";

export const dynamic = "force-dynamic";

// LA PAGINA DE UNA COMUNIDAD EN EL PORTAL (Monica, 12-oct-2026). De momento:
// "Lo que os pedimos" (las hojas de encargo enviadas y sin firmar, para subir
// la firmada), "Otro documento" y lo que este correo ya ha enviado. VER su
// documentacion, caso a caso y mas adelante: hoy no se enseña nada.

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
const ESTADO = { por_revisar: "en revisión", aceptado: "recibido y correcto", rechazado: "no era lo que esperábamos" } as Record<string, string>;

export default async function ComunidadEnElPortal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = await quienEstaEnElPortal();
  if (!email) redirect("/portal");
  const coms = await comunidadesDeCorreo(email);
  const c = coms.find((x) => x.id === id);
  if (!c) redirect("/portal");
  const [pedidos, enviados] = await Promise.all([hojasPorFirmar(id), subidoPor(email, id)]);

  return (
    <MarcoPortal email={email}>
      {/* Varias comunidades (un administrador): una pestaña por comunidad. */}
      {coms.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-1.5">
          {coms.map((x) => (
            <Link
              key={x.id}
              href={`/portal/c/${x.id}`}
              className={"rounded-full border px-3 py-1 text-[13px] " + (x.id === id ? "border-carbon bg-carbon font-semibold text-white" : "border-carbon/25 bg-white text-carbon/75 hover:border-carbon")}
            >
              {x.nombre}
            </Link>
          ))}
        </nav>
      )}

      <h1 className="text-2xl font-bold text-carbon">{c.nombre}</h1>
      {c.municipio && <p className="text-carbon/65">{c.municipio}</p>}

      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-bold uppercase tracking-wide text-carbon/70">Lo que os pedimos</h2>
        {pedidos.length === 0 ? (
          <p className="mt-2 text-[14px] text-carbon/70">Ahora mismo no tenemos nada pendiente de vuestra parte.</p>
        ) : (
          <ul className="mt-3 space-y-5">
            {pedidos.map((p) => (
              <li key={p.hojaId}>
                <div className="text-[15px] text-carbon">
                  <b>Hoja de encargo {p.codigo}</b> (versión {p.version}), firmada
                  {p.enviada && <span className="text-carbon/65"> · os la enviamos el {FECHA.format(new Date(p.enviada))}</span>}
                </div>
                {p.recibida ? (
                  <p className="mt-1 text-[13.5px] font-semibold text-lima-dark">Ya nos la habéis enviado: la estamos revisando.</p>
                ) : (
                  <Subir comunidadId={id} hojaId={p.hojaId} texto="Subir la hoja firmada" conDescripcion={false} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-bold uppercase tracking-wide text-carbon/70">Otro documento</h2>
        <p className="mt-1 text-[13.5px] text-carbon/70">Actas, DNI, autorizaciones, listados de la subvención… Lo que os hayamos pedido.</p>
        <Subir comunidadId={id} hojaId={null} texto="Subir un documento" conDescripcion />
      </section>

      {enviados.length > 0 && (
        <section className="mt-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-bold uppercase tracking-wide text-carbon/70">Lo que nos has enviado</h2>
          <ul className="mt-2 divide-y divide-black/5 text-[14px]">
            {enviados.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {e.tipo === "hoja_firmada" ? `Hoja de encargo ${e.hoja?.numero_hoja ?? ""} firmada` : (e.descripcion ?? "Documento")}
                  <span className="text-carbon/60"> · {e.nombre_fichero}</span>
                </span>
                <span className="text-carbon/65">
                  {FECHA.format(new Date(e.creado_en))} · {ESTADO[e.estado] ?? e.estado}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </MarcoPortal>
  );
}
