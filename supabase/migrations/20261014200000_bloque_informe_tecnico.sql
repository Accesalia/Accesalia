-- INFORME TECNICO (Monica, 14-oct-2026): "es un tipo de proyecto, como la
-- memoria o el informe pericial". Siempre area proyecto, nunca un servicio. Lo
-- piden en el alta (13 opps lo marcan) y no tenia bloque: sin el, la hoja no
-- podia premarcarlo. Su texto, de momento solo el titulo: se completa en el
-- catalogo.

insert into public.bloques (codigo, nombre, nombre_corto, texto_plantilla, desglose, naturaleza, area, activo)
values ('INFORME TECNICO', 'INFORME TÉCNICO', 'Informe técnico', 'INFORME TÉCNICO', 'se_cobra', 'proyecto', 'PRY', true)
on conflict (codigo) do nothing;

-- Justo antes del informe pericial.
update public.bloques set orden = orden + 1
where activo and codigo <> 'INFORME TECNICO' and orden >= (select orden from public.bloques where codigo = 'INFORME PERICIAL');
update public.bloques set orden = (select orden - 1 from public.bloques where codigo = 'INFORME PERICIAL') where codigo = 'INFORME TECNICO';
