import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../../components/BarraSuperior";
import { PestanasMaestros } from "../../../components/PestanasMaestros";
import {
  historiaDePersona, obrasDeContrata, notasDePersona,
  listarContratas, sinOjo, nombreCompleto,
} from "../../../../lib/contratas";
import { DiarioContrata } from "../../DiarioContrata";

export const dynamic = "force-dynamic";

// Ficha de una persona de contrata.
//
// El bloque de arriba es el que pidio Monica por la mañana: el cargo actual y
// debajo los anteriores, empresa por empresa y con fechas. "Así el ex CEGA
// queda perfectamente retratado aunque no pongamos ex-CEGA".
//
// El id de la URL es el de un PUESTO, no el de la persona: es lo que identifica
// a alguien EN una empresa. Desde el se saca la persona y todas sus etapas.

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function mesAno(f: string | null) {
  if (!f) return null;
  const d = new Date(f);
  return `${MES[d.getMonth()]} ${d.getFullYear()}`;
}
function periodo(desde: string | null, hasta: string | null) {
  const d = mesAno(desde), h = mesAno(hasta);
  if (d && h) return `${d} → ${h}`;
  if (d) return `desde ${d}`;
  if (h) return `hasta ${h}`;
  return "sin fechas";
}

const BALA: Record<string, string> = {
  en_curso: "bg-lima", pendiente_inicio: "bg-amber-400", finalizada: "bg-carbon/25",
};

export default async function FichaPersonaContrata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const etapas = await historiaDePersona(id);
  if (!etapas.length) notFound();

  const actual = etapas[0];
  const nombre = nombreCompleto(actual);
  const [obras, notas, contratas] = await Promise.all([
    obrasDeContrata(actual.contrataId),
    notasDePersona(actual.personaId, etapas.map((e) => e.puestoId)),
    listarContratas(),
  ]);
  const suEmpresa = contratas.find((c) => c.id === actual.contrataId);
  const empresas = new Set(etapas.map((e) => e.contrataId));
  const aMedias = etapas.filter((e) => e.pendientePuesto).length + (actual.pendientePersona ? 1 : 0);
  const abiertas = obras.filter((o) => o.estadoObra === "en_curso" || o.estadoObra === "pendiente_inicio");

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <PestanasMaestros activa="contratas" />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-7">
        <nav className="flex items-center gap-2 text-sm text-carbon/60">
          <Link href="/contratas" className="border-b border-black/10 hover:border-lima hover:text-lima-dark">
            Contratas
          </Link>
          <span>›</span>
          <Link href={`/contratas/${actual.contrataId}`} className="border-b border-black/10 hover:border-lima hover:text-lima-dark">
            {sinOjo(actual.contrata)}
          </Link>
          <span>›</span>
          <span className="font-semibold text-carbon">{nombre}</span>
        </nav>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* QUIEN ES */}
            <section className="rounded-2xl border border-black/5 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-wrap items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-black/10 bg-lima-soft text-xl font-bold text-lima-dark">
                  {nombre.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
                </div>
                <div className="min-w-[240px] flex-1">
                  <h1 className="text-2xl font-bold text-carbon">{nombre}</h1>
                  <p className="mt-1 text-base text-carbon/60">
                    Ahora en <b className="text-carbon">{sinOjo(actual.contrata)}</b>
                    {actual.cargo ? ` · ${actual.cargo}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-lima bg-lima-soft px-2.5 py-0.5 text-sm font-semibold text-lima-dark">
                      En activo
                    </span>
                    {etapas.length > 1 && (
                      <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-sm text-carbon/70">
                        {etapas.length} etapas
                      </span>
                    )}
                    {empresas.size > 1 && (
                      <span className="rounded-full border border-black/10 px-2.5 py-0.5 text-sm text-carbon/70">
                        {empresas.size} empresas
                      </span>
                    )}
                    {aMedias > 0 && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-sm font-semibold text-blue-700">
                        {aMedias} dato{aMedias > 1 ? "s" : ""} a medias
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* DONDE HA ESTADO: el bloque que pidio Monica */}
            <section className="rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-3.5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/65">Dónde ha estado</h2>
                <span className="text-sm text-carbon/55">{etapas.length} {etapas.length === 1 ? "etapa" : "etapas"}</span>
              </div>
              <div className="py-1">
                {etapas.map((e, i) => (
                  <div
                    key={e.puestoId}
                    className={"grid grid-cols-[13px_1fr] gap-3 px-4 py-3 " + (i === 0 ? "bg-lima-soft/60" : "")}
                  >
                    <div className="relative">
                      <div className={"mt-1.5 h-3 w-3 rounded-full border-2 " + (i === 0 ? "border-lima-dark bg-lima" : "border-black/15 bg-white")} />
                      {i < etapas.length - 1 && <div className="absolute left-[5px] top-5 h-full w-px bg-black/10" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link href={`/contratas/${e.contrataId}`} className="text-lg font-semibold text-carbon hover:text-lima-dark">
                          {sinOjo(e.contrata)}
                        </Link>
                        <span className="text-sm tabular-nums text-carbon/60">
                          {i === 0 && <b className="text-lima-dark">actual · </b>}
                          {periodo(e.desde, e.hasta)}
                        </span>
                      </div>
                      <p className="text-base text-carbon/85">
                        {e.cargo ?? <span className="italic text-carbon/45">Sin cargo</span>}
                      </p>
                      {(e.emailPuesto || e.telefonoPuesto) && (
                        <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-carbon/60">
                          {e.emailPuesto && <span>✉ {e.emailPuesto}</span>}
                          {e.telefonoPuesto && <span>☎ {e.telefonoPuesto}</span>}
                        </p>
                      )}
                      {e.notasPuesto && (
                        <p className="mt-1.5 border-l-2 border-black/10 pl-2 text-base italic text-carbon/60">
                          {e.notasPuesto}
                        </p>
                      )}
                      {e.pendientePuesto && (
                        <div className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-800">
                          <b className="shrink-0">Falta</b>
                          <span>{e.pendientePuesto}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* LO QUE TENEMOS ABIERTO CON SU EMPRESA */}
            <section className="rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-5 py-3.5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/65">
                  Lo que tenemos abierto con {sinOjo(actual.contrata)}
                </h2>
                <span className="text-sm text-carbon/50">de la empresa, no de esta persona</span>
              </div>
              {abiertas.length === 0 ? (
                <p className="px-5 py-8 text-center text-base italic text-carbon/50">
                  Nada abierto ahora mismo con {sinOjo(actual.contrata)}.
                </p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {abiertas.slice(0, 8).map((o, i) => (
                    <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                      <span className={"h-2 w-2 shrink-0 rounded-sm " + (BALA[o.estadoObra ?? ""] ?? "bg-black/10")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium text-carbon">{o.direccion}</span>
                        <span className="text-sm text-carbon/60">{o.municipio ?? ""}{o.tipo ? ` · ${o.tipo}` : ""}</span>
                      </span>
                      <span className="shrink-0 text-sm text-carbon/70">
                        {o.estadoObra === "en_curso" ? "En marcha" : "Sin empezar"}
                      </span>
                    </li>
                  ))}
                  {abiertas.length > 8 && (
                    <li className="px-5 py-2.5 text-sm text-carbon/60">y {abiertas.length - 8} más ›</li>
                  )}
                </ul>
              )}

              {/* El hueco, a la vista. Es un campo, y cambia lo que se puede medir. */}
              <div className="border-t border-black/5 px-5 py-4">
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="min-w-[7rem] rounded-lg border border-black/10 bg-black/[0.02] px-4 py-2 text-center">
                    <p className="text-xl font-bold tabular-nums">{obras.length}</p>
                    <p className="text-sm text-carbon/60">obras de {sinOjo(actual.contrata)}</p>
                  </div>
                  <div className="min-w-[7rem] rounded-lg border border-black/10 bg-black/[0.02] px-4 py-2 text-center">
                    <p className="text-xl font-bold text-amber-600">—</p>
                    <p className="text-sm text-carbon/60">traídas por {actual.nombre}</p>
                  </div>
                  <div className="min-w-[7rem] rounded-lg border border-black/10 bg-black/[0.02] px-4 py-2 text-center">
                    <p className="text-xl font-bold text-amber-600">—</p>
                    <p className="text-sm text-carbon/60">comisión de {actual.nombre}</p>
                  </div>
                </div>
                <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-carbon/60">
                  Todo cuelga de la <b>empresa</b>. Para saber qué ha traído esta persona hace falta guardar
                  <b> quién</b> lo trajo, no solo de dónde venía.
                </p>
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-4">
            <DiarioContrata
              entradas={notas}
              volver={`/contratas/persona/${id}`}
              personaId={actual.personaId}
              sobreQuien={actual.nombre}
            />

            <section className="rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-3.5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/65">Lo suyo</h2>
                <span className="text-sm text-carbon/50">se lo lleva si cambia</span>
              </div>
              <div className="border-b border-black/5 px-5 py-3">
                <p className="text-xs uppercase tracking-wide text-carbon/60">Móvil</p>
                {actual.telefonoPropio ? (
                  <p className="mt-0.5 text-base text-carbon/85">{actual.telefonoPropio}</p>
                ) : (
                  <>
                    <p className="mt-0.5 text-base italic text-carbon/45">No consta uno suyo</p>
                    <p className="mt-0.5 text-sm text-carbon/60">Solo el de la empresa, que pierde si se va</p>
                  </>
                )}
              </div>
              <div className="border-b border-black/5 px-5 py-3">
                <p className="text-xs uppercase tracking-wide text-carbon/60">Correo propio</p>
                {actual.emailPropio ? (
                  <>
                    <p className="mt-0.5 break-all text-base text-carbon/85">{actual.emailPropio}</p>
                    <p className="mt-0.5 text-sm text-carbon/60">No es de la empresa: lo conserva</p>
                  </>
                ) : (
                  <>
                    <p className="mt-0.5 text-base italic text-carbon/45">No consta uno suyo</p>
                    <p className="mt-0.5 text-sm text-carbon/60">El corporativo se apaga cuando se va</p>
                  </>
                )}
              </div>
              {actual.pendientePersona && (
                <div className="px-5 py-3">
                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <b className="shrink-0">Falta</b>
                    <span>{actual.pendientePersona}</span>
                  </div>
                </div>
              )}
            </section>

            {suEmpresa && (
              <Link
                href={`/contratas/${actual.contrataId}`}
                className="block rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm transition hover:border-lima"
              >
                <p className="text-xs uppercase tracking-wide text-carbon/60">Su empresa</p>
                <p className="mt-0.5 text-lg font-semibold text-carbon">{sinOjo(suEmpresa.nombre)}</p>
                <p className="text-sm text-carbon/60">
                  {suEmpresa.personas} personas · {suEmpresa.enCurso} obras en marcha
                </p>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
