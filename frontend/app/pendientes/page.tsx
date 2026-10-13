import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Volver } from "../components/Volver";
import { misPendientes, posiblesDe, tarjetasQueVeo } from "../../lib/misPendientes";
import { puedeEntrar, quienSoy } from "../../lib/sesion";
import { deFueraSinAsignar } from "../../lib/alertasIEE";
import { solicitudesPendientes } from "../../lib/rrhh";
import { cuantosPorRevisar } from "../../lib/recibidos";
import { cuantosApuntes } from "../../lib/apuntesSatelite";
import { direccionesVistas } from "../../lib/informeCostes";

export const dynamic = "force-dynamic";

// PENDIENTES (Monica, 8-oct-2026): todo lo que tengo a medias. Se llega desde el
// boton PENDIENTES de la barra de arriba, junto a LLAMADA.
//
// UNA PIZARRA DE AVISOS, PARA TODO EL MUNDO (Monica, 10-oct-2026): una tarjeta
// por tipo, con su numero, y cada una lleva a su sitio. Cada persona ve las que
// le tocan.
//
// TARJETAS APILADAS, ALARGADAS Y CENTRADAS, CADA UNA CON SU COLOR (Monica,
// 13-oct-2026; referencia: NotebookLM): "el comercial no tiene que pensar, solo
// leer lo que es cada una y con instrucciones de que hacer con ella". Sus
// medidas: 1273 de ancho, 222 de alto, esquina de 20, titulo 24, explicacion
// 20, numero 64. Los cinco primeros colores y textos son suyos; el resto
// conserva su contenido con el mismo formato.
//
// PARA AÑADIR UNA TARJETA: una entrada mas en `tarjetas`. Nada mas.

type Tarjeta = { clave: string; titulo: string; sub: string; numero: number | null; href: string; color: string };

function TarjetaPendiente({ t }: { t: Tarjeta }) {
  const nada = t.numero === 0;
  return (
    <Link
      href={t.href}
      style={{ background: t.color }}
      className="group flex min-h-[222px] items-center gap-8 rounded-[20px] px-[40px] py-7 transition hover:brightness-95"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-[24px] font-bold uppercase leading-[1.35] tracking-[1.32px] text-black">{t.titulo}</h2>
        <p className="mt-2 text-[20px] font-bold leading-[1.35] tracking-[1.32px] text-black">{t.sub}</p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-2">
        <span className={"text-[64px] font-bold leading-[1.35] tracking-[1.32px] tabular-nums " + (nada ? "text-black/40" : "text-black")}>
          {t.numero === null ? "—" : t.numero}
        </span>
        <span className="rounded-full bg-white px-5 py-1.5 text-[20px] font-bold leading-[1.35] tracking-[1.32px] text-black shadow-sm transition group-hover:shadow">
          Revisar
        </span>
      </div>
    </Link>
  );
}

export default async function Pendientes() {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes");
  const veo = tarjetasQueVeo(yo);
  // El radar lo ve quien entra al radar: quien supervisa el area comercial, y
  // direccion. Cuenta lo mismo que el aviso diario: las de fuera sin asignar.
  const veRadar = puedeEntrar(yo, "comercial", "supervisar");
  // LAS VACACIONES (Monica, 10-oct-2026): las resuelve quien gestiona RRHH
  // -Alexandra- y direccion. Lo propio no cuenta: nadie se aprueba a si mismo.
  const resuelveRrhh = puedeEntrar(yo, "rrhh", "trabajar");
  // Lo del comercial: posibles, apuntes del satelite, direcciones con informe.
  const comercial = puedeEntrar(yo, "comercial", "trabajar");
  const [{ notas, opps, llamadas }, radar, ausencias, recibidos, posibles, apuntes, vistas] = await Promise.all([
    misPendientes(yo),
    veRadar ? deFueraSinAsignar().catch(() => null) : Promise.resolve(null),
    resuelveRrhh ? solicitudesPendientes().catch(() => null) : Promise.resolve(null),
    cuantosPorRevisar(yo),
    comercial ? posiblesDe(yo).catch(() => null) : Promise.resolve(null),
    comercial ? cuantosApuntes(yo).catch(() => null) : Promise.resolve(null),
    comercial ? direccionesVistas().catch(() => null) : Promise.resolve(null),
  ]);
  const ausenciasAjenas = ausencias ? ausencias.filter((a) => a.personaId !== yo.id).length : null;
  // Las direcciones con informe: las tuyas; direccion y supervision, todas (como su lista).
  const todasVistas = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const misVistas = vistas ? vistas.filter((f) => todasVistas || f.creado_por === yo.id).length : null;

  const tarjetas: Tarjeta[] = [
    {
      clave: "notas",
      titulo: "Notas del diario que no he sabido colocar",
      sub: "Me las pasaste desde la app o el satélite, pero no he sabido localizar en qué dirección o persona colgarlas.",
      numero: notas.length,
      href: "/comercial/pendientes",
      color: "rgba(206, 103, 103, 0.5)",
    },
    ...(comercial
      ? [
          {
            clave: "satelite_opps",
            titulo: "Opps nuevas que has lanzado desde el satélite",
            sub: "No están creadas, solo apuntadas: les faltan datos para poder darlas de alta.",
            numero: apuntes?.oportunidad ?? null,
            href: "/pendientes/satelite?tipo=oportunidad",
            color: "rgba(120, 182, 184, 0.5)",
          },
          {
            clave: "satelite_admins",
            titulo: "Administradores nuevos creados desde el satélite",
            sub: "Me pasaste el dato, todo anotado, pero para crearlos hay que completar algunas cosas.",
            numero: apuntes?.administrador ?? null,
            href: "/pendientes/satelite?tipo=administrador",
            color: "rgba(124, 109, 178, 0.5)",
          },
        ]
      : []),
    ...(veo.llamadas
      ? [
          {
            clave: "llamadas",
            titulo: "Llamadas que me pasaste y no sé dónde poner",
            sub: "Con las notas que incluiste no tengo pistas para saber de qué o de quién eran: necesito ayuda humana.",
            numero: llamadas.length,
            href: "/pendientes/llamadas",
            color: "rgba(199, 163, 54, 0.5)",
          },
        ]
      : []),
    ...(comercial
      ? [
          {
            clave: "direcciones",
            titulo: "Direcciones para las que has generado informes",
            sub: "No han generado opp, pero alguien las pidió: las guardamos aquí por si quieres seguirles la pista.",
            numero: misVistas,
            href: "/comercial/direcciones-vistas",
            color: "rgba(125, 215, 61, 0.5)",
          },
        ]
      : []),
    // Las de antes, con su contenido de siempre en el formato nuevo.
    {
      clave: "opps",
      titulo: "Oportunidades a medias",
      sub: "Les falta dirección, contacto o siguiente paso: sin eso no se puede generar viabilidad ni hoja.",
      numero: opps.length,
      href: "/pendientes/oportunidades",
      color: "rgba(214, 140, 72, 0.5)",
    },
    ...(comercial
      ? [
          {
            clave: "posibles",
            titulo: "Administradores sin consolidar",
            sub: "Los has traído tú, pero aún no son de tu cartera: insísteles hasta su primera hoja firmada.",
            numero: posibles ? posibles.length : null,
            href: "/pendientes/administradores",
            color: "rgba(206, 120, 170, 0.5)",
          },
        ]
      : []),
    // LO QUE SUBEN LAS COMUNIDADES desde su pagina (12-oct-2026): sale a quien
    // tiene algo que revisar, y siempre a quien lo revisa todo.
    ...(recibidos > 0 || veo.supervisa
      ? [
          {
            clave: "recibidos",
            titulo: "Documentos que han subido las comunidades",
            sub: "Lo que suben desde su página: revísalo. La hoja firmada crea sus cobros.",
            numero: recibidos,
            href: "/comercial/recibidos",
            color: "rgba(92, 142, 210, 0.5)",
          },
        ]
      : []),
    ...(veRadar
      ? [
          {
            clave: "radar",
            titulo: "Radar de IEE",
            sub: "Edificios de fuera con IEE nueva: asígnalos a un comercial o descártalos.",
            numero: radar,
            href: "/comercial/alertas-iee",
            color: "rgba(160, 150, 130, 0.5)",
          },
        ]
      : []),
    ...(resuelveRrhh
      ? [
          {
            clave: "ausencias",
            titulo: "Vacaciones y permisos",
            sub: "Solicitudes del equipo por aprobar o rechazar.",
            numero: ausenciasAjenas,
            href: "/rrhh#por-resolver",
            color: "rgba(98, 176, 150, 0.5)",
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1321px] px-6 pb-20 pt-5 text-sm">
        <Volver siNoHay="/menu" />
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Pendientes</h1>
        <p className="mt-1 text-[13px] text-carbon/70">Lo que tienes por hacer. Cada tarjeta lleva a su lista.</p>

        <div className="mx-auto mt-6 flex max-w-[1273px] flex-col gap-5">
          {tarjetas.map((t) => (
            <TarjetaPendiente key={t.clave} t={t} />
          ))}
        </div>
      </main>
    </div>
  );
}
