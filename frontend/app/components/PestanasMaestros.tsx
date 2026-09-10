import Link from "next/link";

// Pestañas de los maestros de Administración, pegadas a la barra negra: la
// activa "sale" al fondo claro de la página, como una carpeta.
//
// Las hice primero claras sobre el fondo y Monica lo corto en seco: "la pestaña
// en negro era mil veces mejor". Tenia razon: colgando de la barra se entiende
// que son secciones de un mismo sitio; sueltas en el fondo parecian filtros.
//
// Los nombres siguen el glosario: "administracion de fincas" es la EMPRESA y
// "administrador" la persona. Y "administracion" a secas no se usa nunca,
// porque tambien es el ayuntamiento.
const PESTANAS = [
  { clave: "administraciones", texto: "Administraciones de fincas", href: "/administraciones" },
  { clave: "contratas", texto: "Contratas", href: "/contratas" },
  { clave: "organismos", texto: "Organismos", href: "/organismos" },
  { clave: "comunidades", texto: "Comunidades", href: "/comunidades" },
  { clave: "equipo", texto: "Equipo", href: "/equipo" },
] as const;

export type ClavePestana = (typeof PESTANAS)[number]["clave"];

export function PestanasMaestros({ activa }: { activa: ClavePestana }) {
  return (
    <div className="bg-carbon">
      <nav className="mx-auto flex max-w-[1200px] flex-wrap gap-0.5 px-6">
        {PESTANAS.map((p) => {
          const aqui = p.clave === activa;
          return (
            <Link
              key={p.clave}
              href={p.href}
              aria-current={aqui ? "page" : undefined}
              className={
                "rounded-t-lg px-4 py-2 text-base transition " +
                (aqui
                  ? "bg-hueso font-semibold text-carbon"
                  : "font-medium text-white/70 hover:bg-white/10 hover:text-white/90")
              }
            >
              {p.texto}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
