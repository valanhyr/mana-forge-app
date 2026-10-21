# Plan: canales de comunicación de soporte

- Estado: `in-progress`.
- Fecha: 2026-10-10.
- Referencia: [spec](spec.md), AC-01–AC-12; ejecución en [tasks.md](tasks.md).
- Aprobación: spec, plan y D-01–D-03 de fase 1 confirmados el 2026-10-10 por el usuario
  («ok, en cualquir momento puedes hacer preguntas si es necesario»).
  Implementación autorizada por «adelante» el 2026-10-10; despliegue, cambios de datos
  existentes y permisos excluidos.

## Diseño propuesto

### 1. Contrato y procedencia

Persistir origen solo en creaciones nuevas y resolverlo en lectura como `UNKNOWN` si
falta o no se reconoce. Elegir almacenamiento tolerante (por ejemplo, string persistido
y valores controlados en DTO), evitando que un enum estricto rompa un BSON histórico
o de una versión posterior. No corregir el valor al leer/editar otros campos.

Conservar `customerVisible` y consultas de propiedad existentes. El DTO privado añade
los campos de la spec; no exponer el modelo Mongo en endpoints del cliente.
Separar tipos de lectura/creación en Frontdesk si los nuevos campos requeridos chocan
con los actuales `Omit<Ticket, ...>`: origen/canales no son entrada autorizada del cliente.

### 2. Una política calculada de canales

Centralizar el cálculo para resúmenes, detalle, respuestas de mutaciones y guardia
de respuesta pública. Resolver cuentas **por ID**, nunca por email para autorización.
Agrupar resolución de IDs de una página cuando proceda; no consultar todo el listado
de usuarios ni cargar conversaciones para calcular canales. No persistir capacidades
derivadas ni consultar SMTP/Directus para la disponibilidad de lectura web.

`customerVisible` informa la regla histórica; `WEB` informa acceso efectivo con una
cuenta elegible en el momento de consulta/procesamiento. Mantener motivos estables
de la spec y diferenciar contrato no disponible/error de una lista vacía válida.
La dirección del ticket conserva el esquema de cifrado y la comparación exacta del
endpoint existente; no normalizarla ni reemplazarla por la actual de la cuenta.

### 3. Guardia antes de añadir una respuesta

En `addMessage`, para toda petición no interna, recargar ticket y comprobar `WEB`
antes de añadir mensaje o cambiar estado/fecha. Si falta, devolver el 409 específico
sin llamar a guardado, auditoría de respuesta o SMTP. Omitir `isInternalNote` sigue
equivaliendo a respuesta pública y queda cubierto por la guardia.

Notas mantienen sus restricciones y actor de sesión. Conservar `@Version`, límites
y reglas actuales de `CLOSED`/`RESOLVED`; esta fase no añade política de cierre.
`WEB` significa posibilidad de consulta, no permiso del cliente para responder a cerrado.
No añadir transacciones ficticias: auditoría es independiente de la escritura del ticket.

### 4. Detalle y compositor web/nota

El adaptador HTTP valida/normaliza solo el contrato de lectura conocido; nunca infiere
canales de datos anteriores. API antigua o capacidades incoherentes: estado explícito
desconocido y sin acción pública, con notas autorizadas disponibles. Casos con origen
desconocido pero capacidades válidas mantienen esas capacidades.

El detalle muestra origen, visibilidad efectiva, correo de contacto y motivos. `ReplyBox`
recibe capacidades, sin llamadas HTTP propias. Modos explícitos de respuesta web y nota,
sin convertir borradores internos al cambiar modo. Botones y confirmaciones describen
persistencia, no entrega. Mantener estados carga/error/no encontrado y contexto por ID.
Los mocks opt-in deben representar también contacto, antiguo y ningún canal; no
conceder capacidades a registros de localStorage viejos por tener `userId`.

### 5. Alternativa mínima de correo

Propuesta D-03: diálogo/panel contextual propiedad de `TicketsView`, no navegación
global por `App.tsx`. Reutilizar `EmailComposer`, `useSendEmail` y plantillas operativas:

- Se abre solo con `EMAIL`, muestra contacto fijo y referencia del ticket, precarga
  nombre/dirección, y pasa `ticketId` a `SendEmailPayload` (ya existe).
- Solo preparar; no copiar notas ni el historial ni enviar automáticamente. No añadir
  macros de ticket ni insertar una respuesta en la conversación.
- El envío explícito reutiliza `/api/frontdesk/emails` y la comparación de destinatario
  existente. Si el ticket cambia de contacto entre lectura y envío, el servidor rechaza
  la discrepancia; nunca quitar `ticketId` para eludir la validación.
- Conservar distinción SMTP/entrega, errores y ausencia de reintentos. No cambiar estado
  del ticket después de correo ni integrar su cronología; eso pertenece a fase 5.
- Aislar/resetear contexto por ticket y desmontar en pérdida de sesión. Advertir al
  cerrar con borrador; no establecer almacenamiento durable de borradores.
- No cambiar políticas de plantillas ni corregir fallos de Directus de forma lateral.
  Mostrar error real del flujo existente; no ocultarlo como ausencia de plantillas.

## Servicios y archivos principales verificados

Los nombres cortos de Java corresponden a `mana-forge-api/src/main/java/com/manaforge/api/`.

| Área | Archivos existentes / uso previsto |
|---|---|
| API, modelo y contratos | `model/mongo/SupportTicket.java`, `dto/FrontdeskDtos.java`, `dto/SupportDtos.java` (regresión, sin ampliación privada) |
| API, reglas y vistas | `service/SupportTicketService.java`, `service/FrontdeskQueryService.java`, `service/AccountAccessService.java` (reutilizar regla, no cambiar permisos) |
| API, HTTP/errores | `controller/FrontdeskController.java`, `controller/FrontdeskExceptionHandler.java`, `controller/SupportController.java`; la guardia requiere prueba con servicio real, no solo mock del controlador |
| API, persistencia/contacto/correo | `repository/SupportTicketRepository.java`, `repository/UserRepository.java`, `controller/ContactController.java` (regresión anti-spam), `service/FrontdeskEmailService.java` (regresión envío existente) |
| Frontdesk, dominio y puertos | `mana-forge-frontdesk/src/core/domain/ticket.ts`, `src/core/domain/email.ts`, `src/core/ports/ticket-repository.port.ts` |
| Frontdesk, adaptadores y hooks | `mana-forge-frontdesk/src/infrastructure/api/http-repositories.ts`, `src/infrastructure/mocks/mock-ticket-repository.ts`, `src/infrastructure/mocks/seeds/seed-tickets.ts`, `src/hooks/use-tickets.ts`, `src/hooks/use-emails.ts` |
| Frontdesk, presentación | `mana-forge-frontdesk/src/views/TicketsView.tsx`, `src/components/tickets/TicketDetail.tsx`, `src/components/tickets/ReplyBox.tsx`, `src/components/emails/EmailComposer.tsx`, `src/labels.json` |
| Documentación | `docs/frontdesk-api.md`, `ARCHITECTURE.md` (garantías afectadas), roadmap y estos tres artefactos; actualizar solo cuando el contrato esté implementado/validado |
| Web, solo regresión | `mana-forge-web/src/views/messages/Support.tsx`, `src/__tests__/views/Support.test.tsx`; no se propone cambiar producción web |

Archivos nuevos de esta implementación: `service/WebChannelUnavailableException.java`,
`mana-forge-api/src/test/java/com/manaforge/api/controller/SupportChannelsContractTest.java`
y `mana-forge-frontdesk/src/views/TicketEmailPanel.tsx`. El panel reutiliza también
`TemplateSelector.tsx` y `MacroPreview.tsx`, ahora con controles/textos del recorrido es/en.
Se preserva el trabajo previo del usuario en controladores, plantillas y documentación.

## Alternativas y elecciones

| Alternativa | Motivo de descarte / elección |
|---|---|
| Inferir origen o acceso por email, `userId` aislado, primer mensaje o auditoría | No acredita procedencia/identidad; riesgo de publicar históricos. Elegir origen explícito y fallback desconocido. |
| Backfill de origen/flag o guardar canales como permisos | Cambia datos/visibilidad y deja capacidades obsoletas. Elegir compatibilidad de lectura sin migración. |
| Mostrar aviso pero permitir guardar respuesta oculta | Deja el fallo en clientes antiguos/petición directa y cambia estado sin comunicar. Elegir bloqueo UI y servidor. |
| Llamar correo disponible a todo `userEmail` o entrega a `success=true` | Dirección puede faltar/ser inválida y SMTP solo acepta. Separar elegibilidad, intención y resultado existente. |
| `mailto:` o nuevo envío combinado web/SMTP | El primero evita el flujo operativo trazable; el segundo adelanta fase 5 y problemas de idempotencia. Elegir compositor operativo contextual mínimo. |
| Navegación global a Email Outreach con ficha/historial/macros | Adelanta fase 3. Panel local de Tickets aprobado en D-03. |
| Deduplicación/reintentos SMTP nuevos en esta fase | Alcance de fase 5. Conservar no reintento automático y declarar incertidumbre/riesgo existente. |

## Secuencia y dependencias

| Paso | Entrega pequeña | Dependencias / tareas |
|---|---|---|
| P-0 | Aprobación registrada: contrato, acceso efectivo y límite del correo | D-01–D-03 resueltas; T-01 completada |
| P-1 | Pruebas de BSON histórico y contrato; origen nuevo y política de canales | P-0; T-02–T-04 |
| P-2 | Guardia HTTP de respuesta y regresiones de privacidad/notas | P-1; T-05–T-06 |
| P-3 | Adaptadores/mocks seguros, detalle y respuesta/nota inequívocos | P-1/P-2; T-07–T-08 |
| P-4 | Preparación contextual de correo usando contrato existente | P-3 y D-03; T-09 |
| P-5 | Recorridos, idiomas/accesibilidad, regresión y documentación | P-1–P-4; T-10–T-12 |

No cerrar la fase con solo un cambio visual: la guardia y la privacidad son necesarias.
Se puede aprobar/revisar una subentrega, pero el resultado completo exige AC-01–AC-12.

## Estrategia TDD

Para cada comportamiento: escribir prueba de requisito, ejecutarla y verificar fallo
por comportamiento faltante, implementar mínimo, ejecutar verde y refactorizar volviendo
a ejecutar. Registrar comando/resultado por tarea. Si ya pasa, documentar regresión
existente; no inventar rojo ni atribuir TDD a trabajo anterior.

| Nivel / pruebas existentes a ampliar | Casos y criterios |
|---|---|
| Unitarias API: `SupportTicketServiceTest` | Orígenes por entrada; Contacto coincidente; flag histórico; canales/motivos; guardia y ausencia de efectos; nota interna y estado. AC-01, AC-04, AC-05, AC-07, AC-08, AC-10. |
| Persistencia: `SupportTicketRepositoryTest` | Insertar BSON crudo de prueba, no solo objetos Java: origen/flag ausentes, nulos, false/true y origen desconocido; lectura sin escrituras, consulta propietaria y `@Version`. AC-02, AC-04, AC-11. |
| Unitarias consulta: `FrontdeskQueryServiceTest` | Canales de resúmenes sin mensajes; paginación y resolución por ID; lista vacía/dependencia fallida. AC-03, AC-05, AC-11. |
| Contrato HTTP: `FrontdeskControllerTest` y `CustomerSupportControllerTest` | Campos en lista/detalle/mutaciones; 401/403/CSRF, cuerpos falsificados, 404 a otras cuentas; 409 estable. Añadir prueba de Frontdesk con servicio real/repositorios simulados para guardia y lectura posterior del cliente: el slice actual de Frontdesk mockea el servicio. AC-02, AC-03, AC-07, AC-08, AC-10, AC-11. |
| Regresión Contacto: `ContactControllerTest` | Anti-spam antes de persistencia, feature flag; contacto con sesión no se convierte en soporte autenticado. AC-01, AC-02. |
| Regresión correo: `FrontdeskEmailServiceTest` | Contacto correcto con `ticketId`, rechazo antes de SMTP si no coincide, texto plano, sin notas automáticas, aceptación/fallo sin reenvío. AC-09, AC-10, AC-11. |
| Adaptadores: `infrastructure/api/http-repositories.test.ts` y `infrastructure/mocks/mock-repositories.test.ts` | Nuevo contrato, legado API/localStorage, capacidades desconocidas/coherencia; campos de lectura no enviados como autorizaciones. AC-03, AC-04, AC-11. |
| Componentes: `TicketDetail.test.tsx`, `ReplyBox.test.tsx`, `EmailComposer.test.tsx` | Matriz de canales, destino previo, modo nota sin transferencia, borrador/error, confirmación SMTP y correo contextual fijo. AC-06–AC-12. |
| Recorrido Frontdesk: `App.api.test.tsx` / pruebas nuevas del panel Tickets | Contacto coincidente sin envío web; abrir/cancelar correo no muta; confirmar usa ticket/contacto y CSRF; cambiar A/B, sesión expirada y conflicto sin reintento. Fetch simulado, no envío real. AC-06–AC-12. |
| Idiomas: `labels.test.ts` | Paridad es/en más contenido/nombres accesibles de acciones nuevas; no basta igualdad de claves. AC-12. |
| Web: `src/__tests__/views/Support.test.tsx` | Regresión de respuesta pública y privado fallido. La exclusión real de notas/propiedad la verifican API/persistencia, no un mock de la vista. AC-02, AC-08, AC-10, AC-11. |

El primer rojo de guardia debe demostrar que hoy se puede añadir una respuesta pública
a un ticket no visible; añadir aserciones de **cero** guardados/auditoría/SMTP. El de
legado debe partir de documentos realmente incompletos; no simular únicamente DTOs nuevos.
No ejecutar fixtures destructivos fuera de una base aislada de pruebas.

### Comandos de validación previstos

Desde cada servicio, en PowerShell. Wrapper/tooling presentes y comprobados por versión;
los comandos ejecutados y resultados se registran en [tasks.md](tasks.md):

```powershell
# mana-forge-api: subconjunto inicial y suite final
.\mvnw.cmd test "-Dtest=SupportTicketServiceTest,SupportTicketRepositoryTest,FrontdeskQueryServiceTest,FrontdeskControllerTest,CustomerSupportControllerTest,ContactControllerTest,FrontdeskEmailServiceTest"
.\mvnw.cmd test

# mana-forge-frontdesk: subconjuntos por tarea y suite final
npx --no-install vitest run src/components/tickets/ReplyBox.test.tsx src/components/tickets/TicketDetail.test.tsx
npx --no-install vitest run
npx --no-install tsc --noEmit
npm run build

# mana-forge-web: regresión del consumidor sin cambio de producción
npx vitest run src/__tests__/views/Support.test.tsx
```

Frontdesk no tiene script `lint`; no añadirlo ni documentarlo como disponible. Si se
cambiase frontend web (no propuesto), requerir también su lint y comprobación de tipos.
El perfil API `test` configura Mongo local/embebido y mocks; confirmar aislamiento de
variables/conexiones antes de pruebas de persistencia. No reutilizar `.env` productivo.

## Seguridad, compatibilidad y recuperación

- Mantener fronteras privadas, CSRF, autorización por ID, flag y cuenta activa/verificada.
  No tocar lista de operadores, cookies/CORS ni reglas anti-spam; nunca hacer pública
  la colección de plantillas o su token.
- No migración de datos ni índices necesaria para esta propuesta. El origen es opcional
  en históricos y las capacidades se calculan. Las creaciones futuras tendrían campo
  nuevo en creaciones futuras; durante esta ejecución solo se escribieron fixtures en
  Mongo embebido, nunca datos reales.
- Account/ticket/auditoría/SMTP no forman una transacción. Revalidación al procesar
  reduce UI obsoleta, pero no garantiza acceso tras una suspensión concurrente/futura.
  No cambiar las garantías existentes de escrituras parciales o SMTP incierto.
- En error no anunciar comunicación efectiva. Ante 409 recargar manualmente y revisar
  el borrador; ante timeout de escritura/envío, reconciliar antes de reenviar.
- Evitar degradaciones inseguras: cliente nuevo con API antigua bloquea canales públicos;
  datos con origen desconocido no pierden acceso autorizado por flag/ID elegible.

## Validación manual y entrega propuestas

Tras pruebas verdes, en entorno local aislado, escritorio y móvil (~360 px), es/en y
teclado/lector: soporte autenticado, Contacto con email coincidente, legado oculto/visible,
cuenta no elegible, sin correo, nota, error y cambio de ticket. Validar lectura del cliente
y exclusión de nota desde la API, no solo ocultándola visualmente.

Antes de levantar Docker, confirmar configuración y ausencia de conexiones a producción;
usar mocks SMTP o servidor de pruebas capturador, nunca destinatarios reales. La revisión
visual no se sustituye por jsdom. Registrar navegador, entorno, resultados y capturas
solo si no contienen datos privados reales.

Orden propuesto de despliegue, **no autorizado**: API aditiva con guardia, después
Frontdesk; el cliente antiguo encontrará 409 seguros en tickets ocultos durante transición.
Si hay rollback, no retirar la guardia para recuperar una UI engañosa: mantener API segura
y bloquear/retirar temporalmente acciones públicas del cliente problemático. Aprobar
operativamente cualquier despliegue/rollback por separado. No borrar el nuevo campo
de origen ni hacer backfill como parte de la entrega.

Autorización posterior del usuario, 2026-10-10: desplegar en Docker actual, aceptando
conexión Mongo remota/SMTP real y efectos existentes de arranque. Se reconstruyeron
API y Frontdesk con etiquetas locales `local-support-channels` y se recrearon en ese
orden, con `--no-deps --no-build --pull never --wait`, preservando configuración,
volúmenes y resto de contenedores. Ambos saludables; acceso `http://127.0.0.1:5174`.
Sin envíos ni operaciones de tickets de prueba, sin publicación al registro. Este
despliegue no sustituye T-11 ni autoriza otro host/despliegue o migraciones adicionales.

## Estado y aprobación

- D-01–D-03 aprobadas; D-04 conserva el límite de asociación actual y D-05 conserva
  aislamiento de borradores. Detalles de copy/UX pendientes de revisión.
- Implementación y pruebas automatizadas ejecutadas, con evidencia TDD en tareas.
  Validación visual/manual pendiente; fase no se declara terminada. Desplegada en
  Docker del host local con autorización posterior y smoke HTTP correcto.
- Alcance aprobado: contrato, reglas de compatibilidad y bloqueo,
  alcance mínimo del correo, secuencia TDD y ausencia de migraciones/permisos nuevos.
- Confirmación del usuario: 2026-10-10, respuesta afirmativa al resumen de spec/plan
  y D-01–D-03. Solo fase 1; no incluye despliegue, correos reales ni cambios de datos
  existentes. Consultar si surgen cambios materiales de alcance o garantías.
