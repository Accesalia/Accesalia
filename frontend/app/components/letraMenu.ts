import { Manrope } from "next/font/google";

// La letra de los titulos de los menus, con mas caracter (Monica, 21-oct-2026).
// Se pone `letraMenu.variable` en el contenedor y las piezas la usan con
// font-[family-name:var(--letra-menu)].
export const letraMenu = Manrope({ subsets: ["latin"], weight: ["700", "800"], variable: "--letra-menu" });
