-- Mar Menor 21-23-25: dos hojas de agosto de 2026 que el cruce fechaba en 2025 (leia el portal
-- como fecha). Se les dan los codigos libres HE-2026-0779 y 0780; la app sigue desde el 781.
update public.series_documento set ultimo = 780, actualizado_en = now() where tipo = 'HE' and anio = 2026 and ultimo < 780;
