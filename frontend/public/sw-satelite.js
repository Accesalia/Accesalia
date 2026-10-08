// EL TRABAJADOR DEL SATELITE (Monica, 8-oct-2026): lo que hace que la nota
// rapida se abra SIN COBERTURA. Guarda una copia de la pagina y de sus piezas
// la primera vez que se abre con red, y la sirve cuando no la hay. Las notas no
// pasan por aqui: esperan en el movil (IndexedDB) y las envia la propia pagina.
//
// Al cambiar algo de fondo de este fichero, subir la version: el movil tira la
// copia vieja y guarda la nueva.

const CACHE = "satelite-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/satelite").catch(() => {})));
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

  // La pagina: primero la red (que este al dia); sin red, la copia.
  if (req.mode === "navigate" && url.pathname.startsWith("/satelite")) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          // Una redireccion al login no es la pagina: no se guarda.
          if (r.ok && !r.redirected) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put("/satelite", copia));
          }
          return r;
        })
        .catch(() => caches.match("/satelite")),
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
