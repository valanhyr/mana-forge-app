# Fase 1: canales de comunicación de soporte

- Estado: `in-progress`.
- Fecha: 2026-10-10.
- Origen: [fase 1 del roadmap](../../communication-implementation-plan.md#fase-1-canales-explícitos-y-respuestas-visibles).
- Artefactos: [plan](plan.md) y [tareas](tasks.md).
- Aprobación: spec y plan de fase 1 aprobados el 2026-10-10 por el usuario:
  «ok, en cualquir momento puedes hacer preguntas si es necesario».
  Implementación iniciada tras «adelante» el 2026-10-10; sin autorización de despliegue,
  cambios de datos existentes ni permisos. Validación manual pendiente.

## Problema y objetivo

El operador puede guardar una respuesta que el contacto no puede consultar en la web.
Guardar ese mensaje tampoco envía correo. Frontdesk no muestra la información necesaria
para distinguir una conversación accesible de un registro operativo sin acceso del cliente.

Usuarios afectados: operadores, clientes con soporte autenticado y personas que usan
Contacto, tengan o no cuenta. Objetivo: identificar origen y visibilidad, mostrar dónde
puede consultarse o intentarse enviar una respuesta y bloquear acciones engañosas.
**Canal disponible no significa mensaje entregado, leído ni destinatario autenticado.**

## Comportamiento actual verificado

Diagnóstico inicial anterior a la implementación: revisión del árbol de trabajo,
incluidos cambios previos del usuario; no es
una validación visual ni una ejecución de los recorridos:

| Hecho | Evidencia |
|---|---|
| El modelo tenía `userId` y `customerVisible` booleano, pero no origen ni canales. Un campo ausente se leía como falso; la prueba posterior encontró que nulo explícito rompía el unboxing (corregido, evidencia en tareas). | `mana-forge-api/src/main/java/com/manaforge/api/model/mongo/SupportTicket.java` |
| Soporte autenticado crea tickets visibles del usuario de sesión. Frontdesk con `userId` obtiene la cuenta por ID y activa visibilidad; sin él, no la activa. | `SupportTicketService.createForCustomer` y `create` |
| Contacto busca una cuenta por email cifrado y puede guardar su `userId`, pero no activa `customerVisible`. El remitente del mensaje no tiene ID autenticado. | `SupportTicketService.createFromContact` |
| La consulta del cliente exige propiedad por ID y `customerVisible=true`; la cuenta debe estar activa/verificada. Solo se serializan mensajes públicos. | `SupportTicketRepository`, `SupportTicketService.customerView`, `AccountAccessService`, `SupportController` |
| `TicketView` no transmite visibilidad. Lista y detalle comparten ese DTO; la lista excluye mensajes. | `FrontdeskDtos`, `FrontdeskQueryService.tickets` |
| Añadir una respuesta pública desde Frontdesk no comprueba acceso web ni envía correo; puede cambiar el estado a `WAITING_USER`. | `SupportTicketService.addMessage` |
| El detalle siempre muestra el compositor de respuesta/nota, sin distinguir canales. | `mana-forge-frontdesk/src/components/tickets/TicketDetail.tsx` y `ReplyBox.tsx` |
| Existe envío operativo individual y el contrato admite `ticketId`; el servidor exige que el destinatario coincida con el contacto almacenado del ticket. El compositor no propaga actualmente ese ID. | `FrontdeskEmailService`, `FrontdeskDtos.SendEmail`, `core/domain/email.ts`, `EmailComposer.tsx` |
| La web del cliente ya refresca soporte cada 30 segundos cuando está visible. No hay aviso de correo automático. | `mana-forge-web/src/views/messages/Support.tsx` |

Un `userId` en un ticket de Contacto **no basta** para afirmar que pertenece a una
conversación autenticada. No se deduce identidad de nombre, email, autor, fecha o asunto.

## Alcance

1. Registrar el origen de tickets nuevos desde las tres entradas existentes.
2. Exponer en la API privada de Frontdesk origen, visibilidad y canales calculados.
3. Mostrar esos datos en el detalle y condicionar las acciones antes de enviarlas.
4. Impedir también en el servidor respuestas web sin un destinatario con acceso web.
5. Ofrecer una preparación mínima de correo mediante el compositor operativo existente,
   con destinatario y `ticketId` del ticket; el envío sigue siendo una acción explícita.
6. Mantener notas internas, privacidad y compatibilidad de documentos antiguos sin backfill.

### No objetivos

- Fases 2–6: navegación de ayuda/chat, ficha 360, routing general, refresco de Frontdesk,
  no leídos, asignaciones/seguimiento, cierre o feedback.
- Respuesta web más aviso de correo, cronología unificada, recepción de respuestas por
  email, nuevos estados de entrega, outbox durable, deduplicación o recuperación SMTP.
- Publicar tickets antiguos, vincular/reclamar tickets, modificar propietarios o visibilidad,
  crear cuentas por email, migrar datos o cambiar políticas de Directus, sesión o CSRF.
- Garantizar entrega al buzón, lectura o que una persona continúe por email dentro de la web.
- Rediseñar el cifrado o normalizar direcciones históricas.

La preparación mínima de correo se limita a hacer utilizable la alternativa de fase 1.
No incluye macros de ticket automáticas, historial contextual ni navegación usuario/ticket
de fase 3. Su inclusión y presentación local en Tickets están aprobadas (D-03).

## Reglas y contrato aprobados

### Origen, propiedad y visibilidad son conceptos distintos

`origin` identifica la entrada que creó el ticket, no el canal de una respuesta:

| Entrada de creación nueva | `origin` | Visibilidad persistida |
|---|---|---|
| `POST /api/support/tickets` | `SUPPORT_WEB` | `true`, propietario de sesión |
| Contacto aceptado con persistencia habilitada | `CONTACT_FORM` | `false`, incluso si coincide el email o hay sesión |
| `POST /api/frontdesk/tickets`, con o sin cuenta explícita | `FRONTDESK` | Regla actual: `true` solo con cuenta seleccionada por ID |
| Registro sin origen, nulo o no reconocido | `UNKNOWN` en lectura | Conservar la regla histórica; nunca inferir un origen |

El servidor fija origen y calcula canales. El navegador no puede conceder visibilidad,
cambiar propietario ni declarar canales mediante campos adicionales en un cuerpo.
El mensaje inicial de un ticket sin acceso web es un registro de la consulta, no un envío.
Esta fase no introduce un formulario de creación ni cambia su autorización existente.

### Extensión aditiva del contrato privado

Propuesta de campos de `TicketView`, tanto en resúmenes como en detalle y respuestas
de creación/mutación. Se conservan los campos, rutas y paginación actuales:

| Campo de respuesta | Valores / significado |
|---|---|
| `origin` | `SUPPORT_WEB`, `CONTACT_FORM`, `FRONTDESK`, `UNKNOWN` |
| `customerVisible` | Booleano de la regla persistida; ausente/nulo histórico equivale a falso, no a una nueva autorización |
| `availableChannels` | Lista sin duplicados de `WEB` y/o `EMAIL`; `[]` es válido |
| `webUnavailableReason` | `null` si hay `WEB`; de lo contrario, código explicativo de la tabla siguiente |

Los nombres/valores son el contrato aprobado (D-01), implementado en el árbol de trabajo
y comprobado con pruebas automatizadas; aún no desplegado ni validado visualmente.
El DTO del cliente `/api/support/**` no incorpora emails, origen operativo, notas,
asignaciones ni estos diagnósticos privados.

### Cálculo de canales

- `WEB`: solo si `customerVisible=true`, hay `userId` no vacío y la cuenta de ese ID
  existe, está activa y verificada. Se calcula con las mismas reglas de acceso actuales;
  no requiere que el cliente esté conectado en ese momento. Revalidar al procesar
  una respuesta, sin usar el email para resolver el propietario.
- Ausencia de `WEB`, por orden de evaluación: `NOT_CUSTOMER_VISIBLE`, `NO_OWNER`,
  `OWNER_NOT_FOUND`, `OWNER_INACTIVE`, `OWNER_UNVERIFIED`. Describe imposibilidad
  actual de consulta; no cambia el flag ni el estado de la cuenta (D-02).
- `EMAIL`: existe una dirección de contacto almacenada, descifrable y válida para el
  envío operativo existente. Usar la del ticket, no sustituirla por la de una cuenta
  encontrada por email ni por una dirección actual diferente. No prueba titularidad,
  existencia del buzón ni disponibilidad de SMTP. No consultar SMTP para calcularla.
- Falta/dirección vacía o inválida: sin `EMAIL`, con explicación visible. Un fallo de
  descifrado o dependencia se muestra como error, nunca como disponibilidad confirmada;
  no obliga a reparar datos ni a rediseñar la gestión general de errores en esta fase.
- Los canales no se guardan como permisos ni como historial de entrega. El origen
  `UNKNOWN` no impide `WEB` cuando la visibilidad explícita y la cuenta lo permiten.
- `CLOSED` y `RESOLVED` no eliminan la capacidad de **leer**. No se rediseñan las reglas
  actuales de respuesta/cierre; se conserva el rechazo del cliente a responder a `CLOSED`
  y los límites existentes. La disponibilidad web no promete que el cliente pueda contestar.

| Ejemplo | Resultado esperado |
|---|---|
| Visible, propietario activo/verificado, email válido | `WEB`, `EMAIL` |
| Contacto no visible con email de una cuenta existente | Solo `EMAIL` |
| Antiguo sin origen ni flag, con `userId` y email válido | `UNKNOWN`, no visible, solo `EMAIL` |
| Antiguo visible con propietario elegible y sin email | `UNKNOWN`, solo `WEB` |
| Visible con propietario suspendido y email válido | Flag conservado, solo `EMAIL`, explicación de cuenta inactiva |
| Visible pero sin propietario, sin email válido | Flag conservado, ningún canal; solo nota interna |

### Acciones observables

- El detalle muestra origen, si el cliente puede leer en la web y destino del correo,
  incluyendo el aviso «La dirección de contacto no verifica la identidad» para Contacto.
  En tickets sin origen fiable: «Origen no registrado». No etiquetar todo ticket oculto
  como contacto anónimo: también puede ser antiguo o creado en Frontdesk.
- Con `WEB`: «Responder en la web», con aviso previo «Se guardará en la conversación;
  no se enviará un correo». Tras éxito: respuesta guardada/disponible, no recibida/leída.
- Sin `WEB`: no ofrecer guardar una respuesta pública como comunicación. El endpoint
  de mensajes rechaza `isInternalNote=false` o ausente con HTTP **409** y código
  propuesto `WEB_CHANNEL_UNAVAILABLE`, antes de guardar mensaje, cambiar estado/fecha
  o registrar un evento de respuesta. No usa 403, reservado a acceso/CSRF, que desmonta
  las vistas privadas en el cliente actual.
- Con `EMAIL`: «Responder por correo» abre preparación contextual; no guarda respuesta,
  nota, estado ni envío al abrir. Destinatario visible y fijo al contacto del ticket,
  con `ticketId` en el envío explícito. Sin `EMAIL`, acción deshabilitada/no ofrecida con
  explicación. No permitir que una edición del destinatario desvincule silenciosamente el caso.
- El correo usa el endpoint existente, texto plano y sus validaciones. Ninguna nota ni
  conversación completa se copia automáticamente al cuerpo. La confirmación SMTP sigue
  siendo aceptación, no entrega; no hay respuesta web ni cambio de estado implícitos.
- «Guardar nota interna» siempre es una acción inequívoca, salvo restricciones existentes
  de sesión, contenido, límite de mensajes y concurrencia. Cambiar de modo no convierte
  ni copia automáticamente un borrador de nota en respuesta web o correo.

### Compatibilidad, privacidad y fallos

- No actualizar registros al leer; sin scripts de backfill, inferencias por email, autor
  del primer mensaje o auditoría. Conservar propietario, visibilidad, notas y mensajes
  históricos, incluso respuestas públicas antiguas que nunca tuvieron canal web.
  No presentar estas respuestas como correos enviados.
- Un origen desconocido almacenado no rompe la lectura ni se sustituye al guardar una
  nota/cambio administrativo. Una escritura ordinaria no eleva visibilidad ni reclasifica.
- API nueva con cliente antiguo: campos aditivos ignorables; la respuesta web antes
  permitida para tickets ocultos ahora se rechaza deliberadamente con 409. No preservar
  ese comportamiento inseguro como compatibilidad.
- Cliente nuevo con API antigua/metadatos inválidos: indicar «Canales no disponibles»
  y bloquear respuesta web y preparación contextual de correo; no reconstruirlos a partir
  de `userId`/email. Mantener notas autorizadas y pedir actualizar/revisar la API.
  Origen ausente con el resto del contrato válido se muestra como `UNKNOWN`.
- Lista vacía, carga, error y ticket inexistente tienen estados distintos. No permitir
  enviar mientras falta detalle válido ni utilizar los canales de otro ticket.
- En 409/red conservar el borrador del ticket y no reintentar automáticamente; ante
  resultado incierto revisar antes de reenviar. Cambiar ticket/cerrar compositor no
  reutiliza texto privado en otro contexto. Al expirar sesión/revocarse permisos, se
  desmonta también el compositor y se limpia estado privado conforme al flujo existente.
- Revalidar canales al procesar la petición y conservar `@Version`/409 para escrituras
  concurrentes. No prometer atomicidad entre cuenta, ticket, auditoría y SMTP, ni acceso
  permanente después de guardar: una cuenta puede perder acceso posteriormente.

## Criterios de aceptación

| ID | Criterio observable |
|---|---|
| AC-01 | Cada entrada nueva registra el origen correcto en servidor; Contacto sigue sin visibilidad, incluso con sesión/email coincidente. |
| AC-02 | Lectura y escritura del cliente conservan sesión activa/verificada, propietario por ID y flag explícito; emails iguales y cuerpos manipulados no conceden acceso. Frontdesk mantiene autorización y CSRF. |
| AC-03 | Lista, detalle y respuestas de mutaciones de Frontdesk incluyen el contrato coherente de origen/visibilidad/canales, sin añadir datos privados al DTO del cliente. |
| AC-04 | Documentos antiguos con origen/flag ausente, nulo o explícito y origen no reconocido siguen legibles; ninguna lectura/escritura ordinaria infiere origen, eleva visibilidad ni altera notas históricas. |
| AC-05 | `WEB` refleja acceso efectivo por ID/flag/cuenta elegible; `EMAIL` refleja solo contacto válido del ticket. Cuenta inactiva, propietario inexistente o ausencia de dirección producen el canal/motivo correcto. |
| AC-06 | Antes de actuar, el operador ve origen, acceso web, destino de correo y limitaciones; contactos sin web, origen desconocido y ningún canal tienen mensajes inequívocos. |
| AC-07 | Sin `WEB`, la UI bloquea respuesta pública y una petición directa/antigua devuelve 409 con código estable, sin mensaje, cambio a `WAITING_USER`, fecha, evento de respuesta ni SMTP. |
| AC-08 | Con `WEB`, guardar respuesta permite al propietario elegible leerla por la API del cliente, sin email automático; la UI no afirma entrega ni lectura y conserva reglas de estado/límites existentes. |
| AC-09 | Con `EMAIL`, se prepara correo con contacto y `ticketId` correctos; solo enviar explícitamente llama al endpoint existente. No se copian notas, no se guarda respuesta web y no se promete recepción integrada ni entrega al buzón. |
| AC-10 | Notas se guardan exclusivamente como internas, sin cambiar a `WAITING_USER` ni llamar SMTP; nunca aparecen en el DTO del cliente ni pasan automáticamente a otro canal. |
| AC-11 | Metadatos insuficientes, red, conflicto, dependencia caída, sesión expirada y cambio de ticket no permiten canal supuesto, éxito falso, reintento automático ni mezcla de borradores/contextos. |
| AC-12 | Los textos nuevos/modificados de este recorrido están en español e inglés; controles, explicaciones y confirmaciones son utilizables por teclado, lector de pantalla y en móvil. |

## Escenarios Dado / Cuando / Entonces

| ID / criterios | Dado | Cuando | Entonces |
|---|---|---|---|
| S-01 / AC-01, AC-03, AC-08 | Cuenta activa/verificada | Crea soporte autenticado y el operador responde en web | Origen `SUPPORT_WEB`, visible, canal `WEB`; el cliente lee la respuesta pública, no se llama SMTP. |
| S-02 / AC-01, AC-02, AC-05, AC-06, AC-07 | Contacto con email igual al de una cuenta, haya o no sesión | Se acepta el formulario y se abre en Frontdesk | Origen `CONTACT_FORM`, flag falso aunque haya `userId`, solo correo si válido; esa cuenta no lo lista/lee/responde y no hay respuesta web. |
| S-03 / AC-01, AC-03 | Operador autorizado con CSRF | Crea ticket seleccionando ID de cuenta o sin seleccionarlo | Origen `FRONTDESK`; solo la selección explícita conserva la activación actual de visibilidad. Campos falsificados no la sustituyen. |
| S-04 / AC-02, AC-03, AC-10 | Ticket visible con mensajes públicos y notas | Propietario u otra cuenta consulta/responde por API | Propietario ve solo públicos; otra cuenta recibe 404 sin escritura, aunque comparta email; no se filtran notas/asignaciones/diagnósticos. |
| S-05 / AC-04, AC-05, AC-07 | BSON histórico sin origen y con flag ausente/nulo/falso | Se lee y se intenta respuesta pública por HTTP | Origen `UNKNOWN`, no canal web, 409 sin efectos; `userId`/email no elevan visibilidad y no se modifica el BSON al leer. |
| S-06 / AC-04, AC-05, AC-08 | Antiguo con flag true, propietario elegible y origen ausente/no reconocido | Se lee y guarda respuesta o nota | Se mantiene acceso; origen observable desconocido sin sobreescribir su valor histórico ni reclasificar; nota sigue privada. |
| S-07 / AC-05, AC-07, AC-11 | Frontdesk mostró `WEB` | Antes de enviar la cuenta pierde elegibilidad o falta propietario | El servidor revalida, rechaza respuesta sin efectos y permite revisar canales; no borra flag ni reactiva cuenta. |
| S-08 / AC-05, AC-06, AC-10 | Sin acceso web ni email válido | Operador abre el ticket | Se informa que no hay canal de respuesta; solo puede guardar nota interna autorizada, no se afirma comunicación. |
| S-09 / AC-07 | Ticket no visible, operador con sesión/CSRF | Envía `isInternalNote=false` o lo omite en petición directa | 409 `WEB_CHANNEL_UNAVAILABLE`; no mensaje, auditoría de respuesta, cambio de estado/fecha ni SMTP. |
| S-10 / AC-09, AC-10 | Contacto con canal correo y notas privadas | Abre «Responder por correo», cancela o confirma envío | Abrir/cancelar no muta; enviar usa contacto y `ticketId`, nunca las notas. Aceptación SMTP no se etiqueta como entrega. |
| S-11 / AC-09, AC-11 | Compositor contextual preparado | Destinatario manipulado, SMTP falla o respuesta es incierta | Destinatario distinto se rechaza antes de SMTP conforme al contrato existente; fallo no genera éxito/reenvío ni respuesta web. |
| S-12 / AC-10, AC-11 | Borrador de nota en A | Cambia canal o abre B/cierra sesión | No se publica ni precarga en correo/B; notas guardadas siguen solo para operadores; no queda contexto privado tras cierre de sesión. |
| S-13 / AC-03, AC-11 | API antigua o contrato de canales inválido | Se carga detalle | Diagnóstico de contrato no disponible, sin canales inferidos ni acción pública habilitada; notas siguen sujetas al endpoint existente. |
| S-14 / AC-08, AC-10, AC-11 | Dos copias concurrentes o 500 mensajes | Se intenta añadir respuesta/nota | Se mantienen 409 y límites; no se pierde el mensaje ajeno, no se reintenta ni se anuncia éxito; borrador recuperable en su contexto. |
| S-15 / AC-06, AC-12 | Vista en es/en y pantalla móvil | Operador recorre acciones por teclado/lector | Identifica canal/destino/privacidad antes de enviar y recibe estados accesibles, sin depender solo del color. |

## Dependencias y decisiones

- Depende de los contratos y restricciones actuales de [Frontdesk](../../frontdesk-api.md)
  y [arquitectura](../../../ARCHITECTURE.md#backoffice-frontdesk), especialmente propiedad,
  cifrado, controles de Contacto y distinción persistencia/auditoría/SMTP.
- No depende de implementar otra fase. SMTP y Directus solo intervienen en el envío
  operativo existente; pruebas con mocks y sin tocar políticas.

| ID | Decisión | Resolución y estado |
|---|---|---|
| D-01 | Nombres/valores del contrato y código de error | Aprobada la extensión anterior, canales calculados, origen tolerante a desconocidos y 409. |
| D-02 | Visibilidad histórica frente a acceso efectivo actual | Aprobado mantener `customerVisible` y calcular `WEB` también con existencia/estado/verificación, con motivos privados. No es cambio de permisos. |
| D-03 | Alternativa mínima de correo de fase 1 | Aprobado compositor contextual local en Tickets, reutilizando el existente, contacto fijo y `ticketId`; sin routing/historial/macros de fases 3/5. |
| D-04 | `userId` asociado por email en Contacto | Límite aprobado: conservar asociación operativa no autenticada, flag falso y aviso. Separar/eliminar esa asociación requeriría otra spec y autorización. |
| D-05 | Copys y reglas de borrador al cambiar modo | Aprobada separación de modos sin transferencia automática de texto privado y advertencia antes de descartar borradores. Detalles de copy/UX pendientes de revisión, sin rebajar privacidad. |

La aprobación procede de la confirmación del usuario, no de guardar estos documentos.
Cambiar garantías, contrato o ampliar la integración de correo exige actualizarlos
y solicitar nueva aprobación; el usuario permite preguntas cuando sean necesarias.

## Aprobación

- Alcance aprobado: únicamente fase 1 delimitada aquí, incluidos bloqueo servidor y
  preparación mínima de correo. Fases restantes no autorizadas.
- Confirmación del usuario: 2026-10-10, «ok, en cualquir momento puedes hacer preguntas
  si es necesario», en respuesta al resumen y solicitud de aprobación de spec/plan
  y D-01–D-03. Se conservan los límites D-04 y D-05 presentados en los documentos.
- Implementación autorizada por «adelante» el 2026-10-10 y en curso. Evidencia parcial
  en tasks.md; validación visual/manual final pendiente.
- Despliegue Docker posterior autorizado y realizado el 2026-10-10: el usuario elige
  actualizar entorno actual y confirma reinicio API tras informar de Mongo remoto/SMTP
  y efectos automáticos de arranque. Solo API/Frontdesk locales, sin cambiar permisos,
  conexiones o volúmenes; GET de humo correcto. Detalles en tasks.md.
