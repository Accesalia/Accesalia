import type { Metadata, Viewport } from "next";

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
  themeColor: "#fcf8e7",
};

export default function LayoutSatelite({ children }: { children: React.ReactNode }) {
  return children;
}
