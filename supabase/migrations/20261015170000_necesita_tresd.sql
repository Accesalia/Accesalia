-- ¿NECESITA 3D PARA LA JUNTA? (Monica, 15-oct-2026, pedido del hilo grafico). Una
-- casilla EXPRESA en el bloque 1: "es lo que tenemos que tocar expresamente";
-- vacio = no. Va aparte de Polycam y viabilidad: el 3D no hace falta para dar
-- precio, sino para la junta. Se define antes de la viabilidad para que Alex diga
-- cual encaja, y se usa en el bloque 3.
alter table public.oportunidades add column if not exists necesita_tresd boolean;
comment on column public.oportunidades.necesita_tresd is '¿Necesita 3D para la junta? Se marca A MANO en el bloque 1 ("es lo que tenemos que tocar expresamente"); vacio = no. Va aparte de Polycam y viabilidad: no hace falta para dar precio, sino para la junta (Monica, 15-oct-2026).';
