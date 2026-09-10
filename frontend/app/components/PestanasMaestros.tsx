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
// El estado va aqui tambien, no solo en el menu: cinco pestañas iguales hacen
// pensar que las cinco funcionan igual, y no es verdad. Monica: "contratas no
// esta? y comunidades y equipo estan activos en cambio?".
//
//   al_dia    -> repasada con ella
//   sin_ver   -> existe y funciona, pero sin repasar
//   por_hacer -> todavia no hay pantalla; se entra y se ve que datos hay detras
const PESTANAS = [
  { clave: "administraciones", texto: "Administraciones de fincas", href: "/administraciones", estado: "al_dia" },
  { clave: "contratas", texto: "Contratas", href: "/contratas", estado: "por_hacer" },
  { clave: "organismos", texto: "Organismos", href: "/organismos", estado: "por_hacer" },
  { clave: "comunidades", texto: "Comunidades", href: "/comunidades", estado: "sin_ver" },
  { clave: "equipo", texto: "Equipo", href: "/equipo", estado: "sin_ver" },
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
                "flex items-center gap-2 rounded-t-lg px-4 py-2 text-base transition " +
                (aqui
                  ? "bg-hueso font-semibold text-carbon"
                  : p.estado === "por_hacer"
                    ? "font-medium text-white/40 hover:bg-white/10 hover:text-white/70"
                    : "font-medium text-white/70 hover:bg-white/10 hover:text-white/90")
              }
            >
              {p.texto}
              {/* Un punto y ya: dice que ahi todavia no hay pantalla, sin
                  gritarlo ni convertir la barra en un semaforo. */}
              {p.estado === "por_hacer" && (
                <span
                  title="Todavía sin pantalla"
                  className={"h-1.5 w-1.5 rounded-full " + (aqui ? "bg-amber-500" : "bg-white/35")}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
