import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Volver } from "../components/Volver";
import { misPendientes, posiblesDe, tarjetasQueVeo } from "../../lib/misPendientes";
import { comercialDe, puedeEntrar, quienSoy } from "../../lib/sesion";
import { deFueraSinAsignar } from "../../lib/alertasIEE";
import { solicitudesPendientes } from "../../lib/rrhh";
import { cuantosPorRevisar } from "../../lib/recibidos";
import { cuantosApuntes } from "../../lib/apuntesSatelite";
import { direccionesVistas } from "../../lib/informeCostes";
import { contarPendientes, puedeRevisar } from "../../lib/revisionOferta";
import { oppsSinAdministrador } from "../../lib/adminComunidad";

export const dynamic = "force-dynamic";

// PENDIENTES (Monica, 8-oct-2026): todo lo que tengo a medias. Se llega desde el
// boton PENDIENTES de la barra de arriba, junto a LLAMADA. Cada persona ve las
// tarjetas que le tocan.
//
// SU MAQUETA (Monica, 13-oct-2026; OneDrive/Imagenes/Screenshots/"propuesta
// pantalla pendintes con avisos urgentes.png", con sus codigos de color): seis
// marcos en dos filas de tres. Arriba: AVISOS URGENTES (su marco amarillo con
// borde rojo), lo que esta a medio crear y lo que necesita un humano. Abajo:
// nueva documentacion recibida y cosas que pueden interesarte. Cada tarjeta, su
// fondo de color; titulo, numero, flecha y borde en el mismo color mas oscuro;
// la frase de abajo en gris oscuro. Los tamaños, a la escala de la pantalla de
// antes. Avisos urgentes y Viabilidad lista son de momento solo el hueco.
// Un marco sin tarjetas para esa persona no sale.
//
// PARA AÑADIR UNA TARJETA: una entrada mas en `tarjetas`, con su marco.

type Marco = "a_medio_crear" | "humano" | "documentacion" | "interesarte";
const MARCOS: { clave: Marco; titulo: string }[] = [
  { clave: "a_medio_crear", titulo: "Lo que está a medio crear" },
  { clave: "humano", titulo: "Lo que necesita un humano" },
  { clave: "documentacion", titulo: "Nueva documentación recibida" },
  { clave: "interesarte", titulo: "Cosas que pueden interesarte" },
];

/** Sus colores: el fondo y el tono oscuro (titulo, numero, flecha y borde). */
type Color = { fondo: string; tono: string };
const C = {
  ambar: { fondo: "#F2ECD9", tono: "#8A6B05" },
  verde: { fondo: "#E5F3DC", tono: "#2D6609" },
  rojo: { fondo: "#F3E3E1", tono: "#923428" },
  turquesa: { fondo: "#E2EFEF", tono: "#044E4E" },
  frambuesa: { fondo: "#F2E3EC", tono: "#850F56" },
  naranja: { fondo: "#F8E5D3", tono: "#8C4804" },
  morado: { fondo: "#E9E6F2", tono: "#2F1385" },
  // Las que su maqueta no colorea: del mismo estilo.
  azul: { fondo: "#E3ECF5", tono: "#1F4E79" },
  ciruela: { fondo: "#EEE5F3", tono: "#5B2A86" },
  arena: { fondo: "#F1ECE0", tono: "#6B5214" },
  pizarra: { fondo: "#E6EBEE", tono: "#2E4756" },
  oliva: { fondo: "#EEF0DE", tono: "#5A6410" },
} satisfies Record<string, Color>;

type Tarjeta = {
  clave: string;
  marco: Marco;
  titulo: string;
  pie: string;
  /** null = hueco: aun no tiene contenido. */
  numero: number | null;
  href: string | null;
  color: Color;
  /** La flechita delante del numero de su maqueta (las que necesitan un humano). */
  flechita?: boolean;
};

const GRIS = "#4a4a48";

function TarjetaPendiente({ t }: { t: Tarjeta }) {
  const nada = t.numero === 0;
  const cuerpo = (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold uppercase leading-snug tracking-[0.06em]" style={{ color: t.color.tono }}>
          {t.titulo}
        </span>
        <span className="mt-2 block text-[11.5px] font-semibold leading-snug" style={{ color: GRIS }}>
          {t.pie}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[28px] font-bold leading-none tabular-nums" style={{ color: t.color.tono, opacity: nada ? 0.45 : 1 }}>
          {t.flechita && <span className="text-[18px] font-normal">⟶</span>}
          {t.numero === null ? "—" : t.numero}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[18px] font-bold shadow-sm transition group-hover:shadow"
          style={{ color: t.color.tono, opacity: t.href ? 1 : 0.4 }}
        >
          →
        </span>
      </div>
    </div>
  );
  const forma = { background: t.color.fondo, borderColor: t.color.tono };
  return t.href ? (
    <Link href={t.href} style={forma} className="group block rounded-[10px] border-[0.5px] px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-md">
      {cuerpo}
    </Link>
  ) : (
    <div style={forma} className="rounded-[10px] border-[0.5px] px-4 py-3.5" title="Aún sin contenido: está por montar">
      {cuerpo}
    </div>
  );
}

/** AVISOS URGENTES: su propio marco. De momento, el hueco. */
function AvisosUrgentes() {
  return (
    <section
      className="flex flex-col items-center justify-center rounded-[14px] border-2 px-6 py-8 text-center"
      style={{ background: "#FAFAE3", borderColor: "#891010" }}
      title="Aún sin contenido: está por montar"
    >
      <h2 className="text-[22px] font-extrabold uppercase tracking-[0.04em]" style={{ color: "#901616" }}>
        Avisos urgentes
      </h2>
      <span className="mt-2 text-[28px] font-bold leading-none" style={{ color: "#923428" }}>
        —
      </span>
      <p className="mt-5 text-[15px] font-extrabold leading-snug" style={{ color: "#891414" }}>
        Cosas pasadas de fecha, alertas y avisos importantes.
      </p>
      <span
        className="mt-3 flex h-8 w-8 items-center justify-center rounded-full border-[0.5px] bg-white text-[18px] font-bold"
        style={{ color: "#923428", borderColor: "#923428" }}
      >
        →
      </span>
      <p className="mt-3 text-[15px] font-extrabold leading-snug" style={{ color: "#9A9A9A" }}>
        Si solo puedes mirar una cosa, que sea esto
      </p>
    </section>
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
  // Lo del comercial: avisos, apuntes del satelite, viabilidades, direcciones con informe, posibles.
  const comercial = puedeEntrar(yo, "comercial", "trabajar");
  // LAS OFERTAS ESPERANDO EL OK (Monica, 14-oct-2026): a quien tiene la funcion
  // de revisarlas. Se envian en caliente: no pueden esperar.
  const revisa = puedeRevisar(yo);
  const [{ notas, opps, llamadas }, radar, ausencias, recibidos, posibles, apuntes, vistas, ofertas] = await Promise.all([
    misPendientes(yo),
    veRadar ? deFueraSinAsignar().catch(() => null) : Promise.resolve(null),
    resuelveRrhh ? solicitudesPendientes().catch(() => null) : Promise.resolve(null),
    cuantosPorRevisar(yo),
    comercial ? posiblesDe(yo).catch(() => null) : Promise.resolve(null),
    comercial ? cuantosApuntes(yo).catch(() => null) : Promise.resolve(null),
    comercial ? direccionesVistas().catch(() => null) : Promise.resolve(null),
    revisa ? contarPendientes().catch(() => null) : Promise.resolve(null),
  ]);
  // OPPS SIN ADMINISTRADOR (Monica, 18-oct-2026): las abiertas de 2025-26 cuya
  // comunidad no tiene administrador. Las suyas; direccion, todas.
  const sinAdmin = comercial
    ? await (yo.veTodo ? Promise.resolve(null) : comercialDe(yo.id))
        .then((m) => oppsSinAdministrador(m?.id ?? null, yo.veTodo))
        .then((l) => l.length)
        .catch(() => null)
    : null;
  const ausenciasAjenas = ausencias ? ausencias.filter((a) => a.personaId !== yo.id).length : null;
  // Las direcciones con informe: las tuyas; direccion y supervision, todas (como su lista).
  const todasVistas = yo.veTodo || puedeEntrar(yo, "comercial", "supervisar");
  const misVistas = vistas ? vistas.filter((f) => todasVistas || f.creado_por === yo.id).length : null;

  const tarjetas: Tarjeta[] = [
    // ---------------------------------------------- lo que esta a medio crear
    ...(comercial
      ? [
          {
            clave: "satelite_opps", marco: "a_medio_crear" as const, titulo: "Opps nuevas que has lanzado desde el satélite",
            pie: "No están creadas, solo apuntadas: les faltan datos para poder darlas de alta.",
            numero: apuntes?.oportunidad ?? null, href: "/pendientes/satelite?tipo=oportunidad", color: C.ambar,
          },
          {
            clave: "satelite_admins", marco: "a_medio_crear" as const, titulo: "Administradores nuevos creados desde el satélite",
            pie: "Me pasaste el dato, todo anotado, pero para crearlos hay que completar algunas cosas.",
            numero: apuntes?.administrador ?? null, href: "/pendientes/satelite?tipo=administrador", color: C.verde,
          },
        ]
      : []),
    {
      clave: "opps", marco: "a_medio_crear", titulo: "Opps a medio montar",
      pie: "Falta mirar el Catastro, la persona de contacto o algo más: hay que completarlas.",
      numero: opps.length, href: "/pendientes/oportunidades", color: C.azul,
    },
    ...(comercial
      ? [{
          clave: "sin_admin", marco: "a_medio_crear" as const, titulo: "Opps sin administrador",
          pie: "Abiertas de 2025-26 cuya comunidad no tiene administrador: ponle el suyo.",
          numero: sinAdmin, href: "/pendientes/sin-administrador", color: C.oliva,
        }]
      : []),
    // -------------------------------------------- lo que necesita un humano
    {
      clave: "notas", marco: "humano", titulo: "Notas del diario que no he sabido colocar",
      pie: "Me las pasaste desde la app o el satélite, pero no he sabido localizar en qué dirección o persona colgarlas.",
      numero: notas.length, href: "/comercial/pendientes", color: C.rojo, flechita: true,
    },
    ...(veo.llamadas
      ? [{
          clave: "llamadas", marco: "humano" as const, titulo: "Llamadas que me pasaste y no sé dónde poner",
          pie: "Con las notas que incluiste no tengo pistas para saber de qué o de quién eran: necesito ayuda humana.",
          numero: llamadas.length, href: "/pendientes/llamadas", color: C.turquesa, flechita: true,
        }]
      : []),
    ...(revisa
      ? [{
          clave: "ofertas", marco: "humano" as const, titulo: "Ofertas esperando tu ok",
          pie: "El comercial no puede mandarlas a la comunidad hasta que les des el ok o se las devuelvas con cambios.",
          numero: ofertas, href: "/comercial/revision", color: C.rojo, flechita: true,
        }]
      : []),
    ...(resuelveRrhh
      ? [{
          clave: "ausencias", marco: "humano" as const, titulo: "Vacaciones y permisos",
          pie: "Solicitudes por aprobar o rechazar.",
          numero: ausenciasAjenas, href: "/rrhh#por-resolver", color: C.ciruela,
        }]
      : []),
    // ----------------------------------------- nueva documentacion recibida
    // LO QUE SUBEN LAS COMUNIDADES desde su pagina (12-oct-2026): sale a quien
    // tiene algo que revisar, y siempre a quien lo revisa todo.
    ...(recibidos > 0 || veo.supervisa
      ? [{
          clave: "recibidos", marco: "documentacion" as const, titulo: "Hojas de encargo recibidas firmadas",
          pie: "Han llegado vía portal y necesitan revisión para darles el ok.",
          numero: recibidos, href: "/comercial/recibidos", color: C.frambuesa,
        }]
      : []),
    ...(comercial
      ? [{
          clave: "viabilidades", marco: "documentacion" as const, titulo: "Viabilidad lista",
          pie: "Viabilidades ya preparadas, listas para tu revisión y enviar a la comunidad.",
          numero: null, href: null, color: C.naranja,
        }]
      : []),
    // ------------------------------------------ cosas que pueden interesarte
    ...(comercial
      ? [
          {
            clave: "direcciones", marco: "interesarte" as const, titulo: "Direcciones para las que has generado informes",
            pie: "No han generado opp, pero alguien las pidió: te las guardo aquí por si quieres seguirles la pista.",
            numero: misVistas, href: "/comercial/direcciones-vistas", color: C.morado,
          },
          {
            clave: "posibles", marco: "interesarte" as const, titulo: "Administradores sin consolidar",
            pie: "Posibles, no de tu cartera: insísteles hasta su primera hoja firmada.",
            numero: posibles ? posibles.length : null, href: "/pendientes/administradores", color: C.arena,
          },
        ]
      : []),
    ...(veRadar
      ? [{
          clave: "radar", marco: "interesarte" as const, titulo: "Radar de IEE",
          pie: "Edificios de fuera con IEE nueva: asignar a un comercial o descartar.",
          numero: radar, href: "/comercial/alertas-iee", color: C.pizarra,
        }]
      : []),
  ];

  const marcos = MARCOS.map((m) => ({ ...m, tarjetas: tarjetas.filter((t) => t.marco === m.clave) })).filter((m) => m.tarjetas.length);

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1300px] px-6 pb-20 pt-5 text-sm">
        <Volver siNoHay="/menu" />
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Pendientes</h1>
        <p className="mt-1 text-[13px] text-carbon/70">Lo que tienes por hacer. Cada tarjeta lleva a su lista.</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {comercial && <AvisosUrgentes />}
          {marcos.map((m) => (
            <section key={m.clave} className="rounded-[14px] border-[0.5px] border-black bg-white px-4 pb-4 pt-5">
              <h2 className="text-center text-[15px] font-extrabold uppercase tracking-[0.04em] text-black">{m.titulo}</h2>
              <div className="mt-4 flex flex-col gap-3">
                {m.tarjetas.map((t) => (
                  <TarjetaPendiente key={t.clave} t={t} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
