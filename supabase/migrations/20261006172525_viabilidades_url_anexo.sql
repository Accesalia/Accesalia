-- El anexo de la viabilidad (la ficha del edificio en limpio, sin IA). Lo saca
-- la app sola al crear la viabilidad y lo rehace al enviarla al comercial, con
-- el coste de obra ya puesto (Monica, 6-oct-2026: "se adjunta y ya esta, son
-- datos que tenemos"). Formato: "almacen:<bucket>/<ruta>", como las hojas.
alter table public.viabilidades add column if not exists url_anexo text;
alter table public.viabilidades add column if not exists anexo_generado_en timestamptz;
comment on column public.viabilidades.url_anexo is 'PDF del anexo (ficha del edificio), generado por la app: almacen:<bucket>/<ruta>';
