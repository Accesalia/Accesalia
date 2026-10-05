-- YA APLICADO el 3-oct-2026 a mano (execute_sql). NO volver a ejecutar: el
-- insert duplicaria la empresa. Este fichero existe para que quede constancia.
--
-- EL PRIMER TITULAR DE LA BASE, y no es una comunidad. CBRE GWS ESPAÑA S.L.
-- es una sociedad de facility management, dueña de un edificio de oficinas en
-- Av. Europa 20 de Alcobendas. Lo que vino de Schindler (Javier Parra) fue un
-- informe de sustitucion de ascensores.
--
-- De donde sale cada dato, porque no hay tarjeta de la AEAT: el nombre y el
-- CIF estaban en `comunidades` desde la tanda de Alcobendas, y lo guardado
-- como documento es un correo de Schindler impreso, no una tarjeta. Por eso
-- `nombre_legal` y `cif` se escriben y el domicilio NO: no lo tenemos.
--
-- El acceso se identifico por la razon de su propia relacion con la opp, no
-- por parecido de la calle: "es CBRE GWS ESPAÑA S.L., CIF B83402883 -una
-- EMPRESA, no una comunidad-. Edificio de oficinas: Catastro declara UN solo
-- inmueble y 0 viviendas".

insert into public.empresas_propietarias (nombre_accesalia, nombre_legal, cif)
values ('CBRE GWS ESPAÑA S.L.', 'CBRE GWS ESPAÑA S.L.', 'B83402883');

insert into public.figura_legal_propietaria (id_comodin, figura)
select id, 'Propietario Empresa' from public.empresas_propietarias
where cif = 'B83402883';

update public.accesos
set figura_legal_propietaria_id = (select id from public.empresas_propietarias where cif = 'B83402883')
where id = '8969d533-69a6-46e5-bac6-9e7592a1b9e7';   -- EUROPA 20(B) escalera T, ALCOBENDAS
