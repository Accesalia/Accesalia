# El administrador es de la COMUNIDAD, no de la opp

Decidido por Mónica el 18-oct-2026. Este documento es la referencia para todos
los hilos. Lo coordina el hilo 41.

> «El admin no pertenece a una opp, sino a una comunidad. Ahora funciona, pero de
> casualidad: no es buen diseño.»

## El modelo

    DIR (clave)   = conjunto de ACCESOS
    ACCESO        → 1 COMUNIDAD          (accesos.figura_legal_propietaria_id)
    COMUNIDAD     → 1 ADMINISTRADOR      (comunidad_admin_responsable, vigente)
                    o AUTOGESTIONADA, con una persona responsable al frente
    OPP           = conjunto de accesos implicados (relacion_oportunidad_accesos)

- **La opp NO lleva administrador.** No es un atributo suyo: el administrador
  de una opp se deduce de sus accesos (opp → accesos → comunidades → administradores).
- **Una opp con accesos de varias comunidades, con varios administradores, NO
  es un fallo: es la vida.** Pasa a veces y tiene que poder reflejarse: una opp
  tiene 1 o N administradores.
- **No puede haber opp sin comunidad.** Al crear una opp, cada acceso nuevo
  elige su comunidad o se crea una.
- **El edificio** (los accesos de un mismo edificio dentro de una DIR) no influye
  en administrador, comunidad ni opp. Es cosmético: se deja para después.

## Lo que hay hoy (medido el 18-oct-2026)

- 3.369 accesos con opp: **6 sin comunidad**.
- **102 opps sin ningún acceso** enlazado.
- **6 opps** cuyo campo `comunidad_id` no coincide con la comunidad de sus accesos.
- 2.676 comunidades con opp: **945 con administrador vigente**.
- Autogestionada: **no está modelada**.
- `oportunidades.administrador_puesto_id`: lo tienen 2 opps de 2.838.

### Los atajos que lo hacen funcionar «de casualidad»

1. `oportunidades.administrador_puesto_id`. Lo escriben el alta de opp
   (lib/altaOportunidad.ts), el satélite (lib/oportunidadMovil.ts) y «Completar»
   (lib/completa.ts). Lo leen lib/envioCorreo.ts, lib/fichas.ts, lib/negocio.ts y
   lib/fichaFinanciera.ts, la vista `admin_de_oportunidad`, `directorio_personas`
   y el trigger de consolidación al firmar (`trg_consolidar_admin_al_firmar`).
2. `oportunidades.comunidad_id`: la comunidad copiada en la opp, en vez de la de
   sus accesos. Es la que usan `admin_de_oportunidad` y otras pantallas.

### Cómo saca hoy el administrador cada pieza de la capa rápida

| Pieza | De dónde lo saca | ¿Cumple el modelo? |
|---|---|---|
| `directorio_sitios` | acceso → su comunidad → administrador vigente | **Sí** |
| `admin_de_oportunidad`, la vista de las 4 vistas de la cartera de administradores | el campo de la opp; si no, la comunidad de la opp (`comunidad_id`) | No: atajo, y un solo administrador |
| `directorio_personas` | el campo de la opp; si no, la comunidad de la opp | No |
| `opps_por_fases` | comunidad_admin_responsable de la comunidad de la opp | A medias: comunidad de la opp |
| Trigger de consolidación al firmar | el campo de la opp, o su contacto si es de una administración | No |

## El plan, en orden (OK de Mónica a los 5 pasos)

1. **Una sola forma de saber el administrador de una opp.** Una vista base,
   `administradores_de_oportunidad`: una fila por opp, comunidad y administrador,
   sacada de opp → accesos vigentes → comunidad → administrador vigente (o
   autogestionada). Todo lo demás lee de ella: pantallas, cartera, directorios y
   consolidación. Mientras haya opps sin accesos (las 102), se usa como respaldo la
   comunidad de la opp, avisando.
2. **El alta, el satélite y «Completar» escriben el administrador en la
   COMUNIDAD**, no en la opp. Crear una opp elige o crea la comunidad de cada
   acceso. Después, `oportunidades.administrador_puesto_id` se retira (zz_muerta_).
3. **Modelar «autogestionada»** en la comunidad, con su persona responsable.
   Cada comunidad tiene administrador o autogestión, nunca nada. Los campos se
   hablan con Mónica antes.
4. **Revisar con ella** las 6 opps contradictorias y las 102 sin accesos.
5. Más adelante: retirar también `oportunidades.comunidad_id`. Lo leen muchas
   pantallas.

## Quién hace qué

Pendiente de confirmar con cada hilo:
- La vista base y la capa rápida (directorios, cartera, consolidación): el hilo
  de datos (**e3**), que montó las tablas de la velocidad.
- Alta de opp, satélite y «Completar»: el hilo que los lleve.
- La ficha financiera: el hilo **71**.
- Las demás pantallas que leen el administrador (correo, fichas, negocio):
  cada una, su hilo.
