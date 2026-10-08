import type { Metadata } from "next";
import "./globals.css";
import { quienSoy } from "../lib/sesion";
import { Postits } from "./components/postit/Postits";

export const metadata: Metadata = {
  title: "Accesalia · ERP",
  description: "Estudio de arquitectura — accesibilidad y eficiencia energetica",
  // La ficha de "aplicacion instalable" (Chrome y Edge ofrecen "Instalar
  // Accesalia"). Es un fichero fijo en public/ y no app/manifest.ts para que el
  // satelite pueda tener la suya propia (8-oct-2026). Para cambiar el icono:
  // public/icono-192.png y public/icono-512.png.
  manifest: "/manifest.webmanifest",
};

// Los postits de LLAMADA viven aqui y no en una pagina: asi siguen abiertos
// mientras se navega por la app (Monica, 8-oct-2026).
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const yo = await quienSoy().catch(() => null);
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        {children}
        {yo && <Postits veTodo={yo.veTodo} />}
      </body>
    </html>
  );
}
