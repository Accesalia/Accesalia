import type { MetadataRoute } from "next";

// La ficha de "aplicacion instalable". Con ella Chrome y Edge ofrecen
// "Instalar Accesalia": icono en el escritorio y ventana propia, sin barra del
// navegador. Entra por la portada, que pasa por el login y de ahi a lo de cada uno.
// Para cambiar el icono basta con sustituir public/icono-192.png y
// public/icono-512.png (y app/icon.png, que es el de la pestana).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Accesalia",
    short_name: "Accesalia",
    description: "Estudio de arquitectura — accesibilidad y eficiencia energetica",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2b2b2b",
    lang: "es",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
