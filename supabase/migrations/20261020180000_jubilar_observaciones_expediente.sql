-- Las observaciones colgaban de la COMUNIDAD: «de la comunidad SOLO cuelgan sus datos, lo demás NO CUELGA JAMÁS de la
-- comunidad» (Mónica, 20-oct-2026). Las 2.670 están ya en el diario de su opp (notas_oportunidad: 2.434 ya estaban,
-- 236 pasadas con scripts/opps/observaciones_al_diario.py). «Jubilamos la tabla, sin falta»: al archivo, como
-- accesos_comunidad y cotejo_catastro (20261004092702). La ficha antigua de comunidad lee ya el diario de sus opps.
alter table public.observaciones_expediente set schema historico_de_tablas;
