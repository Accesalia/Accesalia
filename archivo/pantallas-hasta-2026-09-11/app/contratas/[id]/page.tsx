import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { PestanasMaestros } from "../../components/PestanasMaestros";
import {
  contrataPorId, genteDeContrata, obrasDeContrata, notasDeContrata,
  tipoDe, esOjo, sinOjo, nombreCompleto,
} from "../../../lib/contratas";
import { DiarioContrata } from "../DiarioContrata";

export const dynamic = "force-dynamic";

// Ficha de una contrata. Mismo orden que la de administraciones, que se decidio
// con Monica por FRECUENCIA DE USO y no por importancia: quien es y como
// llamarle arriba, su gente debajo con el contacto a la vista, y lo que
// tenemos abierto al final. El diario a la derecha, alto, que es lo que cambia
// todos los dias.

function Tarjeta({ titulo, aux, children }: { titulo: string; aux?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-3.5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-carbon/65">{titulo}</h2>
        {aux}
      </div>
      {children}
    </section>
  );
}

function Dato({ k, v, nota }: { k: string; v: React.ReactNode; nota?: string }) {
  return (
    <div className="border-b border-black/5 px-5 py-3 last:border-0">
      <p className="text-xs uppercase tracking-wide text-carbon/60">{k}</p>
      <div className="mt-0.5 text-base text-carbon/85">{v}</div>
      {nota && <p className="mt-0.5 text-sm text-carbon/60">{nota}</p>}
    </div>
  );
}

const Vacio = ({ children = "No consta" }: { children?: string }) => (
  <span className="text-base italic text-carbon/45">{children}</span>
);

const BALA: Record<string, string> = {
  en_curso: "bg-lima", pendiente_inicio: "bg-amber-400", finalizada: "bg-carbon/25",
};
const ETIQUETA: Record<string, string> = {
  en_curso: "En marcha", pendiente_inicio: "Sin empezar", finalizada: "Terminada", no_procede: "No procede",
};

export default async function FichaContrata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await contrataPorId(id);
  if (!c) notFound();

  const gente = await genteDeContrata(id);
  const [obras, notas] = await Promise.all([
    obrasDeContrata(id),
    notasDeContrata(id, gente.map((g) => g.puestoId)),
  ]);

  const t = tipoDe(c.tipo);
  const enCurso = obras.filter((o) => o.estadoObra === "en_curso").length;
  const sinEmpezar = obras.filter((o) => o.estadoObra === "pendiente_inicio").length;
  const terminadas = obras.filter((o) => o.estadoObra === "finalizada").length;
  const nombre = sinOjo(c.nombre);

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
          <span className="font-semibold text-carbon">{nombre}</span>
        </nav>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* 1. QUIEN ES Y COMO SE LE LLAMA */}
            <section className="rounded-2xl border border-black/5 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[240px] flex-1">
                  <h1 className="text-2xl font-bold text-carbon">
                    {esOjo(c.nombre) && <span className="mr-2 text-red-600">⛔</span>}
                    {nombre}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-base text-carbon/60">
                    <span className={"rounded-full px-2 py-0.5 text-sm font-medium " + t.clase}>{t.label}</span>
                    {c.especialidad && <span>{c.especialidad}</span>}
                    {enCurso > 0 && <span className="font-semibold text-lima-dark">· {enCurso} obras en marcha</span>}
                    <span>· {gente.length} persona{gente.length === 1 ? "" : "s"}</span>
                  </p>
                </div>
                <span className="cursor-not-allowed rounded-full border border-black/10 bg-white px-4 py-2 text-base font-medium text-carbon opacity-50">
                  Editar
                </span>
              </div>

              <div className="mt-4 grid gap-3 border-t border-black/5 pt-3.5 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-carbon/60">Teléfono</p>
                  <p className="mt-0.5 text-base font-semibold text-carbon">{c.telefono ?? <Vacio />}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-carbon/60">Correo</p>
                  <p className="mt-0.5 break-all text-base font-medium text-carbon">{c.email ?? <Vacio />}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-carbon/60">Dirección</p>
                  <p className="mt-0.5 text-base text-carbon/75">{c.direccion ?? <Vacio />}</p>
                </div>
              </div>
            </section>

            {/* 2. SU GENTE */}
            <Tarjeta titulo="Su gente" aux={<span className="text-sm text-carbon/55">{gente.length}</span>}>
              {gente.length === 0 ? (
                <p className="px-5 py-8 text-center text-base italic text-carbon/50">
                  No hay nadie registrado en esta contrata.
                </p>
              ) : (
                <ul className="grid sm:grid-cols-2">
                  {gente.map((p) => (
                    <li
                      key={p.puestoId}
                      className="border-b border-black/5 px-4 py-2.5 transition last:border-b-0 hover:bg-hueso/60 sm:[&:nth-child(odd)]:border-r"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/contratas/persona/${p.puestoId}`}
                          className="truncate text-base font-semibold text-carbon hover:text-lima-dark"
                        >
                          {nombreCompleto(p)}
                        </Link>
                        {p.etapas > 1 && (
                          <span className="shrink-0 text-sm text-carbon/50">{p.etapas} etapas</span>
                        )}
                      </div>
                      <p className="truncate text-sm text-carbon/60">
                        {p.cargo ?? <span className="italic text-carbon/45">sin cargo</span>}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-carbon/70">
                        {(p.emailPuesto ?? p.emailPropio) && <span className="truncate">✉ {p.emailPuesto ?? p.emailPropio}</span>}
                        {(p.telefonoPuesto ?? p.telefonoPropio) && <span className="shrink-0">☎ {p.telefonoPuesto ?? p.telefonoPropio}</span>}
                        {!p.emailPuesto && !p.emailPropio && !p.telefonoPuesto && !p.telefonoPropio && (
                          <span className="italic text-carbon/40">sin contacto</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            {/* 3. LO QUE TENEMOS ABIERTO */}
            <Tarjeta titulo="Lo que tenemos abierto" aux={<span className="text-sm text-carbon/55">{obras.length} obras</span>}>
              <div className="flex border-b border-black/5">
                {[
                  { n: enCurso, l: "en marcha", c: "text-lima-dark" },
                  { n: sinEmpezar, l: "sin empezar", c: "text-amber-700" },
                  { n: 0, l: "presupuestos pedidos", c: "text-carbon", real: true },
                  { n: terminadas, l: "ya terminadas", c: "text-carbon/50" },
                ].map((x, i) => (
                  <div key={i} className="flex-1 border-r border-black/5 px-3 py-3 text-center last:border-0">
                    <p className={"text-xl font-bold tabular-nums " + x.c}>{x.n || "—"}</p>
                    <p className="text-sm text-carbon/60">{x.l}</p>
                  </div>
                ))}
              </div>
              {obras.length === 0 ? (
                <p className="px-5 py-8 text-center text-base italic text-carbon/50">
                  Nada abierto ahora mismo con esta contrata.
                </p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {obras.slice(0, 12).map((o, i) => (
                    <li key={i} className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-hueso/60">
                      <span className={"h-2 w-2 shrink-0 rounded-sm " + (BALA[o.estadoObra ?? ""] ?? "bg-black/10")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium text-carbon">{o.direccion}</span>
                        <span className="text-sm text-carbon/60">{o.municipio ?? ""}{o.tipo ? ` · ${o.tipo}` : ""}</span>
                      </span>
                      <span className="shrink-0 text-right text-sm text-carbon/60">
                        <b className="block text-base text-carbon/75">{ETIQUETA[o.estadoObra ?? ""] ?? "—"}</b>
                        {o.desde ? `desde ${new Date(o.desde).toLocaleDateString("es-ES", { month: "2-digit", year: "numeric" })}` : ""}
                      </span>
                    </li>
                  ))}
                  {obras.length > 12 && (
                    <li className="px-5 py-2.5 text-sm text-carbon/60">y {obras.length - 12} más ›</li>
                  )}
                </ul>
              )}
            </Tarjeta>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-4">
            <DiarioContrata
              entradas={notas}
              volver={`/contratas/${id}`}
              contrataId={id}
              gente={gente.map((g) => ({ id: g.puestoId, nombre: nombreCompleto(g) }))}
              sobreQuien={nombre}
            />

            <Tarjeta titulo="Datos">
              <Dato k="Razón social" v={c.razonSocial ?? <Vacio />} />
              <Dato
                k="CIF"
                v={c.cif ?? <Vacio />}
                nota={c.cif ? undefined : "Aquí sí hace falta: emiten y cobran facturas"}
              />
              <Dato k="Especialidad" v={c.especialidad ?? <Vacio />} />
              {c.notasFiabilidad && <Dato k="Fiabilidad" v={c.notasFiabilidad} />}
              {c.pendiente && (
                <div className="px-5 py-3">
                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <b className="shrink-0">Falta</b>
                    <span>{c.pendiente}</span>
                  </div>
                </div>
              )}
            </Tarjeta>

            <Tarjeta
              titulo="Lo pactado"
              aux={
                <span className={"rounded px-1.5 py-px text-xs font-bold uppercase tracking-wide " +
                  (c.notasComercial ? "bg-lima-soft text-lima-dark" : "bg-amber-50 text-amber-700")}>
                  {c.notasComercial ? "ya está" : "falta"}
                </span>
              }
            >
              {c.notasComercial ? (
                <>
                  {/* Se ensena tal cual porque asi esta: en un campo de texto
                      libre. Ahi dentro hay comisiones, honorarios y formas de
                      pago que hoy no se pueden filtrar ni sumar. */}
                  <pre className="whitespace-pre-wrap px-5 py-3 font-sans text-base leading-relaxed text-carbon/80">
                    {c.notasComercial}
                  </pre>
                  <p className="mx-5 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
                    <b>Ojo.</b> Esto es texto libre, no datos: no se puede filtrar por comisión, ni avisar
                    de un acuerdo que caduca, ni saber a quién se le debe.
                  </p>
                </>
              ) : (
                <p className="px-5 py-8 text-center text-base italic text-carbon/50">
                  No consta nada pactado con esta contrata.
                </p>
              )}
            </Tarjeta>
          </div>
        </div>
      </main>
    </div>
  );
}
