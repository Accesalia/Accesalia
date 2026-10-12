import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { puedeEntrar, quienSoy } from "../../../../lib/sesion";
import {
  fichaPersona,
  resumenAdministracion,
  resumenComunidad,
  resumenOrganismo,
  type Cargo,
  type ResumenAdministracion,
  type ResumenComunidad,
  type ResumenOrganismo,
} from "../../../../lib/fichas";
import { CAJA, ENLACE, Marco, ROT } from "../../Marco";
import { Salida } from "../../../components/Salida";

export const dynamic = "force-dynamic";

// LA FICHA DE PERSONA (Monica, 12-oct-2026). Primera version para verla en
// pantalla y decidir sobre ella que datos lleva cada tipo. Tres pisos:
//   1. datos personales;
//   2. su relacion con nosotros: cargos con desde-hasta e historial;
//   3. debajo, lo de su puesto vigente (administracion, comunidad, contrata u
//      organismo).
// Y las secciones con llave, que solo ve quien la tiene ("la seccion es la
// unidad de permiso"): empleado de Accesalia (RRHH, direccion y el mismo) y
// comercial (direccion, supervision y el mismo).

const MES = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const mes = (v: string | null) => (v ? MES.format(new Date(v)) : null);
const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
const MUNDO: Record<Cargo["mundo"], string> = { comunidad: "Comunidad", administracion: "Administración", contrata: "Contrata", organismo: "Organismo", otro: "—" };

function Seccion({ titulo, llave, children }: { titulo: string; llave?: string; children: ReactNode }) {
  return (
    <section className={CAJA + " mt-4 p-5"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={ROT}>{titulo}</h2>
        {llave && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/60">solo {llave}</span>}
      </div>
      <div className="mt-2.5 text-[14px] text-carbon">{children}</div>
    </section>
  );
}
function Dato({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex gap-3 py-0.5">
      <span className="w-[130px] shrink-0 text-[12.5px] text-carbon/65">{k}</span>
      <span className="min-w-0">{v || <span className="text-amber-700/60">por completar</span>}</span>
    </div>
  );
}

function enlaceDe(c: Cargo): string | null {
  if (!c.entidadId) return null;
  if (c.mundo === "comunidad") return `/administracion/comunidades/${c.entidadId}`;
  if (c.mundo === "contrata") return `/consulta/contratas/${c.entidadId}`;
  if (c.mundo === "administracion") return `/consulta/oportunidades?admin=${c.entidadId}`;
  return null;
}

function LineaCargo({ c, actual }: { c: Cargo; actual: boolean }) {
  const href = enlaceDe(c);
  const donde = href ? (
    <Link href={href} className={ENLACE}>
      {c.entidad}
    </Link>
  ) : (
    <b>{c.entidad}</b>
  );
  const cuando = actual ? (c.desde ? `desde ${mes(c.desde)}` : "") : [c.desde ? `de ${mes(c.desde)}` : null, `a ${mes(c.hasta)}`].filter(Boolean).join(" ");
  return (
    <li className="py-1">
      <span className="mr-2 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-carbon/65">{MUNDO[c.mundo]}</span>
      {c.cargo ? `${c.cargo.charAt(0).toUpperCase()}${c.cargo.slice(1)} · ` : ""}
      {donde}
      {c.area ? ` · ${c.area}` : ""}
      {cuando && <span className="text-carbon/65"> · {cuando}</span>}
      {(c.telefono || c.correos.length > 0) && (
        <span className="text-carbon/65"> · {[c.telefono, ...c.correos].filter(Boolean).join(" · ")}</span>
      )}
      {c.mundo === "administracion" && c.lleva.length > 0 && <Lleva lista={c.lleva} />}
    </li>
  );
}

// "Administrador que lleva (un maximo de 5 + ver mas) direcciones nuestras".
function Lleva({ lista }: { lista: Cargo["lleva"] }) {
  const primeras = lista.slice(0, 5);
  const resto = lista.slice(5);
  const item = (x: Cargo["lleva"][number]) => (
    <li key={x.id}>
      <Link href={`/administracion/comunidades/${x.id}`} className={ENLACE}>
        {x.nombre}
      </Link>
      {x.municipio && <span className="text-carbon/65"> · {x.municipio}</span>}
    </li>
  );
  return (
    <div className="mt-1 pl-4 text-[13px]">
      <span className="text-carbon/65">Lleva {lista.length} direcci{lista.length === 1 ? "ón nuestra" : "ones nuestras"}:</span>
      <ul className="mt-0.5 space-y-0.5">{primeras.map(item)}</ul>
      {resto.length > 0 && (
        <details className="mt-0.5">
          <summary className="cursor-pointer text-[12.5px] font-semibold text-carbon/70 hover:text-carbon">Ver {resto.length} más</summary>
          <ul className="mt-0.5 space-y-0.5">{resto.map(item)}</ul>
        </details>
      )}
    </div>
  );
}

export default async function FichaDePersona({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const yo = await quienSoy();
  if (!yo) redirect(`/entrar?volver=/consulta/personas/${id}`);
  const p = await fichaPersona(id);
  if (!p) notFound();

  // Las llaves de las secciones restringidas.
  const esElMismo = !!p.empleado && p.empleado.email?.toLowerCase() === yo.email.toLowerCase();
  const veEmpleado = yo.veTodo || puedeEntrar(yo, "rrhh", "trabajar") || esElMismo;
  const veComercial = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar") || esElMismo;

  // Piso 3: lo de cada puesto vigente, una vez por entidad.
  const vistos = new Set<string>();
  const vigentes = p.actuales.filter((c) => c.entidadId && !vistos.has(c.entidadId) && vistos.add(c.entidadId));
  const resumenes = await Promise.all(
    vigentes.map(async (c) => ({
      c,
      admin: c.mundo === "administracion" ? await resumenAdministracion(c.entidadId!).catch(() => null) : null,
      comunidad: c.mundo === "comunidad" ? await resumenComunidad(c.entidadId!).catch(() => null) : null,
      organismo: c.mundo === "organismo" ? await resumenOrganismo(c.entidadId!).catch(() => null) : null,
    })),
  );

  return (
    <Marco aqui="">
      <Salida href="/consulta?que=persona">
        ← Buscar
      </Salida>

      {/* ------------------------------ 1 · datos personales */}
      <div className="mt-3 border-b border-black/10 pb-4">
        <h1 className="text-3xl font-bold text-carbon">{[p.nombre, p.apellidos].filter(Boolean).join(" ")}</h1>
      </div>
      <Seccion titulo="Datos personales">
        <Dato k="Nombre" v={p.nombre} />
        <Dato k="Apellidos" v={p.apellidos} />
        <Dato k="Teléfono personal" v={p.telefono} />
        <Dato k="Correo personal" v={p.correos.map((c) => c.email).join(" · ")} />
        {p.notas && <Dato k="Notas" v={<span className="whitespace-pre-wrap">{p.notas}</span>} />}
      </Seccion>

      {/* ------------------------------ 2 · relacion con nosotros */}
      <Seccion titulo="Su relación con nosotros">
        {p.actuales.length === 0 ? (
          <p className="text-carbon/65">Sin ningún cargo vigente.</p>
        ) : (
          <>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-carbon/65">Actual</div>
            <ul>{p.actuales.map((c) => <LineaCargo key={c.id} c={c} actual />)}</ul>
          </>
        )}
        {p.anteriores.length > 0 && (
          <>
            <div className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-carbon/65">Anteriores</div>
            <ul>{p.anteriores.map((c) => <LineaCargo key={c.id} c={c} actual={false} />)}</ul>
          </>
        )}
      </Seccion>

      {/* ------------------------------ las secciones con llave */}
      {p.empleado && veEmpleado && (
        <Seccion titulo="Empleado de Accesalia" llave="RRHH, dirección y la propia persona">
          <Dato k="Correo de trabajo" v={p.empleado.email} />
          <Dato k="Titulación" v={p.empleado.titulacion} />
          <Dato k="Funciones" v={p.empleado.funciones.join(" · ")} />
          <Dato k="Situación" v={p.empleado.activo ? "En activo" : "De baja"} />
          {(yo.veTodo || puedeEntrar(yo, "rrhh", "trabajar")) && (
            <Link href={`/rrhh?p=${p.empleado.equipoId}`} className={ENLACE + " mt-2 inline-block"}>
              Su ficha de RRHH →
            </Link>
          )}
        </Seccion>
      )}
      {p.comercial && veComercial && (
        <Seccion titulo="Comercial" llave="dirección, supervisión comercial y la propia persona">
          <Dato k="Su cartera" v={`${p.comercial.administraciones} administraciones`} />
          <Dato k="Opps abiertas" v={String(p.comercial.oppsAbiertas)} />
          <Link href={`/comercial?c=${p.comercial.id}&ver=oportunidades`} className={ENLACE + " mt-2 inline-block"}>
            Su área comercial →
          </Link>
        </Seccion>
      )}

      {/* ------------------------------ 3 · lo de su puesto vigente */}
      {resumenes.map(({ c, admin, comunidad, organismo }) => (
        <Seccion key={c.id} titulo={`${MUNDO[c.mundo]} · ${c.entidad}`}>
          {admin && <Administracion a={admin} />}
          {comunidad && <Comunidad c={comunidad} />}
          {organismo && <Organismo o={organismo} />}
          {c.mundo === "contrata" && (
            <Link href={`/consulta/contratas/${c.entidadId}`} className={ENLACE}>
              Ver la ficha de la contrata →
            </Link>
          )}
        </Seccion>
      ))}
    </Marco>
  );
}

function Administracion({ a }: { a: ResumenAdministracion }) {
  return (
    <>
      <Dato k="Nombre legal" v={a.legal} />
      <Dato k="CIF" v={a.cif} />
      <Dato k="Teléfono" v={a.telefono} />
      <Dato k="Dirección" v={[a.direccion, a.municipio].filter(Boolean).join(", ")} />
      <Dato k="Estado" v={a.estado} />
      <Dato k="Comercial" v={a.comercial} />
      <Dato k="Último contacto" v={fecha(a.ultimoContacto)} />
      <Dato k="Lleva" v={`${a.comunidades} comunidades nuestras · ${a.oppsVivas} opps abiertas`} />
      <Link href={`/consulta/oportunidades?admin=${a.id}`} className={ENLACE + " mt-2 inline-block"}>
        Sus oportunidades →
      </Link>
    </>
  );
}
function Comunidad({ c }: { c: ResumenComunidad }) {
  return (
    <>
      <Dato k="Dirección" v={[c.direccion, c.municipio].filter(Boolean).join(", ")} />
      <Dato k="CIF" v={c.cif} />
      <Dato k="Viviendas" v={c.viviendas ? String(c.viviendas) : null} />
      <Dato k="Construida" v={c.anio ? String(c.anio) : null} />
      <Dato k="Opps abiertas" v={String(c.oppsVivas)} />
      <Link href={`/administracion/comunidades/${c.id}`} className={ENLACE + " mt-2 inline-block"}>
        Ver la ficha de la comunidad →
      </Link>
    </>
  );
}
function Organismo({ o }: { o: ResumenOrganismo }) {
  return (
    <>
      <Dato k="Tipo" v={[o.tipo, o.ambito].filter(Boolean).join(" · ")} />
      <Dato k="Dirección" v={o.direccion} />
      <Dato k="Teléfono" v={o.telefono} />
      <Dato
        k="Sede electrónica"
        v={
          o.sede ? (
            <a href={o.sede} target="_blank" rel="noreferrer" className={ENLACE}>
              {o.sede}
            </a>
          ) : null
        }
      />
      {o.notas && <Dato k="Notas" v={<span className="whitespace-pre-wrap">{o.notas}</span>} />}
    </>
  );
}
