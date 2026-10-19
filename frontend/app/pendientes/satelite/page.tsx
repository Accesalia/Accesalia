import { redirect } from "next/navigation";
import { BarraSuperior } from "../../components/BarraSuperior";
import { Salida } from "../../components/Salida";
import { puedeEntrar, quienSoy } from "../../../lib/sesion";
import { misApuntes, type TipoApunte } from "../../../lib/apuntesSatelite";
import { ListaApuntes } from "./ListaApuntes";

export const dynamic = "force-dynamic";

// LO QUE SE APUNTO EN EL SATELITE Y AUN NO ESTA CREADO (Monica, 13-oct-2026). A
// esta lista llevan tres tarjetas de Pendientes: las opps, los administradores
// y los demas contactos (19-oct-2026) nuevos lanzados desde el movil. Se completan y se dan de alta, o se descartan.

const TEXTO: Record<TipoApunte, { titulo: string; sub: string; color: string }> = {
  oportunidad: {
    titulo: "Opps nuevas que has lanzado desde el satélite",
    sub: "No están creadas, solo apuntadas: les faltan datos para poder darlas de alta.",
    color: "rgba(120, 182, 184, 0.22)",
  },
  administrador: {
    titulo: "Administradores nuevos creados desde el satélite",
    sub: "Me pasaste el dato, todo anotado, pero para crearlos hay que completar algunas cosas.",
    color: "rgba(124, 109, 178, 0.22)",
  },
  contacto: {
    titulo: "Contactos nuevos que has apuntado desde el satélite",
    sub: "Vecinos, contratistas y otros. Están apuntados con su nota: colócalos donde toque y márcalos como hechos.",
    color: "rgba(124, 109, 178, 0.22)",
  },
};

export default async function ApuntesSatelite({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const yo = await quienSoy();
  if (!yo) redirect("/entrar?volver=/pendientes/satelite");
  if (!puedeEntrar(yo, "comercial", "trabajar")) redirect("/pendientes");
  const { tipo: t } = await searchParams;
  const tipo: TipoApunte = t === "administrador" || t === "contacto" ? t : "oportunidad";
  const apuntes = await misApuntes(yo, tipo);
  const x = TEXTO[tipo];

  return (
    <div className="min-h-screen">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-5 text-sm">
        <Salida href="/pendientes">← Pendientes</Salida>
        <div className="mt-3 rounded-[18px] px-6 py-4" style={{ background: x.color }}>
          <h1 className="text-[20px] font-bold leading-snug text-carbon">{x.titulo}</h1>
          <p className="mt-0.5 text-[13.5px] leading-snug text-carbon/70">{x.sub}</p>
        </div>
        <ListaApuntes apuntes={apuntes} tipo={tipo} />
      </main>
    </div>
  );
}
