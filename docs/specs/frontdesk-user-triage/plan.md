# Plan: triage de usuarios en Frontdesk

Estado: **implementado** (2026-10-22) en la rama `feature/frontdesk-user-triage`;
regresión automática verde, validación manual pendiente. Spec: [spec.md](spec.md).
Evidencias en [tasks.md](tasks.md).

## Diseño

Dos caminos de listado que comparten la misma respuesta y el mismo enriquecido
por lotes:

1. **Camino nativo** (`sort` en `username`, `createdAt`, `lastLoginAt` y sin
   filtro de cuota): filtro, `count`, `sort`, `skip`/`limit` en Mongo, como hoy.
   Es el que usan el Omnibox y el dashboard, así que su coste y orden no cambian.
2. **Camino rankeado** (`sort` en `openTickets`, `aiUsageToday`, `totalDecks`, o
   cualquier `quota=exhausted`): se leen los usuarios filtrados con proyección
   mínima, se calculan las métricas derivadas por lotes, se ordena y pagina en la
   aplicación, y solo entonces se cargan los documentos completos de la página.

Motivo: los tickets, los mazos y la cuota no están en el documento `users`, así
que un `sort` de Mongo no puede ordenar por ellos. Se descartan `$lookup` (caro y
difícil de acotar) y contadores desnormalizados en `users` (riesgo de deriva y
migración). El máximo de 20.000 usuarios filtrados acota memoria y CPU; por encima
se devuelve 400 `USER_SET_TOO_LARGE` en lugar de truncar.

El enriquecido de página sustituye el N+1 actual:

- una consulta de usuarios por página con `_id in [...]`;
- una agregación `decks` agrupada por `userId` que devuelve el total y empuja solo
  los campos ligeros de los mazos (id, nombre, formato, `updatedAt` y suma de
  `cards.quantity`); el recorte a 5 recientes por usuario se hace en memoria. Una
  sola operación cubre conteo y recientes en lugar de dos;
- una lectura por lotes de cuota a Redis (`multiGet` en trozos de 500);
- los conteos de tickets ya calculados para el ranking (o una agregación si el
  camino es nativo);
- descifrado de email por usuario de la página (inevitable y acotado a 25).

`UserView` y `PageResult` no cambian de forma. El detalle `GET /users/{id}` sigue
usando el `view(user)` actual sin modificaciones funcionales.

## Contrato y validación

Parámetros y valores en [spec.md](spec.md#contrato-propuesto). Se validan como
enums antes de tocar la base. Para que los códigos lleguen al cliente hay que
tener en cuenta que `ApiExceptionHandler.java:32-52` deriva `code` de forma
heurística: un `ResponseStatusException(BAD_REQUEST, "INVALID_SORT")` llegaría
como `BAD_REQUEST`. Por eso se añade una excepción propia de Frontdesk
(`FrontdeskBadRequestException` con `code`) manejada por
`FrontdeskExceptionHandler` (`@RestControllerAdvice(assignableTypes =
FrontdeskController.class)`), que responde 400 con `{code, error}`. `ApiClient`
ya lee `error` como mensaje.

## Archivos principales verificados

Backend (`mana-forge-api/src/main/java/com/manaforge/api/`):

- `controller/FrontdeskController.java:79-83` — parámetros nuevos.
- `controller/FrontdeskExceptionHandler.java` — manejo de `FrontdeskBadRequestException`.
- `service/FrontdeskQueryService.java:52-65` — sustituir `users(...)` por la versión
  con filtros; conservar sobrecarga `users(search, page, size)` para no romper
  llamadas existentes ni tests.
- `service/FrontdeskUserService.java:41-60` — separar `view(user)` de
  `viewPage(page, metrics)`; añadir cálculo por lotes.
- `service/AiQuotaService.java` — nuevo `checkAuthenticated(Collection<String>)`
  con lectura por lotes y el mismo fallback en memoria que `check(id, true)`.
- `dto/FrontdeskDtos.java:40-46` — sin cambios de forma; los enums de consulta
  viven en un DTO/validación nuevo.
- `model/mongo/User.java:45-48` — regla de estado efectivo para el filtro.

Frontend (`mana-forge-frontdesk/src/`):

- `core/domain/user.ts` — `UserSort`, `UserSortDir`, `UserListFilters`.
- `core/ports/user-repository.port.ts` — `searchPage(filters, pagination)`.
- `infrastructure/api/http-repositories.ts:47-64` — serializar filtros
  (`ApiClient.page` admite `string | number | undefined`).
- `infrastructure/mocks/mock-user-repository.ts:29-37` — mismo orden y filtros.
- `hooks/use-users.ts:17-20` — clave de query con todos los filtros; hook para el
  contador de cuota agotada.
- `views/UsersView.tsx` — estado de filtros, debounce, orden por defecto, resumen y
  estado vacío.
- `components/users/UserFilterBar.tsx` (nuevo) — controles accesibles.
- `components/users/UserCard.tsx` — icono de `SUSPENDED`, uso de IA con límite y
  periodo, tickets abiertos destacados, etiquetas traducidas.
- `views/DashboardView.tsx:33, 42-47, 102-103` — KPI con el nuevo filtro.
- `labels.json` — claves nuevas en `en` y `es`.

## Alternativas descartadas

- **Ordenar y filtrar solo en el navegador**: no ordena el total; sigue siendo
  engañoso con paginación y no arregla el N+1.
- **`$lookup` de `users` a `tickets`**: ordena en Mongo, pero necesita índices y
  sigue sin poder filtrar por cuota (Redis).
- **Contador de tickets/uso de IA en `users`**: orden barato, pero exige migración,
  escrituras adicionales y tolerancia a deriva; se pospone a F3.
- **Cursor en vez de offset**: más robusto con datos cambiantes, pero rompe el
  contrato de paginación y el componente `Pagination`; el desempate `_id` es
  suficiente para el uso actual.

## Fases

| Fase | Contenido | Depende de |
|---|---|---|
| P-1 | DTO de filtros, validación y códigos de error; sobrecarga compatible de `users(...)` | — |
| P-2 | Enriquecido por lotes y eliminación del N+1 (sin cambiar orden visible) | P-1 |
| P-3 | Ranking derivado y filtros `tier`/`status`/`quota` con máximo rankeable | P-2 |
| P-4 | Repositorio, hook y mock de Frontdesk con el nuevo contrato | P-1 |
| P-5 | UI de orden/filtros, debounce, estados vacíos y etiquetas es/en | P-4 |
| P-6 | KPI del dashboard, documentación y regresión completa | P-3, P-5 |

P-2 es funcionalmente invisible y sirve de red de seguridad: si el ranking se
pospone, el listado ya deja de castigar la base de datos.

## Estrategia de pruebas

Backend (JUnit + Mockito, mismo estilo que `FrontdeskQueryServiceTest` y
`FrontdeskUserServiceTest`):

- validación: cada valor inválido devuelve 400 con su código y `verifyNoInteractions(mongo)`;
- sin parámetros: misma query y orden `username` que hoy;
- camino nativo: orden, `skip`, `limit` y `total` filtrado;
- camino rankeado: orden por tickets, uso IA y mazos con mapas simulados;
  desempate por último login y `_id`; paginación sin solapes;
- filtros: tier, estado efectivo (incluido `active=false` con `status` nulo) y
  cuota agotada (incluido cuota ilimitada = nunca agotada);
- lotes: una sola agregación de mazos (conteo + recientes) y una lectura de cuota
  por página; `verify` de que no se llama a los métodos por usuario;
- máximo rankeable: 400 `USER_SET_TOO_LARGE`;
- `AiQuotaService`: lotes, troceado y fallback en memoria.

Frontend (Vitest + Testing Library):

- `mock-repositories.test.ts`: orden y filtros equivalentes a la API;
- `http-repositories.test.ts`: parámetros enviados y omisión de `undefined`;
- `UserFilterBar.test.tsx`: cambios emitidos, limpiar filtros;
- `UsersView.test.tsx`: orden por defecto, debounce, estado vacío y reinicio de
  página al filtrar (con contenedor mock);
- `labels.test.ts` cubre la paridad de claves automáticamente.

Prueba roja primero en cada tarea de comportamiento; no se inventan fases rojas
para documentación.

## Validación

- API: `.\mvnw.cmd "-Dtest=FrontdeskUserQueryTest,FrontdeskUserServiceTest,AiQuotaServiceTest,FrontdeskQueryServiceTest,FrontdeskExceptionHandlerTest" test`
  (PowerShell exige comillas por la coma) y después `.\mvnw.cmd test` completo desde
  `mana-forge-api`.
- Frontdesk: `npx vitest run src/infrastructure src/hooks src/components/users src/views`
  y `npm run build` (incluye `tsc -b`). `package.json` no define `lint`
  (verificado), así que no se documenta como disponible.
- Manual, solo local: modo mock y API local; comprobar orden por defecto, filtros
  combinados, paginación, estado vacío y el comportamiento con Redis detenido.
- No se ejecuta nada contra producción.

## Compatibilidad, seguridad y fallos

- Clientes actuales sin parámetros reciben el mismo orden y la misma forma; el
  Omnibox y el dashboard no cambian de contrato.
- Sin campos privados nuevos; permisos, CSRF, rate limiting y cifrado de email
  intactos. Los filtros se validan por enum y la búsqueda sigue usando patrón
  citado.
- Redis caído: se mantiene el fallback en memoria; los valores pueden ser
  parciales y así se documenta, sin 500.
- `total` sigue siendo el conteo filtrado; «Total Registered» del dashboard no
  cambia porque no envía filtros.

## Despliegue y migraciones

Ninguno en esta fase. No se crean índices ni se migran datos. Si el rendimiento
del conteo de tickets lo exige, proponer `tickets(userId, status)` como cambio
aparte, con autorización explícita antes de tocar una base real.

## Aprobación

Aprobados spec y plan el 2026-10-22 («adelante pero crea una rama para ello»),
incluidas las fases P-1 a P-6. Sin autorización para índices, migraciones o
despliegue.
