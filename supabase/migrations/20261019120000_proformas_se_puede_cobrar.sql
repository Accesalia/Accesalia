-- «SE PUEDE COBRAR» (Monica, 19-oct-2026): el pagador contesta a la proforma y nos
-- da el ok a cobrar (antes «via libre al cargo»). De momento lo marca Alexandra a
-- mano, con la fecha. Apaga el aviso de «proforma enviada y no hay confirmacion».
alter table proformas add column se_puede_cobrar_en date;
alter table proformas add column se_puede_cobrar_por uuid references equipo(id);
comment on column proformas.se_puede_cobrar_en is 'Cuando el pagador dio el ok a cobrar (Se puede cobrar). Vacio = pendiente de validar.';
comment on column proformas.se_puede_cobrar_por is 'Quien lo marco.';
