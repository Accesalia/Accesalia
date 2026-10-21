// LOS ICONOS DE LOS MENUS (Monica, 21-oct-2026): trazos finos de 24x24, los
// mismos en el menu principal y en los submenus. Un icono nuevo = una linea.

/** Los iconos, trazos de 24x24. */
export const ICONOS = {
  comercial: <><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>,
  administracion: <><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></>,
  euro: <><path d="M17 6a7 7 0 1 0 0 12" /><path d="M4 10h9M4 14h9" /></>,
  hoja: <><path d="M12 3c5 0 8 3 8 8-5 0-8-3-8-8z" /><path d="M12 21v-10" /><path d="M12 14c-4 0-7-2-7-6 4 0 7 2 7 6" /></>,
  grafica: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  lupa: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
  libro: <><path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" /><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" /></>,
  persona: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  casco: <><path d="M3 17h18" /><path d="M5 17a7 7 0 0 1 14 0" /><path d="M12 6v4" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
  radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 12l6-6" /></>,
  escaner: <><path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3" /><path d="M7 12h10" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  nube: <path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8z" />,
  plantilla: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  firma: <><path d="M3 21h18" /><path d="M14.5 4.5l3 3L8 17H5v-3z" /></>,
  ficha: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8" /><path d="M8 17v-3M12 17v-6M16 17v-4" /></>,
  lista: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  bloques: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>,
  personaMas: <><circle cx="10" cy="8" r="4" /><path d="M3 21c1-4 3.5-6 7-6 2 0 3.6.6 4.8 1.7" /><path d="M19 15v6M16 18h6" /></>,
  subir: <><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  ascensor: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 9l3-3 3 3M9 15l3 3 3-3" /></>,
  megafono: <><path d="M3 10v4h4l7 4V6L7 10z" /><path d="M18 9a4 4 0 0 1 0 6" /></>,
  calculadora: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></>,
  ayuda: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 10h4.5a2 2 0 0 1 0 4H9" /></>,
  aviso: <><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17h.01" /></>,
  escudo: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></>,
  capas: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  porcentaje: <><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></>,
  maletin: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>,
  historico: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></>,
} as const;
export type Icono = keyof typeof ICONOS;

export function Trazo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
