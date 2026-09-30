# Los correos de la app

Criterio acordado con Mónica el **30-sep-2026**. Este documento existe porque los
buzones funcionales se dieron de alta el 25-sep en una conversación, no se
escribieron en ninguna parte, y cinco días después monté un segundo sistema de
correo en paralelo sin saber que el primero existía. **Lo que no está escrito
aquí, se pierde.**

## 1. Un buzón por área. Nunca el de una persona

La app no manda correos haciéndose pasar por cada trabajador. Cada **área**
tiene su propio buzón, que no es de nadie: existe para un trabajo, no para una
persona. Nadie se da de baja, nadie se lleva su buzón al irse, y el día que
cambia quien ocupa un puesto no hay que tocar ninguna configuración.

Los 20 trabajadores **no configuran nada**: solo reciben, en su correo de
siempre. No necesitan 2FA, ni contraseña de aplicación, ni aparecer en Vercel.

**Por qué repartido y no concentrado**, decisión de Mónica: una cuenta de Gmail
gratuita manda del orden de 500 correos al día. Repartido por áreas ninguna se
acerca al tope; concentrado en un buzón, el día que facturación mande la remesa
del mes deja al radar comercial sin poder avisar. Y si un buzón se rompe
—contraseña rotada, 2FA reiniciado— se cae un área, no la app entera.

## 2. Los buzones

Todos son `<área>.accesalia@gmail.com`, y todos son funcionales. **El de Daniel
también**: se llama así pero no es su correo de trabajo, se creó expresamente
para el CRM.

| Área | Buzón | Su llave en Vercel | Qué hace la app con él |
|---|---|---|---|
| comercial | `comercial.accesalia@gmail.com` | `GMAIL_COMERCIAL` | **envía**: radar de IEE, avisos de seguimiento |
| comercial | el del Polycam | `BUZON_POLYCAM_CLAVE` | **lee**: recoge los escaneos, cada 10 minutos |
| oficina | `oficina.accesalia@gmail.com` | `GMAIL_OFICINA` | **envía**: lo administrativo de base |
| subvenciones | `subvenciones.accesalia@gmail.com` | `GMAIL_SUBVENCIONES` | por decidir |
| obras | `obras.accesalia@gmail.com` | `GMAIL_OBRAS` | por decidir |
| gerencia | `gerencia.accesalia@gmail.com` | `GMAIL_GERENCIA` | por decidir |
| Daniel | `daniel.accesalia@gmail.com` | `GMAIL_DANIEL` | su agenda |

Las seis llaves están puestas en Vercel desde el 25-sep-2026. **No hay que
crear ningún buzón nuevo ni pedirle nada a Ana** para que esto funcione.

**Comercial tiene dos buzones a propósito**, y los dos motivos cuentan: el del
Polycam recibe adjuntos que pesan, y lo lee una máquina cada diez minutos
marcando correos como leídos. Un buzón que además usara una persona se pelearía
con ella.

## 3. Qué es secreto y qué no

- **La llave** (la contraseña de aplicación de 16 caracteres) es secreta. Vive
  **solo** en las variables de entorno de Vercel: `GMAIL_<ÁREA>`.
- **La dirección** no es secreta: `subvenciones.accesalia@gmail.com` lo puede
  saber cualquiera. Va **escrita en la app**, a la vista, donde se lee y se
  corrige sin entrar en ningún panel.

Una llave sin puerta no abre nada. Ese fue el hueco que encontró Mónica: los
`GMAIL_*` del 25-sep tenían la llave y nadie le había dicho a la app **qué
buzón abría cada una**. El del Polycam funcionaba porque es el único que tiene
las dos mitades (`BUZON_POLYCAM_USUARIO` y `BUZON_POLYCAM_CLAVE`).

**Quién crea los buzones:** Ana. Ella crea los correos, mantiene las
contraseñas y da de alta el 2FA. A Mónica se le piden **tres datos y nada más**
—correo, contraseña y clave de 16— nunca el procedimiento.

## 4. Cada correo que manda la app tiene cuatro decisiones

Y no son la misma clase de cosa. Esta distinción es la que evita listas que se
quedan viejas:

| | Qué es | Quién lo decide |
|---|---|---|
| **De qué buzón sale** | configuración, estable | la **función**, no la persona que la ejecuta. Se decide una vez |
| **Qué nombre se ve** | configuración, estable | por área: `Accesalia · Comercial`. Se decide una vez |
| **Quién lo recibe** | **dato del caso, no configuración** | lo dicta la situación: el comercial asignado, el técnico del proyecto, la contrata de esa obra |
| **A quién se responde** | configuración con valor por defecto | por defecto, quien hizo la acción; se puede fijar a otra persona si interesa |

**El buzón lo decide la tarea, no la persona.** La misma persona manda desde
tres buzones distintos según lo que esté haciendo: Alejandra en función
comercial escribe desde comercial; llevando la agenda de Daniel, desde el de
Daniel; haciendo administración de base, desde el de oficina.

**De quién viene y a dónde vuelven las respuestas son dos campos distintos del
correo.** Casi siempre coinciden, y por eso no se nota que son dos. Aquí se
ponen distintos a propósito: viene de `Accesalia · Comercial` y, si el comercial
responde, la respuesta le llega a la persona que hizo la acción. Igual que un
correo de una tienda, que llega de la marca y se contesta a atención al cliente.

## 5. La función, no la persona

> **"¿Quién tiene esta función hoy?" se contesta en UN solo sitio**, que mira
> las funciones con sus fechas (`equipo_funciones.desde` / `.hasta`) y las
> ausencias aprobadas. Todo lo demás pregunta ahí: a quién se le manda el
> correo, a quién se le avisa, quién entra en qué pantalla, a quién se le
> asigna un trabajo.

El radar de IEE ya funciona así: pregunta por quien tenga la función
`supervision_comercial`, activo y sin la función terminada. El nombre de
Alejandra no aparece en ninguna parte del código.

**Lo que falta**, y es de RRHH, no del correo:

1. **Que pedir vacaciones escriba la herencia.** Se aprueban las vacaciones → se
   dice qué funciones se heredan y quién las hereda → se escriben las filas de
   `equipo_funciones` con sus fechas. Las fechas ya existen; hoy nadie las
   rellena.
2. **Que la fila de quien está fuera no contesta.** Hoy contestarían las dos y
   el correo iría también a quien está de vacaciones.

Pedir vacaciones implica heredar funciones temporalmente, y por tanto **implica
heredar las herramientas**. Es lo mismo para un cambio de puesto definitivo: se
cambia quién tiene la función, no se busca dónde estaba escrito un nombre.

## 6. Pendiente

- **Que la app lea las `GMAIL_*`.** Hoy no lee ninguna: el radar usa
  `CORREO_SALIENTE_USUARIO` / `_CLAVE` / `_NOMBRE`, un juego de variables que
  inventé el 29-sep sin saber que esto existía. Esas tres desaparecen, y con
  ellas la idea de mandar desde el buzón personal de alguien.
- Decidir qué manda cada área (subvenciones, obras, gerencia están sin uso).
- El punto 5: la herencia de funciones por ausencia.

Ver también [glosario-modelo.md](glosario-modelo.md).
