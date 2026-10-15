-- LAS FASES VIEJAS, A LA SALA DE LAS MUERTAS (Monica, 15-oct-2026: "todo lo que
-- escriba fases deberia leer de la nueva tabla. Y marcamos las antiguas como zz").
--
-- fases_oportunidad deducia cada fase AL SALIR de ella (con su resultado), no al
-- entrar; fase_actual_oportunidad se apoyaba en ella. Desde hoy las fases salen del
-- ESTADO DE LA OPP (estado_oportunidad, la escalera de "que nos falta"), via
-- frontend/lib/fasesDeEstado.ts. Ya no las lee nadie: ni el codigo ni otra vista.
-- Se renombran, no se borran.

alter view public.fase_actual_oportunidad rename to zz_muerta_fase_actual_oportunidad;
alter view public.fases_oportunidad rename to zz_muerta_fases_oportunidad;
