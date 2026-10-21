-- EL COLCHON DE PROYECTOS (Monica, 21-oct-2026): sus umbrales y la capacidad del
-- equipo, editables desde Negocio > Trabajo contratado. Nuevas unidades.
-- Aplicada en produccion como 20261021114614.
alter table parametros_alerta drop constraint parametros_alerta_unidad_check;
alter table parametros_alerta add constraint parametros_alerta_unidad_check
  check (unidad in ('dias','horas','semanas','personas','horas_semana'));

insert into parametros_alerta (clave, nombre, valor, unidad, descripcion, orden, activo) values
 ('colchon_minimo','Colchón de proyectos: poco colchón por debajo de',3,'semanas','Con menos semanas de cola no da tiempo a reaccionar.',60,true),
 ('colchon_ideal_desde','Colchón de proyectos: lo ideal desde',4,'semanas','Inicio de la zona ideal.',61,true),
 ('colchon_ideal_hasta','Colchón de proyectos: lo ideal hasta',5,'semanas','Final de la zona ideal.',62,true),
 ('colchon_maximo','Colchón de proyectos: colapso por encima de',6,'semanas','Con más semanas de cola, no llegamos.',63,true),
 ('colchon_tecnicos','Colchón de proyectos: técnicos a jornada completa',6,'personas','Cuántos técnicos cuentan para la capacidad.',64,true),
 ('colchon_horas_tecnico','Colchón de proyectos: horas de proyecto por técnico',30,'horas_semana','No todo su tiempo es proyecto: RQ, repasos, revisiones.',65,true),
 ('colchon_horas_parcial','Colchón de proyectos: horas del técnico a media jornada',15,'horas_semana','El técnico a tiempo parcial; 0 si no hay.',66,true),
 ('colchon_horas_dia','Colchón de proyectos: horas por día de tiempo estándar',8,'horas','Para pasar a horas los días de los tiempos estándar.',67,true);
