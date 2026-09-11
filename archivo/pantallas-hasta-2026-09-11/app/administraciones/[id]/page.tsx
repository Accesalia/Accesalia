import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { PestanasMaestros } from "../../components/PestanasMaestros";
import {
  administracionPorId,
  comunidadesDeAdministracion,
  acuerdosDeAdministracion,
  notasDeAdministracion,
  nombreComercial,
  estadoDe,
} from "../../../lib/comercial";
import { Diario } from "./Diario";

export const dynamic = "force-dynamic";

// Ficha de una administracion de fincas.
//
// EL ORDEN DE LA PANTALLA LO PUSO MONICA, y no por importancia sino por
// frecuencia de uso: "si entro a la ficha de una administracion de fincas es
// justo porque busco algo de ellos, sobre todo su contacto".
//
//   1. Quien es + como se le llama (telefono y correo arriba del todo)
//   2. Su gente, con nombre, correo y telefono a la vista: "si entro y busco a
//      la persona X, es lo primero que me salta"
//   3. El diario
//   4. Lo que tenemos abierto — importante, pero no es a lo que entraste
//
// Y una correccion suya sobre la maqueta: la tarjeta de datos ensenaba
// "comunidades" y "proyectos" como dos cifras distintas, y "miente, porque solo
// sabemos que llevan las comunidades que tienen con nosotros: es el mismo numero
// con otro vestido". Ahora ahi van estado, razon legal, CIF y notas.

function Tarjeta({ titulo, aux, children }: { titulo: string; aux?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-3.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-carbon/65">{titulo}</h2>
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
  <span className="text-base italic text-carbon/50">{children}</span>
);

const BALA: Record<string, string> = {
  en_curso: "bg-lima", pendiente_inicio: "bg-amber-400", finalizada: "bg-carbon/25",
};
const ETIQUETA_OBRA: Record<string, string> = {
  en_curso: "En marcha", pendiente_inicio: "Sin empezar", finalizada: "Terminada", no_procede: "No procede",
};

export default async function FichaAdministracion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await administracionPorId(id);
  if (!ficha) notFound();

  const { administracion: a, comercial, personas } = ficha;
  const [comunidades, acuerdos, notas] = await Promise.all([
    comunidadesDeAdministracion(id),
    acuerdosDeAdministracion(id),
    notasDeAdministracion(id, personas.map((p) => p.id)),
  ]);

  const estado = estadoDe(a.estado);
  const titulares = personas.filter((p) => /titular|socio|gerente|propietari/i.test(p.cargo ?? ""));
  const enMarcha = comunidades.filter((c) => c.estadoObra === "en_curso").length;
  const sinEmpezar = comunidades.filter((c) => c.estadoObra === "pendiente_inicio").length;
  const nComunidades = new Set(comunidades.map((c) => c.comunidad)).size;

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <PestanasMaestros activa="administraciones" />
      <main className="mx-auto max-w-[1200px] px-6 pb-16 pt-7">
        <nav className="flex items-center gap-2 text-sm text-carbon/65">
          <Link href="/administraciones" className="border-b border-black/10 hover:border-lima hover:text-lima-dark">
            Administraciones de fincas
          </Link>
          <span>›</span>
          <span className="font-semibold text-carbon">{a.nombre}</span>
        </nav>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
        {/* 1. QUIEN ES Y COMO SE LE LLAMA ---------------------------------- */}
        <section className="rounded-2xl border border-black/5 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <h1 className="text-2xl font-bold text-carbon">{a.nombre}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-base text-carbon/70">
                <span className={"rounded-full px-2 py-0.5 text-sm font-medium " + estado.clase}>{estado.label}</span>
                {a.municipio && <span>{a.municipio}</span>}
                <span>· {nComunidades} comunidad{nComunidades === 1 ? "" : "es"} con nosotros</span>
                {enMarcha > 0 && <span className="font-semibold text-lima-dark">· {enMarcha} en obra</span>}
                <span>· {personas.length} persona{personas.length === 1 ? "" : "s"}</span>
              </p>
            </div>
            <Link
              href={`/administraciones/${a.id}/editar`}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-base font-medium text-carbon transition hover:border-lima hover:text-lima-dark"
            >
              Editar
            </Link>
          </div>

          {/* Lo que casi siempre vienes a buscar, en la primera pantalla. */}
          <div className="mt-4 grid gap-3 border-t border-black/5 pt-3.5 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-carbon/60">Teléfono</p>
              <p className="mt-0.5 text-base font-semibold text-carbon">{a.telefono ?? <Vacio />}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-carbon/60">Correo</p>
              <p className="mt-0.5 break-all text-base font-medium text-carbon">{a.email ?? <Vacio />}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-carbon/60">Dirección</p>
              <p className="mt-0.5 text-base text-carbon/75">{a.direccion ?? <Vacio />}</p>
            </div>
          </div>
        </section>

            {/* 2. SU GENTE ------------------------------------------------- */}
            <Tarjeta
              titulo="Su gente"
              aux={
                <Link
                  href={`/administraciones/${a.id}/persona/nueva`}
                  className="rounded-full bg-lima-soft px-3 py-1 text-sm font-semibold text-lima-dark transition hover:bg-lima hover:text-carbon"
                >
                  + Añadir persona
                </Link>
              }
            >
              {personas.length === 0 ? (
                <p className="px-5 py-8 text-center text-base italic text-carbon/55">
                  No hay nadie registrado en esta administración.
                </p>
              ) : (
                /* Dos columnas y compacto: es una agenda, no un listado.
                   Lo primero que salta es el nombre y como llamarle. */
                <ul className="grid sm:grid-cols-2">
                  {personas.map((p) => (
                    <li
                      key={p.id}
                      className="border-b border-black/5 px-4 py-2.5 transition last:border-b-0 hover:bg-hueso/60 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/administradores/${p.id}`}
                          className="truncate text-base font-semibold text-carbon hover:text-lima-dark"
                        >
                          {p.nombre}
                        </Link>
                        <span className="shrink-0 text-sm tabular-nums text-carbon/60">
                          {/titular/i.test(p.cargo ?? "") && (
                            <span className="mr-1.5 rounded bg-lima-soft px-1.5 py-px text-xs font-bold uppercase text-lima-dark">
                              titular
                            </span>
                          )}
                          {p.comunidades > 0 && `${p.comunidades} com.`}
                        </span>
                      </div>
                      <p className="truncate text-sm text-carbon/65">
                        {p.cargo ?? <span className="italic text-carbon/50">sin cargo</span>}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-carbon/80">
                        {p.email && <span className="truncate">✉ {p.email}</span>}
                        {p.telefono && <span className="shrink-0">☎ {p.telefono}</span>}
                        {!p.email && !p.telefono && (
                          <span className="italic text-carbon/45">sin contacto</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            {/* 4. LO QUE TENEMOS ABIERTO ----------------------------------- */}
            <Tarjeta
              titulo="Lo que tenemos abierto en sus comunidades"
              aux={<span className="text-sm text-carbon/55">{comunidades.length} en total</span>}
            >
              <div className="flex border-b border-black/5">
                {[
                  { n: enMarcha, l: "en marcha", c: "text-lima-dark" },
                  { n: sinEmpezar, l: "sin empezar", c: "text-amber-700" },
                  { n: nComunidades, l: "comunidades", c: "text-carbon" },
                  { n: acuerdos.length, l: "comisiones pactadas", c: acuerdos.length ? "text-lima-dark" : "text-carbon/50" },
                ].map((x) => (
                  <div key={x.l} className="flex-1 border-r border-black/5 px-3 py-3 text-center last:border-0">
                    <p className={"text-xl font-bold tabular-nums " + x.c}>{x.n || "—"}</p>
                    <p className="text-sm text-carbon/65">{x.l}</p>
                  </div>
                ))}
              </div>
              {comunidades.length === 0 ? (
                <p className="px-5 py-8 text-center text-base italic text-carbon/55">
                  No consta ninguna comunidad de esta administración.
                </p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {comunidades.slice(0, 12).map((c, i) => (
                    <li key={i} className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-hueso/60">
                      <span className={"h-2 w-2 shrink-0 rounded-sm " + (BALA[c.estadoObra ?? ""] ?? "bg-black/10")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-medium text-carbon">{c.comunidad}</span>
                        <span className="text-sm text-carbon/65">
                          {c.tipo ?? "sin tipo"}
                          {c.quien && ` · lo lleva ${c.quien}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm text-carbon/65">
                        {c.estadoObra ? (
                          <b className="block text-sm text-carbon/75">{ETIQUETA_OBRA[c.estadoObra] ?? c.estadoObra}</b>
                        ) : (
                          <b className="block text-sm text-carbon/65">Sin obra</b>
                        )}
                        {c.estadoProyecto ?? ""}
                      </span>
                    </li>
                  ))}
                  {comunidades.length > 12 && (
                    <li className="px-5 py-2.5 text-sm text-carbon/65">y {comunidades.length - 12} más ›</li>
                  )}
                </ul>
              )}
            </Tarjeta>
          </div>

          {/* COLUMNA DERECHA ---------------------------------------------- */}
          <div className="space-y-4">
            {/* Lo primero de esta columna, a la altura del nombre: es lo ultimo
                que ha pasado con ellos, y lo que cambia todos los dias. */}
            <Diario
              empresaId={a.id}
              entradas={notas}
              gente={personas.map((p) => ({ id: p.id, nombre: p.nombre }))}
            />

            <Tarjeta titulo="Datos">
              <Dato k="Estado" v={<span className={"rounded-full px-2 py-0.5 text-sm font-medium " + estado.clase}>{estado.label}</span>} />
              {/* Quien manda en la casa. Si hay varios socios salen todos: en las
                  pequeñas la administracion ES la persona, y saberlo cambia con
                  quien hablas de dinero. */}
              <Dato
                k={titulares.length > 1 ? "Titulares" : "Titular"}
                v={
                  titulares.length ? (
                    <span className="flex flex-col gap-0.5">
                      {titulares.map((t) => (
                        <Link key={t.id} href={`/administradores/${t.id}`} className="hover:text-lima-dark">
                          {t.nombre}
                        </Link>
                      ))}
                    </span>
                  ) : (
                    <Vacio>Sin titular marcado</Vacio>
                  )
                }
                nota={titulares.length ? undefined : "Se marca desde la ficha de la persona"}
              />
              <Dato k="Razón legal" v={a.nombre_legal ?? <Vacio />} />
              <Dato
                k="CIF"
                v={a.cif ?? <Vacio />}
                nota={a.cif ? undefined : "Solo 1 de las 279 lo tiene, y no hace falta: es dato de contacto"}
              />
              {comercial && <Dato k="Comercial que la lleva" v={nombreComercial(comercial)} />}
              <Dato k="Notas" v={a.notas ?? <Vacio>Sin notas</Vacio>} />
            </Tarjeta>

            <Tarjeta
              titulo="Lo pactado"
              aux={
                <span
                  className={
                    "rounded px-1.5 py-px text-xs font-bold uppercase tracking-wide " +
                    (acuerdos.length ? "bg-lima-soft text-lima-dark" : "bg-amber-50 text-amber-700")
                  }
                >
                  {acuerdos.length ? "ya está" : "falta"}
                </span>
              }
            >
              {acuerdos.length === 0 ? (
                <p className="px-5 py-8 text-center text-base italic text-carbon/55">
                  No consta ningún acuerdo de comisión. O no lo hay, o está sin registrar.
                </p>
              ) : (
                <>
                  <dl className="px-5 py-3 text-base">
                    {acuerdos.map((ac) => (
                      <div key={ac.id} className="mb-3 last:mb-0">
                        <dt className="text-xs uppercase tracking-wide text-carbon/60">
                          {ac.pagador === "accesalia" ? "Nos la paga Accesalia" : "La paga la contrata"}
                        </dt>
                        <dd className="font-semibold text-carbon">
                          {ac.importe
                            ? ac.base === "por_pem"
                              ? `${ac.importe} % del PEM`
                              : `${ac.importe} € por proyecto`
                            : "Pactada, sin importe"}
                        </dd>
                        {ac.notas && <dd className="text-sm text-carbon/70">{ac.notas}</dd>}
                      </div>
                    ))}
                  </dl>
                  {acuerdos.every((ac) => !ac.tienePersona) && (
                    <p className="mx-5 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
                      <b>Ojo.</b> Está pactado con la administración, no con nadie en concreto. La columna
                      para decir a quién se le paga existe, pero está vacía en los 51 acuerdos.
                    </p>
                  )}
                </>
              )}
            </Tarjeta>
          </div>
        </div>
      </main>
    </div>
  );
}
