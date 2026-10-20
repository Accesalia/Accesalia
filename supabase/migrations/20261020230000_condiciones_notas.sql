-- LAS NOTAS DE LAS CONDICIONES A RESPETAR (Monica, 20-oct-2026: "muy
-- importante"). En la ficha de la administracion, las condiciones (es de otro,
-- nos llego por, no ofrecerle jamas) llevan sus propias notas. La columna
-- `notas` de administracion_origen ya es la de "como le hemos conocido": no se
-- mezclan.

alter table administracion_origen add column condiciones_notas text;
