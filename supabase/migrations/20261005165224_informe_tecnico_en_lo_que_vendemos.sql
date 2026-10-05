-- YA APLICADA el 5-oct-2026 por el MCP. NO volver a ejecutar.
--
-- INFORME TECNICO, A LO QUE VENDEMOS. Salio leyendo Arroyomolinos (islacristina1):
-- FAIN encarga un informe tecnico para sustituir una viga estructural del cuarto
-- de maquinas, y no habia tipo: "Informe pericial" es otra cosa y "Otros" no dice
-- nada. Monica: "añadimos INFORME TECNICO al catalogo. Vamos a ir puliendo lo que
-- hace falta tener". Documento tecnico, al lado del pericial, y contratable.
insert into public.tipos_proyecto (clave, nombre, naturaleza, parent_id, orden, activo, elegible, contratable)
select 'informe_tecnico', 'Informe técnico', 'documento_tecnico', null, 275, true, true, true
where not exists (select 1 from public.tipos_proyecto where clave = 'informe_tecnico');
