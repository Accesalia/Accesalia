--
-- PostgreSQL database dump
--

\restrict bJw8wRb5fDDtu8CCLs3PVc5NnHC0ZV45RxoI31qzcwxqRbJavwWvlgK98RpopLw

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: actualizar_ultimo_contacto_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_ultimo_contacto_admin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  adm      uuid;
  admin_af uuid;
begin
  adm := new.administrador_id;
  if adm is null and new.oportunidad_id is not null then
    select administrador_id into adm from oportunidades where id = new.oportunidad_id;
  end if;
  if adm is not null and new.fecha_evento is not null then
    update administradores
       set fecha_ultimo_contacto = greatest(coalesce(fecha_ultimo_contacto, new.fecha_evento::timestamptz), new.fecha_evento::timestamptz)
     where id = adm
    returning administracion_id into admin_af;

    if admin_af is not null then
      update administraciones_fincas
         set fecha_ultimo_contacto = greatest(coalesce(fecha_ultimo_contacto, new.fecha_evento::timestamptz), new.fecha_evento::timestamptz)
       where id = admin_af;
    end if;
  end if;
  return null;
end;
$$;


--
-- Name: FUNCTION actualizar_ultimo_contacto_admin(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.actualizar_ultimo_contacto_admin() IS 'AFTER INSERT en interacciones: avanza fecha_ultimo_contacto de la persona (administradores) y burbujea a su administracion (administraciones_fincas), usando fecha_evento y solo si es mas reciente.';


--
-- Name: buscar_administradores_fuzzy(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buscar_administradores_fuzzy(q text, tope integer DEFAULT 5) RETURNS TABLE(id uuid, nombre text, empresa text, administracion_id uuid, sim real)
    LANGUAGE sql STABLE
    SET "pg_trgm.word_similarity_threshold" TO '0.3'
    AS $$
  select a.id, a.nombre, a.empresa, a.administracion_id, word_similarity(q, a.nombre) as sim
  from administradores a
  where a.activo and q <% a.nombre
  order by sim desc
  limit tope;
$$;


--
-- Name: buscar_comunidades_fuzzy(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.buscar_comunidades_fuzzy(q text, tope integer DEFAULT 5) RETURNS TABLE(id uuid, nombre text, direccion text, sim real)
    LANGUAGE sql STABLE
    SET "pg_trgm.word_similarity_threshold" TO '0.3'
    AS $$
  select c.id, c.nombre, c.direccion,
         greatest(word_similarity(q, c.nombre), word_similarity(q, coalesce(c.direccion, ''))) as sim
  from comunidades c
  where c.activa
    and (q <% c.nombre or q <% coalesce(c.direccion, ''))
  order by sim desc
  limit tope;
$$;


--
-- Name: FUNCTION buscar_comunidades_fuzzy(q text, tope integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.buscar_comunidades_fuzzy(q text, tope integer) IS 'Fuzzy trigram (word_similarity) de comunidades por nombre/direccion. Para casar menciones de notas sueltas sin cotejar a ciegas.';


--
-- Name: candidatos_comunidad_para_nota(text, integer, real); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.candidatos_comunidad_para_nota(nota text, tope integer DEFAULT 8, umbral real DEFAULT 0.4) RETURNS TABLE(id uuid, nombre text, direccion text, sim real)
    LANGUAGE sql STABLE
    AS $$
  select c.id, c.nombre, c.direccion, strict_word_similarity(c.nombre, nota) as sim
  from comunidades c
  where c.activa
    and length(c.nombre) >= 6
    and strict_word_similarity(c.nombre, nota) >= umbral
  order by sim desc
  limit tope;
$$;


--
-- Name: FUNCTION candidatos_comunidad_para_nota(nota text, tope integer, umbral real); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.candidatos_comunidad_para_nota(nota text, tope integer, umbral real) IS 'Fuzzy Ordelia: comunidades del catalogo que suenan en el texto de la nota, para subir al prompt como contexto (fuzzy-antes). strict_word_similarity + <<% (indice GIN).';


--
-- Name: crear_hitos_oportunidad(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.crear_hitos_oportunidad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into hitos_oportunidad (oportunidad_id, hito, aplicable, estado)
  select new.id, h.clave, h.aplicable_por_defecto,
         case when h.aplicable_por_defecto then 'pendiente' else 'no_aplica' end
  from hitos_comerciales h
  on conflict (oportunidad_id, hito) do nothing;
  return new;
end $$;


--
-- Name: set_actualizado_en(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_actualizado_en() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;


--
-- Name: FUNCTION set_actualizado_en(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.set_actualizado_en() IS 'Trigger BEFORE UPDATE: fija actualizado_en = now() en cada modificacion de fila. Aplicada a todas las tablas con columna actualizado_en.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acuerdos_comision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acuerdos_comision (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    beneficiario text NOT NULL,
    administrador_id uuid,
    contrata_id uuid,
    base_calculo text NOT NULL,
    tipo_servicio_id uuid,
    importe numeric,
    porcentaje numeric,
    vigente boolean DEFAULT true NOT NULL,
    notas text,
    pagador text DEFAULT 'accesalia'::text NOT NULL,
    administracion_id uuid,
    intermedia_accesalia boolean DEFAULT false NOT NULL,
    fecha_desde date,
    fecha_hasta date,
    CONSTRAINT acuerdos_comision_base_calculo_check CHECK ((base_calculo = ANY (ARRAY['por_proyecto'::text, 'por_tipo_proyecto'::text, 'por_pem'::text, 'por_servicio'::text]))),
    CONSTRAINT acuerdos_comision_beneficiario_check CHECK ((beneficiario = ANY (ARRAY['administrador'::text, 'contrata'::text, 'accesalia'::text]))),
    CONSTRAINT acuerdos_comision_flujo_check CHECK ((pagador <> beneficiario)),
    CONSTRAINT acuerdos_comision_pagador_check CHECK ((pagador = ANY (ARRAY['accesalia'::text, 'contrata'::text, 'comunidad'::text]))),
    CONSTRAINT acuerdos_comision_vinculo_check CHECK (((administracion_id IS NOT NULL) OR (administrador_id IS NOT NULL) OR (contrata_id IS NOT NULL)))
);


--
-- Name: TABLE acuerdos_comision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.acuerdos_comision IS 'Marco unico de comisiones (referencia, no liquidacion). Una fila por base pactada (tipicamente proyecto y subvencion). Sirve para AMBOS beneficiarios via la dimension beneficiario, evitando dos tablas gemelas. El valor REAL por proyecto vive en el vinculo (proyectos.comision_administrador para administrador; proyecto_contratas para contrata).';


--
-- Name: COLUMN acuerdos_comision.beneficiario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.beneficiario IS 'Quien RECIBE: administrador | contrata | accesalia. (Ampliado: antes solo administrador/contrata; ahora accesalia para el % que cobramos a la contrata).';


--
-- Name: COLUMN acuerdos_comision.administrador_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.administrador_id IS 'FK cuando beneficiario=administrador (excluyente con contrata_id, garantizado por check).';


--
-- Name: COLUMN acuerdos_comision.contrata_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.contrata_id IS 'FK cuando beneficiario=contrata (excluyente con administrador_id, garantizado por check).';


--
-- Name: COLUMN acuerdos_comision.base_calculo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.base_calculo IS 'Sobre que se pacta: por_proyecto, por_tipo_proyecto, por_pem (% del presupuesto de ejecucion material), por_servicio.';


--
-- Name: COLUMN acuerdos_comision.tipo_servicio_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.tipo_servicio_id IS 'Si la base es por_servicio (o para acotar el acuerdo a un servicio concreto), a que tipo de servicio aplica.';


--
-- Name: COLUMN acuerdos_comision.importe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.importe IS 'Importe fijo pactado, si aplica (excluyente/complementario con porcentaje segun el acuerdo).';


--
-- Name: COLUMN acuerdos_comision.porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.porcentaje IS 'Porcentaje pactado, si aplica.';


--
-- Name: COLUMN acuerdos_comision.pagador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.pagador IS 'Quien PAGA la comision: accesalia | contrata | comunidad. Junto con beneficiario define el flujo (ver cabecera de la migracion). Debe ser distinto de beneficiario.';


--
-- Name: COLUMN acuerdos_comision.administracion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.administracion_id IS 'Administracion (dueno) a la que pertenece la comision. La comision es del titular; lo que trae cualquier persona de la administracion comisiona aqui. FK a administraciones_fincas.';


--
-- Name: COLUMN acuerdos_comision.intermedia_accesalia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.intermedia_accesalia IS 'true = la comision contrata->administrador la canaliza Accesalia (contrata->Accesalia->admin), para que la comunidad no vea que el admin cobro.';


--
-- Name: COLUMN acuerdos_comision.fecha_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.fecha_desde IS 'Vigencia: desde cuando aplica el acuerdo (Monday lo registra: "desde 12/09/2025...").';


--
-- Name: COLUMN acuerdos_comision.fecha_hasta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.acuerdos_comision.fecha_hasta IS 'Vigencia: hasta cuando (nullable = indefinido).';


--
-- Name: CONSTRAINT acuerdos_comision_vinculo_check ON acuerdos_comision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT acuerdos_comision_vinculo_check ON public.acuerdos_comision IS 'El acuerdo debe vincular al menos una administracion, administrador o contrata.';


--
-- Name: administracion_origen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administracion_origen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    administracion_id uuid NOT NULL,
    tipo_origen text NOT NULL,
    comercial_id uuid,
    contrata_id uuid,
    admin_referente_id uuid,
    referente_externo text,
    condiciona_oferta boolean DEFAULT false NOT NULL,
    servicio_reservado_id uuid,
    notas text,
    CONSTRAINT administracion_origen_tipo_origen_check CHECK ((tipo_origen = ANY (ARRAY['puerta_fria'::text, 'web'::text, 'boca_a_boca'::text, 'contrata'::text, 'comercial_interno'::text, 'otro_admin'::text, 'otro'::text])))
);


--
-- Name: TABLE administracion_origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.administracion_origen IS 'Como llego la administracion (canal). DOBLE funcion: (1) analisis de eficiencia de canal (por eso tipo_origen sistematizado, para GROUP BY sin depender del LLM); (2) RESPETO DE CARTERA: quien la trae la considera suya, condicionando precio y que tipo de proyecto se le puede o no ofrecer. Varios registros posibles si conviven origenes.';


--
-- Name: COLUMN administracion_origen.tipo_origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracion_origen.tipo_origen IS 'Canal: puerta_fria | web | boca_a_boca | contrata | comercial_interno | otro_admin | otro.';


--
-- Name: COLUMN administracion_origen.comercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracion_origen.comercial_id IS 'Si la trajo un comercial interno, cual.';


--
-- Name: COLUMN administracion_origen.contrata_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracion_origen.contrata_id IS 'Si la trajo una contrata (ej. Otis con un ascensor), cual. Condiciona no ofrecer proyectos del mismo tipo de forma independiente.';


--
-- Name: COLUMN administracion_origen.admin_referente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracion_origen.admin_referente_id IS 'Si la trajo otro administrador (boca a boca), cual.';


--
-- Name: COLUMN administracion_origen.referente_externo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracion_origen.referente_externo IS 'Si la trajo alguien externo no fichado (texto libre): "cuniada del presidente", "a traves de Iberlean"...';


--
-- Name: COLUMN administracion_origen.condiciona_oferta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracion_origen.condiciona_oferta IS 'true = el origen restringe que se le puede ofrecer o a que precio (respeto de cartera).';


--
-- Name: COLUMN administracion_origen.servicio_reservado_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracion_origen.servicio_reservado_id IS 'Tipo de servicio reservado al que la trajo (ej. proyecto_ascensor reservado a la contrata). FK a tipos_servicio.';


--
-- Name: COLUMN administracion_origen.notas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracion_origen.notas IS 'Texto libre integro del origen (importantisimo comercialmente).';


--
-- Name: administraciones_fincas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administraciones_fincas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    cif text,
    telefono text,
    email text,
    direccion text,
    municipio text,
    notas text,
    activo boolean DEFAULT true NOT NULL,
    estado text DEFAULT 'contacto'::text NOT NULL,
    fecha_paso_a_cliente date,
    motivo_fin text,
    fecha_fin date,
    titular_id uuid,
    comercial_id uuid,
    comercial_captador_id uuid,
    fecha_alta_cartera date,
    fecha_ultimo_contacto timestamp with time zone,
    fecha_ultimo_encargo timestamp with time zone,
    CONSTRAINT administraciones_fincas_estado_check CHECK ((estado = ANY (ARRAY['contacto'::text, 'cliente_activo'::text, 'cliente_olvidado'::text, 'cliente_descontento'::text, 'cliente_baneado'::text])))
);


--
-- Name: TABLE administraciones_fincas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.administraciones_fincas IS 'Empresa de administracion de fincas que agrupa a varios administradores (personas). OPCIONAL: un administrador autonomo (tio unico) no necesita administracion (administradores.administracion_id queda vacio). Es el paraguas; la persona-contacto sigue siendo administradores, que es quien trae el trabajo.';


--
-- Name: COLUMN administraciones_fincas.cif; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.cif IS 'CIF de la administracion de fincas (nullable).';


--
-- Name: COLUMN administraciones_fincas.municipio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.municipio IS 'Municipio de la sede (informativo; la jurisdiccion relevante es la de cada comunidad).';


--
-- Name: COLUMN administraciones_fincas.notas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.notas IS 'Texto libre sobre la administracion (importancia comercial, como trabajar con ellos, etc.).';


--
-- Name: COLUMN administraciones_fincas.activo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.activo IS 'Baja logica: false = ya no operativa.';


--
-- Name: COLUMN administraciones_fincas.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.estado IS 'Ciclo de vida de la relacion. contacto = aun no ha firmado la 1a hoja de encargo. Al firmar pasa a cliente_activo. cliente_olvidado = dormido (ni nos llama ni le llamamos). cliente_descontento = se aleja por decision SUYA. cliente_baneado = cortamos NOSOTROS. descontento y baneado pueden revivir a activo.';


--
-- Name: COLUMN administraciones_fincas.fecha_paso_a_cliente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.fecha_paso_a_cliente IS 'Cuando firmo la 1a hoja de encargo (paso de contacto a cliente). Idealmente derivable de hojas_encargo; se guarda por comodidad e historico.';


--
-- Name: COLUMN administraciones_fincas.motivo_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.motivo_fin IS 'Motivo del baneo/descontento (ej. "devolvio recibo de subvenciones"). Texto libre.';


--
-- Name: COLUMN administraciones_fincas.fecha_fin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.fecha_fin IS 'Fecha del baneo/descontento.';


--
-- Name: COLUMN administraciones_fincas.titular_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.titular_id IS 'Persona duena de la administracion, la que PERCIBE la comision. Todo lo que traiga cualquier persona de esta administracion comisiona al titular. FK a administradores (nullable).';


--
-- Name: COLUMN administraciones_fincas.comercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.comercial_id IS 'Comercial DUENO de la cartera de esta administracion: toda oportunidad futura se le deriva. Lo que traiga cualquier persona de la administracion cuenta para el. (Antes en administradores.comercial_id, ahora aqui).';


--
-- Name: COLUMN administraciones_fincas.comercial_captador_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.comercial_captador_id IS 'Comercial que ABRIO esta administracion (puede diferir del dueno). Con fecha_alta_cartera mide apertura de cartera por comercial.';


--
-- Name: COLUMN administraciones_fincas.fecha_alta_cartera; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.fecha_alta_cartera IS 'Fecha de alta comercial (apertura de cartera). Distinta de creado_en (alta en el sistema).';


--
-- Name: COLUMN administraciones_fincas.fecha_ultimo_contacto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.fecha_ultimo_contacto IS 'Enchufe de IA: ultimo contacto con esta administracion (el mayor entre sus personas). Lo mantiene el trigger desde interacciones.';


--
-- Name: COLUMN administraciones_fincas.fecha_ultimo_encargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administraciones_fincas.fecha_ultimo_encargo IS 'Enchufe de IA: ultimo trabajo que trajo esta administracion.';


--
-- Name: administradores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administradores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    empresa text,
    telefono text,
    email text,
    comision_por_defecto numeric,
    fecha_ultimo_contacto timestamp with time zone,
    fecha_ultimo_encargo timestamp with time zone,
    activo boolean DEFAULT true NOT NULL,
    comercial_id uuid,
    comercial_captador_id uuid,
    fecha_alta_administrador date,
    notas_comision text,
    administracion_id uuid,
    cargo text,
    notas text
);


--
-- Name: TABLE administradores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.administradores IS 'Administrador de fincas: el cliente que trae el trabajo (comunidades, proyectos, encargos).';


--
-- Name: COLUMN administradores.empresa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.empresa IS 'Nombre comercial cuando NO hay administracion de fincas como entidad propia (tio unico con marca). Si administracion_id esta relleno, el nombre vive en administraciones_fincas.nombre y esta columna puede quedar vacia. (Comentario actualizado por la fase CRM).';


--
-- Name: COLUMN administradores.comision_por_defecto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.comision_por_defecto IS 'ORIENTATIVA (Fase 1). Candidata a limpiar: ahora el marco vive en acuerdos_comision y el valor real en proyectos.comision_administrador; esta columna es un tercer sitio que se solapa.';


--
-- Name: COLUMN administradores.fecha_ultimo_contacto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.fecha_ultimo_contacto IS 'Enchufe de IA: ultimo contacto con el administrador ("hace mucho que no hablas con este administrador"). La fase comercial la mantiene por trigger desde interacciones. (Reutiliza la columna de Fase 1; equivale al ultimo_contacto_en del doc comercial).';


--
-- Name: COLUMN administradores.fecha_ultimo_encargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.fecha_ultimo_encargo IS 'Enchufe de IA: ultimo trabajo que trajo.';


--
-- Name: COLUMN administradores.activo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.activo IS 'Baja logica: false = ya no operativo.';


--
-- Name: COLUMN administradores.comercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.comercial_id IS 'DEPRECATED (fase CRM): la cartera pivota a la administracion. Usar administraciones_fincas.comercial_id.';


--
-- Name: COLUMN administradores.comercial_captador_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.comercial_captador_id IS 'DEPRECATED (fase CRM): usar administraciones_fincas.comercial_captador_id.';


--
-- Name: COLUMN administradores.fecha_alta_administrador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.fecha_alta_administrador IS 'DEPRECATED (fase CRM): usar administraciones_fincas.fecha_alta_cartera.';


--
-- Name: COLUMN administradores.notas_comision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.notas_comision IS 'Compensacion arrastrada de comisiones del administrador (texto libre, se cuadra a mano). Ej. saldos pendientes que se compensan entre obras.';


--
-- Name: COLUMN administradores.administracion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.administracion_id IS 'Administracion de fincas a la que pertenece esta persona (FK a administraciones_fincas). Nullable: vacio cuando es un administrador autonomo sin empresa con mas gente. No cambia nada de lo existente: comunidades/oportunidades/cartera siguen colgando de la persona (administradores.id).';


--
-- Name: COLUMN administradores.cargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.cargo IS 'Rol de la persona dentro de la administracion (ej. titular, gestor, secretaria). Texto libre; util cuando hay varias personas.';


--
-- Name: COLUMN administradores.notas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administradores.notas IS 'Cajon de sastre revisable a nivel persona: lo que no cabe en otros campos. Materia prima de la que mas adelante se extraen pautas que enriquecen el modelo.';


--
-- Name: beneficiarios_reparto_caes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beneficiarios_reparto_caes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    operacion_caes_id uuid NOT NULL,
    rol text NOT NULL,
    administrador_id uuid,
    contrata_id uuid,
    comunidad_id uuid,
    nombre_libre text,
    importe numeric(12,2),
    porcentaje numeric,
    con_iva boolean,
    estado_pago text DEFAULT 'pendiente'::text NOT NULL,
    notas text,
    CONSTRAINT beneficiarios_reparto_caes_estado_pago_check CHECK ((estado_pago = ANY (ARRAY['pendiente'::text, 'pagado'::text, 'pago_parcial'::text, 'no_aplica'::text]))),
    CONSTRAINT beneficiarios_reparto_caes_rol_check CHECK ((rol = ANY (ARRAY['comunidad'::text, 'administrador'::text, 'contrata'::text, 'presidente'::text, 'vecino'::text, 'otro'::text])))
);


--
-- Name: TABLE beneficiarios_reparto_caes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.beneficiarios_reparto_caes IS 'Reparto del dinero a la salida: la comunidad cobra su contraprestacion (sin IVA, compraventa entre particulares) y las figuras que trajeron la oportunidad (prescriptores) cobran comision. Abierto: administrador (casi siempre), contrata (las que ponen SATE y dan el chivatazo), presidente, vecino, o nadie. Mismo concepto que el "origen" de la oportunidad comercial.';


--
-- Name: COLUMN beneficiarios_reparto_caes.rol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.beneficiarios_reparto_caes.rol IS 'Figura que cobra: comunidad (la cedente) o prescriptor (administrador/contrata/presidente/vecino/otro).';


--
-- Name: COLUMN beneficiarios_reparto_caes.nombre_libre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.beneficiarios_reparto_caes.nombre_libre IS 'Para presidente/vecino sueltos no fichados.';


--
-- Name: COLUMN beneficiarios_reparto_caes.con_iva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.beneficiarios_reparto_caes.con_iva IS 'La comunidad cobra SIN IVA; las comisiones a prescriptores, segun corresponda. Nullable: se fija por caso.';


--
-- Name: COLUMN beneficiarios_reparto_caes.estado_pago; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.beneficiarios_reparto_caes.estado_pago IS 'Pacto + estado del pago del reparto. El movimiento de dinero saliente vive en facturacion/Ecobalance (aun sin construir).';


--
-- Name: bitacora_ia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_ia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actor_tipo text DEFAULT 'ia'::text NOT NULL,
    actor_id uuid,
    operacion text,
    tipo text NOT NULL,
    target_tabla text,
    target_id uuid,
    datos jsonb DEFAULT '{}'::jsonb NOT NULL,
    deshecho boolean DEFAULT false NOT NULL,
    fecha_deshecho timestamp with time zone,
    CONSTRAINT bitacora_ia_actor_tipo_check CHECK ((actor_tipo = ANY (ARRAY['ia'::text, 'humano'::text, 'sistema'::text])))
);


--
-- Name: TABLE bitacora_ia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bitacora_ia IS 'Registro de cada accion con efectos (IA o humano), sustrato del "deshacer sin dramas". Codigo+params, no prosa: la frase para la usuaria la compone el front desde tipo+datos. La escribe _shared best-effort. Append-only.';


--
-- Name: COLUMN bitacora_ia.actor_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_ia.actor_tipo IS 'Quien ejecuto: ia | humano | sistema.';


--
-- Name: COLUMN bitacora_ia.actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_ia.actor_id IS 'Id del actor (personal_interno hoy; auth.users el dia de manana). Sin FK dura para no acoplar a auth.';


--
-- Name: COLUMN bitacora_ia.operacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_ia.operacion IS 'Contexto para agrupar/deshacer un lote (ej. "extraccion_convocatoria:<uuid>").';


--
-- Name: COLUMN bitacora_ia.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_ia.tipo IS 'Codigo del evento (ej. extraccion_generada, requisito_editado, casilla_add). El front lo traduce a frase.';


--
-- Name: COLUMN bitacora_ia.datos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_ia.datos IS 'Params + el TEXTO EXACTO afectado (clave para deshacer despues).';


--
-- Name: COLUMN bitacora_ia.deshecho; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bitacora_ia.deshecho IS 'true si esta accion fue revertida.';


--
-- Name: bloques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bloques (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    texto_plantilla text,
    honorarios_defecto numeric,
    es_paquete boolean DEFAULT false NOT NULL,
    orden integer,
    activo boolean DEFAULT true NOT NULL,
    naturaleza text,
    CONSTRAINT bloques_naturaleza_check CHECK ((naturaleza = ANY (ARRAY['proyecto'::text, 'servicio'::text, 'documento_tecnico'::text])))
);


--
-- Name: TABLE bloques; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bloques IS 'Catalogo de conceptos facturables ("encargos") con su plantilla de texto para generar documentos comerciales (hoja de encargo, presupuesto, viabilidad). La hoja selecciona bloques -> conceptos_hoja.';


--
-- Name: COLUMN bloques.codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloques.codigo IS 'Codigo estable del bloque; coincide con la cabecera del check en el Excel de seleccion (ej. DF, IEE, REDACCION PROYECTO). Llave para casar selecciones.';


--
-- Name: COLUMN bloques.nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloques.nombre IS 'Titulo legible (ej. DIRECCION FACULTATIVA).';


--
-- Name: COLUMN bloques.texto_plantilla; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloques.texto_plantilla IS 'Bloque de texto (descripcion con vinetas) que se ensambla en el PDF del documento.';


--
-- Name: COLUMN bloques.honorarios_defecto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloques.honorarios_defecto IS 'Honorario orientativo por defecto (nullable; el valor real se fija por concepto en cada hoja: estandar + excepcion).';


--
-- Name: COLUMN bloques.es_paquete; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloques.es_paquete IS 'true = paquete combinado con precios embebidos y oferta de cesion de CAES (SATE / SATE+ascensor). Naturaleza distinta a un bloque simple.';


--
-- Name: COLUMN bloques.orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloques.orden IS 'Orden de aparicion en el documento generado.';


--
-- Name: COLUMN bloques.naturaleza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bloques.naturaleza IS 'Clasifica el concepto: proyecto (requiere arquitecto), servicio (no), documento_tecnico (activo del edificio, reutilizable). NULL en paquetes (compuestos).';


--
-- Name: cierre_obra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cierre_obra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    obra_id uuid NOT NULL,
    fecha_memoria_fin_obra date,
    url_memoria_fin_obra text,
    presupuesto_aceptado numeric(12,2),
    total_final_pagado numeric(12,2),
    facturacion_consolidada boolean DEFAULT false NOT NULL,
    cfo_emitido boolean DEFAULT false NOT NULL,
    fecha_cfo date,
    url_cfo text
);


--
-- Name: TABLE cierre_obra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cierre_obra IS 'Cierre formal de la obra: memoria de fin de obra, consolidacion de facturacion y CFO. Una fila por obra.';


--
-- Name: COLUMN cierre_obra.presupuesto_aceptado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cierre_obra.presupuesto_aceptado IS 'El presupuesto pactado originalmente.';


--
-- Name: COLUMN cierre_obra.total_final_pagado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cierre_obra.total_final_pagado IS 'Lo finalmente pagado, incluidos precios contradictorios (incidencias_obra.importe_contradictorio).';


--
-- Name: COLUMN cierre_obra.facturacion_consolidada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cierre_obra.facturacion_consolidada IS 'Si ya cuadro la consolidacion de facturacion.';


--
-- Name: COLUMN cierre_obra.cfo_emitido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cierre_obra.cfo_emitido IS 'Certificado Final de Obra emitido. REGLA DE NEGOCIO (no implementada como trigger ahora): no deberia poder marcarse true mientras existan instrucciones_obra con bloquea_cfo=true y estado distinto de hecho.';


--
-- Name: cobros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cobros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    hito_facturacion_id uuid NOT NULL,
    fecha_cobro date NOT NULL,
    importe numeric(12,2) NOT NULL,
    metodo text,
    notas text,
    CONSTRAINT cobros_metodo_check CHECK ((metodo = ANY (ARRAY['cargo_cuenta'::text, 'transferencia'::text, 'efectivo'::text, 'otro'::text])))
);


--
-- Name: TABLE cobros; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cobros IS 'Pagos reales conforme entran. Un hito puede tener varios cobros (derramas fraccionadas). Sumando los cobros de un hito se sabe cuanto se ha cobrado y cuanto queda, sin tocar el hito original.';


--
-- Name: COLUMN cobros.importe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cobros.importe IS 'Importe efectivamente cobrado en este pago (base, sin IVA).';


--
-- Name: comerciales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comerciales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    apellidos text,
    email text,
    telefono text,
    activo boolean DEFAULT true NOT NULL,
    fecha_alta date,
    regimen_comision text DEFAULT 'comisiona_todo'::text NOT NULL,
    comision_negociada_individual boolean DEFAULT true NOT NULL,
    notas_comision text,
    notas text,
    CONSTRAINT comerciales_regimen_comision_check CHECK ((regimen_comision = ANY (ARRAY['comisiona_todo'::text, 'solo_proyecto'::text])))
);


--
-- Name: TABLE comerciales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comerciales IS 'Ficha del comercial (hermana de administradores/contratas/tecnicos). La definicion del regimen de comision vive aqui; su detalle economico (porcentajes, tramos, liquidacion) se modela en facturacion.';


--
-- Name: COLUMN comerciales.fecha_alta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comerciales.fecha_alta IS 'Desde cuando trabaja como comercial.';


--
-- Name: COLUMN comerciales.regimen_comision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comerciales.regimen_comision IS 'comisiona_todo (hoy: cualquier cosa que facture) | solo_proyecto (objetivo futuro: solo por proyecto de arquitectura). El modelo soporta ambos sin rediseno.';


--
-- Name: COLUMN comerciales.comision_negociada_individual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comerciales.comision_negociada_individual IS 'true = comision negociada individualmente (situacion actual). La intencion es un modelo estandar; esta marca permite distinguirlo.';


--
-- Name: COLUMN comerciales.notas_comision; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comerciales.notas_comision IS 'Texto libre para condiciones concretas mientras no haya estandar.';


--
-- Name: comisiones_proyecto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comisiones_proyecto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    beneficiario text NOT NULL,
    administracion_id uuid,
    administrador_id uuid,
    comercial_id uuid,
    beneficiario_externo text,
    acuerdo_id uuid,
    porcentaje numeric,
    importe numeric,
    estado_pago text DEFAULT 'pendiente'::text NOT NULL,
    notas text,
    CONSTRAINT comisiones_proyecto_beneficiario_check CHECK ((beneficiario = ANY (ARRAY['administrador'::text, 'comercial'::text, 'otro'::text]))),
    CONSTRAINT comisiones_proyecto_estado_pago_check CHECK ((estado_pago = ANY (ARRAY['pendiente'::text, 'liquidada'::text, 'parcial'::text, 'anulada'::text])))
);


--
-- Name: TABLE comisiones_proyecto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comisiones_proyecto IS 'Lineas de comision PAGABLE en un proyecto concreto (dinero saliente: lo que Accesalia paga por ese proyecto). Varias por proyecto (al dueno de la administracion, a un referente, al comercial...), simetrico a como el lado a COBRAR admite varias contratas via proyecto_contratas. El valor aqui es el REAL aplicado a ESTE proyecto (estandar + excepcion): se hereda del marco (acuerdo_id) y se puede ajustar a mano sin afectar a otros proyectos.';


--
-- Name: COLUMN comisiones_proyecto.beneficiario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comisiones_proyecto.beneficiario IS 'A quien se le paga esta linea: administrador (el titular/dueno) | comercial (comercial interno) | otro (externo, ver beneficiario_externo).';


--
-- Name: COLUMN comisiones_proyecto.administracion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comisiones_proyecto.administracion_id IS 'Si beneficiario=administrador: la administracion cuya comision se paga (al titular).';


--
-- Name: COLUMN comisiones_proyecto.administrador_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comisiones_proyecto.administrador_id IS 'Persona concreta beneficiaria, si aplica (normalmente el titular de la administracion).';


--
-- Name: COLUMN comisiones_proyecto.comercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comisiones_proyecto.comercial_id IS 'Si beneficiario=comercial: que comercial.';


--
-- Name: COLUMN comisiones_proyecto.beneficiario_externo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comisiones_proyecto.beneficiario_externo IS 'Si beneficiario=otro: nombre libre del externo.';


--
-- Name: COLUMN comisiones_proyecto.acuerdo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comisiones_proyecto.acuerdo_id IS 'Marco del que deriva esta linea (acuerdos_comision). El marco es la referencia; esta fila es lo realmente aplicado al proyecto.';


--
-- Name: COLUMN comisiones_proyecto.estado_pago; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comisiones_proyecto.estado_pago IS 'pendiente | liquidada | parcial | anulada.';


--
-- Name: comunidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comunidades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    administrador_id uuid,
    nombre text NOT NULL,
    direccion text,
    municipio text,
    referencia_catastral text,
    cif_comunidad text,
    anio_construccion integer,
    num_viviendas integer,
    num_residentes_mayores_70 integer,
    num_residentes_discapacidad integer,
    fecha_actualizacion_censo date,
    fecha_ultimo_contacto timestamp with time zone,
    activa boolean DEFAULT true NOT NULL,
    cp text,
    provincia text,
    administracion_id uuid,
    iban text
);


--
-- Name: TABLE comunidades; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comunidades IS 'Edificio / comunidad de propietarios (para Accesalia, comunidad = inmueble). Incluye datos ricos para baremar convocatorias de subvencion.';


--
-- Name: COLUMN comunidades.administrador_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.administrador_id IS 'Persona gestora concreta (OPCIONAL; antes obligatorio). El enlace principal es administracion_id; la persona se completa donde se conoce.';


--
-- Name: COLUMN comunidades.nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.nombre IS 'Identidad del inmueble: direccion postal calle-numero-localidad (ej. "Mayor 5 Alcorcon"). Convencion no estandarizada (se omite "calle"; paseo/avenida/plaza/travesia si). En Monday es la columna "Name" (mal etiquetada como nombre).';


--
-- Name: COLUMN comunidades.direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.direccion IS 'Direccion completa geocodificada (Monday "Ubicacion"). Complementa a nombre.';


--
-- Name: COLUMN comunidades.municipio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.municipio IS 'Relevante: determina que ayuntamiento tiene jurisdiccion.';


--
-- Name: COLUMN comunidades.num_residentes_mayores_70; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.num_residentes_mayores_70 IS 'Dato de baremacion de subvenciones.';


--
-- Name: COLUMN comunidades.num_residentes_discapacidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.num_residentes_discapacidad IS 'Dato de baremacion de subvenciones.';


--
-- Name: COLUMN comunidades.fecha_actualizacion_censo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.fecha_actualizacion_censo IS 'Cuando se actualizaron num_residentes_mayores_70 y num_residentes_discapacidad.';


--
-- Name: COLUMN comunidades.fecha_ultimo_contacto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.fecha_ultimo_contacto IS 'Enchufe de IA.';


--
-- Name: COLUMN comunidades.activa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.activa IS 'Baja logica.';


--
-- Name: COLUMN comunidades.cp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.cp IS 'Codigo postal (Monday "CP").';


--
-- Name: COLUMN comunidades.provincia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.provincia IS 'Provincia (Monday "PROVINCIA").';


--
-- Name: COLUMN comunidades.administracion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.administracion_id IS 'Administracion de fincas (EMPRESA) que gestiona el inmueble. FK a administraciones_fincas. Enlace principal admin<->inmueble.';


--
-- Name: COLUMN comunidades.iban; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comunidades.iban IS 'Numero de cuenta (IBAN) de la comunidad, para domiciliaciones/cobros. Dato estable de la comunidad, no del proyecto.';


--
-- Name: conceptos_hoja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conceptos_hoja (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    hoja_encargo_id uuid,
    proyecto_id uuid,
    tipo_concepto text,
    descripcion text,
    importe numeric(12,2) DEFAULT 0,
    incluido boolean DEFAULT false NOT NULL,
    incluido_en_concepto_id uuid,
    subvencion_tipo_proyecto text,
    version_hoja_id uuid,
    bloque_id uuid,
    CONSTRAINT chk_conceptos_hoja_incluido CHECK (((incluido = true) OR ((incluido = false) AND (incluido_en_concepto_id IS NULL)))),
    CONSTRAINT conceptos_hoja_subvencion_tipo_proyecto_check CHECK ((subvencion_tipo_proyecto = ANY (ARRAY['propio'::text, 'externo'::text]))),
    CONSTRAINT conceptos_hoja_tipo_concepto_check CHECK ((tipo_concepto = ANY (ARRAY['proyecto_tecnico'::text, 'memoria_valorada'::text, 'direccion_facultativa'::text, 'coordinacion_ss'::text, 'iee'::text, 'lee'::text, 'cee'::text, 'tramitacion_subvenciones'::text, 'documentacion_tecnica_subvencion'::text, 'caes'::text, 'otro'::text])))
);


--
-- Name: TABLE conceptos_hoja; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conceptos_hoja IS 'Cada linea/servicio contratado dentro de una hoja. Siempre desglosado (nunca un paquete opaco), para poder contar y filtrar por tipo de servicio.';


--
-- Name: COLUMN conceptos_hoja.hoja_encargo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.hoja_encargo_id IS 'DEPRECATED como ancla: el concepto cuelga de version_hoja_id. Nullable.';


--
-- Name: COLUMN conceptos_hoja.proyecto_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.proyecto_id IS 'A que proyecto se refiere este concepto, si aplica. Aqui se resuelve la relacion hoja-proyecto (una hoja puede tocar varios proyectos).';


--
-- Name: COLUMN conceptos_hoja.tipo_concepto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.tipo_concepto IS 'Opcional/legacy: la clasificacion del concepto la da bloque_id (catalogo). Se conserva por compatibilidad.';


--
-- Name: COLUMN conceptos_hoja.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.descripcion IS 'Detalle libre (lo que en la factura aparece como "incluye...").';


--
-- Name: COLUMN conceptos_hoja.importe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.importe IS 'Importe del concepto, lo fija el comercial en la hoja (partiendo de catalogos de precios orientativos). Nullable: el import historico del Excel no lo trae.';


--
-- Name: COLUMN conceptos_hoja.incluido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.incluido IS 'true = va incluido/gratis (valor anadido) en el presupuesto, sin coste para la comunidad.';


--
-- Name: COLUMN conceptos_hoja.incluido_en_concepto_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.incluido_en_concepto_id IS 'Apunta al concepto que lo engloba, si incluido = true (auto-referencia a conceptos_hoja).';


--
-- Name: COLUMN conceptos_hoja.subvencion_tipo_proyecto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.subvencion_tipo_proyecto IS 'Solo para documentacion_tecnica_subvencion / tramitacion_subvenciones: propio (1.980 EUR) o externo (2.225 EUR). Null en el resto.';


--
-- Name: COLUMN conceptos_hoja.version_hoja_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.version_hoja_id IS 'Version de la hoja a la que pertenece este concepto (ANCLA: los conceptos van por version porque cambian entre revisiones).';


--
-- Name: COLUMN conceptos_hoja.bloque_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conceptos_hoja.bloque_id IS 'Bloque del catalogo que representa este concepto (el item facturable / "encargo" seleccionado).';


--
-- Name: CONSTRAINT chk_conceptos_hoja_incluido ON conceptos_hoja; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_conceptos_hoja_incluido ON public.conceptos_hoja IS 'Solo un concepto marcado incluido puede apuntar a incluido_en_concepto_id.';


--
-- Name: condicionantes_comunidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condicionantes_comunidad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid NOT NULL,
    interaccion_id uuid,
    texto text NOT NULL,
    categoria text,
    origen text DEFAULT 'ia'::text NOT NULL,
    CONSTRAINT condicionantes_comunidad_origen_check CHECK ((origen = ANY (ARRAY['ia'::text, 'humano'::text])))
);


--
-- Name: TABLE condicionantes_comunidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.condicionantes_comunidad IS 'Brief tecnico de la comunidad: deseos y condicionantes que la comunidad expresa (via captura comercial). Reutilizable entre proyectos; lo lee el tecnico redactor. Distinto de los requerimientos de licencia.';


--
-- Name: COLUMN condicionantes_comunidad.categoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.condicionantes_comunidad.categoria IS 'Pista libre no controlada (deseo | condicionante | consecuencia). Descriptiva, no enruta logica.';


--
-- Name: condiciones_convocatoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condiciones_convocatoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    convocatoria_id uuid NOT NULL,
    identificador text,
    descripcion text NOT NULL,
    texto_literal text,
    notas_extraccion text
);


--
-- Name: TABLE condiciones_convocatoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.condiciones_convocatoria IS 'Condiciones de elegibilidad (NO documentos) que exige una convocatoria: tipo de edificio, antiguedad minima, % de ahorro energetico, superficie afectada, plazos, etc. Es la mitad "requisitos_a_cumplir" de la salida del prompt 1. Futuro: el barrido de comunidades con subvencion contratada comprobara cuales las cumplen.';


--
-- Name: COLUMN condiciones_convocatoria.identificador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.condiciones_convocatoria.identificador IS 'Identificador legible/slug (ej. antiguedad_minima, ahorro_energetico_minimo).';


--
-- Name: COLUMN condiciones_convocatoria.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.condiciones_convocatoria.descripcion IS 'Descripcion textual de la condicion.';


--
-- Name: COLUMN condiciones_convocatoria.texto_literal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.condiciones_convocatoria.texto_literal IS 'Texto literal de la convocatoria de donde se extrajo (trazabilidad, revision humana).';


--
-- Name: COLUMN condiciones_convocatoria.notas_extraccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.condiciones_convocatoria.notas_extraccion IS 'Auditoria: como entendio/extrajo la IA esta condicion.';


--
-- Name: conocimiento_operativo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conocimiento_operativo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    aportado_por uuid,
    conocimiento text NOT NULL,
    vigente boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE conocimiento_operativo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conocimiento_operativo IS 'Tips/excepciones operativas del dia a dia que aplican a cualquier area (ej. "en requerimientos de Leganes de la tecnica Maria Fernanda, no poner Tramex, lo echa para atras"). Texto libre integro; lo primero es RECOGERLO. Consumo por la IA (familia de prompts 3, y otras areas) es futuro. Solo app interna.';


--
-- Name: COLUMN conocimiento_operativo.aportado_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conocimiento_operativo.aportado_por IS 'Quien aporta el tip (personal_interno). Su area determina el area del tip.';


--
-- Name: COLUMN conocimiento_operativo.conocimiento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conocimiento_operativo.conocimiento IS 'El tip en texto libre integro, tal cual.';


--
-- Name: COLUMN conocimiento_operativo.vigente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conocimiento_operativo.vigente IS 'Un tip puede caducar (cambia la tecnica, la normativa); marcar sin borrar historico.';


--
-- Name: contactos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contactos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    administracion_id uuid NOT NULL,
    persona_id uuid,
    proposito text NOT NULL,
    nombre text,
    telefono text,
    email text,
    notas text,
    CONSTRAINT contactos_proposito_check CHECK ((proposito = ANY (ARRAY['facturacion'::text, 'obra'::text, 'documentacion'::text, 'general'::text, 'comercial'::text])))
);


--
-- Name: TABLE contactos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contactos IS 'Multicontacto de una administracion: a quien llamar para cada asunto (las grandes tienen contacto distinto para facturas, obra, papeles...). Base para automatizar el envio de mails por proposito. persona_id enlaza con la ficha de persona si esa persona ya existe como administrador.';


--
-- Name: COLUMN contactos.persona_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contactos.persona_id IS 'Enlace opcional a administradores si el contacto ya es una persona fichada.';


--
-- Name: COLUMN contactos.proposito; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contactos.proposito IS 'facturacion | obra | documentacion | general | comercial.';


--
-- Name: contrata_contacto_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrata_contacto_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    contacto_id uuid NOT NULL,
    rol text NOT NULL,
    CONSTRAINT contrata_contacto_roles_rol_check CHECK ((rol = ANY (ARRAY['jefe_de_obra'::text, 'responsable_comercial'::text, 'responsable_empresa'::text, 'admin_facturacion'::text, 'admin_obra'::text, 'otro'::text])))
);


--
-- Name: TABLE contrata_contacto_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contrata_contacto_roles IS 'Roles de un contacto de contrata (varios por persona: el decisor que tambien es comercial). Dos naturalezas: decision/comercial-obra (jefe_de_obra, responsable_comercial, responsable_empresa=decisor final) y administrativo del dia a dia (admin_facturacion=a quien pasamos facturas, admin_obra=a quien pedimos fichas tecnicas/certificaciones).';


--
-- Name: contrata_contactos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrata_contactos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    contrata_id uuid NOT NULL,
    nombre text NOT NULL,
    telefono text,
    email text,
    notas text
);


--
-- Name: TABLE contrata_contactos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contrata_contactos IS 'Agenda de personas concretas dentro de una contrata. La contrata no es un bloque: la relacion real es con personas, que pueden tener varios roles (ver contrata_contacto_roles).';


--
-- Name: contratas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contratas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL,
    telefono text,
    email text,
    notas_fiabilidad text,
    activa boolean DEFAULT true NOT NULL,
    especialidad text,
    relacion_estado text,
    notas_comercial text,
    cif text,
    direccion text,
    razon_social text,
    CONSTRAINT contratas_relacion_estado_check CHECK ((relacion_estado = ANY (ARRAY['preferente'::text, 'habitual'::text, 'esporadica'::text, 'en_observacion'::text, 'descartada'::text]))),
    CONSTRAINT contratas_tipo_check CHECK ((tipo = ANY (ARRAY['obra_civil'::text, 'ascensorista'::text, 'sate'::text, 'mixta'::text, 'otra'::text])))
);


--
-- Name: TABLE contratas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contratas IS 'Empresa que ejecuta las obras. Entidad propia por su historial de fiabilidad (alimentara el calculo de visitas de obra en fase futura) y porque a veces es la pagadora de un encargo.';


--
-- Name: COLUMN contratas.notas_fiabilidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratas.notas_fiabilidad IS 'Enchufe de IA: observaciones sobre si es de confianza o hay que vigilarla. Por ahora texto libre; se estructurara en el futuro.';


--
-- Name: COLUMN contratas.activa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratas.activa IS 'Baja logica.';


--
-- Name: COLUMN contratas.especialidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratas.especialidad IS 'En que tipo de obra es especialista (ascensor, SATE, plataforma...). Texto libre.';


--
-- Name: COLUMN contratas.relacion_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratas.relacion_estado IS 'Apreciacion cualitativa actualizable: preferente, habitual, esporadica, en_observacion, descartada. La relacion varia en el tiempo.';


--
-- Name: COLUMN contratas.notas_comercial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratas.notas_comercial IS 'Texto libre: en que es buena, de que cojea, por que la relacion mejoro/empeoro. Alimenta las consultas que la IA hace al humano. NO hay campo de capacidad de carga ni balance: son cosas que la IA observa y sugiere, no datos fijos.';


--
-- Name: COLUMN contratas.cif; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratas.cif IS 'CIF de la contrata (Monday 00a).';


--
-- Name: COLUMN contratas.direccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratas.direccion IS 'Direccion postal de la contrata (Monday 00a).';


--
-- Name: COLUMN contratas.razon_social; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratas.razon_social IS 'Razon social/legal; `nombre` es el nombre comercial de uso.';


--
-- Name: contratos_caes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contratos_caes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    operacion_caes_id uuid NOT NULL,
    tipo_contrato text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    vigente boolean DEFAULT true NOT NULL,
    cesionario text DEFAULT 'ecobalance'::text NOT NULL,
    representante_nombre text,
    representante_rol text,
    importe_total numeric(12,2),
    precio_unitario_kwh numeric,
    kwh_referencia numeric,
    firma_electronica boolean DEFAULT false NOT NULL,
    fecha_firma date,
    votado_en_junta boolean DEFAULT false NOT NULL,
    junta_id uuid,
    declaracion_financiacion_publica text,
    declaracion_exclusividad boolean DEFAULT false NOT NULL,
    documento_url text,
    estado text DEFAULT 'borrador'::text NOT NULL,
    notas text,
    CONSTRAINT contratos_caes_cesionario_check CHECK ((cesionario = 'ecobalance'::text)),
    CONSTRAINT contratos_caes_estado_check CHECK ((estado = ANY (ARRAY['borrador'::text, 'enviado'::text, 'firmado'::text, 're_firma_pendiente'::text, 'sustituido'::text]))),
    CONSTRAINT contratos_caes_tipo_contrato_check CHECK ((tipo_contrato = ANY (ARRAY['cesion_interna'::text, 'convenio_oficial'::text])))
);


--
-- Name: TABLE contratos_caes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contratos_caes IS 'Secuencia de contratos de una operacion: cesion_interna (valoracion estimada en la hoja de encargo, antes del proyecto) -> convenio_oficial (con el proyecto hecho, el que se registra al fin de obra). Con version para las re-firmas (convenios antiguos re-emitidos para reflejar el precio unitario por kWh que la ley ahora exige). No se borra el historico.';


--
-- Name: COLUMN contratos_caes.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.version IS 'Para las re-firmas: nueva version con vigente=true, la anterior a sustituido/vigente=false.';


--
-- Name: COLUMN contratos_caes.cesionario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.cesionario IS 'SIEMPRE ecobalance (dato explicito por claridad legal; el check solo admite ese valor). Accesalia nunca participa legalmente.';


--
-- Name: COLUMN contratos_caes.representante_rol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.representante_rol IS 'Rol de quien firma por la cedente (presidente/administrador). Texto libre.';


--
-- Name: COLUMN contratos_caes.precio_unitario_kwh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.precio_unitario_kwh IS 'Precio unitario EUR/kWh-ano (exigencia legal del convenio oficial).';


--
-- Name: COLUMN contratos_caes.kwh_referencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.kwh_referencia IS 'El ahorro que refleja ESTE contrato (el interno usa el estimado; el oficial, el que corresponda).';


--
-- Name: COLUMN contratos_caes.junta_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.junta_id IS 'Junta donde se voto (fase comercial), si reutilizable. Enlace blando; no se fuerza coherencia con el proceso_venta de la junta.';


--
-- Name: COLUMN contratos_caes.declaracion_financiacion_publica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.declaracion_financiacion_publica IS 'Lo declarado (subvenciones SOLICITADAS). Se guarda, NO se vigila el tope del 100% (es del registrador; ademas son solicitadas, no concedidas).';


--
-- Name: COLUMN contratos_caes.declaracion_exclusividad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.declaracion_exclusividad IS 'Declaracion responsable de no ceder los mismos ahorros a otro convenio CAE.';


--
-- Name: COLUMN contratos_caes.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contratos_caes.estado IS 'borrador -> enviado -> firmado; re_firma_pendiente (convenio antiguo sin precio unitario); sustituido (reemplazado por una version posterior).';


--
-- Name: convocatorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.convocatorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    entidad text NOT NULL,
    plan text NOT NULL,
    anio integer NOT NULL,
    fecha_apertura date,
    fecha_cierre date,
    antiguedad_maxima_obra_meses integer,
    notas_condiciones text
);


--
-- Name: TABLE convocatorias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.convocatorias IS 'Plantilla reutilizable de una convocatoria de subvencion (entidad, plan, anio y sus reglas). Una misma entidad puede tener varias convocatorias el mismo anio; por eso entidad y plan son campos separados.';


--
-- Name: COLUMN convocatorias.entidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.convocatorias.entidad IS 'Ej. "Ayuntamiento de Madrid", "Comunidad de Madrid", "Ayuntamiento de Leganes".';


--
-- Name: COLUMN convocatorias.plan; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.convocatorias.plan IS 'Ej. "Madrid Rehabilita", "Next Generation", "Plan barrio X".';


--
-- Name: COLUMN convocatorias.fecha_apertura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.convocatorias.fecha_apertura IS 'Enchufe de IA: avisar cuando se abre el plazo.';


--
-- Name: COLUMN convocatorias.fecha_cierre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.convocatorias.fecha_cierre IS 'Enchufe de IA: avisar antes de que cierre.';


--
-- Name: COLUMN convocatorias.antiguedad_maxima_obra_meses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.convocatorias.antiguedad_maxima_obra_meses IS 'Regla cotejable: no admite obras mas antiguas de X meses.';


--
-- Name: COLUMN convocatorias.notas_condiciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.convocatorias.notas_condiciones IS 'Otras reglas/baremos en texto por ahora (minusvalidos, mayores de 70, accesibilidad junto a eficiencia...). Se estructuraran mas adelante si hace falta.';


--
-- Name: destinatarios_informe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.destinatarios_informe (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid NOT NULL,
    tipo text DEFAULT 'otro'::text NOT NULL,
    nombre text,
    email text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT destinatarios_informe_tipo_check CHECK ((tipo = ANY (ARRAY['contrata'::text, 'administrador'::text, 'presidente'::text, 'otro'::text])))
);


--
-- Name: TABLE destinatarios_informe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.destinatarios_informe IS 'A quien se informa de las visitas de una comunidad (contrata, administrador, presidente, otros). Alimenta el envio del acta.';


--
-- Name: documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid,
    proyecto_id uuid,
    tipo_documento_id uuid NOT NULL,
    fecha_emision date,
    fecha_caducidad date,
    estado_firma text DEFAULT 'no_aplica'::text NOT NULL,
    url_fichero text,
    vigente boolean DEFAULT true NOT NULL,
    grupo_id uuid NOT NULL,
    n_version integer DEFAULT 1 NOT NULL,
    requerimiento_id uuid,
    justificacion text,
    naturaleza text DEFAULT 'migrado'::text NOT NULL,
    backend text,
    storage_ref text,
    origen_ruta_dropbox text,
    CONSTRAINT chk_documentos_comunidad_o_proyecto CHECK (((comunidad_id IS NOT NULL) OR (proyecto_id IS NOT NULL))),
    CONSTRAINT documentos_backend_check CHECK (((backend IS NULL) OR (backend = ANY (ARRAY['dropbox'::text, 'supabase'::text, 'r2'::text])))),
    CONSTRAINT documentos_estado_firma_check CHECK ((estado_firma = ANY (ARRAY['no_aplica'::text, 'generado'::text, 'enviado_a_firma'::text, 'devuelto_firmado'::text, 'validado'::text]))),
    CONSTRAINT documentos_naturaleza_check CHECK ((naturaleza = ANY (ARRAY['migrado'::text, 'subido'::text, 'generado_app'::text])))
);


--
-- Name: TABLE documentos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.documentos IS 'Documentos de la comunidad o del proyecto. Pertenecen al nucleo; subvenciones los referencia. Si el proyecto tecnico cambia, los expedientes que lo usaban pueden detectar que su documento quedo obsoleto.';


--
-- Name: COLUMN documentos.comunidad_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.comunidad_id IS 'Cuelga de la comunidad (ej. DNI del presidente). Nullable, pero el check exige comunidad_id o proyecto_id.';


--
-- Name: COLUMN documentos.proyecto_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.proyecto_id IS 'Cuelga del proyecto (ej. proyecto tecnico del ascensor). Nullable, pero el check exige comunidad_id o proyecto_id.';


--
-- Name: COLUMN documentos.fecha_caducidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.fecha_caducidad IS 'Solo aplica a los tipos que caducan (tipos_documento.caduca = true).';


--
-- Name: COLUMN documentos.estado_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.estado_firma IS 'Flujo de documentos mixtos que Accesalia genera y la comunidad firma. Los que no requieren firma quedan en no_aplica.';


--
-- Name: COLUMN documentos.url_fichero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.url_fichero IS 'Enlace al archivo real (Dropbox u otro). Se rellenara en fase futura; por ahora puede ir vacio.';


--
-- Name: COLUMN documentos.vigente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.vigente IS 'Esta version es la VIGENTE de su grupo = la que entra en el REFUNDIDO. Una sola vigente por grupo.';


--
-- Name: COLUMN documentos.grupo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.grupo_id IS 'Documento LOGICO: todas las versiones de un mismo doc (p.ej. la memoria del proyecto X) comparten grupo_id. La v1 usa su propio id como grupo.';


--
-- Name: COLUMN documentos.n_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.n_version IS 'Numero de version dentro del grupo (1,2,3...).';


--
-- Name: COLUMN documentos.requerimiento_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.requerimiento_id IS 'El requerimiento de tramitacion (ayto/ecu) que provoco esta version. Null = version original.';


--
-- Name: COLUMN documentos.justificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.justificacion IS 'Por que cambio (obligatorio si la version nace de un requerimiento).';


--
-- Name: COLUMN documentos.naturaleza; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.naturaleza IS 'migrado (backfill Dropbox) | subido (a mano) | generado_app (nace en la app).';


--
-- Name: COLUMN documentos.backend; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.backend IS 'Donde vive el fichero: dropbox (enlace, historico) | supabase | r2.';


--
-- Name: COLUMN documentos.storage_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.storage_ref IS 'Ruta/clave/url en el backend (ns_path de Dropbox, key de Storage, etc.).';


--
-- Name: COLUMN documentos.origen_ruta_dropbox; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documentos.origen_ruta_dropbox IS 'Ruta original en Dropbox (auditoria de migracion).';


--
-- Name: CONSTRAINT chk_documentos_comunidad_o_proyecto ON documentos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_documentos_comunidad_o_proyecto ON public.documentos IS 'Al menos uno de comunidad_id o proyecto_id debe estar relleno.';


--
-- Name: empresas_compradoras_caes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresas_compradoras_caes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    nif text,
    notas text,
    activa boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE empresas_compradoras_caes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.empresas_compradoras_caes IS 'Catalogo ligero de empresas (sujetos obligados/delegados) que compran CAES. Mercado abierto: mas de una, con ofertas que varian en el tiempo.';


--
-- Name: equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    es_arquitecto boolean,
    titulacion text,
    activo boolean DEFAULT true NOT NULL,
    notas text
);


--
-- Name: TABLE equipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.equipo IS 'Directorio general del personal de Accesalia (perfiles). No RRHH sensible: sin nominas ni DNI.';


--
-- Name: COLUMN equipo.es_arquitecto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.equipo.es_arquitecto IS 'Flag que decide quien firma / hace proyecto. null = sin confirmar.';


--
-- Name: equipo_funciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipo_funciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    equipo_id uuid NOT NULL,
    funcion_id uuid NOT NULL,
    notas text
);


--
-- Name: TABLE equipo_funciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.equipo_funciones IS 'Que funciones cubre cada persona (N:M). Una persona cubre varias y cambian con el tiempo.';


--
-- Name: escaneos_polycam; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escaneos_polycam (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proceso_venta_id uuid NOT NULL,
    enlace_dropbox text,
    fecha_escaneo date,
    arquitecto_revisor_id uuid,
    viabilidad_resultado text,
    solucion text,
    modelo_escalera_id uuid,
    informe_texto text,
    CONSTRAINT escaneos_polycam_solucion_check CHECK ((solucion = ANY (ARRAY['derribo_escalera'::text, 'exterior_calle'::text, 'exterior_patio'::text, 'recorte_escalera'::text, 'otra'::text]))),
    CONSTRAINT escaneos_polycam_viabilidad_resultado_check CHECK ((viabilidad_resultado = ANY (ARRAY['viable'::text, 'inviable'::text])))
);


--
-- Name: TABLE escaneos_polycam; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.escaneos_polycam IS '3D INTERNO de viabilidad. El comercial escanea el portal con Polycam (iPhone) y sube el modelo a Dropbox para que el arquitecto evalue que cabe sin desplazarse. De aqui sale el informe de viabilidad.';


--
-- Name: COLUMN escaneos_polycam.arquitecto_revisor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.escaneos_polycam.arquitecto_revisor_id IS 'Arquitecto que revisa (FK a tecnicos, Fase 3).';


--
-- Name: COLUMN escaneos_polycam.viabilidad_resultado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.escaneos_polycam.viabilidad_resultado IS 'viable | inviable.';


--
-- Name: COLUMN escaneos_polycam.solucion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.escaneos_polycam.solucion IS 'Gran modelo para ascensor: derribo_escalera, exterior_calle, exterior_patio, recorte_escalera, otra.';


--
-- Name: COLUMN escaneos_polycam.modelo_escalera_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.escaneos_polycam.modelo_escalera_id IS 'Cuando la solucion es recorte_escalera: cual de los modelos de escalera (FK a modelos_escalera).';


--
-- Name: COLUMN escaneos_polycam.informe_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.escaneos_polycam.informe_texto IS 'Texto libre integro del informe de viabilidad.';


--
-- Name: etapas_proyecto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etapas_proyecto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    tipo_etapa text NOT NULL,
    orden integer NOT NULL,
    responsable_tecnico_id uuid,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    fecha_estado timestamp with time zone,
    fecha_inicio date,
    fecha_fin date,
    notas text,
    licencia_via text,
    licencia_modalidad text,
    tasas_estado text,
    tasas_fecha_solicitud date,
    tasas_fecha_pago date,
    responsable_nombre text,
    fecha_prevista date,
    CONSTRAINT etapas_proyecto_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'en_curso'::text, 'terminada'::text, 'reabierta'::text, 'no_aplica'::text]))),
    CONSTRAINT etapas_proyecto_licencia_modalidad_check CHECK ((licencia_modalidad = ANY (ARRAY['licencia'::text, 'declaracion_responsable'::text]))),
    CONSTRAINT etapas_proyecto_licencia_via_check CHECK ((licencia_via = ANY (ARRAY['ayuntamiento'::text, 'ecu'::text]))),
    CONSTRAINT etapas_proyecto_tasas_estado_check CHECK ((tasas_estado = ANY (ARRAY['no_solicitadas'::text, 'solicitadas'::text, 'pendiente_pago_comunidad'::text, 'pagadas'::text, 'justificante_reenviado'::text])))
);


--
-- Name: TABLE etapas_proyecto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.etapas_proyecto IS 'Lista flexible de etapas de la tramitacion tecnica de un proyecto. No es una linea recta: una etapa puede reabrirse por un requerimiento. Lista inicial derivada de la operativa real; pensada para afinarse (p. ej. catalogo por tipo de proyecto) sin rehacer el modelo. El estado-resumen global sigue en proyectos.estado.';


--
-- Name: COLUMN etapas_proyecto.tipo_etapa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.tipo_etapa IS 'Clave del paso (escaneo, montaje_nube, estado_actual, proyecto...). Catalogo vivo en pasos_catalogo.';


--
-- Name: COLUMN etapas_proyecto.orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.orden IS 'Posicion de la etapa en la secuencia, para ordenar y reordenar.';


--
-- Name: COLUMN etapas_proyecto.responsable_tecnico_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.responsable_tecnico_id IS 'Tecnico a cargo de esta etapa. Puede variar entre etapas del mismo proyecto.';


--
-- Name: COLUMN etapas_proyecto.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.estado IS 'pendiente | en_curso | terminada | reabierta (p.ej. re-escaneo) | no_aplica.';


--
-- Name: COLUMN etapas_proyecto.fecha_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.fecha_estado IS 'Enchufe de IA: cuando entro en el estado actual (para "lleva X en este estado").';


--
-- Name: COLUMN etapas_proyecto.licencia_via; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.licencia_via IS 'Solo etapa solicitud_licencia. Via de tramitacion: ayuntamiento o ecu.';


--
-- Name: COLUMN etapas_proyecto.licencia_modalidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.licencia_modalidad IS 'Solo etapa solicitud_licencia. Modalidad: licencia o declaracion_responsable. (via x modalidad = arbol de 4 combinaciones).';


--
-- Name: COLUMN etapas_proyecto.tasas_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.tasas_estado IS 'Solo etapa solicitud_licencia. Ciclo bloqueante de tasas: no_solicitadas -> solicitadas -> pendiente_pago_comunidad -> pagadas -> justificante_reenviado. Sin pagadas/justificante_reenviado no avanza la licencia.';


--
-- Name: COLUMN etapas_proyecto.tasas_fecha_solicitud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.tasas_fecha_solicitud IS 'Enchufe de IA: avisar si se solicitaron tasas y no hay respuesta.';


--
-- Name: COLUMN etapas_proyecto.responsable_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.etapas_proyecto.responsable_nombre IS 'Nombre crudo de Monday. responsable_tecnico_id enlaza a equipo solo cuando la identidad es clara (grafia distinta = persona distinta).';


--
-- Name: expedientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expedientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid NOT NULL,
    proyecto_id uuid,
    convocatoria_id uuid NOT NULL,
    estado text DEFAULT 'preparando'::text NOT NULL,
    fecha_estado timestamp with time zone,
    fecha_presentacion date,
    importe_solicitado numeric,
    importe_concedido numeric,
    fecha_cobro_comunidad date,
    CONSTRAINT expedientes_estado_check CHECK ((estado = ANY (ARRAY['preparando'::text, 'presentado'::text, 'requerido'::text, 'concedido'::text, 'denegado'::text, 'cobrado'::text])))
);


--
-- Name: TABLE expedientes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.expedientes IS 'Una comunidad presentandose a una convocatoria concreta. Aqui vive el historico multi-anio: la misma comunidad puede tener varios expedientes a lo largo del tiempo.';


--
-- Name: COLUMN expedientes.proyecto_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expedientes.proyecto_id IS 'La obra a la que se refiere la subvencion (nullable).';


--
-- Name: COLUMN expedientes.fecha_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expedientes.fecha_estado IS 'Enchufe de IA: cuando entro en el estado actual.';


--
-- Name: COLUMN expedientes.importe_concedido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expedientes.importe_concedido IS 'Base sobre la que Accesalia factura su 3% de exito.';


--
-- Name: COLUMN expedientes.fecha_cobro_comunidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.expedientes.fecha_cobro_comunidad IS 'Cuando cobro la comunidad; dispara la facturacion del 3%.';


--
-- Name: extracciones_convocatoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extracciones_convocatoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    convocatoria_id uuid NOT NULL,
    url_pdf_convocatoria text,
    convocatoria_ejemplo_id uuid,
    modelo_ia text,
    num_ejemplos_usados integer,
    borrador_prompt1 jsonb,
    borrador_prompt2 jsonb,
    explicacion_prompt1 text,
    explicacion_prompt2 text,
    estado text DEFAULT 'borrador'::text NOT NULL,
    fecha_extraccion timestamp with time zone,
    fecha_validacion timestamp with time zone,
    validado_por uuid,
    notas text,
    CONSTRAINT extracciones_convocatoria_estado_check CHECK ((estado = ANY (ARRAY['procesando'::text, 'borrador'::text, 'en_revision'::text, 'validada'::text, 'descartada'::text, 'error'::text])))
);


--
-- Name: TABLE extracciones_convocatoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.extracciones_convocatoria IS 'Artefactos de la extraccion IA de una convocatoria + su validacion humana. Una fila por convocatoria (borrador que evoluciona a validada, conservando el crudo). El resultado validado se materializa en requisitos_convocatoria + condiciones_convocatoria.';


--
-- Name: COLUMN extracciones_convocatoria.url_pdf_convocatoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.extracciones_convocatoria.url_pdf_convocatoria IS 'Enlace al PDF original de la convocatoria (BOE/boletin), en Storage. Trazabilidad.';


--
-- Name: COLUMN extracciones_convocatoria.convocatoria_ejemplo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.extracciones_convocatoria.convocatoria_ejemplo_id IS 'Convocatoria anterior (misma linea/entidad) usada como ejemplo few-shot, si se uso.';


--
-- Name: COLUMN extracciones_convocatoria.num_ejemplos_usados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.extracciones_convocatoria.num_ejemplos_usados IS 'Cuantos ejemplos resueltos se pasaron a la IA (calibracion: 0/1/2). Por defecto 1; mas ejemplos NO es mas fiable.';


--
-- Name: COLUMN extracciones_convocatoria.borrador_prompt1; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.extracciones_convocatoria.borrador_prompt1 IS 'Salida cruda del prompt 1 (requisitos_a_cumplir + documentacion_necesaria). Se conserva ademas de la version validada.';


--
-- Name: COLUMN extracciones_convocatoria.borrador_prompt2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.extracciones_convocatoria.borrador_prompt2 IS 'Salida cruda del prompt 2 (estructura_completitud de cada documento).';


--
-- Name: COLUMN extracciones_convocatoria.explicacion_prompt1; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.extracciones_convocatoria.explicacion_prompt1 IS 'AUDITORIA: que entendio, que extrajo y como decidio el prompt 1.';


--
-- Name: COLUMN extracciones_convocatoria.explicacion_prompt2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.extracciones_convocatoria.explicacion_prompt2 IS 'AUDITORIA: que entendio, que extrajo y como decidio el prompt 2 (modelado de casillas).';


--
-- Name: COLUMN extracciones_convocatoria.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.extracciones_convocatoria.estado IS 'borrador -> en_revision -> validada | descartada. Al validar, un humano ha revisado y corregido; pasa a ser la plantilla oficial de la convocatoria.';


--
-- Name: facturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    hoja_encargo_id uuid NOT NULL,
    hito_facturacion_id uuid,
    numero_factura text NOT NULL,
    fecha_emision date NOT NULL,
    receptor_nombre text NOT NULL,
    receptor_nif text,
    base_imponible numeric(12,2) NOT NULL,
    iva_porcentaje numeric(5,2) DEFAULT 21.00 NOT NULL,
    iva_importe numeric(12,2) NOT NULL,
    irpf_porcentaje numeric(5,2),
    irpf_importe numeric(12,2),
    total numeric(12,2) NOT NULL,
    url_pdf text
);


--
-- Name: TABLE facturas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.facturas IS 'Registro de facturas ya emitidas en Factusol (la web no las genera). Una factura se corresponde normalmente con un hito cobrado (o con varios conceptos de una hoja).';


--
-- Name: COLUMN facturas.hito_facturacion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas.hito_facturacion_id IS 'El hito que materializa, si aplica (nullable).';


--
-- Name: COLUMN facturas.numero_factura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas.numero_factura IS 'Numero correlativo de Factusol (ej. "1-000209").';


--
-- Name: COLUMN facturas.receptor_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas.receptor_nombre IS 'A quien se emitio (comunidad o contrata); se copia tal cual figura en la factura.';


--
-- Name: COLUMN facturas.iva_porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas.iva_porcentaje IS 'IVA siempre 21% en Accesalia (nunca reducido).';


--
-- Name: COLUMN facturas.irpf_porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas.irpf_porcentaje IS 'Relleno solo cuando el emisor de la hoja es daniel_autonomo.';


--
-- Name: COLUMN facturas.irpf_importe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas.irpf_importe IS 'Relleno solo cuando el emisor de la hoja es daniel_autonomo.';


--
-- Name: COLUMN facturas.url_pdf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas.url_pdf IS 'Enlace al PDF de la factura de Factusol.';


--
-- Name: facturas_caes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facturas_caes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    operacion_caes_id uuid NOT NULL,
    numero_factura text,
    fecha_emision date,
    empresa_receptor_nombre text,
    empresa_receptor_nif text,
    base_imponible numeric(12,2),
    iva_porcentaje numeric(5,2) DEFAULT 21.00 NOT NULL,
    iva_importe numeric(12,2),
    total numeric(12,2),
    documento_url text,
    estado_cobro text DEFAULT 'pendiente'::text NOT NULL,
    fecha_cobro date,
    CONSTRAINT facturas_caes_estado_cobro_check CHECK ((estado_cobro = ANY (ARRAY['pendiente'::text, 'cobrada'::text, 'cobrada_parcial'::text, 'incobrable'::text])))
);


--
-- Name: TABLE facturas_caes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.facturas_caes IS 'Registro (no emision) de la factura CAES a la empresa compradora. Factusol emite; aqui solo se registra y controla (espejo del registro de facturas de Accesalia). Ecobalance factura con IVA a la empresa.';


--
-- Name: COLUMN facturas_caes.estado_cobro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.facturas_caes.estado_cobro IS 'pendiente | cobrada | cobrada_parcial | incobrable. Los pagos salientes del reparto se llevan en beneficiarios_reparto_caes.estado_pago.';


--
-- Name: fases_obra_catalogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fases_obra_catalogo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    tipo_actuacion text NOT NULL,
    nombre_fase text NOT NULL,
    orden integer NOT NULL,
    criticidad text NOT NULL,
    dias_desde_inicio_aprox integer,
    notas text,
    CONSTRAINT fases_obra_catalogo_criticidad_check CHECK ((criticidad = ANY (ARRAY['alta'::text, 'media'::text, 'baja'::text]))),
    CONSTRAINT fases_obra_catalogo_tipo_actuacion_check CHECK ((tipo_actuacion = ANY (ARRAY['ascensor'::text, 'rampa'::text, 'sate_completo'::text, 'sate_fachada'::text, 'sate_cubierta'::text, 'mixto'::text, 'otra'::text])))
);


--
-- Name: TABLE fases_obra_catalogo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fases_obra_catalogo IS 'Catalogo de las fases tipicas de cada tipo de obra, con cadencia y criticidad. Alimenta el futuro calculo del calendario optimo de visitas (IA). En esta fase se crea la estructura; las fases concretas se rellenan despues, con el criterio de quien hace las visitas. No se inventan las cadencias.';


--
-- Name: COLUMN fases_obra_catalogo.tipo_actuacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fases_obra_catalogo.tipo_actuacion IS 'Mismos valores que proyectos.tipo_actuacion.';


--
-- Name: COLUMN fases_obra_catalogo.nombre_fase; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fases_obra_catalogo.nombre_fase IS 'Ej. "apertura de foso", "montera", "remates SATE".';


--
-- Name: COLUMN fases_obra_catalogo.orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fases_obra_catalogo.orden IS 'Posicion en la secuencia tipica.';


--
-- Name: COLUMN fases_obra_catalogo.criticidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fases_obra_catalogo.criticidad IS 'alta = momento critico que exige visita (foso, remates); baja = poca atencion (espera de maquina).';


--
-- Name: COLUMN fases_obra_catalogo.dias_desde_inicio_aprox; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fases_obra_catalogo.dias_desde_inicio_aprox IS 'Estimacion de cuando llega esta fase desde el inicio, para proyectar visitas.';


--
-- Name: fotos_acta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fotos_acta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    visita_id uuid NOT NULL,
    storage_path text NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    pie text
);


--
-- Name: TABLE fotos_acta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fotos_acta IS 'Fotos de una visita de obra (bucket actas). Se muestran en la galeria del acta generada.';


--
-- Name: funciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    clave text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    orden integer,
    activa boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE funciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.funciones IS 'Catalogo editable de funciones/areas que cubre el personal. Evoluciona por mejora continua (no se hardcodea, no es variable por proyecto).';


--
-- Name: gestiones_cobro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gestiones_cobro (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    hito_cobro_id uuid NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    tipo text DEFAULT 'otro'::text NOT NULL,
    resultado text,
    notas text,
    CONSTRAINT gestiones_cobro_tipo_check CHECK ((tipo = ANY (ARRAY['email'::text, 'llamada'::text, 'carta'::text, 'visita'::text, 'otro'::text])))
);


--
-- Name: TABLE gestiones_cobro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.gestiones_cobro IS 'Registro de gestiones para cobrar un hito (mail/llamada/carta). Alimenta las alertas de persecucion.';


--
-- Name: hitos_cobro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hitos_cobro (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    linea_facturacion_id uuid NOT NULL,
    hito text NOT NULL,
    orden integer,
    porcentaje numeric,
    importe numeric,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    numero_factura text,
    numero_abono text,
    fecha_factura date,
    fecha_vencimiento date,
    fecha_cobro date,
    gastos_devolucion numeric,
    notas text,
    url_factura_pdf text,
    CONSTRAINT hitos_cobro_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'facturado'::text, 'cobrado'::text, 'devuelto'::text, 'anulado'::text]))),
    CONSTRAINT hitos_cobro_hito_check CHECK ((hito = ANY (ARRAY['firma'::text, 'encargo'::text, 'entrega'::text, 'licencia'::text, 'cfo'::text, 'concesion'::text, 'otro'::text])))
);


--
-- Name: TABLE hitos_cobro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hitos_cobro IS 'Plan de pago de una linea: hitos con % o importe. Estado no monotono: cobrado puede pasar a devuelto (cargo devuelto) o anulado (factura de abono).';


--
-- Name: COLUMN hitos_cobro.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hitos_cobro.estado IS 'pendiente->facturado->cobrado; reversibles: devuelto (cargo devuelto por banco) y anulado (via factura de abono).';


--
-- Name: COLUMN hitos_cobro.url_factura_pdf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hitos_cobro.url_factura_pdf IS 'Copia del PDF de la factura emitida en Factusol (Storage). La app NO emite la factura fiscal: la registra y guarda el PDF.';


--
-- Name: hitos_comerciales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hitos_comerciales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clave text NOT NULL,
    nombre text NOT NULL,
    orden integer NOT NULL,
    es_ramal boolean DEFAULT false NOT NULL,
    aplicable_por_defecto boolean DEFAULT true NOT NULL,
    responsable_rol text
);


--
-- Name: TABLE hitos_comerciales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hitos_comerciales IS 'Catalogo/vocabulario de hitos del pipeline comercial. Ordenado; es_ramal para el 3D (cuelga de junta). Editable.';


--
-- Name: hitos_facturacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hitos_facturacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    hoja_encargo_id uuid NOT NULL,
    descripcion text NOT NULL,
    disparador text NOT NULL,
    porcentaje numeric(5,2),
    importe_previsto numeric(12,2),
    fecha_prevista date,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    fecha_estado timestamp with time zone,
    CONSTRAINT hitos_facturacion_disparador_check CHECK ((disparador = ANY (ARRAY['a_firma'::text, 'a_entrega_proyecto'::text, 'al_cfo'::text, 'fecha_fija'::text, 'a_exito_subvencion'::text, 'otro'::text]))),
    CONSTRAINT hitos_facturacion_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'facturado'::text, 'cobrado'::text, 'parcialmente_cobrado'::text, 'incobrable'::text])))
);


--
-- Name: TABLE hitos_facturacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hitos_facturacion IS 'Los pagos pactados de una hoja (plan pactado). Libres y variables (tipico 50% firma / 50% entrega, pero muy variable). Los cobros reales van en cobros y pueden fraccionar un hito sin alterarlo.';


--
-- Name: COLUMN hitos_facturacion.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hitos_facturacion.descripcion IS 'Ej. "50% a la firma", "3er tercio", "50% al CFO".';


--
-- Name: COLUMN hitos_facturacion.disparador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hitos_facturacion.disparador IS 'Que evento activa el cobro. a_exito_subvencion queda PREVISTO para el 3,5%; su automatizacion se conecta en el futuro con el area de subvenciones.';


--
-- Name: COLUMN hitos_facturacion.porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hitos_facturacion.porcentaje IS 'Si el hito se expresa como % del total (5.00 = 5%).';


--
-- Name: COLUMN hitos_facturacion.importe_previsto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hitos_facturacion.importe_previsto IS 'Importe esperado del hito (base, sin IVA).';


--
-- Name: COLUMN hitos_facturacion.fecha_prevista; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hitos_facturacion.fecha_prevista IS 'Para disparador fecha_fija o estimacion.';


--
-- Name: COLUMN hitos_facturacion.fecha_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hitos_facturacion.fecha_estado IS 'Enchufe de IA: alertar de hitos facturados y no cobrados hace mucho.';


--
-- Name: hitos_oportunidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hitos_oportunidad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    oportunidad_id uuid NOT NULL,
    hito text NOT NULL,
    aplicable boolean DEFAULT true NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    fecha date,
    responsable_id uuid,
    enlace_url text,
    notas text,
    CONSTRAINT hitos_oportunidad_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'en_curso'::text, 'hecho'::text, 'no_aplica'::text])))
);


--
-- Name: TABLE hitos_oportunidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hitos_oportunidad IS 'Instancia de los hitos para una oportunidad. La barra se deriva de aqui (primer aplicable no hecho). responsable_id (equipo) para ver bloqueos; enlace_url para el Dropbox.';


--
-- Name: hojas_encargo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hojas_encargo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid NOT NULL,
    pagador_tipo text NOT NULL,
    pagador_contrata_id uuid,
    emisor text NOT NULL,
    numero_hoja text,
    fecha_creacion date NOT NULL,
    fecha_firma date,
    vigencia_meses integer DEFAULT 3 NOT NULL,
    canal_tarifa text,
    estado text DEFAULT 'borrador'::text NOT NULL,
    fecha_estado timestamp with time zone,
    generada_por text,
    proceso_venta_id uuid,
    version_firmada_id uuid,
    descripcion text,
    comercial_interno text,
    quien_lo_trae text,
    oportunidad_id uuid,
    CONSTRAINT chk_hojas_encargo_pagador CHECK ((((pagador_tipo = 'contrata'::text) AND (pagador_contrata_id IS NOT NULL)) OR ((pagador_tipo = 'comunidad'::text) AND (pagador_contrata_id IS NULL)))),
    CONSTRAINT hojas_encargo_canal_tarifa_check CHECK ((canal_tarifa = ANY (ARRAY['convenio_contratista'::text, 'directo_comunidad'::text, 'condiciones_especiales'::text]))),
    CONSTRAINT hojas_encargo_emisor_check CHECK ((emisor = ANY (ARRAY['accesalia'::text, 'daniel_autonomo'::text]))),
    CONSTRAINT hojas_encargo_estado_check CHECK ((estado = ANY (ARRAY['borrador'::text, 'pendiente_firma_daniel'::text, 'firmada_daniel'::text, 'enviada_comunidad'::text, 'cambios_solicitados'::text, 'rechazada'::text, 'devuelta_firmada'::text, 'archivada'::text, 'anulada'::text]))),
    CONSTRAINT hojas_encargo_generada_por_check CHECK ((generada_por = ANY (ARRAY['secretaria_comercial'::text, 'comercial'::text]))),
    CONSTRAINT hojas_encargo_pagador_tipo_check CHECK ((pagador_tipo = ANY (ARRAY['comunidad'::text, 'contrata'::text])))
);


--
-- Name: TABLE hojas_encargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hojas_encargo IS 'Documento contractual (firmado por el cliente): prueba de que se contrato y garantia de cobro. Pertenece a una comunidad; emisor y pagador se fijan aqui para toda la hoja. La relacion con proyectos se resuelve a nivel de concepto (una hoja puede referirse a varios proyectos).';


--
-- Name: COLUMN hojas_encargo.pagador_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.pagador_tipo IS 'Quien paga esta hoja: normalmente la comunidad, excepcionalmente una contrata.';


--
-- Name: COLUMN hojas_encargo.pagador_contrata_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.pagador_contrata_id IS 'Relleno solo si pagador_tipo = contrata (ej. Schindler, Fain). El check exige coherencia con pagador_tipo.';


--
-- Name: COLUMN hojas_encargo.emisor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.emisor IS 'Quien factura la hoja ENTERA (Accesalia S.L. o Daniel autonomo). Nunca cambia dentro de una hoja. Si es daniel_autonomo, sus facturas llevan IRPF.';


--
-- Name: COLUMN hojas_encargo.numero_hoja; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.numero_hoja IS 'Referencia interna de la hoja de encargo, si se usa.';


--
-- Name: COLUMN hojas_encargo.fecha_creacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.fecha_creacion IS 'Fecha de la hoja.';


--
-- Name: COLUMN hojas_encargo.fecha_firma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.fecha_firma IS 'Fecha de recepcion de la version FIRMADA por la comunidad. Fecha clave: a partir de aqui la comunidad reclama -> alerta de arrancar.';


--
-- Name: COLUMN hojas_encargo.vigencia_meses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.vigencia_meses IS 'Vigencia teorica de la hoja; informativa, no bloqueante.';


--
-- Name: COLUMN hojas_encargo.canal_tarifa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.canal_tarifa IS 'Via comercial por la que se pacto. Util para analisis de rentabilidad por canal.';


--
-- Name: COLUMN hojas_encargo.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.estado IS 'Ciclo de vida de la hoja como DOCUMENTO (una sola maquina): borrador -> pendiente_firma_daniel -> firmada_daniel (Daniel valida precios y firma elec) -> enviada_comunidad -> [cambios_solicitados | rechazada | devuelta_firmada] -> archivada; anulada = baja interna. El pipeline comercial vive en procesos_venta; las fechas por transicion en hojas_encargo_estado_historial.';


--
-- Name: COLUMN hojas_encargo.fecha_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.fecha_estado IS 'Enchufe de IA: cuando entro en el estado actual.';


--
-- Name: COLUMN hojas_encargo.generada_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.generada_por IS 'Quien genera la hoja: secretaria_comercial (para un comercial) o comercial (para el otro). En ambos casos debe validarla/firmarla Daniel antes de salir.';


--
-- Name: COLUMN hojas_encargo.proceso_venta_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.proceso_venta_id IS 'Enlace de la venta con la hoja (proceso de venta que la origino).';


--
-- Name: COLUMN hojas_encargo.version_firmada_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.version_firmada_id IS 'Version concreta que la comunidad firmo. Comparar con la ultima version enviada: si no coinciden -> alerta "firmaron una version vieja".';


--
-- Name: COLUMN hojas_encargo.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.descripcion IS 'Texto libre de la actuacion de la hoja (Excel/Monday TIPOPROYECTO). Describe la obra/servicio concreto ("instalacion de ascensor", "reparacion de cornisa"...). Materia prima para la IA.';


--
-- Name: COLUMN hojas_encargo.comercial_interno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.comercial_interno IS 'Quien de Accesalia gestiona el encargo (Monday "Comercial interno"). Nivel hoja; la comision por concepto se modela aparte.';


--
-- Name: COLUMN hojas_encargo.quien_lo_trae; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.quien_lo_trae IS 'Referente externo que trae el encargo y comisiona (Monday "0Quien lo trae"). Nivel hoja hasta modelar comision por concepto.';


--
-- Name: COLUMN hojas_encargo.oportunidad_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.hojas_encargo.oportunidad_id IS 'La oportunidad (proceso comercial) que agrupa esta hoja. Una oportunidad tiene 1..n hojas (subvencion siempre en la suya). Sustituye a carpeta_id.';


--
-- Name: CONSTRAINT chk_hojas_encargo_pagador ON hojas_encargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT chk_hojas_encargo_pagador ON public.hojas_encargo IS 'Coherencia pagador: contrata => pagador_contrata_id no nulo; comunidad => nulo.';


--
-- Name: hojas_encargo_estado_historial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hojas_encargo_estado_historial (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    hoja_encargo_id uuid NOT NULL,
    estado text NOT NULL,
    fecha_estado timestamp with time zone DEFAULT now() NOT NULL,
    notas text
);


--
-- Name: TABLE hojas_encargo_estado_historial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hojas_encargo_estado_historial IS 'Historial de transiciones de estado de una hoja (append-only). Cada fila = "entro en el estado X el dia Y". Motor de las alertas de seguimiento (enviada hace N dias, parada por Daniel, cambios pendientes, firmada hay que arrancar...). Un estado puede repetirse (cambios -> reenvio -> mas cambios).';


--
-- Name: incidencias_obra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidencias_obra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    obra_id uuid NOT NULL,
    visita_obra_id uuid,
    descripcion text NOT NULL,
    tipo text NOT NULL,
    requiere_rehacer_proyecto boolean DEFAULT false NOT NULL,
    es_precio_contradictorio boolean DEFAULT false NOT NULL,
    importe_contradictorio numeric(12,2),
    estado text DEFAULT 'abierta'::text NOT NULL,
    fecha_deteccion date,
    fecha_resolucion date,
    CONSTRAINT incidencias_obra_estado_check CHECK ((estado = ANY (ARRAY['abierta'::text, 'en_resolucion'::text, 'resuelta'::text]))),
    CONSTRAINT incidencias_obra_tipo_check CHECK ((tipo = ANY (ARRAY['imprevisto_ejecucion'::text, 'dano_a_vivienda'::text, 'hallazgo_estructural'::text, 'paralizacion'::text, 'derribo'::text, 'otro'::text])))
);


--
-- Name: TABLE incidencias_obra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.incidencias_obra IS 'Lo que surge mal o imprevisto durante la obra (fuga al picar, viga maestra en el foso, trastero afectado). Puede obligar a rehacer parte del proyecto. Si conlleva coste no presupuestado, es un precio contradictorio.';


--
-- Name: COLUMN incidencias_obra.visita_obra_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.incidencias_obra.visita_obra_id IS 'La visita en que se detecto (nullable).';


--
-- Name: COLUMN incidencias_obra.requiere_rehacer_proyecto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.incidencias_obra.requiere_rehacer_proyecto IS 'Si obliga a trabajo de arquitecto (recalculo, replanteo).';


--
-- Name: COLUMN incidencias_obra.es_precio_contradictorio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.incidencias_obra.es_precio_contradictorio IS 'Si conlleva una partida economica no presupuestada.';


--
-- Name: COLUMN incidencias_obra.importe_contradictorio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.incidencias_obra.importe_contradictorio IS 'Importe de la partida, si aplica; para la consolidacion final de facturacion (cierre_obra).';


--
-- Name: instrucciones_obra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instrucciones_obra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    obra_id uuid NOT NULL,
    visita_obra_id uuid,
    descripcion text NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    fecha_orden date,
    fecha_comprobacion date,
    bloquea_cfo boolean DEFAULT true NOT NULL,
    CONSTRAINT instrucciones_obra_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'hecho'::text, 'falta_por_hacer'::text, 'no_comprobado'::text])))
);


--
-- Name: TABLE instrucciones_obra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.instrucciones_obra IS 'Ordenes/subsanaciones que la direccion facultativa da a la contrata. Se arrastran de una visita a la siguiente hasta cerrarse. Son las que bloquean el CFO (no se emite mientras queden subsanaciones abiertas que bloqueen).';


--
-- Name: COLUMN instrucciones_obra.visita_obra_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrucciones_obra.visita_obra_id IS 'La visita en que se ordeno por primera vez (nullable).';


--
-- Name: COLUMN instrucciones_obra.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrucciones_obra.descripcion IS 'La orden concreta (ej. "modificar el liston de esquina en planta baja").';


--
-- Name: COLUMN instrucciones_obra.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrucciones_obra.estado IS 'Seguimiento visita a visita tal como aparece en las actas: pendiente, hecho, falta_por_hacer, no_comprobado.';


--
-- Name: COLUMN instrucciones_obra.fecha_comprobacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrucciones_obra.fecha_comprobacion IS 'Ultima vez que se comprobo su estado.';


--
-- Name: COLUMN instrucciones_obra.bloquea_cfo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrucciones_obra.bloquea_cfo IS 'Si estar abierta impide emitir el CFO.';


--
-- Name: interaccion_comunidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interaccion_comunidad (
    interaccion_id uuid NOT NULL,
    comunidad_id uuid NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    origen text DEFAULT 'ia'::text NOT NULL,
    CONSTRAINT interaccion_comunidad_origen_check CHECK ((origen = ANY (ARRAY['ia'::text, 'humano'::text])))
);


--
-- Name: TABLE interaccion_comunidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interaccion_comunidad IS 'Puente N:M interaccion<->comunidad (solo punteros). Permite que el expediente de una comunidad muestre las interacciones que la mencionan SIN duplicar el texto crudo, que vive una sola vez en interacciones.';


--
-- Name: interacciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interacciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    oportunidad_id uuid,
    comercial_id uuid,
    administrador_id uuid,
    transcripcion text NOT NULL,
    origen text NOT NULL,
    fecha_evento date,
    tipo_evento text,
    estado_deja text,
    requiere_humano boolean DEFAULT false NOT NULL,
    motivo_requiere_humano text,
    pendiente_vincular boolean DEFAULT false NOT NULL,
    extraccion jsonb,
    extraccion_estado text DEFAULT 'sin_procesar'::text NOT NULL,
    CONSTRAINT interacciones_extraccion_estado_check CHECK ((extraccion_estado = ANY (ARRAY['sin_procesar'::text, 'propuesta'::text, 'validada'::text, 'descartada'::text]))),
    CONSTRAINT interacciones_origen_check CHECK ((origen = ANY (ARRAY['nota_voz'::text, 'manual'::text, 'mail'::text, 'llamada'::text, 'visita'::text]))),
    CONSTRAINT interacciones_tipo_evento_check CHECK ((tipo_evento = ANY (ARRAY['resultado_junta'::text, 'seguimiento'::text, 'llamada_administrador'::text, 'envio_documentos'::text, 'otro'::text])))
);


--
-- Name: TABLE interacciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.interacciones IS 'Bitacora/columna vertebral del seguimiento; destino de la nota de voz interpretada por IA. Guarda el texto integro Y los datos extraidos. La transcripcion nunca se pierde aunque no se extraiga nada estructurado.';


--
-- Name: COLUMN interacciones.oportunidad_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interacciones.oportunidad_id IS 'Nullable: si la IA no logro casar la interaccion, queda en bandeja (pendiente_vincular).';


--
-- Name: COLUMN interacciones.transcripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interacciones.transcripcion IS 'Texto libre integro de la nota de voz. NUNCA se pierde.';


--
-- Name: COLUMN interacciones.fecha_evento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interacciones.fecha_evento IS 'Fecha NORMALIZADA del hecho ("ayer" resuelto). Distinta de creado_en (cuando se grabo/registro). Es la que usa la IA para calcular dias.';


--
-- Name: COLUMN interacciones.estado_deja; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interacciones.estado_deja IS 'El estado/espera que deja en el pipeline, si la IA lo infiere (ej. "a la espera de que el presidente decida").';


--
-- Name: COLUMN interacciones.requiere_humano; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interacciones.requiere_humano IS 'La IA marca el apunte cuando no puede resolverlo con seguridad. Bandeja de trabajo.';


--
-- Name: COLUMN interacciones.motivo_requiere_humano; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interacciones.motivo_requiere_humano IS 'Motivo, para que una persona lo aclare sin reescuchar la nota (ej. "3 administradores llamados Adolfo", "fecha imprecisa").';


--
-- Name: COLUMN interacciones.pendiente_vincular; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interacciones.pendiente_vincular IS 'La IA no logro casar la interaccion con una oportunidad/administrador existentes. Bandeja para casar a mano en vez de descartar.';


--
-- Name: COLUMN interacciones.extraccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.interacciones.extraccion IS 'Propuesta estructurada de la IA (JSON por esquema): items del abanico + resumen. Se valida por un humano antes de materializar en las tablas reales.';


--
-- Name: juntas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.juntas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proceso_venta_id uuid,
    fecha_junta date,
    celebrada boolean DEFAULT false NOT NULL,
    resultado text DEFAULT 'pendiente'::text NOT NULL,
    resultado_detalle text,
    requiere_seguimiento boolean DEFAULT false NOT NULL,
    seguimiento_desde timestamp with time zone,
    oportunidad_id uuid,
    CONSTRAINT juntas_ambito_check CHECK (((proceso_venta_id IS NOT NULL) OR (oportunidad_id IS NOT NULL))),
    CONSTRAINT juntas_resultado_check CHECK ((resultado = ANY (ARRAY['pendiente'::text, 'favorable'::text, 'desfavorable'::text, 'aplazada'::text, 'piden_mas_presupuestos'::text, 'complicacion'::text])))
);


--
-- Name: TABLE juntas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.juntas IS 'Juntas de vecinos de un proceso de venta. Puede complicarse (piden mas presupuestos -> segunda junta; el vecino del bajo no quiere -> demanda). Tras la junta hay un impas que exige seguimiento.';


--
-- Name: COLUMN juntas.resultado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.juntas.resultado IS 'complicacion cubre demanda del bajo, etc.';


--
-- Name: COLUMN juntas.resultado_detalle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.juntas.resultado_detalle IS 'Texto libre integro del resultado.';


--
-- Name: COLUMN juntas.seguimiento_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.juntas.seguimiento_desde IS 'Para la alerta "fuimos a junta y no sabemos que paso / hay que llamar".';


--
-- Name: licencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    estado text DEFAULT 'pendiente_definir'::text NOT NULL,
    tipo_tramite text,
    tramitada_por text DEFAULT 'nosotros'::text NOT NULL,
    organismo text,
    tecnico_ayto text,
    fecha_registro_ayto date,
    fecha_aprobacion date,
    enlace_doc text,
    tasa_licencia_aplica boolean,
    tasa_licencia_importe numeric(10,2),
    icio_aplica boolean,
    icio_bonificacion boolean DEFAULT false NOT NULL,
    icio_importe numeric(10,2),
    residuos_aplica boolean,
    residuos_importe numeric(10,2),
    inicio_dr_autorizado text,
    espera_subvencion boolean DEFAULT false NOT NULL,
    tramita_equipo_id uuid,
    pausado boolean DEFAULT false NOT NULL,
    notas text,
    CONSTRAINT licencias_estado_check CHECK ((estado = ANY (ARRAY['pendiente_definir'::text, 'compromiso'::text, 'solicitada'::text, 'requerido'::text, 'aprobada'::text]))),
    CONSTRAINT licencias_inicio_dr_check CHECK (((inicio_dr_autorizado IS NULL) OR (inicio_dr_autorizado = ANY (ARRAY['ok_verbal'::text, 'ok_escrito'::text, 'exencion_firmada'::text])))),
    CONSTRAINT licencias_tipo_tramite_check CHECK (((tipo_tramite IS NULL) OR (tipo_tramite = ANY (ARRAY['licencia'::text, 'dr'::text, 'consulta_urbanistica'::text, 'orden_ejecucion_ite'::text])))),
    CONSTRAINT licencias_tramitada_por_check CHECK ((tramitada_por = ANY (ARRAY['nosotros'::text, 'ellos'::text])))
);


--
-- Name: TABLE licencias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.licencias IS 'Licencias/DR de obra (ayto o ECU). 1 proyecto -> N (por si se re-tramita). Guarda hechos: tipo, fechas, tasas, doc. El calculo de tasas (PEM%) y el sistema de requerimientos van aparte.';


--
-- Name: COLUMN licencias.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licencias.estado IS 'pendiente_definir (licencia o DR sin decidir) -> compromiso (espera subvencion) -> solicitada -> (requerido) -> aprobada.';


--
-- Name: COLUMN licencias.tipo_tramite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licencias.tipo_tramite IS 'Que se presenta: licencia | dr | consulta_urbanistica | orden_ejecucion_ite. La modalidad planeada vive en proyectos.modalidad_licencia.';


--
-- Name: COLUMN licencias.inicio_dr_autorizado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licencias.inicio_dr_autorizado IS 'Gate DR: que permite arrancar obra por DR -> ok_verbal | ok_escrito (del tecnico del ayto) | exencion_firmada (comunidad/contrata asumen el riesgo).';


--
-- Name: licitaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licitaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    paquete text DEFAULT 'unico'::text NOT NULL,
    comercial_id uuid,
    junta_id uuid,
    estado text DEFAULT 'abierta'::text NOT NULL,
    estado_desde timestamp with time zone DEFAULT now() NOT NULL,
    esperando_de text,
    esperando_desde timestamp with time zone,
    notas text,
    acta_votacion_enlace text,
    fecha_votacion date,
    informe_adecuacion_enlace text,
    CONSTRAINT licitaciones_estado_check CHECK ((estado = ANY (ARRAY['abierta'::text, 'presupuestos_recibidos'::text, 'homogeneizando'::text, 'a_junta'::text, 'adjudicada'::text, 'desierta'::text, 'cancelada'::text]))),
    CONSTRAINT licitaciones_paquete_check CHECK ((paquete = ANY (ARRAY['unico'::text, 'sate'::text, 'accesibilidad'::text, 'otro'::text])))
);


--
-- Name: TABLE licitaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.licitaciones IS 'Una licitacion por proyecto (unidad = proyecto completo, no oficios sueltos). En obra mixta (SATE + accesibilidad), dos licitaciones separadas sobre el mismo proyecto, una por paquete global. Correcciones de presupuesto se llevan en el estado del presupuesto, no creando licitaciones nuevas.';


--
-- Name: COLUMN licitaciones.paquete; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.paquete IS 'Normalmente unico. En obra mixta: sate y accesibilidad (el que hace SATE no suele ser el ascensorista).';


--
-- Name: COLUMN licitaciones.comercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.comercial_id IS 'Comercial que gestiona la licitacion y acompana a la junta (es labor comercial, no del arquitecto).';


--
-- Name: COLUMN licitaciones.junta_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.junta_id IS 'Junta (fase comercial) donde se votaron los 3 presupuestos, si aplica. ENCAJE: no se fuerza coherencia entre el proceso_venta de la junta y el proyecto de la licitacion (ramas distintas); enlace blando. Edge no modelado: si piden mas presupuestos y hay 2a junta, aqui solo cabe una (ampliar si hace falta).';


--
-- Name: COLUMN licitaciones.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.estado IS 'abierta -> presupuestos_recibidos -> homogeneizando -> a_junta -> adjudicada | desierta | cancelada.';


--
-- Name: COLUMN licitaciones.estado_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.estado_desde IS 'Fecha de entrada al estado (materia prima de alertas).';


--
-- Name: COLUMN licitaciones.esperando_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.esperando_de IS 'A la espera de quien (ej. contrata que no entrega presupuesto, o convocar junta).';


--
-- Name: COLUMN licitaciones.esperando_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.esperando_desde IS 'Desde cuando se espera (indexado para alertas).';


--
-- Name: COLUMN licitaciones.acta_votacion_enlace; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.acta_votacion_enlace IS 'Acta de la junta donde la comunidad voto/adjudico. Regla dura de subvencion.';


--
-- Name: COLUMN licitaciones.fecha_votacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.fecha_votacion IS 'Fecha de la junta de votacion/adjudicacion.';


--
-- Name: COLUMN licitaciones.informe_adecuacion_enlace; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.licitaciones.informe_adecuacion_enlace IS 'Informe de adecuacion: traduce el analisis comparativo de ofertas a lenguaje para la comunidad. El generador llega despues.';


--
-- Name: lineas_facturacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lineas_facturacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    hoja_encargo_id uuid NOT NULL,
    concepto_hoja_id uuid,
    bloque_id uuid,
    descripcion text,
    importe numeric,
    es_porcentaje boolean DEFAULT false NOT NULL,
    porcentaje numeric,
    base_porcentaje text,
    pagador_contrata_id uuid,
    notas text,
    origen text DEFAULT 'manual'::text NOT NULL,
    verificado boolean DEFAULT false NOT NULL,
    emisor text DEFAULT 'accesalia'::text NOT NULL,
    CONSTRAINT lineas_facturacion_emisor_check CHECK ((emisor = ANY (ARRAY['accesalia'::text, 'ecobalance'::text, 'daniel_autonomo'::text])))
);


--
-- Name: TABLE lineas_facturacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lineas_facturacion IS 'Una linea por concepto facturable de una hoja: importe fijo o % (PRG). El pagador puede ser una contrata (FAIN).';


--
-- Name: COLUMN lineas_facturacion.origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lineas_facturacion.origen IS 'De donde sale la linea: monday_texto (estimado), pdf (fuente de verdad), manual.';


--
-- Name: COLUMN lineas_facturacion.verificado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lineas_facturacion.verificado IS 'True cuando el importe/desglose esta confirmado con el PDF firmado.';


--
-- Name: COLUMN lineas_facturacion.emisor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lineas_facturacion.emisor IS 'Empresa emisora = eje FISCAL y de SEGREGACION de acceso. accesalia/daniel_autonomo -> ambito Alexandra; ecobalance -> ambito Ana (CAES/comisiones). Derivable por tipo. Todo emisor=ecobalance es invisible al ambito Accesalia.';


--
-- Name: migracion_monday; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migracion_monday (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    board text NOT NULL,
    monday_item_id text NOT NULL,
    tabla_destino text NOT NULL,
    registro_id uuid NOT NULL,
    notas text
);


--
-- Name: TABLE migracion_monday; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.migracion_monday IS 'Andamiaje de migracion Monday->Accesalia: correlacion item de Monday <-> registro nuestro, para recasar por id en imports incrementales. Borrable al terminar la migracion sin afectar a negocio.';


--
-- Name: COLUMN migracion_monday.board; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migracion_monday.board IS 'Nombre del tablero Monday de origen (ej. "0 LISTADO DE DIRECCIONES", "01a ADMINISTRACIONES DE FINCAS").';


--
-- Name: COLUMN migracion_monday.monday_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migracion_monday.monday_item_id IS 'ID del item en Monday (llave de correlacion).';


--
-- Name: COLUMN migracion_monday.tabla_destino; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migracion_monday.tabla_destino IS 'Tabla nuestra donde vive el registro (ej. "comunidades", "administraciones_fincas").';


--
-- Name: COLUMN migracion_monday.registro_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.migracion_monday.registro_id IS 'uuid de nuestro registro. Especifico de esta base (local/nube).';


--
-- Name: modelos_3d_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modelos_3d_venta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proceso_venta_id uuid,
    junta_id uuid,
    tipo_3d text NOT NULL,
    a_medida boolean,
    tecnico_id uuid,
    fecha_solicitud timestamp with time zone,
    fecha_necesaria date,
    fecha_entrega timestamp with time zone,
    estado text DEFAULT 'pedido'::text NOT NULL,
    oportunidad_id uuid,
    de_catalogo boolean DEFAULT false NOT NULL,
    modelo_escalera_id uuid,
    CONSTRAINT modelos_3d_venta_ambito_check CHECK (((proceso_venta_id IS NOT NULL) OR (junta_id IS NOT NULL) OR (oportunidad_id IS NOT NULL))),
    CONSTRAINT modelos_3d_venta_estado_check CHECK ((estado = ANY (ARRAY['pedido'::text, 'en_curso'::text, 'listo'::text, 'entregado'::text]))),
    CONSTRAINT modelos_3d_venta_tipo_3d_check CHECK ((tipo_3d = ANY (ARRAY['generico_escalera'::text, 'a_medida'::text, 'diseno_portal'::text])))
);


--
-- Name: TABLE modelos_3d_venta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.modelos_3d_venta IS '3D EXTERNO de venta (SketchUp) para que la comunidad visualice como quedara el portal. Supera la barrera de credibilidad. Consume tiempo de tecnico. Se modela con fechas y estado para alertas: a produccion (deadline), al comercial ("tu 3D esta listo") y a la IA (retrasos). Modelarlo permite vigilar abusos de 3D a medida.';


--
-- Name: COLUMN modelos_3d_venta.tipo_3d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_3d_venta.tipo_3d IS 'generico_escalera (reutiliza el 3D generico del modelo de escalera) | a_medida (~30% de casos, desarrollado ex profeso) | diseno_portal (3D estetico, 2-3 opciones para votar).';


--
-- Name: COLUMN modelos_3d_venta.a_medida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_3d_venta.a_medida IS 'Redundante con tipo_3d pero comodo para consultas de coste; opcional.';


--
-- Name: COLUMN modelos_3d_venta.fecha_solicitud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_3d_venta.fecha_solicitud IS 'Cuando lo pidio el comercial.';


--
-- Name: COLUMN modelos_3d_venta.fecha_necesaria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_3d_venta.fecha_necesaria IS 'Para cuando (la junta). Indexado para alertas.';


--
-- Name: COLUMN modelos_3d_venta.de_catalogo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_3d_venta.de_catalogo IS 'true = 3D de catalogo (ya existe, listo al instante, sin recursos). false = especifico/a medida (lo hace un tecnico: ciclo pedido->listo, vigilar fecha_necesaria=junta).';


--
-- Name: COLUMN modelos_3d_venta.modelo_escalera_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_3d_venta.modelo_escalera_id IS 'Cuando tipo_3d = generico_escalera: cual del catalogo (modelos_escalera) se reutiliza. Vacio para a_medida/diseno_portal.';


--
-- Name: modelos_escalera; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modelos_escalera (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    notas text,
    orden integer,
    activo boolean DEFAULT true NOT NULL,
    tiene_video boolean DEFAULT false NOT NULL,
    tiene_plano boolean DEFAULT false NOT NULL,
    n_renders integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE modelos_escalera; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.modelos_escalera IS 'Catalogo de modelos 3D GENERICOS de venta (biblioteca reutilizable de tipos de solucion). Antes era solo un catalogo ligero de nombres para recorte_escalera; ahora ademas porta los assets (video/renders/plano) para el visor. Cada fila = un tipo generico (JEAN "Ascensor Tipo N"). Se contrapone al 3D a medida por portal (modelos_3d_venta). Catalogo abierto/editable: el nombre comercial de cada tipo se afina en la app.';


--
-- Name: COLUMN modelos_escalera.orden; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_escalera.orden IS 'Orden de presentacion en la rejilla del catalogo.';


--
-- Name: COLUMN modelos_escalera.activo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_escalera.activo IS 'Si el tipo se muestra en el catalogo (catalogo vivo).';


--
-- Name: COLUMN modelos_escalera.tiene_video; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_escalera.tiene_video IS 'true si existe catalogo-venta/{codigo}/video.mp4 (+ poster.jpg). Lo fija la subida de assets.';


--
-- Name: COLUMN modelos_escalera.tiene_plano; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_escalera.tiene_plano IS 'true si existe catalogo-venta/{codigo}/plano.pdf. Lo fija la subida de assets.';


--
-- Name: COLUMN modelos_escalera.n_renders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.modelos_escalera.n_renders IS 'Numero de renders en catalogo-venta/{codigo}/renders/rNN.webp (r01..rNN). Lo fija la subida de assets.';


--
-- Name: negociacion_oportunidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.negociacion_oportunidad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    oportunidad_id uuid NOT NULL,
    que_vendemos text,
    precio numeric(12,2),
    alcance text,
    notas text,
    comercial_id uuid
);


--
-- Name: TABLE negociacion_oportunidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.negociacion_oportunidad IS 'Historico de la negociacion: que se vende y a que precio (y alcance), que cambia en el tiempo. La oferta VIGENTE = la fila mas reciente. Al firmar, la vigente pasa a la hoja de encargo.';


--
-- Name: obras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.obras (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    estado text DEFAULT 'pendiente_inicio'::text NOT NULL,
    fecha_estado timestamp with time zone,
    fecha_apertura_centro_trabajo date,
    fecha_acta_inicio date,
    fecha_fin_obra date,
    jefe_obra text,
    plazo_ejecucion_meses integer,
    url_acta_inicio text,
    url_apertura_centro text,
    constructora_contrata_id uuid,
    constructora text,
    css_contratado boolean DEFAULT false NOT NULL,
    pss_aprobado boolean DEFAULT false NOT NULL,
    coordinador_css_equipo_id uuid,
    coordinador_css_nombre text,
    cfo_estado text,
    fecha_cfo_a_visar date,
    fecha_cfo_visado date,
    cfo_visado_id uuid,
    notas text,
    cadencia_dias integer,
    CONSTRAINT obras_cfo_estado_check CHECK (((cfo_estado IS NULL) OR (cfo_estado = ANY (ARRAY['a_visar'::text, 'visado'::text, 'no_procede'::text])))),
    CONSTRAINT obras_estado_check CHECK ((estado = ANY (ARRAY['pendiente_inicio'::text, 'en_curso'::text, 'paralizada'::text, 'finalizada'::text, 'cancelada'::text, 'no_procede'::text])))
);


--
-- Name: TABLE obras; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.obras IS 'Ejecucion fisica de un proyecto. Se crea al concederse la licencia (Fase 3), en estado pendiente_inicio, aunque el arranque real puede tardar semanas o meses (contrata sin cuadrilla, espera de subvencion/financiacion, recurso de un vecino).';


--
-- Name: COLUMN obras.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.estado IS 'pendiente_inicio -> en_curso (seguimiento) -> finalizada (fin de obra). Overlays: paralizada, cancelada, no_procede.';


--
-- Name: COLUMN obras.fecha_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.fecha_estado IS 'Enchufe de IA: cuando entro en el estado actual (para "licencia concedida hace X y obra sin iniciar", "paralizada hace X").';


--
-- Name: COLUMN obras.fecha_apertura_centro_trabajo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.fecha_apertura_centro_trabajo IS 'Tramite con la contrata ante la autoridad laboral.';


--
-- Name: COLUMN obras.fecha_acta_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.fecha_acta_inicio IS 'Acta de replanteo/comienzo (Ley 38/1999). Marca el arranque real de la obra.';


--
-- Name: COLUMN obras.jefe_obra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.jefe_obra IS 'Persona de la contrata al frente (ej. "Jose Olivares").';


--
-- Name: COLUMN obras.plazo_ejecucion_meses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.plazo_ejecucion_meses IS 'Plazo previsto, para detectar retrasos.';


--
-- Name: COLUMN obras.constructora_contrata_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.constructora_contrata_id IS 'La contrata que ejecuta (ficha en contratas). constructora guarda el nombre crudo si no empata.';


--
-- Name: COLUMN obras.css_contratado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.css_contratado IS 'Gate de inicio: coordinador de seguridad y salud contratado.';


--
-- Name: COLUMN obras.pss_aprobado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.pss_aprobado IS 'Gate de inicio: plan de seguridad y salud aprobado. Junto al acta de inicio y la apertura de centro de trabajo, arranca la obra.';


--
-- Name: COLUMN obras.cfo_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.cfo_estado IS 'Certificado final de obra: a_visar (metido a visar) | visado (CFO visado descargado) | no_procede. El CFO se visa -> genera un visado momento=fin_obra (cfo_visado_id).';


--
-- Name: COLUMN obras.cadencia_dias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.obras.cadencia_dias IS 'Dias esperados entre visitas de obra, para avisar si se espacian demasiado. Nulo = sin cadencia definida.';


--
-- Name: ofertas_caes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ofertas_caes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    operacion_caes_id uuid NOT NULL,
    empresa_nombre text NOT NULL,
    empresa_id uuid,
    precio_unitario_kwh numeric,
    importe_ofertado numeric(12,2),
    fecha_oferta date,
    estado text DEFAULT 'recibida'::text NOT NULL,
    notas text,
    CONSTRAINT ofertas_caes_estado_check CHECK ((estado = ANY (ARRAY['recibida'::text, 'aceptada'::text, 'rechazada'::text, 'caducada'::text])))
);


--
-- Name: TABLE ofertas_caes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ofertas_caes IS 'Ofertas de empresas por los CAES de una operacion. Solo se puede aceptar/vender con la operacion en cee_final_registrado (candado). Registrar las ofertas permite quedarse con la mejor y dejar traza.';


--
-- Name: COLUMN ofertas_caes.empresa_nombre; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ofertas_caes.empresa_nombre IS 'El sujeto obligado/delegado (texto siempre presente).';


--
-- Name: COLUMN ofertas_caes.empresa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ofertas_caes.empresa_id IS 'FK opcional al catalogo empresas_compradoras_caes si la empresa esta fichada.';


--
-- Name: operaciones_caes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operaciones_caes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid NOT NULL,
    proyecto_id uuid,
    proyecto_externo_descripcion text,
    via_entrada text NOT NULL,
    hoja_encargo_id uuid,
    referencia_catastral text,
    tipo_actuacion text,
    estado text DEFAULT 'ofrecida'::text NOT NULL,
    estado_desde timestamp with time zone DEFAULT now() NOT NULL,
    esperando_de text,
    esperando_desde timestamp with time zone,
    kwh_inicial numeric,
    kwh_estimado numeric,
    kwh_final numeric,
    notas text,
    CONSTRAINT operaciones_caes_estado_check CHECK ((estado = ANY (ARRAY['ofrecida'::text, 'cesion_interna_firmada'::text, 'convenio_oficial_firmado'::text, 'en_obra'::text, 'cee_final_registrado'::text, 'en_oferta'::text, 'vendida'::text, 'registrada'::text, 'facturada'::text, 'cobrada'::text, 'repartida'::text, 'cancelada'::text]))),
    CONSTRAINT operaciones_caes_via_entrada_check CHECK ((via_entrada = ANY (ARRAY['descuento_al_firmar'::text, 'compra'::text])))
);


--
-- Name: TABLE operaciones_caes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.operaciones_caes IS 'Unidad central e INDIVISIBLE: una operacion = UN convenio con UNA comunidad por UNA obra. No hay paquetes. Puede ser interna (proyecto de Accesalia) o externa (~10%, sin proyecto_id).';


--
-- Name: COLUMN operaciones_caes.proyecto_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.proyecto_id IS 'Nullable: operaciones externas (proyecto de otro arquitecto/empresa) no tienen proyecto interno.';


--
-- Name: COLUMN operaciones_caes.proyecto_externo_descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.proyecto_externo_descripcion IS 'Cuando es externa: de quien/que obra.';


--
-- Name: COLUMN operaciones_caes.via_entrada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.via_entrada IS 'descuento_al_firmar (la comunidad cede sus CAES como descuento en honorarios al firmar el proyecto) | compra (a una comunidad que ya hizo la obra; puede entrar en cualquier punto del flujo).';


--
-- Name: COLUMN operaciones_caes.hoja_encargo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.hoja_encargo_id IS 'Cuando entro como descuento_al_firmar, la hoja donde se pacto la cesion interna. ENCAJE: enlace opcional; la cesion interna en si es un contratos_caes tipo cesion_interna. Solo aplica a via descuento_al_firmar.';


--
-- Name: COLUMN operaciones_caes.tipo_actuacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.tipo_actuacion IS 'Actuacion estandarizada (ej. RES010). Texto libre.';


--
-- Name: COLUMN operaciones_caes.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.estado IS 'Flujo: ofrecida -> cesion_interna_firmada -> convenio_oficial_firmado -> en_obra -> cee_final_registrado (CANDADO: sin esto no hay venta) -> en_oferta -> vendida -> registrada -> facturada -> cobrada -> repartida | cancelada.';


--
-- Name: COLUMN operaciones_caes.esperando_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.esperando_desde IS 'Materia prima de alertas (indexado): "convenio firmado hace X sin CEE final", "vendida sin facturar".';


--
-- Name: COLUMN operaciones_caes.kwh_inicial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.kwh_inicial IS 'Preliminar, cesion interna antes de proyecto ("a groso modo").';


--
-- Name: COLUMN operaciones_caes.kwh_estimado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.kwh_estimado IS 'Del CEE durante la elaboracion del proyecto.';


--
-- Name: COLUMN operaciones_caes.kwh_final; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.operaciones_caes.kwh_final IS 'Del certificado final al fin de obra, tras resolver requerimientos de CAES (que pueden modificarlo).';


--
-- Name: oportunidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oportunidades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    administrador_id uuid,
    comunidad_id uuid,
    comunidad_provisional text,
    comercial_id uuid,
    tipo_origen text DEFAULT 'otro'::text NOT NULL,
    oportunidad_origen_id uuid,
    contrata_origen_id uuid,
    origen_notas text,
    estado text DEFAULT 'activa'::text NOT NULL,
    notas text,
    persona_comunidad_id uuid,
    reactivar_nota text,
    reactivar_fecha date,
    reactivar_convocatoria_criterio text,
    CONSTRAINT oportunidades_estado_check CHECK ((estado = ANY (ARRAY['activa'::text, 'latente'::text]))),
    CONSTRAINT oportunidades_tipo_origen_check CHECK ((tipo_origen = ANY (ARRAY['administrador_conocido'::text, 'puerta_fria'::text, 'web'::text, 'boca_a_boca'::text, 'contrata'::text, 'otro'::text])))
);


--
-- Name: TABLE oportunidades; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.oportunidades IS 'Entidad duradera y reactivable, corazon de la fase comercial. NO se cierra (o casi nunca): puede generar encargos diferidos en meses/anos y ser origen de otra oportunidad (boca a boca). A lo sumo queda latente.';


--
-- Name: COLUMN oportunidades.administrador_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.administrador_id IS 'Nullable: excepcion rara pero real (comunidad pequena autogestionada sin administrador de fincas).';


--
-- Name: COLUMN oportunidades.comunidad_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.comunidad_id IS 'La comunidad real del nucleo si YA existe. Puede ser nueva y no estar dada de alta todavia (usar comunidad_provisional).';


--
-- Name: COLUMN oportunidades.comunidad_provisional; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.comunidad_provisional IS 'Datos de la comunidad mientras no se materializa como registro del nucleo. Al firmar+cobrar se materializa como comunidad/proyecto (logica de conversion fuera de alcance).';


--
-- Name: COLUMN oportunidades.comercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.comercial_id IS 'Heredado del administrador (su comercial dueno), pero almacenado aqui para consulta directa y para el caso sin administrador.';


--
-- Name: COLUMN oportunidades.oportunidad_origen_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.oportunidad_origen_id IS 'Auto-referencia: cuando esta oportunidad nace de otra (Mayor 35 -> Mayor 37; presidente que deriva a su cunado).';


--
-- Name: COLUMN oportunidades.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.estado IS 'activa | latente (sin nada abierto ahora, reactivable). No hay estado cerrada/muerta.';


--
-- Name: COLUMN oportunidades.persona_comunidad_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.persona_comunidad_id IS 'Interlocutor de la comunidad (vecino/presidente) cuando el contacto comercial NO es un administrador. Nullable; se usa junto con administrador_id nullable (comunidad autogestionada).';


--
-- Name: COLUMN oportunidades.reactivar_nota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.reactivar_nota IS 'Cierre aplazado: por que/cuando retomar ("cuando hagan hucha", "cuando resuelvan el juicio del local"). Sali lo extrae de la nota de voz.';


--
-- Name: COLUMN oportunidades.reactivar_fecha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.reactivar_fecha IS 'Cierre aplazado con fecha: dispara alerta determinista (motor parametros_alerta) al llegar.';


--
-- Name: COLUMN oportunidades.reactivar_convocatoria_criterio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.oportunidades.reactivar_convocatoria_criterio IS 'Cierre aplazado ligado a subvencion: criterio de convocatoria que se espera (ej. "accesibilidad Comunidad de Madrid"). Al abrirse una convocatoria que encaje (modulo subvenciones), salta la alerta de reactivacion.';


--
-- Name: parametros_alerta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parametros_alerta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    clave text NOT NULL,
    nombre text NOT NULL,
    valor numeric NOT NULL,
    unidad text DEFAULT 'dias'::text NOT NULL,
    descripcion text,
    orden integer,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT parametros_alerta_unidad_check CHECK ((unidad = ANY (ARRAY['dias'::text, 'horas'::text])))
);


--
-- Name: TABLE parametros_alerta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.parametros_alerta IS 'Umbrales editables de las alertas deterministas del comercial (dias/horas). Defaults sensatos, ajustables desde la app. Las alertas cualitativas las hace Sali (no viven aqui).';


--
-- Name: COLUMN parametros_alerta.valor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.parametros_alerta.valor IS 'El umbral numerico. Se interpreta con unidad (dias|horas).';


--
-- Name: pasos_catalogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pasos_catalogo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    clave text NOT NULL,
    nombre text NOT NULL,
    orden integer,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE pasos_catalogo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pasos_catalogo IS 'Catalogo editable de los pasos de produccion (evoluciona por mejora continua). etapas_proyecto.tipo_etapa referencia su clave.';


--
-- Name: personal_interno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_interno (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    apellidos text,
    rol text NOT NULL,
    area text,
    email text,
    telefono text,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT personal_interno_area_check CHECK ((area = ANY (ARRAY['subvenciones'::text, 'comercial'::text, 'obra'::text, 'tramitacion'::text, 'requerimientos'::text, 'administracion'::text, 'direccion'::text, 'general'::text, 'otro'::text]))),
    CONSTRAINT personal_interno_rol_check CHECK ((rol = ANY (ARRAY['arquitecto'::text, 'arquitecto_tecnico'::text, 'delineante'::text, 'administrativo'::text, 'comercial'::text, 'direccion'::text, 'otro'::text])))
);


--
-- Name: TABLE personal_interno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.personal_interno IS 'Personal interno de Accesalia (base para auth/RLS y para atribuir conocimiento_operativo). Se solapa con tecnicos/comerciales; reconciliacion futura.';


--
-- Name: COLUMN personal_interno.area; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personal_interno.area IS 'Area principal de la persona. De ella se INFIERE el area de sus aportes en conocimiento_operativo (no se pide el area al escribir un tip).';


--
-- Name: personas_comunidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas_comunidad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid NOT NULL,
    nombre text NOT NULL,
    rol text DEFAULT 'vecino'::text NOT NULL,
    telefono text,
    email text,
    es_contacto_principal boolean DEFAULT false NOT NULL,
    notas text,
    documento text,
    CONSTRAINT personas_comunidad_rol_check CHECK ((rol = ANY (ARRAY['presidente'::text, 'vicepresidente'::text, 'secretario'::text, 'vecino'::text, 'otro'::text])))
);


--
-- Name: TABLE personas_comunidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.personas_comunidad IS 'Personas de la comunidad como CONTACTO comercial cuando no es el administrador de fincas (presidente, vecino proactivo...). Caso raro; tipico en comunidades autogestionadas. Cuelga de la comunidad; no forma parte de la cartera de administradores.';


--
-- Name: COLUMN personas_comunidad.rol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personas_comunidad.rol IS 'presidente | vicepresidente | secretario | vecino | otro.';


--
-- Name: COLUMN personas_comunidad.es_contacto_principal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personas_comunidad.es_contacto_principal IS 'true = interlocutor principal de la comunidad cuando no hay administrador.';


--
-- Name: COLUMN personas_comunidad.notas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personas_comunidad.notas IS 'Texto libre.';


--
-- Name: COLUMN personas_comunidad.documento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.personas_comunidad.documento IS 'DNI/NIE de la persona (tipico: el del presidente, que firma). Texto libre; no se valida formato.';


--
-- Name: plan_pago_historial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_pago_historial (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    hoja_encargo_id uuid NOT NULL,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    motivo text,
    snapshot_anterior jsonb,
    notas text
);


--
-- Name: TABLE plan_pago_historial; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.plan_pago_historial IS 'Cada renegociacion del plan de pago (importes/hitos) de una hoja ya firmada: guarda el snapshot anterior. Los hitos ya cobrados no se tocan.';


--
-- Name: presupuestos_licitacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presupuestos_licitacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    licitacion_id uuid NOT NULL,
    contrata_id uuid,
    contrata_externa_nombre text,
    origen text DEFAULT 'invitada_por_nosotros'::text NOT NULL,
    rol_pretendido text DEFAULT 'na'::text NOT NULL,
    importe_pem numeric,
    estado text DEFAULT 'invitada'::text NOT NULL,
    estado_desde timestamp with time zone DEFAULT now() NOT NULL,
    notas text,
    firmado_contrata boolean DEFAULT false NOT NULL,
    firmado_comunidad boolean DEFAULT false NOT NULL,
    enlace_documento text,
    fecha_presupuesto date,
    CONSTRAINT presupuestos_licitacion_estado_check CHECK ((estado = ANY (ARRAY['invitada'::text, 'presupuestado'::text, 'correccion_pedida'::text, 'homogeneizado'::text, 'a_junta'::text, 'adjudicada'::text, 'no_adjudicada'::text, 'retirada'::text]))),
    CONSTRAINT presupuestos_licitacion_identidad_check CHECK (((contrata_id IS NOT NULL) OR (contrata_externa_nombre IS NOT NULL))),
    CONSTRAINT presupuestos_licitacion_origen_check CHECK ((origen = ANY (ARRAY['invitada_por_nosotros'::text, 'aportada_por_comunidad'::text]))),
    CONSTRAINT presupuestos_licitacion_rol_pretendido_check CHECK ((rol_pretendido = ANY (ARRAY['preferida'::text, 'palanca'::text, 'na'::text]))),
    CONSTRAINT presupuestos_licitacion_rol_solo_invitadas_check CHECK (((origen = 'invitada_por_nosotros'::text) OR (rol_pretendido = 'na'::text)))
);


--
-- Name: TABLE presupuestos_licitacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.presupuestos_licitacion IS 'Cada invitacion/oferta de una licitacion. Una fila por contrata invitada o por presupuesto aportado por la comunidad. La comision si sale adjudicada NO se guarda aqui: vive en proyecto_contratas (se materializa/actualiza al adjudicar).';


--
-- Name: COLUMN presupuestos_licitacion.contrata_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.contrata_id IS 'Nullable: un presupuesto aportado por la comunidad puede ser de una contrata no fichada (usar contrata_externa_nombre).';


--
-- Name: COLUMN presupuestos_licitacion.origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.origen IS 'invitada_por_nosotros (cuenta para nuestro balance con esa contrata) | aportada_por_comunidad (no cuenta en el balance, pero puede ser el adjudicatario final).';


--
-- Name: COLUMN presupuestos_licitacion.rol_pretendido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.rol_pretendido IS 'NUESTRA intencion, independiente del resultado: preferida (la que queremos que gane) | palanca (acompanamiento honesto para cubrir el expediente de 3 presupuestos) | na. Distinguir palanca evita que la IA lea una invitacion-palanca como "le paso obra y no gana".';


--
-- Name: COLUMN presupuestos_licitacion.importe_pem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.importe_pem IS 'PEM que presupuesto (Presupuesto de Ejecucion Material, sin IVA ni GG+BI), para comparar ofertas y para historico.';


--
-- Name: COLUMN presupuestos_licitacion.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.estado IS 'invitada -> presupuestado -> correccion_pedida -> homogeneizado -> a_junta -> adjudicada | no_adjudicada | retirada. La decision final es SIEMPRE de la comunidad (independiente de rol_pretendido).';


--
-- Name: COLUMN presupuestos_licitacion.firmado_contrata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.firmado_contrata IS 'La contrata firma su presupuesto. Regla dura de subvencion: SIEMPRE firmados por la contrata.';


--
-- Name: COLUMN presupuestos_licitacion.firmado_comunidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.firmado_comunidad IS 'Solo el ganador: la comunidad firma la oferta adjudicada (ademas del acta de votacion).';


--
-- Name: COLUMN presupuestos_licitacion.enlace_documento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.enlace_documento IS 'Enlace al PDF/BC3 original del presupuesto (Dropbox/Drive/Storage). El desglose por partidas llega en la capa siguiente.';


--
-- Name: COLUMN presupuestos_licitacion.fecha_presupuesto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.presupuestos_licitacion.fecha_presupuesto IS 'Fecha del presupuesto de la contrata.';


--
-- Name: procesos_venta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procesos_venta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    oportunidad_id uuid NOT NULL,
    tipo_servicio_id uuid NOT NULL,
    comercial_id uuid,
    estado text DEFAULT 'registrado'::text NOT NULL,
    estado_desde timestamp with time zone DEFAULT now() NOT NULL,
    esperando_de text,
    esperando_desde timestamp with time zone,
    resultado_final text,
    motivo_perdido text,
    notas text,
    CONSTRAINT procesos_venta_estado_check CHECK ((estado = ANY (ARRAY['registrado'::text, 'derivado_comercial'::text, 'visitado_escaneado'::text, 'en_viabilidad'::text, 'documentos_emitidos'::text, 'en_junta'::text, 'en_seguimiento'::text, 'ganado_firmado'::text, 'cobrado_50_cerrado'::text, 'perdido'::text]))),
    CONSTRAINT procesos_venta_resultado_final_check CHECK ((resultado_final = ANY (ARRAY['ganado'::text, 'perdido'::text])))
);


--
-- Name: TABLE procesos_venta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.procesos_venta IS 'Pipeline de venta. De una oportunidad cuelgan uno o varios procesos, diferidos en el tiempo (hoy el proyecto; en 2 anos las CAES; la subvencion de un proyecto ya ejecutado...). Cada proceso se cierra al cobrar el 50% (testigo cedido a produccion). Estados reabribles (mismo patron que las etapas de tramitacion tecnica). Al ganar/cobrar entronca con la hoja de encargo (hojas_encargo.proceso_venta_id).';


--
-- Name: COLUMN procesos_venta.comercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.procesos_venta.comercial_id IS 'Heredado pero explicito: un proceso = un comercial (casi nunca se traspasa, por la comision).';


--
-- Name: COLUMN procesos_venta.estado_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.procesos_venta.estado_desde IS 'Fecha de entrada al estado actual (gancho de alertas de seguimiento).';


--
-- Name: COLUMN procesos_venta.esperando_de; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.procesos_venta.esperando_de IS 'A la espera de quien (administrador, comunidad, Daniel...). Materia prima de alertas.';


--
-- Name: COLUMN procesos_venta.esperando_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.procesos_venta.esperando_desde IS 'Desde cuando se espera (indexado para alertas).';


--
-- Name: COLUMN procesos_venta.resultado_final; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.procesos_venta.resultado_final IS 'Solo al cerrar: ganado | perdido (nullable mientras abierto).';


--
-- Name: proyecto_contratas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proyecto_contratas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    contrata_id uuid NOT NULL,
    papel text NOT NULL,
    comision_porcentaje_aplicado numeric,
    comision_importe numeric,
    comision_estado_cobro text DEFAULT 'no_aplica'::text NOT NULL,
    comision_motivo_desviacion text,
    CONSTRAINT proyecto_contratas_comision_estado_cobro_check CHECK ((comision_estado_cobro = ANY (ARRAY['no_aplica'::text, 'pendiente'::text, 'cobrada'::text, 'cobrada_parcial'::text, 'reducida'::text, 'impagada'::text]))),
    CONSTRAINT proyecto_contratas_papel_check CHECK ((papel = ANY (ARRAY['obra_civil'::text, 'maquinaria_ascensor'::text, 'sate'::text, 'otro'::text])))
);


--
-- Name: TABLE proyecto_contratas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proyecto_contratas IS 'Tabla intermedia: un proyecto puede tener varias contratas, cada una con un papel distinto (obra civil, maquinaria del ascensor, SATE...).';


--
-- Name: COLUMN proyecto_contratas.papel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyecto_contratas.papel IS 'Que parte ejecuta esta contrata en este proyecto.';


--
-- Name: COLUMN proyecto_contratas.comision_porcentaje_aplicado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyecto_contratas.comision_porcentaje_aplicado IS 'Porcentaje real que aplico esta contrata en este proyecto. Puede diferir del marco (~3%): en obra grande baja. Nullable.';


--
-- Name: COLUMN proyecto_contratas.comision_importe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyecto_contratas.comision_importe IS 'Importe real de la comision, calculado sobre el PEM de esta adjudicacion. Nullable.';


--
-- Name: COLUMN proyecto_contratas.comision_estado_cobro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyecto_contratas.comision_estado_cobro IS 'Estado del cobro de la comision de contrata. no_aplica = no se cobra nada de esta contrata en este proyecto. Materia prima para que la IA detecte contratas que esquivan el 3%.';


--
-- Name: COLUMN proyecto_contratas.comision_motivo_desviacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyecto_contratas.comision_motivo_desviacion IS 'Texto libre: por que se desvio del marco ("puso pegas", "se le olvido incluirlo en el presupuesto", "obra grande, % reducido").';


--
-- Name: proyecto_tipos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proyecto_tipos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    tipo_id uuid NOT NULL
);


--
-- Name: TABLE proyecto_tipos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proyecto_tipos IS 'Tags de tipo de un proyecto (M:N). Los combos se guardan desglosados: buscar por un tipo recoge todos sus combos.';


--
-- Name: proyectos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proyectos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid NOT NULL,
    descripcion text,
    estado text DEFAULT 'no_asignado'::text NOT NULL,
    fecha_estado timestamp with time zone,
    hoja_encargo_id uuid,
    tipo text,
    fecha_contratado date,
    condicion_arranque text,
    arranque_cumplido boolean DEFAULT false NOT NULL,
    arranque_referencia text,
    arranque_fecha date,
    cee_estado text,
    revision_estado text,
    proyecto_externo boolean DEFAULT false NOT NULL,
    pagador text,
    comercial_interno text,
    notas text,
    entidad_responsable text,
    modalidad_licencia text,
    requiere_visado boolean DEFAULT true NOT NULL,
    ecu_visto_bueno boolean DEFAULT false NOT NULL,
    requiere_licencia boolean DEFAULT true NOT NULL,
    pem numeric(12,2),
    pem_origen text,
    comercial_id uuid,
    comercial_captador_id uuid,
    CONSTRAINT proyectos_cee_estado_check CHECK (((cee_estado IS NULL) OR (cee_estado = ANY (ARRAY['pendiente'::text, 'listo'::text, 'no_requerido'::text])))),
    CONSTRAINT proyectos_entidad_responsable_check CHECK (((entidad_responsable IS NULL) OR (entidad_responsable = ANY (ARRAY['ayuntamiento'::text, 'ecu'::text])))),
    CONSTRAINT proyectos_estado_check CHECK ((estado = ANY (ARRAY['no_procede'::text, 'no_asignado'::text, 'ea_listo'::text, 'en_curso'::text, 'en_pausa'::text, 'listo'::text]))),
    CONSTRAINT proyectos_modalidad_licencia_check CHECK (((modalidad_licencia IS NULL) OR (modalidad_licencia = ANY (ARRAY['declaracion_responsable'::text, 'licencia'::text])))),
    CONSTRAINT proyectos_pem_origen_check CHECK (((pem_origen IS NULL) OR (pem_origen = ANY (ARRAY['nuestro'::text, 'contrata'::text])))),
    CONSTRAINT proyectos_revision_estado_check CHECK (((revision_estado IS NULL) OR (revision_estado = ANY (ARRAY['pendiente'::text, 'en_cola'::text, 'ok'::text, 'corrigiendo'::text, 'no_requerido'::text]))))
);


--
-- Name: TABLE proyectos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.proyectos IS 'La obra concreta (ese ascensor, ese SATE). Pertenece siempre a una comunidad. Mancomunidad (proyecto que abarca varias comunidades) es raro y NO se construye ahora; comunidad_id es obligatorio de momento (posible ampliacion futura a muchos-a-muchos).';


--
-- Name: COLUMN proyectos.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.estado IS 'Produccion: no_procede | no_asignado | ea_listo | en_curso | en_pausa | listo. El estado transversal ("proyectos abiertos") se calcula al vuelo.';


--
-- Name: COLUMN proyectos.fecha_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.fecha_estado IS 'Enchufe de IA clave: cuando entro en el estado actual, para detectar que lleva demasiado tiempo parado en X.';


--
-- Name: COLUMN proyectos.condicion_arranque; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.condicion_arranque IS 'Puerta economica que desbloquea el arranque (describible: cobro real / orden de compra / nº pedido / firma HE...).';


--
-- Name: COLUMN proyectos.revision_estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.revision_estado IS 'Rollup de la revision interna de Daniel (OK daniel de Monday). El detalle de rondas/cambios vive en requerimientos_tramitacion (origen=revision_interna).';


--
-- Name: COLUMN proyectos.proyecto_externo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.proyecto_externo IS 'El proyecto tecnico lo hace otro arquitecto: sin acceso a docs (se piden al admin), mas gestion y precio.';


--
-- Name: COLUMN proyectos.pagador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.pagador IS 'Quien paga (crudo de Monday "2 QUIEN PAGA"): CDAD=comunidad, o el nombre de la contrata (FAIN/SCHINDLER/ROEN/ELECNOR...).';


--
-- Name: COLUMN proyectos.comercial_interno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.comercial_interno IS 'Crudo de Monday "0 Comercial interno" (texto original). Se conserva como dato de origen; la verdad normalizada vive en comercial_id / comercial_captador_id.';


--
-- Name: COLUMN proyectos.notas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.notas IS 'Nota libre; en pausa = causa y que lo desbloquearia.';


--
-- Name: COLUMN proyectos.entidad_responsable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.entidad_responsable IS 'Quien concede la licencia de obra: ayuntamiento | ecu. Por ECU se arreglan los fallos antes de visar (evita tasas de visado dobles). Se fija al inicio, editable; a veces impuesto por tipo/localidad (matriz en sprint licencia).';


--
-- Name: COLUMN proyectos.modalidad_licencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.modalidad_licencia IS 'Modalidad de la licencia: declaracion_responsable | licencia. Obligatorio/electivo segun tipo y localidad (matriz futura).';


--
-- Name: COLUMN proyectos.requiere_visado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.requiere_visado IS 'Si el proyecto se visa en el colegio. Todo lo que es proyecto se visa; las memorias valoradas y los servicios (pericial, DF, doc tecnica) no.';


--
-- Name: COLUMN proyectos.ecu_visto_bueno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.ecu_visto_bueno IS 'Via ECU: la ECU ha dado el visto bueno y ya se puede mandar a visar.';


--
-- Name: COLUMN proyectos.requiere_licencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.requiere_licencia IS 'Si la obra necesita licencia/DR. No se pide licencia o cancelada: false.';


--
-- Name: COLUMN proyectos.pem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.pem IS 'Presupuesto de ejecucion material (€). Raiz de las 3 tasas de licencia.';


--
-- Name: COLUMN proyectos.pem_origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.pem_origen IS 'De donde sale el PEM: nuestro (proyecto/memoria, ~80%) | contrata (presupuesto de contrata aprobado al que ajustarse, ~20%). La viabilidad comercial NO usa PEM (estimacion con disclaimer).';


--
-- Name: COLUMN proyectos.comercial_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.comercial_id IS 'Comercial RESPONSABLE del proyecto hoy (mutable). Por defecto = el captador; se reasigna cuando otro comercial toma el testigo (p. ej. baja de un comercial).';


--
-- Name: COLUMN proyectos.comercial_captador_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proyectos.comercial_captador_id IS 'Comercial que TRAJO/vendio el proyecto (historico, no se sobreescribe al reasignar). Deriva de comercial_interno (crudo de Monday) en la migracion inicial.';


--
-- Name: tipos_documento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_documento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    aportado_por text NOT NULL,
    caduca boolean DEFAULT false NOT NULL,
    pertenece_a text NOT NULL,
    conocimiento_experto text,
    tipo_completitud text DEFAULT 'simple'::text,
    completitud_detalle jsonb,
    CONSTRAINT tipos_documento_aportado_por_check CHECK ((aportado_por = ANY (ARRAY['comunidad'::text, 'accesalia'::text, 'mixto_firma'::text]))),
    CONSTRAINT tipos_documento_pertenece_a_check CHECK ((pertenece_a = ANY (ARRAY['comunidad'::text, 'proyecto'::text]))),
    CONSTRAINT tipos_documento_tipo_completitud_check CHECK ((tipo_completitud = ANY (ARRAY['simple'::text, 'partes'::text, 'multiple'::text, 'alternativa'::text])))
);


--
-- Name: TABLE tipos_documento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tipos_documento IS 'Catalogo maestro de tipos de documento (DNI presidente, acta de nombramiento, IEE, certificado energetico, proyecto tecnico...). Define de una vez para siempre quien aporta cada tipo y si caduca.';


--
-- Name: COLUMN tipos_documento.aportado_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_documento.aportado_por IS 'Quien lo sube. mixto_firma = lo genera Accesalia y lo firma la comunidad.';


--
-- Name: COLUMN tipos_documento.caduca; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_documento.caduca IS 'Si true, sus documentos controlan fecha_caducidad. Ej.: actas de nombramiento caducan; proyecto/IEE/certificado energetico en la practica no.';


--
-- Name: COLUMN tipos_documento.pertenece_a; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_documento.pertenece_a IS 'A que nivel cuelga por defecto este tipo de documento (comunidad o proyecto).';


--
-- Name: COLUMN tipos_documento.conocimiento_experto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_documento.conocimiento_experto IS 'Conocimiento experto / criterios de revision de Accesalia para este tipo de documento (texto libre rico). Ej. IEE: firma electronica del arquitecto emisor y la comunidad; coherencia SATE/ZETU -> accesibilidad resuelta; mejora estimada no supere 3x la cuota habitual. Lo consultan los prompts (sobre todo la familia 3). Crece con el tiempo; NO se incrusta en el texto de los prompts.';


--
-- Name: COLUMN tipos_documento.tipo_completitud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_documento.tipo_completitud IS 'Como se considera completo por defecto: simple (un fichero) | partes (DNI = anverso+reverso) | multiple (N del mismo tipo, ej. 3 presupuestos) | alternativa (uno u otro). La IA lo hereda al casar; sobreescribible por convocatoria.';


--
-- Name: COLUMN tipos_documento.completitud_detalle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_documento.completitud_detalle IS 'Detalle jsonb de la estructura por defecto: {partes:[...]}, {cardinalidad:N}, {alternativas:[...]}, {agrupado_con:...}. Segun tipo_completitud.';


--
-- Name: refundido; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.refundido AS
 SELECT d.proyecto_id,
    d.comunidad_id,
    d.tipo_documento_id,
    td.nombre AS tipo_documento,
    td.pertenece_a,
    d.id AS documento_id,
    d.grupo_id,
    d.n_version,
    d.backend,
    d.storage_ref,
    d.origen_ruta_dropbox
   FROM (public.documentos d
     JOIN public.tipos_documento td ON ((td.id = d.tipo_documento_id)))
  WHERE d.vigente;


--
-- Name: VIEW refundido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.refundido IS 'Juego de documentos consolidado: la ultima version vigente de cada documento (por grupo). El REFUNDIDO auto-generado.';


--
-- Name: requerimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requerimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    expediente_id uuid NOT NULL,
    descripcion text NOT NULL,
    url_documento_original text,
    fecha_recepcion date NOT NULL,
    fecha_limite_respuesta date NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    fecha_respuesta date,
    CONSTRAINT requerimientos_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'en_curso'::text, 'respondido'::text])))
);


--
-- Name: TABLE requerimientos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requerimientos IS 'Cuando un organismo pide subsanar algo en un expediente presentado. Tienen plazo de respuesta critico. Llegan como documento externo en papel: se conserva el texto extraido (descripcion) Y el enlace al original (url_documento_original). La extraccion automatica es de fase posterior; por ahora se rellena a mano.';


--
-- Name: COLUMN requerimientos.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos.descripcion IS 'Resumen de lo que pide el organismo (extraido del documento, o tecleado a mano por ahora).';


--
-- Name: COLUMN requerimientos.url_documento_original; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos.url_documento_original IS 'Enlace al escaneo del requerimiento original. Se conserva siempre el original, no solo lo extraido.';


--
-- Name: COLUMN requerimientos.fecha_recepcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos.fecha_recepcion IS 'Enchufe de IA.';


--
-- Name: COLUMN requerimientos.fecha_limite_respuesta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos.fecha_limite_respuesta IS 'Enchufe de IA clave: alertar antes de que caduque el plazo.';


--
-- Name: requerimientos_caes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requerimientos_caes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    operacion_caes_id uuid NOT NULL,
    origen text DEFAULT 'registro'::text NOT NULL,
    descripcion text NOT NULL,
    fecha_requerimiento date,
    plazo date,
    estado text DEFAULT 'abierto'::text NOT NULL,
    afecta_kwh boolean DEFAULT false NOT NULL,
    kwh_resultante numeric,
    notas text,
    CONSTRAINT requerimientos_caes_estado_check CHECK ((estado = ANY (ARRAY['abierto'::text, 'en_respuesta'::text, 'resuelto'::text]))),
    CONSTRAINT requerimientos_caes_origen_check CHECK ((origen = ANY (ARRAY['registro'::text, 'verificador'::text, 'otro'::text])))
);


--
-- Name: TABLE requerimientos_caes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requerimientos_caes IS 'Requerimientos sobre una operacion CAES (patron comun: quien pide, que, plazo, estado). Particularidad: pueden modificar el kWh final (el registro pide eliminar elementos, ajustar, etc.).';


--
-- Name: COLUMN requerimientos_caes.origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_caes.origen IS 'Quien lo pide: registro, verificador, otro.';


--
-- Name: COLUMN requerimientos_caes.plazo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_caes.plazo IS 'Enchufe de IA: plazo a vigilar (indexado).';


--
-- Name: COLUMN requerimientos_caes.afecta_kwh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_caes.afecta_kwh IS 'Si su resolucion cambio el ahorro.';


--
-- Name: COLUMN requerimientos_caes.kwh_resultante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_caes.kwh_resultante IS 'El ahorro tras resolverlo (alimenta operaciones_caes.kwh_final).';


--
-- Name: requerimientos_obra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requerimientos_obra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    obra_id uuid NOT NULL,
    descripcion text NOT NULL,
    origen text NOT NULL,
    tipo_resolucion text DEFAULT 'sin_determinar'::text NOT NULL,
    responsable_id uuid,
    fecha_apertura date NOT NULL,
    fecha_limite date,
    estado text DEFAULT 'abierto'::text NOT NULL,
    fecha_cierre date,
    horas_tecnico numeric(6,2),
    CONSTRAINT requerimientos_obra_estado_check CHECK ((estado = ANY (ARRAY['abierto'::text, 'en_resolucion'::text, 'respondido'::text, 'cerrado'::text]))),
    CONSTRAINT requerimientos_obra_origen_check CHECK ((origen = ANY (ARRAY['direccion_facultativa'::text, 'contrata'::text, 'comunidad'::text, 'otro'::text]))),
    CONSTRAINT requerimientos_obra_tipo_resolucion_check CHECK ((tipo_resolucion = ANY (ARRAY['administrativa'::text, 'tecnica'::text, 'sin_determinar'::text])))
);


--
-- Name: TABLE requerimientos_obra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requerimientos_obra IS 'Requerimientos de la fase de obra (patron comun) con origen interno: normalmente los genera Accesalia (paralizacion, orden de derribo, subsanacion), salvo los precios contradictorios que surgen de la ejecucion. Separados de requerimientos_tramitacion por su origen y gestion.';


--
-- Name: COLUMN requerimientos_obra.origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_obra.origen IS 'Quien lo genera: direccion_facultativa, contrata, comunidad, otro.';


--
-- Name: COLUMN requerimientos_obra.tipo_resolucion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_obra.tipo_resolucion IS 'administrativa, tecnica o sin_determinar (una persona lo decide). Default sin_determinar.';


--
-- Name: COLUMN requerimientos_obra.fecha_limite; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_obra.fecha_limite IS 'Enchufe de IA: plazo a vigilar.';


--
-- Name: requerimientos_tramitacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requerimientos_tramitacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    etapa_proyecto_id uuid,
    origen text NOT NULL,
    descripcion text NOT NULL,
    url_documento_original text,
    tipo_resolucion text DEFAULT 'sin_determinar'::text NOT NULL,
    responsable_id uuid,
    fecha_recepcion date NOT NULL,
    fecha_limite_respuesta date,
    estado text DEFAULT 'abierto'::text NOT NULL,
    fecha_respuesta date,
    horas_tecnico numeric(6,2),
    ronda integer DEFAULT 1 NOT NULL,
    responsable_nombre text,
    CONSTRAINT requerimientos_tramitacion_estado_check CHECK ((estado = ANY (ARRAY['abierto'::text, 'en_resolucion'::text, 'respondido'::text, 'cerrado'::text]))),
    CONSTRAINT requerimientos_tramitacion_origen_check CHECK ((origen = ANY (ARRAY['revision_interna'::text, 'coam'::text, 'ayuntamiento'::text, 'ecu'::text, 'otro'::text]))),
    CONSTRAINT requerimientos_tramitacion_tipo_resolucion_check CHECK ((tipo_resolucion = ANY (ARRAY['administrativa'::text, 'tecnica'::text, 'sin_determinar'::text])))
);


--
-- Name: TABLE requerimientos_tramitacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requerimientos_tramitacion IS 'Revisiones y requerimientos con rondas. origen=revision_interna es la revision de Daniel (descripcion = QUE se cambio, dato para IA de rendimiento); coam/ayuntamiento/ecu son los externos de visado/licencia.';


--
-- Name: COLUMN requerimientos_tramitacion.etapa_proyecto_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_tramitacion.etapa_proyecto_id IS 'La etapa que se reabre por este requerimiento (nullable).';


--
-- Name: COLUMN requerimientos_tramitacion.origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_tramitacion.origen IS 'Quien lo pide: coam, ayuntamiento, ecu, otro.';


--
-- Name: COLUMN requerimientos_tramitacion.descripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_tramitacion.descripcion IS 'Que pide (texto extraido del documento). El original se conserva en url_documento_original.';


--
-- Name: COLUMN requerimientos_tramitacion.tipo_resolucion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_tramitacion.tipo_resolucion IS 'Si se resuelve con gestion administrativa o requiere trabajo del arquitecto (horas de tecnico). Enchufe de IA/negocio: una persona lo decide. Default sin_determinar.';


--
-- Name: COLUMN requerimientos_tramitacion.responsable_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_tramitacion.responsable_id IS 'Tecnico que debe resolverlo.';


--
-- Name: COLUMN requerimientos_tramitacion.fecha_recepcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_tramitacion.fecha_recepcion IS 'Enchufe de IA.';


--
-- Name: COLUMN requerimientos_tramitacion.fecha_limite_respuesta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_tramitacion.fecha_limite_respuesta IS 'Enchufe de IA clave: alertar antes de que venza el plazo.';


--
-- Name: COLUMN requerimientos_tramitacion.horas_tecnico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requerimientos_tramitacion.horas_tecnico IS 'Horas de tecnico consumidas en resolverlo (para futuro analisis de coste/rentabilidad y de que tecnico acumula mas requerimientos).';


--
-- Name: requisitos_convocatoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requisitos_convocatoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    convocatoria_id uuid NOT NULL,
    tipo_documento_id uuid NOT NULL,
    obligatorio boolean DEFAULT true NOT NULL,
    categoria text,
    texto_literal_extraido text,
    tipo_completitud text,
    completitud_detalle jsonb,
    notas_extraccion text,
    CONSTRAINT requisitos_convocatoria_categoria_check CHECK ((categoria = ANY (ARRAY['generico'::text, 'especifico_convocatoria'::text, 'opcional'::text]))),
    CONSTRAINT requisitos_convocatoria_tipo_completitud_check CHECK ((tipo_completitud = ANY (ARRAY['simple'::text, 'partes'::text, 'multiple'::text, 'alternativa'::text])))
);


--
-- Name: TABLE requisitos_convocatoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requisitos_convocatoria IS 'Que tipos de documento exige cada convocatoria. Permite que un mismo documento se reutilice en varias convocatorias.';


--
-- Name: COLUMN requisitos_convocatoria.categoria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requisitos_convocatoria.categoria IS 'generico (siempre se pide) | especifico_convocatoria | opcional.';


--
-- Name: COLUMN requisitos_convocatoria.texto_literal_extraido; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requisitos_convocatoria.texto_literal_extraido IS 'Texto literal de la convocatoria de donde se extrajo este documento (trazabilidad, revision humana).';


--
-- Name: COLUMN requisitos_convocatoria.tipo_completitud; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requisitos_convocatoria.tipo_completitud IS 'Override de la estructura por defecto del catalogo para ESTA convocatoria. Null = hereda tipos_documento.tipo_completitud.';


--
-- Name: COLUMN requisitos_convocatoria.completitud_detalle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requisitos_convocatoria.completitud_detalle IS 'Override del detalle jsonb para esta convocatoria. Null = hereda del catalogo.';


--
-- Name: COLUMN requisitos_convocatoria.notas_extraccion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requisitos_convocatoria.notas_extraccion IS 'Auditoria: por que la IA extrajo/modelo este requisito asi (decisiones concretas).';


--
-- Name: resumenes_ia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resumenes_ia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comunidad_id uuid,
    fase text NOT NULL,
    texto text DEFAULT ''::text NOT NULL,
    datos_estables jsonb,
    generado_por text DEFAULT 'ia'::text NOT NULL,
    administrador_id uuid,
    ambito text DEFAULT 'comunidad'::text NOT NULL,
    CONSTRAINT resumenes_ia_ambito_ck CHECK ((((ambito = 'comunidad'::text) AND (comunidad_id IS NOT NULL) AND (administrador_id IS NULL)) OR ((ambito = 'administrador'::text) AND (administrador_id IS NOT NULL) AND (comunidad_id IS NULL)))),
    CONSTRAINT resumenes_ia_fase_check CHECK ((fase = ANY (ARRAY['comercial'::text, 'proyecto'::text, 'visado'::text, 'licencia'::text, 'obra'::text, 'facturacion'::text, 'subvenciones'::text, 'global'::text])))
);


--
-- Name: TABLE resumenes_ia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.resumenes_ia IS 'Resumen IA por fase del expediente (modelo Ordelia). Contexto para la IA + "ponerse al dia" para el humano. resumen=lo que evoluciona; datos_estables=lo historico/estable.';


--
-- Name: COLUMN resumenes_ia.administrador_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resumenes_ia.administrador_id IS 'Ambito administrador: la PERSONA a la que se visita (no la firma). Resumen vivo de la relacion comercial con ella.';


--
-- Name: COLUMN resumenes_ia.ambito; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.resumenes_ia.ambito IS 'comunidad | administrador (persona). Define cual de las dos FKs esta puesta.';


--
-- Name: revisiones_visado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revisiones_visado (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    visado_id uuid NOT NULL,
    n_revision integer DEFAULT 1 NOT NULL,
    fecha date,
    requerimiento_id uuid,
    justificacion text
);


--
-- Name: TABLE revisiones_visado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.revisiones_visado IS 'Cada re-visado del MISMO expediente COAM (numero de visado estable). Normalmente lo motiva un RQ del ayto que obliga a modificar partes; siempre justificado.';


--
-- Name: tareas_seguimiento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tareas_seguimiento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    comercial_id uuid,
    administrador_id uuid,
    oportunidad_id uuid,
    interaccion_id uuid,
    texto text NOT NULL,
    condicion_cierre text,
    fecha_limite date,
    estado text DEFAULT 'abierta'::text NOT NULL,
    fecha_cierre date,
    notas text,
    CONSTRAINT tareas_seguimiento_estado_check CHECK ((estado = ANY (ARRAY['abierta'::text, 'hecha'::text, 'descartada'::text])))
);


--
-- Name: TABLE tareas_seguimiento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tareas_seguimiento IS 'Seguimientos comerciales, a menudo propuestos por la IA, con condicion de cierre comprobable contra datos. Mismo espiritu que los avisos de facturacion.';


--
-- Name: tecnicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tecnicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    nombre text NOT NULL,
    rol text NOT NULL,
    email text,
    telefono text,
    activo boolean DEFAULT true NOT NULL,
    numero_colegiado text,
    CONSTRAINT tecnicos_rol_check CHECK ((rol = ANY (ARRAY['arquitecto'::text, 'arquitecto_tecnico'::text, 'delineante'::text, 'administrativo'::text, 'otro'::text])))
);


--
-- Name: TABLE tecnicos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tecnicos IS 'Personal tecnico de Accesalia que interviene en redaccion y tramitacion. Tabla sencilla en esta fase; se enriquecera para el futuro analisis de "mejor tecnico" (carga, requerimientos, tiempos).';


--
-- Name: COLUMN tecnicos.rol; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tecnicos.rol IS 'Rol del tecnico. text+check (no enum) para editar la lista con facilidad.';


--
-- Name: COLUMN tecnicos.activo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tecnicos.activo IS 'Baja logica.';


--
-- Name: COLUMN tecnicos.numero_colegiado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tecnicos.numero_colegiado IS 'Nº de colegiado (p.ej. 24103 COAM). Para el arquitecto firmante del informe; hoy casi siempre Daniel, pero modelado como dato para que en el futuro firme otro.';


--
-- Name: tiempos_estandar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tiempos_estandar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    contexto text DEFAULT 'proyecto'::text NOT NULL,
    clave text NOT NULL,
    dias integer NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE tiempos_estandar; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tiempos_estandar IS 'Tiempo promedio esperado (dias) por tipo/contexto, para pre-rellenar la fecha prevista de fin al asignar (editable). Base de desviaciones, IA de rendimiento y coste por horas.';


--
-- Name: tipos_proyecto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_proyecto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    clave text NOT NULL,
    nombre text NOT NULL,
    naturaleza text,
    parent_id uuid,
    orden integer,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT tipos_proyecto_naturaleza_check CHECK (((naturaleza IS NULL) OR (naturaleza = ANY (ARRAY['proyecto'::text, 'servicio'::text, 'documento_tecnico'::text]))))
);


--
-- Name: TABLE tipos_proyecto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tipos_proyecto IS 'Catalogo editable de tipos de proyecto. naturaleza reusa el vocab de bloques; parent_id da jerarquia (subtipos).';


--
-- Name: tipos_servicio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_servicio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    empresa_gestora text NOT NULL,
    es_arquitectura boolean NOT NULL,
    CONSTRAINT tipos_servicio_empresa_gestora_check CHECK ((empresa_gestora = ANY (ARRAY['accesalia'::text, 'ecobalance'::text])))
);


--
-- Name: TABLE tipos_servicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tipos_servicio IS 'Catalogo de servicios contratables (proyecto ascensor/SATE/cubierta/rampa/plataforma, memoria valorada, CSS, direccion de obra, subvencion, CAES, tres presupuestos, ITE...). Referenciado desde el proceso de venta y desde el servicio reservado del origen.';


--
-- Name: COLUMN tipos_servicio.codigo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_servicio.codigo IS 'Codigo estable, ej. proyecto_ascensor, proyecto_sate, css, direccion_obra, subvencion, caes, tres_presupuestos, ite, memoria_valorada, rampa, plataforma.';


--
-- Name: COLUMN tipos_servicio.empresa_gestora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_servicio.empresa_gestora IS 'Quien lo gestiona/factura por defecto: accesalia (arquitectura) o ecobalance (subvenciones/CAES/comisiones). Es un DEFAULT, no una atadura: el emisor concreto se decide en la hoja de encargo.';


--
-- Name: COLUMN tipos_servicio.es_arquitectura; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipos_servicio.es_arquitectura IS 'Para el regimen de comision solo_proyecto: distingue que comisiona (arquitectura) y que no (servicios no-arquitectonicos).';


--
-- Name: uso_llm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uso_llm (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    origen text,
    proveedor text,
    modelo text,
    nivel text,
    actor_id uuid,
    input_tokens integer DEFAULT 0 NOT NULL,
    output_tokens integer DEFAULT 0 NOT NULL,
    cache_creacion_tokens integer DEFAULT 0 NOT NULL,
    cache_lectura_tokens integer DEFAULT 0 NOT NULL,
    CONSTRAINT uso_llm_nivel_check CHECK ((nivel = ANY (ARRAY['alto'::text, 'base'::text]))),
    CONSTRAINT uso_llm_proveedor_check CHECK ((proveedor = ANY (ARRAY['anthropic'::text, 'mistral'::text])))
);


--
-- Name: TABLE uso_llm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.uso_llm IS 'Contabilidad de tokens por llamada al LLM (coste por edge/actor/modelo). La escribe _shared best-effort: un fallo aqui NUNCA tumba la llamada. Inmutable.';


--
-- Name: COLUMN uso_llm.origen; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uso_llm.origen IS 'Edge que origino la llamada (ej. extraer-convocatoria).';


--
-- Name: COLUMN uso_llm.proveedor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uso_llm.proveedor IS 'anthropic (nivel alto, Claude) | mistral (nivel base).';


--
-- Name: COLUMN uso_llm.nivel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uso_llm.nivel IS 'alto (fiabilidad, Claude Opus) | base (economico, Mistral).';


--
-- Name: COLUMN uso_llm.actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uso_llm.actor_id IS 'Quien disparo la llamada (personal_interno hoy; auth el dia de manana). Nullable.';


--
-- Name: COLUMN uso_llm.input_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uso_llm.input_tokens IS 'Tokens de entrada NO cacheados (Anthropic: input_tokens; Mistral: prompt - cacheados).';


--
-- Name: COLUMN uso_llm.cache_creacion_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uso_llm.cache_creacion_tokens IS 'Tokens escritos a cache (Anthropic cache write; Mistral 0).';


--
-- Name: COLUMN uso_llm.cache_lectura_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.uso_llm.cache_lectura_tokens IS 'Tokens servidos de cache (baratos).';


--
-- Name: versiones_hoja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.versiones_hoja (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    hoja_encargo_id uuid NOT NULL,
    numero_version integer DEFAULT 1 NOT NULL,
    fecha_generada date,
    fecha_enviada date,
    motivo_cambio text,
    url_pdf_hoja text,
    url_pdf_presupuesto text,
    numero_presupuesto text,
    forma_pago text,
    importe_base numeric,
    iva_porcentaje numeric,
    importe_total numeric,
    notas text,
    importes_forma_pago_texto text,
    pdfs_firmados text[]
);


--
-- Name: TABLE versiones_hoja; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.versiones_hoja IS 'Cada revision (foto) de una hoja de encargo. Nueva version cada vez que se reenvia tras cambios. Permite saber que version se firmo vs la ultima enviada (deteccion de "troll") y el historico de cambios. Los conceptos e importes van por version (cambian entre revisiones).';


--
-- Name: COLUMN versiones_hoja.numero_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.versiones_hoja.numero_version IS 'v1, v2, v3... dentro de la misma hoja.';


--
-- Name: COLUMN versiones_hoja.motivo_cambio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.versiones_hoja.motivo_cambio IS 'Por que se genero esta version (que pidio cambiar la comunidad).';


--
-- Name: COLUMN versiones_hoja.url_pdf_hoja; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.versiones_hoja.url_pdf_hoja IS 'PDF de la hoja de encargo de esta version.';


--
-- Name: COLUMN versiones_hoja.url_pdf_presupuesto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.versiones_hoja.url_pdf_presupuesto IS 'PDF del presupuesto (Factusol) enviado con esta version.';


--
-- Name: COLUMN versiones_hoja.numero_presupuesto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.versiones_hoja.numero_presupuesto IS 'Numero de presupuesto de Factusol (ej. 26/000093). Se conserva (lo piden en subvenciones).';


--
-- Name: COLUMN versiones_hoja.forma_pago; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.versiones_hoja.forma_pago IS 'Forma de pago de esta version (ej. cargo en cuenta).';


--
-- Name: COLUMN versiones_hoja.importes_forma_pago_texto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.versiones_hoja.importes_forma_pago_texto IS 'Texto crudo de importes+forma de pago desde Monday (lossless). Pendiente de desglosar a la tabla de facturacion (importe/concepto, IVA, % exito). No usar como importe limpio.';


--
-- Name: COLUMN versiones_hoja.pdfs_firmados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.versiones_hoja.pdfs_firmados IS 'Coleccion de links a PDFs firmados (Drive/Docs). Un encargo puede firmar varios documentos a la vez. url_pdf_hoja = el primero.';


--
-- Name: viabilidad_conceptos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viabilidad_conceptos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    viabilidad_id uuid NOT NULL,
    bloque_id uuid,
    seleccionado boolean DEFAULT true NOT NULL,
    importe numeric,
    iva_porcentaje numeric,
    porcentaje numeric,
    gratis boolean DEFAULT false NOT NULL,
    incluido_en_id uuid,
    orden integer
);


--
-- Name: TABLE viabilidad_conceptos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.viabilidad_conceptos IS 'Lineas de la tabla de precios de una viabilidad. Reutiliza el catalogo bloques (mismo concepto que conceptos_hoja de la HE). Seleccionable/deseleccionable (como los conceptos de la hoja) y crecedero.';


--
-- Name: COLUMN viabilidad_conceptos.bloque_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidad_conceptos.bloque_id IS 'Concepto del catalogo bloques (REDACCION PROYECTO, DF, CSS, TRAMITACION SUBVENCIONES...). Reutiliza el mismo catalogo que la hoja de encargo.';


--
-- Name: COLUMN viabilidad_conceptos.seleccionado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidad_conceptos.seleccionado IS 'Si la linea esta marcada en el formulario (aparece en la tabla). Los 4 grupos van pre-marcados.';


--
-- Name: COLUMN viabilidad_conceptos.importe; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidad_conceptos.importe IS 'Importe base de la linea (honorario). Por defecto el orientativo del bloque, ajustable por caso.';


--
-- Name: COLUMN viabilidad_conceptos.iva_porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidad_conceptos.iva_porcentaje IS 'IVA de la linea (honorarios tipicamente 21%).';


--
-- Name: COLUMN viabilidad_conceptos.porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidad_conceptos.porcentaje IS 'Para subvencion: % a exito (ademas del importe de documentacion tecnica).';


--
-- Name: COLUMN viabilidad_conceptos.gratis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidad_conceptos.gratis IS 'true = incluido gratis dentro de otro concepto (p.ej. DF incluida en proyecto). Importe tipicamente 0.';


--
-- Name: COLUMN viabilidad_conceptos.incluido_en_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidad_conceptos.incluido_en_id IS 'Cuando gratis: en que concepto va incluido (self-ref). Mismo mecanismo que conceptos_hoja.incluido_en_concepto_id de la HE.';


--
-- Name: viabilidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.viabilidades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    numero text,
    version integer DEFAULT 1 NOT NULL,
    vigente boolean DEFAULT true NOT NULL,
    arquitecto_id uuid,
    fecha_visita date,
    objeto text,
    descripcion_intervenciones text,
    conclusion text,
    viable boolean,
    coste_obra_base numeric,
    coste_obra_iva_porcentaje numeric,
    coste_obra_total numeric,
    url_pdf text,
    oportunidad_id uuid
);


--
-- Name: TABLE viabilidades; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.viabilidades IS 'Informe/estudio de viabilidad y costes. Documento versionado que cuelga de la carpeta (encargo). Cabecera pescable de otras tablas; cuerpo de texto y coste de obra los rellena el tecnico. La tabla de precios va en viabilidad_conceptos (reutiliza bloques).';


--
-- Name: COLUMN viabilidades.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidades.version IS 'Version del documento (v1, v2...). Nueva version al regenerar. La vigente=true es la actual.';


--
-- Name: COLUMN viabilidades.arquitecto_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidades.arquitecto_id IS 'Arquitecto firmante (flexible; FK a tecnicos, con su numero_colegiado).';


--
-- Name: COLUMN viabilidades.viable; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidades.viable IS 'Conclusion: viable | inviable (null mientras se redacta).';


--
-- Name: COLUMN viabilidades.coste_obra_base; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidades.coste_obra_base IS 'Coste de obra ESTIMATIVO (orientacion para la comunidad). NO es el PEM y NO propaga a otras fases.';


--
-- Name: COLUMN viabilidades.coste_obra_iva_porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidades.coste_obra_iva_porcentaje IS 'IVA del coste de obra (tipicamente 10%).';


--
-- Name: COLUMN viabilidades.oportunidad_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.viabilidades.oportunidad_id IS 'La oportunidad (proceso comercial) a la que pertenece la viabilidad. Sustituye a carpeta_id (que se elimina en la limpieza).';


--
-- Name: visados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    proyecto_id uuid NOT NULL,
    momento text DEFAULT 'proyecto'::text NOT NULL,
    tipo text,
    estado text DEFAULT 'pendiente_enviar'::text NOT NULL,
    organismo text DEFAULT 'COAM'::text NOT NULL,
    referencia text,
    tasa numeric(10,2),
    pagado boolean DEFAULT false NOT NULL,
    fecha_envio date,
    fecha_visado date,
    fecha_descarga date,
    entregado_al_pagador boolean DEFAULT false NOT NULL,
    pdf_documento_id uuid,
    tramita_equipo_id uuid,
    pausado boolean DEFAULT false NOT NULL,
    notas text,
    CONSTRAINT visados_estado_check CHECK ((estado = ANY (ARRAY['pendiente_enviar'::text, 'enviado'::text, 'requerido'::text, 'visado'::text]))),
    CONSTRAINT visados_momento_check CHECK ((momento = ANY (ARRAY['proyecto'::text, 'fin_obra'::text]))),
    CONSTRAINT visados_tipo_check CHECK (((tipo IS NULL) OR (tipo = ANY (ARRAY['normal'::text, 'urgente'::text]))))
);


--
-- Name: TABLE visados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.visados IS 'Visados del colegio (COAM). 1 proyecto -> N visados (re-visados + fin de obra). Guarda hechos: codigo TL, tasa, fechas, PDF maestro. Metricas (coste total, nº re-visados) al vuelo.';


--
-- Name: COLUMN visados.momento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visados.momento IS 'Que se visa: proyecto | fin_obra. El RQ en fin_obra es rarisimo.';


--
-- Name: COLUMN visados.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visados.tipo IS 'normal (~5 dias) | urgente (48h laborables, tasa mayor). Plazos estandar en tiempos_estandar (contexto=visado).';


--
-- Name: COLUMN visados.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visados.estado IS 'Ciclo: pendiente_enviar -> enviado -> (requerido <-> subsanar) -> visado. La pausa (p.ej. parado hasta ECU) es overlay (pausado).';


--
-- Name: COLUMN visados.referencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visados.referencia IS 'Codigo TL del colegio (TL/XXXXXX/AAAA): nuestro identificador de ESE proyecto visado.';


--
-- Name: COLUMN visados.tasa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visados.tasa IS 'Coste del visado en €. Dato manual (no se hardcodea); re-visar acumula coste.';


--
-- Name: visitas_obra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitas_obra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    obra_id uuid NOT NULL,
    numero integer,
    fecha_visita date NOT NULL,
    autor_tecnico_id uuid,
    fase_obra_id uuid,
    texto_acta text,
    url_pdf_acta text,
    url_fotos text,
    enviada boolean DEFAULT false NOT NULL,
    fecha_enviada date
);


--
-- Name: TABLE visitas_obra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.visitas_obra IS 'Cada visita de la direccion facultativa. Genera un acta. El conjunto de actas sustituye legalmente al libro de ordenes: registro de todo lo ordenado a la constructora y aceptado por ella. Se conserva el texto integro.';


--
-- Name: COLUMN visitas_obra.numero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visitas_obra.numero IS 'Numero de acta (1, 2, 3...).';


--
-- Name: COLUMN visitas_obra.autor_tecnico_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visitas_obra.autor_tecnico_id IS 'Tecnico (equipo) que hace la visita / la DF. Repuntado de tecnicos a equipo.';


--
-- Name: COLUMN visitas_obra.fase_obra_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visitas_obra.fase_obra_id IS 'En que fase estaba la obra en esa visita (fases_obra_catalogo).';


--
-- Name: COLUMN visitas_obra.texto_acta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visitas_obra.texto_acta IS 'Relato en prosa completo de la visita, conservado integro (estado de avance + lo observado). Base para la futura extraccion automatica de incidencias/instrucciones.';


--
-- Name: COLUMN visitas_obra.url_fotos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visitas_obra.url_fotos IS 'Enlace a la carpeta/album de fotos de la visita.';


--
-- Name: COLUMN visitas_obra.enviada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.visitas_obra.enviada IS 'Si el acta ya se envio a los implicados. El chivato: acta sin enviar pasado el dia siguiente.';


--
-- Name: acuerdos_comision acuerdos_comision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acuerdos_comision
    ADD CONSTRAINT acuerdos_comision_pkey PRIMARY KEY (id);


--
-- Name: administracion_origen administracion_origen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracion_origen
    ADD CONSTRAINT administracion_origen_pkey PRIMARY KEY (id);


--
-- Name: administraciones_fincas administraciones_fincas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administraciones_fincas
    ADD CONSTRAINT administraciones_fincas_pkey PRIMARY KEY (id);


--
-- Name: administradores administradores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_pkey PRIMARY KEY (id);


--
-- Name: beneficiarios_reparto_caes beneficiarios_reparto_caes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficiarios_reparto_caes
    ADD CONSTRAINT beneficiarios_reparto_caes_pkey PRIMARY KEY (id);


--
-- Name: bitacora_ia bitacora_ia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_ia
    ADD CONSTRAINT bitacora_ia_pkey PRIMARY KEY (id);


--
-- Name: bloques bloques_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bloques
    ADD CONSTRAINT bloques_codigo_key UNIQUE (codigo);


--
-- Name: bloques bloques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bloques
    ADD CONSTRAINT bloques_pkey PRIMARY KEY (id);


--
-- Name: cierre_obra cierre_obra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierre_obra
    ADD CONSTRAINT cierre_obra_pkey PRIMARY KEY (id);


--
-- Name: cobros cobros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cobros
    ADD CONSTRAINT cobros_pkey PRIMARY KEY (id);


--
-- Name: comerciales comerciales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comerciales
    ADD CONSTRAINT comerciales_pkey PRIMARY KEY (id);


--
-- Name: comisiones_proyecto comisiones_proyecto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_proyecto
    ADD CONSTRAINT comisiones_proyecto_pkey PRIMARY KEY (id);


--
-- Name: comunidades comunidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunidades
    ADD CONSTRAINT comunidades_pkey PRIMARY KEY (id);


--
-- Name: conceptos_hoja conceptos_hoja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_hoja
    ADD CONSTRAINT conceptos_hoja_pkey PRIMARY KEY (id);


--
-- Name: condicionantes_comunidad condicionantes_comunidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condicionantes_comunidad
    ADD CONSTRAINT condicionantes_comunidad_pkey PRIMARY KEY (id);


--
-- Name: condiciones_convocatoria condiciones_convocatoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condiciones_convocatoria
    ADD CONSTRAINT condiciones_convocatoria_pkey PRIMARY KEY (id);


--
-- Name: conocimiento_operativo conocimiento_operativo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conocimiento_operativo
    ADD CONSTRAINT conocimiento_operativo_pkey PRIMARY KEY (id);


--
-- Name: contactos contactos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contactos
    ADD CONSTRAINT contactos_pkey PRIMARY KEY (id);


--
-- Name: contrata_contacto_roles contrata_contacto_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrata_contacto_roles
    ADD CONSTRAINT contrata_contacto_roles_pkey PRIMARY KEY (id);


--
-- Name: contrata_contactos contrata_contactos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrata_contactos
    ADD CONSTRAINT contrata_contactos_pkey PRIMARY KEY (id);


--
-- Name: contratas contratas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratas
    ADD CONSTRAINT contratas_pkey PRIMARY KEY (id);


--
-- Name: contratos_caes contratos_caes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos_caes
    ADD CONSTRAINT contratos_caes_pkey PRIMARY KEY (id);


--
-- Name: convocatorias convocatorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.convocatorias
    ADD CONSTRAINT convocatorias_pkey PRIMARY KEY (id);


--
-- Name: destinatarios_informe destinatarios_informe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destinatarios_informe
    ADD CONSTRAINT destinatarios_informe_pkey PRIMARY KEY (id);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id);


--
-- Name: empresas_compradoras_caes empresas_compradoras_caes_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas_compradoras_caes
    ADD CONSTRAINT empresas_compradoras_caes_nombre_key UNIQUE (nombre);


--
-- Name: empresas_compradoras_caes empresas_compradoras_caes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresas_compradoras_caes
    ADD CONSTRAINT empresas_compradoras_caes_pkey PRIMARY KEY (id);


--
-- Name: equipo_funciones equipo_funciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_funciones
    ADD CONSTRAINT equipo_funciones_pkey PRIMARY KEY (id);


--
-- Name: equipo_funciones equipo_funciones_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_funciones
    ADD CONSTRAINT equipo_funciones_uniq UNIQUE (equipo_id, funcion_id);


--
-- Name: equipo equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo
    ADD CONSTRAINT equipo_pkey PRIMARY KEY (id);


--
-- Name: escaneos_polycam escaneos_polycam_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escaneos_polycam
    ADD CONSTRAINT escaneos_polycam_pkey PRIMARY KEY (id);


--
-- Name: etapas_proyecto etapas_proyecto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapas_proyecto
    ADD CONSTRAINT etapas_proyecto_pkey PRIMARY KEY (id);


--
-- Name: expedientes expedientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_pkey PRIMARY KEY (id);


--
-- Name: extracciones_convocatoria extracciones_convocatoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracciones_convocatoria
    ADD CONSTRAINT extracciones_convocatoria_pkey PRIMARY KEY (id);


--
-- Name: facturas_caes facturas_caes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_caes
    ADD CONSTRAINT facturas_caes_pkey PRIMARY KEY (id);


--
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id);


--
-- Name: fases_obra_catalogo fases_obra_catalogo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fases_obra_catalogo
    ADD CONSTRAINT fases_obra_catalogo_pkey PRIMARY KEY (id);


--
-- Name: fotos_acta fotos_acta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fotos_acta
    ADD CONSTRAINT fotos_acta_pkey PRIMARY KEY (id);


--
-- Name: funciones funciones_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funciones
    ADD CONSTRAINT funciones_clave_key UNIQUE (clave);


--
-- Name: funciones funciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funciones
    ADD CONSTRAINT funciones_pkey PRIMARY KEY (id);


--
-- Name: gestiones_cobro gestiones_cobro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gestiones_cobro
    ADD CONSTRAINT gestiones_cobro_pkey PRIMARY KEY (id);


--
-- Name: hitos_cobro hitos_cobro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_cobro
    ADD CONSTRAINT hitos_cobro_pkey PRIMARY KEY (id);


--
-- Name: hitos_comerciales hitos_comerciales_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_comerciales
    ADD CONSTRAINT hitos_comerciales_clave_key UNIQUE (clave);


--
-- Name: hitos_comerciales hitos_comerciales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_comerciales
    ADD CONSTRAINT hitos_comerciales_pkey PRIMARY KEY (id);


--
-- Name: hitos_facturacion hitos_facturacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_facturacion
    ADD CONSTRAINT hitos_facturacion_pkey PRIMARY KEY (id);


--
-- Name: hitos_oportunidad hitos_oportunidad_oportunidad_id_hito_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_oportunidad
    ADD CONSTRAINT hitos_oportunidad_oportunidad_id_hito_key UNIQUE (oportunidad_id, hito);


--
-- Name: hitos_oportunidad hitos_oportunidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_oportunidad
    ADD CONSTRAINT hitos_oportunidad_pkey PRIMARY KEY (id);


--
-- Name: hojas_encargo_estado_historial hojas_encargo_estado_historial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hojas_encargo_estado_historial
    ADD CONSTRAINT hojas_encargo_estado_historial_pkey PRIMARY KEY (id);


--
-- Name: hojas_encargo hojas_encargo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hojas_encargo
    ADD CONSTRAINT hojas_encargo_pkey PRIMARY KEY (id);


--
-- Name: incidencias_obra incidencias_obra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias_obra
    ADD CONSTRAINT incidencias_obra_pkey PRIMARY KEY (id);


--
-- Name: instrucciones_obra instrucciones_obra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrucciones_obra
    ADD CONSTRAINT instrucciones_obra_pkey PRIMARY KEY (id);


--
-- Name: interaccion_comunidad interaccion_comunidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaccion_comunidad
    ADD CONSTRAINT interaccion_comunidad_pkey PRIMARY KEY (interaccion_id, comunidad_id);


--
-- Name: interacciones interacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interacciones
    ADD CONSTRAINT interacciones_pkey PRIMARY KEY (id);


--
-- Name: juntas juntas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.juntas
    ADD CONSTRAINT juntas_pkey PRIMARY KEY (id);


--
-- Name: licencias licencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licencias
    ADD CONSTRAINT licencias_pkey PRIMARY KEY (id);


--
-- Name: licitaciones licitaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licitaciones
    ADD CONSTRAINT licitaciones_pkey PRIMARY KEY (id);


--
-- Name: lineas_facturacion lineas_facturacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_facturacion
    ADD CONSTRAINT lineas_facturacion_pkey PRIMARY KEY (id);


--
-- Name: migracion_monday migracion_monday_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracion_monday
    ADD CONSTRAINT migracion_monday_pkey PRIMARY KEY (id);


--
-- Name: modelos_3d_venta modelos_3d_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_3d_venta
    ADD CONSTRAINT modelos_3d_venta_pkey PRIMARY KEY (id);


--
-- Name: modelos_escalera modelos_escalera_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_escalera
    ADD CONSTRAINT modelos_escalera_codigo_key UNIQUE (codigo);


--
-- Name: modelos_escalera modelos_escalera_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_escalera
    ADD CONSTRAINT modelos_escalera_pkey PRIMARY KEY (id);


--
-- Name: negociacion_oportunidad negociacion_oportunidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.negociacion_oportunidad
    ADD CONSTRAINT negociacion_oportunidad_pkey PRIMARY KEY (id);


--
-- Name: obras obras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_pkey PRIMARY KEY (id);


--
-- Name: ofertas_caes ofertas_caes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofertas_caes
    ADD CONSTRAINT ofertas_caes_pkey PRIMARY KEY (id);


--
-- Name: operaciones_caes operaciones_caes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones_caes
    ADD CONSTRAINT operaciones_caes_pkey PRIMARY KEY (id);


--
-- Name: oportunidades oportunidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_pkey PRIMARY KEY (id);


--
-- Name: parametros_alerta parametros_alerta_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_alerta
    ADD CONSTRAINT parametros_alerta_clave_key UNIQUE (clave);


--
-- Name: parametros_alerta parametros_alerta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros_alerta
    ADD CONSTRAINT parametros_alerta_pkey PRIMARY KEY (id);


--
-- Name: pasos_catalogo pasos_catalogo_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pasos_catalogo
    ADD CONSTRAINT pasos_catalogo_clave_key UNIQUE (clave);


--
-- Name: pasos_catalogo pasos_catalogo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pasos_catalogo
    ADD CONSTRAINT pasos_catalogo_pkey PRIMARY KEY (id);


--
-- Name: personal_interno personal_interno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_interno
    ADD CONSTRAINT personal_interno_pkey PRIMARY KEY (id);


--
-- Name: personas_comunidad personas_comunidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas_comunidad
    ADD CONSTRAINT personas_comunidad_pkey PRIMARY KEY (id);


--
-- Name: plan_pago_historial plan_pago_historial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_historial
    ADD CONSTRAINT plan_pago_historial_pkey PRIMARY KEY (id);


--
-- Name: presupuestos_licitacion presupuestos_licitacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuestos_licitacion
    ADD CONSTRAINT presupuestos_licitacion_pkey PRIMARY KEY (id);


--
-- Name: procesos_venta procesos_venta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos_venta
    ADD CONSTRAINT procesos_venta_pkey PRIMARY KEY (id);


--
-- Name: proyecto_contratas proyecto_contratas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto_contratas
    ADD CONSTRAINT proyecto_contratas_pkey PRIMARY KEY (id);


--
-- Name: proyecto_tipos proyecto_tipos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto_tipos
    ADD CONSTRAINT proyecto_tipos_pkey PRIMARY KEY (id);


--
-- Name: proyecto_tipos proyecto_tipos_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto_tipos
    ADD CONSTRAINT proyecto_tipos_uniq UNIQUE (proyecto_id, tipo_id);


--
-- Name: proyectos proyectos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_pkey PRIMARY KEY (id);


--
-- Name: requerimientos_caes requerimientos_caes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_caes
    ADD CONSTRAINT requerimientos_caes_pkey PRIMARY KEY (id);


--
-- Name: requerimientos_obra requerimientos_obra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_obra
    ADD CONSTRAINT requerimientos_obra_pkey PRIMARY KEY (id);


--
-- Name: requerimientos requerimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos
    ADD CONSTRAINT requerimientos_pkey PRIMARY KEY (id);


--
-- Name: requerimientos_tramitacion requerimientos_tramitacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_tramitacion
    ADD CONSTRAINT requerimientos_tramitacion_pkey PRIMARY KEY (id);


--
-- Name: requisitos_convocatoria requisitos_convocatoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisitos_convocatoria
    ADD CONSTRAINT requisitos_convocatoria_pkey PRIMARY KEY (id);


--
-- Name: resumenes_ia resumenes_ia_comunidad_id_fase_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumenes_ia
    ADD CONSTRAINT resumenes_ia_comunidad_id_fase_key UNIQUE (comunidad_id, fase);


--
-- Name: resumenes_ia resumenes_ia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumenes_ia
    ADD CONSTRAINT resumenes_ia_pkey PRIMARY KEY (id);


--
-- Name: revisiones_visado revisiones_visado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisiones_visado
    ADD CONSTRAINT revisiones_visado_pkey PRIMARY KEY (id);


--
-- Name: tareas_seguimiento tareas_seguimiento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas_seguimiento
    ADD CONSTRAINT tareas_seguimiento_pkey PRIMARY KEY (id);


--
-- Name: tecnicos tecnicos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tecnicos
    ADD CONSTRAINT tecnicos_pkey PRIMARY KEY (id);


--
-- Name: tiempos_estandar tiempos_estandar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiempos_estandar
    ADD CONSTRAINT tiempos_estandar_pkey PRIMARY KEY (id);


--
-- Name: tiempos_estandar tiempos_estandar_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tiempos_estandar
    ADD CONSTRAINT tiempos_estandar_uniq UNIQUE (contexto, clave);


--
-- Name: tipos_documento tipos_documento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_documento
    ADD CONSTRAINT tipos_documento_pkey PRIMARY KEY (id);


--
-- Name: tipos_proyecto tipos_proyecto_clave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_proyecto
    ADD CONSTRAINT tipos_proyecto_clave_key UNIQUE (clave);


--
-- Name: tipos_proyecto tipos_proyecto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_proyecto
    ADD CONSTRAINT tipos_proyecto_pkey PRIMARY KEY (id);


--
-- Name: tipos_servicio tipos_servicio_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_servicio
    ADD CONSTRAINT tipos_servicio_codigo_key UNIQUE (codigo);


--
-- Name: tipos_servicio tipos_servicio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_servicio
    ADD CONSTRAINT tipos_servicio_pkey PRIMARY KEY (id);


--
-- Name: cierre_obra uq_cierre_obra_obra; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierre_obra
    ADD CONSTRAINT uq_cierre_obra_obra UNIQUE (obra_id);


--
-- Name: CONSTRAINT uq_cierre_obra_obra ON cierre_obra; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT uq_cierre_obra_obra ON public.cierre_obra IS 'Una fila de cierre por obra.';


--
-- Name: contrata_contacto_roles uq_contrata_contacto_roles_contacto_rol; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrata_contacto_roles
    ADD CONSTRAINT uq_contrata_contacto_roles_contacto_rol UNIQUE (contacto_id, rol);


--
-- Name: expedientes uq_expedientes_comunidad_convocatoria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT uq_expedientes_comunidad_convocatoria UNIQUE (comunidad_id, convocatoria_id);


--
-- Name: CONSTRAINT uq_expedientes_comunidad_convocatoria ON expedientes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT uq_expedientes_comunidad_convocatoria ON public.expedientes IS 'Un expediente por comunidad y convocatoria.';


--
-- Name: extracciones_convocatoria uq_extracciones_convocatoria_convocatoria; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracciones_convocatoria
    ADD CONSTRAINT uq_extracciones_convocatoria_convocatoria UNIQUE (convocatoria_id);


--
-- Name: migracion_monday uq_migracion_monday; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migracion_monday
    ADD CONSTRAINT uq_migracion_monday UNIQUE (board, monday_item_id, tabla_destino);


--
-- Name: proyecto_contratas uq_proyecto_contratas_proyecto_contrata_papel; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto_contratas
    ADD CONSTRAINT uq_proyecto_contratas_proyecto_contrata_papel UNIQUE (proyecto_id, contrata_id, papel);


--
-- Name: requisitos_convocatoria uq_requisitos_convocatoria_convocatoria_tipo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisitos_convocatoria
    ADD CONSTRAINT uq_requisitos_convocatoria_convocatoria_tipo UNIQUE (convocatoria_id, tipo_documento_id);


--
-- Name: revisiones_visado uq_revision_visado; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisiones_visado
    ADD CONSTRAINT uq_revision_visado UNIQUE (visado_id, n_revision);


--
-- Name: versiones_hoja uq_versiones_hoja; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versiones_hoja
    ADD CONSTRAINT uq_versiones_hoja UNIQUE (hoja_encargo_id, numero_version);


--
-- Name: uso_llm uso_llm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_llm
    ADD CONSTRAINT uso_llm_pkey PRIMARY KEY (id);


--
-- Name: versiones_hoja versiones_hoja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versiones_hoja
    ADD CONSTRAINT versiones_hoja_pkey PRIMARY KEY (id);


--
-- Name: viabilidad_conceptos viabilidad_conceptos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viabilidad_conceptos
    ADD CONSTRAINT viabilidad_conceptos_pkey PRIMARY KEY (id);


--
-- Name: viabilidades viabilidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viabilidades
    ADD CONSTRAINT viabilidades_pkey PRIMARY KEY (id);


--
-- Name: visados visados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visados
    ADD CONSTRAINT visados_pkey PRIMARY KEY (id);


--
-- Name: visitas_obra visitas_obra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas_obra
    ADD CONSTRAINT visitas_obra_pkey PRIMARY KEY (id);


--
-- Name: idx_acuerdos_comision_administracion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acuerdos_comision_administracion_id ON public.acuerdos_comision USING btree (administracion_id);


--
-- Name: idx_acuerdos_comision_administrador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acuerdos_comision_administrador_id ON public.acuerdos_comision USING btree (administrador_id);


--
-- Name: idx_acuerdos_comision_contrata_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acuerdos_comision_contrata_id ON public.acuerdos_comision USING btree (contrata_id);


--
-- Name: idx_acuerdos_comision_tipo_servicio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acuerdos_comision_tipo_servicio_id ON public.acuerdos_comision USING btree (tipo_servicio_id);


--
-- Name: idx_administracion_origen_admin_referente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administracion_origen_admin_referente_id ON public.administracion_origen USING btree (admin_referente_id);


--
-- Name: idx_administracion_origen_administracion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administracion_origen_administracion_id ON public.administracion_origen USING btree (administracion_id);


--
-- Name: idx_administracion_origen_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administracion_origen_comercial_id ON public.administracion_origen USING btree (comercial_id);


--
-- Name: idx_administracion_origen_contrata_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administracion_origen_contrata_id ON public.administracion_origen USING btree (contrata_id);


--
-- Name: idx_administracion_origen_servicio_reservado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administracion_origen_servicio_reservado_id ON public.administracion_origen USING btree (servicio_reservado_id);


--
-- Name: idx_administraciones_fincas_comercial_captador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administraciones_fincas_comercial_captador_id ON public.administraciones_fincas USING btree (comercial_captador_id);


--
-- Name: idx_administraciones_fincas_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administraciones_fincas_comercial_id ON public.administraciones_fincas USING btree (comercial_id);


--
-- Name: idx_administraciones_fincas_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administraciones_fincas_estado ON public.administraciones_fincas USING btree (estado);


--
-- Name: idx_administraciones_fincas_fecha_ultimo_contacto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administraciones_fincas_fecha_ultimo_contacto ON public.administraciones_fincas USING btree (fecha_ultimo_contacto);


--
-- Name: idx_administraciones_fincas_titular_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administraciones_fincas_titular_id ON public.administraciones_fincas USING btree (titular_id);


--
-- Name: idx_administradores_administracion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administradores_administracion_id ON public.administradores USING btree (administracion_id);


--
-- Name: idx_administradores_comercial_captador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administradores_comercial_captador_id ON public.administradores USING btree (comercial_captador_id);


--
-- Name: idx_administradores_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administradores_comercial_id ON public.administradores USING btree (comercial_id);


--
-- Name: idx_administradores_fecha_ultimo_contacto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administradores_fecha_ultimo_contacto ON public.administradores USING btree (fecha_ultimo_contacto);


--
-- Name: idx_administradores_fecha_ultimo_encargo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administradores_fecha_ultimo_encargo ON public.administradores USING btree (fecha_ultimo_encargo);


--
-- Name: idx_administradores_nombre_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administradores_nombre_trgm ON public.administradores USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_beneficiarios_reparto_caes_administrador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beneficiarios_reparto_caes_administrador_id ON public.beneficiarios_reparto_caes USING btree (administrador_id);


--
-- Name: idx_beneficiarios_reparto_caes_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beneficiarios_reparto_caes_comunidad_id ON public.beneficiarios_reparto_caes USING btree (comunidad_id);


--
-- Name: idx_beneficiarios_reparto_caes_contrata_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beneficiarios_reparto_caes_contrata_id ON public.beneficiarios_reparto_caes USING btree (contrata_id);


--
-- Name: idx_beneficiarios_reparto_caes_operacion_caes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beneficiarios_reparto_caes_operacion_caes_id ON public.beneficiarios_reparto_caes USING btree (operacion_caes_id);


--
-- Name: idx_bitacora_ia_creado_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_ia_creado_en ON public.bitacora_ia USING btree (creado_en);


--
-- Name: idx_bitacora_ia_operacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_ia_operacion ON public.bitacora_ia USING btree (operacion);


--
-- Name: idx_bitacora_ia_pendientes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_ia_pendientes ON public.bitacora_ia USING btree (creado_en) WHERE (deshecho = false);


--
-- Name: idx_bitacora_ia_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_ia_target ON public.bitacora_ia USING btree (target_tabla, target_id);


--
-- Name: idx_cierre_obra_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cierre_obra_obra_id ON public.cierre_obra USING btree (obra_id);


--
-- Name: idx_cobros_fecha_cobro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cobros_fecha_cobro ON public.cobros USING btree (fecha_cobro);


--
-- Name: idx_cobros_hito_facturacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cobros_hito_facturacion_id ON public.cobros USING btree (hito_facturacion_id);


--
-- Name: idx_comisiones_proyecto_acuerdo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_proyecto_acuerdo_id ON public.comisiones_proyecto USING btree (acuerdo_id);


--
-- Name: idx_comisiones_proyecto_administracion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_proyecto_administracion_id ON public.comisiones_proyecto USING btree (administracion_id);


--
-- Name: idx_comisiones_proyecto_administrador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_proyecto_administrador_id ON public.comisiones_proyecto USING btree (administrador_id);


--
-- Name: idx_comisiones_proyecto_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_proyecto_comercial_id ON public.comisiones_proyecto USING btree (comercial_id);


--
-- Name: idx_comisiones_proyecto_estado_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_proyecto_estado_pago ON public.comisiones_proyecto USING btree (estado_pago);


--
-- Name: idx_comisiones_proyecto_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comisiones_proyecto_proyecto_id ON public.comisiones_proyecto USING btree (proyecto_id);


--
-- Name: idx_comunidades_administracion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunidades_administracion_id ON public.comunidades USING btree (administracion_id);


--
-- Name: idx_comunidades_administrador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunidades_administrador_id ON public.comunidades USING btree (administrador_id);


--
-- Name: idx_comunidades_direccion_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunidades_direccion_trgm ON public.comunidades USING gin (direccion public.gin_trgm_ops);


--
-- Name: idx_comunidades_fecha_ultimo_contacto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunidades_fecha_ultimo_contacto ON public.comunidades USING btree (fecha_ultimo_contacto);


--
-- Name: idx_comunidades_nombre_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunidades_nombre_trgm ON public.comunidades USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_conceptos_hoja_bloque; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conceptos_hoja_bloque ON public.conceptos_hoja USING btree (bloque_id);


--
-- Name: idx_conceptos_hoja_hoja_encargo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conceptos_hoja_hoja_encargo_id ON public.conceptos_hoja USING btree (hoja_encargo_id);


--
-- Name: idx_conceptos_hoja_incluido_en_concepto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conceptos_hoja_incluido_en_concepto_id ON public.conceptos_hoja USING btree (incluido_en_concepto_id);


--
-- Name: idx_conceptos_hoja_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conceptos_hoja_proyecto_id ON public.conceptos_hoja USING btree (proyecto_id);


--
-- Name: idx_conceptos_hoja_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conceptos_hoja_version ON public.conceptos_hoja USING btree (version_hoja_id);


--
-- Name: idx_condicionantes_comunidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_condicionantes_comunidad ON public.condicionantes_comunidad USING btree (comunidad_id);


--
-- Name: idx_condiciones_convocatoria_convocatoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_condiciones_convocatoria_convocatoria_id ON public.condiciones_convocatoria USING btree (convocatoria_id);


--
-- Name: idx_conocimiento_operativo_aportado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conocimiento_operativo_aportado_por ON public.conocimiento_operativo USING btree (aportado_por);


--
-- Name: idx_conocimiento_operativo_vigente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conocimiento_operativo_vigente ON public.conocimiento_operativo USING btree (creado_en) WHERE (vigente = true);


--
-- Name: idx_contactos_administracion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contactos_administracion_id ON public.contactos USING btree (administracion_id);


--
-- Name: idx_contactos_persona_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contactos_persona_id ON public.contactos USING btree (persona_id);


--
-- Name: idx_contactos_proposito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contactos_proposito ON public.contactos USING btree (proposito);


--
-- Name: idx_contrata_contacto_roles_contacto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrata_contacto_roles_contacto_id ON public.contrata_contacto_roles USING btree (contacto_id);


--
-- Name: idx_contrata_contactos_contrata_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contrata_contactos_contrata_id ON public.contrata_contactos USING btree (contrata_id);


--
-- Name: idx_contratos_caes_junta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contratos_caes_junta_id ON public.contratos_caes USING btree (junta_id);


--
-- Name: idx_contratos_caes_operacion_caes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contratos_caes_operacion_caes_id ON public.contratos_caes USING btree (operacion_caes_id);


--
-- Name: idx_convocatorias_fecha_apertura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_convocatorias_fecha_apertura ON public.convocatorias USING btree (fecha_apertura);


--
-- Name: idx_convocatorias_fecha_cierre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_convocatorias_fecha_cierre ON public.convocatorias USING btree (fecha_cierre);


--
-- Name: idx_destinatarios_informe_comunidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_destinatarios_informe_comunidad ON public.destinatarios_informe USING btree (comunidad_id);


--
-- Name: idx_documentos_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_comunidad_id ON public.documentos USING btree (comunidad_id);


--
-- Name: idx_documentos_fecha_caducidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_fecha_caducidad ON public.documentos USING btree (fecha_caducidad);


--
-- Name: idx_documentos_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_grupo ON public.documentos USING btree (grupo_id, n_version);


--
-- Name: idx_documentos_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_proyecto_id ON public.documentos USING btree (proyecto_id);


--
-- Name: idx_documentos_proyecto_vigente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_proyecto_vigente ON public.documentos USING btree (proyecto_id) WHERE vigente;


--
-- Name: idx_documentos_requerimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_requerimiento ON public.documentos USING btree (requerimiento_id);


--
-- Name: idx_documentos_tipo_documento_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_tipo_documento_id ON public.documentos USING btree (tipo_documento_id);


--
-- Name: idx_documentos_vigente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documentos_vigente ON public.documentos USING btree (vigente);


--
-- Name: idx_equipo_funciones_equipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipo_funciones_equipo ON public.equipo_funciones USING btree (equipo_id);


--
-- Name: idx_equipo_funciones_funcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipo_funciones_funcion ON public.equipo_funciones USING btree (funcion_id);


--
-- Name: idx_escaneos_polycam_arquitecto_revisor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escaneos_polycam_arquitecto_revisor_id ON public.escaneos_polycam USING btree (arquitecto_revisor_id);


--
-- Name: idx_escaneos_polycam_modelo_escalera_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escaneos_polycam_modelo_escalera_id ON public.escaneos_polycam USING btree (modelo_escalera_id);


--
-- Name: idx_escaneos_polycam_proceso_venta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_escaneos_polycam_proceso_venta_id ON public.escaneos_polycam USING btree (proceso_venta_id);


--
-- Name: idx_etapas_proyecto_fecha_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapas_proyecto_fecha_estado ON public.etapas_proyecto USING btree (fecha_estado);


--
-- Name: idx_etapas_proyecto_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapas_proyecto_proyecto_id ON public.etapas_proyecto USING btree (proyecto_id);


--
-- Name: idx_etapas_proyecto_responsable_tecnico_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapas_proyecto_responsable_tecnico_id ON public.etapas_proyecto USING btree (responsable_tecnico_id);


--
-- Name: idx_etapas_proyecto_tasas_fecha_solicitud; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapas_proyecto_tasas_fecha_solicitud ON public.etapas_proyecto USING btree (tasas_fecha_solicitud);


--
-- Name: idx_expedientes_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expedientes_comunidad_id ON public.expedientes USING btree (comunidad_id);


--
-- Name: idx_expedientes_convocatoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expedientes_convocatoria_id ON public.expedientes USING btree (convocatoria_id);


--
-- Name: idx_expedientes_fecha_cobro_comunidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expedientes_fecha_cobro_comunidad ON public.expedientes USING btree (fecha_cobro_comunidad);


--
-- Name: idx_expedientes_fecha_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expedientes_fecha_estado ON public.expedientes USING btree (fecha_estado);


--
-- Name: idx_expedientes_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expedientes_proyecto_id ON public.expedientes USING btree (proyecto_id);


--
-- Name: idx_extracciones_convocatoria_convocatoria_ejemplo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracciones_convocatoria_convocatoria_ejemplo_id ON public.extracciones_convocatoria USING btree (convocatoria_ejemplo_id);


--
-- Name: idx_extracciones_convocatoria_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracciones_convocatoria_estado ON public.extracciones_convocatoria USING btree (estado);


--
-- Name: idx_extracciones_convocatoria_validado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extracciones_convocatoria_validado_por ON public.extracciones_convocatoria USING btree (validado_por);


--
-- Name: idx_facturas_caes_operacion_caes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_caes_operacion_caes_id ON public.facturas_caes USING btree (operacion_caes_id);


--
-- Name: idx_facturas_fecha_emision; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_fecha_emision ON public.facturas USING btree (fecha_emision);


--
-- Name: idx_facturas_hito_facturacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_hito_facturacion_id ON public.facturas USING btree (hito_facturacion_id);


--
-- Name: idx_facturas_hoja_encargo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facturas_hoja_encargo_id ON public.facturas USING btree (hoja_encargo_id);


--
-- Name: idx_fases_obra_catalogo_tipo_actuacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fases_obra_catalogo_tipo_actuacion ON public.fases_obra_catalogo USING btree (tipo_actuacion);


--
-- Name: idx_fotos_acta_visita; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fotos_acta_visita ON public.fotos_acta USING btree (visita_id);


--
-- Name: idx_gestiones_cobro_hito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gestiones_cobro_hito ON public.gestiones_cobro USING btree (hito_cobro_id);


--
-- Name: idx_hitos_cobro_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitos_cobro_estado ON public.hitos_cobro USING btree (estado);


--
-- Name: idx_hitos_cobro_linea; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitos_cobro_linea ON public.hitos_cobro USING btree (linea_facturacion_id);


--
-- Name: idx_hitos_facturacion_fecha_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitos_facturacion_fecha_estado ON public.hitos_facturacion USING btree (fecha_estado);


--
-- Name: idx_hitos_facturacion_fecha_prevista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitos_facturacion_fecha_prevista ON public.hitos_facturacion USING btree (fecha_prevista);


--
-- Name: idx_hitos_facturacion_hoja_encargo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitos_facturacion_hoja_encargo_id ON public.hitos_facturacion USING btree (hoja_encargo_id);


--
-- Name: idx_hitos_oportunidad_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hitos_oportunidad_op ON public.hitos_oportunidad USING btree (oportunidad_id);


--
-- Name: idx_hojas_encargo_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_encargo_comunidad_id ON public.hojas_encargo USING btree (comunidad_id);


--
-- Name: idx_hojas_encargo_estado_historial_hoja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_encargo_estado_historial_hoja ON public.hojas_encargo_estado_historial USING btree (hoja_encargo_id, fecha_estado);


--
-- Name: idx_hojas_encargo_fecha_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_encargo_fecha_estado ON public.hojas_encargo USING btree (fecha_estado);


--
-- Name: idx_hojas_encargo_fecha_firma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_encargo_fecha_firma ON public.hojas_encargo USING btree (fecha_firma);


--
-- Name: idx_hojas_encargo_oportunidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_encargo_oportunidad ON public.hojas_encargo USING btree (oportunidad_id);


--
-- Name: idx_hojas_encargo_pagador_contrata_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_encargo_pagador_contrata_id ON public.hojas_encargo USING btree (pagador_contrata_id);


--
-- Name: idx_hojas_encargo_proceso_venta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_encargo_proceso_venta_id ON public.hojas_encargo USING btree (proceso_venta_id);


--
-- Name: idx_hojas_encargo_version_firmada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hojas_encargo_version_firmada ON public.hojas_encargo USING btree (version_firmada_id);


--
-- Name: idx_incidencias_obra_fecha_deteccion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidencias_obra_fecha_deteccion ON public.incidencias_obra USING btree (fecha_deteccion);


--
-- Name: idx_incidencias_obra_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidencias_obra_obra_id ON public.incidencias_obra USING btree (obra_id);


--
-- Name: idx_incidencias_obra_visita_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incidencias_obra_visita_obra_id ON public.incidencias_obra USING btree (visita_obra_id);


--
-- Name: idx_instrucciones_obra_fecha_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instrucciones_obra_fecha_orden ON public.instrucciones_obra USING btree (fecha_orden);


--
-- Name: idx_instrucciones_obra_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instrucciones_obra_obra_id ON public.instrucciones_obra USING btree (obra_id);


--
-- Name: idx_instrucciones_obra_visita_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instrucciones_obra_visita_obra_id ON public.instrucciones_obra USING btree (visita_obra_id);


--
-- Name: idx_interaccion_comunidad_comunidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interaccion_comunidad_comunidad ON public.interaccion_comunidad USING btree (comunidad_id);


--
-- Name: idx_interacciones_administrador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interacciones_administrador_id ON public.interacciones USING btree (administrador_id);


--
-- Name: idx_interacciones_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interacciones_comercial_id ON public.interacciones USING btree (comercial_id);


--
-- Name: idx_interacciones_fecha_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interacciones_fecha_evento ON public.interacciones USING btree (fecha_evento);


--
-- Name: idx_interacciones_oportunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interacciones_oportunidad_id ON public.interacciones USING btree (oportunidad_id);


--
-- Name: idx_interacciones_pendiente_vincular; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interacciones_pendiente_vincular ON public.interacciones USING btree (creado_en) WHERE (pendiente_vincular = true);


--
-- Name: idx_interacciones_requiere_humano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interacciones_requiere_humano ON public.interacciones USING btree (creado_en) WHERE (requiere_humano = true);


--
-- Name: idx_juntas_fecha_junta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_juntas_fecha_junta ON public.juntas USING btree (fecha_junta);


--
-- Name: idx_juntas_oportunidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_juntas_oportunidad ON public.juntas USING btree (oportunidad_id);


--
-- Name: idx_juntas_proceso_venta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_juntas_proceso_venta_id ON public.juntas USING btree (proceso_venta_id);


--
-- Name: idx_juntas_seguimiento_desde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_juntas_seguimiento_desde ON public.juntas USING btree (seguimiento_desde);


--
-- Name: idx_licencias_proyecto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licencias_proyecto ON public.licencias USING btree (proyecto_id);


--
-- Name: idx_licencias_tramita; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licencias_tramita ON public.licencias USING btree (tramita_equipo_id);


--
-- Name: idx_licitaciones_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licitaciones_comercial_id ON public.licitaciones USING btree (comercial_id);


--
-- Name: idx_licitaciones_esperando_desde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licitaciones_esperando_desde ON public.licitaciones USING btree (esperando_desde);


--
-- Name: idx_licitaciones_estado_desde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licitaciones_estado_desde ON public.licitaciones USING btree (estado_desde);


--
-- Name: idx_licitaciones_junta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licitaciones_junta_id ON public.licitaciones USING btree (junta_id);


--
-- Name: idx_licitaciones_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_licitaciones_proyecto_id ON public.licitaciones USING btree (proyecto_id);


--
-- Name: idx_lineas_fact_concepto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lineas_fact_concepto ON public.lineas_facturacion USING btree (concepto_hoja_id);


--
-- Name: idx_lineas_fact_contrata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lineas_fact_contrata ON public.lineas_facturacion USING btree (pagador_contrata_id);


--
-- Name: idx_lineas_fact_hoja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lineas_fact_hoja ON public.lineas_facturacion USING btree (hoja_encargo_id);


--
-- Name: idx_migracion_monday_monday_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migracion_monday_monday_item ON public.migracion_monday USING btree (monday_item_id);


--
-- Name: idx_migracion_monday_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migracion_monday_registro ON public.migracion_monday USING btree (tabla_destino, registro_id);


--
-- Name: idx_modelos_3d_venta_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modelos_3d_venta_estado ON public.modelos_3d_venta USING btree (estado);


--
-- Name: idx_modelos_3d_venta_fecha_necesaria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modelos_3d_venta_fecha_necesaria ON public.modelos_3d_venta USING btree (fecha_necesaria);


--
-- Name: idx_modelos_3d_venta_junta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modelos_3d_venta_junta_id ON public.modelos_3d_venta USING btree (junta_id);


--
-- Name: idx_modelos_3d_venta_modelo_escalera_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modelos_3d_venta_modelo_escalera_id ON public.modelos_3d_venta USING btree (modelo_escalera_id);


--
-- Name: idx_modelos_3d_venta_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modelos_3d_venta_op ON public.modelos_3d_venta USING btree (oportunidad_id);


--
-- Name: idx_modelos_3d_venta_proceso_venta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modelos_3d_venta_proceso_venta_id ON public.modelos_3d_venta USING btree (proceso_venta_id);


--
-- Name: idx_modelos_3d_venta_tecnico_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modelos_3d_venta_tecnico_id ON public.modelos_3d_venta USING btree (tecnico_id);


--
-- Name: idx_negociacion_op; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_negociacion_op ON public.negociacion_oportunidad USING btree (oportunidad_id, creado_en DESC);


--
-- Name: idx_obras_cfo_visado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_cfo_visado ON public.obras USING btree (cfo_visado_id);


--
-- Name: idx_obras_constructora_contrata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_constructora_contrata ON public.obras USING btree (constructora_contrata_id);


--
-- Name: idx_obras_fecha_acta_inicio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_fecha_acta_inicio ON public.obras USING btree (fecha_acta_inicio);


--
-- Name: idx_obras_fecha_apertura_centro_trabajo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_fecha_apertura_centro_trabajo ON public.obras USING btree (fecha_apertura_centro_trabajo);


--
-- Name: idx_obras_fecha_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_fecha_estado ON public.obras USING btree (fecha_estado);


--
-- Name: idx_obras_fecha_fin_obra; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_fecha_fin_obra ON public.obras USING btree (fecha_fin_obra);


--
-- Name: idx_obras_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_obras_proyecto_id ON public.obras USING btree (proyecto_id);


--
-- Name: idx_ofertas_caes_empresa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ofertas_caes_empresa_id ON public.ofertas_caes USING btree (empresa_id);


--
-- Name: idx_ofertas_caes_operacion_caes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ofertas_caes_operacion_caes_id ON public.ofertas_caes USING btree (operacion_caes_id);


--
-- Name: idx_operaciones_caes_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operaciones_caes_comunidad_id ON public.operaciones_caes USING btree (comunidad_id);


--
-- Name: idx_operaciones_caes_esperando_desde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operaciones_caes_esperando_desde ON public.operaciones_caes USING btree (esperando_desde);


--
-- Name: idx_operaciones_caes_estado_desde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operaciones_caes_estado_desde ON public.operaciones_caes USING btree (estado_desde);


--
-- Name: idx_operaciones_caes_hoja_encargo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operaciones_caes_hoja_encargo_id ON public.operaciones_caes USING btree (hoja_encargo_id);


--
-- Name: idx_operaciones_caes_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operaciones_caes_proyecto_id ON public.operaciones_caes USING btree (proyecto_id);


--
-- Name: idx_oportunidades_administrador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_administrador_id ON public.oportunidades USING btree (administrador_id);


--
-- Name: idx_oportunidades_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_comercial_id ON public.oportunidades USING btree (comercial_id);


--
-- Name: idx_oportunidades_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_comunidad_id ON public.oportunidades USING btree (comunidad_id);


--
-- Name: idx_oportunidades_contrata_origen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_contrata_origen_id ON public.oportunidades USING btree (contrata_origen_id);


--
-- Name: idx_oportunidades_oportunidad_origen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_oportunidad_origen_id ON public.oportunidades USING btree (oportunidad_origen_id);


--
-- Name: idx_oportunidades_persona_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_persona_comunidad_id ON public.oportunidades USING btree (persona_comunidad_id);


--
-- Name: idx_oportunidades_reactivar_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_reactivar_fecha ON public.oportunidades USING btree (reactivar_fecha) WHERE (reactivar_fecha IS NOT NULL);


--
-- Name: idx_personal_interno_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personal_interno_activo ON public.personal_interno USING btree (activo) WHERE (activo = true);


--
-- Name: idx_personas_comunidad_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personas_comunidad_comunidad_id ON public.personas_comunidad USING btree (comunidad_id);


--
-- Name: idx_plan_hist_hoja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_hist_hoja ON public.plan_pago_historial USING btree (hoja_encargo_id);


--
-- Name: idx_presupuestos_licitacion_contrata_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presupuestos_licitacion_contrata_id ON public.presupuestos_licitacion USING btree (contrata_id);


--
-- Name: idx_presupuestos_licitacion_licitacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presupuestos_licitacion_licitacion_id ON public.presupuestos_licitacion USING btree (licitacion_id);


--
-- Name: idx_procesos_venta_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procesos_venta_comercial_id ON public.procesos_venta USING btree (comercial_id);


--
-- Name: idx_procesos_venta_esperando_desde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procesos_venta_esperando_desde ON public.procesos_venta USING btree (esperando_desde);


--
-- Name: idx_procesos_venta_estado_desde; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procesos_venta_estado_desde ON public.procesos_venta USING btree (estado_desde);


--
-- Name: idx_procesos_venta_oportunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procesos_venta_oportunidad_id ON public.procesos_venta USING btree (oportunidad_id);


--
-- Name: idx_procesos_venta_tipo_servicio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procesos_venta_tipo_servicio_id ON public.procesos_venta USING btree (tipo_servicio_id);


--
-- Name: idx_proyecto_contratas_comision_estado_cobro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyecto_contratas_comision_estado_cobro ON public.proyecto_contratas USING btree (comision_estado_cobro);


--
-- Name: idx_proyecto_contratas_contrata_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyecto_contratas_contrata_id ON public.proyecto_contratas USING btree (contrata_id);


--
-- Name: idx_proyecto_contratas_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyecto_contratas_proyecto_id ON public.proyecto_contratas USING btree (proyecto_id);


--
-- Name: idx_proyecto_tipos_proyecto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyecto_tipos_proyecto ON public.proyecto_tipos USING btree (proyecto_id);


--
-- Name: idx_proyecto_tipos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyecto_tipos_tipo ON public.proyecto_tipos USING btree (tipo_id);


--
-- Name: idx_proyectos_comercial_captador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyectos_comercial_captador_id ON public.proyectos USING btree (comercial_captador_id);


--
-- Name: idx_proyectos_comercial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyectos_comercial_id ON public.proyectos USING btree (comercial_id);


--
-- Name: idx_proyectos_comunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyectos_comunidad_id ON public.proyectos USING btree (comunidad_id);


--
-- Name: idx_proyectos_fecha_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proyectos_fecha_estado ON public.proyectos USING btree (fecha_estado);


--
-- Name: idx_requerimientos_caes_operacion_caes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_caes_operacion_caes_id ON public.requerimientos_caes USING btree (operacion_caes_id);


--
-- Name: idx_requerimientos_caes_plazo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_caes_plazo ON public.requerimientos_caes USING btree (plazo);


--
-- Name: idx_requerimientos_expediente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_expediente_id ON public.requerimientos USING btree (expediente_id);


--
-- Name: idx_requerimientos_fecha_limite_respuesta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_fecha_limite_respuesta ON public.requerimientos USING btree (fecha_limite_respuesta);


--
-- Name: idx_requerimientos_fecha_recepcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_fecha_recepcion ON public.requerimientos USING btree (fecha_recepcion);


--
-- Name: idx_requerimientos_obra_fecha_apertura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_obra_fecha_apertura ON public.requerimientos_obra USING btree (fecha_apertura);


--
-- Name: idx_requerimientos_obra_fecha_limite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_obra_fecha_limite ON public.requerimientos_obra USING btree (fecha_limite);


--
-- Name: idx_requerimientos_obra_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_obra_obra_id ON public.requerimientos_obra USING btree (obra_id);


--
-- Name: idx_requerimientos_obra_responsable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_obra_responsable_id ON public.requerimientos_obra USING btree (responsable_id);


--
-- Name: idx_requerimientos_tramitacion_etapa_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_tramitacion_etapa_proyecto_id ON public.requerimientos_tramitacion USING btree (etapa_proyecto_id);


--
-- Name: idx_requerimientos_tramitacion_fecha_limite_respuesta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_tramitacion_fecha_limite_respuesta ON public.requerimientos_tramitacion USING btree (fecha_limite_respuesta);


--
-- Name: idx_requerimientos_tramitacion_fecha_recepcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_tramitacion_fecha_recepcion ON public.requerimientos_tramitacion USING btree (fecha_recepcion);


--
-- Name: idx_requerimientos_tramitacion_proyecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_tramitacion_proyecto_id ON public.requerimientos_tramitacion USING btree (proyecto_id);


--
-- Name: idx_requerimientos_tramitacion_responsable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requerimientos_tramitacion_responsable_id ON public.requerimientos_tramitacion USING btree (responsable_id);


--
-- Name: idx_requisitos_convocatoria_convocatoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requisitos_convocatoria_convocatoria_id ON public.requisitos_convocatoria USING btree (convocatoria_id);


--
-- Name: idx_requisitos_convocatoria_tipo_documento_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requisitos_convocatoria_tipo_documento_id ON public.requisitos_convocatoria USING btree (tipo_documento_id);


--
-- Name: idx_resumenes_ia_comunidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resumenes_ia_comunidad ON public.resumenes_ia USING btree (comunidad_id);


--
-- Name: idx_revisiones_visado_visado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revisiones_visado_visado ON public.revisiones_visado USING btree (visado_id);


--
-- Name: idx_tareas_seguimiento_comercial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tareas_seguimiento_comercial ON public.tareas_seguimiento USING btree (comercial_id);


--
-- Name: idx_tareas_seguimiento_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tareas_seguimiento_estado ON public.tareas_seguimiento USING btree (estado);


--
-- Name: idx_tipos_proyecto_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tipos_proyecto_parent ON public.tipos_proyecto USING btree (parent_id);


--
-- Name: idx_uso_llm_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uso_llm_actor_id ON public.uso_llm USING btree (actor_id);


--
-- Name: idx_uso_llm_creado_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uso_llm_creado_en ON public.uso_llm USING btree (creado_en);


--
-- Name: idx_uso_llm_origen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uso_llm_origen ON public.uso_llm USING btree (origen);


--
-- Name: idx_versiones_hoja_hoja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versiones_hoja_hoja ON public.versiones_hoja USING btree (hoja_encargo_id);


--
-- Name: idx_viabilidad_conceptos_bloque_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viabilidad_conceptos_bloque_id ON public.viabilidad_conceptos USING btree (bloque_id);


--
-- Name: idx_viabilidad_conceptos_viabilidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viabilidad_conceptos_viabilidad_id ON public.viabilidad_conceptos USING btree (viabilidad_id);


--
-- Name: idx_viabilidades_arquitecto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viabilidades_arquitecto_id ON public.viabilidades USING btree (arquitecto_id);


--
-- Name: idx_viabilidades_oportunidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_viabilidades_oportunidad ON public.viabilidades USING btree (oportunidad_id);


--
-- Name: idx_visados_proyecto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visados_proyecto ON public.visados USING btree (proyecto_id);


--
-- Name: idx_visados_tramita; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visados_tramita ON public.visados USING btree (tramita_equipo_id);


--
-- Name: idx_visitas_obra_autor_tecnico_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitas_obra_autor_tecnico_id ON public.visitas_obra USING btree (autor_tecnico_id);


--
-- Name: idx_visitas_obra_fase_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitas_obra_fase_obra_id ON public.visitas_obra USING btree (fase_obra_id);


--
-- Name: idx_visitas_obra_fecha_visita; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitas_obra_fecha_visita ON public.visitas_obra USING btree (fecha_visita);


--
-- Name: idx_visitas_obra_obra_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitas_obra_obra_id ON public.visitas_obra USING btree (obra_id);


--
-- Name: uq_documentos_vigente_por_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_documentos_vigente_por_grupo ON public.documentos USING btree (grupo_id) WHERE vigente;


--
-- Name: uq_resumenes_ia_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_resumenes_ia_admin ON public.resumenes_ia USING btree (administrador_id, fase) WHERE (administrador_id IS NOT NULL);


--
-- Name: interacciones trg_actualizar_ultimo_contacto_admin; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_actualizar_ultimo_contacto_admin AFTER INSERT ON public.interacciones FOR EACH ROW EXECUTE FUNCTION public.actualizar_ultimo_contacto_admin();


--
-- Name: condicionantes_comunidad trg_condicionantes_comunidad_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_condicionantes_comunidad_upd BEFORE UPDATE ON public.condicionantes_comunidad FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: hitos_oportunidad trg_hitos_oportunidad_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_hitos_oportunidad_upd BEFORE UPDATE ON public.hitos_oportunidad FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: oportunidades trg_oportunidad_hitos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_oportunidad_hitos AFTER INSERT ON public.oportunidades FOR EACH ROW EXECUTE FUNCTION public.crear_hitos_oportunidad();


--
-- Name: resumenes_ia trg_resumenes_ia_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_resumenes_ia_upd BEFORE UPDATE ON public.resumenes_ia FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: acuerdos_comision trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.acuerdos_comision FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: administracion_origen trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.administracion_origen FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: administraciones_fincas trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.administraciones_fincas FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: administradores trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.administradores FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: beneficiarios_reparto_caes trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.beneficiarios_reparto_caes FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: bloques trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.bloques FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: cierre_obra trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.cierre_obra FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: cobros trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.cobros FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: comerciales trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.comerciales FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: comisiones_proyecto trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.comisiones_proyecto FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: comunidades trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.comunidades FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: conceptos_hoja trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.conceptos_hoja FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: condiciones_convocatoria trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.condiciones_convocatoria FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: conocimiento_operativo trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.conocimiento_operativo FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: contactos trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.contactos FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: contrata_contacto_roles trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.contrata_contacto_roles FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: contrata_contactos trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.contrata_contactos FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: contratas trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.contratas FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: contratos_caes trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.contratos_caes FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: convocatorias trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.convocatorias FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: destinatarios_informe trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.destinatarios_informe FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: documentos trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: empresas_compradoras_caes trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.empresas_compradoras_caes FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: equipo trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.equipo FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: escaneos_polycam trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.escaneos_polycam FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: etapas_proyecto trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.etapas_proyecto FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: expedientes trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.expedientes FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: extracciones_convocatoria trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.extracciones_convocatoria FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: facturas trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.facturas FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: facturas_caes trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.facturas_caes FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: fases_obra_catalogo trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.fases_obra_catalogo FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: funciones trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.funciones FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: gestiones_cobro trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.gestiones_cobro FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: hitos_cobro trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.hitos_cobro FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: hitos_facturacion trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.hitos_facturacion FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: hojas_encargo trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.hojas_encargo FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: incidencias_obra trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.incidencias_obra FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: instrucciones_obra trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.instrucciones_obra FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: interacciones trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.interacciones FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: juntas trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.juntas FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: licencias trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.licencias FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: licitaciones trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.licitaciones FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: lineas_facturacion trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.lineas_facturacion FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: modelos_3d_venta trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.modelos_3d_venta FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: modelos_escalera trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.modelos_escalera FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: obras trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: ofertas_caes trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.ofertas_caes FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: operaciones_caes trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.operaciones_caes FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: oportunidades trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.oportunidades FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: parametros_alerta trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.parametros_alerta FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: pasos_catalogo trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.pasos_catalogo FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: personal_interno trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.personal_interno FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: personas_comunidad trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.personas_comunidad FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: presupuestos_licitacion trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.presupuestos_licitacion FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: procesos_venta trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.procesos_venta FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: proyecto_contratas trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.proyecto_contratas FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: proyectos trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.proyectos FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: requerimientos trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.requerimientos FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: requerimientos_caes trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.requerimientos_caes FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: requerimientos_obra trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.requerimientos_obra FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: requerimientos_tramitacion trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.requerimientos_tramitacion FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: requisitos_convocatoria trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.requisitos_convocatoria FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: tecnicos trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.tecnicos FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: tiempos_estandar trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.tiempos_estandar FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: tipos_documento trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.tipos_documento FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: tipos_proyecto trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.tipos_proyecto FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: tipos_servicio trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.tipos_servicio FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: versiones_hoja trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.versiones_hoja FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: viabilidad_conceptos trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.viabilidad_conceptos FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: viabilidades trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.viabilidades FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: visados trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.visados FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: visitas_obra trg_set_actualizado_en; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_actualizado_en BEFORE UPDATE ON public.visitas_obra FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: tareas_seguimiento trg_tareas_seguimiento_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tareas_seguimiento_upd BEFORE UPDATE ON public.tareas_seguimiento FOR EACH ROW EXECUTE FUNCTION public.set_actualizado_en();


--
-- Name: acuerdos_comision acuerdos_comision_administracion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acuerdos_comision
    ADD CONSTRAINT acuerdos_comision_administracion_id_fkey FOREIGN KEY (administracion_id) REFERENCES public.administraciones_fincas(id);


--
-- Name: acuerdos_comision acuerdos_comision_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acuerdos_comision
    ADD CONSTRAINT acuerdos_comision_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id);


--
-- Name: acuerdos_comision acuerdos_comision_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acuerdos_comision
    ADD CONSTRAINT acuerdos_comision_contrata_id_fkey FOREIGN KEY (contrata_id) REFERENCES public.contratas(id);


--
-- Name: acuerdos_comision acuerdos_comision_tipo_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acuerdos_comision
    ADD CONSTRAINT acuerdos_comision_tipo_servicio_id_fkey FOREIGN KEY (tipo_servicio_id) REFERENCES public.tipos_servicio(id);


--
-- Name: administracion_origen administracion_origen_admin_referente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracion_origen
    ADD CONSTRAINT administracion_origen_admin_referente_id_fkey FOREIGN KEY (admin_referente_id) REFERENCES public.administradores(id);


--
-- Name: administracion_origen administracion_origen_administracion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracion_origen
    ADD CONSTRAINT administracion_origen_administracion_id_fkey FOREIGN KEY (administracion_id) REFERENCES public.administraciones_fincas(id);


--
-- Name: administracion_origen administracion_origen_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracion_origen
    ADD CONSTRAINT administracion_origen_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: administracion_origen administracion_origen_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracion_origen
    ADD CONSTRAINT administracion_origen_contrata_id_fkey FOREIGN KEY (contrata_id) REFERENCES public.contratas(id);


--
-- Name: administracion_origen administracion_origen_servicio_reservado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracion_origen
    ADD CONSTRAINT administracion_origen_servicio_reservado_id_fkey FOREIGN KEY (servicio_reservado_id) REFERENCES public.tipos_servicio(id);


--
-- Name: administraciones_fincas administraciones_fincas_comercial_captador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administraciones_fincas
    ADD CONSTRAINT administraciones_fincas_comercial_captador_id_fkey FOREIGN KEY (comercial_captador_id) REFERENCES public.comerciales(id);


--
-- Name: administraciones_fincas administraciones_fincas_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administraciones_fincas
    ADD CONSTRAINT administraciones_fincas_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: administraciones_fincas administraciones_fincas_titular_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administraciones_fincas
    ADD CONSTRAINT administraciones_fincas_titular_id_fkey FOREIGN KEY (titular_id) REFERENCES public.administradores(id);


--
-- Name: administradores administradores_administracion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_administracion_id_fkey FOREIGN KEY (administracion_id) REFERENCES public.administraciones_fincas(id);


--
-- Name: administradores administradores_comercial_captador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_comercial_captador_id_fkey FOREIGN KEY (comercial_captador_id) REFERENCES public.comerciales(id);


--
-- Name: administradores administradores_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administradores
    ADD CONSTRAINT administradores_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: beneficiarios_reparto_caes beneficiarios_reparto_caes_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficiarios_reparto_caes
    ADD CONSTRAINT beneficiarios_reparto_caes_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id);


--
-- Name: beneficiarios_reparto_caes beneficiarios_reparto_caes_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficiarios_reparto_caes
    ADD CONSTRAINT beneficiarios_reparto_caes_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: beneficiarios_reparto_caes beneficiarios_reparto_caes_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficiarios_reparto_caes
    ADD CONSTRAINT beneficiarios_reparto_caes_contrata_id_fkey FOREIGN KEY (contrata_id) REFERENCES public.contratas(id);


--
-- Name: beneficiarios_reparto_caes beneficiarios_reparto_caes_operacion_caes_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beneficiarios_reparto_caes
    ADD CONSTRAINT beneficiarios_reparto_caes_operacion_caes_id_fkey FOREIGN KEY (operacion_caes_id) REFERENCES public.operaciones_caes(id);


--
-- Name: cierre_obra cierre_obra_obra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cierre_obra
    ADD CONSTRAINT cierre_obra_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: cobros cobros_hito_facturacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cobros
    ADD CONSTRAINT cobros_hito_facturacion_id_fkey FOREIGN KEY (hito_facturacion_id) REFERENCES public.hitos_facturacion(id);


--
-- Name: comisiones_proyecto comisiones_proyecto_acuerdo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_proyecto
    ADD CONSTRAINT comisiones_proyecto_acuerdo_id_fkey FOREIGN KEY (acuerdo_id) REFERENCES public.acuerdos_comision(id);


--
-- Name: comisiones_proyecto comisiones_proyecto_administracion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_proyecto
    ADD CONSTRAINT comisiones_proyecto_administracion_id_fkey FOREIGN KEY (administracion_id) REFERENCES public.administraciones_fincas(id);


--
-- Name: comisiones_proyecto comisiones_proyecto_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_proyecto
    ADD CONSTRAINT comisiones_proyecto_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id);


--
-- Name: comisiones_proyecto comisiones_proyecto_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_proyecto
    ADD CONSTRAINT comisiones_proyecto_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: comisiones_proyecto comisiones_proyecto_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comisiones_proyecto
    ADD CONSTRAINT comisiones_proyecto_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: comunidades comunidades_administracion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunidades
    ADD CONSTRAINT comunidades_administracion_id_fkey FOREIGN KEY (administracion_id) REFERENCES public.administraciones_fincas(id);


--
-- Name: comunidades comunidades_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunidades
    ADD CONSTRAINT comunidades_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id);


--
-- Name: conceptos_hoja conceptos_hoja_bloque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_hoja
    ADD CONSTRAINT conceptos_hoja_bloque_id_fkey FOREIGN KEY (bloque_id) REFERENCES public.bloques(id);


--
-- Name: conceptos_hoja conceptos_hoja_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_hoja
    ADD CONSTRAINT conceptos_hoja_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: conceptos_hoja conceptos_hoja_incluido_en_concepto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_hoja
    ADD CONSTRAINT conceptos_hoja_incluido_en_concepto_id_fkey FOREIGN KEY (incluido_en_concepto_id) REFERENCES public.conceptos_hoja(id);


--
-- Name: conceptos_hoja conceptos_hoja_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_hoja
    ADD CONSTRAINT conceptos_hoja_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: conceptos_hoja conceptos_hoja_version_hoja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conceptos_hoja
    ADD CONSTRAINT conceptos_hoja_version_hoja_id_fkey FOREIGN KEY (version_hoja_id) REFERENCES public.versiones_hoja(id);


--
-- Name: condicionantes_comunidad condicionantes_comunidad_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condicionantes_comunidad
    ADD CONSTRAINT condicionantes_comunidad_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id) ON DELETE CASCADE;


--
-- Name: condicionantes_comunidad condicionantes_comunidad_interaccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condicionantes_comunidad
    ADD CONSTRAINT condicionantes_comunidad_interaccion_id_fkey FOREIGN KEY (interaccion_id) REFERENCES public.interacciones(id) ON DELETE SET NULL;


--
-- Name: condiciones_convocatoria condiciones_convocatoria_convocatoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condiciones_convocatoria
    ADD CONSTRAINT condiciones_convocatoria_convocatoria_id_fkey FOREIGN KEY (convocatoria_id) REFERENCES public.convocatorias(id);


--
-- Name: conocimiento_operativo conocimiento_operativo_aportado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conocimiento_operativo
    ADD CONSTRAINT conocimiento_operativo_aportado_por_fkey FOREIGN KEY (aportado_por) REFERENCES public.personal_interno(id);


--
-- Name: contactos contactos_administracion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contactos
    ADD CONSTRAINT contactos_administracion_id_fkey FOREIGN KEY (administracion_id) REFERENCES public.administraciones_fincas(id);


--
-- Name: contactos contactos_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contactos
    ADD CONSTRAINT contactos_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.administradores(id);


--
-- Name: contrata_contacto_roles contrata_contacto_roles_contacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrata_contacto_roles
    ADD CONSTRAINT contrata_contacto_roles_contacto_id_fkey FOREIGN KEY (contacto_id) REFERENCES public.contrata_contactos(id);


--
-- Name: contrata_contactos contrata_contactos_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrata_contactos
    ADD CONSTRAINT contrata_contactos_contrata_id_fkey FOREIGN KEY (contrata_id) REFERENCES public.contratas(id);


--
-- Name: contratos_caes contratos_caes_junta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos_caes
    ADD CONSTRAINT contratos_caes_junta_id_fkey FOREIGN KEY (junta_id) REFERENCES public.juntas(id);


--
-- Name: contratos_caes contratos_caes_operacion_caes_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contratos_caes
    ADD CONSTRAINT contratos_caes_operacion_caes_id_fkey FOREIGN KEY (operacion_caes_id) REFERENCES public.operaciones_caes(id);


--
-- Name: destinatarios_informe destinatarios_informe_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.destinatarios_informe
    ADD CONSTRAINT destinatarios_informe_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id) ON DELETE CASCADE;


--
-- Name: documentos documentos_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: documentos documentos_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: documentos documentos_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES public.requerimientos_tramitacion(id);


--
-- Name: documentos documentos_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.tipos_documento(id);


--
-- Name: equipo_funciones equipo_funciones_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_funciones
    ADD CONSTRAINT equipo_funciones_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.equipo(id) ON DELETE CASCADE;


--
-- Name: equipo_funciones equipo_funciones_funcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_funciones
    ADD CONSTRAINT equipo_funciones_funcion_id_fkey FOREIGN KEY (funcion_id) REFERENCES public.funciones(id) ON DELETE CASCADE;


--
-- Name: escaneos_polycam escaneos_polycam_arquitecto_revisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escaneos_polycam
    ADD CONSTRAINT escaneos_polycam_arquitecto_revisor_id_fkey FOREIGN KEY (arquitecto_revisor_id) REFERENCES public.tecnicos(id);


--
-- Name: escaneos_polycam escaneos_polycam_modelo_escalera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escaneos_polycam
    ADD CONSTRAINT escaneos_polycam_modelo_escalera_id_fkey FOREIGN KEY (modelo_escalera_id) REFERENCES public.modelos_escalera(id);


--
-- Name: escaneos_polycam escaneos_polycam_proceso_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escaneos_polycam
    ADD CONSTRAINT escaneos_polycam_proceso_venta_id_fkey FOREIGN KEY (proceso_venta_id) REFERENCES public.procesos_venta(id);


--
-- Name: etapas_proyecto etapas_proyecto_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapas_proyecto
    ADD CONSTRAINT etapas_proyecto_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: etapas_proyecto etapas_proyecto_responsable_equipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapas_proyecto
    ADD CONSTRAINT etapas_proyecto_responsable_equipo_fkey FOREIGN KEY (responsable_tecnico_id) REFERENCES public.equipo(id);


--
-- Name: expedientes expedientes_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: expedientes expedientes_convocatoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_convocatoria_id_fkey FOREIGN KEY (convocatoria_id) REFERENCES public.convocatorias(id);


--
-- Name: expedientes expedientes_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expedientes
    ADD CONSTRAINT expedientes_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: extracciones_convocatoria extracciones_convocatoria_convocatoria_ejemplo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracciones_convocatoria
    ADD CONSTRAINT extracciones_convocatoria_convocatoria_ejemplo_id_fkey FOREIGN KEY (convocatoria_ejemplo_id) REFERENCES public.convocatorias(id);


--
-- Name: extracciones_convocatoria extracciones_convocatoria_convocatoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracciones_convocatoria
    ADD CONSTRAINT extracciones_convocatoria_convocatoria_id_fkey FOREIGN KEY (convocatoria_id) REFERENCES public.convocatorias(id);


--
-- Name: extracciones_convocatoria extracciones_convocatoria_validado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracciones_convocatoria
    ADD CONSTRAINT extracciones_convocatoria_validado_por_fkey FOREIGN KEY (validado_por) REFERENCES public.personal_interno(id);


--
-- Name: facturas_caes facturas_caes_operacion_caes_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas_caes
    ADD CONSTRAINT facturas_caes_operacion_caes_id_fkey FOREIGN KEY (operacion_caes_id) REFERENCES public.operaciones_caes(id);


--
-- Name: facturas facturas_hito_facturacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_hito_facturacion_id_fkey FOREIGN KEY (hito_facturacion_id) REFERENCES public.hitos_facturacion(id);


--
-- Name: facturas facturas_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: fotos_acta fotos_acta_visita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fotos_acta
    ADD CONSTRAINT fotos_acta_visita_id_fkey FOREIGN KEY (visita_id) REFERENCES public.visitas_obra(id) ON DELETE CASCADE;


--
-- Name: gestiones_cobro gestiones_cobro_hito_cobro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gestiones_cobro
    ADD CONSTRAINT gestiones_cobro_hito_cobro_id_fkey FOREIGN KEY (hito_cobro_id) REFERENCES public.hitos_cobro(id);


--
-- Name: hitos_cobro hitos_cobro_linea_facturacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_cobro
    ADD CONSTRAINT hitos_cobro_linea_facturacion_id_fkey FOREIGN KEY (linea_facturacion_id) REFERENCES public.lineas_facturacion(id);


--
-- Name: hitos_facturacion hitos_facturacion_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_facturacion
    ADD CONSTRAINT hitos_facturacion_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: hitos_oportunidad hitos_oportunidad_hito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_oportunidad
    ADD CONSTRAINT hitos_oportunidad_hito_fkey FOREIGN KEY (hito) REFERENCES public.hitos_comerciales(clave);


--
-- Name: hitos_oportunidad hitos_oportunidad_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_oportunidad
    ADD CONSTRAINT hitos_oportunidad_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id) ON DELETE CASCADE;


--
-- Name: hitos_oportunidad hitos_oportunidad_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hitos_oportunidad
    ADD CONSTRAINT hitos_oportunidad_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.equipo(id);


--
-- Name: hojas_encargo hojas_encargo_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hojas_encargo
    ADD CONSTRAINT hojas_encargo_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: hojas_encargo_estado_historial hojas_encargo_estado_historial_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hojas_encargo_estado_historial
    ADD CONSTRAINT hojas_encargo_estado_historial_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: hojas_encargo hojas_encargo_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hojas_encargo
    ADD CONSTRAINT hojas_encargo_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id);


--
-- Name: hojas_encargo hojas_encargo_pagador_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hojas_encargo
    ADD CONSTRAINT hojas_encargo_pagador_contrata_id_fkey FOREIGN KEY (pagador_contrata_id) REFERENCES public.contratas(id);


--
-- Name: hojas_encargo hojas_encargo_proceso_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hojas_encargo
    ADD CONSTRAINT hojas_encargo_proceso_venta_id_fkey FOREIGN KEY (proceso_venta_id) REFERENCES public.procesos_venta(id);


--
-- Name: hojas_encargo hojas_encargo_version_firmada_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hojas_encargo
    ADD CONSTRAINT hojas_encargo_version_firmada_id_fkey FOREIGN KEY (version_firmada_id) REFERENCES public.versiones_hoja(id);


--
-- Name: incidencias_obra incidencias_obra_obra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias_obra
    ADD CONSTRAINT incidencias_obra_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: incidencias_obra incidencias_obra_visita_obra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidencias_obra
    ADD CONSTRAINT incidencias_obra_visita_obra_id_fkey FOREIGN KEY (visita_obra_id) REFERENCES public.visitas_obra(id);


--
-- Name: instrucciones_obra instrucciones_obra_obra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrucciones_obra
    ADD CONSTRAINT instrucciones_obra_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: instrucciones_obra instrucciones_obra_visita_obra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrucciones_obra
    ADD CONSTRAINT instrucciones_obra_visita_obra_id_fkey FOREIGN KEY (visita_obra_id) REFERENCES public.visitas_obra(id);


--
-- Name: interaccion_comunidad interaccion_comunidad_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaccion_comunidad
    ADD CONSTRAINT interaccion_comunidad_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id) ON DELETE CASCADE;


--
-- Name: interaccion_comunidad interaccion_comunidad_interaccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interaccion_comunidad
    ADD CONSTRAINT interaccion_comunidad_interaccion_id_fkey FOREIGN KEY (interaccion_id) REFERENCES public.interacciones(id) ON DELETE CASCADE;


--
-- Name: interacciones interacciones_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interacciones
    ADD CONSTRAINT interacciones_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id);


--
-- Name: interacciones interacciones_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interacciones
    ADD CONSTRAINT interacciones_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: interacciones interacciones_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interacciones
    ADD CONSTRAINT interacciones_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id);


--
-- Name: juntas juntas_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.juntas
    ADD CONSTRAINT juntas_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id) ON DELETE CASCADE;


--
-- Name: juntas juntas_proceso_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.juntas
    ADD CONSTRAINT juntas_proceso_venta_id_fkey FOREIGN KEY (proceso_venta_id) REFERENCES public.procesos_venta(id);


--
-- Name: licencias licencias_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licencias
    ADD CONSTRAINT licencias_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;


--
-- Name: licencias licencias_tramita_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licencias
    ADD CONSTRAINT licencias_tramita_equipo_id_fkey FOREIGN KEY (tramita_equipo_id) REFERENCES public.equipo(id);


--
-- Name: licitaciones licitaciones_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licitaciones
    ADD CONSTRAINT licitaciones_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: licitaciones licitaciones_junta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licitaciones
    ADD CONSTRAINT licitaciones_junta_id_fkey FOREIGN KEY (junta_id) REFERENCES public.juntas(id);


--
-- Name: licitaciones licitaciones_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licitaciones
    ADD CONSTRAINT licitaciones_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: lineas_facturacion lineas_facturacion_bloque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_facturacion
    ADD CONSTRAINT lineas_facturacion_bloque_id_fkey FOREIGN KEY (bloque_id) REFERENCES public.bloques(id);


--
-- Name: lineas_facturacion lineas_facturacion_concepto_hoja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_facturacion
    ADD CONSTRAINT lineas_facturacion_concepto_hoja_id_fkey FOREIGN KEY (concepto_hoja_id) REFERENCES public.conceptos_hoja(id);


--
-- Name: lineas_facturacion lineas_facturacion_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_facturacion
    ADD CONSTRAINT lineas_facturacion_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: lineas_facturacion lineas_facturacion_pagador_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_facturacion
    ADD CONSTRAINT lineas_facturacion_pagador_contrata_id_fkey FOREIGN KEY (pagador_contrata_id) REFERENCES public.contratas(id);


--
-- Name: modelos_3d_venta modelos_3d_venta_junta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_3d_venta
    ADD CONSTRAINT modelos_3d_venta_junta_id_fkey FOREIGN KEY (junta_id) REFERENCES public.juntas(id);


--
-- Name: modelos_3d_venta modelos_3d_venta_modelo_escalera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_3d_venta
    ADD CONSTRAINT modelos_3d_venta_modelo_escalera_id_fkey FOREIGN KEY (modelo_escalera_id) REFERENCES public.modelos_escalera(id);


--
-- Name: modelos_3d_venta modelos_3d_venta_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_3d_venta
    ADD CONSTRAINT modelos_3d_venta_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id) ON DELETE CASCADE;


--
-- Name: modelos_3d_venta modelos_3d_venta_proceso_venta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_3d_venta
    ADD CONSTRAINT modelos_3d_venta_proceso_venta_id_fkey FOREIGN KEY (proceso_venta_id) REFERENCES public.procesos_venta(id);


--
-- Name: modelos_3d_venta modelos_3d_venta_tecnico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_3d_venta
    ADD CONSTRAINT modelos_3d_venta_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.tecnicos(id);


--
-- Name: negociacion_oportunidad negociacion_oportunidad_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.negociacion_oportunidad
    ADD CONSTRAINT negociacion_oportunidad_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: negociacion_oportunidad negociacion_oportunidad_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.negociacion_oportunidad
    ADD CONSTRAINT negociacion_oportunidad_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id) ON DELETE CASCADE;


--
-- Name: obras obras_cfo_visado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_cfo_visado_id_fkey FOREIGN KEY (cfo_visado_id) REFERENCES public.visados(id);


--
-- Name: obras obras_constructora_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_constructora_contrata_id_fkey FOREIGN KEY (constructora_contrata_id) REFERENCES public.contratas(id);


--
-- Name: obras obras_coordinador_css_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_coordinador_css_equipo_id_fkey FOREIGN KEY (coordinador_css_equipo_id) REFERENCES public.equipo(id);


--
-- Name: obras obras_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.obras
    ADD CONSTRAINT obras_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: ofertas_caes ofertas_caes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofertas_caes
    ADD CONSTRAINT ofertas_caes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas_compradoras_caes(id);


--
-- Name: ofertas_caes ofertas_caes_operacion_caes_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ofertas_caes
    ADD CONSTRAINT ofertas_caes_operacion_caes_id_fkey FOREIGN KEY (operacion_caes_id) REFERENCES public.operaciones_caes(id);


--
-- Name: operaciones_caes operaciones_caes_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones_caes
    ADD CONSTRAINT operaciones_caes_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: operaciones_caes operaciones_caes_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones_caes
    ADD CONSTRAINT operaciones_caes_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: operaciones_caes operaciones_caes_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operaciones_caes
    ADD CONSTRAINT operaciones_caes_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: oportunidades oportunidades_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id);


--
-- Name: oportunidades oportunidades_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: oportunidades oportunidades_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: oportunidades oportunidades_contrata_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_contrata_origen_id_fkey FOREIGN KEY (contrata_origen_id) REFERENCES public.contratas(id);


--
-- Name: oportunidades oportunidades_oportunidad_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_oportunidad_origen_id_fkey FOREIGN KEY (oportunidad_origen_id) REFERENCES public.oportunidades(id);


--
-- Name: oportunidades oportunidades_persona_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_persona_comunidad_id_fkey FOREIGN KEY (persona_comunidad_id) REFERENCES public.personas_comunidad(id);


--
-- Name: personas_comunidad personas_comunidad_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas_comunidad
    ADD CONSTRAINT personas_comunidad_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: plan_pago_historial plan_pago_historial_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_historial
    ADD CONSTRAINT plan_pago_historial_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: presupuestos_licitacion presupuestos_licitacion_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuestos_licitacion
    ADD CONSTRAINT presupuestos_licitacion_contrata_id_fkey FOREIGN KEY (contrata_id) REFERENCES public.contratas(id);


--
-- Name: presupuestos_licitacion presupuestos_licitacion_licitacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presupuestos_licitacion
    ADD CONSTRAINT presupuestos_licitacion_licitacion_id_fkey FOREIGN KEY (licitacion_id) REFERENCES public.licitaciones(id);


--
-- Name: procesos_venta procesos_venta_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos_venta
    ADD CONSTRAINT procesos_venta_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: procesos_venta procesos_venta_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos_venta
    ADD CONSTRAINT procesos_venta_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id);


--
-- Name: procesos_venta procesos_venta_tipo_servicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procesos_venta
    ADD CONSTRAINT procesos_venta_tipo_servicio_id_fkey FOREIGN KEY (tipo_servicio_id) REFERENCES public.tipos_servicio(id);


--
-- Name: proyecto_contratas proyecto_contratas_contrata_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto_contratas
    ADD CONSTRAINT proyecto_contratas_contrata_id_fkey FOREIGN KEY (contrata_id) REFERENCES public.contratas(id);


--
-- Name: proyecto_contratas proyecto_contratas_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto_contratas
    ADD CONSTRAINT proyecto_contratas_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: proyecto_tipos proyecto_tipos_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto_tipos
    ADD CONSTRAINT proyecto_tipos_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;


--
-- Name: proyecto_tipos proyecto_tipos_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyecto_tipos
    ADD CONSTRAINT proyecto_tipos_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipos_proyecto(id);


--
-- Name: proyectos proyectos_comercial_captador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_comercial_captador_id_fkey FOREIGN KEY (comercial_captador_id) REFERENCES public.comerciales(id);


--
-- Name: proyectos proyectos_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: proyectos proyectos_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id);


--
-- Name: proyectos proyectos_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos
    ADD CONSTRAINT proyectos_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: requerimientos_caes requerimientos_caes_operacion_caes_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_caes
    ADD CONSTRAINT requerimientos_caes_operacion_caes_id_fkey FOREIGN KEY (operacion_caes_id) REFERENCES public.operaciones_caes(id);


--
-- Name: requerimientos requerimientos_expediente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos
    ADD CONSTRAINT requerimientos_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES public.expedientes(id);


--
-- Name: requerimientos_obra requerimientos_obra_obra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_obra
    ADD CONSTRAINT requerimientos_obra_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: requerimientos_obra requerimientos_obra_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_obra
    ADD CONSTRAINT requerimientos_obra_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES public.tecnicos(id);


--
-- Name: requerimientos_tramitacion requerimientos_tramitacion_etapa_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_tramitacion
    ADD CONSTRAINT requerimientos_tramitacion_etapa_proyecto_id_fkey FOREIGN KEY (etapa_proyecto_id) REFERENCES public.etapas_proyecto(id);


--
-- Name: requerimientos_tramitacion requerimientos_tramitacion_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_tramitacion
    ADD CONSTRAINT requerimientos_tramitacion_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id);


--
-- Name: requerimientos_tramitacion requerimientos_tramitacion_responsable_equipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requerimientos_tramitacion
    ADD CONSTRAINT requerimientos_tramitacion_responsable_equipo_fkey FOREIGN KEY (responsable_id) REFERENCES public.equipo(id);


--
-- Name: requisitos_convocatoria requisitos_convocatoria_convocatoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisitos_convocatoria
    ADD CONSTRAINT requisitos_convocatoria_convocatoria_id_fkey FOREIGN KEY (convocatoria_id) REFERENCES public.convocatorias(id);


--
-- Name: requisitos_convocatoria requisitos_convocatoria_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisitos_convocatoria
    ADD CONSTRAINT requisitos_convocatoria_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES public.tipos_documento(id);


--
-- Name: resumenes_ia resumenes_ia_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumenes_ia
    ADD CONSTRAINT resumenes_ia_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id) ON DELETE CASCADE;


--
-- Name: resumenes_ia resumenes_ia_comunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumenes_ia
    ADD CONSTRAINT resumenes_ia_comunidad_id_fkey FOREIGN KEY (comunidad_id) REFERENCES public.comunidades(id) ON DELETE CASCADE;


--
-- Name: revisiones_visado revisiones_visado_requerimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisiones_visado
    ADD CONSTRAINT revisiones_visado_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES public.requerimientos_tramitacion(id);


--
-- Name: revisiones_visado revisiones_visado_visado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revisiones_visado
    ADD CONSTRAINT revisiones_visado_visado_id_fkey FOREIGN KEY (visado_id) REFERENCES public.visados(id);


--
-- Name: tareas_seguimiento tareas_seguimiento_administrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas_seguimiento
    ADD CONSTRAINT tareas_seguimiento_administrador_id_fkey FOREIGN KEY (administrador_id) REFERENCES public.administradores(id);


--
-- Name: tareas_seguimiento tareas_seguimiento_comercial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas_seguimiento
    ADD CONSTRAINT tareas_seguimiento_comercial_id_fkey FOREIGN KEY (comercial_id) REFERENCES public.comerciales(id);


--
-- Name: tareas_seguimiento tareas_seguimiento_interaccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas_seguimiento
    ADD CONSTRAINT tareas_seguimiento_interaccion_id_fkey FOREIGN KEY (interaccion_id) REFERENCES public.interacciones(id);


--
-- Name: tareas_seguimiento tareas_seguimiento_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas_seguimiento
    ADD CONSTRAINT tareas_seguimiento_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id);


--
-- Name: tipos_proyecto tipos_proyecto_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_proyecto
    ADD CONSTRAINT tipos_proyecto_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tipos_proyecto(id);


--
-- Name: uso_llm uso_llm_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uso_llm
    ADD CONSTRAINT uso_llm_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.personal_interno(id);


--
-- Name: versiones_hoja versiones_hoja_hoja_encargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versiones_hoja
    ADD CONSTRAINT versiones_hoja_hoja_encargo_id_fkey FOREIGN KEY (hoja_encargo_id) REFERENCES public.hojas_encargo(id);


--
-- Name: viabilidad_conceptos viabilidad_conceptos_bloque_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viabilidad_conceptos
    ADD CONSTRAINT viabilidad_conceptos_bloque_id_fkey FOREIGN KEY (bloque_id) REFERENCES public.bloques(id);


--
-- Name: viabilidad_conceptos viabilidad_conceptos_incluido_en_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viabilidad_conceptos
    ADD CONSTRAINT viabilidad_conceptos_incluido_en_id_fkey FOREIGN KEY (incluido_en_id) REFERENCES public.viabilidad_conceptos(id);


--
-- Name: viabilidad_conceptos viabilidad_conceptos_viabilidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viabilidad_conceptos
    ADD CONSTRAINT viabilidad_conceptos_viabilidad_id_fkey FOREIGN KEY (viabilidad_id) REFERENCES public.viabilidades(id) ON DELETE CASCADE;


--
-- Name: viabilidades viabilidades_arquitecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viabilidades
    ADD CONSTRAINT viabilidades_arquitecto_id_fkey FOREIGN KEY (arquitecto_id) REFERENCES public.tecnicos(id);


--
-- Name: viabilidades viabilidades_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.viabilidades
    ADD CONSTRAINT viabilidades_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id);


--
-- Name: visados visados_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visados
    ADD CONSTRAINT visados_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;


--
-- Name: visados visados_tramita_equipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visados
    ADD CONSTRAINT visados_tramita_equipo_id_fkey FOREIGN KEY (tramita_equipo_id) REFERENCES public.equipo(id);


--
-- Name: visitas_obra visitas_obra_autor_equipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas_obra
    ADD CONSTRAINT visitas_obra_autor_equipo_fkey FOREIGN KEY (autor_tecnico_id) REFERENCES public.equipo(id);


--
-- Name: visitas_obra visitas_obra_fase_obra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas_obra
    ADD CONSTRAINT visitas_obra_fase_obra_id_fkey FOREIGN KEY (fase_obra_id) REFERENCES public.fases_obra_catalogo(id);


--
-- Name: visitas_obra visitas_obra_obra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitas_obra
    ADD CONSTRAINT visitas_obra_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES public.obras(id);


--
-- Name: acuerdos_comision; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.acuerdos_comision ENABLE ROW LEVEL SECURITY;

--
-- Name: administracion_origen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.administracion_origen ENABLE ROW LEVEL SECURITY;

--
-- Name: administraciones_fincas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.administraciones_fincas ENABLE ROW LEVEL SECURITY;

--
-- Name: administradores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;

--
-- Name: beneficiarios_reparto_caes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.beneficiarios_reparto_caes ENABLE ROW LEVEL SECURITY;

--
-- Name: bitacora_ia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bitacora_ia ENABLE ROW LEVEL SECURITY;

--
-- Name: bloques; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bloques ENABLE ROW LEVEL SECURITY;

--
-- Name: cierre_obra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cierre_obra ENABLE ROW LEVEL SECURITY;

--
-- Name: cobros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;

--
-- Name: comerciales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comerciales ENABLE ROW LEVEL SECURITY;

--
-- Name: comisiones_proyecto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comisiones_proyecto ENABLE ROW LEVEL SECURITY;

--
-- Name: comunidades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comunidades ENABLE ROW LEVEL SECURITY;

--
-- Name: conceptos_hoja; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conceptos_hoja ENABLE ROW LEVEL SECURITY;

--
-- Name: condiciones_convocatoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.condiciones_convocatoria ENABLE ROW LEVEL SECURITY;

--
-- Name: conocimiento_operativo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conocimiento_operativo ENABLE ROW LEVEL SECURITY;

--
-- Name: contactos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

--
-- Name: contrata_contacto_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contrata_contacto_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: contrata_contactos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contrata_contactos ENABLE ROW LEVEL SECURITY;

--
-- Name: contratas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contratas ENABLE ROW LEVEL SECURITY;

--
-- Name: contratos_caes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contratos_caes ENABLE ROW LEVEL SECURITY;

--
-- Name: convocatorias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.convocatorias ENABLE ROW LEVEL SECURITY;

--
-- Name: destinatarios_informe; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.destinatarios_informe ENABLE ROW LEVEL SECURITY;

--
-- Name: documentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

--
-- Name: empresas_compradoras_caes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.empresas_compradoras_caes ENABLE ROW LEVEL SECURITY;

--
-- Name: equipo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipo ENABLE ROW LEVEL SECURITY;

--
-- Name: equipo_funciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipo_funciones ENABLE ROW LEVEL SECURITY;

--
-- Name: escaneos_polycam; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.escaneos_polycam ENABLE ROW LEVEL SECURITY;

--
-- Name: etapas_proyecto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.etapas_proyecto ENABLE ROW LEVEL SECURITY;

--
-- Name: expedientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expedientes ENABLE ROW LEVEL SECURITY;

--
-- Name: extracciones_convocatoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.extracciones_convocatoria ENABLE ROW LEVEL SECURITY;

--
-- Name: facturas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

--
-- Name: facturas_caes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facturas_caes ENABLE ROW LEVEL SECURITY;

--
-- Name: fases_obra_catalogo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fases_obra_catalogo ENABLE ROW LEVEL SECURITY;

--
-- Name: fotos_acta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fotos_acta ENABLE ROW LEVEL SECURITY;

--
-- Name: funciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.funciones ENABLE ROW LEVEL SECURITY;

--
-- Name: gestiones_cobro; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gestiones_cobro ENABLE ROW LEVEL SECURITY;

--
-- Name: hitos_cobro; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hitos_cobro ENABLE ROW LEVEL SECURITY;

--
-- Name: hitos_facturacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hitos_facturacion ENABLE ROW LEVEL SECURITY;

--
-- Name: hojas_encargo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hojas_encargo ENABLE ROW LEVEL SECURITY;

--
-- Name: hojas_encargo_estado_historial; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hojas_encargo_estado_historial ENABLE ROW LEVEL SECURITY;

--
-- Name: incidencias_obra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.incidencias_obra ENABLE ROW LEVEL SECURITY;

--
-- Name: instrucciones_obra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.instrucciones_obra ENABLE ROW LEVEL SECURITY;

--
-- Name: interacciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.interacciones ENABLE ROW LEVEL SECURITY;

--
-- Name: juntas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.juntas ENABLE ROW LEVEL SECURITY;

--
-- Name: licencias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.licencias ENABLE ROW LEVEL SECURITY;

--
-- Name: licitaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.licitaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: lineas_facturacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lineas_facturacion ENABLE ROW LEVEL SECURITY;

--
-- Name: migracion_monday; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.migracion_monday ENABLE ROW LEVEL SECURITY;

--
-- Name: modelos_3d_venta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modelos_3d_venta ENABLE ROW LEVEL SECURITY;

--
-- Name: modelos_escalera; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modelos_escalera ENABLE ROW LEVEL SECURITY;

--
-- Name: obras; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

--
-- Name: ofertas_caes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ofertas_caes ENABLE ROW LEVEL SECURITY;

--
-- Name: operaciones_caes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operaciones_caes ENABLE ROW LEVEL SECURITY;

--
-- Name: oportunidades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

--
-- Name: parametros_alerta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parametros_alerta ENABLE ROW LEVEL SECURITY;

--
-- Name: pasos_catalogo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pasos_catalogo ENABLE ROW LEVEL SECURITY;

--
-- Name: personal_interno; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personal_interno ENABLE ROW LEVEL SECURITY;

--
-- Name: personas_comunidad; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personas_comunidad ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_pago_historial; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_pago_historial ENABLE ROW LEVEL SECURITY;

--
-- Name: presupuestos_licitacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presupuestos_licitacion ENABLE ROW LEVEL SECURITY;

--
-- Name: procesos_venta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procesos_venta ENABLE ROW LEVEL SECURITY;

--
-- Name: proyecto_contratas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proyecto_contratas ENABLE ROW LEVEL SECURITY;

--
-- Name: proyecto_tipos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proyecto_tipos ENABLE ROW LEVEL SECURITY;

--
-- Name: proyectos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;

--
-- Name: requerimientos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requerimientos ENABLE ROW LEVEL SECURITY;

--
-- Name: requerimientos_caes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requerimientos_caes ENABLE ROW LEVEL SECURITY;

--
-- Name: requerimientos_obra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requerimientos_obra ENABLE ROW LEVEL SECURITY;

--
-- Name: requerimientos_tramitacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requerimientos_tramitacion ENABLE ROW LEVEL SECURITY;

--
-- Name: requisitos_convocatoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.requisitos_convocatoria ENABLE ROW LEVEL SECURITY;

--
-- Name: revisiones_visado; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.revisiones_visado ENABLE ROW LEVEL SECURITY;

--
-- Name: tecnicos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;

--
-- Name: tiempos_estandar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tiempos_estandar ENABLE ROW LEVEL SECURITY;

--
-- Name: tipos_documento; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tipos_documento ENABLE ROW LEVEL SECURITY;

--
-- Name: tipos_proyecto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tipos_proyecto ENABLE ROW LEVEL SECURITY;

--
-- Name: tipos_servicio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tipos_servicio ENABLE ROW LEVEL SECURITY;

--
-- Name: uso_llm; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.uso_llm ENABLE ROW LEVEL SECURITY;

--
-- Name: versiones_hoja; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.versiones_hoja ENABLE ROW LEVEL SECURITY;

--
-- Name: viabilidad_conceptos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.viabilidad_conceptos ENABLE ROW LEVEL SECURITY;

--
-- Name: viabilidades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.viabilidades ENABLE ROW LEVEL SECURITY;

--
-- Name: visados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visados ENABLE ROW LEVEL SECURITY;

--
-- Name: visitas_obra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visitas_obra ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict bJw8wRb5fDDtu8CCLs3PVc5NnHC0ZV45RxoI31qzcwxqRbJavwWvlgK98RpopLw

