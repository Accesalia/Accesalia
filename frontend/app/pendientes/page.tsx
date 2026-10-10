import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraSuperior } from "../components/BarraSuperior";
import { Volver } from "../components/Volver";
import { misPendientes, tarjetasQueVeo } from "../../lib/misPendientes";
import { puedeEntrar, quienSoy } from "../../lib/sesion";
import { deFueraSinAsignar } from "../../lib/alertasIEE";

export const dynamic = "force-dynamic";

// PENDIENTES (Monica, 8-oct-2026): todo lo que tengo a medias. Se llega desde el
// boton PENDIENTES de la barra de arriba, junto a LLAMADA.
//
// UNA PIZARRA DE AVISOS, PARA TODO EL MUNDO (Monica, 10-oct-2026): "que cada
// cosa diferente sea un acceso a algo: notas pendientes - 4 - ver, opps a medias
// - 17 - ver, llamadas por resolver - 12 - ver... ahora son tres tipos de cosas,
// pero seran mas a medida que avancemos". Una tarjeta por tipo, con su numero, y
// cada una lleva a su sitio. Cada persona ve las que le tocan.
//
// PARA AÑADIR UNA TARJETA: una entrada mas en `tarjetas`, con su numero y su
// enlace. Nada mas.

type Tarjeta = { clave: string; titulo: string; numero: number | null; pie: string; href: string; ver: string };

function TarjetaPendiente({ t }: { t: Tarjeta }) {
  const nada = t.numero === 0;
  return (
    <Link
      href={t.href}
      className={
        "flex flex-col rounded-2xl border bg-white px-5 py-4 transition hover:border-lima hover:bg-lima-soft/40 " +
        (nada ? "border-black/10" : "border-black/15 shadow-sm")
      }
    >
      <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-carbon/70">{t.titulo}</span>
      <span className={"mt-1 text-[34px] font-bold leading-none tabular-nums " + (nada ? "text-carbon/45" : "text-carbon")}>
        {t.numero === null ? "—" : t.numero}
      </span>
      <span className="mt-2 text-[12px] leading-snug text-carbon/65">{nada ? "Nada pendiente." : t.pie}</span>
      <span className="mt-3 text-[13px] font-semibold text-lima-dark">{t.ver} →</span>
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
  const [{ notas, opps, llamadas }, radar] = await Promise.all([
    misPendientes(yo),
    veRadar ? deFueraSinAsignar().catch(() => null) : Promise.resolve(null),
  ]);

  const tarjetas: Tarjeta[] = [
    ...(veRadar
      ? [{ clave: "radar", titulo: "Radar de IEE", numero: radar, pie: "Edificios de fuera con IEE nueva: asignar a un comercial o descartar.", href: "/comercial/alertas-iee", ver: "Ir al radar" }]
      : []),
    { clave: "notas", titulo: "Notas por colocar", numero: notas.length, pie: "La dirección que se escribió no estaba en la lista.", href: "/comercial/pendientes", ver: "Colocarlas" },
    {
      clave: "opps",
      titulo: "Oportunidades a medias",
      numero: opps.length,
      pie: "Sin dirección, contacto o siguiente paso no se puede generar viabilidad ni hoja.",
      href: "/pendientes/oportunidades",
      ver: "Ver",
    },
    ...(veo.llamadas
      ? [{ clave: "llamadas", titulo: "Llamadas por colocar", numero: llamadas.length, pie: "Cuando lo que se derivaba de ella esté gestionado, márcala como hecha.", href: "/pendientes/llamadas", ver: "Ver" }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Volver siNoHay="/menu" />
        <h1 className="mt-3 text-[25px] font-bold leading-tight text-carbon">Pendientes</h1>
        <p className="mt-1 text-[13px] text-carbon/70">Lo que tienes por hacer. Cada tarjeta lleva a su lista.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tarjetas.map((t) => (
            <TarjetaPendiente key={t.clave} t={t} />
          ))}
        </div>
      </main>
    </div>
  );
}
