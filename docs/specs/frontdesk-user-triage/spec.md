# Triage de usuarios en Frontdesk: orden y filtros reales

Estado: **approved** (aprobado el 2026-10-22; implementado en la rama
`feature/frontdesk-user-triage`, regresión automática verde, validación manual
pendiente).

## Problema y objetivo

La lista de usuarios de Frontdesk solo permite búsqueda por texto y está ordenada
alfabéticamente. Un operador no puede responder «¿a quién atender primero?» ni
«¿quién está consumiendo su cuota de IA?» sin revisar la lista completa a mano.

Objetivo: que la lista de usuarios se pueda ordenar y filtrar por señales de
soporte (tickets abiertos, uso de IA del día, mazos) sobre **todo el conjunto que
cumple el filtro**, no solo sobre la página ya cargada, y que el orden por defecto
de la vista de Usuarios priorice a quien necesita respuesta.

Usuarios afectados: operadores de Frontdesk (lectura y triage). No cambia la
experiencia del cliente ni los permisos.

## Estado actual verificado

Rutas relativas a `mana-forge-api/src/main/java/com/manaforge/api/` y
`mana-forge-frontdesk/src/`.

- `GET /frontdesk/users` (`FrontdeskController.java:79-83`) acepta solo `query`,
  `page` y `size`. `FrontdeskQueryService.users` (líneas 52-65) ordena siempre por
  `username ASC, _id ASC`; valida `page >= 0` y `1 <= size <= 100`.
- `FrontdeskUserService.view` (líneas 41-60) calcula las estadísticas **por
  usuario**: 2 consultas a `decks`, 1 conteo a `tickets`, 1 lectura de cuota en
  Redis y un descifrado de email. Una página de 25 usuarios ejecuta ~100
  operaciones. No hay agregaciones en la API (verificado: `aggregate(` no aparece
  en `src/main/java`).
- El contrato `UserView` (`FrontdeskDtos.java:44-46`) ya incluye `stats` y
  `openTicketsCount`; la forma de cada elemento no necesita cambios.
- Tickets abiertos = `OPEN`, `IN_PROGRESS`, `WAITING_USER`
  (`FrontdeskUserService.java:52-53`), vía
  `SupportTicketRepository.countByUserIdAndStatusIn`.
- Uso de IA: solo existe el contador diario autenticado en Redis,
  clave `manaforge:ai:quota:user:<hash>:<fecha UTC>` con TTL hasta medianoche UTC
  (`AiQuotaService.java:50, 115-135, 260-266`). `aiQueriesThisMonth` siempre es
  nulo y `aiQuotaPeriod` siempre es `"DAILY"`. **No hay histórico persistido**:
  «uso de IA» solo puede significar consumo de hoy.
- `User.effectiveStatus()` (`User.java:45-48`) deriva el estado de `status` y del
  booleano legado `active`; cualquier filtro por estado debe reproducir esa regla.
- `UsersView.tsx` usa `useUsersPage(search, page)` con tamaño fijo 25, sin
  debounce, sin orden ni filtros. `UserCard.tsx` ya muestra tier, estado, mazos,
  uso de IA y tickets abiertos.
- `DashboardView.tsx:33, 42-47, 102-103` calcula «Quotas Exhausted» solo con los
  25 primeros usuarios y lo presenta como total.
- `MockUserRepository.java:29-37` ignora orden y filtros (modo demo).
- `labels.json` mantiene `en`/`es` con paridad de claves comprobada por
  `labels.test.ts`.
- `mana-forge-frontdesk/package.json` **no define** script `lint`; `build` ejecuta
  `tsc -b && vite build`.
- No hay índices declarados en código para `tickets.userId`/`status`. Su
  existencia en una base real es desconocida y no se afirma aquí.

## Alcance

Dentro:

1. Contrato de listado con `sort`, `dir`, `tier`, `status`, `quota` y `query`.
2. Orden por defecto de la vista de Usuarios: tickets abiertos descendente, luego
   último login descendente (nulos al final).
3. Orden por uso de IA de hoy y por número de mazos, sobre el conjunto filtrado.
4. Filtros por tier, estado efectivo y cuota de IA agotada.
5. Eliminación del N+1 en el listado mediante cálculo por lotes.
6. UI de orden/filtros, debounce de búsqueda, estados vacíos y etiquetas en/es.
7. Corrección del KPI «Quotas Exhausted» del dashboard usando el nuevo filtro.

Fuera de alcance:

- Persistir histórico de uso de IA o cambiar la cuota (fase F3, no aprobada aquí).
- Crear índices en Mongo, migrar datos o desplegar.
- Orden por relevancia/fuzzy, exportación, acciones masivas o edición de perfil.
- Cambiar la identidad, privacidad o descifrado de email.
- Filtros por newsletter, verificación o fechas (evaluables en otra spec).

## Contrato propuesto

`GET /api/frontdesk/users`

| Parámetro | Valores | Por defecto | Regla |
|---|---|---|---|
| `query` | texto | vacío | Sin cambios: username, name, ID o email exacto cifrado |
| `page` | entero ≥ 0 | 0 | Sin cambios |
| `size` | 1–100 | 25 | Sin cambios |
| `sort` | `openTickets`, `aiUsageToday`, `totalDecks`, `username`, `createdAt`, `lastLoginAt` | `username` | Valor desconocido → 400 `INVALID_SORT` |
| `dir` | `asc`, `desc` | `desc` | Valor desconocido → 400 `INVALID_SORT_DIRECTION` |
| `tier` | `FREE`, `PRO`, `PATREON` | todos | Valor desconocido → 400 `INVALID_TIER` |
| `status` | `ACTIVE`, `SUSPENDED`, `BANNED` | todos | Estado efectivo; desconocido → 400 `INVALID_STATUS` |
| `quota` | `exhausted` | todos | Solo usuarios con cuota autenticada agotada hoy; otro valor → 400 `INVALID_QUOTA_FILTER` |

Respuesta: el mismo `PageResult<UserView>` actual. `total` cuenta los usuarios que
cumplen búsqueda y filtros, independientemente de la página.

Decisiones de orden:

- El **default del endpoint sigue siendo `username asc`** para no alterar el
  Omnibox ni el dashboard, que no envían `sort`. La vista de Usuarios envía
  siempre `sort=openTickets&dir=desc`.
- `sort=openTickets&dir=desc` desempata por `lastLoginAt` descendente (nulos al
  final) y después `_id` ascendente.
- Cualquier otro orden desempata por `_id` ascendente para que la paginación por
  offset sea estable.
- `aiUsageToday` y `quota=exhausted` usan el contador diario autenticado. Un
  usuario sin clave en Redis cuenta como 0. Una cuota ilimitada (`limit < 0`)
  nunca se considera agotada.

## Requisitos y criterios de aceptación

| ID | Criterio |
|---|---|
| AC-01 | El endpoint valida `sort`, `dir`, `tier`, `status` y `quota`; un valor inválido devuelve 400 con el código indicado y no consulta la base. Sin parámetros nuevos, la respuesta es idéntica a la actual (`username asc`). |
| AC-02 | La vista de Usuarios pide `sort=openTickets&dir=desc` y muestra primero a quien tiene más tickets abiertos en **todo el conjunto filtrado**, desempatando por último login y `_id`. |
| AC-03 | `sort=aiUsageToday` ordena por consumo de hoy del conjunto filtrado; usuarios sin consumo quedan al final en `desc`. |
| AC-04 | `tier`, `status` y `quota` filtran `items` y `total`. `status` respeta el estado efectivo legacy (`status` nulo o `ACTIVE` con `active=false` es `SUSPENDED`). |
| AC-05 | Para cualquier orden, dos páginas consecutivas no repiten ni omiten usuarios mientras los datos no cambien. |
| AC-06 | Una página de 25 usuarios ejecuta un número acotado de operaciones: una consulta de usuarios por página, una agregación de mazos, una consulta de mazos recientes, una lectura por lotes de cuota y los conteos de tickets ya calculados. No se ejecuta ninguna consulta por usuario. |
| AC-07 | El camino de orden nativo (username, fechas) sigue usando orden y paginación en Mongo; Omnibox y dashboard mantienen su comportamiento y coste actuales salvo el KPI corregido. |
| AC-08 | El modo demo aplica el mismo orden, filtros y desempates que la API. |
| AC-09 | Todo control nuevo tiene etiqueta traducida en `en` y `es`; la lista vacía muestra un mensaje; los `select` tienen etiqueta accesible y la búsqueda se aplica con debounce. |
| AC-10 | «Quotas Exhausted» del dashboard cuenta todos los usuarios con cuota agotada, no los 25 primeros. |
| AC-11 | El cambio no expone datos nuevos: no se añaden campos privados ni se amplían permisos; 401/403 se mantienen. |
| AC-12 | Si el conjunto filtrado supera el máximo rankeable, la API devuelve 400 `USER_SET_TOO_LARGE` sin truncar resultados en silencio. |

## Escenarios observables

**Orden por defecto**
Dado un operador con 30 usuarios y dos con tickets abiertos,
Cuando abre la pestaña Usuarios,
Entonces ve primero a los que tienen tickets abiertos, desempatados por último
login, y el resto en el mismo orden estable.

**Filtro combinado**
Dado un filtro `tier=PATREON` y `quota=exhausted`,
Cuando se aplica,
Entonces `items` y `total` solo incluyen usuarios PATREON con la cuota de hoy
agotada, y la paginación refleja ese total.

**Paginación estable**
Dado un orden por tickets abiertos con empate entre varios usuarios,
Cuando el operador avanza de la página 0 a la 1,
Entonces no se repite ningún usuario y no falta ninguno del conjunto filtrado.

**Compatibilidad**
Dado un cliente antiguo que llama `GET /frontdesk/users?query=&page=0&size=25`,
Cuando recibe la respuesta,
Entonces obtiene el mismo orden alfabético y la misma forma de datos que antes.

**Fallo de validación**
Dado `sort=popularity`,
Cuando se llama al endpoint,
Entonces responde 400 `INVALID_SORT` sin ejecutar consultas.

**Redis no disponible**
Dado un fallo de Redis,
Cuando se ordena por uso de IA,
Entonces la petición responde con los contadores locales disponibles (posiblemente
parciales, igual que el detalle actual) y no devuelve error 500.

## Restricciones y decisiones

| Decisión | Propuesta |
|---|---|
| D-01: estrategia de orden | Dos caminos: Mongo nativo para campos del documento; ranking en aplicación para métricas derivadas (tickets, mazos, IA). Evita `$lookup` y mantiene el coste controlado. |
| D-02: significado de «uso de IA» | Contador diario autenticado de hoy (UTC). Sin histórico; eso queda para F3. |
| D-03: máximo rankeable | 20.000 usuarios filtrados; por encima, 400 `USER_SET_TOO_LARGE` (nunca truncar en silencio). |
| D-04: paginación | Se mantiene offset (`page`/`size`) con desempate determinista `_id`; no se introduce cursor. |
| D-05: datos | No se crean índices ni se migra nada en esta fase. `tickets(userId, status)` queda como propuesta separada sujeta a autorización. |
| D-06: compatibilidad del default | El endpoint conserva `username asc` sin parámetros; el orden de triage es decisión de la vista. |
| D-07: indisponibilidad de Redis | Se conserva la degradación actual a contadores en memoria; los valores pueden ser parciales y no se presenta como dato completo. |

## Aprobación

El 2026-10-22 el usuario eligió el alcance F2 (orden y filtros reales en API) y el
orden por defecto «tickets abiertos ↓, luego último login», y respondió «adelante
pero crea una rama para ello». Eso aprueba esta spec y el [plan](plan.md) en la
rama `feature/frontdesk-user-triage`. No autoriza crear índices, migrar datos ni
desplegar.
