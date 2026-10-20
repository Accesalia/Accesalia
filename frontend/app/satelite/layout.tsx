import type { Metadata, Viewport } from "next";
import { Inter, Literata } from "next/font/google";

// LAS LETRAS DE SU MAQUETA (Monica, 20-oct-2026): Inter para todo y Literata
// para los numeros grandes de cada bloque ("1.", "2."). Solo en el satelite.
const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-inter" });
const literata = Literata({ subsets: ["latin"], weight: ["700"], variable: "--font-literata" });

// EL SATELITE SE INSTALA APARTE (8-oct-2026): su propia ficha de aplicacion,
// para que el icono del movil abra directamente la nota rapida y no la portada.
export const metadata: Metadata = {
  title: "Nota rápida · Accesalia",
  manifest: "/satelite.webmanifest",
  appleWebApp: { capable: true, title: "Nota rápida", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b9bab9",
};

export default function LayoutSatelite({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${literata.variable} font-[family-name:var(--font-inter)]`}>{children}</div>;
}
