// EL ENLACE WEB A LO ANTIGUO DE DROPBOX (Monica, 19-oct-2026).
//
// La base guarda la ruta desde "Ascensores y rehabilitaciones"
// (MADRID/1APROVINCIA/LEGANES/santateresa8). El principio va AQUI, en un solo
// sitio: si la carpeta raiz cambia de nombre, se cambia esta linea y no 1.400
// filas. Se abre en dropbox.com con la sesion de quien pincha.

const RAIZ = "D SM/Ascensores y rehabilitaciones";

const tramos = (ruta: string) =>
  `${RAIZ}/${ruta}`
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

/** La carpeta, abierta en Dropbox. */
export function enlaceCarpeta(ruta: string): string {
  return `https://www.dropbox.com/home/${tramos(ruta)}`;
}

/** Un fichero: su carpeta con el fichero abierto en la vista previa. */
export function enlaceFichero(ruta: string): string {
  const i = ruta.lastIndexOf("/");
  return `https://www.dropbox.com/home/${tramos(ruta.slice(0, i))}?preview=${encodeURIComponent(ruta.slice(i + 1))}`;
}

/** La misma ruta, para la API de la app (28-oct-2026). Con DROPBOX_RAIZ (el
 *  espacio del equipo) se parte de la raiz del equipo, donde esta «D SM»; sin el,
 *  de la carpeta de Daniel, que ya es «D SM». */
export function rutaParaLaApi(ruta: string): string {
  const desde = process.env.DROPBOX_RAIZ ? RAIZ : RAIZ.replace(/^D SM\//, "");
  return "/" + `${desde}/${ruta}`.split("/").filter(Boolean).join("/");
}

/** El enlace de la ficha: pasa por la app, que pide a Dropbox uno solo para el
 *  equipo (ver app/api/dropbox/enlace). */
export function enlaceDeLaApp(ruta: string, fichero = false): string {
  return `/api/dropbox/enlace?${new URLSearchParams({ ruta, ...(fichero ? { fichero: "1" } : {}) })}`;
}
