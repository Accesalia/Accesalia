-- INICIO DE OBRA Y BLOQUES SIN TEXTO (Monica, 14-oct-2026).
--
-- La obra tiene tres fases, cada una un bloque: INICIO (CSS, apertura del centro
-- de trabajo, plan de seguridad firmado -> acta de inicio), DIRECCION FACULTATIVA
-- (visitas de seguimiento y de certificacion) y FIN DE OBRA (CFO). Marcar la DF
-- arrastra el inicio y el CFO. La CSS sola no: es la parte de seguridad, y el
-- inicio lo gestiona otro.
--
-- SIN TEXTO = NO SALE NADA EN EL PAPEL. El inicio de obra y el visado existen
-- por debajo (abren su trabajo) pero la comunidad no los lee: "algo no requiere
-- visado, pero como lo dice el papel, el vecino ingeniero del 5D exige que lo
-- visemos... semanas de broncas por una chorrada".

insert into public.bloques (codigo, nombre, nombre_corto, texto_plantilla, desglose, naturaleza, activo, suelto)
values ('INICIO DE OBRA', 'INICIO DE OBRA', 'Inicio de obra', '', 'no_aparece', 'servicio', true, false)
on conflict (codigo) do nothing;

update public.bloques set texto_plantilla = '' where codigo = 'VISADO';

update public.bloques set marca_tambien = array[
  (select id from public.bloques where codigo = 'INICIO DE OBRA'),
  (select id from public.bloques where codigo = 'CERTIFICADO FIN DE OBRA')]
where codigo = 'DF';

-- El inicio, justo antes de la DF.
update public.bloques set orden = orden + 1 where activo and orden >= 13 and codigo <> 'INICIO DE OBRA';
update public.bloques set orden = 13 where codigo = 'INICIO DE OBRA';
