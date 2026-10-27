// app/components/rastroPantallas.ts
//
// EL RASTRO DE PANTALLAS (Monica, 27-oct-2026): «los botones de volver no llevan a la pantalla anterior sino a la del
// menu o a otro sitio, es desconcertante». Cada pestaña del navegador recuerda por que pantallas de la app ha pasado
// (sessionStorage: es de esa pestaña y se olvida al cerrarla). «Volver» lleva a la anterior DE VERDAD.
//
// Una pantalla es una RUTA, no su consulta: cambiar de bloque o de opcion del menu dentro de la misma ficha
// (?bloque=2&ver=…) no es otra pantalla, para que volver no de vueltas dentro de la misma opp. Se guarda la direccion
// entera de la ultima vez que se estuvo en cada una, para volver justo a donde se estaba.

const CLAVE = "accesalia.rastro";
const MAX = 40;

const leer = (): string[] => {
  try {
    const x = JSON.parse(sessionStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(x) ? x.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
};
const guardar = (r: string[]) => {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(r.slice(-MAX)));
  } catch {
    // sin almacenamiento (ventana privada estricta): volver usa su destino fijo
  }
};
export const ruta = (url: string) => url.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

/** Apuntar la pantalla en la que se esta (la llama el layout en cada cambio de direccion). */
export function apuntar(url: string) {
  const r = leer();
  const aqui = ruta(url);
  if (r.length && ruta(r[r.length - 1]) === aqui) r[r.length - 1] = url; // la misma pantalla: solo cambia la consulta
  else if (r.length > 1 && ruta(r[r.length - 2]) === aqui) r.pop(); // se ha vuelto a la anterior (con volver o con el navegador)
  else r.push(url);
  guardar(r);
}

/** La pantalla anterior a esta, o null si se entro aqui directamente. */
export function anterior(): string | null {
  const r = leer();
  const aqui = ruta(window.location.pathname);
  for (let i = r.length - 1; i >= 0; i--) if (ruta(r[i]) !== aqui) return r[i];
  return null;
}

/** Al pulsar volver, lo anterior deja de estar delante: se quita la pantalla actual del rastro. */
export function alVolver() {
  const r = leer();
  const aqui = ruta(window.location.pathname);
  while (r.length && ruta(r[r.length - 1]) === aqui) r.pop();
  guardar(r);
}
