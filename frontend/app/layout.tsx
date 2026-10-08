import type { Metadata } from "next";
import "./globals.css";
import { quienSoy } from "../lib/sesion";
import { Postits } from "./components/postit/Postits";

export const metadata: Metadata = {
  title: "Accesalia · ERP",
  description: "Estudio de arquitectura — accesibilidad y eficiencia energetica",
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
