// EL TRABAJADOR DEL SATELITE (Monica, 8-oct-2026): lo que hace que la nota
// rapida se abra SIN COBERTURA. Guarda una copia de la pagina y de sus piezas
// la primera vez que se abre con red, y la sirve cuando no la hay. Las notas no
// pasan por aqui: esperan en el movil (IndexedDB) y las envia la propia pagina.
//
// Al cambiar algo de fondo de este fichero, subir la version: el movil tira la
// copia vieja y guarda la nueva.

const CACHE = "satelite-v2";

// Guardar la pagina solo si ES la pagina: una redireccion al login no lo es
// (antes, al instalar sin sesion, se guardaba el login con el nombre de la nota).
const guardarPagina = (r) => {
  if (r.ok && !r.redirected) {
    const copia = r.clone();
    caches.open(CACHE).then((c) => c.put("/satelite", copia));
  }
  return r;
};

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(fetch("/satelite").then(guardarPagina).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("satelite-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Lo que habla con el servidor no se guarda nunca: tiene que ser de verdad.
  if (url.pathname.startsWith("/api/")) return;

  // LA PAGINA: PRIMERO LA COPIA (Monica, 12-oct-2026: "lo que le cuesta es
  // arrancar, 5-6 segundos"). Antes se esperaba al servidor -despertarlo, mirar
  // dos veces quien entra- para enseñar una pagina que ya estaba en el movil.
  // Ahora sale la copia al momento y por detras se trae la nueva para la
  // proxima vez. La sesion la comprueba el envio: si no hay, la nota se queda
  // en el movil y la pagina avisa "tienes que volver a entrar".
  // Sin copia (la primera vez), la red, como siempre.
  if (req.mode === "navigate" && url.pathname.startsWith("/satelite")) {
    const nueva = fetch(req).then(guardarPagina);
    e.respondWith(
      caches.match("/satelite").then((hay) => {
        if (hay) {
          e.waitUntil(nueva.catch(() => {}));
          return hay;
        }
        return nueva;
      }),
    );
    return;
  }

  // Sus piezas (codigo, estilos, iconos): no cambian sin cambiar de nombre,
  // asi que la copia vale siempre.
  if (url.pathname.startsWith("/_next/static/") || /\.(png|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hay) =>
          hay ||
          fetch(req).then((r) => {
            if (r.ok) {
              const copia = r.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return r;
          }),
      ),
    );
  }
});
