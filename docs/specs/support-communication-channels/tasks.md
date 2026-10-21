# Tareas y evidencia: canales de comunicación de soporte

- Estado: `in-progress`; implementación autorizada por «adelante» el 2026-10-10.
- Fecha: 2026-10-10.
- Referencias: [spec](spec.md) y [plan](plan.md).
- Alcance: fase 1 únicamente, spec/plan aprobados por el usuario el 2026-10-10.
  La ejecución comenzó tras la confirmación «adelante». Sin autorización de despliegue,
  migraciones, cambios de datos existentes ni permisos.

## Tareas, dependencias y trazabilidad

| Hecho | ID | Tarea / entrega | AC | Depende de |
|---|---|---|---|---|
| [x] | T-01 | Registrar aprobación de spec/plan y resolver D-01–D-03; confirmar límites D-04/D-05. | AC-01–AC-12 | Confirmación del usuario registrada abajo |
| [x] | T-02 | Caracterizar compatibilidad con BSON histórico real de pruebas: origen/flag ausentes, nulos, false/true, desconocido; lectura sin escritura y propiedad exacta. | AC-02, AC-04, AC-10, AC-11 | T-01 |
| [x] | T-03 | Fijar origen en las tres entradas nuevas; conservar reglas de flag/actor/anti-spam y casos Contacto con email coincidente y sesión. | AC-01, AC-02, AC-04 | T-02 |
| [x] | T-04 | Implementar política por ID y contrato privado coherente en lista/detalle/mutaciones; canales web/correo y motivos, tolerancia de origen, sin carga de mensajes en lista. | AC-03, AC-04, AC-05, AC-11 | T-03, D-01, D-02 |
| [x] | T-05 | Bloquear en servidor respuesta sin `WEB`, incluido flag de nota omitido; 409 estable sin guardado, fecha, estado, auditoría de respuesta ni SMTP. | AC-05, AC-07, AC-11 | T-04 |
| [x] | T-06 | Probar respuesta visible end-to-end de API, notas privadas, cuerpos manipulados, propiedad/CSRF, límites/estado y concurrencia con servicio real; conservar garantías existentes. | AC-02, AC-03, AC-08, AC-10, AC-11 | T-05 |
| [x] | T-07 | Adaptar dominio/puertos y adaptadores HTTP/mocks/fixtures: capacidades solo de lectura, API vieja/desconocida bloqueada y mocks antiguos sin permisos inferidos. | AC-03, AC-04, AC-05, AC-11 | T-04, T-05 |
| [x] | T-08 | Mostrar origen/acceso/canales en detalle y acciones web/nota explícitas; ningún canal, carga/error, modos separados y borrador en fallo. | AC-06, AC-07, AC-08, AC-10, AC-11, AC-12 | T-06, T-07, D-05 |
| [x] | T-09 | Añadir preparación contextual mínima de correo: contacto fijo, `ticketId`, confirmación explícita, sin copia de notas/guardado web/estado ni reenvío; probar cancelación, A/B y sesión. | AC-05, AC-06, AC-09, AC-10, AC-11, AC-12 | T-08, D-03 |
| [x] | T-10 | Completar pruebas de recorridos, es/en, errores/metadatos incompletos y contexto; ejecutar suites, tipos/build y regresión web. | AC-01–AC-12 | T-02–T-09 |
| [ ] | T-11 | Validar manualmente escritorio/móvil/teclado/lector en entorno aislado y confirmar lectura del cliente y SMTP de pruebas sin entrega real. | AC-02, AC-06, AC-08, AC-09, AC-10, AC-11, AC-12 | T-10, entorno seguro confirmado |
| [ ] | T-12 | Actualizar contratos/arquitectura/roadmap y artefactos con evidencia real, criterios satisfechos y riesgos; solicitar autorización independiente de entrega si procede. | AC-01–AC-12 | T-10, T-11 |

## Registro TDD por tarea

### Evidencia de ejecución, 2026-10-10 (Windows, JDK 25, perfil API test)

- T-02 / AC-04: ` .\mvnw.cmd test "-Dtest=SupportTicketRepositoryTest"` rojo real:
  5 pruebas, 1 error al leer BSON con `customerVisible:null` (unboxing del booleano).
  Mínimo: Boolean nullable con consulta efectiva `Boolean.TRUE.equals`; mismo comando
  verde: 5 pruebas. Mongo embebido en loopback/puerto efímero; sin variables de conexión
  Mongo/Spring/SMTP en el entorno. Campo ausente/false/true ya era caracterización verde.
- T-03/T-04 / AC-01, AC-03, AC-05: ` .\mvnw.cmd test "-Dtest=SupportTicketServiceTest"`
  rojo: 6 pruebas, 2 fallos por ausencia de origen/contrato. Mínimo: origen string
  tolerante, campos DTO, canales calculados por ID/flag/cuenta y email del ticket.
  Verde con `-Dtest=SupportTicketServiceTest,SupportTicketRepositoryTest,FrontdeskQueryServiceTest`:
  14 pruebas. Resolución de propietarios de página agrupada sin conversaciones.
- T-05 / AC-07: mismo subconjunto de servicio ampliado, rojo: 9 pruebas, 1 fallo porque
  la respuesta oculta se guardaba. Guardia antes de mutar y excepción 409 específica.
  Verde `-Dtest=SupportTicketServiceTest,CustomerSupportControllerTest,FrontdeskControllerTest`:
  32 pruebas. Nota privada, origen desconocido y resolución de página son regresiones
  verdes, no se atribuye un rojo inexistente.
- T-06 / AC-02, AC-03, AC-08, AC-10: `SupportChannelsContractTest` nuevo con servicio
  real y MockMvc standalone (seguridad cubierta aparte por slices): contrato, 409/cero
  efectos, lectura pública y exclusión de notas. Regresión Contacto/correo: 20 pruebas
  existentes verdes. Se corrigió fixture de nota BSON para incluir `version:0` (sin esa
  versión Spring lo trataba como inserción; no es rojo atribuible a procedencia).
  Verde `-Dtest=SupportTicketRepositoryTest,SupportChannelsContractTest`: 8 pruebas.
- T-07 / AC-03, AC-04, AC-11: `npx --no-install vitest run src/infrastructure/api/http-repositories.test.ts src/infrastructure/mocks/mock-repositories.test.ts`
  rojo: 32 pruebas, 2 fallos (origen no normalizado y mock guardaba respuesta de legado).
  Mínimo: normalización sin inferencias, capacidades incoherentes desconocidas, guardia
  mock y fixtures explícitos. Mismo comando verde: 32 pruebas.
- Avisos existentes: deprecaciones Java/Mockito y JaCoCo con datos acumulados de clases
  anteriores. No se ha afirmado cobertura JaCoCo coherente.
- T-08 / AC-06, AC-07, AC-10: `npx --no-install vitest run src/components/tickets/ReplyBox.test.tsx src/components/tickets/TicketDetail.test.tsx`
  rojo: 6 pruebas, 2 fallos por diagnóstico/canales ausentes. Mínimo: metadatos visibles,
  botón web condicionado, nota explícita, confirmación de persistencia. Verde añadiendo
  `src/labels.test.ts`: 7 pruebas. Caso adicional de borrador privado ya verde; registra
  confirmación de descarte, nunca transferencia automática.
- T-09 / AC-09: `npx --no-install vitest run src/components/emails/EmailComposer.test.tsx src/App.api.test.tsx`
  rojo: 14 pruebas, 2 fallos (destinatario editable y sin apertura contextual). Mínimo:
  panel local Tickets, destinatario fijo, `ticketId` explícito, sin copiar conversación.
  Un fallo intermedio era `showModal` ausente en jsdom, no comportamiento de envío;
  llamada opcional/fallback. Mismo comando verde: 14 pruebas.
- T-09, regresión de destino durante refresco: `npx --no-install vitest run src/components/emails/EmailComposer.test.tsx`
  rojo: 5 pruebas, 1 fallo (se enviaba a dirección nueva mientras UI mostraba antigua).
  Fijar dirección al abrir, sin sobrescribirla por props ni edición; mismo comando verde:
  5 pruebas. Servidor sigue rechazando dirección obsoleta por comparación del ticket.
- T-10 / AC-12: mismo comando de EmailComposer, rojo específico de selección por teclado/
  vista previa es. El primer fallo dejó locale en es y causó fallos secundarios de fixture;
  añadido cleanup. Selector como botón nativo y textos es/en; verde con `src/labels.test.ts`:
  7 pruebas. No se atribuyen los fallos secundarios al comportamiento productivo.
- T-07, robustez de contrato: `npx --no-install vitest run src/infrastructure/api/http-repositories.test.ts`
  rojo: 11 pruebas, 1 fallo con canales objeto (TypeError); comprobar array antes de usarlo,
  verde 11. Otro rojo con flag/motivo contradictorios, verde 11 tras validar coherencia.
- T-05, contrato Spring real: suite completa API dio 346 pruebas, 1 fallo: advice general
  resolvía excepción específica a `CONFLICT`. Prioridad explícita al advice Frontdesk;
  verde `-Dtest=FrontdeskControllerTest,SupportChannelsContractTest`: 19 pruebas.
  Suite completa posterior ` .\mvnw.cmd test`: **346 pruebas, 0 fallos/errores**, 20:18:40.
- Recorridos adicionales verdes sin rojo inventado: respuesta web sin SMTP, conflicto
  preserva borrador/no reintento, cancelar correo no escribe, A/B no mezcla nota, sesión
  expirada desmonta compositor; `src/App.api.test.tsx`: 15 pruebas.
- Última suite Frontdesk: `npx --no-install vitest run`, **87 pruebas en 15 archivos,
  0 fallos**, 20:14. `npx --no-install tsc --noEmit` y `npm run build`: correctos.
  Reejecución final después de revisión menor: ver resumen de validación al terminar.
- Web sin cambio de producción: `npx --no-install vitest run src/__tests__/views/Support.test.tsx`,
  **3 pruebas correctas**. Correo siempre con mocks; no aceptación SMTP real.
- Suite API emite errores de cierre Netty/Lettuce y fallos simulados de servicios; tests
  terminan verdes. Se declaran como limitación de logs, no se corrigen fuera del alcance.
- Un intento de redirigir la suite a un fichero temporal falló porque no existía la
  carpeta; ese intento no ejecutó pruebas. La suite se ejecutó después directamente.

### Resumen de validación final

| Comando / entorno | Evidencia final |
|---|---|
| API: `.\mvnw.cmd test`, perfil test, Mongo embebido, mocks SMTP | 346 pruebas, 0 fallos/errores/omitidas, 20:18:40. |
| API: `.\mvnw.cmd test "-Dtest=SupportTicketServiceTest"`, tras mejorar TypeReference del test | 10 pruebas, 0 fallos/errores, 20:21:18; sin cambios productivos API después de la suite completa. |
| Frontdesk: `npx --no-install vitest run`, jsdom/fetch simulado | 87 pruebas, 15 archivos, 0 fallos, 20:21; después de fixture sin canales y validación de metadatos contradictorios. |
| Frontdesk: `npx --no-install tsc --noEmit` | Correcto, 20:20. |
| Frontdesk: `npm run build` | Correcto, 20:20; no despliegue. |
| Web: `npx --no-install vitest run src/__tests__/views/Support.test.tsx` | 3 pruebas correctas, 20:09; web productiva sin cambios. |
| `git diff --check`; enlaces locales/whitespace documental por PowerShell | Correctos; avisos LF/CRLF, sin errores de whitespace. |

Cambios de documentos no requieren rojo automatizado: TDD no aplicable. Contrato público
documentado con campos reales; no modifica políticas ni datos. Spec/plan/roadmap continúan
`in-progress` porque T-11 no se ha ejecutado. T-12 tiene documentación actualizada, pero
no se completa mientras falta la evidencia manual exigida por el plan aprobado.

### Comprobación previa al commit, 2026-10-11

- Usuario autoriza commit e incluir roadmap/SDD que estaban sin seguimiento. Se excluyen
  cambios previos de plantillas Directus, instrucciones, README, nginx, Compose y backups.
  En `docs/frontdesk-api.md` y `FrontdeskControllerTest.java` se preparan solo los cambios
  de canales, no las modificaciones anteriores de traducción de plantillas.
- API exacta del índice exportada a directorio temporal aislado, sin `.env` ni servicios
  reales. Desde esa copia: `.\mvnw.cmd test "-Dtest=SupportChannelsContractTest,FrontdeskControllerTest,SupportTicketServiceTest,SupportTicketRepositoryTest,FrontdeskEmailServiceTest,FrontdeskQueryServiceTest,CustomerSupportControllerTest"`:
  **50 pruebas, 0 fallos/errores/omitidas**, Mongo embebido y SMTP simulado.
  No se atribuye la suite histórica de 346 pruebas a este subconjunto del índice.
- Frontdesk: `npx --no-install vitest run`, **87 pruebas, 15 archivos, 0 fallos**.
- `git diff --cached --check`: correcto. Referencias Markdown locales verificadas contra
  archivos del índice; comprobación limitada de patrones de tokens/claves privadas sin
  coincidencias. No se modifica código ni se completa T-11 por hacer el commit.

Las suites actuales son base de regresión, no TDD retrospectivo. Para T-02–T-10,
registrar casos existentes que ya pasen como tales; cada comportamiento nuevo debe
tener rojo por el motivo esperado, implementación mínima, verde y refactor o justificación.
T-02 puede mezclar caracterización ya verde y rojo de tolerancia/contrato nuevo: distinguirlos.

| Tarea | Rojo / caso objetivo | Mínimo / verde / refactor | Evidencia actual |
|---|---|---|---|
| T-01 | No aplica: decisión/aprobación | Registrar alcance y confirmación literal/resumen fechado | Aprobación del usuario registrada el 2026-10-10; sin ejecución funcional |
| T-02 | BSON desconocido/incompleto y consulta histórica; separar caracterización existente | Fallback tolerante sin mutaciones ni elevación de acceso; ejecutar persistencia | Rojo/verde registrado arriba |
| T-03 | Falta `origin` al crear; Contacto coincidente nunca visible | Fijar solo origen nuevo y conservar flag; unitarias/contacto | Rojo/verde registrado arriba |
| T-04 | DTO actual carece de campos; matriz de canales por cuenta/flag/email | Política única, resúmenes sin mensajes y contratos de respuesta | Rojo/verde registrado arriba |
| T-05 | Respuesta pública de ticket oculto; exigir 409/cero efectos | Guardia previa, error estable; prueba HTTP con servicio real | Rojo/verde y corrección de advice registrados |
| T-06 | Añadir escenarios ausentes; existentes de privacidad son regresión, no rojo ficticio | API integrada y `@Version` verdes | Contratos/regresiones verdes; fixture versionado documentado |
| T-07 | API vieja/mocks sin canales; no reconstruir de email/ID | Adaptación fail-closed y separación de entradas | Rojo/verde y robustez registrados |
| T-08 | Falta diagnóstico de canal | UI condicional, modos privados separados | Rojo/verde registrado; revisión visual en T-11 |
| T-09 | Sin correo contextual ni `ticketId` | Panel mínimo y contexto fijo | Rojo/verde y destino durante refresco registrados |
| T-10 | Recorridos/idiomas/contrato | Suites finales y refactor | Completada: resumen de validación final arriba |
| T-11 | No aplica: validación manual | Registrar pasos y resultados, no sustituir por pruebas con mocks | No ejecutado |
| T-12 | No aplica al texto documental | Revisar enlaces/contratos y registrar evidencia, sin anunciar capacidades pendientes | Contrato, arquitectura y artefactos actualizados; cierre depende de T-11 |

En cada ejecución añadir:

```text
T-XX / AC-XX / S-XX:
Entorno y aislamiento (sin secretos):
Prueba/caso y si es nuevo o regresión existente:
Rojo: comando, resultado y motivo; o ya verde con explicación:
Implementación mínima:
Verde: comando y resultado:
Refactor: cambio y reejecución; o no necesario:
Validaciones/regresiones/manuales:
Bloqueos o pruebas omitidas:
```

## Evidencia histórica de la preparación documental (antes de implementar)

**TDD: no aplicable a los documentos.** No cambian comportamiento; no se fabricaron
pruebas rojas documentales. La evidencia de implementación está en la sección anterior.

| Validación | Resultado / límite |
|---|---|
| Lectura de `AGENTS.md`, convenciones, SDD, roadmap, arquitectura y contrato Frontdesk | Requisitos extraídos solo de fase 1; fases 3/5 delimitadas explícitamente. |
| Inspección de modelo, servicios, repositorio, DTOs, cliente y pruebas existentes | Confirma flag actual, asociación operativa por email en Contacto, falta de metadatos en Frontdesk y persistencia de respuesta sin SMTP. No valida navegador ni buzón. |
| Estado Git inicial | Había cambios previos, incluidos controladores/plantillas/docs y backups. No se revierten ni se incorporan como trabajo de esta fase. |
| `.\mvnw.cmd --version`, desde `mana-forge-api`, Windows | Ejecutado: Maven 3.9.12, Java 25.0.1. No se ejecutó `test`. |
| `npx --no-install vitest --version`, desde `mana-forge-frontdesk` | Ejecutado: Vitest 4.1.11, Node 22.14.0. Es versión instalada, no una suite ejecutada. |
| `npx --no-install tsc --version`, desde Frontdesk | Ejecutado: TypeScript 5.9.3. No se ejecutó comprobación de tipos. |
| `npm run`, desde Frontdesk, y lectura de `package.json` | Ejecutado: disponibles test/build/dev/preview/test:watch; sin script lint. Build no ejecutado. |
| Comprobación PowerShell de enlaces Markdown locales y referencias AC→tareas | Ejecutada: todos los destinos locales existen; 12 criterios referenciados en tareas. Revisión de alcance: solo tres documentos nuevos y enlace de fase 1 en el roadmap. |
| `git diff --check` y revisión de `git status --short` | Ejecutados: sin errores de whitespace en el diff de archivos seguidos; avisos LF/CRLF en cambios previos. Los documentos nuevos no seguidos se revisan por separado. No equivale a pruebas funcionales. |

Durante la preparación inicial no se ejecutaron suites/build. Después sí se ejecutaron
los comandos de la sección de implementación. No se reutilizan como evidencia actual
los recuentos históricos del roadmap. Sin migraciones, SMTP real, cambios de datos reales
ni permisos en ninguna etapa.

## Bloqueos, dependencias y autorizaciones

### Autorización Docker posterior, 2026-10-10

- Usuario solicita «puedes desplegar en docker para ver los cambios» y elige
  **Actualizar entorno actual** tras informar que API usa MongoDB remoto y SMTP real.
- Confirma **Sí, reiniciar la API** después de informar de `EmailMigrationRunner`
  (cifrado de emails planos al arrancar) y `CardBulkLoadService` (carga si colección
  vacía). Esos efectos de arranque existentes quedan autorizados para este reinicio;
  no se autoriza cambiar permisos, ejecutar migraciones adicionales ni correos de prueba.
- Alcance: reconstruir/recrear únicamente API y Frontdesk en el proyecto Docker actual;
  conservar variables/conexiones, volúmenes y resto de contenedores. No es publicación
  de imágenes ni despliegue a otro host.
- Inspección: proyecto `mana-forge`, ficheros base y `docker-compose.local-directus.yml`;
  API imagen previa `mana-forge-api:local-translations`, Frontdesk en 127.0.0.1:5174.
  Compose actual coincide con variables API existentes; origen Frontdesk ya configurado
  en `http://127.0.0.1:5174`, sin cambios de lista de operadores.
- Imágenes locales nuevas: `mana-forge-api:local-support-channels` y
  `mana-forge-frontdesk:local-support-channels`. Frontdesk build Linux correcto,
  `VITE_API_URL=/api`, `VITE_USE_MOCKS=false`; API build Linux correcto con Dockerfile
  existente (`mvn clean package -DskipTests`; las suites ya ejecutadas están arriba).
- Despliegue Docker ejecutado API primero y Frontdesk después, ambos saludables.
  Comando base: `docker compose --profile frontdesk -f docker-compose.yml -f docker-compose.local-directus.yml up -d --no-deps --no-build --pull never --force-recreate --wait ... api|frontdesk`.
  `API_IMAGE`/`FRONTDESK_IMAGE` se fijaron a imágenes locales nuevas solo durante el
  comando; se restauraron variables del proceso. No se modificó `.env` ni Compose.
  Un `up` posterior debe seleccionar estas imágenes si se quieren conservar los cambios.
- GET de humo: API `/actuator/health` 200/`UP`; Frontdesk `/` y `/healthz` 200;
  `/api/frontdesk/me` y `/api/frontdesk/tickets` sin sesión 401. Proxy web principal
  `/api/frontdesk/me` también 401; web principal `/` 200. Bundle servido
  `/assets/index-ASyUUxkV.js` contiene acciones nuevas y `WEB_CHANNEL_UNAVAILABLE`.
- Variables API comprobadas de nuevo tras recreación: coinciden con las anteriores.
  Los siete contenedores restantes mantienen sus IDs, incluidos Redis, Directus,
  PostgreSQL y backup; no se recrearon ni se borraron volúmenes.
- Logs de arranque: aplicación iniciada; 38.872 cartas, carga inicial omitida. Sin mensaje
  de migración de emails ejecutada ni error de arranque en los logs revisados. No se
  afirma una auditoría exhaustiva de datos; no se hicieron escrituras manuales ni SMTP.
- Acceso para revisión del usuario: `http://127.0.0.1:5174`. Permisos/cuentas existentes.
  Las acciones que el usuario haga en este entorno afectan a Mongo remoto/SMTP real.
  Esta comprobación HTTP no completa la validación visual, lector ni SMTP de T-11.
- Imagen Frontdesk anterior conservada como `mana-forge-frontdesk:before-support-channels`;
  API anterior sigue en `mana-forge-api:local-translations`. No se hizo rollback.


1. **Aprobación registrada:** T-01 completada el 2026-10-10. Respuesta del usuario al
   resumen y solicitud de aprobación: «ok, en cualquir momento puedes hacer preguntas
   si es necesario». Spec/plan y D-01–D-03 aprobados para fase 1 únicamente.
2. D-01 contrato/409, D-02 acceso efectivo y D-03 panel mínimo de correo resueltos.
   D-04 mantiene asociación actual sin autenticación; D-05 mantiene separación de
    borradores sin transferencia automática de notas. Textos implementados es/en;
    revisión visual de UX pendiente. El usuario permite preguntas cuando sean necesarias.
3. Validar entorno local aislado antes de persistencia/Docker; no usar una base real
   en fixtures que borran documentos ni SMTP con destinatarios reales.
4. Despliegue/rollback, migraciones o cambios de políticas requieren autorización aparte.
   No hay migración propuesta ni dependencia de una política nueva de Directus.
5. Conservar cambios previos del usuario; si cambian los contratos durante implementación,
    revisar impacto y pedir nueva aprobación material.
6. T-11 pendiente: no hay herramienta de navegador interactivo disponible ni Playwright
   instalado en web/Frontdesk. No instalar dependencias ni levantar un Compose potencialmente
   conectado a servicios reales sin confirmar entorno. Falta revisión escritorio/móvil,
   teclado/lector real y captura SMTP en entorno aislado.
7. BSON de pruebas editable lleva `version:0`, como tickets creados por la app. Un
   documento anterior sin `@Version` puede ser tratado por Spring como inserción al
   guardar; no se aplicó reparación/migración. No afecta la lectura ni concede acceso.

## Estado final de criterios y riesgos

- AC-01–AC-11: implementados con pruebas automatizadas del alcance; validación de
  recorridos reales entre servicios pendiente. AC-12: textos/paridad y controles nativos
  comprobados con jsdom; móvil/lector/teclado real pendientes.
- T-01–T-10 completadas a nivel de implementación/pruebas automatizadas. T-11 manual
  pendiente y T-12 cierre documental dependiente de ella; sin declarar fase `done`.
- Implementado: sí. Validado automatizadamente: sí (evidencia arriba). Validado visualmente:
  no. Desplegado: sí, en Docker del host local con conexiones existentes autorizadas;
  smoke HTTP correcto. Sin publicación de imágenes/despliegue a otro host.
- Riesgos declarados para la aprobación: asociación histórica por email no autenticada,
  bloqueo seguro con versiones mixtas, acceso revocable y falta de atomicidad entre
  ticket/auditoría/SMTP. Correo operativo no tiene deduplicación ni recepción integrada;
  no se promete resolverlos en fase 1.
